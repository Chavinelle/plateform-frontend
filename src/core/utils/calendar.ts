/** Outils de dates pour l'agenda. Les semaines commencent le lundi ; tout est en heure locale. */

export type CalendarView = 'day' | 'week' | 'month';

export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois'
};

export interface DateRange {
  from: Date;
  /** Exclu. */
  to: Date;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Lundi de la semaine. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;            // lundi = 0 … dimanche = 6
  return addDays(startOfDay(d), -day);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Période affichée ; la vue mois inclut les jours des semaines entamées (au plus 6 semaines). */
export function rangeFor(view: CalendarView, anchor: Date): DateRange {
  switch (view) {
    case 'day': {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7) };
    }
    case 'month': {
      const first = startOfMonth(anchor);
      const last = addDays(new Date(first.getFullYear(), first.getMonth() + 1, 1), -1);
      return { from: startOfWeek(first), to: addDays(startOfWeek(last), 7) };
    }
  }
}

/** Date de référence de la période précédente (-1) ou suivante (+1). */
export function shift(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case 'day': return addDays(anchor, direction);
    case 'week': return addDays(anchor, 7 * direction);
    case 'month': return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  }
}

/** Jours de la période, dans l'ordre. */
export function daysOf(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let d = range.from; d < range.to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** « 2026-11-25 » : clé pour regrouper les entretiens par jour. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** « 2026-11-25T00:00:00 » : format attendu par l'API (heure locale, sans fuseau). */
export function toLocalIso(d: Date): string {
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Lit « 2026-11-25T10:00:00 » comme une heure locale (jamais comme de l'UTC). */
export function parseLocal(value: string): Date {
  const [date, time = '00:00:00'] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min, s] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0, Math.floor(s || 0));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
