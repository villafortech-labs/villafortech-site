import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createPilotNotifications,
  NotificationConflictError,
  NotificationStorageError,
  type NotificationRecord,
  type NotificationStore,
} from '../server/pilot-notifications.ts';
import type { StoredApplication } from '../server/pilot-review.ts';

const application: StoredApplication = {
  id: randomUUID(),
  name: '<img src=x onerror=alert(1)>',
  email: 'qa@example.invalid',
  role: 'technology',
  goal: 'code',
  whatsapp: '+000000000',
  budget: '200-plus',
  project: 'Private detailed context excluded from email',
};
function fixture(
  replies: Array<Response | Error> = [Response.json({ id: randomUUID() })],
) {
  const records = new Map<
    string,
    { record: NotificationRecord; version: number }
  >();
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const waits: number[] = [];
  let clock = new Date('2026-10-10T12:00:00Z');
  let settings: { apiKey?: string; reviewUrl?: string } = {
    apiKey: 'unit-test-only',
    reviewUrl: 'https://private.example/segundo-cerebro/revision/',
  };
  let writeCount = 0;
  let failWriteAt = 0;
  const store: NotificationStore = {
    read: async (id) => {
      const saved = records.get(id);
      return saved
        ? { record: structuredClone(saved.record), etag: String(saved.version) }
        : { record: null, etag: null };
    },
    write: async (id, record, etag) => {
      await new Promise((resolve) => setImmediate(resolve));
      writeCount++;
      if (failWriteAt && writeCount === failWriteAt)
        throw new Error('storage secret must not escape');
      const saved = records.get(id);
      if (etag !== (saved ? String(saved.version) : null))
        throw new NotificationConflictError();
      records.set(id, {
        record: structuredClone(record),
        version: (saved?.version ?? 0) + 1,
      });
    },
  };
  const service = createPilotNotifications({
    store,
    config: () => settings,
    now: () => clock,
    sleep: async (ms) => {
      waits.push(ms);
    },
    fetch: async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      const reply = replies.shift();
      if (!reply) throw new Error('No test response');
      if (reply instanceof Error) throw reply;
      return reply;
    },
  });
  return {
    ...service,
    records,
    requests,
    waits,
    store,
    setClock: (value: string) => {
      clock = new Date(value);
    },
    setConfig: (value: typeof settings) => {
      settings = value;
    },
    writes: () => writeCount,
    failWriteAt: (value: number) => {
      failWriteAt = value;
    },
  };
}

test('notification sends only to the owner with escaped HTML, minimal data and one fixed idempotency key', async () => {
  const f = fixture();
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'sent');
  assert.ok(result.messageId);
  assert.equal(f.requests.length, 1);
  assert.equal(f.writes(), 2);
  const { url, init } = f.requests[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(
    new Headers(init.headers).get('idempotency-key'),
    `pilot-application/${application.id}`,
  );
  const payload = JSON.parse(String(init.body));
  assert.deepEqual(payload.to, ['villafortech@gmail.com']);
  assert.equal(
    payload.from,
    'Villa for Tech <aplicaciones@avisos.villafortech.com>',
  );
  assert.equal(payload.subject, '[PRUEBA] Nueva aplicación · Segundo cerebro');
  assert.match(payload.html, /&lt;img/);
  assert.ok(!payload.html.includes('<img'));
  assert.match(payload.text, /Programación \/ tecnología/);
  assert.match(payload.text, /private\.example/);
  assert.ok(!payload.text.includes(application.whatsapp));
  assert.ok(!payload.text.includes(application.project));
  assert.deepEqual(Object.keys(payload).sort(), [
    'from',
    'html',
    'subject',
    'text',
    'to',
  ]);
  assert.ok(init.signal instanceof AbortSignal);
  const states = await f.getNotificationStates([application.id]);
  assert.equal(states[application.id].status, 'sent');
  assert.ok(!('payload' in states[application.id]));
});

test('sent notifications never resend, even after the provider idempotency window', async () => {
  const f = fixture();
  await f.notifyApplication(application);
  f.setClock('2026-10-13T12:00:00Z');
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'sent');
  assert.equal(f.requests.length, 1);
});

test('two concurrent attempts make only one provider request', async () => {
  const f = fixture();
  const results = await Promise.all([
    f.notifyApplication(application),
    f.notifyApplication(application),
  ]);
  assert.ok(results.some((result) => result.status === 'sent'));
  assert.equal(f.requests.length, 1);
  assert.equal(f.records.get(application.id)?.record.status, 'sent');
});

test('429 and 5xx retry twice with stable payload and key, then persist success', async () => {
  const f = fixture([
    new Response('rate-limit details', { status: 429 }),
    new Response('internal details', { status: 503 }),
    Response.json({ id: 'provider-message-id' }),
  ]);
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'sent');
  assert.deepEqual(f.waits, [1_000, 2_000]);
  assert.equal(f.requests.length, 3);
  assert.equal(new Set(f.requests.map((r) => r.init.body)).size, 1);
  assert.equal(
    new Set(
      f.requests.map((r) => new Headers(r.init.headers).get('idempotency-key')),
    ).size,
    1,
  );
  assert.equal(f.records.get(application.id)?.record.attempts, 3);
});

