import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DOCUMENT_LABELS, DocumentItem, DocumentType } from './../../../../../../core/models/candidate.models';
import { CandidateService } from './../../../../../../core/services/candidate.service';
import { extractErrorMessage } from './../../../../../../core/utils/http-error';

const MAX_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSIONS = ['pdf', 'docx'];
const ANY_EXTENSIONS = ['pdf', 'docx', 'jpg', 'jpeg', 'png'];

@Component({
  selector: 'app-documents-section',
  imports: [ReactiveFormsModule, DatePipe],
  standalone: true,
  templateUrl: './documents-section.html',
  styleUrl: './documents-section.scss'
})
export class DocumentsSection implements OnInit {
  private api = inject(CandidateService);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  items = signal<DocumentItem[]>([]);
  loading = signal(true);
  uploading = signal(false);
  busyId = signal<number | null>(null);
  error = signal<string | null>(null);
  file = signal<File | null>(null);

  typeControl = new FormControl<DocumentType>('CV', { nonNullable: true });
  types = (Object.keys(DOCUMENT_LABELS) as DocumentType[])
    .map(value => ({ value, label: DOCUMENT_LABELS[value] }));

  ngOnInit() {
    this.reload();
  }

  typeLabel(type: DocumentType): string {
    return DOCUMENT_LABELS[type];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  /** Seuls les PDF et les images s'affichent dans le navigateur ; un DOCX se télécharge. */
  canPreview(d: DocumentItem): boolean {
    return d.contentType === 'application/pdf' || d.contentType.startsWith('image/');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.error.set(null);
  }

  upload() {
    const file = this.file();
    if (!file) return;

    const problem = this.validate(file, this.typeControl.value);
    if (problem) {
      this.error.set(problem);
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.api.uploadDocument(file, this.typeControl.value).subscribe({
      next: () => {
        this.uploading.set(false);
        this.clearFile();
        this.reload();
      },
      error: err => {
        this.uploading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  download(d: DocumentItem) {
    this.busyId.set(d.id);
    this.error.set(null);
    this.api.downloadDocument(d.id).subscribe({
      next: res => {
        this.busyId.set(null);
        this.saveBlob(res.body as Blob, d.originalName);
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(this.downloadError(err));
      }
    });
  }

  preview(d: DocumentItem) {
    // la fenêtre est ouverte tout de suite (sur le clic) pour ne pas être bloquée par le navigateur
    const win = window.open('', '_blank');
    if (!win) {
      this.error.set(`Le navigateur a bloqué la fenêtre d'aperçu. Autorisez les pop-ups ou téléchargez le fichier.`);
      return;
    }
    this.busyId.set(d.id);
    this.error.set(null);
    this.api.downloadDocument(d.id, true).subscribe({
      next: res => {
        this.busyId.set(null);
        const url = URL.createObjectURL(res.body as Blob);
        win.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: err => {
        this.busyId.set(null);
        win.close();
        this.error.set(this.downloadError(err));
      }
    });
  }

  makeDefault(d: DocumentItem) {
    this.busyId.set(d.id);
    this.error.set(null);
    this.api.setDefaultDocument(d.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reload();
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  remove(d: DocumentItem) {
    const note = d.defaultDocument ? '\nVotre CV le plus récent deviendra le CV par défaut.' : '';
    if (!confirm(`Supprimer « ${d.originalName} » ?${note}`)) return;

    this.busyId.set(d.id);
    this.error.set(null);
    this.api.deleteDocument(d.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reload();       // le CV par défaut peut avoir changé
      },
      error: err => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err));
      }
    });
  }

  // ---------------- Outils ----------------

  /** Contrôle rapide côté navigateur, pour éviter un envoi inutile. Le serveur revérifie tout. */
  private validate(file: File, type: DocumentType): string | null {
    if (file.size === 0) return 'Le fichier est vide.';
    if (file.size > MAX_BYTES) return 'Fichier trop volumineux (5 Mo maximum).';

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = type === 'CV' || type === 'LETTRE_MOTIVATION' ? TEXT_EXTENSIONS : ANY_EXTENSIONS;
    if (!allowed.includes(ext)) {
      return `Format non accepté pour ce type de document. Formats autorisés : ${allowed.map(e => e.toUpperCase()).join(', ')}.`;
    }
    return null;
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Pour une réponse "blob", le message JSON du serveur n'est pas directement lisible : on se base sur le code. */
  private downloadError(err: { status?: number }): string {
    if (err.status === 404) return 'Document introuvable.';
    if (err.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
    return 'Impossible de récupérer le document.';
  }

  private clearFile() {
    this.file.set(null);
    const input = this.fileInput();
    if (input) input.nativeElement.value = '';
  }

  private reload() {
    this.api.listDocuments().subscribe({
      next: list => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
