/** Nine stable IDs preserve existing logs while giving the dashboard three equal rows. */
export const DAILY_SYMPTOMS = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'brainfog', label: 'Brain fog' },
  { id: 'glowing', label: 'Glowing' },
  { id: 'headache', label: 'Headache' },
  { id: 'mood', label: 'Mood shifts' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'tenderness', label: 'Tenderness' },
] as const;
export const SYMPTOM_ROWS = [DAILY_SYMPTOMS.slice(0, 3), DAILY_SYMPTOMS.slice(3, 6), DAILY_SYMPTOMS.slice(6, 9)];
