import { format, isValid, parseISO, startOfDay } from 'date-fns';

/** Date-only values always represent local calendar dates, never UTC instants. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) && toDateKey(date) === value ? startOfDay(date) : null;
}

export function isValidCycleData(start: string, cycle: number, period: number): boolean {
  const date = parseDateKey(start);
  return date !== null && date <= startOfDay(new Date()) &&
    Number.isInteger(cycle) && cycle >= 20 && cycle <= 45 &&
    Number.isInteger(period) && period >= 1 && period <= 10 && period < cycle;
}
