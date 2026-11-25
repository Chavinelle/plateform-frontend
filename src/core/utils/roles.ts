import { Role } from '../models/auth.models';

export function homeRouteFor(role: Role): string {
  switch (role) {
    case 'CANDIDAT':
      return '/candidat';
    case 'SUPER_ADMIN':
      return '/admin';
    default:
      return '/recruteur';   // RECRUTEUR, MANAGER, ADMIN_ENTREPRISE
  }
}
