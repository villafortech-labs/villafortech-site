# Site architecture

## Principles

1. Static HTML first. The site does not ship a client framework.
2. One source per fact. Profile facts live in `src/data/profile.ts`; project facts live in MDX frontmatter.
3. Evidence state is visible. Every project is `public`, `sanitized`, `private`, or `hold`.
4. Layout follows the content. The interface uses editorial records, diagrams, and margin notes instead of generic card grids.

## Routes and sources

| Route              | Source                                                                    | Layout           |
| ------------------ | ------------------------------------------------------------------------- | ---------------- |
| `/`                | Spanish homepage in `pages/index.astro`, profile data, project collection | `BaseLayout`     |
| `/en/`             | English wrapper of `pages/index.astro`                                    | `BaseLayout`     |
| `/es/`             | Legacy homepage redirect to `/`                                           | Noindex fallback |
| `/projects`        | project collection                                                        | `BaseLayout`     |
| `/projects/[slug]` | `content/projects/*.mdx`                                                  | `ContentLayout`  |
| `/about`           | profile data                                                              | `BaseLayout`     |
| `/resume`          | profile data                                                              | `BaseLayout`     |
| `/contact`         | profile data                                                              | `BaseLayout`     |
| `/writing`         | published writing collection                                              | `BaseLayout`     |
| `/writing/[slug]`  | non-draft `content/writing/*.mdx`                                         | `ContentLayout`  |

`BaseLayout` owns canonical URLs, Open Graph and Twitter metadata, the shared social image, Person/WebSite structured data, navigation, and footer. `ContentLayout` adds case-study metadata, evidence disclosure, source actions, and the article rail.

The public profile directory is Spanish at `/links/` and English at `/en/links/`, using `pages/links.astro` with an English wrapper and the existing `BaseLayout`. Its social and contact destinations come from `src/data/links.ts`, which also supplies profile/contact data and Person `sameAs` references. No client JavaScript or new service is required. The directory avoids repeating the visitor’s social-profile biography and portrait. Navigation and the footer expose the localized directory.

## Public reference archive

`src/data/references.ts` holds first-person notes based on Roberto's documented work, mentions and interviews, with original links, source dates, and Spanish/English copy. `/es/references/` and `/references/` list these notes; their detail routes share `ReferencePage.astro`. The footer links to “Notas y entrevistas”. The pages identify Roberto as the author and distinguish each source date from the new note's publication date. Sources appear at the end. The site does not republish the full magazine article or video, describe affiliated material as independent reporting, or use NewsArticle structured data.

## Project model

The schema in `src/content.config.ts` validates required identity and narrative fields plus optional evidence metadata:

- `shortTitle`, `eyebrow`, `organization`, `collaborators`, and `projectPeriod`
- `featuredOrder` for deterministic ordering
- `evidence` and `disclosure` for claim boundaries
- `github`, `reproduce`, and `sourceCommit` for public verification

Indexes query the collection directly. There is no duplicate JSON project registry.

## Design system

The 6 November renewal presents Roberto as a person who builds and learns. `src/styles/renewal.css` supplies shared screen tokens over the established compatibility styles: cool offwhite (#f5f6f2), deep green (#172a25), green (#285d46) and sage (#e4e9df), with locally hosted Manrope for both display and reading. The original green clover is preserved byte-for-byte at `public/brand/clover.svg`, without a backing shape or effect. Navigation and footer use the clover with a text name.

`home-renewal.css`, `about-renewal.css` and `projects-renewal.css` own their page compositions. Photography retains the complete original frames and natural colors. Optimized WebP derivatives live in `public/images/renewal/`; provenance is recorded in the session's asset manifest. The approved portrait is YED07995. The programming photograph is a personal archive frame, not evidence of work on a specific case. The Chinese study photo and salsa frame were user-selected for the published personal carousel.

The bilingual 1200 × 630 link images are `public/og-renewal-es.png` and `public/og-renewal-en.png`. BaseLayout selects the appropriate locale. Earlier assets are retained as history. Existing project diagrams remain semantic components with scoped disclosure; Panorama's conceptual illustration labels its numbers as fictional.

## JavaScript policy

Static HTML and native browser controls lead. The homepage uses native disclosure controls, and mobile navigation is a native details element. Screen content is visible without JavaScript. There is no repeated scroll reveal. One finite portrait entry uses CSS clip-path and transform; reduced motion removes it and all positional UI transitions. Existing résumé print behavior and archived registration routes remain intact. No analytics, signup, newsletter or external service was introduced.

## Spanish-first routing (September 12, 2026)

The homepage is Spanish at `/` and English at `/en/`. Interior paths are preserved: Spanish uses `/es/...` and English retains its unprefixed routes. `src/i18n.ts` owns those route mappings; routing does not depend on implicit locale prefixes. `vercel.json` permanently redirects the old `/es/` homepage to `/`. Its generated noindex fallback also links and refreshes to `/` when hosted without Vercel. The sitemap excludes this fallback and writing indexes, and contains explicit reciprocal EN/ES alternatives with Spanish as `x-default`. The existing locale and site validators enforce the new homepage mapping and existing evidence routes.
