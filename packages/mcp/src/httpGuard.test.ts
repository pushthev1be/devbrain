import { describe, it, expect } from 'vitest';
import { bindHost, checkRequest, startupRefusal, isLoopback } from './httpGuard';

const local = { host: '127.0.0.1' };
const req = (path: string, headers: Record<string, string>, method = 'GET') => ({ method, path, headers });

describe('bindHost', () => {
  it('stays on loopback by default', () => {
    expect(bindHost({})).toBe('127.0.0.1');
  });
  it('listens on all interfaces on Cloud Run', () => {
    expect(bindHost({ K_SERVICE: 'devbrain' })).toBe('0.0.0.0');
  });
  it('honours an explicit DEVBRAIN_HOST over everything', () => {
    expect(bindHost({ DEVBRAIN_HOST: '192.168.1.5', K_SERVICE: 'x' })).toBe('192.168.1.5');
  });
});

describe('startupRefusal', () => {
  it('allows loopback without a token', () => {
    expect(startupRefusal(local)).toBeNull();
  });
  it('refuses to expose the store without a token', () => {
    expect(startupRefusal({ host: '0.0.0.0' })).toMatch(/DEVBRAIN_TOKEN/);
  });
  it('allows an exposed server that has a token', () => {
    expect(startupRefusal({ host: '0.0.0.0', token: 's3cret' })).toBeNull();
  });
});

describe('isLoopback', () => {
  it.each(['localhost', '127.0.0.1', '127.0.1.1', '::1', '[::1]'])('%s is loopback', h => {
    expect(isLoopback(h)).toBe(true);
  });
  it.each(['0.0.0.0', '192.168.1.5', 'evil.example'])('%s is not', h => {
    expect(isLoopback(h)).toBe(false);
  });
});

describe('checkRequest', () => {
  it('lets the dashboard call its own API', () => {
    expect(checkRequest(req('/api/save', { host: 'localhost:8080', origin: 'http://localhost:8080' }, 'POST'), local)).toBeNull();
  });

  it('lets non-browser clients through on loopback', () => {
    expect(checkRequest(req('/mcp', { host: 'localhost:8080' }, 'POST'), local)).toBeNull();
  });

  it('refuses a write from another site', () => {
    const r = checkRequest(req('/api/save', { host: 'localhost:8080', origin: 'https://evil.example' }, 'POST'), local);
    expect(r?.status).toBe(403);
  });

  it('refuses a different port on localhost — another local app is another origin', () => {
    const r = checkRequest(req('/api/save', { host: 'localhost:8080', origin: 'http://localhost:3000' }, 'POST'), local);
    expect(r?.status).toBe(403);
  });

  it('refuses an opaque origin', () => {
    expect(checkRequest(req('/api/save', { host: 'localhost:8080', origin: 'null' }, 'POST'), local)?.status).toBe(403);
  });

  it('refuses a rebound hostname on loopback even with a matching Origin', () => {
    const r = checkRequest(req('/api/projects', { host: 'rebind.evil.example:8080', origin: 'http://rebind.evil.example:8080' }), local);
    expect(r?.status).toBe(403);
  });

  it('accepts IPv6 loopback in the Host header', () => {
    expect(checkRequest(req('/api/projects', { host: '[::1]:8080' }), local)).toBeNull();
  });

  describe('with a token', () => {
    const exposed = { host: '0.0.0.0', token: 'tok-123' };

    it('requires it on data routes', () => {
      expect(checkRequest(req('/api/projects', { host: 'devbrain.run.app' }), exposed)?.status).toBe(401);
    });
    it('rejects a wrong one', () => {
      expect(checkRequest(req('/mcp', { host: 'devbrain.run.app', authorization: 'Bearer nope' }, 'POST'), exposed)?.status).toBe(401);
    });
    it('accepts the right one', () => {
      expect(checkRequest(req('/mcp', { host: 'devbrain.run.app', authorization: 'Bearer tok-123' }, 'POST'), exposed)).toBeNull();
    });
    it('leaves the page shell and health probe open', () => {
      expect(checkRequest(req('/', { host: 'devbrain.run.app' }), exposed)).toBeNull();
      expect(checkRequest(req('/health', { host: 'devbrain.run.app' }), exposed)).toBeNull();
    });
    it('does not accept any Host when exposed, but still checks Origin', () => {
      const r = checkRequest(req('/api/save', { host: 'devbrain.run.app', origin: 'https://evil.example', authorization: 'Bearer tok-123' }, 'POST'), exposed);
      expect(r?.status).toBe(403);
    });
  });
});
