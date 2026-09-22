# VillaForTech

Roberto Villafuerte's personal engineering site at [www.villafortech.com](https://www.villafortech.com).

Spanish is the default entry language; English remains available at `/en/`. The public mission is “Construyo tecnología y comparto el proceso desde Latinoamérica.” The technical specialization and next main project remain undecided.

The site is an evidence-led portfolio: public work links to source, private work is clearly marked as sanitized, and case studies separate implemented behavior from unsupported outcome claims.

## Stack

- Astro 7 static site generation
- MDX content collections for case studies and writing
- Hand-authored CSS with no client framework or utility-CSS dependency
- Vercel-compatible static output

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
npm run dev
```

The development server defaults to `http://localhost:4321`.

## Verification

```bash
npm run verify
```

This runs Astro diagnostics, formatting checks, the production build, and generated-HTML validation. The individual commands are also available as `npm run check`, `npm run format:check`, `npm run build`, and `npm run validate:html`.

## Content

- `src/data/profile.ts` is the canonical source for profile, experience, education, credentials, skills, languages, and contact links.
- `src/data/links.ts` owns the public social and contact destinations shared by both languages, the link directory, and Person structured data.
- `src/content/projects/*.mdx` is the only source for project indexes and case-study routes.
- `src/content/writing/*.mdx` contains independent notes. Drafts do not generate routes.
- `src/content.config.ts` validates both collections.

Read [docs/content-policy.md](docs/content-policy.md) before changing professional claims, and [docs/architecture.md](docs/architecture.md) before changing routes or content structure.

## Main routes

| Route                                              | Purpose                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `/`                                                | Spanish mission, current work, and selected evidence          |
| `/en/`                                             | English homepage for international access                     |
| `/projects`                                        | Evidence ledger for public and sanitized work                 |
| `/projects/fairness-aware-candidate-pre-screening` | Featured public engineering case study                        |
| `/about`                                           | Demonstrated work and technical direction                     |
| `/resume`                                          | Canonical web résumé with print/PDF support                   |
| `/contact`                                         | Email, LinkedIn, and GitHub                                   |
| `/links`                                           | Spanish directory with LinkedIn first and all public profiles |
| `/en/links`                                        | English version of the link directory                         |
| `/writing`                                         | Evidence-gated independent notes                              |

The canonical host is `https://www.villafortech.com`.

## Language routes

Spanish navigation uses `/`, `/es/projects/`, `/es/about/`, `/es/contact/`, and `/es/resume/`. English uses `/en/` and the existing unprefixed project, about, contact, résumé, and writing paths. The old `/es/` homepage redirects to `/`, with a static fallback. Existing case-study and résumé URLs stay usable; reciprocal language links and `x-default` point to Spanish as the default.

The shared social-bio destination is `/links/` in Spanish, with an English alternative at `/en/links/`. Both are static, indexable pages with reciprocal language links.
