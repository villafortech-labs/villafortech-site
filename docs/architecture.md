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

`src/styles/global.css` defines a warm-paper editorial system with midnight navy, cobalt, and a single burnt-orange signal color. Display typography uses a system serif stack; labels use a system monospace stack. There are no remote font requests.

Project-specific visuals are semantic Astro components:

- `EvaluationProtocol.astro` shows the train-validation-test boundary.
- `MetricShift.astro` shows the direction of the verified fairness metrics.

The site-wide social asset is `public/og.png`. Its essential text is kept inside a LinkedIn-safe crop.

## JavaScript policy

Navigation uses native HTML. The only interactive script surface is the résumé's inline `window.print()` action. Add client JavaScript only when a user-visible capability cannot be expressed accessibly with HTML and CSS.
