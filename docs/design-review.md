# Design review and iteration log

Review started: 2026-08-28

## Baseline method

The baseline was captured from commit `7c8ff2d` before design changes.

Routes reviewed in English and Spanish:

- Homepage
- Projects index
- Fairness-aware case study
- About
- Contact
- Resume

Viewports:

- Mobile: 390 x 844
- Tablet: 768 x 1024
- Laptop: 1440 x 900
- Wide desktop: 1728 x 1117

This produced 48 screenshots and 48 browser measurement records under ignored `tmp/design-baseline/`. The measurement harness used Chrome device metrics rather than only resizing the outer window, which avoids Chrome's minimum-window-width distortion.

## Baseline measurements

- All 48 requested page, locale, and viewport combinations rendered.
- All 48 reported `scrollWidth === clientWidth`; no horizontal overflow was detected.
- No baseline screenshot showed clipped headings, overlapping text, or broken responsive grids.
- All target local routes returned successful responses.
- The existing build generated 22 static pages.
- `npm run verify` passed with zero Astro diagnostics, clean formatting, a successful build, valid generated HTML, and 6 paired top-level routes plus 4 paired case studies.
- Public JPEG metadata was clean: zero EXIF entries in the portrait and Helsinki photograph.
- The IEEEXtreme and unused photographs were absent.
- Both language versions of the resume had previously been verified as exactly one Letter page at commit `7c8ff2d`; this gate will be repeated after every layout-affecting cycle.

### Production Lighthouse baseline

Homepage, mobile preset, `https://www.villafortech.com/`:

| Category       | Score |
| -------------- | ----: |
| Performance    |    93 |
| Accessibility  |    95 |
| Best Practices |   100 |
| SEO            |   100 |

Key metrics:

- First Contentful Paint: 1.6s
- Largest Contentful Paint: 2.8s
- Speed Index: 3.9s
- Total Blocking Time: 10ms
- Cumulative Layout Shift: 0

Material findings:

- The 724 x 1086 portrait was served for a 342 x 513 mobile slot. Lighthouse estimated 134 KiB of avoidable image transfer.
- Several small muted labels missed contrast by a narrow margin on `--paper-deep`; milestone numbers on navy had a larger contrast failure.
- The site shipped no application JavaScript, but Cloudflare injected analytics and email-obfuscation scripts in production.
- The 11 KiB compiled stylesheet was render-blocking, with an estimated 198ms impact in the simulated run.

The local development server scored substantially lower because development transforms and unoptimized delivery are not representative of the production bundle. Production is the acceptance surface for Lighthouse.

## Baseline qualitative audit

### What already works

- The paper, navy, cobalt, signal orange, display serif, and monospace labels form a coherent editorial engineering identity.
- The portrait treatment is personal, confident, and unlike a generic AI portfolio.
- Static Astro and MDX keep the experience fast, durable, and inspectable.
- The fairness case has a strong evidence trail and useful technical diagrams.
- English and Spanish routes, page structures, diagrams, calls to action, and metadata are substantially equivalent.
- The homepage clearly includes consulting, collaboration, startup opportunities, and speaking.

### Material weaknesses

1. Motion quality is the largest gap. Current behavior is limited to smooth scroll and small hover transitions. There is no composed entrance, section reveal, route feedback, or semantic diagram motion.
2. The only public-source flagship case appears after SaliHub and COMPUMAX on the homepage even though the content model marks it first. Project cards describe systems but do not expose one key decision and one evidence boundary at scan depth.
3. Sanitized cases are visually text-heavy. SaliHub and Datalysis have no original system visual, and most cases end without a contextual next action.
4. Founders and engineering leaders receive the same path after the hero. The contact page says who can reach out but does not clarify engagement shape or the next step.
5. Repeated numbered labels, hard rules, and ledger rows are sometimes applied uniformly where a content-specific composition would be stronger.
6. The locale gate does not yet validate canonical tags, exact reciprocal alternates, published writing parity, or internal-link integrity.
7. The public portrait is not responsive or delivered in a modern format; the social PNG is 1.8 MiB.

## Baseline scorecard

| Category               | Score | Reason                                                                                             |
| ---------------------- | ----: | -------------------------------------------------------------------------------------------------- |
| Brand originality      |   8.4 | Distinctive paper-and-ink system and portrait; repeated ledger patterns limit range.               |
| Visual hierarchy       |   8.3 | Strong hero and section scale; public proof is not prioritized enough.                             |
| Typography             |   8.6 | Excellent serif, mono, and sans roles; some small muted text fails contrast.                       |
| Layout rhythm          |   8.1 | Deliberate spacing and rules; long pages can feel mechanically segmented.                          |
| Motion quality         |   3.0 | Only basic hover transitions and smooth scrolling.                                                 |
| Project storytelling   |   7.5 | Fairness is strong; other cases lack visual systems and compact decision evidence.                 |
| Conversion clarity     |   7.4 | Consulting is explicit; audience paths and case endings are underdeveloped.                        |
| Mobile responsiveness  |   8.8 | No measured overflow or broken grids across requested pages.                                       |
| Accessibility          |   8.5 | Semantic baseline and focus styles are strong; contrast and full motion testing remain.            |
| Performance            |   8.8 | No app runtime or CLS, but production Lighthouse is 93 and image delivery is inefficient.          |
| English-Spanish parity |   8.8 | Strong route and content parity; validation depth and locale-specific social metadata can improve. |

## Planned cycles

Each cycle may accept no more than three high-leverage changes.

