import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const siteOrigin = 'https://www.villafortech.com';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function routeFile(locale, route) {
  const parts = [distRoot];
  if (locale === 'es') parts.push('es');
  if (route) parts.push(route);
  parts.push('index.html');
  return join(...parts);
}

function projectSlugs(locale) {
  const directory = join(
    distRoot,
    ...(locale === 'es' ? ['es', 'projects'] : ['projects']),
  );
  assert(existsSync(directory), `Missing ${locale} project directory`);
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const sharedRoutes = ['', 'about', 'contact', 'projects', 'resume', 'writing'];

function publicURL(locale, route = '') {
  const path = [locale === 'es' ? 'es' : '', route].filter(Boolean).join('/');
  return `${siteOrigin}/${path ? `${path}/` : ''}`;
}

for (const route of sharedRoutes) {
  const englishFile = routeFile('en', route);
  const spanishFile = routeFile('es', route);
  assert(existsSync(englishFile), `Missing English route: ${route || '/'}`);
  assert(existsSync(spanishFile), `Missing Spanish route: /es/${route}`);

  const english = readFileSync(englishFile, 'utf8');
  const spanish = readFileSync(spanishFile, 'utf8');
  const englishURL = publicURL('en', route);
  const spanishURL = publicURL('es', route);

  assert(english.includes('<html lang="en">'), `Wrong lang on ${englishFile}`);
  assert(spanish.includes('<html lang="es">'), `Wrong lang on ${spanishFile}`);

  for (const html of [english, spanish]) {
    assert(
      html.includes('hreflang="en"'),
      `Missing English alternate on ${route}`,
    );
    assert(
      html.includes('hreflang="es"'),
      `Missing Spanish alternate on ${route}`,
    );
    assert(
      html.includes('hreflang="x-default"'),
      `Missing x-default alternate on ${route}`,
    );
    assert(
      html.includes(`hreflang="en" href="${englishURL}"`),
      `Wrong English alternate on ${route || '/'}`,
    );
    assert(
      html.includes(`hreflang="es" href="${spanishURL}"`),
      `Wrong Spanish alternate on ${route || '/'}`,
    );
  }
}

const englishProjects = projectSlugs('en');
const spanishProjects = projectSlugs('es');
assert(
  JSON.stringify(englishProjects) === JSON.stringify(spanishProjects),
  `Project translation mismatch: en=${englishProjects.join(',')} es=${spanishProjects.join(',')}`,
);

for (const slug of spanishProjects) {
  const englishURL = publicURL('en', `projects/${slug}`);
  const spanishURL = publicURL('es', `projects/${slug}`);
  const english = readFileSync(
    join(distRoot, 'projects', slug, 'index.html'),
    'utf8',
  );
  const html = readFileSync(
    join(distRoot, 'es', 'projects', slug, 'index.html'),
    'utf8',
  );
  assert(
    html.includes('<html lang="es">'),
    `Wrong lang on Spanish project ${slug}`,
  );
  assert(
    html.includes('Volver a proyectos'),
    `Spanish project chrome is missing on ${slug}`,
  );
  for (const localizedHtml of [english, html]) {
    assert(
      localizedHtml.includes(`hreflang="en" href="${englishURL}"`),
      `Wrong English project alternate on ${slug}`,
    );
    assert(
      localizedHtml.includes(`hreflang="es" href="${spanishURL}"`),
      `Wrong Spanish project alternate on ${slug}`,
    );
  }
}

console.log(
  `Validated ${sharedRoutes.length} paired routes and ${spanishProjects.length} paired project case studies.`,
);
