import { createHmac } from 'node:crypto';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { z } from 'zod';
import { pilot } from '../src/data/pilot.ts';
import type { Application } from './pilot.ts';
import {
  SecurityConflictError,
  type RateStore,
  type SecurityAction,
} from './pilot-security.ts';

const privateRead = {
  access: 'private' as const,
  useCache: false,
  headers: { 'Accept-Encoding': 'identity' },
};
const privateWrite = {
  access: 'private' as const,
  addRandomSuffix: false,
  contentType: 'application/json',
};
const rateSchema = z.object({
  startedAt: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
});
const claimSchema = z.object({ id: z.uuid() });
const ratePath = (action: SecurityAction) =>
  `pilot-security/${pilot.id}/${action}.json`;

export const rateStore: RateStore = {
  async read(action) {
    const result = await get(ratePath(action), privateRead);
    if (!result) return { state: null, etag: null };
    if (result.statusCode !== 200)
      throw new Error('Security state unavailable');
    return {
      state: rateSchema.parse(await new Response(result.stream).json()),
      etag: result.blob.etag,
    };
  },
  async write(action, state, etag) {
    rateSchema.parse(state);
    try {
      await put(ratePath(action), JSON.stringify(state), {
        ...privateWrite,
        ...(etag
          ? { allowOverwrite: true, ifMatch: etag }
          : { allowOverwrite: false }),
      });
    } catch (error) {
      if (
        error instanceof BlobPreconditionFailedError ||
        (etag === null && (await rateStore.read(action)).etag !== null)
      )
        throw new SecurityConflictError();
      throw error;
    }
  },
};

export function applicationClaimPath(email: string, secret: string) {
  if (secret.length < 32) throw new Error('Deduplication is not configured');
  const digest = createHmac('sha256', secret)
    .update(`${pilot.id}\n${email.trim().toLowerCase()}`)
    .digest('hex');
  return `pilot-dedup/${pilot.id}/${digest}.json`;
}

type DedupStore = {
  readClaim: (path: string) => Promise<{ id: string } | null>;
  createClaim: (path: string, id: string) => Promise<void>;
  readApplication: (id: string) => Promise<Application | null>;
  createApplication: (application: Application) => Promise<void>;
};

// The immutable claim chooses one UUID before writing the application. A crash
// between the two writes is recoverable by a retry, including on another worker.
export function createDeduplicatingSave(
  store: DedupStore,
  secret?: string,
  legacyIds: Record<string, string> = {},
) {
  const legacy = z.record(z.string(), z.uuid()).parse(legacyIds);
  return async (application: Application): Promise<Application> => {
    const path = applicationClaimPath(application.email, secret ?? '');
    let claim = await store.readClaim(path);
    if (!claim) {
      const chosenId = legacy[path] ?? application.id;
      try {
        await store.createClaim(path, chosenId);
        claim = { id: chosenId };
      } catch (error) {
        claim = await store.readClaim(path);
        if (!claim) throw error;
      }
    }
    const matches = (record: Application) => {
      if (
        record.email.trim().toLowerCase() !==
          application.email.trim().toLowerCase() ||
        record.pilotId !== application.pilotId ||
        record.id !== claim.id
      )
        throw new Error('Application identity mismatch');
      return record;
    };
    const existing = await store.readApplication(claim.id);
    if (existing) return matches(existing);
    const chosen = { ...application, id: claim.id };
    try {
      await store.createApplication(chosen);
      return chosen;
    } catch (error) {
      const stored = await store.readApplication(claim.id);
      if (!stored) throw error;
      return matches(stored);
    }
  };
}

export const dedupStore: DedupStore = {
  async readClaim(path) {
    const result = await get(path, privateRead);
    if (!result) return null;
    if (result.statusCode !== 200)
      throw new Error('Application claim unavailable');
    return claimSchema.parse(await new Response(result.stream).json());
  },
  async createClaim(path, id) {
    claimSchema.parse({ id });
    await put(path, JSON.stringify({ id }), {
      ...privateWrite,
      allowOverwrite: false,
    });
  },
  async readApplication(id) {
    z.uuid().parse(id);
    const result = await get(`${pilot.id}/${id}.json`, privateRead);
    if (!result) return null;
    if (result.statusCode !== 200) throw new Error('Application unavailable');
    const record = (await new Response(result.stream).json()) as Application;
    if (
      record.id !== id ||
      record.pilotId !== pilot.id ||
      typeof record.email !== 'string'
    )
      throw new Error('Invalid stored application');
    return record;
  },
  async createApplication(application) {
    z.uuid().parse(application.id);
    await put(
      `${pilot.id}/${application.id}.json`,
      JSON.stringify(application),
      { ...privateWrite, allowOverwrite: false },
    );
  },
};
