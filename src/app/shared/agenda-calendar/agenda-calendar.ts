import { DatePipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CALENDAR_VIEW_LABELS, CalendarView, addDays, dayKey, daysOf, parseLocal, rangeFor, shift
} from '../../../core/utils/calendar';

/** Élément affiché dans l'agenda (entretien côté entreprise ou côté candidat). */
export interface AgendaEvent {
  id: number;
  /** Heure locale « 2026-11-25T10:00:00 ». */
  start: string;
  end: string;
  title: string;
  subtitle: string;
  /** Annulé : affiché barré et signalé aux lecteurs d'écran. */
  cancelled: boolean;
  statusLabel: string;
  link: (string | number)[];
}

interface AgendaItem { event: AgendaEvent; start: Date; end: Date; }
interface AgendaDay { date: Date; key: string; inPeriod: boolean; today: boolean; items: AgendaItem[]; }

/**
 * Agenda jour / semaine / mois, sans bibliothèque externe.
 * Le parent lie [(view)] et [(anchor)], calcule la période avec rangeFor() et fournit les événements.
 * Chaque entretien est un lien : tout se fait au clavier, et la grille du mois est un vrai tableau.
 */
@Component({
  selector: 'app-agenda-calendar',
  imports: [DatePipe, RouterLink],
  templateUrl: './agenda-calendar.html',
  styleUrl: './agenda-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaCalendar {
  private locale = inject(LOCALE_ID);

  events = input<AgendaEvent[]>([]);
  loading = input(false);
  view = model<CalendarView>('week');
  /** Date de référence de la période affichée. */
  anchor = model(new Date());

  readonly views = (Object.keys(CALENDAR_VIEW_LABELS) as CalendarView[])
    .map(value => ({ value, label: CALENDAR_VIEW_LABELS[value] }));
  readonly weekdays = daysOf({ from: new Date(2024, 0, 1), to: new Date(2024, 0, 8) });   // un lundi → dimanche

  private todayKey = dayKey(new Date());

  range = computed(() => rangeFor(this.view(), this.anchor()));

  title = computed(() => {
    const anchor = this.anchor();
    const { from, to } = this.range();
    switch (this.view()) {
      case 'day': return capitalize(formatDate(anchor, 'EEEE d MMMM y', this.locale));
      case 'month': return capitalize(formatDate(anchor, 'MMMM y', this.locale));
      case 'week': {
        const last = addDays(to, -1);
        const start = formatDate(from, from.getMonth() === last.getMonth() ? 'd' : 'd MMMM', this.locale);
        return `Semaine du ${start} au ${formatDate(last, 'd MMMM y', this.locale)}`;
      }
    }
  });

  /** Jours de la période avec leurs entretiens, triés par heure. */
  days = computed<AgendaDay[]>(() => {
    const byDay = new Map<string, AgendaItem[]>();
    for (const event of this.events()) {
      const start = parseLocal(event.start);
      const key = dayKey(start);
      const list = byDay.get(key) ?? [];
      list.push({ event, start, end: parseLocal(event.end) });
      byDay.set(key, list);
    }
    const month = this.anchor().getMonth();
    return daysOf(this.range()).map(date => {
      const key = dayKey(date);
      return {
        date,
        key,
        inPeriod: this.view() !== 'month' || date.getMonth() === month,
        today: key === this.todayKey,
        items: (byDay.get(key) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime())
      };
    });
  });

  /** Semaines de la vue mois (lignes du tableau). */
  weeks = computed(() => {
    const days = this.days();
    const weeks: AgendaDay[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  });

  total = computed(() => this.days().reduce((n, d) => n + d.items.length, 0));

  previous() {
    this.anchor.set(shift(this.view(), this.anchor(), -1));
  }

  next() {
    this.anchor.set(shift(this.view(), this.anchor(), 1));
  }

  today() {
    this.anchor.set(new Date());
  }

  setView(view: CalendarView) {
    this.view.set(view);
  }

  /** Depuis la vue mois : ouvrir le jour choisi. */
  openDay(date: Date) {
    this.anchor.set(date);
    this.view.set('day');
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
