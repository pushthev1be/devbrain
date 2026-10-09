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

export const REDACTED = '[REDACTED]';

type Rule = { name: string; pattern: RegExp; replace: string | ((...m: string[]) => string) };

// Value shapes that are credentials wherever they appear.
const TOKEN_RULES: Rule[] = [
  { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, replace: REDACTED },
  { name: 'anthropic key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, replace: REDACTED },
  { name: 'openai key', pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g, replace: REDACTED },
  { name: 'github token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g, replace: REDACTED },
  { name: 'gitlab token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g, replace: REDACTED },
  { name: 'aws access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: REDACTED },
  { name: 'google api key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replace: REDACTED },
  { name: 'stripe key', pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g, replace: REDACTED },
  { name: 'stripe webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{24,}/g, replace: REDACTED },
  { name: 'slack token', pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, replace: REDACTED },
  { name: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/g, replace: REDACTED },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replace: REDACTED },
];

// Shapes where the name is useful and only the value is secret.
const CONTEXT_RULES: Rule[] = [
  // scheme://user:password@host — keep the user and host, which say what failed.
  { name: 'url credentials', pattern: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):([^\s@/]+)@/gi, replace: (_m, pre) => `${pre}:${REDACTED}@` },
  // Authorization: Bearer <token> / Basic <creds>
  { name: 'auth header', pattern: /\b(Bearer|Basic|Token)\s+([A-Za-z0-9._~+/=-]{16,})/g, replace: (_m, scheme) => `${scheme} ${REDACTED}` },
  // NAME=value / "name": "value" for names that only ever hold secrets. A value
  // must contain a letter: TOKEN_EXPIRY=86400 is configuration worth keeping.
  {
    name: 'secret assignment',
    pattern: /(["']?\b[A-Za-z0-9_.-]*(?:secret|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|_TOKEN)\b["']?\s*[:=]\s*)(["']?)([^\s"',;}]*[A-Za-z][^\s"',;}]*)\2/gi,
    replace: (_m, lhs, q, value) => (looksLikeCode(value) ? _m : `${lhs}${q}${REDACTED}${q}`),
  },
];

/**
 * Entries quote code, and in code the right-hand side of `password:` is usually
 * a type or a reference, not a password. Redacting `password: string` would
 * damage the entry and protect nothing.
 */
function looksLikeCode(value: string): boolean {
  if (value.length < 6 || value === REDACTED) return true;
  if (/^(string|number|boolean|null|undefined|true|false|none|required|optional|object|unknown|any)$/i.test(value)) return true;
  if (/^[$<{(]|^process\.env\b|^os\.environ\b|^env\b/i.test(value)) return true;
  // req.body.password, config.db.password, this.secret — a dotted reference.
  if (/^[a-z_][\w]*(\.[a-z_][\w]*)+\)?$/i.test(value)) return true;
  return false;
}

const RULES = [...TOKEN_RULES, ...CONTEXT_RULES];

/** The text with every recognised credential replaced by [REDACTED]. */
export function redactSecrets(text: string): string;
export function redactSecrets(text: string | undefined): string | undefined;
export function redactSecrets(text: string | undefined): string | undefined {
  if (!text) return text;
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.pattern, rule.replace as (substring: string, ...args: string[]) => string);
  }
  return out;
}

/** Names of the rules that matched — for tests and for telling a person what was removed. */
export function findSecrets(text: string): string[] {
  return RULES.filter(r => new RegExp(r.pattern.source, r.pattern.flags.replace('g', '')).test(text)).map(r => r.name);
}
