export const pilot = {
  id: 'segundo-cerebro-2026-10',
  contact: 'villafortech@gmail.com',
  closesAt: '2026-10-14T04:59:00.000Z',
  closesLabel: 'Martes 13 de octubre · 23:59 (Ecuador, UTC−5)',
  consentVersion: '2026-10-10',
  schemaVersion: 2,
};

export const budgets = [
  { value: '0', label: '$0' },
  { value: 'under-20', label: 'Menos de $20' },
  { value: '20-99', label: '$20–99' },
  { value: '100-199', label: '$100–199' },
  { value: '200-plus', label: '$200 o más' },
] as const;

export const availabilitySlots = [
  { value: '15-morning', day: 'Jueves 15', label: '9:00–12:00' },
  { value: '15-afternoon', day: 'Jueves 15', label: '14:00–17:00' },
  { value: '15-evening', day: 'Jueves 15', label: '18:00–21:00' },
  { value: '16-morning', day: 'Viernes 16', label: '9:00–12:00' },
  { value: '16-afternoon', day: 'Viernes 16', label: '14:00–17:00' },
  { value: '16-evening', day: 'Viernes 16', label: '18:00–21:00' },
] as const;

export const sources = [
  'direct',
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'threads',
  'x',
  'whatsapp',
] as const;
