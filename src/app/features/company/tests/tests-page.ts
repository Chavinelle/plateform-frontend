import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChildren } from '@angular/core';
import { QuestionBank } from './question-bank/question-bank';
import { TestList } from './test-list/test-list';

type Tab = 'tests' | 'questions';

/** Tests en ligne : onglet des tests et onglet de la banque de questions. */
@Component({
  selector: 'app-tests-page',
  imports: [QuestionBank, TestList],
  templateUrl: './tests-page.html',
  styleUrl: './tests-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestsPage {
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'tests', label: 'Tests' },
    { id: 'questions', label: 'Banque de questions' }
  ];
  active = signal<Tab>('tests');

  private tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  select(tab: Tab) {
    this.active.set(tab);
  }

  /** Navigation au clavier entre onglets (motif ARIA « tabs ») : flèches, Début, Fin. */
  onKeydown(event: KeyboardEvent, index: number) {
    const last = this.tabs.length - 1;
    const target = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    this.select(this.tabs[target].id);
    this.tabButtons()[target]?.nativeElement.focus();
  }
}
