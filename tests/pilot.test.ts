import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPilotHandler, type Application } from '../server/pilot.ts';

const valid = {
  name: 'Prueba técnica',
  email: 'qa@example.invalid',
  role: 'Prueba del formulario',
  tools: 'Drive, notas y ChatGPT',
  budget: '0',
  availability: ['15-morning', '16-afternoon'],
  consent: 'yes',
  source: 'instagram',
  website: '',
};
function request(
  data: typeof valid & { whatsapp?: string } = valid,
  overrides: RequestInit = {},
) {
  const body = new URLSearchParams();
  for (const [key, values] of Object.entries(data)) {
    for (const value of Array.isArray(values) ? values : [values])
      body.append(key === 'availability' ? 'availability[]' : key, value);
  }
  return new Request('https://www.villafortech.com/api/segundo-cerebro', {
    method: 'POST',
    headers: {
      origin: 'https://www.villafortech.com',
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
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
  assert.equal(records[0].consentVersion, '2026-10-10');
  assert.equal(records[0].email, valid.email);
  assert.equal(records[0].whatsapp, '');
  assert.equal(records[0].budget, '0');
  assert.equal(records[0].schemaVersion, 2);
  assert.deepEqual(records[0].availability, valid.availability);
  assert.equal(records[0].source, 'instagram');
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
    { availability: [] },
    { availability: ['13-morning'] },
    { budget: 'invented' },
    { source: 'https://untrusted.example/?personal=data' },
    { website: 'bot' },
    { tools: 'x'.repeat(351) },
    { whatsapp: 'x'.repeat(41) },
  ]) {
    assert.equal((await handler(request({ ...valid, ...patch }))).status, 400);
  }
  assert.equal(records.length, 0);
});
test('optional WhatsApp accepts an empty field and preserves a supplied phone number', async () => {
  const { handler, records } = fixture();
  for (const whatsapp of ['', ' +1 202 555 0147 ']) {
    assert.equal((await handler(request({ ...valid, whatsapp }))).status, 201);
  }
  assert.deepEqual(
    records.map((record) => record.whatsapp),
    ['', '+1 202 555 0147'],
  );
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
  const { handler, records } = fixture('2026-10-14T04:59:00Z');
  assert.equal((await handler(request())).status, 410);
  assert.equal(records.length, 0);
});
test('storage failure returns retryable failure, never false success', async () => {
  const handler = createPilotHandler({
    now: () => new Date('2026-10-10'),
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

test('new registration remains open on Tuesday and accepts every budget without purchase requirements', async () => {
  const { handler, records } = fixture('2026-10-14T04:58:59Z');
  for (const budget of ['0', 'under-20', '20-99', '100-199', '200-plus']) {
    assert.equal((await handler(request({ ...valid, budget }))).status, 201);
  }
  assert.equal(records.length, 5);
});
test('trims contact data and deduplicates date-specific availability without losing another day', async () => {
  const { handler, records } = fixture();
  const response = await handler(
    request({
      ...valid,
      email: ' QA@EXAMPLE.INVALID ',
      availability: ['15-morning', '15-morning', '16-evening'],
    }),
  );
  assert.equal(response.status, 201);
  assert.equal(records[0].email, 'qa@example.invalid');
  assert.deepEqual(records[0].availability, ['15-morning', '16-evening']);
});
