import { Component, OnInit, inject, signal } from '@angular/core';
import { RefDatalist } from '../../../../../shared/ref-datalist/ref-datalist';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SKILL_LABELS, Skill, SkillLevel } from './../../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../../core/utils/http-error';
import { blankToNull } from './../../../../../../core/utils/text';


@Component({
  selector: 'app-skills-section',
  imports: [RefDatalist, ReactiveFormsModule],
  standalone: true,
  templateUrl: './skills-section.html',
  styleUrl: './skills-section.scss'
})
export class SkillsSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CandidateService);

  items = signal<Skill[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  levels = (Object.keys(SKILL_LABELS) as SkillLevel[]).map(value => ({ value, label: SKILL_LABELS[value] }));

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    level: ['INTERMEDIAIRE' as SkillLevel]
  });

  ngOnInit() {
    this.api.listSkills().subscribe({
      next: list => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  add() {
    const name = this.form.controls.name.value.trim();
    if (!name || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.createSkill({ name, level: this.form.controls.level.value }).subscribe({
      next: created => {
        this.saving.set(false);
        this.items.update(list => this.sorted([...list, created]));
        this.form.reset({ name: '', level: 'INTERMEDIAIRE' });
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  changeLevel(skill: Skill, event: Event) {
    const level = (event.target as HTMLSelectElement).value as SkillLevel;
    this.error.set(null);
    this.api.updateSkill(skill.id, { name: skill.name, level }).subscribe({
      next: updated => this.items.update(list => list.map(i => (i.id === updated.id ? updated : i))),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  remove(skill: Skill) {
    this.error.set(null);
    this.api.deleteSkill(skill.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== skill.id)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private sorted(list: Skill[]) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }
}
