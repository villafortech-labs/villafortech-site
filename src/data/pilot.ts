export const pilot = {
  id: 'segundo-cerebro-2026-10',
  contact: 'villafortech@gmail.com',
  closesAt: '2026-10-14T04:59:00.000Z',
  closesLabel: 'Martes 13 de octubre · 23:59 (Ecuador, UTC−5)',
  consentVersion: '2026-10-10',
  schemaVersion: 3,
};

export const roles = [
  { value: 'technology', label: 'Programación / tecnología' },
  { value: 'business', label: 'Negocios / administración' },
  { value: 'marketing', label: 'Marketing / ventas' },
  { value: 'creative', label: 'Diseño / creación de contenido' },
  { value: 'education', label: 'Educación / investigación' },
  { value: 'student', label: 'Estudio / formación' },
  { value: 'other', label: 'Otra área profesional' },
] as const;

export const goals = [
  { value: 'projects', label: 'Organizar mi trabajo y proyectos' },
  { value: 'retrieve', label: 'Encontrar y reutilizar lo que sé' },
  { value: 'code', label: 'Usar IA con mi documentación y código' },
  { value: 'learning', label: 'Organizar mis estudios y aprendizaje' },
  { value: 'start', label: 'Empezar: necesito orientación' },
] as const;

export const toolOptions = [
  { value: 'google', label: 'Drive / Docs' },
  { value: 'microsoft', label: 'Word / OneDrive' },
  { value: 'knowledge', label: 'Notion / Obsidian' },
  { value: 'notes', label: 'Notas del celular' },
  { value: 'files', label: 'Archivos en mi computadora' },
  { value: 'messages', label: 'WhatsApp / correo' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'other-ai', label: 'Claude / Gemini / otra IA' },
  { value: 'other', label: 'Otra herramienta' },
  { value: 'starting', label: 'Aún no tengo un sistema' },
] as const;

// Suggestions only: free text and browser autofill accept any country.
export const countrySuggestions = [
  'Ecuador',
  'Argentina',
  'Bolivia',
  'Brasil',
  'Canadá',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Cuba',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Guatemala',
  'Honduras',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'Puerto Rico',
  'República Dominicana',
  'Uruguay',
  'Venezuela',
];

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
