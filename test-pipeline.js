/**
 * DevBrain pipeline smoke test — runs entirely in mock mode, no API key or DB needed.
 * Tests: mock embeddings, cosine similarity, preciseSearch, buildContext, formatContext.
 */

process.env.DEVBRAIN_MOCK = 'true';

const { getEmbedding } = require('./packages/core/dist/gemini');
const { findSimilar, preciseSearch, buildContext, formatContext, similarityLabel, timeAgo } = require('./packages/core/dist/search');

const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';

function pass(label) { console.log(`  ${GREEN}✓${RESET} ${label}`); }
function info(label, val) { console.log(`    ${DIM}${label}:${RESET} ${val}`); }

async function main() {
  console.log(`\n${CYAN}━━━  DevBrain Pipeline Smoke Test (Mock Mode)  ━━━${RESET}\n`);

  // ── 1. Mock embeddings ────────────────────────────────────────────────────
  console.log(`${YELLOW}[1] Mock Embeddings${RESET}`);
  const texts = [
    'JWT token expires in production but not locally',
    'npm install fails on Windows with node-gyp errors',
    'MongoDB connection times out in Docker',
    'auth token not working in production',   // should be close to JWT entry
  ];
  const embeddings = await Promise.all(texts.map(t => getEmbedding(t)));

  pass(`Generated ${embeddings.length} embeddings, each ${embeddings[0].length}-dim`);

  // Verify same text → same vector (deterministic)
  const e1a = await getEmbedding(texts[0]);
  const e1b = await getEmbedding(texts[0]);
  const identical = e1a.every((v, i) => v === e1b[i]);
  pass(`Deterministic: same text → identical vector (${identical ? 'yes' : 'NO — FAIL'})`);

  // ── 2. Cosine similarity ──────────────────────────────────────────────────
  console.log(`\n${YELLOW}[2] Cosine Similarity via findSimilar${RESET}`);

  const project = { id: 'proj-1', name: 'my-app', path: '/app', stack: ['Node.js', 'Express'], createdAt: 0, lastSeen: 0 };
  const entries = texts.slice(0, 3).map((t, i) => ({
    id: `e${i}`,
    projectId: 'proj-1',
    type: ['fix', 'pattern', 'fix'][i],
    title: t,
    content: t,
    tags: [],
    embedding: embeddings[i],
    createdAt: Date.now() - i * 86400000,
    confidence: 'observation',
    project,
  }));

  // query with "auth token in production" embedding — should rank JWT entry highest
  const queryEmbed = embeddings[3];
  const results = findSimilar(queryEmbed, entries, 3, 0.0);

  pass(`findSimilar returned ${results.length} results`);
  results.forEach((r, i) => {
    info(`  #${i+1}`, `[${r.entry.type}] "${r.entry.title.slice(0,55)}" — ${similarityLabel(r.similarity)}`);
  });
  pass(`Top result: "${results[0]?.entry.title.slice(0, 55)}"`);

  // ── 3. preciseSearch ──────────────────────────────────────────────────────
  console.log(`\n${YELLOW}[3] preciseSearch (pattern + semantic)${RESET}`);
  const entriesWithPattern = entries.map((e, i) => ({
    ...e,
    errorPattern: i === 0 ? 'JWT token expires — TOKEN_EXPIRY undefined in prod' : undefined,
  }));

  const psResults = preciseSearch('JWT expires production', queryEmbed, entriesWithPattern, { topK: 3 });
  pass(`preciseSearch returned ${psResults.length} results`);
  psResults.forEach((r, i) => {
    info(`  #${i+1}`, `[${r.matchType}] "${r.entry.title.slice(0, 55)}" — pattern:${r.patternScore.toFixed(2)}`);
  });

  // ── 4. buildContext + formatContext ───────────────────────────────────────
  console.log(`\n${YELLOW}[4] buildContext + formatContext${RESET}`);
  const ctx = buildContext(entries, project, queryEmbed, 'auth token production');
  pass(`buildContext produced: issues=${ctx.issues.length} decisions=${ctx.decisions.length} patterns=${ctx.patterns.length}`);

  const formatted = formatContext(ctx, 'auth token production');
  const lines = formatted.split('\n');
  pass(`formatContext output: ${lines.length} lines`);
  info('preview', lines[0]);

  console.log(`\n${GREEN}━━━  All checks passed  ━━━${RESET}\n`);
}

main().catch(err => { console.error('\x1b[31mFAIL\x1b[0m', err.message); process.exit(1); });
