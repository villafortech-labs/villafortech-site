import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  consumeRateLimit,
  createSecurityCheck,
  SecurityConflictError,
  type RateStore,
  type RateState,
  type SecurityAction,
} from '../server/pilot-security.ts';
import {
  createDeduplicatingSave,
  applicationClaimPath,
} from '../server/pilot-security-store.ts';
import { createPilotHandler, type Application } from '../server/pilot.ts';
import { pilot } from '../src/data/pilot.ts';
import { createPilotAdminHandler } from '../server/pilot-review.ts';

const request = new Request(
  'https://www.villafortech.com/api/segundo-cerebro',
  { headers: { origin: 'https://www.villafortech.com' } },
);
function rateFixture() {
  const records = new Map<SecurityAction, { state: RateState; etag: string }>();
  let writes = 0;
  const store: RateStore = {
    async read(action) {
      return structuredClone(
        records.get(action) ?? { state: null, etag: null },
      );
    },
    async write(action, state, etag) {
      await new Promise((resolve) => setImmediate(resolve));
      if ((records.get(action)?.etag ?? null) !== etag)
        throw new SecurityConflictError();
      records.set(action, {
        state: structuredClone(state),
        etag: String(++writes),
      });
    },
  };
  return { store, writes: () => writes };
}
const validVerification = {
  success: true,
  hostname: 'www.villafortech.com',
  action: 'pilot_apply',
};
function securityFixture(result: unknown = validVerification, status = 200) {
  const rate = rateFixture();
  let calls = 0;
  const check = createSecurityCheck({
    secret: 'unit-test-provider-secret',
    rateStore: rate.store,
    now: () => 1000,
    send: async (_url, init) => {
      calls++;
      const data = JSON.parse(String(init?.body));
      assert.equal(data.response, 'test-challenge');
      assert.equal(data.remoteip, undefined); // Untrusted proxy headers are not used.
      assert.match(data.idempotency_key, /^[a-f0-9-]{36}$/);
      assert.ok(init?.signal);
      return Response.json(result, { status });
    },
  });
  return { check, rate, calls: () => calls };
}
test('requires provider verification, exact hostname and action before consuming a durable allowance', async () => {
  const f = securityFixture();
  assert.equal(await f.check(request, 'test-challenge', 'pilot_apply'), null);
  assert.equal(f.calls(), 1);
  assert.equal(f.rate.writes(), 1);
});
test('rejects missing/oversized tokens and foreign origins before external calls or writes', async () => {
  const f = securityFixture();
  for (const token of ['', 'x'.repeat(2049)])
    assert.equal((await f.check(request, token, 'pilot_apply'))?.status, 403);
  assert.equal(
    (
      await f.check(
        new Request(request.url, {
          headers: { origin: 'https://evil.example' },
        }),
        'test-challenge',
        'pilot_apply',
      )
    )?.status,
    403,
  );
  assert.equal(f.calls(), 0);
  assert.equal(f.rate.writes(), 0);
});
test('rejects failed, expired/replayed, wrong-host and wrong-action tokens without storage', async () => {
  for (const result of [
    { success: false },
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { ...validVerification, hostname: 'www.villafortech.com.evil.example' },
    { ...validVerification, action: 'pilot_admin' },
    { success: true },
  ]) {
    const f = securityFixture(result);
    assert.equal(
      (await f.check(request, 'test-challenge', 'pilot_apply'))?.status,
      403,
    );
    assert.equal(f.rate.writes(), 0);
  }
});
test('missing credentials, dummy keys, invalid provider responses and outages fail closed', async () => {
  for (const secret of [undefined, '', '1x0000000000000000000000000000000AA']) {
    const check = createSecurityCheck({
      secret,
      rateStore: rateFixture().store,
      send: async () => {
        throw new Error('must not call');
      },
    });
    assert.equal(
      (await check(request, 'test-challenge', 'pilot_apply'))?.status,
      503,
    );
  }
  for (const [result, status] of [
    [{}, 200],
    [{ success: false, 'error-codes': ['invalid-input-secret'] }, 200],
    [{}, 500],
  ] as const) {
    const f = securityFixture(result, status);
    assert.equal(
      (await f.check(request, 'test-challenge', 'pilot_apply'))?.status,
      503,
    );
    assert.equal(f.rate.writes(), 0);
  }
  const check = createSecurityCheck({
    secret: 'provider-secret',
    rateStore: rateFixture().store,
    send: async () => {
      throw new Error('secret token timeout');
    },
  });
  const failed = await check(request, 'test-challenge', 'pilot_apply');
  assert.equal(failed?.status, 503);
  assert.ok(!JSON.stringify(failed).includes('secret token'));
});
test('five admin attempts share one budget across concurrent handler instances and reset after one minute', async () => {
  const f = rateFixture();
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      consumeRateLimit(f.store, 'pilot_admin', 1000),
    ),
  );
  assert.equal(results.filter((x) => x === null).length, 5);
  assert.equal(results.filter((x) => x === 60).length, 15);
  assert.equal(f.writes(), 5);
  assert.equal(await consumeRateLimit(f.store, 'pilot_admin', 60999), 1);
  assert.equal(await consumeRateLimit(f.store, 'pilot_admin', 61000), null);
  assert.equal(await consumeRateLimit(f.store, 'pilot_apply', 1000), null);
});
test('verified application budget is 60 per minute and unavailable storage never grants an allowance', async () => {
  const f = rateFixture();
  for (let i = 0; i < 60; i++)
    assert.equal(await consumeRateLimit(f.store, 'pilot_apply', 1000), null);
  assert.equal(await consumeRateLimit(f.store, 'pilot_apply', 1000), 60);
  const check = createSecurityCheck({
    secret: 'provider-secret',
    rateStore: {
      read: async () => {
        throw new Error('private store');
      },
      write: async () => {},
    },
    send: async () => Response.json(validVerification),
  });
  assert.equal(
    (await check(request, 'test-challenge', 'pilot_apply'))?.status,
    503,
  );
});
function application(): Application {
  return {
    id: randomUUID(),
    pilotId: pilot.id,
    submittedAt: '2026-10-10T00:00:00.000Z',
    consentVersion: pilot.consentVersion,
    schemaVersion: pilot.schemaVersion,
    name: 'Prueba',
    email: 'qa@example.invalid',
    whatsapp: '',
    country: '',
    role: 'technology',
    goal: 'projects',
    tools: ['starting'],
    project: '',
    budget: '0',
    availability: ['15-morning'],
    consent: 'yes',
    source: 'direct',
  };
}
const dedupSecret = 'fixture-only-dedup-secret-at-least-32-characters';
function dedupFixture() {
  const claims = new Map<string, { id: string }>();
  const records = new Map<string, Application>();
  let failApplication = false;
  let loseAcknowledgement = false;
  const store = {
    readClaim: async (path: string) => claims.get(path) ?? null,
    createClaim: async (path: string, id: string) => {
      await new Promise((r) => setImmediate(r));
      if (claims.has(path)) throw new Error('exists');
      claims.set(path, { id });
    },
    readApplication: async (id: string) => records.get(id) ?? null,
    createApplication: async (record: Application) => {
      await new Promise((r) => setImmediate(r));
      if (failApplication) throw new Error('unavailable');
      if (records.has(record.id)) throw new Error('exists');
      records.set(record.id, structuredClone(record));
      if (loseAcknowledgement) throw new Error('connection lost after write');
    },
  };
  return {
    claims,
    records,
    store,
    save: createDeduplicatingSave(store, dedupSecret),
    setFailure: (v: boolean) => {
      failApplication = v;
    },
    loseAcknowledgement: () => {
      loseAcknowledgement = true;
    },
  };
}
test('concurrent retries and email case/whitespace variations keep exactly one immutable application', async () => {
  const f = dedupFixture();
  const input = application();
  const records = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      f.save({
        ...input,
        id: randomUUID(),
        email: i % 2 ? ' QA@EXAMPLE.INVALID ' : 'qa@example.invalid',
        name: `Submission ${i}`,
      }),
    ),
  );
  assert.equal(f.claims.size, 1);
  assert.equal(f.records.size, 1);
  assert.equal(new Set(records.map((x) => x.id)).size, 1);
  const again = await createDeduplicatingSave(
    f.store,
    dedupSecret,
  )({ ...input, name: 'Do not overwrite' });
  assert.deepEqual(again, records[0]);
  assert.notEqual(again.name, 'Do not overwrite');
  const path = [...f.claims.keys()][0];
  assert.ok(!path.includes('@'));
  assert.ok(!path.includes('qa'));
});
test('a crash after an email claim and a lost write acknowledgement are safely recoverable', async () => {
  const f = dedupFixture();
  const input = application();
  f.setFailure(true);
  await assert.rejects(f.save(input));
  assert.equal(f.claims.size, 1);
  assert.equal(f.records.size, 0);
  f.setFailure(false);
  f.loseAcknowledgement();
  const saved = await createDeduplicatingSave(
    f.store,
    dedupSecret,
  )({ ...input, id: randomUUID() });
  assert.equal(saved.id, input.id);
  assert.equal(f.records.size, 1);
});
test('legacy claims preserve existing UUIDs and changing email uses a separate claim', async () => {
  const f = dedupFixture();
  const old = application();
  f.records.set(old.id, old);
  f.claims.set(applicationClaimPath(old.email, dedupSecret), { id: old.id });
  assert.equal((await f.save({ ...old, id: randomUUID() })).id, old.id);
  await f.save({ ...old, id: randomUUID(), email: 'another@example.invalid' });
  assert.equal(f.records.size, 2);
  await assert.rejects(
    createDeduplicatingSave(f.store)({ ...old, id: randomUUID() }),
  );
});
test('security rejection returns Retry-After and never persists or sends a notification', async () => {
  let saves = 0;
  let notices = 0;
  const handler = createPilotHandler({
    now: () => new Date('2026-10-10'),
    checkSecurity: async () => ({
      status: 429,
      message: 'Wait',
      retryAfter: 60,
    }),
    save: async () => {
      saves++;
    },
    afterSave: () => {
      notices++;
    },
  });
  const a = application();
  const body = new URLSearchParams(
    Object.entries(a).filter(([, v]) => typeof v === 'string') as [
      string,
      string,
    ][],
  );
  body.append('tools[]', 'starting');
  body.append('availability[]', '15-morning');
  const response = await handler(
    new Request(request.url, {
      method: 'POST',
      headers: {
        origin: 'https://www.villafortech.com',
        accept: 'application/json',
      },
      body,
    }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(saves, 0);
  assert.equal(notices, 0);
});

test('the correct admin password cannot bypass the bot check or attempt budget', async () => {
  const secret = 'test-admin-key-with-at-least-32-characters';
  let storeCalls = 0;
  const handler = createPilotAdminHandler({
    secret,
    checkSecurity: async (_request, token, action) => {
      assert.equal(action, 'pilot_admin');
      assert.equal(token, 'supplied-token');
      return { status: 429, message: 'Wait', retryAfter: 60 };
    },
    readApplication: async () => {
      storeCalls++;
      return null;
    },
    listApplications: async () => {
      storeCalls++;
      return { applications: [], nextCursor: null };
    },
    readReviewState: async () => ({
      state: { version: 1, reviews: {} },
      etag: null,
    }),
    writeReviewState: async () => {
      storeCalls++;
    },
  });
  const response = await handler(
    new Request('https://www.villafortech.com/api/pilot-admin', {
      method: 'POST',
      headers: {
        origin: 'https://www.villafortech.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        secret,
        turnstileToken: 'supplied-token',
      }),
    }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(storeCalls, 0);
});

test('first retry of a historical application materializes a claim without creating another application', async () => {
  const f = dedupFixture();
  const old = application();
  f.records.set(old.id, old);
  const save = createDeduplicatingSave(f.store, dedupSecret, {
    [applicationClaimPath(old.email, dedupSecret)]: old.id,
  });
  const result = await save({
    ...old,
    id: randomUUID(),
    name: 'New submission',
  });
  assert.equal(result.id, old.id);
  assert.equal(result.name, old.name);
  assert.equal(f.claims.size, 1);
  assert.equal(f.records.size, 1);
});
