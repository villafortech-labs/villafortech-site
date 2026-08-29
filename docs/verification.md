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
6. draft writing routes omitted.

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
