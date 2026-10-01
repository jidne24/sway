import { addDays, endOfMonth, startOfMonth } from 'date-fns';
import type { CyclePhase } from '../types/cycle';
import { calculateCycleDay, determineCyclePhase, normalizeCycleLengths, wrapCycleDay } from './cycleCalculator';
import { parseDateKey, toDateKey } from './cycleDates';

export function predictMonth(month: string, start: string, cycle: number, period: number) {
  const monthDate = parseDateKey(month);
  if (!monthDate || !parseDateKey(start)) return {};
  const normalized = normalizeCycleLengths(cycle, period);
  const predictions: Record<string, { phase: CyclePhase; cycleDay: number }> = {};
  const lastDay = endOfMonth(monthDate);
  // Include adjacent visible days, which can span six calendar rows.
  for (let day = addDays(startOfMonth(monthDate), -7); day <= addDays(lastDay, 7); day = addDays(day, 1)) {
    const cycleDay = wrapCycleDay(calculateCycleDay(start, day), normalized.cycleLength);
    predictions[toDateKey(day)] = {
      cycleDay,
      phase: determineCyclePhase(cycleDay, normalized.cycleLength, normalized.periodLength),
    };
  }
  return predictions;
}
