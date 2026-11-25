import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {Experience, ExperienceRequest } from './../../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../../core/utils/http-error';
import { blankToNull } from './../../../../../../core/utils/text';

@Component({
  selector: 'app-experiences-section',
  imports: [ReactiveFormsModule, DatePipe],
  standalone: true,
  templateUrl: './experiences-section.html',
  styleUrl: './experiences-section.scss',
})
export class ExperiencesSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CandidateService);

  items = signal<Experience[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  formOpen = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);
  today = new Date().toISOString().split('T')[0];

  form = this.fb.nonNullable.group({
    jobTitle: ['', [Validators.required, Validators.maxLength(150)]],
    companyName: ['', [Validators.required, Validators.maxLength(150)]],
    location: ['', Validators.maxLength(150)],
    startDate: ['', Validators.required],
    endDate: [''],
    currentJob: [false],
    description: ['', Validators.maxLength(3000)]
  });

  constructor() {
    // un poste actuel n'a pas de date de fin
    this.form.controls.currentJob.valueChanges.pipe(takeUntilDestroyed()).subscribe(current => {
      const end = this.form.controls.endDate;
      if (current) {
        end.setValue('');
        end.disable();
      } else {
        end.enable();
      }
    });
  }

  ngOnInit() {
    this.reload();
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  startAdd() {
    this.editingId.set(null);
    this.form.reset();
    this.formError.set(null);
    this.formOpen.set(true);
  }

  startEdit(e: Experience) {
    this.editingId.set(e.id);
    this.form.reset({
      jobTitle: e.jobTitle,
      companyName: e.companyName,
      location: e.location ?? '',
      startDate: e.startDate,
      endDate: e.endDate ?? '',
      currentJob: e.currentJob,
      description: e.description ?? ''
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  cancel() {
    this.formOpen.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (!v.currentJob && !v.endDate) {
      this.formError.set('Indiquez la date de fin, ou cochez « Poste actuel ».');
      return;
    }
    if (!v.currentJob && v.endDate < v.startDate) {
      this.formError.set('La date de fin doit être postérieure à la date de début.');
      return;
    }

    const body: ExperienceRequest = {
      jobTitle: v.jobTitle.trim(),
      companyName: v.companyName.trim(),
      location: blankToNull(v.location),
      startDate: v.startDate,
      endDate: v.currentJob ? null : v.endDate,
      currentJob: v.currentJob,
      description: blankToNull(v.description)
    };

    const id = this.editingId();
    const request$ = id === null ? this.api.createExperience(body) : this.api.updateExperience(id, body);

    this.saving.set(true);
    this.formError.set(null);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(extractErrorMessage(err));
      }
    });
  }

  remove(e: Experience) {
    if (!confirm(`Supprimer l'expérience « ${e.jobTitle} » ?`)) return;
    this.error.set(null);
    this.api.deleteExperience(e.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== e.id)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private reload() {
    this.api.listExperiences().subscribe({
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
}
