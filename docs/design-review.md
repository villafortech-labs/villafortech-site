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

#### Cycle 3 result

Accepted after a final visual matrix, browser-runtime audit, print inspection,
Lighthouse runs, and an independent read-only review.

- The portrait and Helsinki photograph now use responsive AVIF and WebP sources
  with stripped JPEG fallbacks. Mobile selects the 362-pixel portrait and the
  384-pixel Helsinki source; wider screens select only the resolution their
  rendered slot needs.
- The Helsinki photograph is now deliberately secondary. At 390 pixels it
  renders at approximately 248 by 331 pixels. A final scroll inspection also
  caught and fixed the image height attribute overriding its responsive width.
- The site-wide social image changed from a 1.88 MiB PNG to a 1200 by 630,
  126 KiB JPEG with a safe crop and the same editorial identity.
- Muted and signal colors now meet contrast requirements. The final fairness
  case Lighthouse run improved from 96 to 100 accessibility after correcting
  one small threshold label and the dark metric labels.
- The sitemap now excludes the noindex writing placeholders. The generated-site
  validator checks canonicals, `og:url`, exact reciprocal alternates, every
  internal link and asset, `srcset` candidates, anchors, local-path leakage,
  and exact sitemap membership.
- The browser gate covers 16 English and Spanish routes at 390, 768, 1440, and
  1728 pixels. All 64 combinations passed with zero overflow, same-origin
  request failures, console errors, unnamed controls, positive tabindex values,
  skip-link failures, mobile-menu failures, or reduced-motion failures.
- The final visual evidence contains 64 viewport screenshots plus content-aware
  full-page captures. A targeted About recapture verified the corrected photo
  at every requested width.
- English and Spanish résumé PDFs each passed as one Letter page with localized,
  extractable text and embedded Unicode-mapped fonts. The final rendered pages
  were inspected and remained byte-identical after the last site-only CSS edit.
- Representative local production-build Lighthouse runs scored 100 for
  performance, accessibility, best practices, and SEO on the English homepage,
  Spanish homepage, About page, and fairness case. Cumulative Layout Shift was
  zero in every run.

| Category               | Cycle 2 | Cycle 3 | Delta |
| ---------------------- | ------: | ------: | ----: |
| Brand originality      |     9.2 |     9.3 |  +0.1 |
| Visual hierarchy       |     9.2 |     9.4 |  +0.2 |
| Typography             |     8.5 |     9.2 |  +0.7 |
| Layout rhythm          |     8.6 |     8.8 |  +0.2 |
| Motion quality         |     7.8 |     8.3 |  +0.5 |
| Project storytelling   |     9.3 |     9.3 |   0.0 |
| Conversion clarity     |     9.0 |     9.0 |   0.0 |
| Mobile responsiveness  |     8.6 |     9.4 |  +0.8 |
| Accessibility          |     8.8 |     9.7 |  +0.9 |
| Performance            |     8.7 |     9.8 |  +1.1 |
| English-Spanish parity |     9.4 |     9.8 |  +0.4 |

The two sub-9 scores reflect objective constraints rather than open defects.
Layout rhythm stays at 8.8 because the evidence-rich case studies are
intentionally long and cannot be compressed into short marketing summaries
without weakening their credibility. Motion stays at 8.3 because the system is
deliberately finite and restrained: adding more movement would violate the
brief's accessibility, performance, and non-theatrical constraints. The
independent reviewer found no material Cycle 3 issue worth changing.

Further changes now require a measured regression or a material finding. Two
final consecutive audits must identify no worthwhile change before release.

### Release hardening

The first final audit found one material provenance issue: the fairness case
linked exact metrics to a mutable `master` path while its reference report had
not yet been published. Release paused until the evidence boundary was fixed.

- The fairness repository now publishes a reproducible source revision at
  `a58a381e8b9aeb92c7b01aca8b8cc52ec6f14d33` and a reference-evidence revision
  at `c942c259d791c1a3202dad7d585f3e81c6aca18e`.
- The checked XGBoost report records the clean source revision, matching package
  hash, seed 42, 500 paired bootstrap samples, and the expected DI/SPD policy
  rejection.
- English and Spanish case-study actions and exact metric citations now point
  to immutable GitHub revisions. The ongoing repository link remains available
  separately.
- Both fairness GitHub workflows pass at the published evidence revision after
  validating the committed report, package source hash, tests, packaging,
  documentation, and the runtime bundle path.

Because this was a material finding, the no-change audit count was reset. The
two required independent release audits start from this hardened state.

### Production acceptance correction

The first deployed candidate passed the 64-case browser matrix, but repeated
mobile Lighthouse runs exposed a performance regression that the fast local
server had hidden. Production performance fell between 92 and 94 on repeated
homepage and About runs, below the 95 release gate. The LCP was the page heading
and its delay remained on About, where the heading has no entrance animation,
which ruled out the motion layer as the cause. Lighthouse identified the shared
60,768-byte CSS bundle as the only render-blocking resource, with an estimated
243 to 300 milliseconds of avoidable delay.

Astro now inlines the shared stylesheet into each static document. This trades
cross-page CSS caching for a faster cold first render, which is appropriate for
the site's compact, content-first pages and directly removes the blocking
request. The complete build and metadata gates remain clean. Mobile Lighthouse
against the rebuilt local production server returned 100 in every category on
the English homepage, Spanish homepage, About page, and fairness case, with
zero layout shift. Production must be measured again after deployment, and the
two no-change audits must restart from that measured release state.

The first inline-CSS production probe still produced two 94 performance runs
out of six. The blocker was gone, but those slow reports attributed roughly
1.07 seconds of render delay to the transformed homepage heading. The same
routes scored 98 to 100 when the heading was recorded before the animation
completed, so a pass depended on audit timing. The primary promise is now
stable on first paint while the eyebrow, supporting copy, actions, and portrait
retain the composed entrance. This preserves the motion hierarchy and removes
animation timing from the LCP gate. The release audits reset again from this
change.

The next isolated production sequence showed that stabilizing only the heading
was insufficient. Transforming its surrounding hero elements could still
repaint the same compositing region, and Lighthouse timestamped the unchanged
heading one or two seconds late. The initial above-the-fold entrance sequence
has therefore been removed. Motion now begins with navigation and link
feedback, below-fold section reveals, project-card interaction, and finite
technical-diagram state changes. The opening promise and portrait paint once
and stay stable, so motion no longer participates in the homepage LCP. The
release audits reset again from this final motion boundary.

The bilingual print gate also exposed a renderer-portability problem in
Chromium's direct PDF output. Its document structure tree was malformed and,
even without generated tags, some Poppler raster sizes could clip unrelated
regions. Earlier Type 3 font output made the symptom worse, so print typography
now uses stable document font faces while the screen identity remains
unchanged. The exporter disables Chromium's broken generated tags, normalizes
the file with Ghostscript's PDF writer, and only publishes the normalized copy
after its structural checks pass. The resulting PDFs remain searchable,
copyable, localized, preserve their links, and use embedded Unicode-mapped CID
TrueType fonts; the accessible HTML résumé remains the semantic source. Both
files must pass one-page, font, text, and multi-renderer visual checks before
release.
