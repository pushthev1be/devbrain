'use strict';

const devbrainCore2 = require('./devbrain-core-2.js');
const require$$1 = require('path');
const require$$2 = require('os');
const require$$0 = require('fs');
const mongodb4 = require('./mongodb-4.js');
const require$$0$1 = require('child_process');
const crypto = require('crypto');

var dist = {};

var db = {};

var redact = {};

var hasRequiredRedact;

function requireRedact () {
	if (hasRequiredRedact) return redact;
	hasRequiredRedact = 1;
	(function (exports) {
		// Credentials never enter memory.
		//
		// What DevBrain stores is mostly error text, and error text is where secrets
		// leak: a failed connection prints its URI with the password in it, a 401 echoes
		// the bearer token, a crashed config loader dumps the .env line. Stored, that
		// text is shown back to every future session; embedded, it is sent to Google;
		// on a shared MONGODB_URI, every teammate reads it. So it is scrubbed on the way
		// in — at the storage boundary and before any text leaves for a model — rather
		// than trusted to whoever wrote the entry.
		//
		// The patterns are deliberately specific. A generic "long random string" rule
		// would eat commit hashes, UUIDs and content hashes, which are exactly the
		// identifiers that make an error findable again. Each rule below matches a
		// shape that is a credential and nothing else, or keeps the surrounding name
		// and redacts only the value.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.REDACTED = void 0;
		exports.redactSecrets = redactSecrets;
		exports.findSecrets = findSecrets;
		exports.REDACTED = '[REDACTED]';
		// Value shapes that are credentials wherever they appear.
		const TOKEN_RULES = [
		    { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, replace: exports.REDACTED },
		    { name: 'anthropic key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, replace: exports.REDACTED },
		    { name: 'openai key', pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g, replace: exports.REDACTED },
		    { name: 'github token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g, replace: exports.REDACTED },
		    { name: 'gitlab token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g, replace: exports.REDACTED },
		    { name: 'aws access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: exports.REDACTED },
		    { name: 'google api key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replace: exports.REDACTED },
		    { name: 'stripe key', pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g, replace: exports.REDACTED },
		    { name: 'stripe webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{24,}/g, replace: exports.REDACTED },
		    { name: 'slack token', pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, replace: exports.REDACTED },
		    { name: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/g, replace: exports.REDACTED },
		    { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replace: exports.REDACTED },
		];
		// Shapes where the name is useful and only the value is secret.
		const CONTEXT_RULES = [
		    // scheme://user:password@host — keep the user and host, which say what failed.
		    { name: 'url credentials', pattern: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):([^\s@/]+)@/gi, replace: (_m, pre) => `${pre}:${exports.REDACTED}@` },
		    // Authorization: Bearer <token> / Basic <creds>
		    { name: 'auth header', pattern: /\b(Bearer|Basic|Token)\s+([A-Za-z0-9._~+/=-]{16,})/g, replace: (_m, scheme) => `${scheme} ${exports.REDACTED}` },
		    // NAME=value / "name": "value" for names that only ever hold secrets. A value
		    // must contain a letter: TOKEN_EXPIRY=86400 is configuration worth keeping.
		    {
		        name: 'secret assignment',
		        pattern: /(["']?\b[A-Za-z0-9_.-]*(?:secret|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|_TOKEN)\b["']?\s*[:=]\s*)(["']?)([^\s"',;}]*[A-Za-z][^\s"',;}]*)\2/gi,
		        replace: (_m, lhs, q, value) => (looksLikeCode(value) ? _m : `${lhs}${q}${exports.REDACTED}${q}`),
		    },
		];
		/**
		 * Entries quote code, and in code the right-hand side of `password:` is usually
		 * a type or a reference, not a password. Redacting `password: string` would
		 * damage the entry and protect nothing.
		 */
		function looksLikeCode(value) {
		    if (value.length < 6 || value === exports.REDACTED)
		        return true;
		    if (/^(string|number|boolean|null|undefined|true|false|none|required|optional|object|unknown|any)$/i.test(value))
		        return true;
		    if (/^[$<{(]|^process\.env\b|^os\.environ\b|^env\b/i.test(value))
		        return true;
		    // req.body.password, config.db.password, this.secret — a dotted reference.
		    if (/^[a-z_][\w]*(\.[a-z_][\w]*)+\)?$/i.test(value))
		        return true;
		    return false;
		}
		const RULES = [...TOKEN_RULES, ...CONTEXT_RULES];
		function redactSecrets(text) {
		    if (!text)
		        return text;
		    let out = text;
		    for (const rule of RULES) {
		        out = out.replace(rule.pattern, rule.replace);
		    }
		    return out;
		}
		/** Names of the rules that matched — for tests and for telling a person what was removed. */
		function findSecrets(text) {
		    return RULES.filter(r => new RegExp(r.pattern.source, r.pattern.flags.replace('g', '')).test(text)).map(r => r.name);
		}
		
	} (redact));
	return redact;
}

var localStore = {};

var search = {};

var gemini = {};

var hasRequiredGemini;

function requireGemini () {
	if (hasRequiredGemini) return gemini;
	hasRequiredGemini = 1;
	(function (exports) {
		// Optional AI. DevBrain captures and recalls with no model at all: the coding
		// agent writes every entry. When Gemini is configured it adds embeddings for
		// semantic search and a few refinements (archetypes, section summaries, query
		// routing); without it each of these quietly does nothing.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.geminiTimeoutMs = exports.RateLimitError = void 0;
		exports.isNoAiBuild = isNoAiBuild;
		exports.hasGeminiCreds = hasGeminiCreds;
		exports.within = within;
		exports.getEmbedding = getEmbedding;
		exports.synthesizeSection = synthesizeSection;
		exports.classifyQuery = classifyQuery;
		exports.autoArchetype = autoArchetype;
		const redact_1 = requireRedact();
		const types_1 = devbrainCore2.requireTypes();
		// Model is overridable via GEMINI_MODEL. Default is gemini-2.5-flash — the current
		// Flash model, available on both the Gemini Developer API and Vertex AI (incl. the
		// `global` location used by AI-Studio-origin projects, where 2.0-flash is unavailable).
		//
		// Read at the point of use, not at module load. `import` statements hoist above
		// the `loadGlobalEnv()` call in the CLI and MCP entry points, so a constant
		// initialised here is bound before ~/.devbrain/.env has been read — and these
		// three were, which meant GEMINI_MODEL, GEMINI_EMBED_MODEL and
		// DEVBRAIN_AI_TIMEOUT_MS set in that file were silently ignored. Nothing in the
		// documented path was affected, because `devbrain setup` never writes them and
		// the keys that matter (GEMINI_API_KEY, MONGODB_URI) are read inside functions
		// already. Still wrong, and invisible in exactly the way a config override
		// should never be.
		const textModel = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
		class RateLimitError extends Error {
		    constructor(retryAfter = 60) {
		        super(`Rate limited — retry in ${retryAfter}s`);
		        this.name = 'RateLimitError';
		        this.retryAfter = retryAfter;
		    }
		}
		exports.RateLimitError = RateLimitError;
		function getClient() {
		    {
		        throw new Error('This build of DevBrain has no model in it. Semantic search, archetypes and ' +
		            'context synthesis are unavailable; matching on wording and exact error text ' +
		            'still works. Install the `devbrain` CLI for the full build.');
		    }
		}
		async function generateText(prompt) {
		    // Bounded for the same reason embedding is: a stalled generation never
		    // settles, and `devbrain search` sat for 36 seconds on a query classification
		    // nobody was waiting for. Every generation path — classifyQuery,
		    // autoArchetype, synthesizeSection — goes through here.
		    const res = await withAbort(signal => getClient().models.generateContent({
		        model: textModel(), contents: (0, redact_1.redactSecrets)(prompt), config: { abortSignal: signal },
		    }), (0, exports.geminiTimeoutMs)(), 'Generation');
		    return (res.text ?? '').trim();
		}
		/**
		 * True when this build has no model in it at all.
		 *
		 * The Claude Code plugin ships as committed single-file bundles, because
		 * installing a plugin runs neither `npm install` nor `tsc`. Anthropic's plugin
		 * directory refuses a plugin folder with any file over 5 MiB, and bundling
		 * `@google/adk` brought in `@mikro-orm/core`, `@google-cloud/storage`,
		 * `@grpc/grpc-js`, `protobufjs` and `esprima` — 14.54 MB in total, so validation
		 * would not even produce a report. Measured: dropping the ADK agent route alone
		 * leaves 3.91 MB, and dropping Gemini with it leaves 2.35 MB.
		 *
		 * So the plugin build omits both, and `scripts/bundle.mjs` sets this flag.
		 * Checked everywhere a model would otherwise be reached, so the absence is
		 * reported rather than discovered: every `getEmbedding` call site catches, which
		 * is exactly how an earlier build "worked" while silently finding nothing after
		 * `gcp-metadata` was marked external by mistake.
		 *
		 * The cost, measured and not hidden: without embeddings a paraphrased query
		 * matched 0 of 5 stored entries where the semantic route matched 4 of 5. Literal
		 * error text still matches, which is the route that fires when a command fails.
		 * `devbrain` from npm keeps both.
		 */
		function isNoAiBuild() {
		    return "1" === '1';
		}
		/** True when a Gemini backend is configured (either Vertex AI or the Developer API). */
		function hasGeminiCreds() {
		    return false;
		}
		/**
		 * How long any single Gemini call may take before it is abandoned.
		 *
		 * A `.catch` does not cover a hang: when the API stalls rather than fails, the
		 * promise never settles and the caller waits for ever. That is what made
		 * `devbrain search` sit there silently with no output and no error, and the
		 * same stall inside a hook would hold up the agent's turn.
		 */
		const geminiTimeoutMs = () => Number(process.env.DEVBRAIN_AI_TIMEOUT_MS) || 8000;
		exports.geminiTimeoutMs = geminiTimeoutMs;
		/**
		 * Run a Gemini call with a deadline that actually cancels it.
		 *
		 * `within` below stops *waiting*; it does not stop the request. That is enough
		 * to unblock a caller but not to let the process exit: an abandoned HTTPS call
		 * holds the event loop open long after the result was printed, which is why
		 * `devbrain search` returned its answer and then sat there until it was killed.
		 * Exiting out from under it is not the answer either — process.exit over an
		 * in-flight request trips a libuv assertion and replaces the output with a
		 * crash.
		 *
		 * So the deadline aborts the request. The SDK takes an AbortSignal on
		 * `config.abortSignal`, so the socket is closed rather than orphaned.
		 */
		async function withAbort(call, ms = (0, exports.geminiTimeoutMs)(), label = 'Gemini') {
		    const controller = new AbortController();
		    let timer;
		    const deadline = new Promise((_, reject) => {
		        timer = setTimeout(() => {
		            controller.abort();
		            reject(new Error(`${label} timed out after ${ms}ms`));
		        }, ms);
		        if (typeof timer.unref === 'function')
		            timer.unref();
		    });
		    try {
		        return await Promise.race([call(controller.signal), deadline]);
		    }
		    finally {
		        clearTimeout(timer);
		    }
		}
		/** Reject rather than hang. The timer is cleared so the process can still exit. */
		function within(work, ms = (0, exports.geminiTimeoutMs)(), label = 'Gemini') {
		    let timer;
		    return Promise.race([
		        work.finally(() => clearTimeout(timer)),
		        new Promise((_, reject) => {
		            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		            // Never hold the event loop open on the timer alone.
		            if (typeof timer.unref === 'function')
		                timer.unref();
		        }),
		    ]);
		}
		async function getEmbedding(text) {
		    // Before the mock check and before any require: in a build with no model, an
		    // empty vector is the honest answer, and callers already treat it as "match on
		    // wording instead".
		    return [];
		}
		async function synthesizeSection(label, entries) {
		    if (process.env.DEVBRAIN_MOCK === 'true') {
		        return "• ALWAYS return cleanups for event subscriptions inside React hooks\n• Standardize off-listeners in statusEmitter calls";
		    }
		    if (entries.length < 2 || !hasGeminiCreds())
		        return null;
		    try {
		        const items = entries
		            .map(e => `[${e.type}] ${e.title}: ${e.content.slice(0, 200)}`)
		            .join('\n');
		        const prompt = `You are DevBrain, a developer knowledge system. Compress these related ${label} entries into ` +
		            `2-4 bullet points capturing the essential pattern, recurring root cause, or key insight. ` +
		            `Each bullet must be specific and actionable. Return ONLY the bullet points, each starting with "•", no headers.\n\n${items}`;
		        return await generateText(prompt);
		    }
		    catch {
		        return null;
		    }
		}
		async function classifyQuery(query) {
		    if (process.env.DEVBRAIN_MOCK === 'true') {
		        const q = query.toLowerCase();
		        if (q.includes('leak') || q.includes('emitter') || q.includes('react')) {
		            return { category: 'performance', errorPattern: 'MaxListenersExceededWarning' };
		        }
		        return { category: 'other' };
		    }
		    const categoryList = types_1.ENTRY_CATEGORIES.join(' | ');
		    try {
		        const prompt = `Classify this developer problem query for search routing. Return ONLY valid JSON:\n` +
		            `{ "category": one of [${categoryList}], "errorPattern": "extracted error text if present, else omit" }\n\n` +
		            `Query: "${query}"`;
		        const text = await generateText(prompt);
		        const match = text.match(/\{[\s\S]*\}/);
		        if (!match)
		            return { category: 'other' };
		        const parsed = JSON.parse(match[0]);
		        return {
		            category: types_1.ENTRY_CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
		            errorPattern: parsed.errorPattern ?? undefined,
		        };
		    }
		    catch {
		        return { category: 'other' };
		    }
		}
		/**
		 * Given a raw title + content, derive the abstract root-cause archetype that makes this
		 * knowledge transferable across projects.  Returns null when not applicable (e.g. stack notes).
		 */
		async function autoArchetype(title, content, type) {
		    if (process.env.DEVBRAIN_MOCK === 'true') {
		        if (type === 'bug' || type === 'fix' || type === 'anti-pattern') {
		            return 'missing cleanup or teardown in async lifecycle';
		        }
		        return null;
		    }
		    if (!hasGeminiCreds())
		        return null;
		    if (!['bug', 'fix', 'anti-pattern', 'lesson'].includes(type))
		        return null;
		    try {
		        const prompt = `Given this developer knowledge entry, write the abstract root-cause archetype in one sentence.\n` +
		            `The archetype must be transferable — it should describe the class of mistake, not this specific instance.\n` +
		            `Examples: "environment config divergence on time-dependent values", "missing guard middleware causes silent runtime failure",\n` +
		            `"unhandled async callback after component unmount or dependency update".\n\n` +
		            `Type: ${type}\nTitle: ${title}\nContent: ${content.slice(0, 400)}\n\n` +
		            `Return ONLY the archetype string, no quotes, no explanation. If not applicable, return: null`;
		        const text = (await generateText(prompt)).trim();
		        if (!text || text.toLowerCase() === 'null')
		            return null;
		        return text.slice(0, 200);
		    }
		    catch {
		        return null;
		    }
		}
		
	} (gemini));
	return gemini;
}

var hasRequiredSearch;

function requireSearch () {
	if (hasRequiredSearch) return search;
	hasRequiredSearch = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.CONFIDENT_MATCH = exports.SEMANTIC_THRESHOLD = exports.AGREEMENT_KEYWORD = exports.AGREEMENT_SEMANTIC = exports.KEYWORD_THRESHOLD = void 0;
		exports.cosineSimilarity = cosineSimilarity;
		exports.findSimilar = findSimilar;
		exports.keywordTerms = keywordTerms;
		exports.keywordScore = keywordScore;
		exports.buildKeywordIndex = buildKeywordIndex;
		exports.bm25Score = bm25Score;
		exports.preciseSearch = preciseSearch;
		exports.similarityLabel = similarityLabel;
		exports.timeAgo = timeAgo;
		exports.buildContext = buildContext;
		exports.compressContext = compressContext;
		exports.clip = clip;
		exports.formatContext = formatContext;
		const types_1 = devbrainCore2.requireTypes();
		const gemini_1 = requireGemini();
		function cosineSimilarity(a, b) {
		    if (a.length !== b.length || a.length === 0)
		        return 0;
		    let dot = 0, magA = 0, magB = 0;
		    for (let i = 0; i < a.length; i++) {
		        dot += a[i] * b[i];
		        magA += a[i] * a[i];
		        magB += b[i] * b[i];
		    }
		    if (magA === 0 || magB === 0)
		        return 0;
		    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
		}
		function findSimilar(queryEmbedding, entries, topK = 5, threshold = 0.65) {
		    return entries
		        .filter(e => e.embedding && e.embedding.length > 0)
		        .map(e => ({
		        entry: e,
		        similarity: cosineSimilarity(queryEmbedding, e.embedding),
		        project: e.project,
		    }))
		        .filter(r => r.similarity >= threshold)
		        .sort((a, b) => b.similarity - a.similarity)
		        .slice(0, topK);
		}
		function normalizeText(text) {
		    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
		}
		/**
		 * Is this string specific enough that finding it inside another one is evidence?
		 *
		 * Several words always are. A single word has to be long to qualify: "eaddrinuse"
		 * or "crashloopbackoff" identify a failure, while "err", "429" and "timeout" occur
		 * in unrelated text constantly. Without this floor an entry whose errorPattern is
		 * "timeout" scores a full pattern match — the heaviest term in the ranking — for
		 * every query containing the word, and outranks the entries that actually answer
		 * it. Short patterns are still scored by word overlap below, which a focused query
		 * can clear; they just stop being treated as certainty.
		 */
		function specificEnough(normalized) {
		    const words = normalized.split(' ').filter(Boolean);
		    return words.length >= 2 || (words[0]?.length ?? 0) >= 8;
		}
		/** A word worth counting as overlap: long enough to carry meaning, and not a stopword. */
		const content = (w) => w.length > 2 && !STOPWORDS.has(w);
		function patternOverlap(query, pattern) {
		    const q = normalizeText(query);
		    const p = normalizeText(pattern);
		    if (!q || !p)
		        return 0;
		    // Containment scores full marks, but only when the contained string carries
		    // enough to identify the failure on its own.
		    const [needle, haystack] = q.length <= p.length ? [q, p] : [p, q];
		    if (haystack.includes(needle) && specificEnough(needle))
		        return 1;
		    // Word overlap, over content words only.
		    //
		    // STOPWORDS matters here more than it looks. This function is also called
		    // against an entry's *title*, and the result is weighted as a pattern match,
		    // so a query phrased as a sentence used to score on "the", "not", "when",
		    // "with", "that" — all longer than two characters, all meaningless. Two
		    // entries that merely shared common words with a question outranked the one
		    // that meant the same thing: measured, the correct entry had the highest
		    // semantic similarity of any candidate (0.719 against 0.647) and came back
		    // third, which unprompted recall drops because it takes only the top two.
		    const qWords = new Set(q.split(' ').filter(content));
		    const pWords = p.split(' ').filter(content);
		    if (qWords.size === 0 || pWords.length === 0)
		        return 0;
		    const matches = pWords.filter(w => qWords.has(w)).length;
		    return matches / Math.max(qWords.size, pWords.length);
		}
		// ── keyword relevance ─────────────────────────────────────────────────────────
		//
		// DevBrain works with no AI service configured: the coding agent writes every
		// entry, so the only thing a model was still needed for was embeddings. Without
		// them, relevance comes from the words themselves. Entries are short and written
		// to be searched — a symptom title, a verbatim error, a few tags — which is the
		// case keyword matching handles well.
		// Words that appear in almost every query or entry and so tell entries apart
		// not at all, including the ones every DevBrain query carries ("fix", "issue").
		const STOPWORDS = new Set(('the and for with that this from into when what why how does did not are was were has have had ' +
		    'any all can could should would will just also than then there their them they you your our its ' +
		    'fix fixes fixed fixing issue issues problem problems bug bugs about after before past again').split(' '));
		/** Content words of a text, lowercased and lightly stemmed. */
		function keywordTerms(text) {
		    return normalizeText(text)
		        .split(' ')
		        .filter(w => w.length > 2 && !STOPWORDS.has(w))
		        .map(w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w));
		}
		/**
		 * Share of the query's content words found in an entry, 0..1. A word in the
		 * title, error pattern or tags counts fully; one only in the body counts less,
		 * since bodies mention many things in passing.
		 */
		function keywordScore(query, e) {
		    const q = [...new Set(keywordTerms(query))];
		    if (!q.length)
		        return 0;
		    const strong = new Set(keywordTerms(`${e.title} ${e.errorPattern ?? ''} ${e.tags.join(' ')}`));
		    const weak = new Set(keywordTerms(e.content ?? ''));
		    const hit = q.reduce((sum, w) => sum + (strong.has(w) ? 1 : weak.has(w) ? 0.6 : 0), 0);
		    return hit / q.length;
		}
		/** Minimum keyword score for a search hit; see preciseSearch. */
		exports.KEYWORD_THRESHOLD = 0.25;
		// ── BM25 ──────────────────────────────────────────────────────────────────────
		//
		// keywordScore above answers "does this entry mention these words", which is what
		// turnReview needs and needs no corpus. Search needs a different question —
		// "which entry is most relevant" — and for that an unweighted share of words is
		// not enough: every word counts the same, so a query matching only `returns` and
		// `query` scores as well as one matching `keepalive`. Measured live: "nginx
		// returns 502 when upstream keepalive is enabled" matched an entry about
		// unrelated queries on exactly those generic words.
		//
		// BM25 weights each term by how rare it is across the corpus (idf), saturates
		// repeated terms, and normalises for length. Generic words fall out on their own
		// rather than by a stopword list that would need maintaining.
		//
		// Scores are normalised to 0..1 against the best a perfect match could score for
		// the same query, so one threshold holds across queries of different lengths.
		const BM25_K1 = 1.2; // term-frequency saturation (Lucene default)
		const BM25_B = 0.75; // length normalisation (Lucene default)
		/** Terms in the fields worth more, and the body, with the body discounted. */
		function weightedTerms(e) {
		    const tf = new Map();
		    const add = (text, weight) => {
		        for (const w of keywordTerms(text))
		            tf.set(w, (tf.get(w) ?? 0) + weight);
		    };
		    add(`${e.title} ${e.errorPattern ?? ''} ${e.tags.join(' ')}`, 1);
		    add(e.content ?? '', 0.6);
		    return tf;
		}
		/** Corpus statistics for BM25. Built once per search over the candidate set. */
		function buildKeywordIndex(entries) {
		    const docs = new Map();
		    const df = new Map();
		    let total = 0;
		    for (const e of entries) {
		        const tf = weightedTerms(e);
		        let len = 0;
		        for (const [, c] of tf)
		            len += c;
		        docs.set(e.id, { tf, len });
		        total += len;
		        for (const w of tf.keys())
		            df.set(w, (df.get(w) ?? 0) + 1);
		    }
		    return { docs, df, n: entries.length, avgLen: entries.length ? total / entries.length : 0 };
		}
		/** BM25 relevance of one entry to a query, normalised to 0..1. */
		function bm25Score(query, entryId, idx) {
		    const doc = idx.docs.get(entryId);
		    if (!doc || !idx.n)
		        return 0;
		    const terms = [...new Set(keywordTerms(query))];
		    if (!terms.length)
		        return 0;
		    let score = 0, ideal = 0;
		    for (const term of terms) {
		        const df = idx.df.get(term) ?? 0;
		        // Standard BM25 idf, always positive so a term in every document scores ~0
		        // rather than going negative.
		        const idf = Math.log(1 + (idx.n - df + 0.5) / (df + 0.5));
		        ideal += idf * (BM25_K1 + 1);
		        const tf = doc.tf.get(term);
		        if (!tf)
		            continue;
		        const norm = 1 - BM25_B + BM25_B * (idx.avgLen ? doc.len / idx.avgLen : 1);
		        score += idf * (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * norm);
		    }
		    // Normalizing by the best score this query could get against any document puts
		    // the result in 0..1 — the share of the query's weight that was matched — so a
		    // fixed threshold does not drift as the corpus grows. The cost: idf is in both
		    // the sum and the divisor, so it reweights terms against each other but leaves
		    // the absolute level alone, and a one-word query of a very common word can
		    // still score high. An idf-preserving divisor was measured against this corpus
		    // and separated true hits from unrelated queries worse (8/30 vs 10/30 kept at
		    // zero false answers), so the coverage reading stays.
		    return ideal > 0 ? score / ideal : 0;
		}
		/**
		 * Agreement gate: a weaker signal from both retrievers is better evidence than a
		 * strong one from either alone.
		 *
		 * Fixed single thresholds force a choice between admitting noise and dropping
		 * real hits. Requiring two independent signals to agree lets each be set lower
		 * without readmitting the unrelated-query matches, since noise rarely scores on
		 * both wording and meaning at once.
		 *
		 * Measured by sweeping both against the evaluation set — 30 queries with a known
		 * answer and 8 about problems never recorded: 0.60/0.12 recovers every
		 * paraphrase the single threshold missed while still answering none of the eight
		 * problems that were never recorded. Lowering SEMANTIC_THRESHOLD to 0.60 instead
		 * admits one of them, so what holds the line is the pairing, not the lower floor.
		 */
		exports.AGREEMENT_SEMANTIC = 0.60;
		exports.AGREEMENT_KEYWORD = 0.12;
		/**
		 * Minimum cosine similarity for an entry to count as relevant.
		 *
		 * Measured against the real store (30 queries plus 8 drawn from problems never
		 * recorded): unrelated queries peak at 0.619, true hits bottom out at 0.626.
		 * Any two technical texts sit around 0.55-0.62, so the previous 0.45 was below
		 * the noise — every one of the 8 unrelated queries came back with a confident
		 * irrelevant entry (kubernetes CrashLoopBackOff matched "Markdown files become
		 * stale"). An agent that searches an unfamiliar error then reasons from false
		 * prior experience, which is worse than an empty result.
		 *
		 * Raising it improves precision and recall together, because the low floor was
		 * letting noise outrank correct entries:
		 *
		 *   0.45   rank-1 70%   top-3 87%   answered 8/8 unrelated queries
		 *   0.60   rank-1 83%   top-3 97%   answered 1/8
		 *   0.62   rank-1 80%   top-3 93%   answered 0/8
		 *   0.70   rank-1 67%   top-3 67%   answered 0/8
		 *
		 * The separating gap is 0.007 wide on this sample — re-measure as the corpus
		 * grows rather than treating this as settled.
		 */
		exports.SEMANTIC_THRESHOLD = 0.62;
		/**
		 * Above this, a hit is worth presenting as prior experience rather than as a
		 * candidate to go and read.
		 *
		 * SEMANTIC_THRESHOLD decides what is worth returning at all; this decides what
		 * is worth believing. The gap between them is where search is useful but not
		 * trustworthy, and saying so is the whole point: measured on a real store, an
		 * error it had never seen came back at 0.63 while a correct hit on a different
		 * query scored 0.64, and every hit at or above 0.70 was right.
		 */
		exports.CONFIDENT_MATCH = 0.70;
		function preciseSearch(queryText, queryEmbedding, entries, opts = {}) {
		    const { category, topK = 8, threshold = exports.SEMANTIC_THRESHOLD, projectId } = opts;
		    const results = [];
		    const live = entries.filter(e => !e.supersededBy);
		    // Corpus statistics come from the candidate set, so idf reflects what is
		    // actually being searched.
		    const index = buildKeywordIndex(live);
		    for (const e of live) {
		        // Two independent signals. An entry with no embedding, or a query with none
		        // because no AI is configured, still scores lexically rather than being
		        // unfindable.
		        const byVector = queryEmbedding.length > 0 && !!e.embedding?.length;
		        const semantic = byVector ? cosineSimilarity(queryEmbedding, e.embedding) : 0;
		        const lexical = bm25Score(queryText, e.id, index);
		        // Containment, not relevance — see the note on the gate below.
		        const contains = keywordScore(queryText, e);
		        const patternScore = e.errorPattern ? patternOverlap(queryText, e.errorPattern) : 0;
		        const titleScore = patternOverlap(queryText, e.title);
		        const categoryMatch = !!category && e.category === category;
		        const bestPattern = Math.max(patternScore, titleScore * 0.6);
		        // Keep on any strong signal, or on two weaker ones agreeing. Noise rarely
		        // scores on both wording and meaning at once, so agreement admits real hits
		        // that neither threshold would pass alone without readmitting unrelated ones.
		        //
		        // BM25 ranks well but cannot gate at this corpus size: measured over 59
		        // entries its scores for correct hits (median 0.141) overlap the best score
		        // for a query about a problem never recorded (max 0.271), and four correct
		        // hits score 0 because the query shares no word with the entry. idf needs
		        // more documents than this to separate them. So the no-AI gate stays on
		        // containment — the share of query words present — which measured 52% top-3
		        // against BM25's 10%. Revisit once the corpus is into the hundreds.
		        const strongSemantic = byVector && semantic >= threshold;
		        const strongLexical = !byVector && contains >= exports.KEYWORD_THRESHOLD;
		        const agreement = byVector && semantic >= exports.AGREEMENT_SEMANTIC && lexical >= exports.AGREEMENT_KEYWORD;
		        if (!strongSemantic && !strongLexical && !agreement && bestPattern < 0.25 && !categoryMatch)
		            continue;
		        results.push({
		            entry: e,
		            project: e.project,
		            // Report whichever signal is driving the match, so callers that show a
		            // match percentage show the one that found it.
		            similarity: byVector ? semantic : lexical,
		            patternScore: bestPattern,
		            errorScore: patternScore,
		            titleScore,
		            categoryMatch,
		            matchType: bestPattern >= 0.5 ? 'pattern' : 'semantic',
		            sameProject: !!projectId && e.projectId === projectId,
		            lexical,
		        });
		    }
		    // Rank: pattern matches first, then combined score — with same-repo results
		    // ahead of equally-scoring ones from elsewhere.
		    //
		    // Without this term a Cloud Run entry from another repo came back level with a
		    // same-repo hit for a same-repo query. Knowledge does transfer across projects,
		    // but "this happened here" should outrank "this happened somewhere" at equal
		    // relevance. The boost is small enough that a markedly better cross-project
		    // match still wins.
		    // Lexical relevance is its own term rather than folded into `similarity`, so
		    // an entry that matches on both wording and meaning outranks one that matches
		    // on either — the same agreement idea that gates admission, applied to order.
		    //
		    // errorScore and titleScore are weighted apart, and that is the point. They
		    // used to be one term, `max(errorScore, titleScore * 0.6)`, paid 0.45 — so a
		    // query carrying no error text was ranked mostly on title word overlap at an
		    // effective 0.27, against semantic's 0.30. Measured on the query "the command
		    // line tool dies with an unhelpful message when no API key is configured":
		    // the correct entry had the highest semantic similarity of any candidate,
		    // 0.719 against 0.647, and came back third, because two entries that merely
		    // shared the words "line" and "message" with the question were paid as though
		    // their stored error text had matched. Unprompted recall takes the top two,
		    // so third is dropped entirely.
		    //
		    // Title overlap is a lexical signal, so it is paid like one, at BM25's 0.15.
		    // Real error-text overlap keeps the 0.45: that one is the strongest evidence
		    // there is, and it is what `devbrain search "<exact error>"` runs on.
		    const score = (r) => r.errorScore * 0.45 + r.titleScore * 0.15 + r.similarity * 0.30 + r.lexical * 0.15
		        + (r.categoryMatch ? 0.12 : 0) + (r.sameProject ? 0.10 : 0);
		    results.sort((a, b) => score(b) - score(a));
		    return results.slice(0, topK);
		}
		/**
		 * How a result matched, in words rather than a percentage.
		 *
		 * It used to print one, and rounded it up: 0.82 was shown as "90% match", 0.65
		 * as "70%". Beyond flattering the number, a percentage invites a comparison the
		 * score cannot support — on the evaluation set unrelated queries peak at 0.619
		 * and true hits bottom out at 0.626, so the band that decides relevance is
		 * 0.007 wide. Reading a list where the right answer scored 64 and a
		 * coincidental one scored 63, a reader reasonably concludes they are close to
		 * equally good. They are not comparable at that resolution at all.
		 *
		 * Three bands, each wider than the noise, and no digits to over-read. The
		 * ordering is still meaningful; the distances are not.
		 */
		function similarityLabel(score) {
		    if (score >= 0.82)
		        return 'very close';
		    if (score >= 0.70)
		        return 'close';
		    return 'related';
		}
		function timeAgo(timestamp) {
		    const diff = Date.now() - timestamp;
		    const mins = Math.floor(diff / 60000);
		    const hours = Math.floor(diff / 3600000);
		    const days = Math.floor(diff / 86400000);
		    const weeks = Math.floor(days / 7);
		    const months = Math.floor(days / 30);
		    if (mins < 60)
		        return `${mins}m ago`;
		    if (hours < 24)
		        return `${hours}h ago`;
		    if (days < 7)
		        return `${days}d ago`;
		    if (weeks < 5)
		        return `${weeks}w ago`;
		    return `${months}mo ago`;
		}
		function buildContext(all, currentProject, queryEmbedding, queryText, queryCategory) {
		    const now = Date.now();
		    const maxAge = 365 * 24 * 60 * 60 * 1000;
		    const currentStack = currentProject?.stack ?? [];
		    const scored = all.map(e => {
		        let semantic = 0;
		        if (queryEmbedding && e.embedding && e.embedding.length > 0) {
		            semantic = cosineSimilarity(queryEmbedding, e.embedding);
		        }
		        else if (!queryEmbedding) {
		            // no query: same-project entries rank higher by default
		            semantic = e.projectId === currentProject?.id ? 0.8 : 0.35;
		            // A query with no embedding still says what the task is about. Blend in
		            // keyword relevance so the briefing leans toward it.
		            if (queryText?.trim())
		                semantic = semantic * 0.5 + keywordScore(queryText, e) * 0.5;
		        }
		        const recency = Math.max(0, 1 - (now - e.createdAt) / maxAge);
		        // with a query: only boost same-project entries that are semantically relevant
		        // without a query: always boost same-project entries
		        const sameProj = (e.projectId === currentProject?.id && (semantic > 0.72 || !queryEmbedding)) ? 1 : 0;
		        const sameStack = currentStack.length > 0 && e.project.stack.some(s => currentStack.includes(s)) ? 1 : 0;
		        const usage = Math.min((e.retrievalCount ?? 0) / 20, 1);
		        const confidenceScore = e.confidence === 'confirmed' ? 1 : e.confidence === 'corroborated' ? 0.5 : 0;
		        const categoryBoost = queryCategory && e.category === queryCategory ? 1 : 0;
		        const patternBoost = queryText && e.errorPattern ? patternOverlap(queryText, e.errorPattern) : 0;
		        const crossProjectBoost = (e.seenInProjects?.length ?? 0) >= 2 ? 1 : 0;
		        const score = semantic * 0.45 + recency * 0.10 + sameProj * 0.10 + sameStack * 0.08 + usage * 0.05 + confidenceScore * 0.05 + categoryBoost * 0.07 + patternBoost * 0.05 + crossProjectBoost * 0.05;
		        return { entry: e, project: e.project, score, semantic };
		    });
		    const relevant = queryEmbedding
		        ? scored.filter(r => !r.entry.embedding || r.semantic >= exports.SEMANTIC_THRESHOLD)
		        : scored;
		    relevant.sort((a, b) => b.score - a.score);
		    function dedupe(list, limit) {
		        const out = [];
		        for (const item of list) {
		            if (out.length >= limit)
		                break;
		            const isDupe = out.some(s => s.entry.embedding && item.entry.embedding &&
		                cosineSimilarity(s.entry.embedding, item.entry.embedding) > 0.92);
		            if (!isDupe)
		                out.push(item);
		        }
		        return out.map(({ entry, project, score }) => ({ entry, project, score }));
		    }
		    const active = relevant.filter(r => !r.entry.supersededBy);
		    const superseded = relevant.filter(r => r.entry.supersededBy && r.entry.type === 'decision');
		    // cross-project: seen in 2+ projects, not project-specific types
		    const crossProjectEligible = active.filter(r => (r.entry.seenInProjects?.length ?? 0) >= 2 &&
		        r.entry.type !== 'stack' && r.entry.type !== 'note' && r.entry.type !== 'image');
		    // Route by the registry rather than by hand-written type lists. Previously
		    // `note` and `solution` matched no branch at all, so those entries were stored
		    // and then never shown — `devbrain note "..."` without a prefix vanished.
		    const inSection = (name, limit) => dedupe(active.filter(r => (0, types_1.sectionFor)(r.entry.type) === name), limit);
		    return {
		        crossProjectPatterns: crossProjectEligible.length > 0 ? dedupe(crossProjectEligible, 5) : undefined,
		        issues: inSection('issues', 5),
		        decisions: inSection('decisions', 5),
		        architecture: inSection('architecture', 4),
		        patterns: inSection('patterns', 5),
		        antiPatterns: inSection('antiPatterns', 4),
		        stacks: inSection('stack', 3),
		        notes: inSection('notes', 4),
		        supersededDecisions: superseded.length > 0 ? dedupe(superseded, 3) : undefined,
		        currentProject,
		    };
		}
		async function compressContext(ctx) {
		    const [issues, decisions, patterns, antiPatterns] = await Promise.all([
		        ctx.issues.length >= 2
		            ? (0, gemini_1.synthesizeSection)('issues and fixes', ctx.issues.map(r => r.entry))
		            : Promise.resolve(null),
		        ctx.decisions.length >= 2
		            ? (0, gemini_1.synthesizeSection)('architecture decisions', ctx.decisions.map(r => r.entry))
		            : Promise.resolve(null),
		        ctx.patterns.length >= 2
		            ? (0, gemini_1.synthesizeSection)('patterns and lessons', ctx.patterns.map(r => r.entry))
		            : Promise.resolve(null),
		        ctx.antiPatterns.length >= 2
		            ? (0, gemini_1.synthesizeSection)('anti-patterns and known failure modes', ctx.antiPatterns.map(r => r.entry))
		            : Promise.resolve(null),
		    ]);
		    return {
		        ...ctx,
		        synthesis: {
		            issues: issues ?? undefined,
		            decisions: decisions ?? undefined,
		            patterns: patterns ?? undefined,
		            antiPatterns: antiPatterns ?? undefined,
		        },
		    };
		}
		/** Trim to a budget on a word boundary, so an agent never reads a half word. */
		function clip(text, max) {
		    const t = text.replace(/\s+/g, ' ').trim();
		    if (t.length <= max)
		        return t;
		    const cut = t.slice(0, max);
		    return cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max * 0.6))).replace(/[\s,;:—-]+$/, '') + '…';
		}
		/**
		 * One entry, rendered for an agent that has to act on it.
		 *
		 * Context used to carry the title plus 120 characters of the solution, and left
		 * out errorPattern and causeArchetype entirely — even though errorPattern is
		 * what makes "I am seeing this exact error" match a past fix, and is the field
		 * the ranker already leans on. An agent could tell that something similar had
		 * happened before, but not what to do about it.
		 */
		function entryLines(r, contentBudget, opts = {}) {
		    const out = [];
		    const e = r.entry;
		    if (e.content && e.content !== e.title)
		        out.push(`   → ${clip(e.content, contentBudget)}`);
		    if (opts.evidence && e.errorPattern)
		        out.push(`   error: ${clip(e.errorPattern, 200)}`);
		    if (opts.evidence && e.causeArchetype)
		        out.push(`   root cause: ${clip(e.causeArchetype, 160)}`);
		    if (e.tags.length)
		        out.push(`   tags: ${e.tags.slice(0, 6).join(', ')}`);
		    return out;
		}
		function formatContext(ctx, query) {
		    const projectName = ctx.currentProject?.name ?? 'DevBrain';
		    const total = ctx.issues.length + ctx.decisions.length + ctx.architecture.length
		        + ctx.patterns.length + ctx.antiPatterns.length + ctx.stacks.length + ctx.notes.length;
		    if (total === 0 && !ctx.crossProjectPatterns?.length) {
		        return `# DevBrain Context — ${projectName}\n\nNo relevant knowledge found${query ? ` for "${query}"` : ''}.`;
		    }
		    const lines = [];
		    lines.push(`# DevBrain Context — ${projectName}${query ? ` — "${query}"` : ''}`);
		    lines.push('');
		    if (ctx.crossProjectPatterns && ctx.crossProjectPatterns.length > 0) {
		        lines.push('## Cross-Project Patterns');
		        ctx.crossProjectPatterns.forEach(r => {
		            const projects = r.entry.seenInProjects?.length ?? 0;
		            const badge = projects >= 2 ? ` [×${projects} projects]` : '';
		            lines.push(`- ${r.entry.title}${badge}`);
		            if (r.entry.causeArchetype)
		                lines.push(`  archetype: ${r.entry.causeArchetype}`);
		            if (r.entry.content && r.entry.content !== r.entry.title) {
		                lines.push(`  → ${clip(r.entry.content, 400)}`);
		            }
		        });
		        lines.push('');
		    }
		    if (ctx.issues.length > 0) {
		        lines.push('## Past Issues & Fixes');
		        if (ctx.synthesis?.issues) {
		            lines.push(ctx.synthesis.issues);
		        }
		        else {
		            // Issues carry the most actionable detail, so they get the largest budget
		            // and the evidence fields an agent needs to match and apply a past fix.
		            ctx.issues.forEach((r, i) => {
		                lines.push(`${i + 1}. [${(0, types_1.normalizeType)(r.entry.type)}] ${r.entry.title}`);
		                lines.push(`   ${r.project.name} · ${timeAgo(r.entry.createdAt)}`);
		                lines.push(...entryLines(r, 700, { evidence: true }));
		            });
		        }
		        lines.push('');
		    }
		    if (ctx.decisions.length > 0) {
		        lines.push('## Architecture Decisions');
		        if (ctx.synthesis?.decisions) {
		            lines.push(ctx.synthesis.decisions);
		        }
		        else {
		            ctx.decisions.forEach(r => {
		                lines.push(`- ${r.entry.title}`);
		                if (r.entry.content && r.entry.content !== r.entry.title) {
		                    lines.push(`  → ${clip(r.entry.content, 400)}`);
		                }
		            });
		        }
		        lines.push('');
		    }
		    if (ctx.architecture.length > 0) {
		        lines.push('## Architecture');
		        ctx.architecture.forEach(r => {
		            lines.push(`- ${r.entry.title}`);
		            if (r.entry.content && r.entry.content !== r.entry.title) {
		                lines.push(`  → ${clip(r.entry.content, 400)}`);
		            }
		        });
		        lines.push('');
		    }
		    if (ctx.patterns.length > 0) {
		        lines.push('## Patterns & Lessons');
		        if (ctx.synthesis?.patterns) {
		            lines.push(ctx.synthesis.patterns);
		        }
		        else {
		            ctx.patterns.forEach(r => {
		                lines.push(`- ${r.entry.title}`);
		                if (r.entry.content && r.entry.content !== r.entry.title) {
		                    lines.push(`  → ${clip(r.entry.content, 400)}`);
		                }
		            });
		        }
		        lines.push('');
		    }
		    if (ctx.antiPatterns.length > 0) {
		        lines.push('## Anti-Patterns (avoid these)');
		        if (ctx.synthesis?.antiPatterns) {
		            lines.push(ctx.synthesis.antiPatterns);
		        }
		        else {
		            ctx.antiPatterns.forEach(r => {
		                lines.push(`- ${r.entry.title}`);
		                if (r.entry.content && r.entry.content !== r.entry.title) {
		                    lines.push(`  → ${clip(r.entry.content, 400)}`);
		                }
		            });
		        }
		        lines.push('');
		    }
		    if (ctx.stacks.length > 0) {
		        lines.push('## Stack Notes');
		        ctx.stacks.forEach(r => lines.push(`- ${r.entry.title}`));
		        lines.push('');
		    }
		    // Unclassified saves still surface here. Without this section a bare
		    // `devbrain note "..."` was stored and then never shown again.
		    if (ctx.notes.length > 0) {
		        lines.push('## Notes');
		        ctx.notes.forEach(r => {
		            lines.push(`- ${r.entry.title}`);
		            if (r.entry.content && r.entry.content !== r.entry.title) {
		                lines.push(`  → ${clip(r.entry.content, 400)}`);
		            }
		        });
		        lines.push('');
		    }
		    if (ctx.supersededDecisions && ctx.supersededDecisions.length > 0) {
		        lines.push('## Past Decisions (superseded)');
		        ctx.supersededDecisions.forEach(r => {
		            lines.push(`- [SUPERSEDED] ${r.entry.title}`);
		            if (r.entry.content && r.entry.content !== r.entry.title) {
		                lines.push(`  → ${clip(r.entry.content, 400)}`);
		            }
		        });
		        lines.push('');
		    }
		    if (ctx.currentProject?.stack?.length) {
		        lines.push('## Tech Stack');
		        lines.push(ctx.currentProject.stack.join(' · '));
		    }
		    return lines.join('\n').trim();
		}
		
	} (search));
	return search;
}

var projectPath = {};

var hasRequiredProjectPath;

function requireProjectPath () {
	if (hasRequiredProjectPath) return projectPath;
	hasRequiredProjectPath = 1;
	Object.defineProperty(projectPath, "__esModule", { value: true });
	projectPath.normalizeProjectPath = normalizeProjectPath;
	projectPath.sameProjectPath = sameProjectPath;
	/**
	 * The one spelling of a project path, used whenever one is stored or looked up.
	 *
	 * Projects are found by exact path, and Windows hands the same folder over in
	 * more than one spelling: VS Code passes hooks `c:\Users\…` while Node's
	 * process.cwd() gives `C:\Users\…`, and git prints `C:/Users/…`. Compared as
	 * written, a registered project was "not a DevBrain project" to every hook the
	 * editor ran, so session briefings, prompt recall and failure recall all went
	 * silent without a single error.
	 *
	 * Deliberately not path.resolve: a POSIX path must stay as it is on any OS.
	 */
	function normalizeProjectPath(p) {
	    const drive = /^([a-zA-Z]):[\\/]/.exec(p);
	    if (drive) {
	        const rest = p.slice(2).replace(/\//g, '\\').replace(/\\+$/, '');
	        return `${drive[1].toUpperCase()}:${rest || '\\'}`;
	    }
	    return p.length > 1 ? p.replace(/\/+$/, '') : p;
	}
	/** True when two paths name the same project. */
	function sameProjectPath(a, b) {
	    return normalizeProjectPath(a) === normalizeProjectPath(b);
	}
	
	return projectPath;
}

var hasRequiredLocalStore;

function requireLocalStore () {
	if (hasRequiredLocalStore) return localStore;
	hasRequiredLocalStore = 1;
	(function (exports) {
		// Local JSON storage — the zero-config default when MONGODB_URI is unset.
		//
		// Mirrors every storage function in db.ts with identical semantics, so nothing
		// upstream needs to know which backend is active. Atlas becomes an upgrade you
		// choose (for team sharing and server-side vector search) rather than a
		// prerequisite for using DevBrain at all.
		//
		// Concurrency: writes replace the file via an atomic rename, so a reader never
		// observes a half-written file. Writers take an exclusive lock file around
		// reload-mutate-write, because without it two writers landing in the same few
		// milliseconds each reload, each change, and the second rename silently drops
		// the first's update. That was tolerable with one session; with several Claude
		// Code sessions in parallel, every one running hooks that save and bump
		// counters, it is how saves go missing. See withLock().
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.LOCK_STALE_MS = void 0;
		exports.getLocalDbPath = getLocalDbPath;
		exports.upsertProject = upsertProject;
		exports.getProjectByPath = getProjectByPath;
		exports.getAllProjects = getAllProjects;
		exports.insertEntry = insertEntry;
		exports.getEntriesByProject = getEntriesByProject;
		exports.getAllEntriesWithProjects = getAllEntriesWithProjects;
		exports.deleteEntry = deleteEntry;
		exports.isCommitProcessed = isCommitProcessed;
		exports.filterUnprocessedCommits = filterUnprocessedCommits;
		exports.markCommitProcessed = markCommitProcessed;
		exports.reinforceEntry = reinforceEntry;
		exports.bumpRetrievalCounts = bumpRetrievalCounts;
		exports.bumpRecallCounts = bumpRecallCounts;
		exports.supersedeEntry = supersedeEntry;
		exports.vectorSearch = vectorSearch;
		const fs_1 = require$$0;
		const path_1 = require$$1;
		const os_1 = require$$2;
		const types_1 = devbrainCore2.requireTypes();
		const search_1 = requireSearch();
		const projectPath_1 = requireProjectPath();
		const EMPTY = { version: 1, projects: [], entries: [], processedCommits: [] };
		function getLocalDbPath() {
		    return (0, path_1.join)((0, os_1.homedir)(), '.devbrain', 'db.json');
		}
		function read() {
		    const path = getLocalDbPath();
		    if (!(0, fs_1.existsSync)(path))
		        return { ...EMPTY, projects: [], entries: [], processedCommits: [] };
		    try {
		        const parsed = JSON.parse((0, fs_1.readFileSync)(path, 'utf-8').replace(/^﻿/, ''));
		        return {
		            version: parsed.version ?? 1,
		            projects: parsed.projects ?? [],
		            entries: parsed.entries ?? [],
		            processedCommits: parsed.processedCommits ?? [],
		        };
		    }
		    catch (err) {
		        // A corrupt store must not look like an empty one — that would silently
		        // discard the user's memory on the next write.
		        throw new Error(`Local DevBrain database at ${path} is not valid JSON. ` +
		            `Move it aside to start fresh, or repair it. (${err instanceof Error ? err.message : String(err)})`);
		    }
		}
		function write(data) {
		    const path = getLocalDbPath();
		    const dir = (0, path_1.join)((0, os_1.homedir)(), '.devbrain');
		    if (!(0, fs_1.existsSync)(dir))
		        (0, fs_1.mkdirSync)(dir, { recursive: true });
		    const tmp = `${path}.${process.pid}.tmp`;
		    (0, fs_1.writeFileSync)(tmp, JSON.stringify(data, null, 2), 'utf-8');
		    // Windows refuses to rename over a file another process has open for that
		    // instant (a reader mid-readFileSync) with EPERM/EBUSY. It clears in
		    // milliseconds; retry briefly rather than fail the save.
		    for (let attempt = 0;; attempt++) {
		        try {
		            (0, fs_1.renameSync)(tmp, path);
		            return;
		        }
		        catch (err) {
		            const code = err.code;
		            if ((code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') || attempt >= 20) {
		                try {
		                    (0, fs_1.unlinkSync)(tmp);
		                }
		                catch { /* already gone */ }
		                throw err;
		            }
		            sleepSync(10 + attempt * 5);
		        }
		    }
		}
		/** Block this thread briefly. mutate() is synchronous, so the lock wait must be too. */
		function sleepSync(ms) {
		    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
		}
		/** How long a lock may be held before it is presumed abandoned by a crashed process. */
		exports.LOCK_STALE_MS = 10000;
		/** How long a writer waits for the lock before giving up. */
		const LOCK_WAIT_MS = 5000;
		/**
		 * Run fn holding ~/.devbrain/db.json.lock.
		 *
		 * The lock is a file created with O_EXCL ('wx'), which is atomic on every
		 * platform Node supports, including Windows. A lock older than LOCK_STALE_MS
		 * belonged to a process that died mid-write — no write takes seconds — and is
		 * broken rather than waited on forever.
		 */
		function withLock(fn) {
		    const lock = `${getLocalDbPath()}.lock`;
		    const dir = (0, path_1.join)((0, os_1.homedir)(), '.devbrain');
		    if (!(0, fs_1.existsSync)(dir))
		        (0, fs_1.mkdirSync)(dir, { recursive: true });
		    const deadline = Date.now() + LOCK_WAIT_MS;
		    let fd;
		    for (let attempt = 0; fd === undefined; attempt++) {
		        try {
		            fd = (0, fs_1.openSync)(lock, 'wx');
		        }
		        catch (err) {
		            // Windows answers EPERM, not EEXIST, when the lock is being deleted by the
		            // writer that just released it. Both mean "held — wait".
		            const code = err.code;
		            if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES')
		                throw err;
		            if (code !== 'EEXIST' && Date.now() > deadline)
		                throw err;
		            try {
		                if (Date.now() - (0, fs_1.statSync)(lock).mtimeMs > exports.LOCK_STALE_MS) {
		                    (0, fs_1.unlinkSync)(lock);
		                    continue;
		                }
		            }
		            catch {
		                continue; /* released between our open and stat — try again */
		            }
		            if (Date.now() > deadline) {
		                throw new Error(`DevBrain's local database is locked by another process (${lock}). ` +
		                    `If no other DevBrain is running, delete that file.`);
		            }
		            sleepSync(Math.min(5 + attempt * 5, 50));
		        }
		    }
		    try {
		        return fn();
		    }
		    finally {
		        (0, fs_1.closeSync)(fd);
		        try {
		            (0, fs_1.unlinkSync)(lock);
		        }
		        catch { /* broken as stale by another process */ }
		    }
		}
		// Reload-then-mutate under the lock, so concurrent processes each work from
		// the state the previous writer left rather than overwrite it.
		function mutate(fn) {
		    withLock(() => {
		        const data = read();
		        fn(data);
		        write(data);
		    });
		}
		function projectFor(projects, projectId) {
		    return (projects.find(p => p.id === projectId) ??
		        // Matches the $ifNull fallback in the Mongo aggregation.
		        { id: projectId, name: 'devbrain', path: '', stack: [], createdAt: 0, lastSeen: 0 });
		}
		// ── projects ──────────────────────────────────────────────────────────────────
		async function upsertProject(project) {
		    const stored = { ...project, path: (0, projectPath_1.normalizeProjectPath)(project.path) };
		    mutate(data => {
		        const idx = data.projects.findIndex(p => (0, projectPath_1.sameProjectPath)(p.path, stored.path));
		        if (idx === -1)
		            data.projects.push(stored);
		        else
		            data.projects[idx] = stored;
		    });
		}
		async function getProjectByPath(path) {
		    return read().projects.find(p => (0, projectPath_1.sameProjectPath)(p.path, path)) ?? null;
		}
		async function getAllProjects() {
		    return read().projects.slice().sort((a, b) => b.lastSeen - a.lastSeen);
		}
		// ── entries ───────────────────────────────────────────────────────────────────
		async function insertEntry(entry) {
		    mutate(data => { data.entries.push(entry); });
		}
		async function getEntriesByProject(projectId) {
		    return read().entries
		        .filter(e => e.projectId === projectId)
		        .sort((a, b) => b.createdAt - a.createdAt);
		}
		async function getAllEntriesWithProjects() {
		    const { entries, projects } = read();
		    return entries.map(e => ({ ...e, project: projectFor(projects, e.projectId) }));
		}
		async function deleteEntry(id) {
		    mutate(data => { data.entries = data.entries.filter(e => e.id !== id); });
		}
		// ── commits ───────────────────────────────────────────────────────────────────
		async function isCommitProcessed(hash) {
		    return read().processedCommits.some(c => c.hash === hash);
		}
		/** The hashes, of those given, that have not been reviewed yet. One read. */
		async function filterUnprocessedCommits(hashes) {
		    const done = new Set(read().processedCommits.map(c => c.hash));
		    return hashes.filter(h => !done.has(h));
		}
		async function markCommitProcessed(hash, projectId) {
		    mutate(data => {
		        // $setOnInsert semantics — first write wins, later ones are no-ops.
		        if (data.processedCommits.some(c => c.hash === hash))
		            return;
		        data.processedCommits.push({ hash, projectId, processedAt: Date.now() });
		    });
		}
		// ── retrieval & confidence ────────────────────────────────────────────────────
		// Tier from the number of independent human confirmations, not retrievals.
		function tierFor(reinforcements) {
		    return reinforcements >= 2 ? 'confirmed' : reinforcements >= 1 ? 'corroborated' : 'observation';
		}
		/**
		 * A human said "yes, this is right" — the only signal that confirms an entry.
		 * Each explicit reinforcement moves it one tier, so two confirmations from a
		 * person mark it confirmed. Automatic retrieval never does this.
		 */
		async function reinforceEntry(id, contentUpdate) {
		    mutate(data => {
		        const entry = data.entries.find(e => e.id === id);
		        if (!entry)
		            return;
		        entry.reinforcedCount = (entry.reinforcedCount ?? 0) + 1;
		        entry.lastRetrievedAt = Date.now();
		        entry.confidence = tierFor(entry.reinforcedCount);
		        if (contentUpdate !== undefined)
		            entry.content = contentUpdate;
		    });
		}
		async function bumpRetrievalCounts(ids, fromProjectId) {
		    if (!ids.length)
		        return;
		    mutate(data => {
		        for (const entry of data.entries) {
		            if (!ids.includes(entry.id))
		                continue;
		            entry.retrievalCount = (entry.retrievalCount ?? 0) + 1;
		            entry.lastRetrievedAt = Date.now();
		            if (fromProjectId) {
		                const seen = entry.seenInProjects ?? [];
		                if (!seen.includes(fromProjectId))
		                    seen.push(fromProjectId);
		                entry.seenInProjects = seen;
		            }
		            // Retrieval does not promote confidence — see the note in db.ts. Only
		            // independent re-observation across projects does.
		            if (entry.confidence === 'observation' && (entry.seenInProjects?.length ?? 0) >= 2) {
		                entry.confidence = 'corroborated';
		            }
		        }
		    });
		}
		/** See db.ts: counts failures caught, not times shown. */
		async function bumpRecallCounts(ids, context = {}) {
		    if (!ids.length)
		        return;
		    const at = Date.now();
		    mutate(data => {
		        for (const entry of data.entries) {
		            if (!ids.includes(entry.id))
		                continue;
		            entry.recallCount = (entry.recallCount ?? 0) + 1;
		            entry.lastRecalledAt = at;
		            // Only when there is a query to record: a bump with nothing to say about
		            // what matched would add a row that reads as a blank line in the log.
		            if (context.query) {
		                entry.recalls = [
		                    ...(entry.recalls ?? []),
		                    {
		                        at,
		                        query: context.query.slice(0, 200),
		                        ...(context.sessionId ? { sessionId: context.sessionId } : {}),
		                    },
		                ].slice(-types_1.RECALL_LOG_MAX);
		            }
		        }
		    });
		}
		async function supersedeEntry(oldId, newId) {
		    mutate(data => {
		        const entry = data.entries.find(e => e.id === oldId);
		        if (!entry)
		            return;
		        entry.supersededBy = newId;
		        entry.supersededAt = Date.now();
		        // Carry the chain's depth onto the replacement.
		        const replacement = data.entries.find(e => e.id === newId);
		        if (replacement) {
		            replacement.supersedes = oldId;
		            replacement.revisionCount = (entry.revisionCount ?? 0) + 1;
		        }
		    });
		}
		// ── vector search ─────────────────────────────────────────────────────────────
		// Atlas runs $vectorSearch server-side against an index; locally we rank in
		// memory over the stored embeddings. Same ordering, same shape, no index to
		// provision — it just gets slower as the store grows.
		async function vectorSearch(queryEmbedding, opts = {}) {
		    const { topK = 10, projectId } = opts;
		    const { entries, projects } = read();
		    return entries
		        .filter(e => e.embedding?.length && (!projectId || e.projectId === projectId))
		        .map(e => ({
		        ...e,
		        project: projectFor(projects, e.projectId),
		        vectorScore: (0, search_1.cosineSimilarity)(queryEmbedding, e.embedding),
		    }))
		        .sort((a, b) => b.vectorScore - a.vectorScore)
		        .slice(0, topK);
		}
		
	} (localStore));
	return localStore;
}

var hasRequiredDb;

function requireDb () {
	if (hasRequiredDb) return db;
	hasRequiredDb = 1;
	(function (exports) {
		var __createBinding = (db && db.__createBinding) || (Object.create ? (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    var desc = Object.getOwnPropertyDescriptor(m, k);
		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
		      desc = { enumerable: true, get: function() { return m[k]; } };
		    }
		    Object.defineProperty(o, k2, desc);
		}) : (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    o[k2] = m[k];
		}));
		var __setModuleDefault = (db && db.__setModuleDefault) || (Object.create ? (function(o, v) {
		    Object.defineProperty(o, "default", { enumerable: true, value: v });
		}) : function(o, v) {
		    o["default"] = v;
		});
		var __importStar = (db && db.__importStar) || (function () {
		    var ownKeys = function(o) {
		        ownKeys = Object.getOwnPropertyNames || function (o) {
		            var ar = [];
		            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
		            return ar;
		        };
		        return ownKeys(o);
		    };
		    return function (mod) {
		        if (mod && mod.__esModule) return mod;
		        var result = {};
		        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
		        __setModuleDefault(result, mod);
		        return result;
		    };
		})();
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.getLocalDbPath = void 0;
		exports.describeStorage = describeStorage;
		exports.closeDb = closeDb;
		exports.upsertProject = upsertProject;
		exports.getProjectByPath = getProjectByPath;
		exports.getAllProjects = getAllProjects;
		exports.insertEntry = insertEntry;
		exports.getEntriesByProject = getEntriesByProject;
		exports.getAllEntriesWithProjects = getAllEntriesWithProjects;
		exports.isCommitProcessed = isCommitProcessed;
		exports.filterUnprocessedCommits = filterUnprocessedCommits;
		exports.markCommitProcessed = markCommitProcessed;
		exports.reinforceEntry = reinforceEntry;
		exports.bumpRetrievalCounts = bumpRetrievalCounts;
		exports.bumpRecallCounts = bumpRecallCounts;
		exports.supersedeEntry = supersedeEntry;
		exports.vectorSearch = vectorSearch;
		exports.deleteEntry = deleteEntry;
		exports.getDevbrainDir = getDevbrainDir;
		const path_1 = require$$1;
		const os_1 = require$$2;
		const redact_1 = requireRedact();
		const types_1 = devbrainCore2.requireTypes();
		const local = __importStar(requireLocalStore());
		const projectPath_1 = requireProjectPath();
		var localStore_1 = requireLocalStore();
		Object.defineProperty(exports, "getLocalDbPath", { enumerable: true, get: function () { return localStore_1.getLocalDbPath; } });
		// ── backend selection ─────────────────────────────────────────────────────────
		// No MONGODB_URI means local JSON storage, not an error. DevBrain works out of
		// the box; pointing it at MongoDB is how you share memory across a team and get
		// server-side vector search.
		function useLocal() {
		    return !process.env.MONGODB_URI?.trim();
		}
		function describeStorage() {
		    return useLocal()
		        ? { kind: 'local', location: local.getLocalDbPath() }
		        : { kind: 'mongodb', location: 'MongoDB (MONGODB_URI)' };
		}
		// ── connection ────────────────────────────────────────────────────────────────
		let client = null;
		let _db = null;
		/**
		 * The mongodb driver, loaded on first use rather than at import.
		 *
		 * Measured: requiring it costs 199ms of the 316ms it took to load core at all,
		 * and a PostToolUse hook runs on every single tool call — so every Read and
		 * Edit was paying for a database driver it would never use. Cached by the
		 * module system after the first call, so repeat use is free.
		 */
		function loadMongo() {
		    // eslint-disable-next-line @typescript-eslint/no-var-requires
		    return mongodb4.requireLib();
		}
		async function getDb() {
		    if (_db)
		        return _db;
		    const uri = process.env.MONGODB_URI;
		    if (!uri)
		        throw new Error('MONGODB_URI is not set. Add it to ~/.devbrain/.env');
		    const { MongoClient, ServerApiVersion } = loadMongo();
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
		async function closeDb() {
		    const c = client;
		    client = null;
		    _db = null;
		    if (c)
		        await c.close().catch(() => { });
		}
		function strip(doc) {
		    // eslint-disable-next-line @typescript-eslint/no-unused-vars
		    const { _id, ...rest } = doc;
		    return rest;
		}
		// ── projects ──────────────────────────────────────────────────────────────────
		async function upsertProject(project) {
		    if (useLocal())
		        return local.upsertProject(project);
		    const db = await getDb();
		    const stored = { ...project, path: (0, projectPath_1.normalizeProjectPath)(project.path) };
		    // Matching every spelling replaces a record saved before paths were
		    // normalized, rather than leaving it beside the new one.
		    await db.collection('projects').replaceOne({ path: { $in: pathSpellings(project.path) } }, stored, { upsert: true });
		}
		async function getProjectByPath(path) {
		    if (useLocal())
		        return local.getProjectByPath(path);
		    const db = await getDb();
		    const doc = await db.collection('projects').findOne({ path: { $in: pathSpellings(path) } });
		    return doc ? strip(doc) : null;
		}
		/**
		 * The ways one project path may already be stored: normalized, as given, and —
		 * on Windows — with a lowercase drive letter, which is how records written
		 * before normalization from an editor's cwd look.
		 */
		function pathSpellings(path) {
		    const norm = (0, projectPath_1.normalizeProjectPath)(path);
		    const lowerDrive = /^[A-Z]:/.test(norm) ? norm[0].toLowerCase() + norm.slice(1) : norm;
		    return [...new Set([norm, path, lowerDrive])];
		}
		async function getAllProjects() {
		    if (useLocal())
		        return local.getAllProjects();
		    const db = await getDb();
		    const docs = await db.collection('projects').find({}).sort({ lastSeen: -1 }).toArray();
		    return docs.map(d => strip(d));
		}
		// ── entries ───────────────────────────────────────────────────────────────────
		/**
		 * Every path that writes an entry comes through here, whichever backend is
		 * active, so this is where credentials are scrubbed. See redact.ts.
		 */
		function scrubEntry(entry) {
		    return {
		        ...entry,
		        title: (0, redact_1.redactSecrets)(entry.title),
		        content: (0, redact_1.redactSecrets)(entry.content),
		        ...(entry.errorPattern !== undefined ? { errorPattern: (0, redact_1.redactSecrets)(entry.errorPattern) } : {}),
		    };
		}
		async function insertEntry(entry) {
		    entry = scrubEntry(entry);
		    if (useLocal())
		        return local.insertEntry(entry);
		    const db = await getDb();
		    await db.collection('entries').insertOne({ ...entry });
		}
		async function getEntriesByProject(projectId) {
		    if (useLocal())
		        return local.getEntriesByProject(projectId);
		    const db = await getDb();
		    const docs = await db.collection('entries').find({ projectId }).sort({ createdAt: -1 }).toArray();
		    return docs.map(d => strip(d));
		}
		async function getAllEntriesWithProjects() {
		    if (useLocal())
		        return local.getAllEntriesWithProjects();
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
		    return docs;
		}
		// ── commits ───────────────────────────────────────────────────────────────────
		async function isCommitProcessed(hash) {
		    if (useLocal())
		        return local.isCommitProcessed(hash);
		    const db = await getDb();
		    return !!(await db.collection('processedCommits').findOne({ hash }));
		}
		/** The hashes, of those given, that have not been reviewed yet. One query. */
		async function filterUnprocessedCommits(hashes) {
		    if (!hashes.length)
		        return [];
		    if (useLocal())
		        return local.filterUnprocessedCommits(hashes);
		    const db = await getDb();
		    const done = await db.collection('processedCommits')
		        .find({ hash: { $in: hashes } }, { projection: { hash: 1 } }).toArray();
		    const seen = new Set(done.map(d => d.hash));
		    return hashes.filter(h => !seen.has(h));
		}
		async function markCommitProcessed(hash, projectId) {
		    if (useLocal())
		        return local.markCommitProcessed(hash, projectId);
		    const db = await getDb();
		    await db.collection('processedCommits').updateOne({ hash }, { $setOnInsert: { hash, projectId, processedAt: Date.now() } }, { upsert: true });
		}
		// ── retrieval & confidence ────────────────────────────────────────────────────
		async function reinforceEntry(id, contentUpdate) {
		    contentUpdate = (0, redact_1.redactSecrets)(contentUpdate);
		    if (useLocal())
		        return local.reinforceEntry(id, contentUpdate);
		    const db = await getDb();
		    const doc = await db.collection('entries').findOne({ id });
		    if (!doc)
		        return;
		    // A person explicitly confirmed this entry. That is the only thing that marks
		    // an entry confirmed — retrieval is DevBrain reading its own output.
		    const reinforced = (doc.reinforcedCount ?? 0) + 1;
		    const confidence = reinforced >= 2 ? 'confirmed' : 'corroborated';
		    await db.collection('entries').updateOne({ id }, {
		        $set: {
		            reinforcedCount: reinforced,
		            lastRetrievedAt: Date.now(),
		            confidence,
		            ...(contentUpdate !== undefined ? { content: contentUpdate } : {}),
		        },
		    });
		}
		async function bumpRetrievalCounts(ids, fromProjectId) {
		    if (!ids.length)
		        return;
		    if (useLocal())
		        return local.bumpRetrievalCounts(ids, fromProjectId);
		    const db = await getDb();
		    const update = {
		        $inc: { retrievalCount: 1 },
		        $set: { lastRetrievedAt: Date.now() },
		    };
		    if (fromProjectId)
		        update.$addToSet = { seenInProjects: fromProjectId };
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
		    await db.collection('entries').updateMany({
		        id: { $in: ids },
		        confidence: 'observation',
		        $expr: { $gte: [{ $size: { $ifNull: ['$seenInProjects', []] } }, 2] },
		    }, { $set: { confidence: 'corroborated' } });
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
		async function bumpRecallCounts(ids, context = {}) {
		    if (!ids.length)
		        return;
		    // The failure text a recall matched is kept in the entry's log — scrub it too.
		    if (context.query)
		        context = { ...context, query: (0, redact_1.redactSecrets)(context.query) };
		    if (useLocal())
		        return local.bumpRecallCounts(ids, context);
		    const db = await getDb();
		    const event = {
		        at: Date.now(),
		        query: (context.query ?? '').slice(0, 200),
		        ...(context.sessionId ? { sessionId: context.sessionId } : {}),
		    };
		    await db.collection('entries').updateMany({ id: { $in: ids } }, {
		        $inc: { recallCount: 1 },
		        $set: { lastRecalledAt: event.at },
		        ...(context.query ? { $push: { recalls: { $each: [event], $slice: -types_1.RECALL_LOG_MAX } } } : {}),
		    });
		}
		async function supersedeEntry(oldId, newId) {
		    if (useLocal())
		        return local.supersedeEntry(oldId, newId);
		    const db = await getDb();
		    const old = await db.collection('entries').findOne({ id: oldId });
		    await db.collection('entries').updateOne({ id: oldId }, { $set: { supersededBy: newId, supersededAt: Date.now() } });
		    // Carry the chain's depth onto the replacement: each correction is its own
		    // row, so without this a claim revised three times reads as brand new.
		    await db.collection('entries').updateOne({ id: newId }, { $set: { supersedes: oldId, revisionCount: (old?.revisionCount ?? 0) + 1 } });
		}
		// ── atlas vector search ───────────────────────────────────────────────────────
		async function vectorSearch(queryEmbedding, opts = {}) {
		    const { topK = 10, projectId } = opts;
		    if (useLocal())
		        return local.vectorSearch(queryEmbedding, opts);
		    const db = await getDb();
		    const pipeline = [
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
		    return docs;
		}
		async function deleteEntry(id) {
		    if (useLocal())
		        return local.deleteEntry(id);
		    const db = await getDb();
		    await db.collection('entries').deleteOne({ id });
		}
		// ── misc ──────────────────────────────────────────────────────────────────────
		function getDevbrainDir() {
		    return (0, path_1.join)((0, os_1.homedir)(), '.devbrain');
		}
		
	} (db));
	return db;
}

var stack = {};

var hasRequiredStack;

function requireStack () {
	if (hasRequiredStack) return stack;
	hasRequiredStack = 1;
	Object.defineProperty(stack, "__esModule", { value: true });
	stack.ALL_STACK_LABELS = void 0;
	stack.detectStack = detectStack;
	stack.getProjectName = getProjectName;
	stack.looksLikeProject = looksLikeProject;
	const fs_1 = require$$0;
	const path_1 = require$$1;
	const FRAMEWORK_MAP = {
	    react: 'React',
	    vue: 'Vue',
	    '@angular/core': 'Angular',
	    svelte: 'Svelte',
	    next: 'Next.js',
	    nuxt: 'Nuxt',
	    express: 'Express',
	    fastify: 'Fastify',
	    '@nestjs/core': 'NestJS',
	    'hono': 'Hono',
	    prisma: 'Prisma',
	    typeorm: 'TypeORM',
	    mongoose: 'MongoDB/Mongoose',
	    sequelize: 'Sequelize',
	    drizzle: 'Drizzle ORM',
	    tailwindcss: 'Tailwind CSS',
	    typescript: 'TypeScript',
	    vite: 'Vite',
	    webpack: 'Webpack',
	    electron: 'Electron',
	    'react-native': 'React Native',
	    expo: 'Expo',
	    trpc: 'tRPC',
	    graphql: 'GraphQL',
	    socket: 'Socket.io',
	};
	/** Labels detectStack adds from a file rather than a dependency. */
	const FILE_SIGNAL_LABELS = ['Node.js', 'Dart', 'Flutter', 'Rust', 'Go', 'Java', 'Ruby', 'Python', 'C#/.NET'];
	/**
	 * Every label detectStack can produce.
	 *
	 * Exported so the thing that draws stack marks can be checked against it
	 * rather than against a second hand-written list. The first version of that
	 * list was already missing tRPC, GraphQL and Socket.io on the day it was
	 * written, and nothing said so — the marks just did not appear.
	 */
	stack.ALL_STACK_LABELS = [...new Set([...FILE_SIGNAL_LABELS, ...Object.values(FRAMEWORK_MAP)])].sort();
	/** Directories never worth opening: vendored code, build output, tooling. */
	const SKIP_DIRS = new Set([
	    'node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'target',
	    '.git', '.next', '.nuxt', '.venv', 'venv', '__pycache__', 'Pods', '.dart_tool',
	]);
	/** Everything detectable in one directory, ignoring its children. */
	function detectInDir(dir) {
	    const stack = [];
	    // Node.js / JS / TS
	    const pkgPath = (0, path_1.join)(dir, 'package.json');
	    if ((0, fs_1.existsSync)(pkgPath)) {
	        stack.push('Node.js');
	        try {
	            const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
	            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
	            for (const [dep, label] of Object.entries(FRAMEWORK_MAP)) {
	                if (allDeps[dep] || allDeps[`@types/${dep}`]) {
	                    stack.push(label);
	                }
	            }
	        }
	        catch { }
	    }
	    // Dart / Flutter. A pubspec is Dart; Flutter is a dependency within it, the
	    // same relationship as Node and React, so both are reported when both apply.
	    const pubspec = (0, path_1.join)(dir, 'pubspec.yaml');
	    if ((0, fs_1.existsSync)(pubspec)) {
	        stack.push('Dart');
	        try {
	            if (/^\s*flutter\s*:/m.test((0, fs_1.readFileSync)(pubspec, 'utf-8')))
	                stack.push('Flutter');
	        }
	        catch { }
	    }
	    if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'Cargo.toml')))
	        stack.push('Rust');
	    if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'go.mod')))
	        stack.push('Go');
	    if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'pom.xml')) || (0, fs_1.existsSync)((0, path_1.join)(dir, 'build.gradle')))
	        stack.push('Java');
	    if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'Gemfile')))
	        stack.push('Ruby');
	    const pythonSignals = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
	    if (pythonSignals.some(f => (0, fs_1.existsSync)((0, path_1.join)(dir, f))))
	        stack.push('Python');
	    const dotnetSignals = ['*.csproj', '*.fsproj', '*.sln'];
	    if (dotnetSignals.some(f => (0, fs_1.existsSync)((0, path_1.join)(dir, f))))
	        stack.push('C#/.NET');
	    return stack;
	}
	/**
	 * What a project is built with, read from its manifests.
	 *
	 * Scans the root and one level below it, so an app-and-server repo reports both
	 * halves rather than nothing.
	 */
	function detectStack(projectPath) {
	    const stack = detectInDir(projectPath);
	    {
	        let children = [];
	        try {
	            children = (0, fs_1.readdirSync)(projectPath, { withFileTypes: true })
	                .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
	                .map(d => d.name);
	        }
	        catch { /* unreadable project directory */ }
	        for (const child of children)
	            stack.push(...detectInDir((0, path_1.join)(projectPath, child)));
	    }
	    return [...new Set(stack)];
	}
	function getProjectName(projectPath) {
	    const pkgPath = (0, path_1.join)(projectPath, 'package.json');
	    if ((0, fs_1.existsSync)(pkgPath)) {
	        try {
	            const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
	            if (pkg.name)
	                return pkg.name;
	        }
	        catch { }
	    }
	    return projectPath.split(/[\\/]/).filter(Boolean).pop() ?? 'unknown';
	}
	/**
	 * Whether a directory is worth registering as a project on its own.
	 *
	 * The plugin has no setup step, so the SessionStart hook registers whatever
	 * repo it wakes up in — and that means it also wakes up in directories nobody
	 * would call a project. A session started in a home directory, a Downloads
	 * folder or a scratch path would otherwise add a row to the project list and a
	 * place for entries to accumulate where nobody will look for them.
	 *
	 * Two signals are enough. A git repository is a project by definition, whatever
	 * is in it. Failing that, a recognised stack means there is at least a manifest
	 * — a package.json, a pubspec.yaml, a Cargo.toml — which no incidental folder
	 * has. A directory with neither is left alone; `devbrain init` still registers
	 * it explicitly, which is the right way to ask for something this declines to
	 * assume.
	 */
	function looksLikeProject(signals) {
	    return signals.isGitRepo || signals.stack.length > 0;
	}
	
	return stack;
}

