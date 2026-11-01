import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleVoiceSpeak } from '../server.js';

function createMockReq(body = {}) {
  return { body };
}

function createMockRes() {
  let statusCode = 200;
  let responseData = null;
  const headers = {};

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
    get body() {
      return responseData;
    }
  };
}

describe('ElevenLabs Voice Assistant (Kisan Vaani) Tests', () => {
  test('rejects empty or missing text parameter with 400', async () => {
    const req = createMockReq({ text: '' });
    const res = createMockRes();

    await handleVoiceSpeak(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  test('falls back gracefully to native speech indicators when ELEVENLABS_API_KEY is not set', async () => {
    const req = createMockReq({
      text: 'Apply 15 millimeters of water today.',
      lang: 'en'
    });
    const res = createMockRes();

    await handleVoiceSpeak(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fallback, true);
    assert.equal(res.body.lang, 'en-IN');
    assert.ok(res.body.text.includes('Apply 15 millimeters'));
  });

  test('sets Hindi BCP-47 tag hi-IN for vernacular speech synthesis fallback', async () => {
    const req = createMockReq({
      text: 'नमस्ते किसान भाई। आज सिंचाई करने की सलाह है।',
      lang: 'hi'
    });
    const res = createMockRes();

    await handleVoiceSpeak(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fallback, true);
    assert.equal(res.body.lang, 'hi-IN');
    assert.ok(res.body.text.includes('नमस्ते किसान भाई'));
  });
});

