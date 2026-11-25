import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LANGUAGE_LEVELS, Language, LanguageLevel } from './../../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../../core/utils/http-error';

@Component({
  selector: 'app-languages-section',
  imports: [ReactiveFormsModule],
  standalone: true,
  templateUrl: './languages-section.html',
  styleUrl: './languages-section.scss'
})
export class LanguagesSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CandidateService);

  items = signal<Language[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  levels = LANGUAGE_LEVELS;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    level: ['B2' as LanguageLevel]
  });

  ngOnInit() {
    this.api.listLanguages().subscribe({
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

  label(level: LanguageLevel): string {
    return level === 'NATIF' ? 'Natif' : level;
  }

  add() {
    const name = this.form.controls.name.value.trim();
    if (!name || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.createLanguage({ name, level: this.form.controls.level.value }).subscribe({
      next: created => {
        this.saving.set(false);
        this.items.update(list => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
        this.form.reset({ name: '', level: 'B2' });
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  changeLevel(lang: Language, event: Event) {
    const level = (event.target as HTMLSelectElement).value as LanguageLevel;
    this.error.set(null);
    this.api.updateLanguage(lang.id, { name: lang.name, level }).subscribe({
      next: updated => this.items.update(list => list.map(i => (i.id === updated.id ? updated : i))),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  remove(lang: Language) {
    this.error.set(null);
    this.api.deleteLanguage(lang.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== lang.id)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }
}
