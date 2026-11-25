import { DatePipe } from '@angular/common';
import { RefDatalist } from '../../../../shared/ref-datalist/ref-datalist';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, skip } from 'rxjs';
import { CONTRACT_LABELS, ContractType } from '../../../../../core/models/candidate.models';
import {
  Department, EXPERIENCE_LABELS, ExperienceLevel, JOB_STATUS_LABELS, JobDetail, JobRequest, JobStatus,
  Member, REMOTE_LABELS, RemotePolicy, jobActionLabel, roleLabel
} from '../../../../../core/models/company.models';
import { JobService } from '../../../../../core/services/job.service';
import { TeamService } from '../../../../../core/services/team.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { blankToNull } from '../../../../../core/utils/text';
import { PipelineEditor } from '../pipeline-editor/pipeline-editor';
import { QuestionsEditor } from '../questions-editor/questions-editor';
import { Loading } from '../../../../shared/loading/loading';

const STEPS = [
  { n: 1, label: 'Informations' },
  { n: 2, label: 'Description' },
  { n: 3, label: 'Recrutement' },
  { n: 4, label: 'Questions' },
  { n: 5, label: 'Pipeline' }
];

const STEP_FIELDS: Record<number, string[]> = {
  1: ['title', 'departmentId', 'contractType', 'experienceLevel', 'city', 'country',
      'remotePolicy', 'positionsCount', 'deadline'],
  2: ['description', 'missions', 'requiredProfile', 'benefits', 'salaryMin', 'salaryMax', 'salaryCurrency'],
  3: ['managerId', 'publishAt']
};

const NEEDS_CONFIRMATION: JobStatus[] = ['SUSPENDUE', 'CLOTUREE', 'POURVUE', 'ARCHIVEE'];
const MAX_SKILLS = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const notInPast = (c: AbstractControl): ValidationErrors | null => {
  const value = c.value as string;
  return value && value < todayIso() ? { past: true } : null;
};

@Component({
  selector: 'app-job-form',
  imports: [Loading, RefDatalist, ReactiveFormsModule, RouterLink, DatePipe, QuestionsEditor, PipelineEditor],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss'
})
export class JobForm implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(JobService);
  private team = inject(TeamService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  steps = STEPS;
  today = todayIso();
  roleLabel = roleLabel;

  contractTypes = (Object.keys(CONTRACT_LABELS) as ContractType[]).map(value => ({ value, label: CONTRACT_LABELS[value] }));
  experienceLevels = (Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(value => ({ value, label: EXPERIENCE_LABELS[value] }));
  remotePolicies = (Object.keys(REMOTE_LABELS) as RemotePolicy[]).map(value => ({ value, label: REMOTE_LABELS[value] }));
  currencies = ['EUR', 'USD', 'GBP', 'CAD', 'CHF', 'XOF', 'MAD'];

  job = signal<JobDetail | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  step = signal(1);
  saving = signal(false);
  busy = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  departments = signal<Department[]>([]);
  members = signal<Member[]>([]);
  skills = signal<string[]>([]);
  skillError = signal<string | null>(null);
  evaluatorIds = signal<number[]>([]);

  isEdit = computed(() => this.job() !== null);
  locked = computed(() => {
    const j = this.job();
    return j !== null && !j.editable;
  });
  questionsReadonly = computed(() => {
    const j = this.job();
    return !j || !j.editable || (j.status !== 'BROUILLON' && j.status !== 'EN_ATTENTE_VALIDATION');
  });
  activeMembers = computed(() => this.members().filter(m => m.status === 'ACTIF'));

  form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    departmentId: this.fb.control<number | null>(null),
    contractType: this.fb.nonNullable.control<ContractType | ''>(''),
    experienceLevel: this.fb.nonNullable.control<ExperienceLevel | ''>(''),
    city: this.fb.nonNullable.control('', Validators.maxLength(100)),
    country: this.fb.nonNullable.control('', Validators.maxLength(100)),
    remotePolicy: this.fb.nonNullable.control<RemotePolicy>('SUR_SITE'),
    positionsCount: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(1000)]),
    deadline: this.fb.nonNullable.control('', notInPast),
    publishAt: this.fb.nonNullable.control(''),
    description: this.fb.nonNullable.control('', Validators.maxLength(10000)),
    missions: this.fb.nonNullable.control('', Validators.maxLength(10000)),
    requiredProfile: this.fb.nonNullable.control('', Validators.maxLength(10000)),
    benefits: this.fb.nonNullable.control('', Validators.maxLength(5000)),
    salaryMin: this.fb.control<number | null>(null, Validators.min(0)),
    salaryMax: this.fb.control<number | null>(null, Validators.min(0)),
    salaryCurrency: this.fb.nonNullable.control('', Validators.pattern(/^$|^[A-Za-z]{3}$/)),
    managerId: this.fb.control<number | null>(null)
  });

