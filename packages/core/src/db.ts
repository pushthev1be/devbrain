import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { join } from 'path';
import { homedir } from 'os';
import type { Entry, Project } from './types';

// ── connection ────────────────────────────────────────────────────────────────

let client: MongoClient | null = null;
let _db: Db | null = null;

async function getDb(): Promise<Db> {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Add it to ~/.devbrain/.env');
  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  });
  await client.connect();
  _db = client.db('devbrain');
  await _db.collection('projects').createIndex({ path: 1 }, { unique: true });
  await _db.collection('entries').createIndex({ projectId: 1 });
  await _db.collection('entries').createIndex({ createdAt: -1 });
  await _db.collection('processedCommits').createIndex({ hash: 1 }, { unique: true });
  return _db;
}

function strip<T>(doc: Record<string, unknown>): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc;
  return rest as T;
}

// ── projects ──────────────────────────────────────────────────────────────────

export async function upsertProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.collection('projects').replaceOne({ path: project.path }, project, { upsert: true });
}

export async function getProjectByPath(path: string): Promise<Project | null> {
  const db = await getDb();
  const doc = await db.collection('projects').findOne({ path });
  return doc ? strip<Project>(doc as Record<string, unknown>) : null;
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  const docs = await db.collection('projects').find({}).sort({ lastSeen: -1 }).toArray();
  return docs.map(d => strip<Project>(d as Record<string, unknown>));
}

// ── entries ───────────────────────────────────────────────────────────────────

export async function insertEntry(entry: Entry): Promise<void> {
  const db = await getDb();
  await db.collection('entries').insertOne({ ...entry });
}

export async function getEntriesByProject(projectId: string): Promise<Entry[]> {
  const db = await getDb();
  const docs = await db.collection('entries').find({ projectId }).sort({ createdAt: -1 }).toArray();
  return docs.map(d => strip<Entry>(d as Record<string, unknown>));
}

export async function getAllEntriesWithProjects(): Promise<(Entry & { project: Project })[]> {
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
    { $match: { '_proj.0': { $exists: true } } },
    { $addFields: { project: { $arrayElemAt: ['$_proj', 0] } } },
    { $unset: ['_id', '_proj', 'project._id'] },
  ]).toArray();
  return docs as unknown as (Entry & { project: Project })[];
}

// ── commits ───────────────────────────────────────────────────────────────────

export async function isCommitProcessed(hash: string): Promise<boolean> {
  const db = await getDb();
  return !!(await db.collection('processedCommits').findOne({ hash }));
}

export async function markCommitProcessed(hash: string, projectId: string): Promise<void> {
  const db = await getDb();
  await db.collection('processedCommits').updateOne(
    { hash },
    { $setOnInsert: { hash, projectId, processedAt: Date.now() } },
    { upsert: true }
  );
}

// ── retrieval & confidence ────────────────────────────────────────────────────

export async function reinforceEntry(id: string, contentUpdate?: string): Promise<void> {
  const db = await getDb();
  const doc = await db.collection('entries').findOne({ id });
  if (!doc) return;
  const count = ((doc.retrievalCount as number) ?? 0) + 1;
  const confidence = count >= 3 ? 'confirmed' : count >= 2 ? 'corroborated' : 'observation';
  await db.collection('entries').updateOne(
    { id },
    {
      $set: {
        retrievalCount: count,
        lastRetrievedAt: Date.now(),
        confidence,
        ...(contentUpdate !== undefined ? { content: contentUpdate } : {}),
      },
    }
  );
}

export async function bumpRetrievalCounts(ids: string[], fromProjectId?: string): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const update: Record<string, unknown> = {
    $inc: { retrievalCount: 1 },
    $set: { lastRetrievedAt: Date.now() },
  };
  if (fromProjectId) update.$addToSet = { seenInProjects: fromProjectId };
  await db.collection('entries').updateMany({ id: { $in: ids } }, update);
}

export async function supersedeEntry(oldId: string, newId: string): Promise<void> {
  const db = await getDb();
  await db.collection('entries').updateOne(
    { id: oldId },
    { $set: { supersededBy: newId, supersededAt: Date.now() } }
  );
}

// ── atlas vector search ───────────────────────────────────────────────────────

export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; projectId?: string } = {}
): Promise<(Entry & { project: Project; vectorScore: number })[]> {
  const { topK = 10, projectId } = opts;
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
    { $match: { '_proj.0': { $exists: true } } },
    { $addFields: { project: { $arrayElemAt: ['$_proj', 0] } } },
    { $unset: ['_id', '_proj', 'project._id'] },
  ];

  const docs = await db.collection('entries').aggregate(pipeline).toArray();
  return docs as unknown as (Entry & { project: Project; vectorScore: number })[];
}

// ── misc ──────────────────────────────────────────────────────────────────────

export function getDevbrainDir(): string {
  return join(homedir(), '.devbrain');
}
