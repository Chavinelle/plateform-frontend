import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApplicationNote } from '../../../../../core/models/application.models';
import { PersonRef } from '../../../../../core/models/company.models';
import { ApplicationNoteService } from '../../../../../core/services/application-note.service';
import { extractErrorMessage } from '../../../../../core/utils/http-error';
import { MentionInput } from '../mention-input/mention-input';

const MAX_NOTE = 4000;

interface Segment { text: string; mention: boolean; }
interface NoteView { note: ApplicationNote; segments: Segment[]; }

/** Notes internes de l'équipe sur une candidature (RG7 : jamais visibles par le candidat). */
@Component({
  selector: 'app-notes-panel',
  imports: [DatePipe, ReactiveFormsModule, MentionInput],
  templateUrl: './notes-panel.html',
  styleUrl: './notes-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesPanel {
  private api = inject(ApplicationNoteService);

  applicationId = input.required<number>();

  notes = signal<ApplicationNote[]>([]);
  people = signal<PersonRef[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  busy = signal(false);
  editingId = signal<number | null>(null);
  readonly maxNote = MAX_NOTE;

  draft = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(MAX_NOTE)] });
  draftMentions = signal<PersonRef[]>([]);
  editDraft = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(MAX_NOTE)] });
  editMentions = signal<PersonRef[]>([]);

  /** Le texte découpé pour afficher les mentions en évidence (sans HTML injecté). */
  views = computed<NoteView[]>(() => this.notes().map(note => ({ note, segments: segments(note) })));

  constructor() {
    toObservable(this.applicationId).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
        this.editingId.set(null);
      }),
      switchMap(id => forkJoin({
        notes: this.api.list(id),
        people: this.api.mentionable(id).pipe(catchError(() => of([] as PersonRef[])))
      }).pipe(catchError(err => {
        this.error.set(extractErrorMessage(err));
        return of({ notes: [] as ApplicationNote[], people: [] as PersonRef[] });
      }))),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.loading.set(false);
      this.notes.set(res.notes);
      this.people.set(res.people);
    });
  }

  add() {
    const content = this.draft.value.trim();
    if (!content || this.draft.invalid) return;
    this.run(this.api.create(this.applicationId(), content, mentionIds(content, this.draftMentions())), note => {
      this.notes.update(list => [...list, note]);
      this.draft.reset('');
      this.draftMentions.set([]);
    });
  }

  startEdit(note: ApplicationNote) {
    this.editingId.set(note.id);
    this.editDraft.reset(note.content);
    this.editMentions.set(note.mentions);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(note: ApplicationNote) {
    const content = this.editDraft.value.trim();
    if (!content || this.editDraft.invalid) return;
    const ids = mentionIds(content, this.editMentions());
    this.run(this.api.update(this.applicationId(), note.id, content, ids), updated => {
      this.notes.update(list => list.map(n => (n.id === updated.id ? updated : n)));
      this.editingId.set(null);
    });
  }

  remove(note: ApplicationNote) {
    if (!confirm('Supprimer cette note ?')) return;
    this.run(this.api.delete(this.applicationId(), note.id), () => {
      this.notes.update(list => list.filter(n => n.id !== note.id));
    });
  }

  mentionNames(note: ApplicationNote): string {
    return note.mentions.map(m => m.name).join(', ');
  }

  private run<T>(request: Observable<T>, onSuccess: (value: T) => void) {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: value => {
        this.busy.set(false);
        onSuccess(value);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}

/** Seules les mentions encore présentes dans le texte sont envoyées. */
function mentionIds(content: string, people: PersonRef[]): number[] {
  return people.filter(p => content.includes(`@${p.name}`)).map(p => p.id);
}

function segments(note: ApplicationNote): Segment[] {
  if (!note.mentions.length) return [{ text: note.content, mention: false }];
  const tokens = note.mentions.map(m => `@${m.name}`).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'g');
  return note.content.split(pattern)
    .filter(part => part !== '')
    .map(part => ({ text: part, mention: tokens.includes(part) }));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
