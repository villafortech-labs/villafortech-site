type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
};
const browser = window as Window & { turnstile?: Turnstile };
let loading: Promise<Turnstile> | undefined;
function loadTurnstile(): Promise<Turnstile> {
  if (browser.turnstile) return Promise.resolve(browser.turnstile);
  return (loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () =>
      browser.turnstile
        ? resolve(browser.turnstile)
        : reject(new Error('Recarga la página para comprobar el envío.'));
    script.onerror = () =>
      reject(
        new Error(
          'No se pudo cargar la comprobación antispam. Revisa tu conexión o bloqueador de contenido y recarga la página; conserva tus respuestas.',
        ),
      );
    document.head.append(script);
  }));
}

export function mountPilotSecurity(form: HTMLFormElement) {
  const container = form.querySelector<HTMLElement>('.pilot-security');
  let token = '';
  let widgetId: string | undefined;
  let failed = false;
  const waiters = new Set<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }>();
  const failure = () => {
    token = '';
    failed = true;
    for (const waiter of waiters)
      waiter.reject(
        new Error(
          'No se pudo completar la comprobación antispam. Inténtalo de nuevo.',
        ),
      );
    waiters.clear();
    return true;
  };
  const ready = (async () => {
    if (!container?.dataset.sitekey)
      throw new Error(
        'La comprobación de seguridad todavía no está disponible. Inténtalo más tarde.',
      );
    const api = await loadTurnstile();
    widgetId = api.render(container, {
      sitekey: container.dataset.sitekey,
      action: container.dataset.action,
      appearance: 'interaction-only',
      size: 'flexible',
      language: 'es',
      'response-field': false,
      'refresh-expired': 'auto',
      callback(value: string) {
        token = value;
        failed = false;
        for (const waiter of waiters) waiter.resolve(value);
        waiters.clear();
      },
      'expired-callback': () => {
        token = '';
      },
      'error-callback': failure,
      'timeout-callback': failure,
    });
    return api;
  })();
  // Loading errors are displayed when the visitor submits, without an unhandled rejection.
  void ready.catch(() => {});
  return {
    async getToken(): Promise<string> {
      const api = await ready;
      if (token) return token;
      if (failed && widgetId !== undefined) {
        failed = false;
        api.reset(widgetId);
      }
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          waiters.delete(waiter);
          reject(
            new Error(
              'La comprobación tarda más de lo esperado. Completa el recuadro de seguridad, si aparece, y vuelve a enviar; tus respuestas siguen aquí.',
            ),
          );
        }, 30_000);
        const waiter = {
          resolve: (value: string) => {
            window.clearTimeout(timer);
            resolve(value);
          },
          reject: (error: Error) => {
            window.clearTimeout(timer);
            reject(error);
          },
        };
        waiters.add(waiter);
      });
    },
    reset() {
      token = '';
      failed = false;
      if (widgetId !== undefined) browser.turnstile?.reset(widgetId);
    },
  };
}
