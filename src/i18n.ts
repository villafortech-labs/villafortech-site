export type Locale = 'en' | 'es';

export const defaultLocale: Locale = 'en';

export const localeRoutes = {
  en: {
    home: '/',
    projects: '/projects',
    about: '/about',
    contact: '/contact',
    resume: '/resume',
    writing: '/writing',
  },
  es: {
    home: '/es',
    projects: '/es/projects',
    about: '/es/about',
    contact: '/es/contact',
    resume: '/es/resume',
    writing: '/es/writing',
  },
} as const;

export const sharedCopy = {
  en: {
    languageName: 'English',
    alternateLanguageName: 'Español',
    switchLanguage: 'Ver sitio en español',
    skipLink: 'Skip to main content',
    navLabel: 'Primary navigation',
    homeLabel: 'Roberto Villafuerte, home',
    menu: 'Menu',
    nav: {
      projects: 'Work',
      about: 'About',
      contact: 'Contact',
    },
    footerLabel: 'Site and contact links',
    footerNote: 'Think rigorously. Live curiously.',
    footer: {
      projects: 'Work',
      about: 'About',
      resume: 'Résumé',
      email: 'Email',
    },
    newTab: ' (opens in new tab)',
  },
  es: {
    languageName: 'Español',
    alternateLanguageName: 'English',
    switchLanguage: 'View site in English',
    skipLink: 'Saltar al contenido principal',
    navLabel: 'Navegación principal',
    homeLabel: 'Roberto Villafuerte, inicio',
    menu: 'Menú',
    nav: {
      projects: 'Proyectos',
      about: 'Sobre mí',
      contact: 'Contacto',
    },
    footerLabel: 'Enlaces del sitio y de contacto',
    footerNote: 'Pensar con rigor. Vivir con curiosidad.',
    footer: {
      projects: 'Proyectos',
      about: 'Sobre mí',
      resume: 'CV',
      email: 'Correo',
    },
    newTab: ' (se abre en una pestaña nueva)',
  },
} as const;

export function localeFromPath(pathname: string): Locale {
  return pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en';
}

function cleanPath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function withTrailingSlash(pathname: string): string {
  return pathname === '/' ? pathname : `${cleanPath(pathname)}/`;
}

type RouteMatch = {
  key: keyof (typeof localeRoutes)['en'];
  slug?: string;
};

function matchRoute(pathname: string): RouteMatch | undefined {
  const path = cleanPath(pathname);

  for (const locale of ['en', 'es'] as const) {
    const routes = localeRoutes[locale];

    for (const key of [
      'home',
      'projects',
      'about',
      'contact',
      'resume',
      'writing',
    ] as const) {
      if (path === routes[key]) return { key };
    }

    for (const key of ['projects', 'writing'] as const) {
      const prefix = `${routes[key]}/`;
      if (path.startsWith(prefix)) {
        return { key, slug: path.slice(prefix.length) };
      }
    }
  }

  return undefined;
}

export function pathFor(
  locale: Locale,
  key: keyof (typeof localeRoutes)['en'],
  slug?: string,
): string {
  const base = localeRoutes[locale][key];
  return slug ? `${base}/${slug}` : base;
}

export function alternateLocalePath(
  pathname: string,
  targetLocale: Locale,
): string {
  const match = matchRoute(pathname);
  if (!match) return withTrailingSlash(localeRoutes[targetLocale].home);
  return withTrailingSlash(pathFor(targetLocale, match.key, match.slug));
}
