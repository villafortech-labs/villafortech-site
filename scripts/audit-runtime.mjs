#!/usr/bin/env node

import {
  evaluate,
  launchChrome,
  navigate,
  normalizedBaseURL,
  parseArguments,
  pressKey,
  setReducedMotion,
  setViewport,
  sleep,
} from './lib/chrome-cdp.mjs';

const ROUTES = [
  ['EN home', '/'],
  ['EN projects', '/projects/'],
  ['EN fairness case', '/projects/fairness-aware-candidate-pre-screening/'],
  ['EN SaliHub case', '/projects/salihub-data-architecture/'],
  ['EN Datalysis case', '/projects/datalysis-forecasting/'],
  ['EN about', '/about/'],
  ['EN contact', '/contact/'],
  ['EN resume', '/resume/'],
  ['ES home', '/es/'],
  ['ES projects', '/es/projects/'],
  ['ES fairness case', '/es/projects/fairness-aware-candidate-pre-screening/'],
  ['ES SaliHub case', '/es/projects/salihub-data-architecture/'],
  ['ES Datalysis case', '/es/projects/datalysis-forecasting/'],
  ['ES about', '/es/about/'],
  ['ES contact', '/es/contact/'],
  ['ES resume', '/es/resume/'],
];

const VIEWPORTS = [
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1440', 1440, 900],
  ['1728', 1728, 1117],
];

const INSPECT_PAGE = String.raw`(() => {
  function referencedText(value) {
    return (value || '')
      .trim()
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function accessibleName(element) {
    const labelled = referencedText(element.getAttribute('aria-labelledby'));
    if (labelled) return labelled;
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;

    const content = [...element.childNodes]
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (!(node instanceof Element)) return '';
        if (node.matches('img[alt]')) return node.getAttribute('alt') || '';
        if (node.matches('svg')) {
          return node.querySelector('title')?.textContent || '';
        }
        return node.textContent || '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (content) return content;

    if (element instanceof HTMLInputElement) {
      const labels = element.labels
        ? [...element.labels].map((label) => label.textContent || '').join(' ')
        : '';
      if (labels.trim()) return labels.trim();
      if (element.value.trim()) return element.value.trim();
    }
    return element.getAttribute('title')?.trim() || '';
  }

  function locator(element) {
    const id = element.id ? '#' + element.id : '';
    const classes = [...element.classList]
      .slice(0, 3)
      .map((name) => '.' + name)
      .join('');
    return (element.localName + id + classes).slice(0, 160);
  }

  const unnamedControls = [...document.querySelectorAll('a, button, summary')]
    .filter((element) => !element.closest('[aria-hidden="true"], [inert]'))
    .filter((element) => !accessibleName(element))
    .map((element) => ({
      locator: locator(element),
      html: element.outerHTML.slice(0, 240),
    }));

  const positiveTabindex = [...document.querySelectorAll('[tabindex]')]
    .filter((element) => Number.parseInt(element.getAttribute('tabindex'), 10) > 0)
    .map((element) => ({
      locator: locator(element),
      tabindex: element.getAttribute('tabindex'),
    }));

  const root = document.documentElement;
  const body = document.body;
  const overflowAmount = Math.max(
    root.scrollWidth - root.clientWidth,
    body.scrollWidth - root.clientWidth,
  );
  const overflowElements = overflowAmount > 1
    ? [...body.querySelectorAll('*')]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > root.clientWidth + 1 || rect.left < -1)
        .slice(0, 8)
        .map(({ element, rect }) => ({
          locator: locator(element),
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
        }))
    : [];

  return {
    title: document.title,
    lang: document.documentElement.lang,
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
    bodyScrollWidth: body.scrollWidth,
    overflowAmount,
    overflowElements,
    positiveTabindex,
    unnamedControls,
  };
})()`;

const INSPECT_REDUCED_MOTION = String.raw`(() => {
  function locator(element) {
    if (!element) return '(unknown target)';
    const id = element.id ? '#' + element.id : '';
    const classes = element.classList
      ? [...element.classList].slice(0, 3).map((name) => '.' + name).join('')
      : '';
    return ((element.localName || element.constructor?.name || 'target') + id + classes).slice(0, 160);
  }

  const hiddenRevealTargets = [...document.querySelectorAll('[data-reveal]')]
    .map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        element,
        style,
        rect,
        hidden:
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) < 0.99 ||
          rect.width <= 0 ||
          rect.height <= 0,
      };
    })
    .filter((entry) => entry.hidden)
    .map(({ element, style, rect }) => ({
      locator: locator(element),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }));

  const movementProperties = new Set([
    'bottom', 'left', 'offset', 'offsetDistance', 'offsetPath', 'right',
    'rotate', 'scale', 'top', 'transform', 'translate',
  ]);
  const activeMovementAnimations = document.getAnimations({ subtree: true })
    .filter((animation) => animation.playState === 'running')
    .map((animation) => {
      const frames = animation.effect?.getKeyframes?.() || [];
      const properties = [...new Set(frames.flatMap((frame) => Object.keys(frame)))]
        .filter((property) => movementProperties.has(property));
      return {
        animation,
        properties,
        target: animation.effect?.target,
      };
    })
    .filter((entry) => entry.properties.length > 0)
    .map(({ animation, properties, target }) => ({
      locator: locator(target),
      properties,
      playState: animation.playState,
    }));

  const main = document.querySelector('#main-content');
  const mainStyle = main ? getComputedStyle(main) : null;
  const mainRect = main?.getBoundingClientRect();
  const mainVisible = Boolean(
    main &&
    mainStyle.display !== 'none' &&
    mainStyle.visibility !== 'hidden' &&
    Number.parseFloat(mainStyle.opacity) >= 0.99 &&
    mainRect.width > 0 &&
    mainRect.height > 0
  );

  return {
    mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    mainVisible,
    hiddenRevealTargets,
    activeMovementAnimations,
  };
})()`;

