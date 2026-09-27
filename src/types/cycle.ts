/**
 * Cycle-related type definitions for Sway.
 */

/** The four canonical cycle phases. */
export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulatory'
  | 'luteal';

/** A single logged period entry. */
export interface PeriodEntry {
  /** ISO-8601 date string (YYYY-MM-DD). */
  date: string;
  /** Flow intensity for the day. */
  flow: 'light' | 'medium' | 'heavy';
}

/** Persisted cycle data for the primary user. */
export interface CycleData {
  /** Average cycle length in days. */
  cycleLength: number;
  /** Average period duration in days. */
  periodLength: number;
  /** ISO-8601 date of the last period start. */
  lastPeriodStart: string;
  /** Historical period logs. */
  periodHistory: PeriodEntry[];
}

/** Snapshot of the current cycle status used by the dashboard. */
export interface CycleSnapshot {
  currentPhase: CyclePhase;
  dayOfCycle: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
}
