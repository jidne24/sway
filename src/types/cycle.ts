/**
 * Cycle domain types for Sway.
 *
 * These types power the biological calculation engine and the empathy
 * translation layer that turns raw cycle data into actionable partner guidance.
 */

// ─── Core Enums ──────────────────────────────────────────────────────────────

/** The four canonical menstrual cycle phases. */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

/** Traffic-light conflict sensitivity indicator. */
export type ConflictRadarLevel = 'green' | 'yellow' | 'red';

// ─── Empathy Brief ───────────────────────────────────────────────────────────

/** Category for the daily micro-mission assigned to the partner. */
export type MicroMissionCategory = 'act_of_service' | 'comfort' | 'romance';

/** A small, actionable daily mission for the partner. */
export interface MicroMission {
  title: string;
  description: string;
  category: MicroMissionCategory;
}

/**
 * The full empathy brief — the centrepiece of Sway's partner experience.
 *
 * Generated daily by `generateEmpathyBrief()` in the cycle calculator.
 * Every field is designed to be rendered directly in the Partner Dashboard.
 */
export interface EmpathyBrief {
  /** Current cycle phase. */
  phase: CyclePhase;
  /** Human-readable phase title (e.g. "Deep Luteal / Rest & Protect"). */
  phaseTitle: string;
  /** Current day within the cycle (1-indexed). */
  cycleDay: number;
  /** Countdown to predicted next period start. */
  daysUntilNextPeriod: number;
  /** Estimated energy level, 0 – 100. */
  energyLevel: number;
  /** Social bandwidth bucket. */
  socialBandwidth: 'Low' | 'Moderate' | 'High';
  /** Conflict sensitivity indicator. */
  conflictRadar: ConflictRadarLevel;
  /** One-liner summarising the dominant hormonal state. */
  hormoneSummary: string;
  /** Empathetic, actionable tip for the partner. */
  partnerTip: string;
  /** Today's micro-mission for the partner. */
  microMission: MicroMission;
  /** 3 actionable positive things the partner should do. */
  doList: string[];
  /** 3 things the partner should avoid today. */
  dontList: string[];
}

// ─── Symptoms ────────────────────────────────────────────────────────────────

/** A loggable symptom entry. */
export interface Symptom {
  id: string;
  label: string;
  /** Lucide icon name or emoji. */
  icon: string;
  category: 'physical' | 'emotional';
}

// ─── SOS Alerts ──────────────────────────────────────────────────────────────

/** Pre-defined SOS comfort request types. */
export type SOSAlertType =
  | 'chocolate'
  | 'heating_pad'
  | 'quiet_hug'
  | 'comfort_meal'
  | 'custom';

/** An SOS alert sent from "her" to partner. */
export interface SOSAlert {
  id: string;
  type: SOSAlertType;
  /** Optional custom message (used when type is 'custom'). */
  message?: string;
  /** Unix epoch ms when the alert was created. */
  timestamp: number;
  /** Whether the alert is still active / unacknowledged. */
  active: boolean;
}
