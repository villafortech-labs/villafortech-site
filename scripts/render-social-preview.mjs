import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launchChrome, navigate, setViewport } from './lib/chrome-cdp.mjs';

const signature = await readFile(
  new URL('../public/brand/signature-horizontal.svg', import.meta.url),
  'utf8',
);
const font = await readFile(
  new URL('../public/fonts/manrope/Manrope[wght].ttf', import.meta.url),
);
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Villa for Tech — vista previa</title><style>
@font-face { font-family: Manrope; src: url(data:font/ttf;base64,${font.toString('base64')}) format('truetype'); font-weight: 200 800; }
* { box-sizing: border-box; } body { margin: 0; width: 1200px; height: 630px; background: #F3EEE3; color: #162F2B; font-family: Manrope, sans-serif; padding: 64px 86px; }
.signature { width: 850px; height: 152px; margin-left: -11px; } .signature svg { width: 100%; height: 100%; }
h1 { margin: 39px 0 26px; font-size: 49px; line-height: 1.25; font-weight: 560; letter-spacing: -1.3px; }
h1 span { color: #34644F; } p { margin: 0; font-size: 23px; color: #34644F; } footer { margin-top: 44px; padding-top: 22px; border-top: 1px solid #34644F55; font-size: 19px; display: flex; justify-content: space-between; }
</style></head><body><div class="signature">${signature.replace(/<\?xml[^>]*>/, '')}</div><h1>Construyo tecnología y comparto<br>el proceso <span>desde Latinoamérica.</span></h1><p>Proyectos, experimentos y aprendizajes.</p><footer><span>Villa for Tech</span><span>villafortech.com</span></footer></body></html>`;
const chrome = await launchChrome();
try {
  await setViewport(chrome.page, 1200, 630);
  await navigate(
    chrome.page,
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );
  const capture = await chrome.page.send('Page.captureScreenshot', {
    format: 'png',
  });
  const output = new URL('../public/og-mission.png', import.meta.url);
  await writeFile(output, Buffer.from(capture.data, 'base64'));
  console.log(
    `Rendered ${fileURLToPath(output)} at 1200 × 630 using the approved signature and Manrope.`,
  );
} finally {
  await chrome.close();
}
