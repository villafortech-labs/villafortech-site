import type { Locale } from '../i18n';

type ReferenceCopy = {
  title: string;
  seoTitle: string;
  summary: string;
  kind: string;
  publisher: string;
  sourceDate: string;
  sourceLabel: string;
  sectionTitle: string;
  paragraphs: string[];
  context: string;
};

export type Reference = {
  slug: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDateTime: string;
  copy: Record<Locale, ReferenceCopy>;
};

export const references: Reference[] = [
  {
    slug: 'forbes-ecuador-salihub',
    sourceUrl:
      'https://www.linkedin.com/posts/robertovillafuerte_forbes-ecuador-salud-datos-y-empresa-ugcPost-7452046753840758785-Di5W/',
    sourceTitle:
      'La healthtech ecuatoriana que quiere convertir la salud en una variable estratégica de negocio',
    sourceDateTime: '2026-04',
    copy: {
      es: {
        title: 'SaliHub en Forbes Ecuador: el trabajo detrás de los datos.',
        seoTitle: 'SaliHub en Forbes Ecuador',
        summary:
          'La mención en la revista recoge una parte de mi trabajo en SaliHub: cómo dar a las personas control sobre su información.',
        kind: 'Mención en revista',
        publisher: 'Forbes Ecuador · sección SaliHub Voice · pp. 82–83',
        sourceDate: 'Abril / mayo de 2026',
        sourceLabel: 'Ver la publicación con la nota en LinkedIn',
        sectionTitle: 'Las decisiones que sostienen un producto',
        paragraphs: [
          'En la edición de abril/mayo de 2026, Forbes Ecuador publicó una nota sobre SaliHub. En la página 83 aparece mi nombre como lead data architect del proyecto, junto con una explicación sobre el control que debe conservar cada usuario sobre sus datos.',
          'Durante mi etapa en SaliHub trabajé en la arquitectura de datos en PostgreSQL. Convertir los requisitos del producto en tablas, relaciones y migraciones implicaba resolver preguntas concretas: a quién pertenecía cada registro, quién podía consultarlo y cómo conservar el historial de los cambios.',
          'El consentimiento, los permisos y los registros de auditoría formaban parte de ese trabajo. También había información procedente de distintos dispositivos. Al tratar observaciones repetidas, era necesario conservar su origen para poder entender qué representaban.',
          'La nota de Forbes reúne la visión de la empresa y las contribuciones de varias personas del equipo. Mi intervención se concentra en el tratamiento de datos: el punto donde las decisiones de ingeniería afectan directamente a la privacidad de quienes usan una plataforma.',
        ],
        context:
          'Esa experiencia dejó una idea que sigue presente en mi trabajo: una arquitectura debe permitir revisar la propiedad, los permisos y la historia de la información que guarda. El caso técnico enlazado abajo desarrolla esas decisiones, con los detalles privados del proyecto omitidos.',
      },
      en: {
        title: 'SaliHub in Forbes Ecuador: the work behind the data.',
        seoTitle: 'SaliHub in Forbes Ecuador',
        summary:
          'A reference to my data architecture work during my time at SaliHub.',
        kind: 'Magazine mention',
        publisher: 'Forbes Ecuador · SaliHub Voice section · pp. 82–83',
        sourceDate: 'April / May 2026',
        sourceLabel: 'View the LinkedIn post sharing the feature',
        sectionTitle: 'Decisions behind the product',
        paragraphs: [
          'The April/May 2026 issue of Forbes Ecuador features SaliHub. Page 83 identifies me as the project’s lead data architect and cites my explanation of users’ control over their information.',
          'During my time at SaliHub, I worked on PostgreSQL architecture, access controls, consent records and auditability. Those decisions made data ownership, permissions and history concrete parts of the system.',
        ],
        context:
          'The technical case study below describes that previous work, with private implementation details omitted. The source link leads to my LinkedIn post sharing the magazine feature.',
      },
    },
  },
  {
    slug: 'entrevista-salihub-datos-ia',
    sourceUrl:
      'https://es.linkedin.com/posts/salihub_y-si-la-salud-de-tu-equipo-fuera-tu-mayor-activity-7472422708946014208-YOhq',
    sourceTitle: 'Entrevista a Roberto Villafuerte publicada por SaliHub',
    sourceDateTime: '2026-06-15',
    copy: {
      es: {
        title: 'Datos, IA y privacidad: una conversación sobre SaliHub.',
        seoTitle: 'Entrevista con SaliHub: datos, IA y privacidad',
        summary:
          'Qué significa trabajar con información individual y análisis agregado dentro de una misma plataforma.',
        kind: 'Entrevista de la empresa',
        publisher: 'SaliHub · LinkedIn',
        sourceDate: '15 de junio de 2026',
        sourceLabel: 'Ver la entrevista original en LinkedIn',
        sectionTitle: 'Dos niveles de información',
        paragraphs: [
          'En una entrevista publicada por SaliHub el 15 de junio de 2026 expliqué la propuesta de la plataforma desde dos niveles: la experiencia de cada empleado y la información agregada que podía orientar a una organización.',
          'En el video, la primera parte se plantea alrededor de recomendaciones individuales apoyadas en IA. La segunda busca identificar patrones y oportunidades de mejora a partir de información agregada. La privacidad desde el diseño aparece como el principio que debe acompañar esa separación.',
          'En mi trabajo de arquitectura de datos, llevar esos requisitos al sistema implicó definir estructuras de consentimiento, controles de acceso y registros de auditoría. Cada decisión debía tener una representación que pudiera mantenerse mientras cambiaba el producto.',
          'Por ejemplo, un historial de auditoría necesita actores, acciones, registros afectados y marcas de tiempo consistentes. Esos detalles permiten reconstruir lo ocurrido y revisar el comportamiento del sistema. En el caso técnico de SaliHub explico también cómo abordé los límites entre organizaciones y la procedencia de las mediciones.',
        ],
        context:
          'La entrevista pertenece a mi etapa en SaliHub, donde la empresa me presentó como Head of Product. Hoy la comparto como parte de ese recorrido profesional y del trabajo de datos que desarrollé entonces.',
      },
      en: {
        title: 'Talking with SaliHub about data, AI and privacy.',
        seoTitle: 'SaliHub interview: data, AI and privacy',
        summary: 'An interview published by the company on LinkedIn.',
        kind: 'Company interview',
        publisher: 'SaliHub · LinkedIn',
        sourceDate: 'June 15, 2026',
        sourceLabel: 'Watch the original interview on LinkedIn',
        sectionTitle: 'Two levels of information',
        paragraphs: [
          'In this company-published interview, I discuss recommendations for employees, aggregated analysis for organizations, and privacy by design.',
          'My data architecture work involved turning consent, access-control and auditing requirements into concrete structures. The technical case study explains those decisions without disclosing private implementation details.',
        ],
        context:
          'SaliHub introduced me as Head of Product in the video. It records a previous stage of my career; I no longer work at SaliHub.',
      },
    },
  },
];
