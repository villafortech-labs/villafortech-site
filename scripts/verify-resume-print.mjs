#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  evaluate,
  launchChrome,
  navigate,
  normalizedBaseURL,
  parseArguments,
} from './lib/chrome-cdp.mjs';

const RESUMES = [
  {
    file: 'resume-en.pdf',
    headings: ['Experience', 'Education'],
    label: 'English résumé',
    route: '/resume/',
  },
  {
    file: 'resume-es.pdf',
    headings: ['Experiencia', 'Formación'],
    label: 'Spanish résumé',
    route: '/es/resume/',
  },
];

function usage() {
  console.log(`Usage: node scripts/verify-resume-print.mjs --output DIRECTORY [--base-url URL]

Prints and verifies English and Spanish Letter-size, one-page résumé PDFs.
The default base URL is http://127.0.0.1:4321/.`);
}

function requireTool(name) {
  try {
    execFileSync('/usr/bin/env', ['which', name], { stdio: 'ignore' });
  } catch {
    throw new Error(
      `Required PDF inspection tool "${name}" is not installed or is not on PATH.`,
    );
  }
}

function runTool(name, args) {
  try {
    return execFileSync(name, args, {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    throw new Error(`${name} failed: ${detail}`);
  }
}

function parsePdfInfo(output, file) {
  const pages = Number(output.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);
  if (!Number.isInteger(pages)) {
    throw new Error(`${file}: pdfinfo did not report a page count.`);
  }
  if (pages !== 1) {
    throw new Error(`${file}: expected exactly one page, found ${pages}.`);
  }

  const size = output.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts\b/m);
  if (!size) {
    throw new Error(`${file}: pdfinfo did not report the page dimensions.`);
  }
  const width = Number(size[1]);
  const height = Number(size[2]);
  if (Math.abs(width - 612) > 0.5 || Math.abs(height - 792) > 0.5) {
    throw new Error(
      `${file}: expected 612 x 792 pt Letter portrait, found ${width} x ${height} pt.`,
    );
  }
}

function verifyText(text, resume, file) {
  const normalized = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (normalized.length < 500 || words.length < 80) {
    throw new Error(
      `${file}: extracted output looks empty (${normalized.length} characters, ${words.length} words).`,
    );
  }

  for (const heading of resume.headings) {
    if (!normalized.toLocaleLowerCase().includes(heading.toLocaleLowerCase())) {
      throw new Error(`${file}: missing localized heading "${heading}".`);
    }
  }
}

function verifyFonts(output, file) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const divider = lines.findIndex((line) => /^-{5,}/.test(line));
  const fontLines = divider === -1 ? [] : lines.slice(divider + 1);
  if (fontLines.length === 0) {
    throw new Error(`${file}: pdffonts found no embedded text fonts.`);
  }

  for (const line of fontLines) {
    const flags = line.match(
      /\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/i,
    );
    if (!flags) {
      throw new Error(`${file}: could not parse pdffonts row: ${line}`);
    }
    const [, embedded, , unicodeMap] = flags.map((value) =>
      value.toLowerCase(),
    );
    if (embedded !== 'yes') {
      throw new Error(`${file}: contains a non-embedded font: ${line}`);
    }
    if (unicodeMap !== 'yes') {
      throw new Error(
        `${file}: contains a font without a Unicode map: ${line}`,
      );
    }
  }
}

async function verifyPdf(path, resume) {
  const metadata = await stat(path);
  if (metadata.size < 10_000) {
    throw new Error(
      `${path}: PDF is unexpectedly small (${metadata.size} bytes).`,
    );
  }

  parsePdfInfo(runTool('pdfinfo', [path]), path);
  verifyText(runTool('pdftotext', ['-layout', path, '-']), resume, path);
  verifyFonts(runTool('pdffonts', [path]), path);
}

async function main() {
  const args = parseArguments(process.argv.slice(2), {
    'base-url': 'http://127.0.0.1:4321/',
  });
  if (args.help) {
    usage();
    return;
  }
  const unknown = Object.keys(args).filter(
    (key) => !['base-url', 'help', 'output'].includes(key),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  }
  if (!args.output || args.output === true) {
    usage();
    throw new Error('--output DIRECTORY is required.');
  }

  for (const tool of ['pdfinfo', 'pdftotext', 'pdffonts']) requireTool(tool);

  const baseURL = normalizedBaseURL(String(args['base-url']));
  const outputDirectory = resolve(String(args.output));
  await mkdir(outputDirectory, { recursive: true });

  const chrome = await launchChrome();
  const { page } = chrome;
  const outputs = [];
  try {
    await Promise.all([page.send('Page.enable'), page.send('Runtime.enable')]);
    await page.send('Emulation.setEmulatedMedia', { media: 'print' });

    for (const resume of RESUMES) {
      const url = new URL(resume.route.replace(/^\//, ''), baseURL).href;
      await navigate(page, url, { settleMs: 100 });
      await evaluate(
        page,
        `document.fonts?.ready ? document.fonts.ready.then(() => true) : true`,
      );
      const result = await page.send(
        'Page.printToPDF',
        {
          displayHeaderFooter: false,
          paperHeight: 11,
          paperWidth: 8.5,
          preferCSSPageSize: true,
          printBackground: true,
          transferMode: 'ReturnAsBase64',
        },
        { timeoutMs: 30_000 },
      );
      const path = resolve(outputDirectory, resume.file);
      await writeFile(path, Buffer.from(result.data, 'base64'));
      outputs.push({ path, resume });
    }
  } finally {
    await chrome.close();
  }

  for (const { path, resume } of outputs) {
    await verifyPdf(path, resume);
    console.log(`Verified ${resume.label}: ${path}`);
  }
  console.log(
    'Résumé print gate passed: both files are one Letter page with localized text and embedded Unicode-mapped fonts.',
  );
}

main().catch((error) => {
  console.error(
    `Résumé print verification failed: ${error.stack ?? error.message}`,
  );
  process.exitCode = 1;
});