test('exhausted quota records a retryable failure without deleting an application or storing API response details', async () => {
  const before = structuredClone(application);
  const f = fixture(
    Array.from(
      { length: 3 },
      () => new Response('secret response + applicant data', { status: 429 }),
    ),
  );
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'rate_limited');
  assert.equal(result.httpStatus, 429);
  assert.equal(f.requests.length, 3);
  assert.deepEqual(application, before);
  assert.ok(!JSON.stringify(result).includes('secret response'));
  assert.equal(f.records.get(application.id)?.record.uncertainSince, undefined);
});

test('known quota rejection can be retried after 24 hours and reuses the persisted payload despite URL changes', async () => {
  const f = fixture([
    ...Array.from({ length: 3 }, () => new Response(null, { status: 429 })),
    Response.json({ id: 'later-message' }),
  ]);
  await f.notifyApplication(application);
  const initial = f.requests[0].init.body;
  f.setClock('2026-10-12T12:00:00Z');
  f.setConfig({
    apiKey: 'unit-test-only',
    reviewUrl: 'https://different-preview.example/revision/',
  });
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'sent');
  assert.equal(f.requests[3].init.body, initial);
});

test('permanent API errors do not retry and expose only a category and status', async () => {
  for (const status of [400, 401, 403, 409, 422]) {
    const f = fixture([
      new Response('private error must not escape', { status }),
    ]);
    const result = await f.notifyApplication({
      ...application,
      id: randomUUID(),
      email: 'person@applicant.example',
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.httpStatus, status);
    assert.equal(f.requests.length, 1);
    assert.deepEqual(f.waits, []);
    assert.ok(!JSON.stringify(result).includes('private error'));
    assert.equal(
      JSON.parse(String(f.requests[0].init.body)).subject,
      'Nueva aplicación · Segundo cerebro',
    );
  }
});

test('network errors retry twice; an uncertain delivery older than 24 hours is held for checking', async () => {
  const f = fixture(
    Array.from({ length: 3 }, () => new Error('private transport secret')),
  );
  assert.equal((await f.notifyApplication(application)).reason, 'network');
  assert.equal(f.requests.length, 3);
  assert.deepEqual(f.waits, [1_000, 2_000]);
  assert.ok(f.records.get(application.id)?.record.uncertainSince);
  f.setClock('2026-10-12T12:00:00Z');
  const held = await f.notifyApplication(application);
  assert.equal(held.status, 'failed');
  assert.equal(held.reason, 'delivery_unknown');
  assert.equal(f.requests.length, 3);
});

test('failure to save status throws without claiming success; prior claim preserves uncertain delivery', async () => {
  const f = fixture();
  f.failWriteAt(2);
  await assert.rejects(
    () => f.notifyApplication(application),
    NotificationStorageError,
  );
  assert.equal(f.requests.length, 1);
  assert.equal(f.records.get(application.id)?.record.status, 'pending');
  assert.ok(f.records.get(application.id)?.record.uncertainSince);
});

test('configuration requires a secret and secure review URL and missing configuration sends nothing', async () => {
  const f = fixture();
  for (const config of [
    {},
    { apiKey: 'unit-test-only' },
    { reviewUrl: 'https://private.example/' },
    { apiKey: 'unit-test-only', reviewUrl: 'javascript:alert(1)' },
  ]) {
    f.setConfig(config);
    assert.equal(f.notificationsConfigured(), false);
    assert.equal(
      (await f.notifyApplication(application)).status,
      'unconfigured',
    );
  }
  assert.equal(f.requests.length, 0);
  assert.equal(f.records.size, 0);
});

test('notification listing is limited to 50 unique valid IDs with at most four concurrent reads', async () => {
  let active = 0;
  let maxActive = 0;
  let reads = 0;
  const service = createPilotNotifications({
    config: () => ({}),
    store: {
      read: async () => {
        reads++;
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
        return { record: null, etag: null };
      },
      write: async () => {
        throw new Error('must not write');
      },
    },
  });
  const ids = Array.from({ length: 75 }, () => randomUUID());
  assert.deepEqual(await service.getNotificationStates([...ids, ...ids]), {});
  assert.equal(reads, 50);
  assert.equal(maxActive, 4);
});

test('invalid IDs cannot enter storage and malformed success responses are marked uncertain', async () => {
  const f = fixture([Response.json({ unexpected: 'not accepted as success' })]);
  await assert.rejects(() =>
    f.notifyApplication({ ...application, id: '../private' }),
  );
  assert.equal(f.requests.length, 0);
  const result = await f.notifyApplication(application);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'invalid_response');
  assert.ok(f.records.get(application.id)?.record.uncertainSince);
});
