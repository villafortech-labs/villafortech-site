# Resume PDFs

The resume has separate download and print actions. Download serves the verified, single-page PDF in `public/downloads`, so mobile Safari does not need to paginate the website.

After changing resume content or print styles, start the local server and run:

```sh
npm run verify:resume -- --base-url http://127.0.0.1:4321/ --output /private/tmp/villafortech-resume-qa --publish
npm run verify
```

Adjust the port to match the server. The PDF gate checks both languages at desktop, phone, and tablet viewport sizes. It publishes the two desktop exports only after all six PDFs pass the page-count, content, and font checks. Render and visually inspect both published files before committing them with the source changes.

The viewport checks use Chromium emulation, not physical iOS devices. The downloadable files are identical on every device. Screen breakpoints must remain scoped to `@media screen` to avoid affecting print layout; mobile text autosizing is disabled for print.
