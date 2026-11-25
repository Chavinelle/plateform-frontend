import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { CONTRACT_LABELS, ContractType } from '../../../../core/models/candidate.models';
import {
  EXPERIENCE_LABELS, ExperienceLevel, PageResponse, REMOTE_LABELS, RemotePolicy
} from '../../../../core/models/company.models';
import { JobSearchParams, PublicFilters, PublicJobSummary } from '../../../../core/models/public.models';
import { PublicService } from '../../../../core/services/public.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { JobCard } from '../job-card/job-card';

type ListKey = 'contractType' | 'experienceLevel' | 'remotePolicy';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-job-search',
  imports: [ReactiveFormsModule, JobCard],
  templateUrl: './job-search.html',
  styleUrl: './job-search.scss'
})
export class JobSearch implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(PublicService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  result = signal<PageResponse<PublicJobSummary> | null>(null);
  filters = signal<PublicFilters>({ sectors: [], countries: [] });
  loading = signal(true);
  error = signal<string | null>(null);
  totalPages = computed(() => Math.max(this.result()?.totalPages ?? 1, 1));

  contractOptions = (Object.keys(CONTRACT_LABELS) as ContractType[]).map(value => ({ value, label: CONTRACT_LABELS[value] }));
  experienceOptions = (Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(value => ({ value, label: EXPERIENCE_LABELS[value] }));
  remoteOptions = (Object.keys(REMOTE_LABELS) as RemotePolicy[]).map(value => ({ value, label: REMOTE_LABELS[value] }));
  currencies = ['EUR', 'USD', 'GBP', 'CAD', 'CHF', 'XOF', 'MAD'];

  form = this.fb.nonNullable.group({
    q: [''],
    city: [''],
    country: [''],
    sector: [''],
    contractType: [[] as string[]],
    experienceLevel: [[] as string[]],
    remotePolicy: [[] as string[]],
    salaryMin: this.fb.control<number | null>(null),
    currency: ['EUR'],
    postedWithinDays: [''],
    sort: ['RECENT' as 'RECENT' | 'RELEVANCE']
  });

  constructor() {
    // l'URL est la source de vérité : chaque changement d'URL relance la recherche
    this.route.queryParamMap.pipe(
      tap(pm => {
        this.fillForm(pm);
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(pm => this.api.searchJobs(this.toSearch(pm)).pipe(
        catchError(err => {
          this.error.set(extractErrorMessage(err));
          return of(null);
        })
      )),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      if (res) {
        this.result.set(res);
        if (res.page > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // les filtres s'appliquent après une courte pause (pas une requête par frappe)
    this.form.valueChanges.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => this.apply(0));
  }

  ngOnInit() {
    this.api.filters().subscribe({ next: f => this.filters.set(f), error: () => { /* listes vides */ } });
  }

  // ---------------- Cases à cocher ----------------

  has(key: ListKey, value: string): boolean {
    return this.form.controls[key].value.includes(value);
  }

  toggle(key: ListKey, value: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const control = this.form.controls[key] as FormControl<string[]>;
    control.setValue(checked ? [...control.value, value] : control.value.filter(v => v !== value));
  }

  // ---------------- URL <-> formulaire ----------------

  apply(page: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: this.toQueryParams(Math.max(page, 0)) });
  }

  reset() {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private toQueryParams(page: number): Params {
    const v = this.form.getRawValue();
    const qp: Params = {};
    if (v.q.trim()) qp['q'] = v.q.trim();
    if (v.city.trim()) qp['city'] = v.city.trim();
    if (v.country) qp['country'] = v.country;
    if (v.sector) qp['sector'] = v.sector;
    if (v.contractType.length) qp['contractType'] = v.contractType;
    if (v.experienceLevel.length) qp['experienceLevel'] = v.experienceLevel;
    if (v.remotePolicy.length) qp['remotePolicy'] = v.remotePolicy;
    if (v.salaryMin !== null && v.salaryMin > 0) {
      qp['salaryMin'] = v.salaryMin;
      qp['currency'] = v.currency;
    }
    if (v.postedWithinDays) qp['postedWithinDays'] = v.postedWithinDays;
    if (v.sort !== 'RECENT') qp['sort'] = v.sort;
    if (page > 0) qp['page'] = page;
    return qp;
  }

  private fillForm(pm: ParamMap) {
    this.form.reset({
      q: pm.get('q') ?? '',
      city: pm.get('city') ?? '',
      country: pm.get('country') ?? '',
      sector: pm.get('sector') ?? '',
      contractType: pm.getAll('contractType'),
      experienceLevel: pm.getAll('experienceLevel'),
      remotePolicy: pm.getAll('remotePolicy'),
      salaryMin: pm.get('salaryMin') ? Number(pm.get('salaryMin')) : null,
      currency: pm.get('currency') ?? 'EUR',
      postedWithinDays: pm.get('postedWithinDays') ?? '',
      sort: pm.get('sort') === 'RELEVANCE' ? 'RELEVANCE' : 'RECENT'
    }, { emitEvent: false });          // sans cela, remplir le formulaire relancerait une navigation en boucle
  }

  private toSearch(pm: ParamMap): JobSearchParams {
    const num = (key: string) => (pm.get(key) ? Number(pm.get(key)) : undefined);
    return {
      q: pm.get('q') ?? undefined,
      city: pm.get('city') ?? undefined,
      country: pm.get('country') ?? undefined,
      sector: pm.get('sector') ?? undefined,
      contractType: pm.getAll('contractType') as ContractType[],
      experienceLevel: pm.getAll('experienceLevel') as ExperienceLevel[],
      remotePolicy: pm.getAll('remotePolicy') as RemotePolicy[],
      salaryMin: num('salaryMin'),
      currency: pm.get('currency') ?? undefined,
      postedWithinDays: num('postedWithinDays'),
      sort: pm.get('sort') === 'RELEVANCE' ? 'RELEVANCE' : 'RECENT',
      page: num('page') ?? 0,
      size: PAGE_SIZE
    };
  }
}
