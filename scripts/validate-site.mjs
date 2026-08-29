import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const siteOrigin = 'https://www.villafortech.com';
const expectedAlternateLanguages = ['en', 'es', 'x-default'];
const errors = [];

function report(file, check, message) {
  errors.push(`${file}: ${check}: ${message}`);
}

function decodeAttribute(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function attributes(tag) {
  const result = new Map();
  const pattern =
    /\s([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(pattern)) {
    result.set(
      match[1].toLowerCase(),
      decodeAttribute(match[2] ?? match[3] ?? match[4] ?? ''),
    );
  }

  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(
    ([tag]) => ({ tag, attributes: attributes(tag) }),
  );
}

function anchorNames(html) {
  const anchors = new Set();

  for (const [tag] of html.matchAll(/<[a-z][^>]*>/gi)) {
    const attrs = attributes(tag);
    if (attrs.has('id')) anchors.add(attrs.get('id'));
    if (/^<a\b/i.test(tag) && attrs.has('name')) {
      anchors.add(attrs.get('name'));
    }
  }

  return anchors;
}

async function filesBelow(directory, predicate) {
  const found = [];

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (predicate(fullPath)) found.push(fullPath);
    }
  }

  await visit(directory);
  return found.sort();
}

function displayPath(file) {
  return relative(projectRoot, file).split(sep).join('/');
}

function routeForHtmlFile(file) {
  const outputPath = relative(distRoot, file).split(sep).join('/');

  if (outputPath === 'index.html') return '/';
  if (outputPath === '404.html') return '/404/';
  if (outputPath.endsWith('/index.html')) {
    return `/${outputPath.slice(0, -'index.html'.length)}`;
  }

  return `/${outputPath}`;
}

function canonicalHref(route) {
  return new URL(route, siteOrigin).href;
}

function oneTag(page, name, candidates, label) {
  if (candidates.length !== 1) {
    report(
      page.file,
      label,
      `expected exactly one ${name}; found ${candidates.length}`,
    );
    return undefined;
  }

  return candidates[0];
}

function isNoIndex(metaTags) {
  return metaTags.some(({ attributes: attrs }) => {
    if (attrs.get('name')?.toLowerCase() !== 'robots') return false;
    return (attrs.get('content') ?? '')
      .toLowerCase()
      .split(/[\s,]+/)
      .includes('noindex');
  });
}

function isNotFoundRoute(route) {
  return route === '/404/' || route === '/es/404/';
}

