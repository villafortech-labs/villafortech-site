import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '@vercel/blob';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { readReviewState, writeReviewState } from '../server/pilot-store.ts';
import { getNotificationStates } from '../server/pilot-notifications.ts';

test('mutable Blob reads request identity encoding and preserve a strong ETag for conditional writes', async () => {
  const priorDispatcher = getGlobalDispatcher();
  const priorToken = process.env.BLOB_READ_WRITE_TOKEN;
  const priorOidc = process.env.VERCEL_OIDC_TOKEN;
  const token = 'vercel_blob_rw_offlinecas_fake';
  process.env.BLOB_READ_WRITE_TOKEN = token;
  delete process.env.VERCEL_OIDC_TOKEN;
  const mock = new MockAgent();
  mock.disableNetConnect();
  setGlobalDispatcher(mock);
  try {
    const content = mock.get(
      'https://offlinecas.private.blob.vercel-storage.com',
    );
    const path = 'pilot-admin/segundo-cerebro-2026-10/reviews.json';
    const body = JSON.stringify({ version: 1, reviews: {} });
    // The actual SDK preserves weak validators from compressed responses verbatim.
    content
      .intercept({ path: `/${path}?cache=0`, method: 'GET' })
      .reply(200, body, {
        headers: { etag: 'W/"version-1"', 'content-type': 'application/json' },
      });
    const ordinary = await get(path, {
      access: 'private',
      useCache: false,
      token,
    });
    assert.ok(ordinary && ordinary.statusCode === 200);
    assert.equal(ordinary.blob.etag, 'W/"version-1"');
    await new Response(ordinary.stream).text();

    // The application must request the original representation, not strip W/ itself.
    content
      .intercept({
        path: `/${path}?cache=0`,
        method: 'GET',
        headers: { 'accept-encoding': 'identity' },
      })
      .reply(200, body, {
        headers: { etag: '"version-1"', 'content-type': 'application/json' },
      });
    const snapshot = await readReviewState();
    assert.equal(snapshot.etag, '"version-1"');
    mock
      .get('https://vercel.com')
      .intercept({
        path: `/api/blob/?${new URLSearchParams({ pathname: path })}`,
        method: 'PUT',
        headers: { 'x-if-match': '"version-1"' },
      })
      .reply(
        200,
        {
          url: `https://offlinecas.private.blob.vercel-storage.com/${path}`,
          downloadUrl: `https://offlinecas.private.blob.vercel-storage.com/${path}?download=1`,
          pathname: path,
          contentType: 'application/json',
          contentDisposition: 'inline',
          etag: '"version-2"',
        },
        { headers: { 'content-type': 'application/json' } },
      );
    await writeReviewState(snapshot.state, snapshot.etag);

    const id = 'cf92373a-da7c-4b5a-a36a-dff75377a8d8';
    const noticePath = `pilot-notifications/segundo-cerebro-2026-10/${id}.json`;
    const notification = {
      version: 1,
      applicationId: id,
      status: 'pending',
      updatedAt: '2026-10-10T12:00:00.000Z',
      firstAttemptAt: '2026-10-10T12:00:00.000Z',
      attempts: 0,
      payload: {
        from: 'Villa for Tech <aplicaciones@avisos.villafortech.com>',
        to: ['villafortech@gmail.com'],
        subject: '[PRUEBA] fixture',
        text: 'Fixture',
        html: '<p>Fixture</p>',
      },
    };
    content
      .intercept({
        path: `/${noticePath}?cache=0`,
        method: 'GET',
        headers: { 'accept-encoding': 'identity' },
      })
      .reply(200, JSON.stringify(notification), {
        headers: {
          etag: '"notice-version-1"',
          'content-type': 'application/json',
        },
      });
    const notices = await getNotificationStates([id]);
    assert.equal(notices[id].status, 'pending');
    mock.assertNoPendingInterceptors();
  } finally {
    setGlobalDispatcher(priorDispatcher);
    await mock.close();
    if (priorToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = priorToken;
    if (priorOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = priorOidc;
  }
});
