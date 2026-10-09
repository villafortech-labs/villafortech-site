import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pilot } from '../src/data/pilot.ts';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().max(254),
  whatsapp: z.string().trim().max(40).default(''),
  role: z.string().trim().min(3).max(180),
  project: z.string().trim().min(30).max(700),
  outcome: z.string().trim().min(15).max(350),
  tools: z.string().trim().min(10).max(500),
  materials: z.enum(['ready', 'can-prepare', 'not-yet']),
  availability: z.string().trim().min(10).max(350),
  commitment: z.literal('yes'),
  consent: z.literal('yes'),
  website: z.string().max(0).default(''),
});

export type Application = Omit<z.infer<typeof schema>, 'website'> & {
  id: string;
  pilotId: string;
  submittedAt: string;
  consentVersion: string;
};

type Options = {
  save: (application: Application) => Promise<void>;
  now?: () => Date;
  allowedOrigins?: string[];
};

const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

function reply(request: Request, status: number, message: string, id?: string) {
  if (request.headers.get('accept')?.includes('application/json')) {
    return Response.json(
      { ok: status === 201, message, ...(id ? { id } : {}) },
      { status, headers },
    );
  }
  // Messages are fixed server text; never interpolate submitted values into HTML.
  return new Response(
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aplicación · Villa for Tech</title><body><main><h1>${status === 201 ? 'Aplicación recibida' : 'No se pudo enviar'}</h1><p>${message}</p><p><a href="/segundo-cerebro/">Volver al formulario</a></p></main></body></html>`,
    {
      status,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

export function createPilotHandler({
  save,
  now = () => new Date(),
  allowedOrigins = [],
}: Options) {
  const origins = new Set([
    'https://www.villafortech.com',
    'https://villafortech.com',
    ...allowedOrigins,
  ]);
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response(null, {
        status: 405,
        headers: { ...headers, Allow: 'POST' },
      });
    }
    if (!origins.has(request.headers.get('origin') ?? '')) {
      return reply(
        request,
        403,
        'Abre el formulario desde villafortech.com e inténtalo de nuevo.',
      );
    }
    if (now().getTime() >= Date.parse(pilot.closesAt)) {
      return reply(
        request,
        410,
        'La convocatoria cerró el 11 de octubre a las 18:00, hora de Ecuador. Gracias por tu interés.',
      );
    }
    const contentType = request.headers.get('content-type')?.split(';')[0];
    if (contentType !== 'application/x-www-form-urlencoded') {
      return reply(
        request,
        415,
        'El formato del envío no es válido. Recarga la página e inténtalo de nuevo.',
      );
    }
    const maxBytes = 16_384;
    if (Number(request.headers.get('content-length')) > maxBytes) {
      return reply(
        request,
        413,
        'La respuesta es demasiado larga. Acorta los textos e inténtalo de nuevo.',
      );
    }
    let body: string;
    try {
      const reader = request.body?.getReader();
      if (!reader)
        return reply(request, 400, 'Completa el formulario antes de enviarlo.');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return reply(
            request,
            413,
            'La respuesta es demasiado larga. Acorta los textos e inténtalo de nuevo.',
          );
        }
        chunks.push(value);
      }
      body = Buffer.concat(chunks).toString('utf8');
    } catch {
      return reply(
        request,
        400,
        'No se pudo leer el envío. Inténtalo de nuevo.',
      );
    }
    const result = schema.safeParse(
      Object.fromEntries(new URLSearchParams(body)),
    );
    if (!result.success) {
      return reply(
        request,
        400,
        'Revisa los campos obligatorios, el correo y las dos casillas de confirmación.',
      );
    }
    const { website: _honeypot, ...data } = result.data;
    const application = {
      ...data,
      email: data.email.toLowerCase(),
      id: randomUUID(),
      pilotId: pilot.id,
      submittedAt: now().toISOString(),
      consentVersion: pilot.consentVersion,
    };
    try {
      await save(application);
    } catch {
      // Never log applicant information or report success before durable storage.
      return reply(
        request,
        503,
        'No pudimos guardar tu aplicación. Tus respuestas siguen aquí: espera un momento y vuelve a enviar. Si persiste, escribe a villafortech@gmail.com.',
      );
    }
    return reply(
      request,
      201,
      'Tu aplicación quedó guardada. Si tu caso es seleccionado, te escribiré el lunes 12 de octubre al correo que indicaste. Revisa también spam. Aplicar no garantiza un cupo.',
      application.id,
    );
  };
}
