import { get, list, put, BlobPreconditionFailedError } from '@vercel/blob';
import { z } from 'zod';
import { pilot } from '../src/data/pilot.ts';
import {
  ReviewConflictError,
  reviewStatuses,
  type ReviewState,
  type ReviewSnapshot,
  type StoredApplication,
} from './pilot-review.ts';

const APPLICATION_PREFIX = `${pilot.id}/`;
const REVIEW_PATH = `pilot-admin/${pilot.id}/reviews.json`;
const applicationSchema = z.looseObject({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});
const stateSchema = z.object({
  version: z.literal(1),
  reviews: z.record(
    z.uuid(),
    z.object({
      status: z.enum(reviewStatuses),
      notes: z.string().max(2_000),
      updatedAt: z.string().nullable(),
      emailHash: z.string().regex(/^[a-f0-9]{64}$/),
      newsletterUnsubscribedAt: z.iso.datetime().nullable().optional(),
    }),
  ),
});

export async function readApplication(
  id: string,
): Promise<StoredApplication | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const result = await get(`${APPLICATION_PREFIX}${id}.json`, {
    access: 'private',
  });
  if (!result) return null;
  if (result.statusCode !== 200)
    throw new Error('Unexpected application response');
  const application = applicationSchema.parse(
    await new Response(result.stream).json(),
  );
  if (application.id !== id) throw new Error('Application identity mismatch');
  return application;
}

export async function listApplications(
  cursor?: string,
): Promise<{ applications: StoredApplication[]; nextCursor: string | null }> {
  const result = await list({
    prefix: APPLICATION_PREFIX,
    limit: 20,
    ...(cursor ? { cursor } : {}),
  });
  const ids = result.blobs
    .map((blob) => {
      const relative = blob.pathname.slice(APPLICATION_PREFIX.length);
      if (!relative.endsWith('.json')) return null;
      const id = relative.slice(0, -5);
      return z.uuid().safeParse(id).success ? id : null;
    })
    .filter((id): id is string => Boolean(id));
  const applications: Array<StoredApplication | null> = [];
  for (let start = 0; start < ids.length; start += 4) {
    applications.push(
      ...(await Promise.all(ids.slice(start, start + 4).map(readApplication))),
    );
  }
  return {
    applications: applications.filter(
      (application): application is StoredApplication => application !== null,
    ),
    nextCursor: result.hasMore ? (result.cursor ?? null) : null,
  };
}

export async function readReviewState(): Promise<ReviewSnapshot> {
  const result = await get(REVIEW_PATH, {
    access: 'private',
    useCache: false,
    headers: { 'Accept-Encoding': 'identity' },
  });
  if (!result) return { state: { version: 1, reviews: {} }, etag: null };
  if (result.statusCode !== 200) throw new Error('Unexpected review response');
  return {
    state: stateSchema.parse(await new Response(result.stream).json()),
    etag: result.blob.etag,
  };
}

export async function writeReviewState(
  state: ReviewState,
  etag: string | null,
): Promise<void> {
  stateSchema.parse(state);
  try {
    await put(REVIEW_PATH, JSON.stringify(state), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
      ...(etag
        ? { allowOverwrite: true, ifMatch: etag }
        : { allowOverwrite: false }),
    });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError)
      throw new ReviewConflictError();
    // Concurrent first writes have no ETag yet. Never overwrite the winner.
    if (etag === null && (await readReviewState()).etag !== null)
      throw new ReviewConflictError();
    throw error;
  }
}
