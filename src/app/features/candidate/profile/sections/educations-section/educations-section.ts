
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {Education, EducationRequest } from './../../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../../core/utils/http-error';
import { blankToNull } from './../../../../../../core/utils/text';
import { Loading } from '../../../../../shared/loading/loading';

@Component({
  selector: 'app-educations-section',
  imports: [Loading, ReactiveFormsModule, DatePipe],
  standalone: true,
  templateUrl: './educations-section.html',
  styleUrl: './educations-section.scss'
})
export class EducationsSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CandidateService);

  items = signal<Education[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  formOpen = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    degree: ['', [Validators.required, Validators.maxLength(150)]],
    institution: ['', [Validators.required, Validators.maxLength(150)]],
    fieldOfStudy: ['', Validators.maxLength(150)],
    startDate: [''],
    endDate: [''],
    description: ['', Validators.maxLength(3000)]
  });

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

  startEdit(e: Education) {
    this.editingId.set(e.id);
    this.form.reset({
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
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
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      this.formError.set('La date de fin doit être postérieure à la date de début.');
      return;
    }

    const body: EducationRequest = {
      degree: v.degree.trim(),
      institution: v.institution.trim(),
      fieldOfStudy: blankToNull(v.fieldOfStudy),
      startDate: v.startDate || null,
      endDate: v.endDate || null,
      description: blankToNull(v.description)
    };

    const id = this.editingId();
    const request$ = id === null ? this.api.createEducation(body) : this.api.updateEducation(id, body);

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

  remove(e: Education) {
    if (!confirm(`Supprimer la formation « ${e.degree} » ?`)) return;
    this.error.set(null);
    this.api.deleteEducation(e.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== e.id)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private reload() {
    this.api.listEducations().subscribe({
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
