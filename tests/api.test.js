import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashStr, mulberry32, generateSyntheticWeather, buildWeatherURL } from '../src/modules/api.js';

describe('API & Synthetic Fallback Engine Tests', () => {
  test('hashStr produces deterministic 32-bit unsigned integer', () => {
    const h1 = hashStr('29.68576.9902026-10-28');
    const h2 = hashStr('29.68576.9902026-10-28');
    const hDiff = hashStr('28.61377.2092026-10-28');

    assert.equal(typeof h1, 'number');
    assert.equal(h1, h2);
    assert.notEqual(h1, hDiff);
    assert.ok(h1 >= 0 && h1 <= 4294967295);
  });

  test('mulberry32 generates identical pseudo-random sequence for identical seed', () => {
    const seed = 123456789;
    const prng1 = mulberry32(seed);
    const prng2 = mulberry32(seed);

    const seq1 = [prng1(), prng1(), prng1(), prng1()];
    const seq2 = [prng2(), prng2(), prng2(), prng2()];

    assert.deepEqual(seq1, seq2);
  });

  test('generateSyntheticWeather outputs complete diurnal profile with simulated tag', () => {
    const lat = 29.6857;
    const lon = 76.9905;
    const synth = generateSyntheticWeather(lat, lon, '2026-10-28');

    assert.equal(synth._synthetic, true);
    assert.equal(synth.dataType, 'simulated');
    assert.equal(synth.source, 'simulated');

    // Hourly diurnal curves
    assert.ok(synth.hourly);
    assert.equal(synth.hourly.time.length, 14 * 24);
    assert.equal(synth.hourly.temperature_2m.length, 14 * 24);
    assert.equal(synth.hourly.soil_moisture_0_to_7cm.length, 14 * 24);
    assert.equal(synth.hourly.soil_moisture_7_to_28cm.length, 14 * 24);

    // Daily metrics
    assert.ok(synth.daily);
    assert.equal(synth.daily.time.length, 16);
    assert.equal(synth.daily.precipitation_sum.length, 16);
    assert.equal(synth.daily.et0_fao_evapotranspiration.length, 16);

    // Current metrics
    assert.ok(synth.current);
    assert.ok(typeof synth.current.temperature_2m === 'number');
  });

  test('buildWeatherURL formats Open-Meteo endpoint with correct coordinates and variables', () => {
    const url = buildWeatherURL(29.6857, 76.9905);
    assert.ok(url.includes('latitude=29.6857'));
    assert.ok(url.includes('longitude=76.9905'));
    assert.ok(url.includes('soil_moisture_0_to_7cm'));
    assert.ok(url.includes('soil_moisture_7_to_28cm'));
    assert.ok(url.includes('et0_fao_evapotranspiration'));
  });
});

