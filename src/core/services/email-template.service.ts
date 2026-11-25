import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { EmailPreview, EmailTemplateRequest, EmailTemplateType, EmailTemplateView } from '../models/email-template.models';

/** Modèles d'e-mails de l'entreprise. */
@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company/email-templates`;

  list() {
    return this.http.get<EmailTemplateView[]>(this.base);
  }
  save(type: EmailTemplateType, body: EmailTemplateRequest) {
    return this.http.put<EmailTemplateView>(`${this.base}/${type}`, body);
  }
  /** Rétablit le texte par défaut. */
  reset(type: EmailTemplateType) {
    return this.http.delete<EmailTemplateView>(`${this.base}/${type}`);
  }
  /** Aperçu avec des valeurs d'exemple, sans enregistrer. */
  preview(type: EmailTemplateType, body: EmailTemplateRequest) {
    return this.http.post<EmailPreview>(`${this.base}/${type}/preview`, body);
  }
}
