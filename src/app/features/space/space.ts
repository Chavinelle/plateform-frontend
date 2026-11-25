import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavIcon } from '../../layout/nav-icon/nav-icon';

interface Tile { label: string; description: string; path: string; icon: string; }

const CANDIDATE_TILES: Tile[] = [
  { label: 'Tableau de bord', description: 'Candidatures, entretiens et tests en un coup d’œil.', path: '/candidat/tableau-de-bord', icon: 'chart' },
  { label: 'Mon profil', description: 'Expériences, compétences et documents.', path: '/candidat/profil', icon: 'user' },
  { label: 'Mes candidatures', description: 'Suivez l’avancement de chaque dossier.', path: '/candidat/candidatures', icon: 'briefcase' },
  { label: 'Mes entretiens', description: 'Rendez-vous à venir et réponses aux invitations.', path: '/candidat/entretiens', icon: 'calendar' },
  { label: 'Favoris', description: 'Les offres que vous avez mises de côté.', path: '/candidat/favoris', icon: 'heart' },
  { label: 'Offres d’emploi', description: 'Parcourez les offres publiées.', path: '/offres', icon: 'search' },
];

const COMPANY_TILES: Tile[] = [
  { label: 'Tableau de bord', description: 'Indicateurs, sources et entonnoir de recrutement.', path: '/recruteur/tableau-de-bord', icon: 'chart' },
  { label: 'Offres', description: 'Créez, publiez et gérez vos offres.', path: '/recruteur/offres', icon: 'briefcase' },
  { label: 'Pipeline', description: 'Toutes les candidatures, étape par étape.', path: '/recruteur/pipeline', icon: 'columns' },
  { label: 'Agenda', description: 'Entretiens planifiés avec les candidats.', path: '/recruteur/agenda', icon: 'calendar' },
  { label: 'Vivier de talents', description: 'Profils conservés pour vos prochains postes.', path: '/recruteur/vivier', icon: 'star' },
  { label: 'Équipe', description: 'Membres, services et invitations.', path: '/recruteur/equipe', icon: 'users' },
];

/** Accueil d'un espace (candidat ou entreprise) : salutation, action principale et accès rapides. */
@Component({
  selector: 'app-space',
  imports: [RouterLink, NavIcon],
  templateUrl: './space.html',
  styleUrl: './space.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Space {
  auth = inject(AuthService);
  title = inject(ActivatedRoute).snapshot.data['title'] as string;

  private isCandidate = computed(() => this.auth.user()?.role === 'CANDIDAT');

  intro = computed(() => this.isCandidate()
    ? 'Retrouvez vos candidatures, vos entretiens et les offres qui vous intéressent.'
    : 'Pilotez vos recrutements : offres, candidatures, entretiens et évaluations.');

  primary = computed<Tile | null>(() => {
    if (this.isCandidate()) return { label: 'Trouver une offre', description: '', path: '/offres', icon: 'search' };
    // le manager ne crée pas d'offre : il arrive sur le pipeline
    return this.auth.user()?.role === 'MANAGER'
      ? { label: 'Voir le pipeline', description: '', path: '/recruteur/pipeline', icon: 'columns' }
      : { label: 'Nouvelle offre', description: '', path: '/recruteur/offres/nouvelle', icon: 'plus' };
  });

  tiles = computed(() => (this.isCandidate() ? CANDIDATE_TILES : COMPANY_TILES));
}
