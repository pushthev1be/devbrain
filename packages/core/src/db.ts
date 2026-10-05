import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { join } from 'path';
import { homedir } from 'os';
import type { Entry, Project } from './types';
import { RECALL_LOG_MAX } from './types';
import * as local from './localStore';

export { getLocalDbPath } from './localStore';

// ── backend selection ─────────────────────────────────────────────────────────

// No MONGODB_URI means local JSON storage, not an error. DevBrain works out of
// the box; pointing it at MongoDB is how you share memory across a team and get
// server-side vector search.
function useLocal(): boolean {
  return !process.env.MONGODB_URI?.trim();
}

export type StorageKind = 'local' | 'mongodb';

export function describeStorage(): { kind: StorageKind; location: string } {
  return useLocal()
    ? { kind: 'local', location: local.getLocalDbPath() }
    : { kind: 'mongodb', location: 'MongoDB (MONGODB_URI)' };
}

// ── connection ────────────────────────────────────────────────────────────────

let client: MongoClient | null = null;
let _db: Db | null = null;

async function getDb(): Promise<Db> {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Add it to ~/.devbrain/.env');
  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
    // The driver default is 30s, which reads as a hang on a typo'd URI or an
    // Atlas IP allowlist miss. Fail fast enough that the CLI can explain itself.
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
  await client.connect();
  _db = client.db('devbrain');
  await _db.collection('projects').createIndex({ path: 1 }, { unique: true });
  await _db.collection('entries').createIndex({ projectId: 1 });
  await _db.collection('entries').createIndex({ createdAt: -1 });
  await _db.collection('processedCommits').createIndex({ hash: 1 }, { unique: true });
  return _db;
}

/**
 * Release the MongoDB connection.
 *
 * An open MongoClient keeps Node's event loop alive, so without this a CLI
 * command prints its output and then hangs forever instead of exiting. Safe to
 * call when no connection was ever opened (the local backend opens none).
 */
export async function closeDb(): Promise<void> {
  const c = client;
  client = null;
  _db = null;
  if (c) await c.close().catch(() => {});
}

function strip<T>(doc: Record<string, unknown>): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc;
  return rest as T;
}

// ── projects ──────────────────────────────────────────────────────────────────

export async function upsertProject(project: Project): Promise<void> {
  if (useLocal()) return local.upsertProject(project);
  const db = await getDb();
  await db.collection('projects').replaceOne({ path: project.path }, project, { upsert: true });
}

export async function getProjectByPath(path: string): Promise<Project | null> {
  if (useLocal()) return local.getProjectByPath(path);
  const db = await getDb();
  const doc = await db.collection('projects').findOne({ path });
  return doc ? strip<Project>(doc as Record<string, unknown>) : null;
}

export async function getAllProjects(): Promise<Project[]> {
  if (useLocal()) return local.getAllProjects();
  const db = await getDb();
  const docs = await db.collection('projects').find({}).sort({ lastSeen: -1 }).toArray();
  return docs.map(d => strip<Project>(d as Record<string, unknown>));
}

// ── entries ───────────────────────────────────────────────────────────────────

export async function insertEntry(entry: Entry): Promise<void> {
  if (useLocal()) return local.insertEntry(entry);
  const db = await getDb();
  await db.collection('entries').insertOne({ ...entry });
}

export async function getEntriesByProject(projectId: string): Promise<Entry[]> {
  if (useLocal()) return local.getEntriesByProject(projectId);
  const db = await getDb();
  const docs = await db.collection('entries').find({ projectId }).sort({ createdAt: -1 }).toArray();
  return docs.map(d => strip<Entry>(d as Record<string, unknown>));
}

export async function getAllEntriesWithProjects(): Promise<(Entry & { project: Project })[]> {
  if (useLocal()) return local.getAllEntriesWithProjects();
  const db = await getDb();
  const docs = await db.collection('entries').aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: 'id',
        as: '_proj',
      },
    },
    {
      $addFields: {
        project: {
          $ifNull: [
            { $arrayElemAt: ['$_proj', 0] },
            { id: '$projectId', name: 'devbrain', path: '', stack: [], createdAt: 0, lastSeen: 0 },
          ],
        },
      },
    },
    { $unset: ['_id', '_proj', 'project._id'] },
  ]).toArray();
  return docs as unknown as (Entry & { project: Project })[];
}

// ── commits ───────────────────────────────────────────────────────────────────

export async function isCommitProcessed(hash: string): Promise<boolean> {
  if (useLocal()) return local.isCommitProcessed(hash);
  const db = await getDb();
  return !!(await db.collection('processedCommits').findOne({ hash }));
}

/** The hashes, of those given, that have not been reviewed yet. One query. */
export async function filterUnprocessedCommits(hashes: string[]): Promise<string[]> {
  if (!hashes.length) return [];
  if (useLocal()) return local.filterUnprocessedCommits(hashes);
  const db = await getDb();
  const done = await db.collection('processedCommits')
    .find({ hash: { $in: hashes } }, { projection: { hash: 1 } }).toArray();
  const seen = new Set(done.map(d => d.hash as string));
  return hashes.filter(h => !seen.has(h));
}

export async function markCommitProcessed(hash: string, projectId: string): Promise<void> {
  if (useLocal()) return local.markCommitProcessed(hash, projectId);
  const db = await getDb();
  await db.collection('processedCommits').updateOne(
    { hash },
    { $setOnInsert: { hash, projectId, processedAt: Date.now() } },
    { upsert: true }
  );
}

// ── retrieval & confidence ────────────────────────────────────────────────────

