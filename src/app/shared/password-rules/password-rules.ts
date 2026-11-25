import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Règles du mot de passe, affichées sous le champ dès le départ et cochées pendant la saisie
 * (mêmes règles que le serveur : PASSWORD_PATTERN). Le champ y renvoie par aria-describedby.
 * L'état n'est pas annoncé à chaque frappe (ce serait bruyant) : il est lu avec la description du champ.
 */
@Component({
  selector: 'app-password-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rules" [id]="rulesId()">
      <span class="title">Le mot de passe doit contenir :</span>
      <ul>
        @for (rule of rules(); track rule.label) {
          <li [class.ok]="rule.ok">
            <span class="mark" aria-hidden="true">{{ rule.ok ? '✓' : '•' }}</span>
            {{ rule.label }}<span class="sr-only">{{ rule.ok ? ' : respecté' : ' : pas encore' }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .rules { font-size: .84rem; color: var(--text-muted); margin: .1rem 0 .2rem; }
    .title { display: block; margin-bottom: .15rem; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .15rem 1rem; }
    li { display: inline-flex; align-items: center; gap: .35rem; }
    li.ok { color: var(--success); }
    .mark { display: inline-block; width: 1em; text-align: center; font-weight: 700; }
  `,
})
export class PasswordRules {
  /** Identifiant à reprendre dans aria-describedby du champ. */
  readonly rulesId = input.required<string>();
  /** Valeur saisie. */
  readonly value = input<string>('');

  protected readonly rules = computed(() => {
    const v = this.value() ?? '';
    return [
      { label: '8 caractères au moins', ok: v.length >= 8 },
      { label: 'une lettre', ok: /[A-Za-z]/.test(v) },
      { label: 'un chiffre', ok: /\d/.test(v) },
    ];
  });
}
