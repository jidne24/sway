/**
 * Sway — Biological Cycle Calculation Engine & Empathy Translation Layer
 *
 * Pure functions. No side-effects. All date arithmetic via date-fns with
 * timezone-safe parsing (startOfDay / parseISO).
 */
import { differenceInCalendarDays, startOfDay, parseISO, isValid } from 'date-fns';
import type {
  CyclePhase,
  ConflictRadarLevel,
  EmpathyBrief,
  MicroMission,
} from '../types/cycle';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

/** Self-directed suggestions, not assumptions about an individual's symptoms. */
const HER_GUIDANCE: Record<CyclePhase, { doList: string[]; dontList: string[] }> = {
  menstrual: {
    doList: ['Make room for rest when you need it', 'Log how you feel, even if today feels ordinary', 'Ask for the support that feels right to you'],
    dontList: ['Don’t push through discomfort to meet a prediction', 'Don’t ignore symptoms that are unusual for you', 'Don’t feel obliged to keep every commitment'],
  },
  follicular: {
    doList: ['Check in with your actual energy before making plans', 'Choose movement or an activity you enjoy', 'Keep recording your cycle and symptoms'],
    dontList: ['Don’t assume you must feel energetic in this phase', 'Don’t overcommit because a calendar predicts more energy', 'Don’t compare your rhythm with someone else’s'],
  },
  ovulatory: {
    doList: ['Make space for connection if you feel like it', 'Notice and record changes in how you feel', 'Let your own comfort guide your plans'],
    dontList: ['Don’t use phase predictions as contraception', 'Don’t treat an estimate as confirmed ovulation', 'Don’t ignore your boundaries to match a predicted mood'],
  },
  luteal: {
    doList: ['Leave a little breathing room in your schedule', 'Tell your partner what support would help', 'Track symptoms and changes without judging yourself'],
    dontList: ['Don’t blame every feeling on your cycle', 'Don’t push past your need for a break', 'Don’t dismiss persistent or worrying symptoms'],
  },
};

// ─── Core Calculations ──────────────────────────────────────────────────────

/**
 * Parse a date string or Date into a timezone-safe midnight Date.
 */
function safeDate(input: string | Date): Date {
  const d = typeof input === 'string' ? parseISO(input) : input;
  return startOfDay(isValid(d) ? d : new Date());
}

/**
 * Calculate which day of the cycle `targetDate` falls on (1-indexed).
 *
 * Uses `differenceInCalendarDays` to avoid DST / timezone offset issues.
 */
export function calculateCycleDay(
  startDate: string | Date,
  targetDate?: string | Date,
): number {
  const start = safeDate(startDate);
  const target = targetDate ? safeDate(targetDate) : startOfDay(new Date());

  const diff = differenceInCalendarDays(target, start);
  return diff + 1;
}

export function normalizeCycleLengths(cycleLength: number, periodLength: number) {
  return {
    cycleLength: Number.isInteger(cycleLength) && cycleLength >= 20 && cycleLength <= 45
      ? cycleLength : DEFAULT_CYCLE_LENGTH,
    periodLength: Number.isInteger(periodLength) && periodLength >= 1 && periodLength <= 10
      ? periodLength : DEFAULT_PERIOD_LENGTH,
  };
}

export function wrapCycleDay(day: number, length: number): number {
  return (((day - 1) % length) + length) % length + 1;
}

/** Approximate phase windows; these are predictions, not measured ovulation.
 * Model assumption: center the ovulatory window roughly 14 days before the end.
 * Actual timing varies: https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/
 */
export function getPhaseLengths(cycleLength: number, periodLength: number) {
  const normalized = normalizeCycleLengths(cycleLength, periodLength);
  const ovulatoryStart = Math.max(normalized.periodLength + 2, normalized.cycleLength - 15);
  const ovulatoryEnd = Math.min(normalized.cycleLength - 1, ovulatoryStart + 3);
  return {
    menstrual: normalized.periodLength,
    follicular: ovulatoryStart - normalized.periodLength - 1,
    ovulatory: ovulatoryEnd - ovulatoryStart + 1,
    luteal: normalized.cycleLength - ovulatoryEnd,
  };
}