function usage() {
  console.log(`Usage: node scripts/audit-runtime.mjs [--base-url URL]

Audits representative English and Spanish routes at widths 390, 768, 1440,
and 1728 pixels. The default base URL is http://127.0.0.1:4321/.`);
}

function formatDetail(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function describeConsoleArgument(argument) {
  if (argument.value !== undefined) return String(argument.value);
  if (argument.unserializableValue) return argument.unserializableValue;
  return argument.description ?? argument.type ?? '(unknown value)';
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
    (key) => !['base-url', 'help'].includes(key),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  }

  const baseURL = normalizedBaseURL(String(args['base-url']));
  const failures = [];
  let currentRun;
  const requestURLs = new Map();
  const browser = await launchChrome({ extraArguments: ['--hide-scrollbars'] });
  const { page } = browser;

  const fail = (run, check, detail) => {
    failures.push({
      route: run?.routeLabel ?? '(browser)',
      viewport: run?.viewportLabel ?? '(startup)',
      phase: run?.phase ?? 'normal',
      check,
      detail,
    });
  };

  try {
    await Promise.all([
      page.send('Page.enable'),
      page.send('Runtime.enable'),
      page.send('Network.enable'),
      page.send('Log.enable'),
    ]);

    page.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      if (!currentRun) return;
      fail(
        currentRun,
        'console exception',
        exceptionDetails?.exception?.description ??
          exceptionDetails?.text ??
          'Uncaught exception',
      );
    });
    page.on('Runtime.consoleAPICalled', ({ type, args: consoleArgs = [] }) => {
      if (!currentRun || !['error', 'assert'].includes(type)) return;
      fail(
        currentRun,
        `console.${type}`,
        consoleArgs.map(describeConsoleArgument).join(' '),
      );
    });
    page.on('Log.entryAdded', ({ entry }) => {
      if (!currentRun || entry?.level !== 'error') return;
      fail(currentRun, 'browser log error', entry.text ?? 'Unknown log error');
    });
    page.on('Network.requestWillBeSent', ({ requestId, request }) => {
      requestURLs.set(requestId, {
        run: currentRun,
        url: request.url,
      });
    });
    page.on('Network.loadingFinished', ({ requestId }) => {
      requestURLs.delete(requestId);
    });
    page.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => {
      const request = requestURLs.get(requestId);
      requestURLs.delete(requestId);
      if (!request || request.run !== currentRun || canceled) return;
      const url = new URL(request.url, currentRun.url);
      if (url.origin !== currentRun.origin) return;
      fail(
        currentRun,
        'failed same-origin request',
        `${url.href}: ${errorText}`,
      );
    });
    page.on('Network.responseReceived', ({ requestId, response }) => {
      const request = requestURLs.get(requestId);
      if (!request || request.run !== currentRun || response.status < 400)
        return;
      const url = new URL(response.url, currentRun.url);
      if (url.origin !== currentRun.origin) return;
      fail(
        currentRun,
        'failed same-origin response',
        `${response.status} ${url.href}`,
      );
    });

    let completed = 0;
    for (const [viewportLabel, width, height] of VIEWPORTS) {
      await setViewport(page, width, height);

      for (const [routeLabel, route] of ROUTES) {
        const url = new URL(route.replace(/^\//, ''), baseURL).href;
        currentRun = {
          origin: new URL(url).origin,
          phase: 'normal',
          routeLabel,
          url,
          viewportLabel,
        };
        requestURLs.clear();
        await setReducedMotion(page, false);
        try {
          await navigate(page, url);
        } catch (error) {
          fail(currentRun, 'navigation', error.message);
          completed += 1;
          continue;
        }

        const inspection = await evaluate(page, INSPECT_PAGE);
        if (inspection.overflowAmount > 1) {
          fail(currentRun, 'horizontal overflow', {
            clientWidth: inspection.clientWidth,
            scrollWidth: inspection.scrollWidth,
            bodyScrollWidth: inspection.bodyScrollWidth,
            overflowElements: inspection.overflowElements,
          });
        }
        for (const control of inspection.unnamedControls) {
          fail(currentRun, 'missing accessible name', control);
        }
        for (const element of inspection.positiveTabindex) {
          fail(currentRun, 'positive tabindex', element);
        }

        await evaluate(
          page,
          `(() => {
            if (location.hash) history.replaceState(null, '', location.pathname + location.search);
            document.activeElement?.blur();
            window.scrollTo(0, 0);
          })()`,
        );
        await pressKey(page, 'Tab');
        const firstTab = await evaluate(
          page,
          `(() => {
            const active = document.activeElement;
            return {
              href: active?.getAttribute?.('href') || '',
              isSkipLink: Boolean(active?.matches?.('.skip-link[href="#main-content"]')),
              tag: active?.tagName || '',
              text: active?.textContent?.replace(/\\s+/g, ' ').trim() || '',
            };
          })()`,
        );
        if (!firstTab.isSkipLink) {
          fail(currentRun, 'first Tab is not the skip link', firstTab);
        } else {
          await pressKey(page, 'Enter');
          await sleep(50);
          const skipActivation = await evaluate(
            page,
            `({
              activeId: document.activeElement?.id || '',
              hash: location.hash,
              focusedMain: document.activeElement === document.querySelector('#main-content')
            })`,
          );
          if (!skipActivation.focusedMain) {
            fail(
              currentRun,
              'skip-link activation did not focus #main-content',
              skipActivation,
            );
          }
        }

        if (width === 390) {
          const summarySetup = await evaluate(
            page,
            `(() => {
              const summary = [...document.querySelectorAll('details > summary')]
                .find((candidate) => {
                  const rect = candidate.getBoundingClientRect();
                  const style = getComputedStyle(candidate);
                  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                });
              if (!summary) return { available: false };
              const details = summary.closest('details');
              details.open = false;
              summary.focus();
              return {
                available: true,
                focused: document.activeElement === summary,
                initiallyOpen: details.open,
              };
            })()`,
          );
          if (!summarySetup.available || !summarySetup.focused) {
            fail(
              currentRun,
              'mobile summary is not keyboard focusable',
              summarySetup,
            );
          } else {
            await pressKey(page, 'Enter');
            await sleep(50);
            const opened = await evaluate(
              page,
              `(() => {
                const summary = document.activeElement;
                const details = summary?.closest?.('details');
                return { open: Boolean(details?.open), summaryFocused: summary?.tagName === 'SUMMARY' };
              })()`,
            );
            await pressKey(page, 'Enter');
            await sleep(50);
            const closed = await evaluate(
              page,
              `(() => {
                const summary = document.activeElement;
                const details = summary?.closest?.('details');
                return { open: Boolean(details?.open), summaryFocused: summary?.tagName === 'SUMMARY' };
              })()`,
            );
            if (!opened.open || !opened.summaryFocused || closed.open) {
              fail(currentRun, 'mobile summary Enter toggle failed', {
                opened,
                closed,
              });
            }
          }
        }

        currentRun = { ...currentRun, phase: 'reduced motion' };
        requestURLs.clear();
        await setReducedMotion(page, true);
        try {
          await navigate(page, url, { settleMs: 350 });
          const reducedMotion = await evaluate(page, INSPECT_REDUCED_MOTION);
          if (!reducedMotion.mediaMatches) {
            fail(
              currentRun,
              'reduced-motion emulation did not apply',
              reducedMotion,
            );
          }
          if (!reducedMotion.mainVisible) {
            fail(
              currentRun,
              'main content is hidden under reduced motion',
              reducedMotion,
            );
          }
          for (const target of reducedMotion.hiddenRevealTargets) {
            fail(
              currentRun,
              'reveal target hidden under reduced motion',
              target,
            );
          }
          for (const animation of reducedMotion.activeMovementAnimations) {
            fail(currentRun, 'active movement under reduced motion', animation);
          }
        } catch (error) {
          fail(currentRun, 'reduced-motion navigation', error.message);
        }

        completed += 1;
        process.stdout.write(
          `\rAudited ${completed}/${ROUTES.length * VIEWPORTS.length} route/viewport combinations`,
        );
      }
    }
    process.stdout.write('\n');
  } finally {
    currentRun = undefined;
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`Runtime audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure, index) => {
      console.error(
        `${index + 1}. [${failure.viewport}px / ${failure.route} / ${failure.phase}] ${failure.check}: ${formatDetail(failure.detail)}`,
      );
    });
    process.exitCode = 1;
    return;
  }

  console.log(
    `Runtime audit passed: ${ROUTES.length} EN/ES routes across ${VIEWPORTS.length} viewports (${ROUTES.length * VIEWPORTS.length} combinations).`,
  );
}

main().catch((error) => {
  console.error(`Runtime audit could not run: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
