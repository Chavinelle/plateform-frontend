import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Une erreur est survenue';
  if (err.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';

  const fields = err.error?.fieldErrors as Record<string, string> | null | undefined;
  if (fields && Object.keys(fields).length > 0) {
    return Object.values(fields).join(' ');
  }
  return err.error?.message ?? 'Une erreur est survenue';
}
