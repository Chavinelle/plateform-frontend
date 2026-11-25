import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_INFO } from './legal-info';

/** Conditions générales d'utilisation. */
@Component({
  selector: 'app-terms',
  imports: [RouterLink],
  templateUrl: './terms.html',
  styleUrl: './legal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Terms {
  readonly info = LEGAL_INFO;
}
