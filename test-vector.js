const { MongoClient, ServerApiVersion } = require('mongodb');
const { readFileSync, existsSync } = require('fs');
const os = require('os');
const path = require('path');

// Load ~/.devbrain/.env
const envPath = path.join(os.homedir(), '.devbrain', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=');
    if (k?.trim()) process.env[k.trim()] = v.join('=').trim();
  }
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

async function getEmbedding(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }) }
  );
  const data = await res.json();
  return data.embedding.values;
}

async function main() {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true }
  });
  await client.connect();
  const db = client.db('devbrain');

  // Insert a test project
  await db.collection('projects').replaceOne(
    { id: 'test-project-1' },
    { id: 'test-project-1', name: 'test-project', path: '/test', stack: ['Node.js'], createdAt: Date.now(), lastSeen: Date.now() },
    { upsert: true }
  );

  // Insert test entries with real embeddings
  const testEntries = [
    { title: 'JWT token expires in production but not locally', content: 'Set TOKEN_EXPIRY=86400 explicitly in prod .env — was inheriting undefined which defaults to session-only', type: 'fix', category: 'auth' },
    { title: 'npm install fails on Windows with node-gyp errors', content: 'Run npm install --ignore-scripts to skip native module compilation', type: 'pattern', category: 'build' },
    { title: 'MongoDB connection times out in Docker', content: 'Add --network=host flag or use container name instead of localhost in connection string', type: 'fix', category: 'database' },
  ];

  console.log('Generating embeddings...');
  for (const entry of testEntries) {
    const embedding = await getEmbedding(`${entry.title} ${entry.content}`);
    await db.collection('entries').replaceOne(
      { id: `test-${entry.category}` },
      { id: `test-${entry.category}`, projectId: 'test-project-1', ...entry, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' },
      { upsert: true }
    );
    console.log(`  ✓ saved: ${entry.title.slice(0, 60)}`);
  }

  // Now search
  console.log('\nRunning Atlas Vector Search: "auth token not working in production"');
  const queryEmbedding = await getEmbedding('auth token not working in production');

  const results = await db.collection('entries').aggregate([
    {
      $vectorSearch: {
        index: 'embedding_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 20,
        limit: 3,
      }
    },
    { $addFields: { score: { $meta: 'vectorSearchScore' } } },
    { $project: { title: 1, type: 1, score: 1, _id: 0 } }
  ]).toArray();

  console.log('\nResults:');
  results.forEach((r, i) => console.log(`  ${i+1}. [${r.type}] ${r.title}\n     score: ${r.score.toFixed(4)}`));

  await client.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
