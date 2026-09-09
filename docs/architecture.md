# Site architecture

## Principles

1. Static HTML first. The site does not ship a client framework.
2. One source per fact. Profile facts live in `src/data/profile.ts`; project facts live in MDX frontmatter.
3. Evidence state is visible. Every project is `public`, `sanitized`, `private`, or `hold`.
4. Layout follows the content. The interface uses editorial records, diagrams, and margin notes instead of generic card grids.

## Routes and sources

| Route              | Source                                                | Layout          |
| ------------------ | ----------------------------------------------------- | --------------- |
| `/`                | `pages/index.astro`, profile data, project collection | `BaseLayout`    |
| `/projects`        | project collection                                    | `BaseLayout`    |
| `/projects/[slug]` | `content/projects/*.mdx`                              | `ContentLayout` |
| `/about`           | profile data                                          | `BaseLayout`    |
| `/resume`          | profile data                                          | `BaseLayout`    |
| `/contact`         | profile data                                          | `BaseLayout`    |
| `/writing`         | published writing collection                          | `BaseLayout`    |
| `/writing/[slug]`  | non-draft `content/writing/*.mdx`                     | `ContentLayout` |

`BaseLayout` owns canonical URLs, Open Graph and Twitter metadata, the shared social image, Person/WebSite structured data, navigation, and footer. `ContentLayout` adds case-study metadata, evidence disclosure, source actions, and the article rail.

## Project model

The schema in `src/content.config.ts` validates required identity and narrative fields plus optional evidence metadata:

- `shortTitle`, `eyebrow`, `organization`, `collaborators`, and `projectPeriod`
- `featuredOrder` for deterministic ordering
- `evidence` and `disclosure` for claim boundaries
- `github`, `reproduce`, and `sourceCommit` for public verification

Indexes query the collection directly. There is no duplicate JSON project registry.

## Design system

`src/styles/global.css` is the new Criterio vivo screen design, built independently of the previous layout. It uses the approved paper (#F3EEE3), forest (#162F2B), leaf (#34644F), sage (#D9DDCC), and clay (#A44438) palette. Instrument Serif is used for the signature and editorial headings; Manrope is used for reading and the homepage opening. Local font files and OFL licenses live in `public/fonts/`; no remote font service is required.

The approved outlined signatures, clover, and micro mark live in `public/brand/`. The header switches between the original horizontal and principal signatures without distorting either. Photography retains its natural colors. `src/styles/print.css` isolates the résumé print layout from screen styling.

Project diagrams remain semantic Astro components representing the documented data and control flows. Their visual presentation follows the same brand colors and readable text hierarchy.

The site-wide social asset is `public/og.jpg`. Its essential text is kept inside a LinkedIn-safe crop. The homepage uses the complete YED07995 photograph as an unchanged 755 × 1133 JPEG from the approved PDF selection. It keeps its native proportions and shows the entire frame at every screen size; the square headshot is reserved for social profiles. The Helsinki photograph uses responsive AVIF and WebP sources with the original JPEG as a fallback.

## JavaScript policy

Navigation uses native HTML. One small progressive-enhancement script marks visible sections for finite CSS motion, while the résumé retains its inline `window.print()` action. Complete content remains visible without JavaScript. Add client JavaScript only when a user-visible capability cannot be expressed accessibly with HTML and CSS.
