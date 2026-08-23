import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export function lastNMonthsRanges(n: number): { start: string; end: string; label: string }[] {
  const ranges: { start: string; end: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    ranges.push({
      start: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
      label: format(monthDate, 'MMM'),
    });
  }
  return ranges;
}

export function formatDisplayDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

export function formatDisplayDateTime(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy, h:mm a');
}

export function isoDateToDate(iso: string): Date {
  return parseISO(iso);
}

export function dateToIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
