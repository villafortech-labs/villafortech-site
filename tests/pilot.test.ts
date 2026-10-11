import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPilotHandler, type Application } from '../server/pilot.ts';
import { newsletter, pilot } from '../src/data/pilot.ts';

const valid = {
  name: 'Prueba técnica',
  email: 'qa@example.invalid',
  role: 'technology',
  goal: 'projects',
  tools: ['google', 'notes', 'chatgpt'],
  budget: '0',
  availability: ['15-morning', '16-afternoon'],
  consent: 'yes',
  source: 'instagram',
  website: '',
};
function request(
  data: typeof valid & {
    whatsapp?: string;
    country?: string;
    project?: string;
    newsletterConsent?: string;
  } = valid,
  overrides: RequestInit = {},
) {
  const body = new URLSearchParams();
  for (const [key, values] of Object.entries(data)) {
    if (values === undefined) continue;
    for (const value of Array.isArray(values) ? values : [values])
      body.append(Array.isArray(values) ? `${key}[]` : key, value);
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
      checkSecurity: async () => null,
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
  assert.equal(records[0].consentVersion, pilot.consentVersion);
  assert.equal(records[0].email, valid.email);
  assert.equal(records[0].whatsapp, '');
  assert.equal(records[0].budget, '0');
  assert.equal(records[0].schemaVersion, 4);
  assert.equal(records[0].newsletterConsent, false);
  assert.equal(records[0].newsletterConsentAt, null);
  assert.deepEqual(records[0].tools, valid.tools);
  assert.equal(records[0].goal, valid.goal);
  assert.equal(records[0].country, '');
  assert.equal(records[0].project, '');
  assert.deepEqual(records[0].availability, valid.availability);
  assert.equal(records[0].source, 'instagram');
  assert.ok(!('website' in records[0]));
  const result = await response.json();
  assert.equal(result.id, records[0].id);
  assert.equal(result.email, undefined);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('newsletter is a separate optional opt-in with server-recorded evidence', async () => {
  const { handler, records } = fixture();
  for (const newsletterConsent of [undefined, '', 'no', 'yes']) {
    const response = await handler(request({ ...valid, newsletterConsent }));
    assert.equal(response.status, 201);
  }
  assert.deepEqual(
    records.map((record) => record.newsletterConsent),
    [false, false, false, true],
  );
  const optedIn = records[3];
  assert.equal(optedIn.newsletterConsentAt, optedIn.submittedAt);
  assert.equal(optedIn.newsletterConsentVersion, newsletter.consentVersion);
  assert.equal(optedIn.newsletterConsentText, newsletter.consentText);
  assert.equal(
    (await handler(request({ ...valid, newsletterConsent: 'true' }))).status,
    400,
  );
  assert.equal(
    (
      await handler(
        request({ ...valid, consent: '', newsletterConsent: 'yes' }),
      )
    ).status,
    400,
  );
  assert.equal(records.length, 4);
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
    { role: 'invented' },
    { goal: '' },
    { tools: [] },
    { tools: ['invented'] },
    { country: 'x'.repeat(81) },
    { project: 'x'.repeat(251) },
    { whatsapp: 'x'.repeat(41) },
  ]) {
    assert.equal((await handler(request({ ...valid, ...patch }))).status, 400);
  }
  assert.equal(records.length, 0);
});
test('preserves autofilled contact data and optional context, deduplicating selected tools', async () => {
  const { handler, records } = fixture();
  assert.equal(
    (
      await handler(
        request({
          ...valid,
          name: ' María José ',
          email: ' QA@EXAMPLE.INVALID ',
          whatsapp: ' +1 (202) 555-0147 ',
          country: ' Ecuador ',
          tools: ['google', 'google', 'chatgpt'],
          project: ' Organizar documentación ',
        }),
      )
    ).status,
    201,
  );
  assert.equal(records[0].name, 'María José');
  assert.equal(records[0].email, 'qa@example.invalid');
  assert.equal(records[0].country, 'Ecuador');
  assert.equal(records[0].project, 'Organizar documentación');
  assert.deepEqual(records[0].tools, ['google', 'chatgpt']);
});
test('a student starting without tools or a budget can apply with all optional fields omitted', async () => {
  const { handler, records } = fixture();
  assert.equal(
    (
      await handler(
        request({
          ...valid,
          role: 'student',
          goal: 'start',
          tools: ['starting'],
          budget: '0',
        }),
      )
    ).status,
    201,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].whatsapp, '');
  assert.equal(records[0].country, '');
  assert.equal(records[0].project, '');
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
    checkSecurity: async () => null,
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
test('HTML responses after a stubbed security check omit applicant text', async () => {
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

test('accepts more than five applications in an isolated handler with a stubbed security check', async () => {
  const { handler, records } = fixture();
  const responses = await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      handler(request({ ...valid, email: `load-${index}@example.invalid` })),
    ),
  );
  assert.ok(responses.every((response) => response.status === 201));
  assert.equal(records.length, 100);
  assert.equal(new Set(records.map((record) => record.id)).size, 100);
});

test('notification scheduling failure does not reject an already saved application', async () => {
  const saved: Application[] = [];
  const handler = createPilotHandler({
    checkSecurity: async () => null,
    now: () => new Date('2026-10-10'),
    save: async (application) => {
      saved.push(application);
    },
    afterSave(application) {
      assert.equal(saved[0].id, application.id);
      throw new Error('Notification service unavailable');
    },
  });
  assert.equal((await handler(request())).status, 201);
  assert.equal(saved.length, 1);
});

test('unsaved applications never schedule a notification', async () => {
  let called = false;
  const handler = createPilotHandler({
    checkSecurity: async () => null,
    now: () => new Date('2026-10-10'),
    save: async () => {
      throw new Error('storage failed');
    },
    afterSave() {
      called = true;
    },
  });
  assert.equal((await handler(request())).status, 503);
  assert.equal(called, false);
});
