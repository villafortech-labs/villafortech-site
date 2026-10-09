import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPilotHandler, type Application } from '../server/pilot.ts';

const valid = {
  name: 'Prueba técnica',
  email: 'qa@example.invalid',
  whatsapp: '',
  role: 'Prueba del formulario',
  project:
    'Caso ficticio para comprobar que el formulario guarda una aplicación correctamente.',
  outcome: 'Organizar las notas de un proyecto de prueba.',
  tools: 'Documentos y notas de prueba.',
  materials: 'ready',
  availability: 'Martes 13, 10:00–12:00, Ecuador UTC-5.',
  commitment: 'yes',
  consent: 'yes',
  website: '',
};
function request(data = valid, overrides: RequestInit = {}) {
  return new Request('https://www.villafortech.com/api/segundo-cerebro', {
    method: 'POST',
    headers: {
      origin: 'https://www.villafortech.com',
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data),
    ...overrides,
  });
}
function fixture(date = '2026-10-08T12:00:00Z') {
  const records: Application[] = [];
  return {
    records,
    handler: createPilotHandler({
      now: () => new Date(date),
      save: async (record) => {
        records.push(record);
      },
    }),
  };
}
test('persists validated application before confirming, without disclosing answers', async () => {
  const { handler, records } = fixture();
  const response = await handler(request());
  assert.equal(response.status, 201);
  assert.equal(records.length, 1);
  assert.equal(records[0].consentVersion, '2026-10-08');
  assert.equal(records[0].email, valid.email);
  assert.ok(!('website' in records[0]));
  const result = await response.json();
  assert.equal(result.id, records[0].id);
  assert.equal(result.email, undefined);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('invalid email, missing consent, honeypot and oversized fields never persist', async () => {
  const { handler, records } = fixture();
  for (const patch of [
    { email: 'not-an-email' },
    { consent: '' },
    { commitment: '' },
    { website: 'bot' },
    { project: 'x'.repeat(701) },
    { materials: 'invented' },
  ]) {
    assert.equal((await handler(request({ ...valid, ...patch }))).status, 400);
  }
  assert.equal(records.length, 0);
});
test('rejects cross-origin requests and never exposes applications through GET', async () => {
  const { handler, records } = fixture();
  assert.equal(
    (
      await handler(
        request(valid, { headers: { origin: 'https://other.example' } }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handler(
        new Request('https://www.villafortech.com/api/segundo-cerebro'),
      )
    ).status,
    405,
  );
  assert.equal(records.length, 0);
});
test('deadline closes on the server, including exactly at cutoff', async () => {
  const { handler, records } = fixture('2026-10-11T23:00:00Z');
  assert.equal((await handler(request())).status, 410);
  assert.equal(records.length, 0);
});
test('storage failure returns retryable failure, never false success', async () => {
  const handler = createPilotHandler({
    now: () => new Date('2026-10-08'),
    save: async () => {
      throw new Error('private storage detail');
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.ok(!JSON.stringify(result).includes('private storage detail'));
});
test('limits actual body bytes even with no content-length', async () => {
  const { handler, records } = fixture();
  assert.equal(
    (await handler(request(valid, { body: 'x'.repeat(16385) }))).status,
    413,
  );
  assert.equal(records.length, 0);
});
test('native form submission works without JavaScript and escapes applicant text by omission', async () => {
  const { handler, records } = fixture();
  const response = await handler(
    request(
      { ...valid, name: '<script>alert(1)</script>' },
      {
        headers: {
          origin: 'https://www.villafortech.com',
          'content-type': 'application/x-www-form-urlencoded',
        },
      },
    ),
  );
  assert.equal(response.status, 201);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.ok(!(await response.text()).includes('<script>'));
  assert.equal(records.length, 1);
});
