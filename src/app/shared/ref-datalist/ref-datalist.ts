import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ReferentialKind } from '../../../core/models/referential.models';
import { ReferentialService } from '../../../core/services/referential.service';

/**
 * Suggestions d'un référentiel pour un champ texte : à associer avec {@code list="ref-VILLE"} (ou SECTEUR,
 * COMPETENCE) sur l'input. La saisie libre reste possible.
 */
@Component({
  selector: 'app-ref-datalist',
  template: `
    <datalist [id]="'ref-' + kind()">
      @for (label of labels(); track label) { <option [value]="label"></option> }
    </datalist>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefDatalist {
  private api = inject(ReferentialService);
  kind = input.required<ReferentialKind>();
  labels = computed(() => this.api.labels(this.kind())());
}
