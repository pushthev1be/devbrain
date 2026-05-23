// Creates the devbrain database and collections in Atlas
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

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  await client.connect();
  await client.db('admin').command({ ping: 1 });
  console.log('✓ Connected to Atlas');
  const db = client.db('devbrain');

  // Insert and remove a placeholder to create the collections
  await db.collection('projects').insertOne({ _init: true });
  await db.collection('projects').deleteOne({ _init: true });
  await db.collection('entries').insertOne({ _init: true });
  await db.collection('entries').deleteOne({ _init: true });

  // Create indexes
  await db.collection('projects').createIndex({ path: 1 }, { unique: true });
  await db.collection('entries').createIndex({ projectId: 1 });
  await db.collection('entries').createIndex({ createdAt: -1 });
  await db.collection('processedCommits').createIndex({ hash: 1 }, { unique: true });

  console.log('✓ devbrain database created in Atlas');
  console.log('✓ Collections: projects, entries, processedCommits');
  console.log('✓ Indexes created');
  console.log('\nNow go back to Atlas and create the vector search index on: devbrain → entries');
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
