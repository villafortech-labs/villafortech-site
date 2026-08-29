import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_TIMEOUT_MS = 15_000;

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function executableExists(path) {
  if (!path) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  for (const candidate of candidates) {
    if (await executableExists(candidate)) return candidate;
  }

  throw new Error(
    'Chrome or Chromium was not found. Set CHROME_PATH to its executable.',
  );
}

export class CdpClient {
  #label;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();
  #socket;

  constructor(socket, label) {
    this.#socket = socket;
    this.#label = label;

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        this.#pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) {
          pending.reject(
            new Error(
              `${pending.method}: ${message.error.message ?? 'CDP error'}`,
            ),
          );
        } else {
          pending.resolve(message.result);
        }
        return;
      }

      const handlers = this.#listeners.get(message.method);
      if (!handlers) return;
      for (const handler of handlers) handler(message.params ?? {});
    });

    socket.addEventListener('close', () => {
      for (const pending of this.#pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`${this.#label} CDP socket closed.`));
      }
      this.#pending.clear();
    });
  }

  static async connect(url, label = 'Chrome') {
    const socket = new WebSocket(url);
    await withTimeout(
      new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener(
          'error',
          () => reject(new Error(`Could not connect to ${label} CDP socket.`)),
          { once: true },
        );
      }),
      DEFAULT_TIMEOUT_MS,
      `Timed out connecting to ${label} CDP socket.`,
    );
    return new CdpClient(socket, label);
  }

  send(method, params = {}, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      const id = this.#nextId;
      this.#nextId += 1;
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
      timer.unref?.();
      this.#pending.set(id, { method, resolve, reject, timer });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.#listeners.get(method) ?? new Set();
    handlers.add(handler);
    this.#listeners.set(method, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.#listeners.delete(method);
    };
  }

  close() {
    if (this.#socket.readyState < WebSocket.CLOSING) this.#socket.close();
  }
}

async function waitForDevToolsPort(profileDirectory, processState) {
  const activePortFile = join(profileDirectory, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (processState.exited) {
      throw new Error(
        `Chrome exited before CDP became available.${processState.stderr ? `\n${processState.stderr}` : ''}`,
      );
    }
    try {
      const [portLine, browserPath] = (await readFile(activePortFile, 'utf8'))
        .trim()
        .split(/\r?\n/);
      const port = Number(portLine);
      if (Number.isInteger(port) && port > 0 && browserPath) {
        return { port, browserPath };
      }
    } catch {
      // Chrome has not written DevToolsActivePort yet.
    }
    await sleep(50);
  }
  throw new Error('Chrome DevTools endpoint did not become ready.');
}

async function pageSocketURL(port, browserClient) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
      (response) => {
        if (!response.ok) {
          throw new Error(
            `Chrome target list returned HTTP ${response.status}.`,
          );
        }
        return response.json();
      },
    );
    const page = targets.find((target) => target.type === 'page');
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;

    if (attempt === 0) {
      await browserClient.send('Target.createTarget', { url: 'about:blank' });
    }
    await sleep(50);
  }
  throw new Error('Chrome did not expose a page target.');
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return withTimeout(
    new Promise((resolve) => child.once('exit', resolve)),
    timeoutMs,
    'Chrome did not exit in time.',
  );
}