var git = {};

var hasRequiredGit;

function requireGit () {
	if (hasRequiredGit) return git;
	hasRequiredGit = 1;
	Object.defineProperty(git, "__esModule", { value: true });
	git.isGitRepo = isGitRepo;
	git.getRepoRoot = getRepoRoot;
	git.getLastCommit = getLastCommit;
	git.getRecentCommits = getRecentCommits;
	git.listCommitHashes = listCommitHashes;
	git.getCommit = getCommit;
	git.countCommits = countCommits;
	git.removeGitHook = removeGitHook;
	git.isHookInstalled = isHookInstalled;
	const child_process_1 = require$$0$1;
	const fs_1 = require$$0;
	const path_1 = require$$1;
	function isGitRepo(path) {
	    try {
	        (0, child_process_1.execSync)('git rev-parse --git-dir', { cwd: path, stdio: 'ignore' });
	        return true;
	    }
	    catch {
	        return false;
	    }
	}
	function getRepoRoot(cwd) {
	    try {
	        return (0, child_process_1.execSync)('git rev-parse --show-toplevel', { cwd, stdio: 'pipe' }).toString().trim();
	    }
	    catch {
	        return null;
	    }
	}
	// A single commit's diff can dwarf execSync's 1MB default maxBuffer, which would
	// throw and silently yield no knowledge for exactly the large refactors worth
	// remembering. Read generously, then cap: extractKnowledge only uses the first
	// 6000 chars anyway.
	const DIFF_MAX_BUFFER = 32 * 1024 * 1024;
	const DIFF_CHAR_LIMIT = 20000;
	function readCommit(repoPath, ref) {
	    try {
	        const git = (args, maxBuffer) => (0, child_process_1.execSync)(`git ${args}`, { cwd: repoPath, stdio: 'pipe', maxBuffer }).toString().trim();
	        const hash = git(`rev-parse ${ref}`);
	        const message = git(`log -1 --format=%s ${hash}`);
	        const timestamp = parseInt(git(`log -1 --format=%ct ${hash}`), 10) * 1000;
	        const stat = git(`show --stat --format="" ${hash}`, DIFF_MAX_BUFFER);
	        const diff = git(`show --format="" ${hash}`, DIFF_MAX_BUFFER);
	        return {
	            hash,
	            message,
	            timestamp,
	            diff: `${stat}\n\n${diff}`.slice(0, DIFF_CHAR_LIMIT),
	        };
	    }
	    catch {
	        return null;
	    }
	}
	function getLastCommit(repoPath) {
	    return readCommit(repoPath, 'HEAD');
	}
	/**
	 * Most recent commits, newest first, for backfilling an existing repo's history.
	 * Merges are excluded: they carry no authored knowledge and extractKnowledge
	 * discards them anyway, so skipping them means `limit` buys real commits.
	 */
	function getRecentCommits(repoPath, limit = 20) {
	    if (limit <= 0)
	        return [];
	    try {
	        const hashes = (0, child_process_1.execSync)(`git log --no-merges --format=%H -n ${limit}`, {
	            cwd: repoPath,
	            stdio: 'pipe',
	        })
	            .toString()
	            .trim()
	            .split('\n')
	            .map(h => h.trim())
	            .filter(Boolean);
	        return hashes
	            .map(h => readCommit(repoPath, h))
	            .filter((c) => c !== null);
	    }
	    catch {
	        return [];
	    }
	}
	/**
	 * Hashes of the most recent non-merge commits, newest first. Cheap — no diffs —
	 * so it can run at session start to count what has not been reviewed.
	 */
	function listCommitHashes(repoPath, limit = 200) {
	    if (limit <= 0)
	        return [];
	    try {
	        return (0, child_process_1.execSync)(`git log --no-merges --format=%H -n ${limit}`, { cwd: repoPath, stdio: 'pipe' })
	            .toString().trim().split('\n').map(h => h.trim()).filter(Boolean);
	    }
	    catch {
	        return [];
	    }
	}
	/** One commit with its stat and diff, or null if it cannot be read. */
	function getCommit(repoPath, hash) {
	    return readCommit(repoPath, hash);
	}
	/** Total non-merge commits in the repo — used to size a backfill before running it. */
	function countCommits(repoPath) {
	    try {
	        const out = (0, child_process_1.execSync)('git rev-list --no-merges --count HEAD', {
	            cwd: repoPath,
	            stdio: 'pipe',
	        }).toString().trim();
	        const n = parseInt(out, 10);
	        return Number.isFinite(n) ? n : 0;
	    }
	    catch {
	        return 0;
	    }
	}
	/**
	 * Remove the post-commit hook earlier versions installed.
	 *
	 * It ran `devbrain capture`, which had a model read each commit's diff. Commits
	 * are now reviewed by the coding agent instead (`devbrain backfill`), so the
	 * hook has nothing left to do. Other lines in a shared hook file are kept; a
	 * file that held only DevBrain's line is deleted.
	 */
	function removeGitHook(repoPath) {
	    const hookPath = (0, path_1.join)(repoPath, '.git', 'hooks', 'post-commit');
	    if (!(0, fs_1.existsSync)(hookPath))
	        return false;
	    const content = (0, fs_1.readFileSync)(hookPath, 'utf-8');
	    if (!content.includes('devbrain capture'))
	        return false;
	    const kept = content.split('\n').filter(l => !l.includes('devbrain capture'));
	    if (kept.every(l => !l.trim() || l.startsWith('#!')))
	        (0, fs_1.unlinkSync)(hookPath);
	    else
	        (0, fs_1.writeFileSync)(hookPath, kept.join('\n'), 'utf-8');
	    return true;
	}
	function isHookInstalled(repoPath) {
	    const hookPath = (0, path_1.join)(repoPath, '.git', 'hooks', 'post-commit');
	    if (!(0, fs_1.existsSync)(hookPath))
	        return false;
	    try {
	        const content = (0, fs_1.readFileSync)(hookPath, 'utf-8');
	        return content.includes('devbrain capture');
	    }
	    catch {
	        return false;
	    }
	}
	
	return git;
}

