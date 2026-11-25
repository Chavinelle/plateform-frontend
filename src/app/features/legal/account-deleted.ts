import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Confirmation après la suppression du compte (11.8) ; la session est déjà fermée. */
@Component({
  selector: 'app-account-deleted',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page">
      <h1>Votre compte a été supprimé</h1>
      <p>Votre profil, vos documents et le contenu de vos candidatures ont été effacés. Les entreprises ne voient plus
        qu'une candidature anonyme. Un e-mail de confirmation a été envoyé à votre ancienne adresse.</p>
      <p>Merci d'avoir utilisé la plateforme. Vous pouvez créer un nouveau compte à tout moment.</p>
      <p class="actions">
        <a routerLink="/offres" class="button-link">Voir les offres</a>
        <a routerLink="/" class="button-link">Accueil</a>
      </p>
    </article>
  `,
})
export class AccountDeleted {}
