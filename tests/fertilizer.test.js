import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFertilizerStewardship, FERTILIZER_DOSES } from '../src/modules/fertilizerModel.js';

describe('Fertilizer Stewardship & Leaching Guard Tests', () => {
  function createWeatherWithRain48h(rainTotal) {
    const hourlyTimes = [];
    const hourlyRain = [];
    const now = Date.now();

    for (let i = 0; i < 72; i++) {
      const t = new Date(now + i * 3600000);
      hourlyTimes.push(t.toISOString());
      // distribute rainTotal over 48 hours
      hourlyRain.push(i < 48 ? rainTotal / 48 : 0);
    }

    return {
      hourly: {
        time: hourlyTimes,
        precipitation: hourlyRain
      }
    };
  }

  test('triggers High leaching hazard when heavy rain (>= 12 mm) is forecast within 48h', () => {
    const rainyWeather = createWeatherWithRain48h(18); // 18 mm rain in 48h
    const plan = analyzeFertilizerStewardship({
      cropKey: 'wheat',
      ferts: ['Urea', 'DAP'],
      stage: { progress: 0.25, gdd: 420, name: 'Tillering' },
      weather: rainyWeather,
      acres: 2.0
    });

    assert.equal(plan.leachingRisk, 'High');
    assert.ok(plan.rain48h >= 12);
    assert.ok(plan.leachingAdvisory.includes('Do NOT broadcast Urea'));
    assert.ok(plan.leachingAdvisory.includes('Wait until the rain passes'));
  });

  test('reports Low leaching hazard during dry or light drizzle weather', () => {
    const dryWeather = createWeatherWithRain48h(2.0); // 2 mm rain in 48h
    const plan = analyzeFertilizerStewardship({
      cropKey: 'wheat',
      ferts: ['Urea'],
      stage: { progress: 0.25, gdd: 420, name: 'Tillering' },
      weather: dryWeather,
      acres: 1.0
    });

    assert.equal(plan.leachingRisk, 'Low');
    assert.ok(plan.leachingAdvisory.includes('Safe window'));
  });

  test('calculates correct phenology-based split dose for wheat at tillering stage', () => {
    const dryWeather = createWeatherWithRain48h(0);
    const plan = analyzeFertilizerStewardship({
      cropKey: 'wheat',
      ferts: ['Urea', 'DAP'],
      stage: { progress: 0.30, gdd: 450, name: 'Tillering (CRI)' },
      weather: dryWeather,
      acres: 1.0
    });

    assert.equal(plan.timing, '1st Top-dress');
    assert.ok(plan.recommendedDose.includes('1 bag Urea (45 kg)'));
  });

  test('contains calibrated 4R dosing benchmarks for all 8 supported crops', () => {
    const crops = ['wheat', 'rice', 'maize', 'mustard', 'chickpea', 'cotton', 'tomato', 'sugarcane'];
    for (const crop of crops) {
      assert.ok(FERTILIZER_DOSES[crop], `Dosing schedule must exist for ${crop}`);
      assert.ok(FERTILIZER_DOSES[crop].length >= 2, `${crop} must have multi-stage split doses`);
    }
  });

  test('handles missing weather payload gracefully', () => {
    const plan = analyzeFertilizerStewardship({
      cropKey: 'wheat',
      ferts: ['Urea'],
      stage: { progress: 0.1, gdd: 50 },
      weather: null
    });

    assert.equal(plan.leachingRisk, 'Low');
    assert.ok(plan.recommendedDose);
  });
});

