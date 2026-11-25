import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { EmailPreview, EmailTemplateView } from '../../../../../core/models/email-template.models';
import { EmailTemplateService } from '../../../../../core/services/email-template.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/** Modification d'un modèle d'e-mail : objet, texte, insertion de variables, aperçu, retour au texte par défaut. */
@Component({
  selector: 'app-email-template-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './email-template-editor.html',
  styleUrl: './email-template-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmailTemplateEditor {
  private fb = inject(FormBuilder);
  private api = inject(EmailTemplateService);

  template = input.required<EmailTemplateView>();
  /** Recruteur : consultation et aperçu seulement. */
  canEdit = input(false);
  saved = output<EmailTemplateView>();
  closed = output<void>();

  busy = signal<'save' | 'reset' | 'preview' | null>(null);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  preview = signal<EmailPreview | null>(null);
  confirmReset = signal(false);

  form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.maxLength(10000)]]
  });

  private bodyArea = viewChild<ElementRef<HTMLTextAreaElement>>('bodyArea');

  constructor() {
    effect(() => {
      const t = this.template();
      const editable = this.canEdit();
      untracked(() => {
        this.form.reset({ subject: t.subject, body: t.body });
        if (editable) this.form.enable(); else this.form.disable();
        this.preview.set(null);
        this.error.set(null);
        this.confirmReset.set(false);
      });
    });
  }

  isRequired(name: string): boolean {
    return this.template().required.includes(name);
  }

  /** Insère {variable} à la position du curseur dans le texte, puis y remet le focus. */
  insert(name: string) {
    const area = this.bodyArea()?.nativeElement;
    const token = `{${name}}`;
    const value = this.form.controls.body.value;
    const start = area?.selectionStart ?? value.length;
    const end = area?.selectionEnd ?? value.length;
    this.form.controls.body.setValue(value.slice(0, start) + token + value.slice(end));
    this.form.controls.body.markAsDirty();
    this.message.set(`Variable ${token} insérée.`);
    setTimeout(() => {
      if (!area) return;
      area.focus();
      area.setSelectionRange(start + token.length, start + token.length);
    });
  }

  showPreview() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set("L'objet et le texte sont obligatoires.");
      return;
    }
    this.run('preview', this.api.preview(this.template().type, this.form.getRawValue()), p => {
      this.preview.set(p);
      this.message.set('Aperçu mis à jour.');
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set("L'objet et le texte sont obligatoires.");
      return;
    }
    this.run('save', this.api.save(this.template().type, this.form.getRawValue()), t => this.saved.emit(t));
  }

  reset() {
    this.run('reset', this.api.reset(this.template().type), t => {
      this.confirmReset.set(false);
      this.saved.emit(t);
    });
  }

  private run<T>(kind: 'save' | 'reset' | 'preview', request: Observable<T>, next: (value: T) => void) {
    this.busy.set(kind);
    this.error.set(null);
    this.message.set(null);
    request.subscribe({
      next: value => {
        this.busy.set(null);
        next(value);
      },
      error: err => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
