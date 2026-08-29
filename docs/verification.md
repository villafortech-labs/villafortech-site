# Verification

## Automated gate

Run:

```bash
npm run verify
```

The gate requires:

1. zero Astro diagnostics;
2. clean Prettier output;
3. a successful production build;
4. valid generated HTML;
5. all intended static routes generated;
6. canonical and `og:url` metadata match every generated HTML route;
7. indexable pages expose exact, reciprocal `en`, `es`, and `x-default`
   alternates;
8. internal links, assets, `srcset` candidates, and same-page anchors resolve;
9. generated HTML contains no absolute local filesystem paths;
10. the sitemap exactly matches the canonical URLs dynamically derived from
    indexable HTML.

The current build contains 22 HTML files and 18 indexable URLs. The English
and Spanish 404 pages and the two noindex writing indexes are intentionally
excluded from the sitemap. Noindex pages still receive canonical and `og:url`
validation; reciprocal locale SEO validation applies to indexable pages.

The sitemap integration also filters `/writing/` and `/es/writing/`, so a
future build cannot publish those placeholders while they remain noindex.

## Browser and print gates

Serve the production build before running browser-dependent checks:

```bash
npm run preview -- --host 127.0.0.1 --port 4322
npm run audit:runtime -- --base-url http://127.0.0.1:4322/
npm run verify:resume -- --base-url http://127.0.0.1:4322/ --output output/pdf
```

The runtime audit exercises representative English and Spanish routes at 390,
768, 1440, and 1728 pixels. It fails on console exceptions, failed or non-2xx
same-origin resources, horizontal overflow, unnamed interactive controls,
positive `tabindex` values, a broken skip link, an inoperable mobile menu, or
motion that remains active when reduced motion is requested.

The résumé print gate creates English and Spanish Letter-size PDFs and requires
each file to contain exactly one page, localized extractable text, and embedded
Unicode-mapped fonts. The resulting PDFs still require a rendered-page visual
inspection before release.

For a performance release gate, audit a freshly served production build with
Lighthouse in both languages. Performance, accessibility, best practices, and
SEO must each score at least 95.

## Content checks

Before publishing, search for stale or unsupported language:

```bash
rg -n "production-grade|deployed|high reliability|guaranteed compliance|open to" src
```

Occurrences that explicitly reject a claim are acceptable. Positive claims require evidence.

## Release checks

- Confirm canonical URLs use `www.villafortech.com`.
- Confirm `robots.txt` points to the same host.
- Confirm the social asset is present and metadata reports its actual dimensions.
- Confirm the fairness case study links to the canonical repository and pinned verified commit.
- Confirm the web résumé is current and the print action works.
- Confirm the apex domain redirects or document it as a DNS follow-up.

Browser screenshot and device-resizing QA are intentionally not represented as completed unless someone actually performs them.