constructor() {
  this.route.paramMap.pipe(skip(1), takeUntilDestroyed()).subscribe(() => {
    this.job.set(null);
    this.loadError.set(null);
    this.message.set(null);
    this.error.set(null);
    this.step.set(1);
    this.skills.set([]);
    this.evaluatorIds.set([]);
    this.form.reset();
    this.form.enable();
    this.loading.set(true);
    this.start();
  });
}

ngOnInit() {
  this.start();
}

private start() {
  forkJoin({ departments: this.team.listDepartments(), members: this.team.listMembers() }).subscribe({
    next: ({ departments, members }) => {
      this.departments.set(departments);
      this.members.set(members);
      this.loadJob();
    },
    error: err => {
      this.loading.set(false);
      this.loadError.set(extractErrorMessage(err));
    }
  });
}

  private loadJob() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === null) {               // création
      this.loading.set(false);
      return;
    }
    const id = Number(idParam);
    if (!Number.isInteger(id)) {
      this.loading.set(false);
      this.loadError.set('Offre introuvable.');
      return;
    }
    this.api.get(id).subscribe({
      next: job => {
        this.setJob(job);
        const q = this.route.snapshot.queryParamMap;
        const wanted = Number(q.get('step'));
        if (wanted >= 1 && wanted <= 5) this.step.set(wanted);
        if (q.get('created')) {
          this.message.set('Brouillon enregistré. Vous pouvez maintenant ajouter des questions et ajuster le pipeline.');
        }
        if (q.get('duplicated')) {
       this.message.set('Copie créée en brouillon. Vérifiez les informations, fixez une nouvelle date limite, puis publiez.');
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Navigation ----------------

  statusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status];
  }

  actionLabel(current: JobStatus, target: JobStatus): string {
    return jobActionLabel(current, target);
  }

  bad(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.touched && c.invalid;
  }

  stepInvalid(n: number): boolean {
    return (STEP_FIELDS[n] ?? []).some(f => this.form.get(f)?.invalid);
  }

  goTo(n: number) {
    if (n > 3 && !this.isEdit()) return;
    this.step.set(n);
  }

  prev() {
    this.step.update(s => Math.max(s - 1, 1));
  }

  next() {
    if (this.step() <= 3) {
      (STEP_FIELDS[this.step()] ?? []).forEach(f => this.form.get(f)?.markAsTouched());
      if (this.stepInvalid(this.step())) return;
    }
    this.step.update(s => Math.min(s + 1, 5));
  }

  // ---------------- Compétences et évaluateurs ----------------

  addSkill(box: HTMLInputElement) {
    const value = box.value.trim();
    box.value = '';
    if (!value) return;
    this.skillError.set(null);
    if (value.length > 100) {
      this.skillError.set('100 caractères maximum par compétence.');
      return;
    }
    if (this.skills().length >= MAX_SKILLS) {
      this.skillError.set(`${MAX_SKILLS} compétences maximum.`);
      return;
    }
    if (this.skills().some(s => s.toLowerCase() === value.toLowerCase())) return;
    this.skills.update(list => [...list, value]);
    this.form.markAsDirty();
  }

  removeSkill(skill: string) {
    this.skills.update(list => list.filter(s => s !== skill));
    this.form.markAsDirty();
  }

  onEvaluator(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.evaluatorIds.update(list => checked ? [...new Set([...list, id])] : list.filter(x => x !== id));
    this.form.markAsDirty();
  }

  // ---------------- Enregistrement ----------------

  save() {
    this.message.set(null);
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstBad = [1, 2, 3].find(n => this.stepInvalid(n));
      if (firstBad) this.step.set(firstBad);
      this.error.set('Corrigez les champs signalés avant d\'enregistrer.');
      return;
    }
    const v = this.form.getRawValue();
    if (v.salaryMin !== null && v.salaryMax !== null && v.salaryMax < v.salaryMin) {
      this.step.set(2);
      this.error.set('Le salaire maximum doit être supérieur ou égal au minimum.');
      return;
    }

    const body = this.buildRequest();
    const id = this.job()?.id ?? null;
    this.saving.set(true);

    const request$ = id === null ? this.api.create(body) : this.api.update(id, body);
    request$.subscribe({
      next: saved => {
        this.saving.set(false);
        if (id === null) {
          // première sauvegarde : on passe en mode édition, directement à l'étape des questions
          this.router.navigate(['/recruteur/offres', saved.id], { queryParams: { step: 4, created: 1 } });
        } else {
          this.setJob(saved);
          this.message.set('Offre enregistrée.');
        }
      },
      error: err => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  changeStatus(target: JobStatus) {
    const job = this.job();
    if (!job) return;
    if (this.form.dirty) {
      this.error.set('Enregistrez vos modifications avant de changer le statut de l\'offre.');
      return;
    }
    const label = jobActionLabel(job.status, target);
    if (NEEDS_CONFIRMATION.includes(target) && !confirm(`${label} l'offre « ${job.title} » ?`)) return;

    this.busy.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.changeStatus(job.id, target).subscribe({
      next: updated => {
        this.busy.set(false);
        this.setJob(updated);
        this.message.set(`Statut : ${JOB_STATUS_LABELS[updated.status].toLowerCase()}.`);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  duplicate() {
  const job = this.job();
  if (!job) return;
  this.busy.set(true);
  this.message.set(null);
  this.error.set(null);
  this.api.duplicate(job.id).subscribe({
    next: copy => {
      this.busy.set(false);
      this.router.navigate(['/recruteur/offres', copy.id], { queryParams: { duplicated: 1 } });
    },
    error: err => {
      this.busy.set(false);
      this.error.set(extractErrorMessage(err));
    }
  });
}

  remove() {
    const job = this.job();
    if (!job || !confirm(`Supprimer définitivement le brouillon « ${job.title} » ?`)) return;
    this.busy.set(true);
    this.api.delete(job.id).subscribe({
      next: () => this.router.navigate(['/recruteur/offres']),
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Outils ----------------

  private setJob(job: JobDetail) {
    this.job.set(job);
    this.fill(job);
    if (job.editable) this.form.enable(); else this.form.disable();    // lecture seule si non modifiable
  }

  private fill(j: JobDetail) {
    this.form.reset({
      title: j.title,
      departmentId: j.departmentId,
      contractType: j.contractType ?? '',
      experienceLevel: j.experienceLevel ?? '',
      city: j.city ?? '',
      country: j.country ?? '',
      remotePolicy: j.remotePolicy,
      positionsCount: j.positionsCount,
      deadline: j.deadline ?? '',
      publishAt: j.publishAt ? j.publishAt.slice(0, 16) : '',
      description: j.description ?? '',
      missions: j.missions ?? '',
      requiredProfile: j.requiredProfile ?? '',
      benefits: j.benefits ?? '',
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      salaryCurrency: j.salaryCurrency ?? '',
      managerId: j.manager?.id ?? null
    });
    this.skills.set([...j.skills]);
    this.evaluatorIds.set(j.evaluators.map(e => e.id));
  }

  private buildRequest(): JobRequest {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      departmentId: v.departmentId,
      description: blankToNull(v.description),
      missions: blankToNull(v.missions),
      requiredProfile: blankToNull(v.requiredProfile),
      benefits: blankToNull(v.benefits),
      contractType: v.contractType || null,
      experienceLevel: v.experienceLevel || null,
      city: blankToNull(v.city),
      country: blankToNull(v.country),
      remotePolicy: v.remotePolicy,
      salaryMin: v.salaryMin,
      salaryMax: v.salaryMax,
      salaryCurrency: blankToNull(v.salaryCurrency)?.toUpperCase() ?? null,
      positionsCount: v.positionsCount,
      deadline: v.deadline || null,
      publishAt: v.publishAt || null,
      skills: this.skills(),
      managerId: v.managerId,
      evaluatorIds: this.evaluatorIds()
    };
  }
}
