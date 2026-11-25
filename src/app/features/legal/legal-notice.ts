import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_INFO } from './legal-info';

/** Mentions légales. */
@Component({
  selector: 'app-legal-notice',
  imports: [RouterLink],
  template: `
    @let i = info;
    <article class="page legal">
      <h1>Mentions légales</h1>
      <p class="updated">Dernière mise à jour : {{ i.lastUpdate }}</p>
      <p class="draft">Version de démonstration : les informations ci-dessous sont génériques et doivent être complétées
        avant toute mise en ligne publique.</p>

      <h2>Éditeur</h2>
      <dl>
        <dt>Nom</dt><dd>{{ i.publisher }}</dd>
        <dt>Statut</dt><dd>{{ i.publisherStatus }}</dd>
        <dt>Adresse</dt><dd>{{ i.address }}</dd>
        <dt>Contact</dt><dd><a [href]="'mailto:' + i.contactEmail">{{ i.contactEmail }}</a></dd>
        <dt>Directeur de la publication</dt><dd>{{ i.director }}</dd>
      </dl>

      <h2>Hébergement</h2>
      <dl>
        <dt>Hébergeur</dt><dd>{{ i.host }}</dd>
        <dt>Coordonnées</dt><dd>{{ i.hostAddress }}</dd>
      </dl>

      <h2>Propriété intellectuelle</h2>
      <p>La structure du site, ses textes et ses éléments graphiques sont la propriété de l'éditeur. Les offres d'emploi
        restent la propriété des entreprises qui les publient ; les profils et documents des candidats restent leur propriété.</p>

      <h2>Données personnelles</h2>
      <p>Le traitement des données personnelles est décrit dans la <a routerLink="/confidentialite">politique de confidentialité</a>.
        L'utilisation du site est encadrée par les <a routerLink="/conditions-utilisation">conditions d'utilisation</a>.</p>
    </article>
  `,
  styleUrl: './legal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalNotice {
  readonly info = LEGAL_INFO;
}
