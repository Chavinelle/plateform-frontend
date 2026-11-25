import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { EmailTemplateType, EmailTemplateView } from '../../../../core/models/email-template.models';
import { AuthService } from '../../../../core/services/auth.service';
import { EmailTemplateService } from '../../../../core/services/email-template.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { EmailTemplateEditor } from './email-template-editor/email-template-editor';

/** Modèles d'e-mails envoyés aux candidats (administrateur : modification ; recruteurs : consultation). */
@Component({
  selector: 'app-email-templates',
  imports: [DatePipe, EmailTemplateEditor],
  templateUrl: './email-templates.html',
  styleUrl: './email-templates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmailTemplates {
  private api = inject(EmailTemplateService);
  private auth = inject(AuthService);

  /** Le serveur le vérifie aussi. */
  canEdit = computed(() => this.auth.user()?.role === 'ADMIN_ENTREPRISE');
  templates = signal<EmailTemplateView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  selectedType = signal<EmailTemplateType | null>(null);
  selected = computed(() => this.templates().find(t => t.type === this.selectedType()) ?? null);

  private editorHeading = viewChild<ElementRef<HTMLElement>>('editorHeading');

  constructor() {
    this.api.list().subscribe({
      next: list => {
        this.loading.set(false);
        this.templates.set(list);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  open(t: EmailTemplateView) {
    this.message.set(null);
    this.selectedType.set(t.type);
    setTimeout(() => this.editorHeading()?.nativeElement.focus());
  }

  close() {
    const type = this.selectedType();
    this.selectedType.set(null);
    setTimeout(() => document.getElementById('open-' + type)?.focus());
  }

  onSaved(t: EmailTemplateView) {
    this.templates.update(list => list.map(x => (x.type === t.type ? t : x)));
    this.message.set(t.customized
      ? `Modèle « ${t.label} » enregistré : il s'applique aux prochains e-mails.`
      : `Modèle « ${t.label} » : le texte par défaut s'applique de nouveau.`);
  }
}