export async function reinforceEntry(id: string, contentUpdate?: string): Promise<void> {
  if (useLocal()) return local.reinforceEntry(id, contentUpdate);
  const db = await getDb();
  const doc = await db.collection('entries').findOne({ id });
  if (!doc) return;
  // A person explicitly confirmed this entry. That is the only thing that marks
  // an entry confirmed — retrieval is DevBrain reading its own output.
  const reinforced = ((doc.reinforcedCount as number) ?? 0) + 1;
  const confidence = reinforced >= 2 ? 'confirmed' : 'corroborated';
  await db.collection('entries').updateOne(
    { id },
    {
      $set: {
        reinforcedCount: reinforced,
        lastRetrievedAt: Date.now(),
        confidence,
        ...(contentUpdate !== undefined ? { content: contentUpdate } : {}),
      },
    }
  );
}

export async function bumpRetrievalCounts(ids: string[], fromProjectId?: string): Promise<void> {
  if (!ids.length) return;
  if (useLocal()) return local.bumpRetrievalCounts(ids, fromProjectId);
  const db = await getDb();
  const update: Record<string, unknown> = {
    $inc: { retrievalCount: 1 },
    $set: { lastRetrievedAt: Date.now() },
  };
  if (fromProjectId) update.$addToSet = { seenInProjects: fromProjectId };
  await db.collection('entries').updateMany({ id: { $in: ids } }, update);

  // Retrieval no longer promotes confidence.
  //
  // It used to: three retrievals marked an entry "confirmed". But retrieval is
  // DevBrain reading its own output, so a trivial entry that happened to rank
  // well got badged as verified knowledge — a package.json edit reading
  // "confirmed" purely because it was surfaced three times. That is circular, and
  // once a reader notices it they stop trusting every badge.
  //
  // Confidence now only rises on independent evidence:
  //   corroborated — the same knowledge observed in a second project
  //   confirmed    — a human explicitly reinforced it (see reinforceEntry)
  // retrievalCount stays as a popularity signal for ranking, which is what it
  // actually measures.
  await db.collection('entries').updateMany(
    {
      id: { $in: ids },
      confidence: 'observation',
      $expr: { $gte: [{ $size: { $ifNull: ['$seenInProjects', []] } }, 2] },
    },
    { $set: { confidence: 'corroborated' } }
  );
}

/**
 * Record that these entries were matched to a real failure.
 *
 * Separate from bumpRetrievalCounts because the two answer different questions:
 * that one is "how often was this shown", this is "how often did it catch
 * something". Only the second is evidence the entry was worth keeping.
 */
/**
 * Record that these entries were matched to a real failure and handed over.
 *
 * The count alone cannot distinguish an entry that caught nine different
 * failures from one that matched the same flaky command nine times, so the
 * failure text is kept alongside it. Capped with $slice so the log cannot grow
 * without bound on an entry that fires often.
 */
export async function bumpRecallCounts(
  ids: string[],
  context: { query?: string; sessionId?: string } = {},
): Promise<void> {
  if (!ids.length) return;
  if (useLocal()) return local.bumpRecallCounts(ids, context);
  const db = await getDb();
  const event = {
    at: Date.now(),
    query: (context.query ?? '').slice(0, 200),
    ...(context.sessionId ? { sessionId: context.sessionId } : {}),
  };
  await db.collection('entries').updateMany(
    { id: { $in: ids } },
    {
      $inc: { recallCount: 1 },
      $set: { lastRecalledAt: event.at },
      ...(context.query ? { $push: { recalls: { $each: [event], $slice: -RECALL_LOG_MAX } } } : {}),
    } as never,
  );
}

export async function supersedeEntry(oldId: string, newId: string): Promise<void> {
  if (useLocal()) return local.supersedeEntry(oldId, newId);
  const db = await getDb();
  const old = await db.collection('entries').findOne({ id: oldId });
  await db.collection('entries').updateOne(
    { id: oldId },
    { $set: { supersededBy: newId, supersededAt: Date.now() } }
  );
  // Carry the chain's depth onto the replacement: each correction is its own
  // row, so without this a claim revised three times reads as brand new.
  await db.collection('entries').updateOne(
    { id: newId },
    { $set: { supersedes: oldId, revisionCount: ((old?.revisionCount as number) ?? 0) + 1 } }
  );
}

// ── atlas vector search ───────────────────────────────────────────────────────

export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; projectId?: string } = {}
): Promise<(Entry & { project: Project; vectorScore: number })[]> {
  const { topK = 10, projectId } = opts;
  if (useLocal()) return local.vectorSearch(queryEmbedding, opts);
  const db = await getDb();

  const pipeline: object[] = [
    {
      $vectorSearch: {
        index: 'embedding_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: topK * 10,
        limit: topK,
        ...(projectId ? { filter: { projectId } } : {}),
      },
    },
    { $addFields: { vectorScore: { $meta: 'vectorSearchScore' } } },
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: 'id',
        as: '_proj',
      },
    },
    {
      $addFields: {
        project: {
          $ifNull: [
            { $arrayElemAt: ['$_proj', 0] },
            { id: '$projectId', name: 'devbrain', path: '', stack: [], createdAt: 0, lastSeen: 0 },
          ],
        },
      },
    },
    { $unset: ['_id', '_proj', 'project._id'] },
  ];

  const docs = await db.collection('entries').aggregate(pipeline).toArray();
  return docs as unknown as (Entry & { project: Project; vectorScore: number })[];
}

export async function deleteEntry(id: string): Promise<void> {
  if (useLocal()) return local.deleteEntry(id);
  const db = await getDb();
  await db.collection('entries').deleteOne({ id });
}

// ── misc ──────────────────────────────────────────────────────────────────────

export function getDevbrainDir(): string {
  return join(homedir(), '.devbrain');
}
