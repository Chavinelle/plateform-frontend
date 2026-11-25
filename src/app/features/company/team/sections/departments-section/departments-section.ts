import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department } from '../../../../../../core/models/company.models';
import { AuthService } from '../../../../../../core/services/auth.service';
import { TeamService } from '../../../../../../core/services/team.service';
import { extractErrorMessage } from '../../../../../../core/utils/http-error';

@Component({
  selector: 'app-departments-section',
  imports: [ReactiveFormsModule],
  templateUrl: './departments-section.html',
  styleUrl: './departments-section.scss'
})
export class DepartmentsSection implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(TeamService);
  private auth = inject(AuthService);

  items = signal<Department[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  editingId = signal<number | null>(null);
  editName = signal('');
  canManage = computed(() => this.auth.user()?.role === 'ADMIN_ENTREPRISE');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]]
  });

  ngOnInit() {
    this.reload();
  }

  add() {
    const name = this.form.controls.name.value.trim();
    if (!name || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.createDepartment(name).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset({ name: '' });
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  startRename(d: Department) {
    this.editingId.set(d.id);
    this.editName.set(d.name);
    this.error.set(null);
  }

  saveRename(d: Department) {
    const name = this.editName().trim();
    if (!name || name.length > 100) {
      this.error.set('Le nom du service est obligatoire (100 caractères max).');
      return;
    }
    this.error.set(null);
    this.api.updateDepartment(d.id, name).subscribe({
      next: () => {
        this.editingId.set(null);
        this.reload();
      },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  remove(d: Department) {
    if (!confirm(`Supprimer le service « ${d.name} » ? Les offres concernées n'auront plus de service.`)) return;
    this.error.set(null);
    this.api.deleteDepartment(d.id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private reload() {
    this.api.listDepartments().subscribe({
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
