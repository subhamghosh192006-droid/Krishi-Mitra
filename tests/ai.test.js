import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgronomicSummary, handleAiSummarize } from '../server.js';

function createMockReq(body = {}) {
  return { body };
}

function createMockRes() {
  let statusCode = 200;
  let responseData = null;
  return {
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

describe('Gemma AI Agronomic & Economic Summarizer Tests', () => {
  test('generates coherent English irrigation summary with dynamic numbers', () => {
    const summary = generateAgronomicSummary({
      type: 'irrigation',
      lang: 'en',
      data: {
        crop: 'Wheat',
        soil: 'Alluvial Loam',
        acres: 2.5,
        verdict: 'today',
        mm: 18,
        litres: 182000,
        when: '5–8 AM',
        stage: { name: 'Tillering' },
        pestRisk: { level: 'Low', diseaseName: 'Rust' },
        fertPlan: { leachingRisk: 'Low' }
      }
    });

    assert.ok(typeof summary === 'string');
    assert.ok(summary.includes('Wheat'));
    assert.ok(summary.includes('18 mm'));
    assert.ok(summary.includes('2.5 acre'));
    assert.ok(summary.includes('today'));
  });

  test('generates authentic Hindi irrigation summary with Devanagari numerals and terminology', () => {
    const summary = generateAgronomicSummary({
      type: 'irrigation',
      lang: 'hi',
      data: {
        crop: 'गेहूं',
        soil: 'जलोढ़ दोमट',
        acres: 3,
        verdict: 'hold',
        mm: 0,
        litres: 0,
        when: 'बारिश के बाद',
        stage: { name: 'वानस्पतिक' },
        pestRisk: { level: 'High', diseaseName: 'पीला रतुआ' },
        fertPlan: { leachingRisk: 'High' }
      }
    });

    assert.ok(typeof summary === 'string');
    assert.ok(summary.includes('गेहूं'));
    assert.ok(summary.includes('सिंचाई अभी रोकें'));
    assert.ok(summary.includes('यूरिया का छिड़काव अभी न करें'));
    assert.ok(summary.includes('पीला रतुआ'));
  });

  test('generates crop profit financial summary in English', () => {
    const summary = generateAgronomicSummary({
      type: 'profit',
      lang: 'en',
      data: {
        acres: 2,
        soil: 'Alluvial Loam',
        scenario: 'normal',
        topCrop: { name: 'Mustard', profit: 30600 },
        secondCrop: { name: 'Wheat', profit: 24575 }
      }
    });

    assert.ok(summary.includes('Mustard'));
    assert.ok(summary.includes('30,600'));
    assert.ok(summary.includes('61,200')); // 30600 * 2 acres
    assert.ok(summary.includes('Wheat'));
  });

  test('generates crop profit financial summary in Hindi for dry year scenario', () => {
    const summary = generateAgronomicSummary({
      type: 'profit',
      lang: 'hi',
      data: {
        acres: 1.5,
        soil: 'काली मिट्टी',
        scenario: 'dry',
        topCrop: { name: 'चना', profit: 24050 },
        secondCrop: { name: 'सरसों', profit: 22000 }
      }
    });

    assert.ok(summary.includes('चना'));
    assert.ok(summary.includes('सूखे वर्ष'));
    assert.ok(summary.includes('काली मिट्टी'));
  });

  test('handleAiSummarize rejects invalid type or language parameters', async () => {
    const req = createMockReq({ type: 'invalid_type', lang: 'en' });
    const res = createMockRes();

    await handleAiSummarize(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  test('handleAiSummarize provides immediate local fallback when API key is unconfigured', async () => {
    const req = createMockReq({
      type: 'irrigation',
      lang: 'en',
      data: { crop: 'Maize', acres: 1, verdict: 'today', mm: 12, litres: 48500 }
    });
    const res = createMockRes();

    await handleAiSummarize(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.summary);
    assert.ok(res.body.model.includes('gemma'));
  });
});