export async function launchChrome(options = {}) {
  const chromePath = options.chromePath ?? (await findChromeExecutable());
  const profileDirectory = await mkdtemp(
    join(tmpdir(), 'villafortech-release-chrome-'),
  );
  const processState = { exited: false, stderr: '' };
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      '--password-store=basic',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDirectory}`,
      ...(options.extraArguments ?? []),
      options.initialURL ?? 'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', (chunk) => {
    processState.stderr = `${processState.stderr}${chunk}`.slice(-8_000);
  });
  chrome.once('exit', () => {
    processState.exited = true;
  });

  let browser;
  let page;
  let closed = false;
  const signalHandlers = new Map();

  const close = async () => {
    if (closed) return;
    closed = true;
    for (const [signal, handler] of signalHandlers) {
      process.off(signal, handler);
    }

    page?.close();
    if (browser) {
      try {
        await browser.send('Browser.close', {}, { timeoutMs: 2_000 });
      } catch {
        // The socket commonly closes before Browser.close sends a response.
      }
      browser.close();
    }

    try {
      await waitForExit(chrome, 2_500);
    } catch {
      chrome.kill('SIGTERM');
      try {
        await waitForExit(chrome, 1_500);
      } catch {
        chrome.kill('SIGKILL');
        await waitForExit(chrome, 1_500).catch(() => {});
      }
    }

    await rm(profileDirectory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  };

  try {
    const { port, browserPath } = await waitForDevToolsPort(
      profileDirectory,
      processState,
    );
    browser = await CdpClient.connect(
      `ws://127.0.0.1:${port}${browserPath}`,
      'browser',
    );
    page = await CdpClient.connect(await pageSocketURL(port, browser), 'page');

    for (const signal of ['SIGINT', 'SIGTERM']) {
      const handler = async () => {
        await close();
        process.exitCode = signal === 'SIGINT' ? 130 : 143;
      };
      signalHandlers.set(signal, handler);
      process.once(signal, handler);
    }

    return { browser, chrome, close, page, port, profileDirectory };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function evaluate(page, expression, options = {}) {
  const result = await page.send('Runtime.evaluate', {
    expression,
    awaitPromise: options.awaitPromise ?? true,
    returnByValue: true,
    userGesture: options.userGesture ?? false,
  });
  if (result.exceptionDetails) {
    const description =
      result.exceptionDetails.exception?.description ??
      result.exceptionDetails.text ??
      'Runtime evaluation failed.';
    throw new Error(description);
  }
  return result.result.value;
}

export async function navigate(page, url, options = {}) {
  const result = await page.send('Page.navigate', { url });
  if (result.errorText) {
    throw new Error(`Navigation to ${url} failed: ${result.errorText}`);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(page, 'document.readyState');
    if (state === 'complete') {
      await evaluate(
        page,
        'document.fonts?.ready ? document.fonts.ready.then(() => true) : true',
      );
      await sleep(options.settleMs ?? 250);
      return;
    }
    await sleep(50);
  }
  throw new Error(`Document did not finish loading: ${url}`);
}

export async function setViewport(page, width, height) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 768,
    screenWidth: width,
    screenHeight: height,
  });
}

export async function setReducedMotion(page, reduce) {
  await page.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [
      {
        name: 'prefers-reduced-motion',
        value: reduce ? 'reduce' : 'no-preference',
      },
    ],
  });
}

export async function pressKey(page, key, options = {}) {
  const definitions = {
    Enter: {
      code: 'Enter',
      keyCode: 13,
      text: '\r',
      type: 'keyDown',
    },
    Tab: { code: 'Tab', keyCode: 9, type: 'rawKeyDown' },
  };
  const definition = definitions[key];
  if (!definition) throw new Error(`Unsupported key: ${key}`);
  const modifiers = options.shift ? 8 : 0;
  const common = {
    key,
    code: definition.code,
    modifiers,
    windowsVirtualKeyCode: definition.keyCode,
    nativeVirtualKeyCode: definition.keyCode,
    ...(definition.text
      ? { text: definition.text, unmodifiedText: definition.text }
      : {}),
  };
  await page.send('Input.dispatchKeyEvent', {
    type: definition.type,
    ...common,
  });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
}

export function parseArguments(argv, defaults = {}) {
  const values = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const separator = token.indexOf('=');
    const name = token.slice(2, separator === -1 ? undefined : separator);
    const inlineValue =
      separator === -1 ? undefined : token.slice(separator + 1);
    if (inlineValue !== undefined) {
      values[name] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      values[name] = true;
      continue;
    }
    values[name] = next;
    index += 1;
  }
  return values;
}

export function normalizedBaseURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('--base-url must use http or https.');
  }
  url.hash = '';
  url.search = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

export { sleep };
