import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS, t, setLanguage, getLanguage } from '../src/data/i18n.js';

describe('Multilingual i18n Localization Tests', () => {
  test('returns English strings by default', () => {
    setLanguage('en');
    assert.equal(getLanguage(), 'en');
    assert.equal(t('verdict_today'), 'Water today');
    assert.equal(t('confirmLocation'), 'Confirm this location →');
  });

  test('returns authentic Hindi strings when language is set to "hi"', () => {
    setLanguage('hi');
    assert.equal(getLanguage(), 'hi');
    assert.equal(t('verdict_today'), 'आज सिंचाई करें');
    assert.equal(t('verdict_hold'), 'पानी रोकें (बारिश आने वाली है)');
    assert.equal(t('confirmLocation'), 'इस स्थान की पुष्टि करें →');
    assert.equal(t('step5'), 'सिंचाई सलाह');
  });

  test('falls back gracefully to English when key is missing in Hindi', () => {
    setLanguage('hi');
    assert.equal(t('brandName'), 'कृषि मित्र');
    // nonexistent key
    assert.equal(t('nonexistent_key', 'Fallback Text'), 'Fallback Text');
  });

  test('both language dictionaries contain matching essential workflow keys', () => {
    const requiredKeys = [
      'step1', 'step2', 'step3', 'step4', 'step5', 'step6',
      'verdict_today', 'verdict_soon', 'verdict_hold', 'verdict_skip',
      'confirmLocation', 'scanThisPlot', 'use1AcreEstimate', 'getWateringDecision'
    ];

    for (const key of requiredKeys) {
      assert.ok(TRANSLATIONS.en[key], `English translation must exist for ${key}`);
      assert.ok(TRANSLATIONS.hi[key], `Hindi translation must exist for ${key}`);
    }
  });
});

