import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecruiterApplicationItem } from '../../../../../core/models/application.models';
import { BulkMessageResponse, MAX_MESSAGE_LENGTH } from '../../../../../core/models/message.models';
import { MessageService } from '../../../../../core/services/message.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';

/** Même message à plusieurs candidats : variables, aperçu pour le premier, envoi. */
@Component({
  selector: 'app-bulk-message-form',
  imports: [ReactiveFormsModule],
  templateUrl: './bulk-message-form.html',
  styleUrl: './bulk-message-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkMessageForm {
  private api = inject(MessageService);
  private fb = inject(FormBuilder);

  jobId = input.required<number>();
  selection = input.required<RecruiterApplicationItem[]>();
  sent = output<BulkMessageResponse>();
  cancelled = output<void>();

  readonly max = MAX_MESSAGE_LENGTH;
  readonly variables = [
    { name: 'prenom', label: 'prénom du candidat' },
    { name: 'nom', label: 'nom du candidat' },
    { name: 'poste', label: "intitulé de l'offre" },
    { name: 'entreprise', label: 'nom de votre entreprise' }
  ];
  busy = signal<'preview' | 'send' | null>(null);
  error = signal<string | null>(null);
  preview = signal<{ candidateName: string; body: string } | null>(null);
  length = signal(0);

  form = this.fb.nonNullable.group({
    body: ['Bonjour {prenom},\n\n', [Validators.required, Validators.maxLength(MAX_MESSAGE_LENGTH)]]
  });

  private area = viewChild<ElementRef<HTMLTextAreaElement>>('area');

  constructor() {
    this.length.set(this.form.controls.body.value.length);
    this.form.controls.body.valueChanges.pipe(takeUntilDestroyed()).subscribe(v => {
      this.length.set(v.length);
      this.preview.set(null);                      // l'aperçu ne correspond plus au texte
    });
  }

  insert(name: string) {
    const el = this.area()?.nativeElement;
    const token = `{${name}}`;
    const value = this.form.controls.body.value;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    this.form.controls.body.setValue(value.slice(0, start) + token + value.slice(end));
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  showPreview() {
    const first = this.selection()[0];
    if (!first || !this.valid()) return;
    this.busy.set('preview');
    this.error.set(null);
    this.api.bulkPreview(this.jobId(), first.id, this.form.controls.body.value).subscribe({
      next: p => {
        this.busy.set(null);
        this.preview.set(p);
      },
      error: err => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  send() {
    if (!this.valid()) return;
    this.busy.set('send');
    this.error.set(null);
    this.api.bulkSend(this.jobId(), this.selection().map(a => a.id), this.form.controls.body.value).subscribe({
      next: res => {
        this.busy.set(null);
        this.sent.emit(res);
      },
      error: err => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  private valid(): boolean {
    const body = this.form.controls.body.value.trim();
    if (!body || body === 'Bonjour {prenom},') {
      this.error.set('Écrivez votre message.');
      return false;
    }
    if (body.length > MAX_MESSAGE_LENGTH) {
      this.error.set(`Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`);
      return false;
    }
    return true;
  }
}
