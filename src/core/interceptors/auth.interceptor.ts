import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthRoute = req.url.startsWith(`${environment.apiUrl}/auth/`);
  const token = auth.token();

  const authReq = token && isApi && !isAuthRoute
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      // jeton expiré ou invalide sur une route protégée ; une réponse tardive à une requête partie avant
      // la déconnexion (ex. suppression du compte) ne doit pas renvoyer vers la page de connexion
      if (err.status === 401 && isApi && !isAuthRoute && token !== null && auth.token() === token) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
