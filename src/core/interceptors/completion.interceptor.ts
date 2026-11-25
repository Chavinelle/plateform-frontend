import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProfileCompletionService } from '../services/profile-completion.service';

export const completionInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  // la suppression du compte (11.8) n'est pas une modification du profil : le compte n'existe plus ensuite
  const changesProfile = req.method !== 'GET' && req.url.startsWith(`${environment.apiUrl}/candidate/`)
    && !req.url.startsWith(`${environment.apiUrl}/candidate/account/`);

  return next(req).pipe(
    tap(event => {
      if (changesProfile && event instanceof HttpResponse) {
        injector.get(ProfileCompletionService).refresh();
      }
    })
  );
};
