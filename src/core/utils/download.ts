import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { extractErrorMessage } from './http-error';

/** Déclenche l'enregistrement d'un fichier reçu en "blob". */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Nom de fichier indiqué par le serveur (en-tête Content-Disposition, exposé par la configuration CORS).
 * Gère la forme encodée « filename*=UTF-8''… » utilisée pour les accents.
 */
export function filenameFrom(res: HttpResponse<Blob>, fallback: string): string {
  const header = res.headers.get('Content-Disposition') ?? '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // encodage invalide : on essaie la forme simple
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

/** Pour une requête "blob", le message d'erreur JSON du serveur arrive lui aussi sous forme de blob. */
export async function readBlobError(err: unknown): Promise<string> {
  if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
    try {
      const body = JSON.parse(await err.error.text()) as { message?: string };
      if (body.message) return body.message;
    } catch {
      // corps illisible : message générique ci-dessous
    }
  }
  return extractErrorMessage(err);
}
