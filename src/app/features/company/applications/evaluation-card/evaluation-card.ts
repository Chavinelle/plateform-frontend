import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EvaluationView } from '../../../../../core/models/evaluation.models';
import { INTERVIEW_OPINION_LABELS } from '../../../../../core/models/interview.models';

/** Évaluation soumise, en lecture seule. */
@Component({
  selector: 'app-evaluation-card',
  imports: [DatePipe, DecimalPipe],
  template: `
    @let e = evaluation();
    <article class="evaluation" [attr.aria-label]="'Évaluation de ' + (e.mine ? 'vous' : e.evaluatorName)">
      <div class="head">
        <strong>{{ e.mine ? 'Vous' : e.evaluatorName }}</strong>
        @if (e.opinion) { <span class="badge opinion-{{ e.opinion }}">{{ opinionLabels[e.opinion] }}</span> }
        @if (e.score !== null) { <span class="score">{{ e.score | number: '1.0-1' }}/100</span> }
      </div>
      <p class="muted meta">
        Grille « {{ e.templateName }} »
        @if (e.interviewStartsAt) { · entretien du {{ e.interviewStartsAt | date: 'd MMM y' }} }
        @if (e.submittedAt) { · soumise le {{ e.submittedAt | date: 'd MMM y, HH:mm' }} }
      </p>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Notes par critère">
        <table class="table scores">
          <caption class="sr-only">Notes par critère</caption>
          <thead><tr><th scope="col">Critère</th><th scope="col">Note</th><th scope="col">Commentaire</th></tr></thead>
          <tbody>
            @for (s of e.scores; track s.id) {
              <tr>
                <th scope="row">{{ s.label }} <small class="muted">({{ s.percent }} %)</small></th>
                <td>{{ s.score ?? '–' }}/5</td>
                <td>{{ s.comment ?? '' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (e.comment) { <p class="pre comment">{{ e.comment }}</p> }
    </article>
  `,
  styles: `
    .evaluation { border: 1px solid var(--border); border-radius: 6px; padding: .6rem .75rem; }
    .head { display: flex; gap: .5rem; align-items: baseline; flex-wrap: wrap; }
    .score { font-weight: 700; font-variant-numeric: tabular-nums; }
    .meta { margin: .2rem 0 .4rem; }
    .scores th[scope='row'] { text-align: left; font-weight: 500; }
    .comment { margin: .4rem 0 0; }
    .opinion-TRES_FAVORABLE, .opinion-FAVORABLE { border-color: var(--success); color: var(--success); }
    .opinion-DEFAVORABLE { border-color: var(--warning); color: var(--warning); }
    .opinion-TRES_DEFAVORABLE { border-color: var(--danger); color: var(--danger); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationCard {
  evaluation = input.required<EvaluationView>();
  readonly opinionLabels = INTERVIEW_OPINION_LABELS;
}
