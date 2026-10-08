// Who may talk to the HTTP server, decided before any route runs.
//
// The server used to listen on 0.0.0.0 and answer every response with
// `Access-Control-Allow-Origin: *`, with no authentication on any route. While
// `--serve` was running, any web page the user happened to visit could read the
// whole store and write to it through /api/save, and so could anyone on the same
// network. A memory an agent trusts is exactly the thing that must not be
// writable by a stranger.
//
// Three rules, in order:
//
//   1. Bind to loopback unless told otherwise. Exposing the server is a choice
//      someone makes (DEVBRAIN_HOST, or Cloud Run's K_SERVICE), not a default.
//   2. On loopback, the Host header must name loopback. Otherwise a page served
//      from a hostname that resolves to 127.0.0.1 (DNS rebinding) is same-origin
//      with the server as far as the browser is concerned.
//   3. A browser request from another origin is refused outright. Dropping the
//      CORS header alone is not enough: a cross-site form post with a text/plain
//      body skips the preflight, and readBody parses it as JSON regardless — the
//      write would land even though the page could not read the response.
//
// And when DEVBRAIN_TOKEN is set, every route except the page shell and the
// liveness probe needs it. Exposed without a token, the server refuses to
// start: an open, writable memory on a network is never what anyone meant.

import { timingSafeEqual } from 'crypto';

export interface GuardConfig {
  /** The address the server is bound to. */
  host: string;
  /** Required on every guarded route when set. */
  token?: string;
}

export interface GuardRequest {
  method?: string;
  /** The normalised path, without query string. */
  path: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface GuardRefusal { status: number; error: string }

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Routes that answer without a token: the page shell carries no data, and probes cannot send one. */
const OPEN_PATHS = new Set(['/', '/health']);

export function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTNAMES.has(host.toLowerCase()) || /^127\./.test(host);
}

/** Where to listen: DEVBRAIN_HOST if set, all interfaces on Cloud Run, loopback otherwise. */
export function bindHost(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.DEVBRAIN_HOST?.trim();
  if (explicit) return explicit;
  return env.K_SERVICE ? '0.0.0.0' : '127.0.0.1';
}

/**
 * Why the server must not start with this configuration, or null if it may.
 * Exposed beyond loopback with no token would publish a writable store.
 */
export function startupRefusal(config: GuardConfig): string | null {
  if (isLoopback(config.host) || config.token) return null;
  return `DevBrain will not listen on ${config.host} without DEVBRAIN_TOKEN: ` +
    'anyone who can reach the port could read and rewrite your memory. ' +
    'Set DEVBRAIN_TOKEN to a long random value, or unset DEVBRAIN_HOST to stay on localhost.';
}

/** The hostname in a Host or Origin value, without port or scheme. */
function hostnameOf(value: string): string {
  const v = value.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  if (v.startsWith('[')) return v.slice(0, v.indexOf(']') + 1);
  return v.split(':')[0].split('/')[0];
}

function header(req: GuardRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Null when the request may proceed; otherwise the status and reason to refuse it with. */
export function checkRequest(req: GuardRequest, config: GuardConfig): GuardRefusal | null {
  const host = header(req, 'host');

  if (isLoopback(config.host)) {
    if (!host || !isLoopback(hostnameOf(host))) {
      return { status: 403, error: 'DevBrain only answers requests addressed to localhost' };
    }
  }

  // Browsers send Origin on every cross-origin request and on same-origin POSTs.
  // Non-browser clients (curl, MCP clients, the agent) send none and are judged
  // by the token alone.
  const origin = header(req, 'origin');
  if (origin && origin !== 'null') {
    const originHost = origin.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/\/+$/, '');
    if (!host || originHost !== host.trim().toLowerCase()) {
      return { status: 403, error: 'Cross-origin requests are not allowed' };
    }
  } else if (origin === 'null') {
    // Sandboxed iframes and file:// pages: never the dashboard.
    return { status: 403, error: 'Cross-origin requests are not allowed' };
  }

  if (config.token && !OPEN_PATHS.has(req.path)) {
    const auth = header(req, 'authorization') ?? '';
    const given = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!given || !tokenMatches(given, config.token)) {
      return { status: 401, error: 'Missing or wrong DevBrain token (Authorization: Bearer <DEVBRAIN_TOKEN>)' };
    }
  }

  return null;
}