function validateAbsolutePageUrl(page, value, label) {
  if (!value) {
    report(page.file, label, 'URL is empty');
    return undefined;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    report(page.file, label, `invalid absolute URL ${JSON.stringify(value)}`);
    return undefined;
  }

  if (url.origin !== siteOrigin) {
    report(
      page.file,
      label,
      `expected origin ${siteOrigin}; found ${url.origin}`,
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    report(
      page.file,
      label,
      'must not include credentials, query, or fragment',
    );
  }

  return url;
}

function expectedAlternates(pathname) {
  const englishPath = pathname.startsWith('/es/')
    ? pathname.slice('/es'.length) || '/'
    : pathname;
  const spanishPath = pathname.startsWith('/es/')
    ? pathname
    : pathname === '/'
      ? '/es/'
      : `/es${pathname}`;

  return {
    en: canonicalHref(englishPath),
    es: canonicalHref(spanishPath),
    'x-default': canonicalHref(englishPath),
  };
}

function parseAlternates(page) {
  const alternateTags = page.linkTags.filter(({ attributes: attrs }) => {
    const relationships = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
    return relationships.includes('alternate') && attrs.has('hreflang');
  });
  const alternates = {};

  for (const { attributes: attrs } of alternateTags) {
    const language = attrs.get('hreflang')?.toLowerCase();
    if (!language) continue;
    if (Object.hasOwn(alternates, language)) {
      report(page.file, 'hreflang', `duplicate ${language} alternate`);
      continue;
    }
    alternates[language] = attrs.get('href') ?? '';
  }

  const actualLanguages = Object.keys(alternates).sort();
  if (
    JSON.stringify(actualLanguages) !==
    JSON.stringify([...expectedAlternateLanguages].sort())
  ) {
    report(
      page.file,
      'hreflang',
      `expected exactly en, es, x-default; found ${actualLanguages.join(', ') || 'none'}`,
    );
  }

  return alternates;
}

function validateSeo(page) {
  const canonicalTag = oneTag(
    page,
    'canonical link',
    page.linkTags.filter(({ attributes: attrs }) =>
      (attrs.get('rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'),
    ),
    'canonical',
  );
  const ogUrlTag = oneTag(
    page,
    'og:url meta tag',
    page.metaTags.filter(
      ({ attributes: attrs }) =>
        attrs.get('property')?.toLowerCase() === 'og:url',
    ),
    'og:url',
  );

  const canonical = validateAbsolutePageUrl(
    page,
    canonicalTag?.attributes.get('href'),
    'canonical',
  );
  const ogUrl = validateAbsolutePageUrl(
    page,
    ogUrlTag?.attributes.get('content'),
    'og:url',
  );
  const expectedCanonical = canonicalHref(page.route);

  if (canonical?.href !== expectedCanonical) {
    report(
      page.file,
      'canonical',
      `expected ${expectedCanonical}; found ${canonical?.href ?? 'invalid URL'}`,
    );
  }
  if (canonical && ogUrl && canonical.href !== ogUrl.href) {
    report(
      page.file,
      'og:url',
      `must match canonical ${canonical.href}; found ${ogUrl.href}`,
    );
  }

  page.canonical = canonical?.href;
  page.alternates = parseAlternates(page);
}

function candidateOutputPaths(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return [];
  }

  if (decoded === '/404/') return [join(distRoot, '404.html')];

  const path = decoded.replace(/^\/+/, '');
  const candidates = !path
    ? [join(distRoot, 'index.html')]
    : decoded.endsWith('/')
      ? [join(distRoot, path, 'index.html')]
      : [
          join(distRoot, path),
          join(distRoot, `${path}.html`),
          join(distRoot, path, 'index.html'),
        ];

  return candidates.filter((candidate) => {
    const absolute = resolve(candidate);
    return absolute === distRoot || absolute.startsWith(`${distRoot}${sep}`);
  });
}

function localTargetExists(pathname) {
  return candidateOutputPaths(pathname).some((candidate) =>
    existsSync(candidate),
  );
}

function sameGeneratedTarget(firstPathname, secondPathname) {
  const first = candidateOutputPaths(firstPathname).find((candidate) =>
    existsSync(candidate),
  );
  const second = candidateOutputPaths(secondPathname).find((candidate) =>
    existsSync(candidate),
  );
  return first && second && resolve(first) === resolve(second);
}

function parseReference(rawValue) {
  if (!rawValue) return { skip: true };
  if (rawValue.startsWith('#')) {
    return { samePage: true, fragment: rawValue.slice(1) };
  }

  if (rawValue.startsWith('//')) {
    return { error: 'protocol-relative URLs are not allowed; use HTTPS' };
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(rawValue)) {
    let url;
    try {
      url = new URL(rawValue);
    } catch {
      return { error: `invalid URL ${JSON.stringify(rawValue)}` };
    }

    if (url.protocol === 'javascript:') {
      return { error: 'javascript: URLs are not allowed' };
    }
    if (!['http:', 'https:'].includes(url.protocol)) return { skip: true };
    if (url.origin !== siteOrigin) return { skip: true };
    return { url, local: true };
  }

  if (!rawValue.startsWith('/')) {
    return {
      error: `internal references must be root-relative; found ${JSON.stringify(rawValue)}`,
    };
  }

  try {
    return { url: new URL(rawValue, siteOrigin), local: true };
  } catch {
    return { error: `invalid root-relative URL ${JSON.stringify(rawValue)}` };
  }
}

function decodedFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

function validateReference(page, attribute, rawValue) {
  const parsed = parseReference(rawValue);
  const label = `reference ${attribute}=${JSON.stringify(rawValue)}`;

  if (parsed.error) {
    report(page.file, label, parsed.error);
    return;
  }
  if (parsed.skip) return;

  if (parsed.samePage) {
    const fragment = decodedFragment(parsed.fragment);
    if (!fragment || !page.anchors.has(fragment)) {
      report(page.file, label, `missing same-page anchor #${fragment}`);
    }
    return;
  }

  const { url } = parsed;
  if (!localTargetExists(url.pathname)) {
    report(page.file, label, `missing generated target ${url.pathname}`);
  }

  const canonicalPath = page.canonical
    ? new URL(page.canonical).pathname
    : page.route;
  if (url.hash && sameGeneratedTarget(url.pathname, canonicalPath)) {
    const fragment = decodedFragment(url.hash.slice(1));
    if (!fragment || !page.anchors.has(fragment)) {
      report(page.file, label, `missing same-page anchor #${fragment}`);
    }
  }
}

function srcsetCandidates(value) {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

function validateReferences(page) {
  const tagNames = [
    'a',
    'area',
    'link',
    'script',
    'img',
    'source',
    'video',
    'audio',
    'track',
    'iframe',
    'object',
    'form',
  ];
  const referenceAttributes = ['href', 'src', 'poster', 'data', 'action'];

  for (const name of tagNames) {
    for (const { attributes: attrs } of tags(page.html, name)) {
      for (const attribute of referenceAttributes) {
        if (attrs.has(attribute)) {
          validateReference(page, attribute, attrs.get(attribute));
        }
      }

      if (attrs.has('srcset')) {
        for (const candidate of srcsetCandidates(attrs.get('srcset'))) {
          validateReference(page, 'srcset', candidate);
        }
      }
    }
  }
}

function validateNoFilesystemPaths(page) {
  const patterns = [
    ['file URL', /file:\/\//i],
    ['macOS user path', /\/Users\/[A-Za-z0-9._-]+\//],
    ['Linux user path', /\/home\/[A-Za-z0-9._-]+\//],
    ['mounted volume path', /\/Volumes\/[A-Za-z0-9._ -]+\//],
    ['temporary path', /\/(?:private\/)?tmp\/[A-Za-z0-9._-]+\//],
    ['macOS temporary path', /\/var\/folders\/[A-Za-z0-9._/-]+/],
    ['Homebrew path', /\/opt\/homebrew\/[A-Za-z0-9._/-]+/],
    ['Windows drive path', /[A-Za-z]:\\(?:Users|Documents and Settings)\\/i],
  ];

  for (const [label, pattern] of patterns) {
    if (pattern.test(page.html)) {
      report(page.file, 'filesystem path', `contains an absolute ${label}`);
    }
  }
}

function validateHreflang(indexablePages) {
  const byCanonical = new Map(
    indexablePages
      .filter((page) => page.canonical)
      .map((page) => [page.canonical, page]),
  );

  for (const page of indexablePages) {
    if (!page.canonical) continue;
    const expected = expectedAlternates(new URL(page.canonical).pathname);
    for (const language of expectedAlternateLanguages) {
      if (page.alternates[language] !== expected[language]) {
        report(
          page.file,
          'hreflang',
          `${language} expected ${expected[language]}; found ${page.alternates[language] ?? 'missing'}`,
        );
      }
    }

    const english = byCanonical.get(expected.en);
    const spanish = byCanonical.get(expected.es);
    if (!english) {
      report(
        page.file,
        'hreflang reciprocity',
        `missing English page ${expected.en}`,
      );
    }
    if (!spanish) {
      report(
        page.file,
        'hreflang reciprocity',
        `missing Spanish page ${expected.es}`,
      );
    }
    if (english?.alternates.es !== expected.es) {
      report(
        page.file,
        'hreflang reciprocity',
        `${expected.en} does not link back to ${expected.es}`,
      );
    }
    if (spanish?.alternates.en !== expected.en) {
      report(
        page.file,
        'hreflang reciprocity',
        `${expected.es} does not link back to ${expected.en}`,
      );
    }
  }
}

function xmlValues(xml, element) {
  return [
    ...xml.matchAll(new RegExp(`<${element}>([^<]+)</${element}>`, 'g')),
  ].map(([, value]) => decodeAttribute(value.trim()));
}

async function sitemapUrls() {
  const sitemapIndex = join(distRoot, 'sitemap-index.xml');
  if (!existsSync(sitemapIndex)) {
    report('dist/sitemap-index.xml', 'sitemap', 'missing sitemap index');
    return new Set();
  }

  const indexXml = await readFile(sitemapIndex, 'utf8');
  const shardUrls = xmlValues(indexXml, 'loc');
  const urls = [];

  if (shardUrls.length === 0) {
    report('dist/sitemap-index.xml', 'sitemap', 'contains no sitemap shards');
  }

  for (const shardUrl of shardUrls) {
    let url;
    try {
      url = new URL(shardUrl);
    } catch {
      report(
        'dist/sitemap-index.xml',
        'sitemap',
        `invalid shard URL ${shardUrl}`,
      );
      continue;
    }

    if (url.origin !== siteOrigin) {
      report(
        'dist/sitemap-index.xml',
        'sitemap',
        `shard must use ${siteOrigin}; found ${shardUrl}`,
      );
      continue;
    }

    const shardFile = resolve(distRoot, url.pathname.replace(/^\/+/, ''));
    if (!shardFile.startsWith(`${distRoot}${sep}`)) {
      report(
        'dist/sitemap-index.xml',
        'sitemap',
        `shard escapes dist/: ${url.pathname}`,
      );
      continue;
    }
    if (!existsSync(shardFile)) {
      report(
        'dist/sitemap-index.xml',
        'sitemap',
        `missing shard ${url.pathname}`,
      );
      continue;
    }

    const shardXml = await readFile(shardFile, 'utf8');
    for (const pageUrl of xmlValues(shardXml, 'loc')) {
      try {
        const parsed = new URL(pageUrl);
        if (parsed.origin !== siteOrigin) {
          report(
            displayPath(shardFile),
            'sitemap',
            `page URL must use ${siteOrigin}; found ${pageUrl}`,
          );
        }
        if (
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash
        ) {
          report(
            displayPath(shardFile),
            'sitemap',
            `page URL must not include credentials, query, or fragment: ${pageUrl}`,
          );
        }
        urls.push(parsed.href);
      } catch {
        report(
          displayPath(shardFile),
          'sitemap',
          `invalid page URL ${pageUrl}`,
        );
      }
    }
  }

  const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
  for (const duplicate of new Set(duplicates)) {
    report('dist/sitemap-index.xml', 'sitemap', `duplicate URL ${duplicate}`);
  }

  return new Set(urls);
}

function compareSets(expected, actual) {
  for (const url of [...expected].sort()) {
    if (!actual.has(url)) {
      report(
        'dist/sitemap-index.xml',
        'sitemap',
        `missing indexable URL ${url}`,
      );
    }
  }
  for (const url of [...actual].sort()) {
    if (!expected.has(url)) {
      report('dist/sitemap-index.xml', 'sitemap', `unexpected URL ${url}`);
    }
  }
}

if (!existsSync(distRoot)) {
  console.error(
    'Site integrity validation failed: dist/ does not exist. Run npm run build first.',
  );
  process.exit(1);
}

const htmlFiles = await filesBelow(distRoot, (file) => file.endsWith('.html'));
const pages = [];

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const page = {
    file: displayPath(file),
    html,
    route: routeForHtmlFile(file),
    linkTags: tags(html, 'link'),
    metaTags: tags(html, 'meta'),
    anchors: anchorNames(html),
  };

  page.noIndex = isNoIndex(page.metaTags);
  page.notFound = isNotFoundRoute(page.route);
  validateSeo(page);
  validateNoFilesystemPaths(page);
  pages.push(page);
}

const canonicalDuplicates = pages
  .map((page) => page.canonical)
  .filter(
    (canonical, index, canonicals) =>
      canonical && canonicals.indexOf(canonical) !== index,
  );
for (const canonical of new Set(canonicalDuplicates)) {
  report('dist/**/*.html', 'canonical', `duplicate canonical URL ${canonical}`);
}

for (const page of pages) validateReferences(page);

const indexablePages = pages.filter((page) => !page.noIndex && !page.notFound);
validateHreflang(indexablePages);

const expectedSitemapUrls = new Set(
  indexablePages.map((page) => page.canonical).filter(Boolean),
);
const actualSitemapUrls = await sitemapUrls();
compareSets(expectedSitemapUrls, actualSitemapUrls);

if (errors.length > 0) {
  console.error(
    `Site integrity validation failed with ${errors.length} error(s):`,
  );
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
  process.exit(1);
}

console.log(
  `Validated ${pages.length} generated HTML files, ${indexablePages.length} indexable canonical URLs, ${indexablePages.length / 2} reciprocal EN/ES route pairs, and an exact ${actualSitemapUrls.size}-URL sitemap.`,
);
