import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createPilotAdminHandler,
  newsletterStatus,
  ReviewConflictError,
  type StoredApplication,
  type ReviewState,
  type NotificationState,
} from '../server/pilot-review.ts';

const secret = 'unit-test-only-secret-with-more-than-32-characters';
const origin = 'https://private.example';
const url = `${origin}/api/pilot-admin`;
function application(
  email = `${randomUUID()}@applicant.example`,
  schemaVersion = 3,
): StoredApplication {
  return {
    id: randomUUID(),
    name: 'Persona de prueba',
    email,
    schemaVersion,
    role: 'technology',
  };
}
function request(
  data?: unknown,
  cookie?: string,
  overrides: RequestInit = {},
  query = '',
) {
  return new Request(`${url}${query}`, {
    ...(data !== undefined
      ? { method: 'POST', body: JSON.stringify(data) }
      : {}),
    headers: {
      origin,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...overrides,
  });
}
function fixture(applications: StoredApplication[] = [application()]) {
  let clock = new Date('2026-10-10T12:00:00Z');
  let version = 0;
  let state: ReviewState = { version: 1, reviews: {} };
  let failWrites = false;
  let writes = 0;
  let notifyCalls = 0;
  const notifications: Record<string, NotificationState> = {};
  const handler = createPilotAdminHandler({
    checkSecurity: async () => null,
    secret,
    now: () => clock,
    readApplication: async (id) =>
      applications.find((a) => a.id === id) ?? null,
    listApplications: async (cursor) => {
      const start = Number(cursor ?? 0);
      return {
        applications: applications.slice(start, start + 20),
        nextCursor:
          start + 20 < applications.length ? String(start + 20) : null,
      };
    },
    readReviewState: async () => ({
      state: structuredClone(state),
      etag: version ? String(version) : null,
    }),
    writeReviewState: async (nextState, expectedVersion) => {
      // Force competing requests to read the same snapshot before their writes.
      await new Promise((resolve) => setImmediate(resolve));
      if (failWrites) throw new Error('private token and contact details');
      if (expectedVersion !== (version ? String(version) : null))
        throw new ReviewConflictError();
      state = structuredClone(nextState);
      version++;
      writes++;
    },
    notificationsConfigured: () => true,
    readNotifications: async (ids) =>
      Object.fromEntries(
        ids
          .filter((id) => notifications[id])
          .map((id) => [id, notifications[id]]),
      ),
    notify: async (a) => {
      notifyCalls++;
      const notification = { status: 'sent' };
      notifications[a.id] = notification;
      return notification;
    },
  });
  return {
    handler,
    applications,
    state: () => structuredClone(state),
    writes: () => writes,
    notifyCalls: () => notifyCalls,
    setClock: (date: string) => {
      clock = new Date(date);
    },
    failWrites: () => {
      failWrites = true;
    },
  };
}
async function login(handler: ReturnType<typeof createPilotAdminHandler>) {
  const response = await handler(request({ action: 'login', secret }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie.split(';')[0];
}
function review(id: string, status = 'selected', notes = '') {
  return { action: 'review', id, status, notes };
}

test('only explicit consent with recorded evidence qualifies for newsletter', () => {
  const legacy = application();
  const optedIn = {
    ...legacy,
    newsletterConsent: true,
    newsletterConsentAt: '2026-10-11T12:00:00.000Z',
    newsletterConsentVersion: '2026-10-11',
    newsletterConsentText: 'Explicit email opt-in',
  };
  assert.equal(newsletterStatus(legacy), 'not_subscribed');
  assert.equal(
    newsletterStatus({ ...legacy, newsletterConsent: true }),
    'not_subscribed',
  );
  assert.equal(
    newsletterStatus({ ...optedIn, newsletterConsent: 'yes' }),
    'not_subscribed',
  );
  assert.equal(
    newsletterStatus({ ...optedIn, newsletterConsentAt: 'invalid' }),
    'not_subscribed',
  );
  assert.equal(newsletterStatus(optedIn), 'subscribed');
  assert.equal(
    newsletterStatus(optedIn, {
      newsletterUnsubscribedAt: '2026-10-12T00:00:00.000Z',
    }),
    'unsubscribed',
  );
});

test('newsletter withdrawal persists independently of selection and survives concurrent reviews', async () => {
  const optedIn = {
    ...application(),
    newsletterConsent: true,
    newsletterConsentAt: '2026-10-10T10:00:00.000Z',
    newsletterConsentVersion: '2026-10-11',
    newsletterConsentText: 'Explicit email opt-in',
  };
  const f = fixture([optedIn]);
  const action = { action: 'newsletter-unsubscribe', id: optedIn.id };
  assert.equal((await f.handler(request(action))).status, 401);
  const cookie = await login(f.handler);
  const before = await (await f.handler(request(undefined, cookie))).json();
  assert.equal(before.applications[0].newsletterStatus, 'subscribed');
  const results = await Promise.all([
    f.handler(request(action, cookie)),
    f.handler(
      request(review(optedIn.id, 'selected', 'Keep these notes'), cookie),
    ),
  ]);
  assert.ok(results.every((response) => response.status === 200));
  f.setClock('2026-10-10T13:00:00Z');
  assert.equal((await f.handler(request(action, cookie))).status, 200);
  const after = await (await f.handler(request(undefined, cookie))).json();
  assert.equal(after.applications[0].newsletterStatus, 'unsubscribed');
  assert.equal(
    after.applications[0].review.newsletterUnsubscribedAt,
    '2026-10-10T12:00:00.000Z',
  );
  assert.equal(after.applications[0].review.notes, 'Keep these notes');
  assert.equal(after.selectedCount, 1);
  assert.equal(f.notifyCalls(), 0);
  assert.equal(f.applications[0].newsletterConsent, true);
});

test('private data requires a signed session and headers prohibit caching', async () => {
  const f = fixture();
  assert.equal((await f.handler(request())).status, 401);
  assert.equal(
    (await f.handler(request({ action: 'login', secret: 'wrong' }))).status,
    401,
  );
  const response = await f.handler(request({ action: 'login', secret }));
  assert.match(
    response.headers.get('set-cookie') ?? '',
    /HttpOnly; Secure; SameSite=Strict; Path=\/api\/pilot-admin; Max-Age=43200/,
  );
  const cookie = await login(f.handler);
  const result = await f.handler(request(undefined, cookie));
  assert.equal(result.status, 200);
  assert.match(result.headers.get('cache-control') ?? '', /no-store/);
  assert.match(result.headers.get('vary') ?? '', /Cookie/);
  const payload = await result.json();
  assert.equal(payload.applications[0].email, f.applications[0].email);
  assert.equal(payload.applications[0].review.status, 'pending');
  assert.equal(payload.applications[0].notification.status, 'pending');
  assert.equal(payload.selectedCount, 0);
});

test('tampered and expired sessions fail and logout clears the cookie', async () => {
  const f = fixture();
  const cookie = await login(f.handler);
  assert.equal(
    (await f.handler(request(undefined, `${cookie.slice(0, -1)}!`))).status,
    401,
  );
  assert.equal(
    (
      await f.handler(
        request(undefined, cookie.replace(/\d{10}/, '9999999999')),
      )
    ).status,
    401,
  );
  const malformed = cookie.split('.');
  malformed[malformed.length - 1] = 'é'.repeat(43);
  assert.equal(
    (await f.handler(request(undefined, malformed.join('.')))).status,
    401,
  );
  const logout = await f.handler(request({ action: 'logout' }, cookie));
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
  f.setClock('2026-10-11T00:00:00Z');
  assert.equal((await f.handler(request(undefined, cookie))).status, 401);
});

test('all mutations including login reject cross-origin, missing origin and non-JSON requests', async () => {
  const f = fixture();
  const cookie = await login(f.handler);
  for (const action of [
    { action: 'login', secret },
    review(f.applications[0].id),
    { action: 'notify', id: f.applications[0].id },
    { action: 'logout' },
  ]) {
    for (const supplied of ['https://other.example', 'null', '']) {
      const response = await f.handler(
        request(action, cookie, {
          headers: {
            cookie,
            origin: supplied,
            'content-type': 'application/json',
          },
        }),
      );
      assert.equal(response.status, 403);
    }
    assert.equal(
      (
        await f.handler(
          request(action, cookie, {
            headers: { cookie, origin, 'content-type': 'text/plain' },
          }),
        )
      ).status,
      415,
    );
  }
  assert.equal(f.writes(), 0);
  assert.equal(f.notifyCalls(), 0);
});

test('body limit checks actual bytes and malformed actions never persist', async () => {
  const f = fixture();
  const cookie = await login(f.handler);
  assert.equal(
    (await f.handler(request({}, cookie, { body: 'x'.repeat(8_193) }))).status,
    413,
  );
  for (const action of [
    review('../private'),
    review(f.applications[0].id, 'invented'),
    review(f.applications[0].id, 'pending', 'x'.repeat(2_001)),
    { action: 'review', id: f.applications[0].id },
    { ...review(f.applications[0].id), arbitrary: true },
    null,
  ]) {
    assert.equal((await f.handler(request(action, cookie))).status, 400);
  }
  assert.equal(
    (await f.handler(request(review(randomUUID()), cookie))).status,
    404,
  );
  assert.equal(f.writes(), 0);
});

test('review status and notes persist and later GET reflects exactly the saved state', async () => {
  const f = fixture();
  const cookie = await login(f.handler);
  const id = f.applications[0].id;
  for (const status of [
    'shortlist',
    'selected',
    'waitlist',
    'not_selected',
    'pending',
  ]) {
    const response = await f.handler(
      request(review(id, status, '  Proyecto concreto para revisar  '), cookie),
    );
    assert.equal(response.status, 200);
    const payload = await (await f.handler(request(undefined, cookie))).json();
    assert.deepEqual(payload.applications[0].review, {
      status,
      notes: 'Proyecto concreto para revisar',
      updatedAt: '2026-10-10T12:00:00.000Z',
    });
    assert.equal(payload.selectedCount, status === 'selected' ? 1 : 0);
    assert.equal(payload.applications[0].review.emailHash, undefined);
  }
});

test('concurrent selection cannot exceed five, including first-write contention', async () => {
  const f = fixture(Array.from({ length: 8 }, () => application()));
  const cookie = await login(f.handler);
  const responses = await Promise.all(
    f.applications.map((a) => f.handler(request(review(a.id), cookie))),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 5);
  assert.equal(responses.filter((r) => r.status === 409).length, 3);
  const selected = Object.entries(f.state().reviews).filter(
    ([, r]) => r.status === 'selected',
  );
  assert.equal(selected.length, 5);
  const remaining = f.applications.find((a) => !f.state().reviews[a.id]);
  assert.ok(remaining);
  assert.equal(
    (await f.handler(request(review(selected[0][0], 'waitlist'), cookie)))
      .status,
    200,
  );
  assert.equal(
    (await f.handler(request(review(remaining.id), cookie))).status,
    200,
  );
  assert.equal(
    Object.values(f.state().reviews).filter((r) => r.status === 'selected')
      .length,
    5,
  );
});

test('duplicate emails cannot take two places even under concurrent writes', async () => {
  const f = fixture([
    application('Same@Applicant.example'),
    application(' same@applicant.example '),
  ]);
  const cookie = await login(f.handler);
  const responses = await Promise.all(
    f.applications.map((a) => f.handler(request(review(a.id), cookie))),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    Object.values(f.state().reviews).filter((r) => r.status === 'selected')
      .length,
    1,
  );
});

test('synthetic applications remain visible but cannot occupy a selected place', async () => {
  const f = fixture([
    application('qa@example.invalid'),
    application('qa@sub.example.invalid'),
  ]);
  const cookie = await login(f.handler);
  for (const a of f.applications) {
    assert.equal((await f.handler(request(review(a.id), cookie))).status, 409);
    assert.equal(
      (
        await f.handler(
          request(review(a.id, 'not_selected', 'Prueba interna'), cookie),
        )
      ).status,
      200,
    );
  }
  const payload = await (await f.handler(request(undefined, cookie))).json();
  assert.ok(payload.applications.every((a: { isTest: boolean }) => a.isTest));
  assert.equal(payload.selectedCount, 0);
});

test('pagination retains older schema records and selected count is global across pages', async () => {
  const f = fixture(
    Array.from({ length: 21 }, (_, i) => application(undefined, (i % 3) + 1)),
  );
  const cookie = await login(f.handler);
  await f.handler(request(review(f.applications[20].id), cookie));
  const first = await (await f.handler(request(undefined, cookie))).json();
  assert.equal(first.applications.length, 20);
  assert.equal(first.nextCursor, '20');
  assert.equal(first.selectedCount, 1);
  const second = await (
    await f.handler(request(undefined, cookie, {}, '?cursor=20'))
  ).json();
  assert.equal(second.applications.length, 1);
  assert.equal(second.nextCursor, null);
  assert.equal(second.applications[0].review.status, 'selected');
});

test('notification retry is authenticated, reads persisted application and exposes status', async () => {
  const f = fixture();
  const id = f.applications[0].id;
  assert.equal(
    (await f.handler(request({ action: 'notify', id }))).status,
    401,
  );
  const cookie = await login(f.handler);
  assert.equal(
    (await f.handler(request({ action: 'notify', id }, cookie))).status,
    200,
  );
  assert.equal(f.notifyCalls(), 1);
  const result = await (await f.handler(request(undefined, cookie))).json();
  assert.equal(result.applications[0].notification.status, 'sent');
});

test('storage failures cannot report saved changes or disclose error details', async () => {
  const f = fixture();
  const cookie = await login(f.handler);
  f.failWrites();
  const response = await f.handler(
    request(review(f.applications[0].id), cookie),
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('private token'));
  assert.equal(f.writes(), 0);
  assert.deepEqual(f.state().reviews, {});
});

test('weak or missing access configuration disables the API', async () => {
  for (const secretValue of [undefined, 'short']) {
    const handler = createPilotAdminHandler({
      checkSecurity: async () => null,
      secret: secretValue,
      readApplication: async () => null,
      listApplications: async () => {
        throw new Error('must not access data');
      },
      readReviewState: async () => {
        throw new Error('must not access data');
      },
      writeReviewState: async () => {
        throw new Error('must not write data');
      },
    });
    assert.equal((await handler(request())).status, 503);
    assert.equal(
      (await handler(request({ action: 'login', secret: secretValue }))).status,
      503,
    );
  }
});