/**
 * Map a cycle day to its biological phase.
 *
 * Phase boundaries (default 28-day / 5-day period):
 *   Day 1  → periodLength   : menstrual
 *   Day periodLength+1 → 12 : follicular
 *   Day 13 → 16             : ovulatory
 *   Day 17 → cycleLength    : luteal
 */
export function determineCyclePhase(
  cycleDay: number,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH,
): CyclePhase {
  // Wrap into current cycle window
  const normalized = normalizeCycleLengths(cycleLength, periodLength);
  const day = wrapCycleDay(cycleDay, normalized.cycleLength);
  const lengths = getPhaseLengths(normalized.cycleLength, normalized.periodLength);
  if (day <= lengths.menstrual) return 'menstrual';
  if (day <= lengths.menstrual + lengths.follicular) return 'follicular';
  if (day <= lengths.menstrual + lengths.follicular + lengths.ovulatory) return 'ovulatory';
  return 'luteal';
}

// ─── Phase Metadata Tables ──────────────────────────────────────────────────

interface PhaseProfile {
  phaseTitle: string;
  energyBase: number;
  socialBandwidth: 'Low' | 'Moderate' | 'High';
  conflictRadar: ConflictRadarLevel;
  hormoneSummary: string;
  partnerTip: string;
  microMission: MicroMission;
  doList: string[];
  dontList: string[];
}

/** Deep luteal override (days 23–28 of a standard cycle). */
function isDeepLuteal(
  cycleDay: number,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
): boolean {
  const day = wrapCycleDay(cycleDay, cycleLength);
  // Roughly the last 6 days of the cycle
  return day >= cycleLength - 5;
}

function getPhaseProfile(
  phase: CyclePhase,
  deepLuteal: boolean,
): PhaseProfile {
  switch (phase) {
    case 'menstrual':
      return {
        phaseTitle: 'Menstrual / Inner Winter',
        energyBase: 25,
        socialBandwidth: 'Low',
        conflictRadar: 'yellow',
        hormoneSummary:
          'Estrogen and progesterone at their lowest — the body is shedding and resetting.',
        partnerTip:
          'Keep logistics off her plate today. Warmth and quiet presence go a long way.',
        microMission: {
          title: 'Warm Comfort Drop',
          description:
            'Bring her a heated blanket, warm drink, or heating pad without being asked.',
          category: 'comfort',
        },
        doList: [
          'Prepare a warm drink and bring it to her',
          'Handle dinner plans or meal prep tonight',
          'Send a short, reassuring "thinking of you" text',
        ],
        dontList: [
          'Don\'t ask "Are you okay?" repeatedly — just be present',
          'Avoid scheduling high-energy social events',
          'Don\'t take quietness or low energy personally',
        ],
      };

    case 'follicular':
      return {
        phaseTitle: 'Follicular / Inner Spring',
        energyBase: 70,
        socialBandwidth: 'High',
        conflictRadar: 'green',
        hormoneSummary:
          'Estrogen is rising steadily — mood lifts, creativity and sociability bloom.',
        partnerTip:
          'Great time to plan dates, try new things together, or have deeper conversations.',
        microMission: {
          title: 'Surprise Date Idea',
          description:
            'Suggest a spontaneous activity — a walk, a new restaurant, or a creative project together.',
          category: 'romance',
        },
        doList: [
          'Suggest a fun outing or new experience',
          'Engage in meaningful conversation — she has bandwidth',
          'Compliment her energy or something specific you appreciate',
        ],
        dontList: [
          'Don\'t waste this high-energy window on boring logistics',
          'Avoid being passive — match her rising energy',
          'Don\'t dismiss her ideas or enthusiasm',
        ],
      };

    case 'ovulatory':
      return {
        phaseTitle: 'Ovulatory / Inner Summer',
        energyBase: 90,
        socialBandwidth: 'High',
        conflictRadar: 'green',
        hormoneSummary:
          'Estrogen peaks and testosterone surges — peak confidence, libido, and communication.',
        partnerTip:
          'She feels most confident and connected now. Lean into quality time and romance.',
        microMission: {
          title: 'Heartfelt Compliment',
          description:
            'Give her a genuine, specific compliment about who she is — not just how she looks.',
          category: 'romance',
        },
        doList: [
          'Plan quality one-on-one time together',
          'Be physically affectionate — hand-holding, hugs',
          'Listen actively if she wants to talk through plans or feelings',
        ],
        dontList: [
          'Don\'t be emotionally distant or distracted',
          'Avoid picking fights — resolve issues gently now',
          'Don\'t cancel plans without good reason',
        ],
      };

    case 'luteal': {
      if (deepLuteal) {
        return {
          phaseTitle: 'Deep Luteal / Rest & Protect',
          energyBase: 20,
          socialBandwidth: 'Low',
          conflictRadar: 'red',
          hormoneSummary:
            'Progesterone drop — nervous system is sensitive. PMS territory.',
          partnerTip:
            'Don\'t initiate high-stress debates today; focus on comfort and reassurance.',
          microMission: {
            title: 'Silent Support Package',
            description:
              'Leave a small care package (snack, note, cozy item) where she\'ll find it — no fanfare needed.',
            category: 'comfort',
          },
          doList: [
            'Reduce decision load — handle choices for dinner, plans, etc.',
            'Offer physical comfort: blankets, heating pad, gentle touch',
            'Validate her feelings even if they seem amplified',
          ],
          dontList: [
            'Don\'t start serious relationship conversations right now',
            'Avoid sarcasm or teasing — sensitivity is high',
            'Don\'t take emotional reactions personally; hormones are real',
          ],
        };
      }

      // Early luteal (days 17–22ish)
      return {
        phaseTitle: 'Luteal / Inner Autumn',
        energyBase: 50,
        socialBandwidth: 'Moderate',
        conflictRadar: 'yellow',
        hormoneSummary:
          'Progesterone rises — nesting instinct kicks in, energy starts to taper.',
        partnerTip:
          'She may want cozy, low-key quality time. Respect the slower pace.',
        microMission: {
          title: 'Acts of Service Hour',
          description:
            'Take one chore or errand completely off her plate today without asking.',
          category: 'act_of_service',
        },
        doList: [
          'Take initiative on a household task she usually handles',
          'Suggest a cozy night in instead of going out',
          'Check in with a gentle "How are you feeling today?"',
        ],
        dontList: [
          'Don\'t over-schedule the week ahead',
          'Avoid criticising or pointing out mistakes',
          'Don\'t pressure her into high-energy social plans',
        ],
      };
    }
  }
}

