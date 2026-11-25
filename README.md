# Plateforme de recrutement : frontend

Application Angular de la plateforme de gestion des candidatures (projet de fin d'études, IFRI) : interfaces des
candidats, des entreprises (administrateur, recruteur, manager) et du super administrateur.

La **documentation du projet** (architecture, manuel utilisateur, API, traçabilité du cahier des charges, données de
démonstration) se trouve dans le dépôt du backend : `platform-backend/README.md` et `platform-backend/docs/`.

## Prérequis et lancement

Node.js 20 ou plus, et le backend lancé en local sur le port 8087 (voir le README du backend).

```bash
npm install
npm start                  # http://localhost:4200 (rechargement automatique)
npm run build              # build de production dans dist/plateforme/browser
```

| Environnement | Fichier | Adresse de l'API |
|---|---|---|
| Développement (`ng serve`) | `src/environments/environment.development.ts` | `http://localhost:8087/app/api` |
| Production (`ng build`) | `src/environments/environment.ts` | `/app/api` (même domaine : le serveur web relaie `/app/**` vers le backend) |

## Organisation

```
src/
  core/                  services d'accès à l'API, modèles, gardes de route, intercepteurs (jeton, complétion du profil)
  environments/          adresse de l'API selon l'environnement
  app/
    layout/              barre de navigation (menu mobile), cloche de notifications, pied de page
    features/
      public/            accueil, recherche et détail des offres, page entreprise, signalement, passage d'un test
      auth/              inscription, connexion, vérification d'e-mail, mot de passe, invitation
      candidate/         profil, candidature, mes candidatures, entretiens, favoris, tableau de bord, suppression du compte
      company/           entreprise, équipe, offres, candidatures et Kanban, entretiens, évaluations, tests,
                         vivier, modèles d'e-mails, pipeline, tableau de bord
      admin/             entreprises, comptes, signalements, référentiels, journal d'audit
      notifications/     notifications et préférences
      legal/             conditions d'utilisation, confidentialité, mentions légales
    shared/              graphiques (SVG), calendrier, fil de messages, composants communs
  styles.scss            styles globaux (mise en page, petits écrans, écrans tactiles)
```

## Principes

- Angular 21 : composants autonomes, **signaux** (`signal`, `computed`), `ChangeDetectionStrategy.OnPush`, contrôle de flux
  natif (`@if`, `@for`, `@defer`), formulaires réactifs, `inject()`.
- Chaque page est **chargée à la demande** ; chargement initial d'environ 100 ko compressés. Les panneaux lourds de la
  fiche candidat sont chargés quand ils deviennent visibles (`@defer (on viewport)`).
- **Accessibilité (WCAG AA)** : libellés, rôles ARIA, messages annoncés (`role="status"` / `role="alert"`), navigation au
  clavier (Kanban compris), gestion du focus, contrastes ; graphiques doublés d'un tableau de données.
- **Responsive** : menu repliable sous 900 px, tableaux défilants, cibles tactiles de 44 px ; vérifié à 360 et 768 px.
- Sécurité : gardes de route par rôle ; le jeton est ajouté par un intercepteur et la session est fermée sur une
  réponse 401.