### Cycle 1: hierarchy, evidence, and foundational motion

Planned candidates:

1. Prioritize the public-source flagship and expose a compact boundary, decision, evidence record.
2. Add an accessible composed entrance and finite section-reveal system using progressive enhancement.
3. Introduce the shared signal-and-boundary visual grammar in one homepage composition.

#### Cycle 1 result

Accepted after a clean verification run and an independent read-only review.

- The public fairness project now leads the homepage as the flagship case. Its scan view states one boundary, one decision, and one evidence trail before linking to the full study.
- The supporting SaliHub and COMPUMAX work remains clearly labeled as sanitized, with no implication that private implementation is publicly inspectable.
- A four-stage system-flow graphic turns the site's signal-and-boundary vocabulary into a content-specific composition instead of a decorative AI motif.
- The motion layer uses progressive enhancement. Complete content is visible without JavaScript, section entrances are finite and use `transform` and `opacity`, and reduced-motion users receive immediate final states.
- Hover and keyboard focus now communicate the same response across the site mark, navigation, buttons, and project cards.
- A first reveal implementation briefly hid below-fold content in full-page captures. The implementation was corrected so the default document is always visible and the observer only adds a one-time animation after intersection.

The final Cycle 1 capture matrix again covered all 48 page, locale, and viewport combinations. Every measurement reported zero horizontal overflow, and `npm run verify` passed with 22 generated pages and no Astro, formatting, build, HTML, or locale errors.

| Category               | Baseline | Cycle 1 | Delta |
| ---------------------- | -------: | ------: | ----: |
| Brand originality      |      8.4 |     8.9 |  +0.5 |
| Visual hierarchy       |      8.3 |     9.1 |  +0.8 |
| Typography             |      8.6 |     8.5 |  -0.1 |
| Layout rhythm          |      8.1 |     8.5 |  +0.4 |
| Motion quality         |      3.0 |     7.4 |  +4.4 |
| Project storytelling   |      7.5 |     8.6 |  +1.1 |
| Conversion clarity     |      7.4 |     7.7 |  +0.3 |
| Mobile responsiveness  |      8.8 |     8.7 |  -0.1 |
| Accessibility          |      8.5 |     8.9 |  +0.4 |
| Performance            |      8.8 |     8.7 |  -0.1 |
| English-Spanish parity |      8.8 |     9.2 |  +0.4 |

Cycle 2 will preserve the gains while addressing the review's material concerns: supporting cards will expose the full record without redundant prose, the smallest diagram copy will become easier to read on mobile, and the signal sequence will complete sooner. Performance remains provisional until the production Lighthouse gate.

### Cycle 2: case storytelling and conversion

Planned candidates:

1. Add content-specific system visuals to the text-heavy cases.
2. Give each case a contextual ending and related next path.
3. Route founders and engineering leaders with concise, concrete language.

#### Cycle 2 result

Accepted after the complete verification gate, 80 screenshots across the requested device classes, and an independent read-only review.

- SaliHub now explains how an observation moves through identity, permission, history, use, and the relational core. Datalysis now separates evaluation metrics from operational prediction records across one pipeline. Both graphics are bilingual, content-specific, legible without motion, and bounded by the corresponding sanitized case-study evidence.
- Every project case now ends with a localized route to discuss a similar system or inspect more work. Writing layouts remain unaffected.
- The homepage now distinguishes founders from engineering leaders and gives each audience a concrete starting brief. Each path opens a pre-addressed email with prompts suited to that audience, preserving the choice instead of collapsing both routes into the same generic action.
- Supporting project cards now expose boundary, decision, and evidence consistently. Repeated summaries were removed from those cards, the motion sequence was shortened, and diagram microcopy was enlarged.
- The mobile capability ledger was recomposed as a compact two-column record to reduce the added reading distance.

All measured Cycle 2 pages reported zero horizontal overflow at 390, 768, 1440, and 1728 pixels. The detailed case captures covered SaliHub and Datalysis in both languages. `npm run verify` passed after correcting one invalid ARIA label in the first implementation.

| Category               | Cycle 1 | Cycle 2 | Delta |
| ---------------------- | ------: | ------: | ----: |
| Brand originality      |     8.9 |     9.2 |  +0.3 |
| Visual hierarchy       |     9.1 |     9.2 |  +0.1 |
| Typography             |     8.5 |     8.5 |   0.0 |
| Layout rhythm          |     8.5 |     8.6 |  +0.1 |
| Motion quality         |     7.4 |     7.8 |  +0.4 |
| Project storytelling   |     8.6 |     9.3 |  +0.7 |
| Conversion clarity     |     7.7 |     9.0 |  +1.3 |
| Mobile responsiveness  |     8.7 |     8.6 |  -0.1 |
| Accessibility          |     8.9 |     8.8 |  -0.1 |
| Performance            |     8.7 |     8.7 |   0.0 |
| English-Spanish parity |     9.2 |     9.4 |  +0.2 |

Cycle 3 will address the remaining objective gates: contrast, responsive image delivery, sitemap correctness, metadata and link validation, keyboard and reduced-motion checks, one-page résumé PDFs, and production Lighthouse scores.

### Cycle 3: responsive, accessibility, and performance finish

Planned candidates:

1. Fix contrast and interaction-state issues, then test keyboard and reduced motion.
2. Add responsive modern image delivery and optimize the social asset.
3. Expand automated release gates for links, metadata, locale reciprocity, and one-page print output.

Further cycles will be driven only by measured regressions or material review findings. Two final consecutive audits must identify no worthwhile change before release.