// ─── Empathy Brief Generator ─────────────────────────────────────────────────

/**
 * Generate a complete empathy brief for today (or a given target date).
 *
 * This is the primary output of the Sway engine — a single object that the
 * Partner Dashboard can render directly.
 */
export function generateEmpathyBrief(
  startDate: string | Date,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH,
  targetDate?: string | Date,
  audience: 'her' | 'partner' = 'partner',
): EmpathyBrief {
  const normalized = normalizeCycleLengths(cycleLength, periodLength);
  cycleLength = normalized.cycleLength;
  periodLength = normalized.periodLength;
  const cycleDay = calculateCycleDay(startDate, targetDate);
  const wrappedDay = wrapCycleDay(cycleDay, cycleLength);
  const phase = determineCyclePhase(wrappedDay, cycleLength, periodLength);
  const deepLuteal = phase === 'luteal' && isDeepLuteal(wrappedDay, cycleLength);
  const profile = getPhaseProfile(phase, deepLuteal);

  // Modulate energy with a small per-day variance based on position in phase
  const dayNoise = Math.sin(wrappedDay * 0.7) * 8; // ±8 pts wobble
  const energyLevel = Math.round(
    Math.min(100, Math.max(0, profile.energyBase + dayNoise)),
  );

  const daysUntilNextPeriod = cycleLength - wrappedDay + 1;

  return {
    phase,
    phaseTitle: profile.phaseTitle,
    cycleDay: wrappedDay,
    daysUntilNextPeriod,
    energyLevel,
    socialBandwidth: profile.socialBandwidth,
    conflictRadar: profile.conflictRadar,
    hormoneSummary: profile.hormoneSummary,
    partnerTip: profile.partnerTip,
    microMission: profile.microMission,
    doList: audience === 'her' ? [...HER_GUIDANCE[phase].doList] : profile.doList,
    dontList: audience === 'her' ? [...HER_GUIDANCE[phase].dontList] : profile.dontList,
  };
}
