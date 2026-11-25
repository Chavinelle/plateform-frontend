import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { homeRouteFor } from '../utils/roles';

/** Page réservée aux utilisateurs connectés. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasValidSession()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Page réservée à certains rôles. */
export const roleGuard = (allowed: Role[]): CanActivateFn => (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasValidSession()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const user = auth.user();
  if (user && allowed.includes(user.role)) return true;

  // connecté mais pas le bon rôle : on renvoie vers son propre espace
  return router.createUrlTree([user ? homeRouteFor(user.role) : '/login']);
};

/** Pages réservées aux visiteurs (login, inscription...) : un connecté est renvoyé chez lui. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (auth.hasValidSession() && user) {
    return router.createUrlTree([homeRouteFor(user.role)]);
  }
  return true;
};
