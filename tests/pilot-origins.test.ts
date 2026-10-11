import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pilotPreviewOrigins } from '../server/pilot-origins.ts';
import { createPilotHandler } from '../server/pilot.ts';

const environment = {
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'pilot-deployment-team.vercel.app',
  VERCEL_BRANCH_URL: 'pilot-git-review-team.vercel.app',
};

test('accepts submissions from exact deployment and stable branch preview hosts', async () => {
  let saved = 0;
  const handler = createPilotHandler({
    allowedOrigins: pilotPreviewOrigins(environment),
    now: () => new Date('2026-10-10T12:00:00Z'),
    save: async () => {
      saved += 1;
    },
  });
  for (const host of [environment.VERCEL_URL, environment.VERCEL_BRANCH_URL]) {
    const response = await handler(
      new Request(`https://${host}/api/segundo-cerebro`, {
        method: 'POST',
        headers: {
          origin: `https://${host}`,
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: 'QA Origin',
          email: 'origin@example.invalid',
          role: 'student',
          goal: 'projects',
          'tools[]': 'starting',
          budget: '0',
          'availability[]': '15-morning',
          consent: 'yes',
        }),
      }),
    );
    assert.equal(response.status, 201);
  }
  for (const origin of [
    'https://other-team.vercel.app',
    `http://${environment.VERCEL_BRANCH_URL}`,
    `https://${environment.VERCEL_BRANCH_URL}.attacker.example`,
  ]) {
    const response = await handler(
      new Request(
        'https://pilot-deployment-team.vercel.app/api/segundo-cerebro',
        {
          method: 'POST',
          headers: { origin, accept: 'application/json' },
        },
      ),
    );
    assert.equal(response.status, 403);
  }
  assert.equal(saved, 2);
});

test('preview hosts are never allowed by production or development configuration', () => {
  for (const VERCEL_ENV of ['production', 'development', undefined]) {
    assert.deepEqual(pilotPreviewOrigins({ ...environment, VERCEL_ENV }), []);
  }
});

test('accepts only exact Vercel hostnames and deduplicates configured values', () => {
  for (const VERCEL_BRANCH_URL of [
    '*.vercel.app',
    'https://pilot.vercel.app',
    'pilot.vercel.app/path',
    'pilot.vercel.app:443',
    'pilot.vercel.app@attacker.example',
    'other.example',
    ' pilot.vercel.app',
    'pilot.vercel.app.attacker.example',
  ]) {
    assert.deepEqual(
      pilotPreviewOrigins({ ...environment, VERCEL_BRANCH_URL }),
      [`https://${environment.VERCEL_URL}`],
    );
  }
  assert.deepEqual(
    pilotPreviewOrigins({
      ...environment,
      VERCEL_BRANCH_URL: environment.VERCEL_URL.toUpperCase(),
    }),
    [`https://${environment.VERCEL_URL}`],
  );
});