var dossier = {};

var hasRequiredDossier;

function requireDossier () {
	if (hasRequiredDossier) return dossier;
	hasRequiredDossier = 1;
	// Project dossier — everything known about one project, in one place.
	//
	// Knowledge was previously only reachable by querying across all projects: search
	// returned a flat ranked list, context returned a truncated top-N slice, and
	// export wrote type-named files (bugs.txt, fixes.txt) that mixed every project
	// together. There was no answer to "show me this project and everything in it".
	//
	// A dossier is that answer: the project's identity and stack, then every entry
	// grouped into the sections declared by the type registry. Nothing is truncated
	// and nothing is dropped — every entry type maps to a section, so an entry that
	// exists is always somewhere a reader can find it.
	Object.defineProperty(dossier, "__esModule", { value: true });
	dossier.buildDossier = buildDossier;
	dossier.formatDossierMarkdown = formatDossierMarkdown;
	dossier.dossierFiles = dossierFiles;
	const types_1 = devbrainCore2.requireTypes();
	const search_1 = requireSearch();
	function buildDossier(project, entries) {
	    const mine = entries.filter(e => e.projectId === project.id);
	    const counts = Object.fromEntries(types_1.ENTRY_SECTIONS.map(s => [s, 0]));
	    const bySection = new Map();
	    for (const section of types_1.ENTRY_SECTIONS)
	        bySection.set(section, []);
	    for (const entry of mine) {
	        const section = (0, types_1.sectionFor)(entry.type);
	        bySection.get(section).push(entry);
	        counts[section]++;
	    }
	    // Newest first within a section — the most recent lesson is usually the one
	    // that still applies.
	    for (const list of bySection.values())
	        list.sort((a, b) => b.createdAt - a.createdAt);
	    const sections = types_1.ENTRY_SECTIONS
	        .filter(s => bySection.get(s).length > 0)
	        .map(s => ({
	        section: s,
	        heading: types_1.SECTION_META[s].heading,
	        blurb: types_1.SECTION_META[s].blurb,
	        file: types_1.SECTION_META[s].file,
	        entries: bySection.get(s),
	    }));
	    const times = mine.map(e => e.createdAt).filter(t => Number.isFinite(t) && t > 0);
	    return {
	        project,
	        total: mine.length,
	        sections,
	        counts,
	        firstEntryAt: times.length ? Math.min(...times) : undefined,
	        lastEntryAt: times.length ? Math.max(...times) : undefined,
	        supersededCount: mine.filter(e => e.supersededBy).length,
	    };
	}
	function entryMarkdown(entry) {
	    const out = [];
	    const type = (0, types_1.normalizeType)(entry.type);
	    const flags = [];
	    if (entry.supersededBy)
	        flags.push('superseded');
	    if (entry.confidence && entry.confidence !== 'observation')
	        flags.push(entry.confidence);
	    if ((entry.seenInProjects?.length ?? 0) >= 2)
	        flags.push(`seen in ${entry.seenInProjects.length} projects`);
	    out.push(`### ${entry.title}`);
	    out.push('');
	    const meta = [`\`${type}\``];
	    if (entry.category)
	        meta.push(`\`${entry.category}\``);
	    meta.push((0, search_1.timeAgo)(entry.createdAt));
	    if (flags.length)
	        meta.push(flags.join(' · '));
	    out.push(meta.join(' · '));
	    out.push('');
	    if (entry.content && entry.content !== entry.title) {
	        out.push(entry.content);
	        out.push('');
	    }
	    if (entry.errorPattern) {
	        out.push('**Error pattern**');
	        out.push('');
	        out.push('```');
	        out.push(entry.errorPattern);
	        out.push('```');
	        out.push('');
	    }
	    if (entry.causeArchetype) {
	        out.push(`**Root-cause pattern:** ${entry.causeArchetype}`);
	        out.push('');
	    }
	    if (entry.tags.length) {
	        out.push(`**Tags:** ${entry.tags.map(t => `\`${t}\``).join(', ')}`);
	        out.push('');
	    }
	    return out;
	}
	function header(d) {
	    const out = [];
	    out.push(`# ${d.project.name}`);
	    out.push('');
	    out.push(`**Stack:** ${d.project.stack.length ? d.project.stack.join(' · ') : 'not detected'}`);
	    out.push(`**Path:** \`${d.project.path}\``);
	    out.push(`**Memory:** ${d.total} ${d.total === 1 ? 'entry' : 'entries'}`
	        + (d.lastEntryAt ? `, last updated ${(0, search_1.timeAgo)(d.lastEntryAt)}` : '')
	        + (d.supersededCount ? ` · ${d.supersededCount} superseded` : ''));
	    out.push('');
	    return out;
	}
	/** The whole dossier as one Markdown document. */
	function formatDossierMarkdown(d) {
	    const out = header(d);
	    if (d.total === 0) {
	        out.push('No knowledge recorded for this project yet.');
	        out.push('');
	        out.push('Run `devbrain backfill` to read past commits, or save something with');
	        out.push('`devbrain note "fix: ..."`.');
	        return out.join('\n');
	    }
	    out.push('## Contents');
	    out.push('');
	    for (const s of d.sections) {
	        out.push(`- **${s.heading}** (${s.entries.length}) — ${s.blurb}`);
	    }
	    out.push('');
	    for (const s of d.sections) {
	        out.push(`---`);
	        out.push('');
	        out.push(`## ${s.heading}`);
	        out.push('');
	        out.push(`_${s.blurb}_`);
	        out.push('');
	        for (const entry of s.entries)
	            out.push(...entryMarkdown(entry));
	    }
	    return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
	}
	/**
	 * The dossier split into one Markdown file per section, plus a README index.
	 *
	 * Useful for committing a project's memory into the repo, or for browsing it in
	 * any Markdown viewer without DevBrain installed.
	 */
	function dossierFiles(d) {
	    const files = [];
	    const index = header(d);
	    if (d.sections.length === 0) {
	        index.push('No knowledge recorded for this project yet.');
	    }
	    else {
	        index.push('## Sections');
	        index.push('');
	        for (const s of d.sections) {
	            index.push(`- [${s.heading}](${s.file}) — ${s.entries.length} · ${s.blurb}`);
	        }
	    }
	    index.push('');
	    files.push({ path: 'README.md', contents: index.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' });
	    for (const s of d.sections) {
	        const out = [];
	        out.push(`# ${s.heading} — ${d.project.name}`);
	        out.push('');
	        out.push(`_${s.blurb}_`);
	        out.push('');
	        out.push(`${s.entries.length} ${s.entries.length === 1 ? 'entry' : 'entries'}. [Back to overview](README.md)`);
	        out.push('');
	        for (const entry of s.entries)
	            out.push(...entryMarkdown(entry));
	        files.push({
	            path: s.file,
	            contents: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n',
	        });
	    }
	    return files;
	}
	
	return dossier;
}

var dedupe = {};

var hasRequiredDedupe;

function requireDedupe () {
	if (hasRequiredDedupe) return dedupe;
	hasRequiredDedupe = 1;
	(function (exports) {
		// Duplicate detection, shared by every path that writes an entry.
		//
		// This lived only in the CLI, so the hook and backfill checked for duplicates
		// while agent saves (save_entry, task_end) and dashboard saves did not — and the
		// agent path is the one used most. A problem worked across several commits or
		// several tool calls then left one near-identical entry per call, which is how
		// two "@google/adk dependency" entries appeared for a single event.
		//
		// One implementation here; callers pass their own threshold rather than keeping
		// their own copy of the logic.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.TEXT_DUPLICATE_THRESHOLD = exports.INTERACTIVE_DUPLICATE_THRESHOLD = exports.AUTO_DUPLICATE_THRESHOLD = void 0;
		exports.findDuplicate = findDuplicate;
		exports.titleOverlap = titleOverlap;
		exports.findTextDuplicate = findTextDuplicate;
		exports.isDuplicateEntry = isDuplicateEntry;
		const db_1 = requireDb();
		const search_1 = requireSearch();
		/**
		 * A human is present to judge in the interactive save path, so it can afford a
		 * looser threshold and simply ask. Automatic paths have nobody to ask: a false
		 * duplicate costs one skipped entry, a false unique costs permanent noise in
		 * every future context load. Hence the stricter default.
		 */
		exports.AUTO_DUPLICATE_THRESHOLD = 0.90;
		exports.INTERACTIVE_DUPLICATE_THRESHOLD = 0.86;
		/**
		 * The closest existing entry in this project above `threshold`, or null.
		 *
		 * Superseded entries are ignored — knowledge that was explicitly retired should
		 * not block a fresh observation of the same area.
		 */
		async function findDuplicate(embedding, projectId, threshold = exports.AUTO_DUPLICATE_THRESHOLD) {
		    if (!embedding?.length)
		        return null;
		    const existing = (await (0, db_1.getAllEntriesWithProjects)())
		        .filter(e => e.projectId === projectId && !e.supersededBy);
		    const [hit] = (0, search_1.findSimilar)(embedding, existing, 1, threshold);
		    return hit ? { entry: hit.entry, similarity: hit.similarity } : null;
		}
		/** Share of content words two titles have in common (Jaccard), 0..1. */
		function titleOverlap(a, b) {
		    const x = new Set((0, search_1.keywordTerms)(a));
		    const y = new Set((0, search_1.keywordTerms)(b));
		    if (!x.size || !y.size)
		        return 0;
		    let shared = 0;
		    for (const w of x)
		        if (y.has(w))
		            shared++;
		    return shared / (x.size + y.size - shared);
		}
		/** Titles this close are the same knowledge restated. Strict, like the auto threshold. */
		exports.TEXT_DUPLICATE_THRESHOLD = 0.75;
		/**
		 * Duplicate check for a save with no embedding — no AI configured. Compares
		 * titles, which agents write to be the searchable statement of the entry.
		 */
		async function findTextDuplicate(title, projectId, threshold = exports.TEXT_DUPLICATE_THRESHOLD) {
		    const existing = (await (0, db_1.getAllEntriesWithProjects)())
		        .filter(e => e.projectId === projectId && !e.supersededBy);
		    let best = null;
		    for (const e of existing) {
		        const similarity = titleOverlap(title, e.title);
		        if (similarity >= threshold && (!best || similarity > best.similarity))
		            best = { entry: e, similarity };
		    }
		    return best;
		}
		/**
		 * Convenience wrapper for callers that only need a yes/no.
		 * Never throws: a failing duplicate check must not block a save.
		 */
		async function isDuplicateEntry(embedding, projectId, threshold = exports.AUTO_DUPLICATE_THRESHOLD) {
		    try {
		        return (await findDuplicate(embedding, projectId, threshold)) !== null;
		    }
		    catch {
		        return false;
		    }
		}
		
	} (dedupe));
	return dedupe;
}

var indexSource = {};

var transcript = {};

var hasRequiredTranscript;

function requireTranscript () {
	if (hasRequiredTranscript) return transcript;
	hasRequiredTranscript = 1;
	// Reading a coding-agent session transcript as evidence.
	//
	// Commit capture sees a diff, and a diff records what changed but almost never
	// why: not the error that started the work, not the approach that failed first,
	// not the alternative that was rejected. That knowledge lives in the session —
	// the user's request, the tool output that came back red, the edits that
	// followed, and the agent's own explanation of the cause. The agent was asked
	// to write it down (task_end, save_entry) and mostly did not.
	//
	// This module turns a Claude Code JSONL transcript into a compact digest of that
	// evidence, so it can be extracted without anyone being asked. It is pure: no
	// I/O, no model calls, so every rule here is unit-tested.
	Object.defineProperty(transcript, "__esModule", { value: true });
	transcript.isEchoedOutput = isEchoedOutput;
	transcript.isReadOnlyCommand = isReadOnlyCommand;
	transcript.errorExcerpt = errorExcerpt;
	transcript.isGenericFailureLine = isGenericFailureLine;
	transcript.looksLikeError = looksLikeError;
	transcript.parseTranscript = parseTranscript;
	transcript.assessSegment = assessSegment;
	transcript.buildDigest = buildDigest;
	transcript.chunkEvents = chunkEvents;
	const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
	const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
	/** MCP tools through which an agent records knowledge, under any server prefix. */
	const SAVE_TOOL = /(?:^|__)(save_entry|task_end|supersede_entry)$/;
	const SAVE_COMMAND = /\bdevbrain\s+(?:note|recap)\b/;
	// Lines that are an error by their shape, not because the word "error" appears
	// somewhere in a grep result or a source file.
	const ERROR_LINE = 
	// Case-sensitive on purpose: "FAIL" from a test runner is a failure, a
	// `fail:` key in printed source code is not.
	/^\s*(?:[\w.]*(?:Error|Exception)\b|Traceback \(most recent call last\)|npm ERR!|[Ee]rror(?:\[\w+\])?:|[Ff]atal:|panic:|FAIL\b|✗|×|E\d{3,}\b|Exit code [1-9]|.*\berror TS\d+:)/;
	// Commands that print files or search them. Their output is source code, which
	// is full of the word Error; only the tool reporting failure counts for these.
	const READ_COMMAND = /^\s*(?:cd\s+\S+\s*&&\s*)?(?:cat|sed\s+-n|head|tail|less|grep|rg|ls|find|git\s+(?:show|diff|log|grep|blame)|Get-Content|Select-String|type)\b/;
	/**
	 * DevBrain's own messages, which quote the error they are about.
	 *
	 * A step-back or a recall lands in the transcript carrying error text, so the
	 * next parse reads it as a fresh failure and the warning becomes its own
	 * evidence. Matched on the opening phrases rather than the word "DevBrain",
	 * which an application is free to print for its own reasons.
	 */
	const SELF_VOICE = /DevBrain: (?:step back|this stretch of work|this failure matches)|# DevBrain backfill/;
	/**
	 * True when output is DevBrain quoting an error back, or a command printing an
	 * error string it was handed.
	 *
	 * The second case is what test fixtures and demo scripts do: the literal error
	 * appears in the command, so the command did not discover a failure, it echoed
	 * one. Both are distinguishable from a real failure precisely because the text
	 * was already there before the command ran.
	 */
	function isEchoedOutput(output, command) {
	    if (SELF_VOICE.test(output))
	        return true;
	    if (!command)
	        return false;
	    const flat = (s) => s.toLowerCase().replace(/\s+/g, ' ');
	    const line = flat(errorExcerpt(output).split('\n')[0]);
	    // Short lines match too easily to be evidence of anything.
	    return line.length >= 20 && flat(command).includes(line.slice(0, 60));
	}
	/**
	 * True when a command only prints files or searches them.
	 *
	 * Their output is source code, which is full of the word Error, so error
	 * detection on it produces false failures. Only the tool reporting a non-zero
	 * exit counts for these.
	 */
	function isReadOnlyCommand(command) {
	    return READ_COMMAND.test(command);
	}
	// Wrappers the IDE and harness put into user turns. They are context for the
	// agent, not something the user asked.
	const NOISE_TAGS = /<(system-reminder|ide_opened_file|ide_selection|ide_diagnostics|command-message|command-name|command-args|local-command-stdout|local-command-stderr|pasted_content)[^>]*>[\s\S]*?<\/\1>/g;
	function cleanPrompt(text) {
	    return text.replace(NOISE_TAGS, ' ').replace(/\s+/g, ' ').trim();
	}
	function resultText(content) {
	    if (typeof content === 'string')
	        return content;
	    if (Array.isArray(content)) {
	        return content
	            .map(b => (b && typeof b === 'object' && b.type === 'text' ? String(b.text ?? '') : ''))
	            .filter(Boolean)
	            .join('\n');
	    }
	    return '';
	}
	/**
	 * The error-bearing part of a tool result: the lines that look like an error,
	 * each with the line after it (usually the location or the real message). Kept
	 * verbatim, because a literal error string is what lets a future search match.
	 */
	function errorExcerpt(output, max = 600) {
	    const lines = output.split(/\r?\n/);
	    const keep = [];
	    for (let i = 0; i < lines.length && keep.join('\n').length < max; i++) {
	        // A generic line is never the best text available: it announces the failure
	        // without describing it, so it is skipped even though it looks like an error.
	        if (!ERROR_LINE.test(lines[i]) || isGenericFailureLine(lines[i]))
	            continue;
	        keep.push(lines[i].trimEnd());
	        if (lines[i + 1]?.trim()) {
	            keep.push(lines[i + 1].trimEnd());
	            i++;
	        }
	    }
	    const informative = lines.filter(l => l.trim() && !isGenericFailureLine(l)).slice(-6);
	    // Last resort: a command that failed and said nothing else. "Exit code 1" is
	    // then all there is, and an empty excerpt would be worse — it would make
	    // every silent failure identical to every other kind.
	    const anything = lines.filter(l => l.trim()).slice(-3);
	    const text = (keep.length ? keep : informative.length ? informative : anything).join('\n').trim();
	    return text.length > max ? text.slice(0, max) : text;
	}
	/**
	 * A line that announces a failure without describing it.
	 *
	 * "Exit code 1" is equally true of every failed command. Chosen as the failure
	 * text it discards the only part worth matching on — which is exactly what
	 * happened: a command failed with "No Gemini credentials", an entry stored that
	 * very pattern, and the recall matched nothing because it searched for
	 * "Exit code 1". It also makes unrelated failures fingerprint identically, so
	 * the loop detector sees a repeat that never happened.
	 */
	const GENERIC_FAILURE = /^\s*(?:exit (?:code|status) \d+|command failed(?: with exit code \d+)?[.:]?|traceback \(most recent call last\):|build failed|tests? failed|error[.:]?|FAIL|✗|×)\s*$/i;
	/**
	 * A row of a printed table, which is output ABOUT failures rather than one.
	 *
	 * A benchmark that tests error handling prints rows like
	 * `npm ERR! ERESOLVE unable to resolve dependen | ok | ok` — a deliberately
	 * unrelated fixture beside its pass/fail columns. That is error-shaped text
	 * quoted as data, and offering it verbatim as an error_pattern stores a pattern
	 * that matches the benchmark's own output, so every later run of it reads as the
	 * same failure recurring.
	 *
	 * Two separators is the test. A real message rarely carries two, and the lines
	 * that do — an echoed shell pipeline, a table — are not the error either.
	 */
	const TABLE_ROW = / \| .* \| /;
	function isGenericFailureLine(line) {
	    return GENERIC_FAILURE.test(line) || TABLE_ROW.test(line);
	}
	/** True when a tool result reports a failure. */
	function looksLikeError(output, isError) {
	    if (isError)
	        return true;
	    return output.split(/\r?\n/).slice(0, 400).some(l => ERROR_LINE.test(l));
	}
	/**
	 * Parse a transcript from line `fromLine` onward.
	 *
	 * Subagent (sidechain) turns are skipped: their final answer comes back to the
	 * main agent as a tool result anyway, and their exploration is noise here.
	 */
	function parseTranscript(jsonl, fromLine = 0) {
	    const lines = jsonl.split('\n');
	    // A trailing newline leaves an empty last element; a transcript still being
	    // written may end mid-line. Either way the last element is not a complete
	    // record yet, so it is not consumed — the next read starts there.
	    const complete = lines.length - 1;
	    const events = [];
	    const toolNames = new Map();
	    let sessionId;
	    let cwd;
	    for (let i = Math.max(0, fromLine); i < complete; i++) {
	        const raw = lines[i].trim();
	        if (!raw)
	            continue;
	        let ev;
	        try {
	            ev = JSON.parse(raw);
	        }
	        catch {
	            continue;
	        }
	        if (ev.isSidechain)
	            continue;
	        if (typeof ev.sessionId === 'string')
	            sessionId = ev.sessionId;
	        if (typeof ev.cwd === 'string')
	            cwd = ev.cwd;
	        const message = ev.message;
	        const content = message?.content;
	        if (ev.type === 'user') {
	            if (typeof content === 'string') {
	                const text = cleanPrompt(content);
	                if (text && !text.startsWith('[Request interrupted'))
	                    events.push({ kind: 'prompt', text, line: i });
	                continue;
	            }
	            if (!Array.isArray(content))
	                continue;
	            for (const block of content) {
	                if (block?.type === 'text') {
	                    const text = cleanPrompt(String(block.text ?? ''));
	                    if (text && !text.startsWith('[Request interrupted'))
	                        events.push({ kind: 'prompt', text, line: i });
	                }
	                else if (block?.type === 'tool_result') {
	                    const out = resultText(block.content);
	                    const tool = toolNames.get(String(block.tool_use_id ?? ''));
	                    // Only shell output carries errors worth keeping. A Read of a file that
	                    // happens to contain "Error:" is not a failure.
	                    const fromShell = !tool || SHELL_TOOLS.has(tool.name);
	                    const failed = block.is_error === true;
	                    const reading = !!tool?.command && READ_COMMAND.test(tool.command);
	                    if (fromShell && (reading ? failed : looksLikeError(out, failed))
	                        && !isEchoedOutput(out, tool?.command)) {
	                        events.push({
	                            kind: 'error', text: errorExcerpt(out), line: i,
	                            ...(tool?.command ? { via: tool.command.slice(0, 120) } : {}),
	                        });
	                    }
	                }
	            }
	            continue;
	        }
	        if (ev.type === 'assistant' && Array.isArray(content)) {
	            for (const block of content) {
	                if (block?.type === 'text') {
	                    const text = String(block.text ?? '').trim();
	                    if (text)
	                        events.push({ kind: 'say', text, line: i });
	                }
	                else if (block?.type === 'tool_use') {
	                    const name = String(block.name ?? '');
	                    const input = (block.input ?? {});
	                    const id = String(block.id ?? '');
	                    if (SAVE_TOOL.test(name)) {
	                        events.push({ kind: 'save', text: String(input.title ?? input.summary ?? input.reason ?? name).slice(0, 200), line: i });
	                        toolNames.set(id, { name });
	                    }
	                    else if (EDIT_TOOLS.has(name)) {
	                        const file = String(input.file_path ?? input.notebook_path ?? '');
	                        if (file)
	                            events.push({ kind: 'edit', text: file, line: i });
	                        toolNames.set(id, { name });
	                    }
	                    else if (SHELL_TOOLS.has(name)) {
	                        const command = String(input.command ?? '').replace(/\s+/g, ' ').trim();
	                        if (command)
	                            events.push({ kind: SAVE_COMMAND.test(command) ? 'save' : 'command', text: command.slice(0, 200), line: i });
	                        toolNames.set(id, { name, command });
	                    }
	                    else {
	                        toolNames.set(id, { name });
	                    }
	                }
	            }
	        }
	    }
	    return { events, endLine: complete, sessionId, cwd };
	}
	/**
	 * Might this stretch have established something? Deliberately loose.
	 *
	 * "because" is in here and is a catch-all: measured over 52 chunks of real
	 * transcript it is present in 81% of them. That is right for "worth a second
	 * look" and far too loose to carry a short stretch on its own — see
	 * STRONG_DECISION_CUE.
	 */
	const DECISION_CUE = /\b(instead of|rather than|decided|chose|trade-?off|root cause|the cause|turns out|because)\b/i;
	/**
	 * A phrase in which a choice is actually stated, rather than merely explained.
	 *
	 * Required instead of DECISION_CUE when there is little prose. A two-line
	 * message containing "because" is not a decision; one saying "we went with X
	 * rather than Y" is. Measured: swapping this in below SHORT_PROSE changed the
	 * rate not at all at chunk scale (42/52 either way), because real 14k chunks
	 * always carry plenty of prose — it exists for the short stretches the Stop hook
	 * actually sees between asks, which that measurement cannot reach.
	 */
	const STRONG_DECISION_CUE = /\b(instead of|rather than|decided|we chose|chose to|chose the|opted for|opted to|went with|going with|settled on|ruled out|rejected|trade-?off|in favour of|in favor of|on purpose|deliberately)\b/i;
	/**
	 * How much prose a stretch needs before a stated choice counts.
	 *
	 * These were 800 and 2500, which meant a decision stated in one clear sentence
	 * was invisible while a rambling one was caught — backwards, since a crisply
	 * stated decision is easier to record and no less worth keeping. Asked for
	 * explicitly, and measured first: at chunk scale, dropping them to zero moved
	 * the nudge rate only from 71% to 77%, because a 14k chunk nearly always clears
	 * any prose bar. The bar binds on the short segments the hook sees between
	 * asks, which is exactly the case this change is for.
	 *
	 * Below SHORT_PROSE the stronger cue is required, so lowering the bar does not
	 * turn "because" in a two-line message into a nudge.
	 */
	//
	// Set from the sentences they have to admit, not from a round number. "We chose
	// Postgres instead of Mongo for the ledger." is 50 characters; at 200 it was
	// still invisible, which was the whole complaint. Below SHORT_PROSE the strong
	// cue is what provides precision, so the length here only has to be long enough
	// to be a sentence.
	const DECISION_PROSE_MIN = 40; // a stretch that also changed code
	// Higher, because with no edits and no errors nothing but the prose is evidence
	// that anything happened at all.
	const DISCUSSION_PROSE_MIN = 120; // a design call with no edits at all
	const SHORT_PROSE = 800; // the old bar; beneath it, demand the strong cue
	/**
	 * Cheap gate before any model call. Most turns are reading, answering and
	 * small edits; spending an extraction on each would cost money and produce the
	 * noise this system exists to avoid.
	 */
	function assessSegment(events) {
	    let edits = 0, errors = 0, lastEdit = -1, lastError = -1, said = 0;
	    let cue = false;
	    let strongCue = false;
	    events.forEach((e, i) => {
	        if (e.kind === 'edit') {
	            edits++;
	            lastEdit = i;
	        }
	        if (e.kind === 'error') {
	            errors++;
	            lastError = i;
	        }
	        if (e.kind === 'say') {
	            said += e.text.length;
	            if (DECISION_CUE.test(e.text))
	                cue = true;
	            if (STRONG_DECISION_CUE.test(e.text))
	                strongCue = true;
	        }
	    });
	    // Little was said, so the phrasing has to carry more weight.
	    const stated = said < SHORT_PROSE ? strongCue : cue;
	    const debugged = errors > 0 && edits > 0;
	    // `edits >= 1`, not 2. At 2 a stretch that changed one file and broke nothing
	    // cleared neither this nor `discussion`, so a one-file decision could never be
	    // asked about at any prose length — 2 of 52 real chunks sat in that hole, both
	    // carrying a cue. Not a threshold, a gap between two branches.
	    const substantialWork = edits >= 1 && said >= DECISION_PROSE_MIN && stated;
	    const discussion = edits === 0 && said >= DISCUSSION_PROSE_MIN && stated;
	    return {
	        worth: debugged || substantialWork || discussion,
	        unresolved: lastError > lastEdit,
	        edits,
	        errors,
	    };
	}
	const LABEL = {
	    prompt: 'USER', say: 'AGENT', edit: 'EDITED', command: 'RAN', error: 'ERROR', save: 'SAVED',
	};
	const CAP = { prompt: 600, say: 900, edit: 200, command: 200, error: 700, save: 200 };
	function line(e) {
	    const t = e.text.length > CAP[e.kind] ? `${e.text.slice(0, CAP[e.kind])}…` : e.text;
	    return `${LABEL[e.kind]}${e.via ? ` [${e.via}]` : ''}: ${t}`;
	}
	/**
	 * Render events as a digest under `budget` characters.
	 *
	 * When it does not fit, the agent's prose goes first, oldest first — errors,
	 * the user's words, and what was edited are the evidence and are kept longest.
	 * The agent's last few messages are also kept: they usually state the cause.
	 */
	function buildDigest(events, budget = 14000) {
	    const rendered = events.map(e => ({ e, text: line(e), keep: true }));
	    const size = () => rendered.reduce((n, r) => n + (r.keep ? r.text.length + 1 : 0), 0);
	    const lastSays = new Set(rendered.map((r, i) => (r.e.kind === 'say' ? i : -1)).filter(i => i >= 0).slice(-3));
	    for (const kind of ['say', 'command', 'edit', 'prompt']) {
	        for (let i = 0; i < rendered.length && size() > budget; i++) {
	            if (rendered[i].e.kind === kind && !(kind === 'say' && lastSays.has(i)))
	                rendered[i].keep = false;
	        }
	    }
	    // Collapse runs of the same file edited repeatedly into one line.
	    const out = [];
	    for (const r of rendered) {
	        if (!r.keep)
	            continue;
	        if (out.length && out[out.length - 1] === r.text && r.e.kind !== 'say')
	            continue;
	        out.push(r.text);
	    }
	    const text = out.join('\n');
	    return text.length > budget ? text.slice(text.length - budget) : text;
	}
	/**
	 * Split a long session into chunks that each fit the budget, cutting only where
	 * the user spoke, so a problem and its fix are not separated mid-thought.
	 */
	function chunkEvents(events, budget = 14000) {
	    const chunks = [];
	    let current = [];
	    let size = 0;
	    for (const e of events) {
	        const len = line(e).length + 1;
	        if (e.kind === 'prompt' && current.length && size + len > budget) {
	            chunks.push(current);
	            current = [];
	            size = 0;
	        }
	        current.push(e);
	        size += len;
	    }
	    if (current.length)
	        chunks.push(current);
	    return chunks;
	}
	
	return transcript;
}

var hasRequiredIndexSource;

function requireIndexSource () {
	if (hasRequiredIndexSource) return indexSource;
	hasRequiredIndexSource = 1;
	// Indexing a Markdown file as a source of truth.
	//
	// A project's CLAUDE.md is often the best engineering memory it has — numbered
	// bugs with causes, rules, and things already proven not to work. DevBrain
	// holding a second copy of that is how two stores drift: fix a bug in the file
	// and the copy keeps confidently telling agents the old version.
	//
	// So the file stays authoritative and DevBrain derives entries from it. Derived
	// entries carry a source anchor and are owned by the indexer: each run
	// reconciles against the current file, so a changed section updates its entry, a
	// deleted section retracts it, and a new section adds one. Drift becomes
	// structurally impossible rather than something anyone has to remember.
	//
	// The corollary, enforced by callers: a derived entry must not be corrected
	// inside DevBrain. The next index would resurrect it. Corrections go to the file.
	Object.defineProperty(indexSource, "__esModule", { value: true });
	indexSource.parseMarkdownSource = parseMarkdownSource;
	indexSource.planIndex = planIndex;
	indexSource.extractErrorPattern = extractErrorPattern;
	indexSource.entryForSection = entryForSection;
	const crypto_1 = crypto;
	const transcript_1 = requireTranscript();
	function slug(text) {
	    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
	}
	function hashOf(text) {
	    return (0, crypto_1.createHash)('sha1').update(text.trim().replace(/\s+/g, ' ')).digest('hex').slice(0, 16);
	}
	/**
	 * Classify a section from the heading it sits under.
	 *
	 * The parent heading is a far better signal than the prose: everything under
	 * "Critical Bugs Fixed" is a fix whatever its wording, and everything under
	 * "Things That Don't Work" is an anti-pattern.
	 */
	function classify(text) {
	    if (/don't work|do not work|don't try|non-negotiable|anti-pattern/.test(text))
	        return 'anti-pattern';
	    if (/bug|fixed|regression|incident/.test(text))
	        return 'fix';
	    if (/decision|chose|rationale|why we/.test(text))
	        return 'decision';
	    if (/architecture|data flow|pipeline|overview|key files|tables|schema|deployment/.test(text))
	        return 'architecture';
	    if (/pattern|prompt|learning|loop/.test(text))
	        return 'pattern';
	    if (/stack|environment|secrets|env|performance/.test(text))
	        return 'stack';
	    return null;
	}
	function typeForPath(path, title) {
	    // The parent heading wins. "calibrationBias Never Applied" sits under
	    // "Critical Bugs Fixed", so it is a fix — reading the title first classified it
	    // as an anti-pattern purely because it contains the word "never", which would
	    // have told agents to avoid doing something that was actually the fix.
	    return classify(path.join(' ').toLowerCase())
	        ?? classify(title.toLowerCase())
	        ?? 'note';
	}
	/** Pull `**Problem**: …` style fields out of a section body. */
	function field(body, name) {
	    const re = new RegExp(`\\*\\*${name}\\*\\*\\s*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-Za-z]|$)`, 'i');
	    const m = body.match(re);
	    return m ? m[1].trim().replace(/\s+/g, ' ') : undefined;
	}
	/**
	 * Split a Markdown document into indexable sections, one per heading.
	 *
	 * Headings are the unit because they are how the document is already organised
	 * and because they give a stable anchor: renaming a heading is a real edit, so
	 * it should retract the old entry and create a new one.
	 */
	function parseMarkdownSource(text, opts = {}) {
	    const { minBody = 40 } = opts;
	    const lines = text.split(/\r?\n/);
	    const sections = [];
	    const stack = [];
	    let current = null;
	    const flush = () => {
	        if (!current)
	            return;
	        const body = current.body.join('\n').trim();
	        // Headings that only introduce sub-headings carry no knowledge of their own.
	        if (body.length < minBody) {
	            current = null;
	            return;
	        }
	        const problem = field(body, 'Problem');
	        const fix = field(body, 'Fix');
	        const where = field(body, 'Where');
	        // Strip a leading "12. " so the title reads as the thing, not the index.
	        const title = current.title.replace(/^\d+[.)]\s*/, '').trim();
	        const anchor = [...current.path.map(slug), slug(current.title)].filter(Boolean).join('/');
	        sections.push({
	            anchor,
	            heading: [...current.path, current.title].join(' > '),
	            path: [...current.path],
	            title,
	            // Problem/Fix is the shape DevBrain wants; keep the raw body otherwise.
	            body: problem && fix ? `${problem}\n\nFix: ${fix}` : body,
	            hash: hashOf(body),
	            type: typeForPath(current.path, current.title),
	            where,
	        });
	        current = null;
	    };
	    for (const line of lines) {
	        const h = line.match(/^(#{1,6})\s+(.*)$/);
	        if (h) {
	            flush();
	            const level = h[1].length;
	            while (stack.length && stack[stack.length - 1].level >= level)
	                stack.pop();
	            current = { level, title: h[2].trim(), path: stack.map(s => s.title), body: [] };
	            stack.push({ level, title: h[2].trim() });
	            continue;
	        }
	        if (current)
	            current.body.push(line);
	    }
	    flush();
	    return sections;
	}
	/**
	 * Work out what indexing this file would change, without writing anything.
	 *
	 * Kept separate from applying it so the CLI can show a plan, and so the
	 * reconciliation logic is testable without a database.
	 */
	/**
	 * @param opts.force Re-derive every section even when its body is unchanged.
	 *
	 * The hash answers "did the source change", which is not the same question as
	 * "would indexing produce something different now". When the indexer itself
	 * learns something — extracting error patterns, say — every previously indexed
	 * section is stale in a way no hash can see, and without this they would stay
	 * frozen at the old logic forever.
	 */
	function planIndex(sections, existing, file, opts = {}) {
	    const derived = existing.filter(e => e.source?.file === file && !e.supersededBy);
	    const byAnchor = new Map(derived.map(e => [e.source.anchor, e]));
	    const plan = { added: [], updated: [], unchanged: 0, removed: [] };
	    const seen = new Set();
	    for (const section of sections) {
	        seen.add(section.anchor);
	        const match = byAnchor.get(section.anchor);
	        if (!match)
	            plan.added.push(section);
	        else if (opts.force || match.source.hash !== section.hash)
	            plan.updated.push({ section, entry: match });
	        else
	            plan.unchanged++;
	    }
	    for (const entry of derived) {
	        if (!seen.has(entry.source.anchor))
	            plan.removed.push(entry);
	    }
	    return plan;
	}
	/** Build the stored entry for a parsed section. */
	// A template lifted out of source code rather than a real error anyone could
	// paste: "Gemini error {errorCode}", "Failed: ${reason}".
	const PLACEHOLDER = /\$\{[^}]*\}|\{[a-zA-Z_][\w.]*\}|<[A-Z_]{2,}>|%[sd]\b/;
	/** A JSON error payload, which is an error by shape without saying "Error". */
	const JSON_ERROR = /^\{[\s\S]*"(?:error|message|code)"\s*:/;
	/**
	 * A named error type anywhere in the line: `QuotaExceededError`, `TypeError`.
	 *
	 * The capital is doing the work. It admits the token even with no colon and no
	 * message after it — real files name errors that way, in a heading or mid
	 * sentence — while "error handling" and "a permissions error" stay out, because
	 * a lowercase `error` can never match.
	 */
	const NAMED_ERROR = /\b[A-Z][\w.]*(?:Error|Exception)\b/;
	/**
	 * A verbatim error string from a section body, or undefined.
	 *
	 * This is what makes an indexed entry reachable by the failure hook, which
	 * matches a failing command's output against stored error patterns. Without it
	 * a CLAUDE.md bug write-up can only be found by someone already searching for
	 * it — and on a real file the errors are sitting right there in the prose,
	 * usually inside backticks. Measured before this existed: 0 of 85 indexed
	 * entries carried a pattern, so none of them could ever be recalled.
	 *
	 * Shape is required, not the word "error". Prose that merely describes one
	 * ("it threw a permissions error") is not something anyone can paste.
	 */
	function extractErrorPattern(body, title = '') {
	    const candidates = [];
	    // An explicit field wins: the author already said this is the error. Prefer a
	    // backticked span inside it, because field() reads to the next field and so
	    // carries the sentences after the error along with it.
	    //
	    // "Problem" is here because that is what real files call it. Looking only for
	    // "Error" found nothing at all in an 85-section CLAUDE.md whose every bug was
	    // written up under **Problem**.
	    for (const name of ['Error', 'Symptom', 'Problem']) {
	        const explicit = field(body, name);
	        if (!explicit)
	            continue;
	        for (const m of explicit.matchAll(/`([^`]{6,200})`/g))
	            candidates.push(m[1]);
	        candidates.push(explicit);
	    }
	    // Then fenced blocks and inline code, where a verbatim error normally goes.
	    for (const m of body.matchAll(/```[a-zA-Z]*\n([\s\S]*?)```/g))
	        candidates.push(...m[1].split('\n'));
	    for (const m of body.matchAll(/`([^`\n]{6,200})`/g))
	        candidates.push(m[1]);
	    // The heading often carries the error name when the body only describes it.
	    if (title)
	        candidates.push(title);
	    candidates.push(...body.split('\n'));
	    for (const raw of candidates) {
	        const line = raw
	            .replace(/^[\s>*\-+#]+/, '') // bullets, quotes and heading markers
	            .replace(/^\d+\.\s*/, '') // "6. localStorage QuotaExceededError"
	            .replace(/`/g, '')
	            .trim();
	        if (line.length < 6 || line.length > 200)
	            continue;
	        if (PLACEHOLDER.test(line))
	            continue;
	        if ((0, transcript_1.looksLikeError)(line, false) || JSON_ERROR.test(line) || NAMED_ERROR.test(line))
	            return line;
	    }
	    return undefined;
	}
	function entryForSection(section, project, file, opts) {
	    const source = {
	        file,
	        anchor: section.anchor,
	        hash: section.hash,
	        heading: section.heading,
	        indexedAt: Date.now(),
	    };
	    return {
	        id: opts.id,
	        projectId: project.id,
	        // Derived from a file, not captured from work. Said explicitly so the two
	        // are distinguishable without inspecting `source` on every row.
	        origin: 'indexed',
	        type: section.type,
	        title: section.title.slice(0, 120),
	        content: section.body,
	        // Tagged so derived knowledge is distinguishable at a glance from work that
	        // was actually done and captured.
	        tags: ['claude-md', ...section.path.slice(-1).map(slug)].filter(Boolean).slice(0, 4),
	        embedding: opts.embedding,
	        createdAt: opts.createdAt ?? Date.now(),
	        confidence: 'observation',
	        // Lift the verbatim error out of the prose, so the failure hook can reach
	        // this entry at all. Without it an indexed section is invisible to the one
	        // retrieval path that fires unasked.
	        ...(() => {
	            const errorPattern = extractErrorPattern(section.body, section.title);
	            return errorPattern ? { errorPattern } : {};
	        })(),
	        source,
	    };
	}
	
	return indexSource;
}

var agentHooks = {};

var hasRequiredAgentHooks;

function requireAgentHooks () {
	if (hasRequiredAgentHooks) return agentHooks;
	hasRequiredAgentHooks = 1;
	(function (exports) {
		// Wiring DevBrain into a coding agent's lifecycle, so capture and recall happen
		// without the agent having to remember to do either.
		//
		// Instructions in DEV_CONTEXT.md ask the agent to call get_context first and
		// task_end last. Agents follow that unevenly, and every miss is silent. Hooks
		// are run by the agent's harness, not chosen by the model, so they cannot be
		// forgotten:
		//
		//   SessionStart     — inject this project's briefing into the agent's context
		//   UserPromptSubmit — search memory for what was just asked, before any work
		//                      starts (see recall.ts)
		//   PostToolUse      — after a shell command fails, match the error against
		//                      what is stored
		//   Stop             — after each turn, if the work established something and
		//                      the agent saved nothing, ask it to record it (see
		//                      turnReview.ts)
		//
		// Neither needs a model: the agent does all the writing, DevBrain stores it.
		//
		// This file only edits the settings object; the CLI does the file I/O.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.HOOK_EVENTS = exports.AGENT_LOADED_SOURCE_FILES = void 0;
		exports.isAlreadyInAgentContext = isAlreadyInAgentContext;
		exports.briefingEntries = briefingEntries;
		exports.isFileTool = isFileTool;
		exports.hookArg = hookArg;
		exports.withDevbrainHooks = withDevbrainHooks;
		exports.withoutDevbrainHooks = withoutDevbrainHooks;
		exports.installedDevbrainHooks = installedDevbrainHooks;
		exports.formatSessionBriefing = formatSessionBriefing;
		exports.formatFirstSession = formatFirstSession;
		const search_1 = requireSearch();
		/**
		 * Files a coding agent already has in front of it without DevBrain's help.
		 * Claude Code loads CLAUDE.md and AGENTS.md into every session.
		 *
		 * So entries indexed from them must not go into the briefing: that would spend
		 * the agent's context restating a file it can already read, and a shorter
		 * version of it. They stay in search, and they still reach *other* projects —
		 * which is the actual point of indexing a file. CLAUDE.md is per-repo and
		 * cannot be searched by error text; indexing makes its knowledge findable by a
		 * pasted error and reusable in every other repo, without copying it anywhere.
		 */
		exports.AGENT_LOADED_SOURCE_FILES = ['CLAUDE.md', 'AGENTS.md'];
		function baseName(file) {
		    return file.replace(/\\/g, '/').split('/').pop() ?? file;
		}
		/** True when this entry came from a file the agent has already loaded itself. */
		function isAlreadyInAgentContext(entry, projectId) {
		    return !!projectId && entry.projectId === projectId && !!entry.source
		        && exports.AGENT_LOADED_SOURCE_FILES.includes(baseName(entry.source.file));
		}
		/**
		 * The entries a session-start briefing should rank over: everything except this
		 * project's own CLAUDE.md, which the agent already has.
		 */
		function briefingEntries(all, projectId) {
		    return all.filter(e => !isAlreadyInAgentContext(e, projectId));
		}
		exports.HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PostToolUseFailure', 'Stop'];
		const HOOK_ARG = {
		    SessionStart: 'session-start',
		    // What the user just asked for, searched against memory before the agent
		    // starts. PostToolUse only fires once something has already failed, which is
		    // late: most work begins with a sentence, not a stack trace.
		    UserPromptSubmit: 'user-prompt',
		    PostToolUse: 'post-tool',
		    // Claude Code does not send a failed tool call to PostToolUse at all: a Bash
		    // command that exits non-zero arrives here, with its output in `error`. With
		    // only PostToolUse installed, the one moment recall exists for — a command
		    // failing with an error memory already holds — never reached DevBrain.
		    PostToolUseFailure: 'post-tool',
		    Stop: 'stop',
		};
		/**
		 * Tool calls PostToolUse is installed for.
		 *
		 * Every tool, filtered in the hook rather than here. It used to be Bash and
		 * PowerShell only, on the reasoning that a failure is something a shell
		 * reports — but that is where it was wrong. A production error is usually found
		 * by *reading* it: a log query, a database probe, a deploy status. On a project
		 * with the Supabase connector those run as MCP tools, so DevBrain never saw the
		 * output and never nudged, while holding the exact entry for the error on
		 * screen. Reported from real use: "nudges at the moment of debugging: zero".
		 *
		 * The cost of widening is false positives from tools whose output is source
		 * code rather than a result, and those are excluded by name in isFileTool.
		 */
		const POST_TOOL_MATCHERS = ['*'];
		/**
		 * Tools whose output is file content, not a result.
		 *
		 * Source code is full of the word Error, so scanning it for failures produces
		 * them. For shell commands the equivalent guard is isReadOnlyCommand; this is
		 * the same rule for tools that take no command at all.
		 */
		const FILE_TOOLS = new Set([
		    'Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'NotebookRead',
		    'Glob', 'Grep', 'LS', 'TodoWrite', 'ExitPlanMode',
		]);
		function isFileTool(name) {
		    return FILE_TOOLS.has(name);
		}
		/** The CLI argument for a hook event, e.g. `devbrain hook stop`. */
		function hookArg(event) {
		    return HOOK_ARG[event];
		}
		const OURS = /(^|[\s"'/\\])devbrain(\.cmd|\.js)?["']?\s+hook\s/;
		function isOurs(h) {
		    return typeof h?.command === 'string' && OURS.test(h.command);
		}
		/**
		 * Settings with DevBrain's hooks added, replacing any older DevBrain hooks
		 * (including events an earlier version installed and this one no longer uses) and
		 * leaving every other hook exactly as it was. Idempotent.
		 */
		function withDevbrainHooks(settings, binary = 'devbrain') {
		    const cleaned = withoutDevbrainHooks(settings);
		    const hooks = { ...(cleaned.hooks ?? {}) };
		    for (const event of exports.HOOK_EVENTS) {
		        const handler = {
		            type: 'command',
		            command: `${binary} hook ${HOOK_ARG[event]}`,
		            // Any of these may read the store, but most runs never do: each decides
		            // locally first — Stop from the transcript, PostToolUse from whether the
		            // output even looks like a failure.
		            timeout: 20,
		        };
		        const groups = event === 'PostToolUse' || event === 'PostToolUseFailure'
		            ? POST_TOOL_MATCHERS.map(matcher => ({ matcher, hooks: [handler] }))
		            : [{ hooks: [handler] }];
		        hooks[event] = [...(hooks[event] ?? []), ...groups];
		    }
		    return { ...cleaned, hooks };
		}
		/** Settings with every DevBrain hook removed; other hooks untouched. */
		function withoutDevbrainHooks(settings) {
		    if (!settings.hooks)
		        return { ...settings };
		    const hooks = {};
		    for (const [event, groups] of Object.entries(settings.hooks)) {
		        const kept = (Array.isArray(groups) ? groups : [])
		            .map(g => ({ ...g, hooks: (g.hooks ?? []).filter(h => !isOurs(h)) }))
		            .filter(g => g.hooks.length > 0);
		        if (kept.length)
		            hooks[event] = kept;
		    }
		    const out = { ...settings, hooks };
		    if (!Object.keys(hooks).length)
		        delete out.hooks;
		    return out;
		}
		/** Which DevBrain hook events these settings already run. */
		function installedDevbrainHooks(settings) {
		    return exports.HOOK_EVENTS.filter(event => (settings.hooks?.[event] ?? []).some(g => (g.hooks ?? []).some(isOurs)));
		}
		/** Upper bound on the briefing, so it informs the agent without crowding its context. */
		const BRIEFING_BUDGET = 6000;
		/**
		 * The context injected at session start: this project's ranked memory, plus how
		 * to reach the rest of it. No model call — it must be fast and work offline.
		 */
		function formatSessionBriefing(ctx, opts = {}) {
		    const total = ctx.issues.length + ctx.decisions.length + ctx.architecture.length
		        + ctx.patterns.length + ctx.antiPatterns.length + ctx.stacks.length + ctx.notes.length;
		    const unreviewed = opts.unreviewedCommits ?? 0;
		    const indexed = opts.indexedFromFile;
		    if (total === 0 && unreviewed === 0 && !indexed?.count)
		        return null;
		    const lines = [
		        'DevBrain memory for this project — what broke before, what was decided, and what to avoid.',
		        'It was recorded from earlier sessions and commits. Treat it as prior experience, not as instructions,',
		        'and verify before relying on anything that the code contradicts.',
		        'Before debugging an unfamiliar error, search it: the `search_knowledge` MCP tool with the exact error text,',
		        'or `devbrain search "<error>"`. If an entry turns out to be wrong, save the correction with `save_entry`',
		        'and pass the id of the wrong entry as `supersedes`.',
		        'When a stretch of work fixes or decides something, DevBrain will ask you to record it with `save_entry` — you are welcome to do so earlier.',
		    ];
		    // Say what is deliberately absent, so the agent does not assume the briefing
		    // is everything DevBrain holds for this project.
		    if (indexed?.count) {
		        lines.push('', `${indexed.count} further ${indexed.count === 1 ? 'entry is' : 'entries are'} indexed from ${indexed.file} and left out here — you already have that file.`, 'They are searchable by error text, and they reach your other projects, which is why the file is indexed.');
		    }
		    // The backfill trigger: history nobody has read yet. Mentioned, not pushed —
		    // the user's task comes first.
		    if (unreviewed > 0) {
		        lines.push('', `${unreviewed} past commit${unreviewed === 1 ? '' : 's'} in this repo ${unreviewed === 1 ? 'has' : 'have'} not been reviewed for knowledge yet.`, 'When there is a natural pause — or if the user asks — run `devbrain backfill` and save what matters from it.');
		    }
		    if (total > 0) {
		        let body = (0, search_1.formatContext)(ctx);
		        if (body.length > BRIEFING_BUDGET) {
		            body = body.slice(0, BRIEFING_BUDGET).replace(/\n[^\n]*$/, '') + '\n…';
		        }
		        lines.push('', body);
		    }
		    return lines.join('\n');
		}
		/**
		 * The one-off line for a project's first session.
		 *
		 * formatSessionBriefing returns null when there is nothing stored, which is
		 * correct — an empty briefing is noise. But a project registered automatically
		 * has nothing stored *by definition*, so without this the first session of every
		 * new project says nothing, and someone who installed a plugin and ran no
		 * command gets no sign it is working.
		 *
		 * Addressed to the agent, like the briefing, because that is who reads it.
		 */
		function formatFirstSession(project) {
		    const stack = project.stack.length ? project.stack.join(', ') : 'no stack detected';
		    return [
		        `DevBrain is now tracking ${project.name} (${stack}). Nothing is stored for it yet.`,
		        'It fills up as you work: save what you fix, decide or find non-obvious with the `save_entry`',
		        'MCP tool — the root cause first, then the fix, and the exact error text as `error_pattern`.',
		        'From the next session on, what you record here comes back before the task that needs it.',
		    ].join('\n');
		}
		
	} (agentHooks));
	return agentHooks;
}

var stuck = {};

var hasRequiredStuck;

function requireStuck () {
	if (hasRequiredStuck) return stuck;
	hasRequiredStuck = 1;
	// Noticing when an agent is going in circles, and making it stop and think.
	//
	// An agent that is stuck does not feel stuck. It has a plausible next thing to
	// try at every step, so it keeps trying variations of the same thing — the
	// documented failure mode behind "my agent ran for six hours on a two-minute
	// task". The literature calls the remedy a circuit breaker, and it agrees on
	// two points: the trigger is repetition rather than elapsed time, and the
	// response has to force a change of approach, because an agent told only that
	// it is stuck will try the same thing more carefully.
	//
	// DevBrain can do better than a generic breaker because it already reads the
	// transcript and already holds what went wrong here before. The caller supplies
	// anything memory knows about the error; this module decides whether to speak.
	//
	// Pure: events in, signals out. No I/O, no model.
	Object.defineProperty(stuck, "__esModule", { value: true });
	stuck.errorFingerprint = errorFingerprint;
	stuck.detectStuck = detectStuck;
	stuck.episodeFingerprints = episodeFingerprints;
	stuck.formatStepBack = formatStepBack;
	const DEFAULTS = { failureLimit: 3, editLimit: 4 };
	/**
	 * Reduce an error to what makes it *that* error.
	 *
	 * Line numbers, paths, ports, hashes and timestamps all move between runs of
	 * the same failure, so comparing raw text would see three distinct errors where
	 * a person sees one. Stripping them is what makes repetition visible.
	 */
	function errorFingerprint(text) {
	    return String(text)
	        .toLowerCase()
	        .split('\n')[0]
	        .replace(/[a-z]:[\\/][^\s:]+/g, '<path>') // windows absolute paths
	        .replace(/[\w.-]+[\\/][\w.\\/-]+/g, '<path>') // any path with a separator, relative included
	        .replace(/\b[\w-]+\.[a-z0-9]{1,4}\b/g, '<file>') // a bare filename: the same error in another file
	        .replace(/\b0x[0-9a-f]+\b/g, '<hex>')
	        .replace(/\b\d[\d.:-]*\b/g, '<n>') // line:col, ports, versions, dates
	        .replace(/\s+/g, ' ')
	        .trim()
	        .slice(0, 120);
	}
	/** Normalise a command so `npm test -- -t x` and `npm test` are not confused. */
	function commandFingerprint(command) {
	    return command.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
	}
	/** The tail of a path: an absolute Windows path reads as noise in a one-line warning. */
	function shortPath(path) {
	    return path.replace(/\\/g, '/').split('/').slice(-2).join('/');
	}
	function tally(items) {
	    const counts = new Map();
	    for (const item of items)
	        counts.set(item, (counts.get(item) ?? 0) + 1);
	    return counts;
	}
	/**
	 * Signals that this stretch of work is going in circles, strongest first.
	 *
	 * Returns nothing for ordinary debugging — an error, an edit, a different
	 * error — because that is progress, and interrupting it would make the warning
	 * worthless when it matters.
	 */
	function detectStuck(events, opts = {}) {
	    const failureLimit = opts.failureLimit ?? DEFAULTS.failureLimit;
	    const editLimit = opts.editLimit ?? DEFAULTS.editLimit;
	    const warned = new Set(opts.warned ?? []);
	    const errors = events.filter(e => e.kind === 'error');
	    const edits = events.filter(e => e.kind === 'edit');
	    const signals = [];
	    // The same error coming back, however the agent reworded the attempt.
	    for (const [print, count] of tally(errors.map(e => errorFingerprint(e.text)))) {
	        if (count < failureLimit)
	            continue;
	        const example = errors.find(e => errorFingerprint(e.text) === print);
	        signals.push({
	            kind: 'repeated-failure',
	            subject: example.text.split('\n')[0].slice(0, 160),
	            count,
	            fingerprint: 'err:' + print,
	        });
	    }
	    // The same command failing again and again. Counted from the commands that
	    // produced an error, so a command re-run successfully is not a loop.
	    for (const [cmd, count] of tally(errors.map(e => e.via).filter((c) => !!c).map(commandFingerprint))) {
	        if (count < failureLimit)
	            continue;
	        signals.push({ kind: 'retry-loop', subject: cmd, count, fingerprint: 'cmd:' + cmd });
	    }
	    // One file rewritten repeatedly, but only while the *same* error keeps coming
	    // back. Thrashing is not a signal on its own: editing a file many times while
	    // different errors appear and get fixed is what productive work looks like,
	    // and gating only on "some errors happened" fired on exactly that — 30 edits
	    // across a busy window with six unrelated, already-resolved errors in it.
	    // Without a recurring failure there is no evidence the edits are not working.
	    if (signals.some(s => s.kind === 'repeated-failure')) {
	        for (const [file, count] of tally(edits.map(e => e.text))) {
	            if (count < editLimit)
	                continue;
	            signals.push({ kind: 'thrashing', subject: shortPath(file), count, fingerprint: 'file:' + file });
	        }
	    }
	    return signals
	        .filter(s => !warned.has(s.fingerprint))
	        .sort((a, b) => b.count - a.count);
	}
	/**
	 * Every fingerprint this stretch could raise a signal for later, threshold or
	 * no threshold.
	 *
	 * Marked together when an interruption goes out, because the three kinds are
	 * three views of one episode: the error, the command that produced it, and the
	 * file being rewritten. Marking only the ones that had already crossed meant
	 * the next one crossed a turn later and interrupted again about the same
	 * problem — one episode, two interruptions, which is how a warning becomes
	 * something to route around.
	 */
	function episodeFingerprints(events) {
	    const out = new Set();
	    for (const e of events) {
	        if (e.kind === 'error') {
	            out.add('err:' + errorFingerprint(e.text));
	            if (e.via)
	                out.add('cmd:' + commandFingerprint(e.via));
	        }
	        if (e.kind === 'edit')
	            out.add('file:' + e.text);
	    }
	    return [...out];
	}
	/**
	 * The interruption itself.
	 *
	 * Deliberately not "you seem stuck, try again". It names what is repeating,
	 * hands over anything memory holds about it, and asks for the two things that
	 * actually break a loop: the assumption that has gone unexamined, and an
	 * approach different in kind from what has been tried. Then it gets out of the
	 * way — the agent decides, the hook does not.
	 */
	function formatStepBack(signals, related = []) {
	    if (!signals.length)
	        return null;
	    const lines = ['DevBrain: step back for a moment — this looks like a loop, not progress.', ''];
	    for (const s of signals.slice(0, 3)) {
	        if (s.kind === 'repeated-failure') {
	            lines.push(`- the same error has come back ${s.count} times: ${s.subject}`);
	        }
	        else if (s.kind === 'retry-loop') {
	            lines.push(`- \`${s.subject}\` has failed ${s.count} times`);
	        }
	        else {
	            lines.push(`- ${s.subject} has been rewritten ${s.count} times and the errors have not stopped`);
	        }
	    }
	    if (related.length) {
	        lines.push('', 'DevBrain has seen this before:', ...related.map(r => '  ' + r));
	    }
	    lines.push('', 'Before editing anything else, answer these in one or two lines each:', '  1. What have you been assuming is true that you have not actually verified?', '  2. What would you check to prove it, rather than working around it?', '  3. What approach is different in kind from what you have tried — not another variation of it?', '', 'Then either take that approach, or tell the user what you are stuck on and what you need.', 'Repeating the last attempt more carefully is the one option to rule out.');
	    return lines.join('\n');
	}
	
	return stuck;
}

var sessionCursor = {};

var hasRequiredSessionCursor;

function requireSessionCursor () {
	if (hasRequiredSessionCursor) return sessionCursor;
	hasRequiredSessionCursor = 1;
	// How far each agent session's transcript has been reviewed.
	//
	// One small file per session under ~/.devbrain/sessions, holding the line up to
	// which DevBrain has already asked about (Stop hook) or handed over (backfill)
	// that session's work. It is what lets the Stop hook run after every turn
	// without asking twice, and lets backfill pick up a past session where the hook
	// or an earlier backfill left off. Transcripts are per machine, so this is too.
	Object.defineProperty(sessionCursor, "__esModule", { value: true });
	sessionCursor.readCursor = readCursor;
	sessionCursor.writeCursor = writeCursor;
	sessionCursor.markSurfaced = markSurfaced;
	sessionCursor.markActiveSession = markActiveSession;
	sessionCursor.activeSession = activeSession;
	sessionCursor.markAsked = markAsked;
	sessionCursor.takeAsk = takeAsk;
	sessionCursor.markWarned = markWarned;
	const fs_1 = require$$0;
	const path_1 = require$$1;
	const os_1 = require$$2;
	function sessionsDir() {
	    return (0, path_1.join)((0, os_1.homedir)(), '.devbrain', 'sessions');
	}
	function cursorPath(sessionId) {
	    return (0, path_1.join)(sessionsDir(), `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}.json`);
	}
	/** The file as it stands, unnormalised. */
	function readRaw(sessionId) {
	    try {
	        return JSON.parse((0, fs_1.readFileSync)(cursorPath(sessionId), 'utf-8'));
	    }
	    catch {
	        return {};
	    }
	}
	function readCursor(sessionId) {
	    const parsed = readRaw(sessionId);
	    return {
	        line: parsed.line ?? 0,
	        updatedAt: parsed.updatedAt ?? 0,
	        ...(Array.isArray(parsed.surfaced) ? { surfaced: parsed.surfaced } : {}),
	        ...(Array.isArray(parsed.warned) ? { warned: parsed.warned } : {}),
	    };
	}
	/**
	 * Merge a change into the session's state, keeping the fields not named.
	 *
	 * Merged onto the raw file rather than onto readCursor's view, because a
	 * normaliser that forgets a field would quietly erase it on the next write of
	 * any other field — which is exactly what happened to `warned`, leaving the
	 * step-back interruption firing again every turn.
	 */
	function patchState(sessionId, patch) {
	    const next = { ...readRaw(sessionId), ...patch, updatedAt: Date.now() };
	    (0, fs_1.mkdirSync)(sessionsDir(), { recursive: true });
	    (0, fs_1.writeFileSync)(cursorPath(sessionId), JSON.stringify(next), 'utf-8');
	}
	function writeCursor(sessionId, line) {
	    patchState(sessionId, { line });
	}
	/**
	 * Record entries DevBrain volunteered, so the same past fix is not pushed at
	 * the agent again every time a flaky command fails.
	 *
	 * Capped: a long session must not grow this file without bound, and an id old
	 * enough to fall off is one the agent saw long ago anyway.
	 */
	function markSurfaced(sessionId, ids) {
	    if (!ids.length)
	        return;
	    const seen = readCursor(sessionId).surfaced ?? [];
	    patchState(sessionId, { surfaced: [...new Set([...seen, ...ids])].slice(-200) });
	}
	/**
	 * Which session is currently working in which project.
	 *
	 * The saves happen through the MCP tool and the CLI, neither of which is told
	 * the session id — only the hooks know it. So the hooks record it here, keyed
	 * by project, and the save paths look it up. Two sessions in one repo at once
	 * means the later one wins; the cost is an entry attributed to the wrong
	 * sibling session, which is why nothing depends on this being exact.
	 */
	const ACTIVE_PATH = () => (0, path_1.join)(sessionsDir(), 'active.json');
	/** Past this, a recorded session is assumed finished rather than idle. */
	const ACTIVE_TTL_MS = 12 * 60 * 60 * 1000;
	function markActiveSession(projectPath, sessionId) {
	    if (!projectPath || !sessionId)
	        return;
	    let map = {};
	    try {
	        map = JSON.parse((0, fs_1.readFileSync)(ACTIVE_PATH(), 'utf-8'));
	    }
	    catch { /* first write */ }
	    map[projectPath] = { sessionId, at: Date.now() };
	    (0, fs_1.mkdirSync)(sessionsDir(), { recursive: true });
	    (0, fs_1.writeFileSync)(ACTIVE_PATH(), JSON.stringify(map), 'utf-8');
	}
	function activeSession(projectPath) {
	    try {
	        const row = JSON.parse((0, fs_1.readFileSync)(ACTIVE_PATH(), 'utf-8'))[projectPath];
	        if (!row)
	            return undefined;
	        return Date.now() - row.at < ACTIVE_TTL_MS ? row.sessionId : undefined;
	    }
	    catch {
	        return undefined;
	    }
	}
	/**
	 * Past this, an outstanding ask is treated as unanswered rather than pending.
	 *
	 * Generous, because the agent may work for a while before it writes anything
	 * down, but bounded: an ask from this morning must not make an unprompted save
	 * this afternoon look like a reply to it.
	 */
	const ASK_TTL_MS = 15 * 60 * 1000;
	/** The Stop hook has just asked this session to record something. */
	function markAsked(sessionId) {
	    if (!sessionId)
	        return;
	    patchState(sessionId, { askedAt: Date.now() });
	}
	/**
	 * Was this save a reply to DevBrain asking? Consumes the ask either way.
	 *
	 * Consuming matters: the agent may save three entries from one prompt, and
	 * only the first is the reply. Counting all three as prompted would hide the
	 * two it volunteered, which is the behaviour actually worth measuring.
	 */
	function takeAsk(sessionId) {
	    if (!sessionId)
	        return false;
	    const asked = readRaw(sessionId).askedAt;
	    if (!asked)
	        return false;
	    patchState(sessionId, { askedAt: undefined });
	    return Date.now() - asked < ASK_TTL_MS;
	}
	/** Record that these loops have been raised, so each is named once per session. */
	function markWarned(sessionId, fingerprints) {
	    if (!fingerprints.length)
	        return;
	    const seen = readCursor(sessionId).warned ?? [];
	    patchState(sessionId, { warned: [...new Set([...seen, ...fingerprints])].slice(-100) });
	}
	
	return sessionCursor;
}

var backfill = {};

var hasRequiredBackfill;

function requireBackfill () {
	if (hasRequiredBackfill) return backfill;
	hasRequiredBackfill = 1;
	(function (exports) {
		// Backfill: history the agent never saw, reviewed by the agent.
		//
		// The Stop hook covers work as it happens. What came before — commits made
		// before DevBrain was installed, sessions that ended before the hook existed —
		// has nobody to ask in the moment. It used to be handed to a model of
		// DevBrain's own. Now it goes to the same writer as everything else: the coding
		// agent. `devbrain backfill` prints a bounded batch of unreviewed commits and
		// past-session evidence with instructions; the agent reads it, saves what
		// matters, and runs it again for the next batch.
		//
		// Pure: commits and transcripts in, text out. The CLI does git, files and marking.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.BACKFILL_BATCH_BUDGET = exports.SESSION_CHUNK_BUDGET = void 0;
		exports.commitExcerpt = commitExcerpt;
		exports.nextSessionChunk = nextSessionChunk;
		exports.formatBackfillBatch = formatBackfillBatch;
		const transcript_1 = requireTranscript();
		const turnReview_1 = devbrainCore2.requireTurnReview();
		/** Characters of diff shown per commit; the agent can `git show` for the rest. */
		const COMMIT_DIFF_BUDGET = 1800;
		/** Characters of session evidence shown per session chunk. */
		exports.SESSION_CHUNK_BUDGET = 8000;
		/** Upper bound on one batch, so it fits comfortably in an agent's context. */
		exports.BACKFILL_BATCH_BUDGET = 24000;
		/** A commit as the agent should see it: what it said, what it touched, how. */
		function commitExcerpt(c, budget = COMMIT_DIFF_BUDGET) {
		    const date = new Date(c.timestamp).toISOString().slice(0, 10);
		    const [stat, ...rest] = c.diff.split('\n\n');
		    const diff = rest.join('\n\n').trim();
		    const shown = diff.length > budget ? `${diff.slice(0, budget)}\n… (truncated — \`git show ${c.hash.slice(0, 10)}\` for the rest)` : diff;
		    return [
		        `### commit ${c.hash.slice(0, 10)} · ${date}`,
		        c.message,
		        '',
		        stat.trim(),
		        ...(shown ? ['', '```diff', shown, '```'] : []),
		    ].join('\n');
		}
		/**
		 * The next stretch of a past session worth the agent's attention, read from the
		 * session's cursor. Stretches with no fix and no decision are skipped over, so
		 * the agent is never handed a session of file reads.
		 */
		function nextSessionChunk(jsonl, fromLine, budget = exports.SESSION_CHUNK_BUDGET) {
		    const { events, endLine } = (0, transcript_1.parseTranscript)(jsonl, fromLine);
		    const chunks = (0, transcript_1.chunkEvents)(events, budget);
		    for (const [i, chunk] of chunks.entries()) {
		        const assessment = (0, transcript_1.assessSegment)(chunk);
		        // Already recorded by the agent at the time: nothing to hand over again.
		        if (!assessment.worth || chunk.some(e => e.kind === 'save'))
		            continue;
		        return { digest: (0, transcript_1.buildDigest)(chunk, budget), toLine: chunks[i + 1]?.[0]?.line ?? endLine };
		    }
		    return { digest: null, toLine: endLine };
		}
		function formatBackfillBatch(b) {
		    const out = [
		        `# DevBrain backfill — ${b.project}`,
		        '',
		        'Below is past work in this repo that has not been reviewed for knowledge yet:',
		        `${b.commits.length} commit${b.commits.length === 1 ? '' : 's'} and ${b.sessions.length} stretch${b.sessions.length === 1 ? '' : 'es'} of earlier agent sessions.`,
		        'Read it and record what a developer facing the same situation months from now would want to know —',
		        'bugs and their real causes, decisions and the alternatives rejected, things that looked right and were not.',
		        'Most commits hold nothing like that: skip version bumps, renames, formatting, routine features.',
		        '',
		        'For each item worth keeping, call the DevBrain `save_entry` tool',
		        ...turnReview_1.ENTRY_GUIDE,
		        '',
		        b.markedReviewed
		            ? 'Everything below is now marked reviewed, so it will not be shown again.'
		            : 'Preview only — nothing below has been marked reviewed.',
		    ];
		    if (b.commits.length) {
		        out.push('', '## Commits', '');
		        for (const c of b.commits)
		            out.push(commitExcerpt(c), '');
		    }
		    if (b.sessions.length) {
		        out.push('', '## Earlier agent sessions', '', 'USER is what the developer said, AGENT what the agent concluded, ERROR failing output, EDITED a changed file.', '');
		        for (const s of b.sessions)
		            out.push(`### session ${s.sessionId.slice(0, 8)}`, '', s.digest, '');
		    }
		    const left = b.remainingCommits + b.remainingSessions;
		    out.push('---', left
		        ? `Still unreviewed: ${b.remainingCommits} commit${b.remainingCommits === 1 ? '' : 's'} and ${b.remainingSessions} session${b.remainingSessions === 1 ? '' : 's'}. ` +
		            'After saving from this batch, run `devbrain backfill` again for the next one.'
		        : 'That was everything — history is fully reviewed.');
		    return out.join('\n');
		}
		
	} (backfill));
	return backfill;
}

var recall = {};

var hasRequiredRecall;

function requireRecall () {
	if (hasRequiredRecall) return recall;
	hasRequiredRecall = 1;
	(function (exports) {
		// Recall at the moment it pays off: a command just failed.
		//
		// Writing was the solved half. Reading was not: memory went in and nothing took
		// it back out, because retrieval depended on an agent choosing to search —
		// and the moment it would have helped is the moment the agent is busy reading a
		// stack trace. A review of two days' real use put it plainly: the knowledge base
		// was write-only.
		//
		// So the trigger is mechanical, like the others. After a shell command fails,
		// its error text is matched against stored error patterns, and a confident hit
		// is handed to the agent unasked. No model and no embedding: for a literal
		// error string, overlap with a stored `errorPattern` beats semantic similarity,
		// and it is instant, free and works offline.
		//
		// Pure: failure text and entries in, results and a message out.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.VOLUNTEER_TOP_K = exports.VOLUNTEER_MIN_SEMANTIC = exports.VOLUNTEER_MIN_PATTERN = void 0;
		exports.isWorthLookingUp = isWorthLookingUp;
		exports.recallForFailure = recallForFailure;
		exports.formatRecallForAgent = formatRecallForAgent;
		const types_1 = devbrainCore2.requireTypes();
		const search_1 = requireSearch();
		/**
		 * How strong a match must be before DevBrain volunteers it.
		 *
		 * Nobody asked for this one — it arrives in the middle of debugging — so the
		 * bar is higher than for a search the agent ran deliberately. A weak hit on
		 * every failing command would train the agent to ignore the whole channel,
		 * which costs more than the occasional miss.
		 */
		exports.VOLUNTEER_MIN_PATTERN = 0.45;
		/**
		 * How close in meaning an entry must be to be volunteered when the wording
		 * does not match.
		 *
		 * Set to the same bar a deliberate search uses, not higher, because the
		 * precision here comes from somewhere else: only the top two of an already
		 * ranked list are offered, and that ranking folds in lexical overlap, category
		 * and project. Measured over 176 live entries against eleven hand-written
		 * failures — five with a right answer, six with none — this found 4 of the 5
		 * and fired on 0 of the 6. Raising it to 0.66 found 3, and to 0.70 found 2,
		 * with no precision to gain in return.
		 */
		exports.VOLUNTEER_MIN_SEMANTIC = 0.62;
		/** Most entries to volunteer at once. Two is a hint; five is an interruption. */
		exports.VOLUNTEER_TOP_K = 2;
		/**
		 * Whether a message is worth a lookup at all.
		 *
		 * This hook runs on every single thing the user types, so the cost of firing on
		 * the wrong ones is paid constantly. "yes", "continue", "push" carry no problem
		 * to match against, and a hit on them would be a coincidence dressed up as
		 * memory — exactly the noise that teaches an agent to skim past the channel.
		 *
		 * Deliberately crude: a length floor and a list of the replies that actually
		 * recur. Anything cleverer here would be a model, and this must stay instant.
		 */
		const BARE_REPLIES = new Set([
		    'yes', 'no', 'y', 'n', 'ok', 'okay', 'sure', 'yep', 'yeah', 'nope',
		    'continue', 'go', 'go ahead', 'proceed', 'carry on', 'keep going', 'next',
		    'push', 'commit', 'stop', 'wait', 'thanks', 'thank you', 'ty', 'nice',
		    'do it', 'please', 'again', 'retry', 'fix it', 'done',
		]);
		function isWorthLookingUp(prompt) {
		    const text = prompt.trim();
		    // Shorter than this carries no description of a problem, whatever it says.
		    if (text.length < 15)
		        return false;
		    const bare = text.toLowerCase().replace(/[.!?,]+$/g, '').trim();
		    if (BARE_REPLIES.has(bare))
		        return false;
		    // A slash command is an instruction to the harness, not a question for memory.
		    if (text.startsWith('/'))
		        return false;
		    return true;
		}
		/**
		 * Entries worth putting in front of an agent for this failure, best first.
		 *
		 * Two routes in, because they fail in opposite directions.
		 *
		 * Literal — the failure text overlaps a stored error pattern or title. This is
		 * the strongest claim available ("this exact thing happened before") and it is
		 * never wrong, but it only fires when the failure arrives worded the way it was
		 * written down. Measured against five failures phrased the way a tool or a
		 * person actually emits them, rather than quoting the entry, it found none of
		 * them: real stack traces do not quote entry titles, and only 10 of 52 entries
		 * here carry an error pattern at all.
		 *
		 * Semantic — close in meaning, when an embedding is available. This is what
		 * reaches the other 80 percent of the store. On the same five it found four,
		 * and on six unrelated failures it offered nothing.
		 *
		 * Both are capped at topK and both draw from one ranked list, so a literal hit
		 * still outranks a merely similar one.
		 */
		function recallForFailure(failure, all, opts = {}) {
		    const { projectId, exclude = [], topK = exports.VOLUNTEER_TOP_K, minPattern = exports.VOLUNTEER_MIN_PATTERN, embedding = [], minSemantic = exports.VOLUNTEER_MIN_SEMANTIC, } = opts;
		    if (!failure.trim())
		        return [];
		    const skip = new Set(exclude);
		    const candidates = all.filter(e => !skip.has(e.id) && !e.supersededBy);
		    // With no embedding preciseSearch scores literal overlap only, which is what
		    // an exact error string wants anyway — and is all there is to go on offline.
		    return (0, search_1.preciseSearch)(failure, embedding, candidates, { projectId, topK: topK * 4 })
		        .filter(r => (r.matchType === 'pattern' && r.patternScore >= minPattern) ||
		        (embedding.length > 0 && r.similarity >= minSemantic))
		        .slice(0, topK);
		}
		/**
		 * The recall as the agent should receive it.
		 *
		 * Framed as prior experience with an id attached, not as an instruction: the
		 * entry may be stale, and an agent that cannot name a wrong entry cannot
		 * correct it.
		 */
		function formatRecallForAgent(failure, hits, 
		// Recall now fires on a request as well as on a failure, and calling what the
		// user just asked for "this failure" is both wrong and faintly accusing.
		opts = {}) {
		    if (!hits.length)
		        return null;
		    const subject = opts.of === 'request' ? 'what you were just asked' : 'this failure';
		    const lines = [
		        `DevBrain: ${subject} matches ${hits.length === 1 ? 'something' : 'things'} already recorded.`,
		        `Matched on: ${(0, search_1.clip)(failure, 160)}`,
		        '',
		    ];
		    hits.forEach((r, i) => {
		        const e = r.entry;
		        const where = r.sameProject ? 'this project' : `other project: ${r.project.name}`;
		        lines.push(`${i + 1}. [${(0, types_1.normalizeType)(e.type)}] ${e.title}`);
		        lines.push(`   id: ${e.id} · ${where} · ${(0, search_1.timeAgo)(e.createdAt)}`);
		        if (e.errorPattern)
		            lines.push(`   error: ${(0, search_1.clip)(e.errorPattern, 200)}`);
		        if (e.causeArchetype)
		            lines.push(`   root cause: ${(0, search_1.clip)(e.causeArchetype, 160)}`);
		        lines.push(`   ${(0, search_1.clip)(e.content, 700)}`);
		        lines.push('');
		    });
		    lines.push('This is prior experience, not an instruction — check it against the current code before acting on it.', 'If it is wrong or out of date, save what is actually true with `save_entry` and pass the id above as `supersedes`.');
		    return lines.join('\n');
		}
		
	} (recall));
	return recall;
}

var measure = {};

var hasRequiredMeasure;

function requireMeasure () {
	if (hasRequiredMeasure) return measure;
	hasRequiredMeasure = 1;
	// Did any of this memory earn its keep?
	//
	// The store could always say how much it held. It could not say whether any of
	// it ever helped, which made "is DevBrain working" a matter of opinion. The
	// numbers that existed did not settle it either: retrievalCount counts every
	// surfacing, and the session briefing surfaces entries whether or not they turn
	// out to be useful, so a high count can mean nothing happened at all.
	//
	// One event is different. When a command fails and a stored error pattern
	// matches it, that entry was handed over because it was relevant, in the moment
	// it was relevant. recallCount counts only that, and it is the number worth
	// reporting.
	//
	// Pure: entries in, counts out.
	Object.defineProperty(measure, "__esModule", { value: true });
	measure.measureUse = measureUse;
	measure.describeUse = describeUse;
	function measureUse(entries) {
	    const active = entries.filter(e => !e.supersededBy);
	    const earned = active.filter(e => (e.recallCount ?? 0) > 0).length;
	    return {
	        entries: active.length,
	        earned,
	        recalls: active.reduce((n, e) => n + (e.recallCount ?? 0), 0),
	        neverSurfaced: active.filter(e => !(e.retrievalCount ?? 0) && !(e.recallCount ?? 0)).length,
	        revised: active.filter(e => (e.revisionCount ?? 0) > 0).length,
	        revisions: active.reduce((n, e) => n + (e.revisionCount ?? 0), 0),
	        retracted: entries.filter(e => e.supersededBy).length,
	        earnedShare: active.length ? earned / active.length : 0,
	    };
	}
	/**
	 * The measurement as one line.
	 *
	 * Says plainly when nothing has been caught yet, rather than printing a 0 that
	 * reads like a rounding error. A store nothing has ever recalled from is a
	 * diary, and the line should say so while that is true.
	 */
	function describeUse(use) {
	    if (use.entries === 0)
	        return 'Nothing recorded yet.';
	    if (use.recalls === 0) {
	        return `${use.entries} entries · none has caught a failure yet`;
	    }
	    const pct = Math.round(use.earnedShare * 100);
	    const parts = [
	        `${use.entries} entries`,
	        `${use.earned} (${pct}%) caught a failure`,
	        `${use.recalls} ${use.recalls === 1 ? 'catch' : 'catches'} in total`,
	    ];
	    if (use.revised > 0)
	        parts.push(`${use.revised} revised`);
	    return parts.join(' · ');
	}
	
	return measure;
}

var graph = {};

var hasRequiredGraph;

function requireGraph () {
	if (hasRequiredGraph) return graph;
	hasRequiredGraph = 1;
	(function (exports) {
		// The edges between entries, and the queries that read them.
		//
		// Entries used to be a flat list of rows: a bug recorded on Tuesday and the fix
		// recorded an hour later had nothing connecting them, so "where did this get
		// fixed" had no answer and neither did "is this still open". Three fields carry
		// the structure — `supersedes` (this corrects that), `fixes` (this closes that)
		// and `sessionId` (these happened in one episode of work) — and everything here
		// is a pure read over entries already loaded, so the CLI, the MCP server and the
		// dashboard all derive the same shape from the same rules.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.RECORDED_EDGES = void 0;
		exports.openBugsInSession = openBugsInSession;
		exports.isRecorded = isRecorded;
		exports.buildGraph = buildGraph;
		exports.graphSubset = graphSubset;
		const types_1 = devbrainCore2.requireTypes();
		const search_1 = requireSearch();
		/**
		 * Bugs recorded in this session that nothing has closed yet.
		 *
		 * Used to offer the `fixes` link at the moment the agent is writing a fix. The
		 * window is the session on purpose: a bug from last month is not something the
		 * agent can be expected to recognise as the one it just fixed, and offering a
		 * long list of stale ids would get the whole hint ignored.
		 *
		 * Newest first, because the bug being worked on is nearly always the last one
		 * written down.
		 */
		function openBugsInSession(entries, sessionId) {
		    if (!sessionId)
		        return [];
		    const closed = new Set(entries.map(e => e.fixes).filter((id) => !!id));
		    return entries
		        .filter(e => e.sessionId === sessionId)
		        .filter(e => (0, types_1.normalizeType)(e.type) === 'bug')
		        .filter(e => !closed.has(e.id) && !e.supersededBy)
		        .sort((a, b) => b.createdAt - a.createdAt)
		        .map(e => ({ id: e.id, title: e.title }));
		}
		/** Recorded edges are facts; inferred ones are DevBrain's guess. */
		exports.RECORDED_EDGES = ['fixes', 'supersedes'];
		function isRecorded(kind) {
		    return exports.RECORDED_EDGES.includes(kind);
		}
		/**
		 * Error text, reduced to what two failures would have in common.
		 *
		 * Paths, line numbers, hex addresses and quoted identifiers differ between two
		 * occurrences of the same error, so comparing raw text finds almost nothing.
		 */
		function errorKey(pattern) {
		    return pattern
		        .toLowerCase()
		        .replace(/0x[0-9a-f]+/g, '')
		        .replace(/\d+/g, '')
		        .replace(/['"`][^'"`]*['"`]/g, '')
		        .replace(/[^a-z\s]+/g, ' ')
		        .split(/\s+/)
		        .filter(w => w.length > 2)
		        .slice(0, 8)
		        .join(' ')
		        .trim();
		}
		/**
		 * Edges deliberately left undrawn past this many sharing one key.
		 *
		 * Thirty entries with the same archetype would be 435 lines, which is not a
		 * graph but a smear — and the one real connection in it becomes invisible.
		 */
		const MAX_GROUP = 6;
		function pairsWithin(items) {
		    const out = [];
		    for (let i = 0; i < items.length; i++)
		        for (let j = i + 1; j < items.length; j++)
		            out.push([items[i], items[j]]);
		    return out;
		}
		/** Group entries by a key, dropping the ones with no key and the groups of one. */
		function groupBy(entries, key) {
		    const groups = new Map();
		    for (const e of entries) {
		        const k = key(e);
		        if (!k)
		            continue;
		        groups.set(k, [...(groups.get(k) ?? []), e]);
		    }
		    for (const [k, group] of groups)
		        if (group.length < 2 || group.length > MAX_GROUP)
		            groups.delete(k);
		    return groups;
		}
		/**
		 * How near two entries must be to count as related.
		 *
		 * Matches the semantic threshold search already uses, so a line on the graph
		 * means roughly what a hit in search means.
		 */
		const RELATED_FLOOR = 0.62;
		/**
		 * Neighbours one entry may name.
		 *
		 * Nearest-k rather than everything-above-a-threshold, because the threshold
		 * answers the wrong question. Measured on a real project, a 0.5 cut produced
		 * 1171 lines through 49 entries and a 0.75 cut left 16 of them with none at
		 * all — one picture unreadable, the other still a scatter of dots. Nearest-k
		 * gives every entry a line to the thing it is most like, and the count of lines
		 * grows with the number of entries rather than with the square of it.
		 */
		const RELATED_K = 2;
		/**
		 * Build the graph for a set of entries, oldest first.
		 *
		 * Pure: everything is derived from the entries handed in, so the dashboard, a
		 * CLI view and a test all see the same graph for the same input.
		 */
		function buildGraph(entries, opts = {}) {
		    const byId = new Map(entries.map(e => [e.id, e]));
		    const ordered = [...entries].sort((a, b) => a.createdAt - b.createdAt);
		    const nodes = ordered.map(e => ({
		        id: e.id,
		        type: (0, types_1.normalizeType)(e.type),
		        title: e.title,
		        createdAt: e.createdAt,
		        projectId: e.projectId,
		        ...(e.sessionId ? { sessionId: e.sessionId } : {}),
		        superseded: !!e.supersededBy,
		        recalls: e.recallCount ?? 0,
		        ...(e.errorPattern ? { errorPattern: e.errorPattern } : {}),
		    }));
		    const edges = [];
		    const seen = new Set();
		    const add = (edge) => {
		        // One line per pair. A recorded edge wins: it says something definite,
		        // where "same session" only says the two happened near each other.
		        const pair = [edge.from, edge.to].sort().join('>');
		        if (seen.has(pair))
		            return;
		        seen.add(pair);
		        edges.push(edge);
		    };
		    // Recorded first, so they claim their pair before anything inferred can.
		    for (const e of ordered) {
		        if (e.fixes && byId.has(e.fixes))
		            add({ from: e.id, to: e.fixes, kind: 'fixes' });
		    }
		    // Both directions of the same fact, and both are needed.
		    //
		    // supersedeEntry does write `supersedes` on the correction, along with
		    // `revisionCount` — checked by running it, not by reading it: old1 came back
		    // with supersededBy=new1, and new1 with supersedes=old1, revisionCount=1, on
		    // both the local and the Mongo path. An earlier version of this comment said
		    // the forward field was never filled in, which was wrong about the code.
		    //
		    // What is true is that the 8 retractions in a real store carry only
		    // `supersededBy`, because they were made by a one-off script that set the
		    // field directly rather than through supersedeEntry. So reading the forward
		    // field alone finds none of them, and reading both is not a workaround for a
		    // missing write — it is how the history stays visible alongside what the
		    // code writes now.
		    for (const e of ordered) {
		        if (e.supersedes && byId.has(e.supersedes))
		            add({ from: e.id, to: e.supersedes, kind: 'supersedes' });
		        if (e.supersededBy && byId.has(e.supersededBy))
		            add({ from: e.supersededBy, to: e.id, kind: 'supersedes' });
		    }
		    // Consecutive within a session, not every pair: a session of ten entries is a
		    // thread of work, and a thread is a line, not a knot of forty-five.
		    const sessions = groupBy(ordered, e => e.sessionId);
		    for (const [sessionId, group] of sessions) {
		        const sorted = [...group].sort((a, b) => a.createdAt - b.createdAt);
		        for (let i = 1; i < sorted.length; i++) {
		            add({ from: sorted[i - 1].id, to: sorted[i].id, kind: 'sequence', because: `same session (${sessionId.slice(0, 8)})` });
		        }
		    }
		    for (const [key, group] of groupBy(ordered, e => (e.errorPattern ? errorKey(e.errorPattern) : undefined))) {
		        for (const [a, b] of pairsWithin(group))
		            add({ from: a.id, to: b.id, kind: 'same-error', because: `same error: ${key}` });
		    }
		    for (const [key, group] of groupBy(ordered, e => e.causeArchetype?.toLowerCase().trim())) {
		        for (const [a, b] of pairsWithin(group))
		            add({ from: a.id, to: b.id, kind: 'same-cause', because: `same cause: ${key}` });
		    }
		    // Last, so every explicit link has already claimed its pair: an entry is
		    // only "related" to another when there is nothing more definite to say.
		    //
		    // This is what stops the graph being a field of dots. Every entry carries an
		    // embedding — 49 of 49 and 130 of 130 on the two real projects — where only
		    // 8 carried an explicit link, so the nearest neighbour is the one connection
		    // that always exists. It is the weakest claim on the picture and drawn as
		    // such: faint, dashed, and labelled as a guess.
		    if (opts.related !== false) {
		        const floor = opts.floor ?? RELATED_FLOOR;
		        const k = opts.neighbours ?? RELATED_K;
		        const withEmbedding = ordered.filter(e => e.embedding && e.embedding.length);
		        for (const e of withEmbedding) {
		            const near = withEmbedding
		                .filter(o => o.id !== e.id)
		                .map(o => ({ o, sim: (0, search_1.cosineSimilarity)(e.embedding, o.embedding) }))
		                .filter(x => x.sim >= floor)
		                .sort((a2, b2) => b2.sim - a2.sim)
		                .slice(0, k);
		            for (const n of near) {
		                add({ from: e.id, to: n.o.id, kind: 'related', because: `closest in meaning (${Math.round(n.sim * 100)}%)` });
		            }
		        }
		    }
		    return { nodes, edges };
		}
		/**
		 * The entries worth drawing, when there are more than a graph can show.
		 *
		 * Connected entries first: an isolated node carries no information a list does
		 * not carry better, and five hundred of them hide the handful that connect.
		 */
		function graphSubset(entries, limit = 120) {
		    // Without `related`: it links nearly everything, so counting it here would
		    // make every entry equally "connected" and the cut would keep an isolated
		    // note over the fix that closed a bug.
		    const { edges } = buildGraph(entries, { related: false });
		    const connected = new Set(edges.flatMap(e => [e.from, e.to]));
		    const score = (e) => (connected.has(e.id) ? 1 : 0);
		    return [...entries]
		        .sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt)
		        .slice(0, limit);
		}
		
	} (graph));
	return graph;
}

var env = {};

var hasRequiredEnv;

function requireEnv () {
	if (hasRequiredEnv) return env;
	hasRequiredEnv = 1;
	// Reading ~/.devbrain/.env, which is where `devbrain setup` puts MONGODB_URI,
	// GEMINI_API_KEY and the Vertex AI variables.
	//
	// This lived twice, copied between the CLI and the MCP server, which is how the
	// two drifted into disagreeing about a case neither of them was tested on.
	Object.defineProperty(env, "__esModule", { value: true });
	env.parseEnvFile = parseEnvFile;
	env.globalEnvPath = globalEnvPath;
	env.loadGlobalEnv = loadGlobalEnv;
	const fs_1 = require$$0;
	const os_1 = require$$2;
	const path_1 = require$$1;
	/** Parse `.env` text into pairs. Blank lines and `#` comments are skipped. */
	function parseEnvFile(text) {
	    const out = {};
	    // Strip a UTF-8 BOM: Notepad and PowerShell's `>` both write one, and it
	    // would otherwise become part of the first key's name.
	    for (const line of text.replace(/^﻿/, '').split('\n')) {
	        const trimmed = line.trim();
	        if (!trimmed || trimmed.startsWith('#'))
	            continue;
	        const [k, ...rest] = trimmed.split('=');
	        const key = k?.trim();
	        // A value may legitimately contain '=' — a Mongo URI usually does.
	        if (key && rest.length)
	            out[key] = rest.join('=').trim();
	    }
	    return out;
	}
	/**
	 * True when an environment variable carries no usable value.
	 *
	 * An empty string has to count as absent, and this is not a nicety. A launcher
	 * that substitutes a value the user never filled in sets the variable to ""
	 * rather than leaving it out: the Claude Code plugin manifest passes
	 * `MONGODB_URI: "${user_config.mongodb_uri}"`, and leaving that optional field
	 * blank — the default, and what the field's own description recommends — sets
	 * it to the empty string.
	 *
	 * With a `=== undefined` check, "" counted as "the user set this deliberately",
	 * so the configured MONGODB_URI in ~/.devbrain/.env was never loaded, and
	 * db.ts's own `!uri.trim()` test then quietly chose local JSON storage. The
	 * plugin installed, connected, answered every call and found nothing, with no
	 * error anywhere. Reproduced directly: `MONGODB_URI="" devbrain search
	 * "Illegal return statement"` printed "No matches found" where the same search
	 * without the variable found the entry.
	 */
	function unset(value) {
	    return value === undefined || value.trim() === '';
	}
	/** Path of the config file `devbrain setup` writes. */
	function globalEnvPath() {
	    return (0, path_1.join)((0, os_1.homedir)(), '.devbrain', '.env');
	}
	/**
	 * Load ~/.devbrain/.env into process.env.
	 *
	 * A real environment variable wins over the file, so `MONGODB_URI=… devbrain …`
	 * and a container's injected config both still override it — but only when it
	 * actually carries a value. Returns the names of the keys it set.
	 */
	function loadGlobalEnv(path = globalEnvPath()) {
	    if (!(0, fs_1.existsSync)(path))
	        return [];
	    const applied = [];
	    for (const [key, value] of Object.entries(parseEnvFile((0, fs_1.readFileSync)(path, 'utf-8')))) {
	        if (unset(process.env[key])) {
	            process.env[key] = value;
	            applied.push(key);
	        }
	    }
	    return applied;
	}
	
	return env;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;
	(function (exports) {
		var __createBinding = (dist && dist.__createBinding) || (Object.create ? (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    var desc = Object.getOwnPropertyDescriptor(m, k);
		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
		      desc = { enumerable: true, get: function() { return m[k]; } };
		    }
		    Object.defineProperty(o, k2, desc);
		}) : (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    o[k2] = m[k];
		}));
		var __exportStar = (dist && dist.__exportStar) || function(m, exports) {
		    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
		};
		Object.defineProperty(exports, "__esModule", { value: true });
		__exportStar(devbrainCore2.requireTypes(), exports);
		__exportStar(requireDb(), exports);
		__exportStar(requireProjectPath(), exports);
		__exportStar(requireGemini(), exports);
		__exportStar(requireStack(), exports);
		__exportStar(requireGit(), exports);
		__exportStar(requireSearch(), exports);
		__exportStar(requireDossier(), exports);
		__exportStar(requireDedupe(), exports);
		__exportStar(requireIndexSource(), exports);
		__exportStar(requireTranscript(), exports);
		__exportStar(requireAgentHooks(), exports);
		__exportStar(devbrainCore2.requireTurnReview(), exports);
		__exportStar(requireSessionCursor(), exports);
		__exportStar(requireBackfill(), exports);
		__exportStar(requireRecall(), exports);
		__exportStar(requireMeasure(), exports);
		__exportStar(requireStuck(), exports);
		__exportStar(requireGraph(), exports);
		__exportStar(requireRedact(), exports);
		__exportStar(requireEnv(), exports);
		
	} (dist));
	return dist;
}

exports.requireDist = requireDist;
exports.requireStuck = requireStuck;
exports.requireTranscript = requireTranscript;
