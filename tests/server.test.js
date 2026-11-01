import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  securityHeadersMiddleware,
  rateLimiter,
  rateLimitMap,
  COMMODITY_REGEX,
  handleMarketRequest,
  RATE_LIMIT_WINDOW_MS,
  MAX_REQUESTS_PER_WINDOW
} from '../server.js';

function createMockReq(overrides = {}) {
  return {
    headers: overrides.headers || {},
    socket: { remoteAddress: overrides.ip || '127.0.0.1' },
    query: overrides.query || {},
    ...overrides
  };
}

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let responseData = null;

  return {
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseData = payload;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get headers() {
      return headers;
    },
    get body() {
      return responseData;
    }
  };
}

describe('Hardened Backend Middleware & Handlers Tests', () => {
  beforeEach(() => {
    rateLimitMap.clear();
  });

  test('securityHeadersMiddleware sets strict protective headers', () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    securityHeadersMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.getHeader('x-content-type-options'), 'nosniff');
    assert.equal(res.getHeader('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.getHeader('x-xss-protection'), '1; mode=block');
    assert.equal(res.getHeader('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.getHeader('content-security-policy'));
    assert.ok(res.getHeader('content-security-policy').includes("default-src 'self'"));
  });

  test('rateLimiter permits normal request volume and throttles bursts with 429', () => {
    const req = createMockReq({ ip: '10.0.0.1' });

    // Under threshold: 60 requests should pass
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      const res = createMockRes();
      let nextCalled = false;
      rateLimiter(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200);
    }

    // 61st request should be throttled
    const blockedRes = createMockRes();
    let nextCalledOnBlocked = false;
    rateLimiter(req, blockedRes, () => {
      nextCalledOnBlocked = true;
    });

    assert.equal(nextCalledOnBlocked, false);
    assert.equal(blockedRes.statusCode, 429);
    assert.equal(blockedRes.getHeader('retry-after'), '60');
    assert.ok(blockedRes.body.error);
  });

  test('COMMODITY_REGEX validates alphanumeric names and rejects script tags / path traversal', () => {
    assert.equal(COMMODITY_REGEX.test('Wheat'), true);
    assert.equal(COMMODITY_REGEX.test('Paddy (Dhan)'), false); // parentheses rejected
    assert.equal(COMMODITY_REGEX.test('Soyabean-Yellow'), true);
    assert.equal(COMMODITY_REGEX.test('Gram Raw'), true);

    // Malicious patterns
    assert.equal(COMMODITY_REGEX.test('<script>alert(1)</script>'), false);
    assert.equal(COMMODITY_REGEX.test('Wheat; DROP TABLE mandi;--'), false);
    assert.equal(COMMODITY_REGEX.test('../../../etc/passwd'), false);
    assert.equal(COMMODITY_REGEX.test('A'.repeat(51)), false); // max 50 chars
  });

  test('handleMarketRequest returns 400 when commodity name fails validation regex', async () => {
    const req = createMockReq({ query: { commodity: '<svg onload=alert()>' } });
    const res = createMockRes();

    await handleMarketRequest(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('Invalid commodity'));
  });

  test('handleMarketRequest returns structured 503 fallback when AGMARKNET_KEY is not set', async () => {
    delete process.env.AGMARKNET_KEY;
    const req = createMockReq({ query: { commodity: 'Wheat' } });
    const res = createMockRes();

    await handleMarketRequest(req, res);
    assert.equal(res.statusCode, 503);
    assert.ok(res.body.error.includes('AGMARKNET_KEY is not configured'));
    assert.deepEqual(res.body.records, []);
  });
});
