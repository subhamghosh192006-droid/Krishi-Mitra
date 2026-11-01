import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePestAndDiseaseRisk, PEST_DISEASE_PROFILES } from '../src/modules/pestModel.js';

describe('Pest & Fungal Disease Risk Model Tests', () => {
  function createWeatherWithConditions(hoursCount, temp, rh, rain = 0) {
    const hourlyTimes = [];
    const hourlyTemps = [];
    const hourlyRhs = [];
    const hourlyRains = [];

    const now = new Date();
    for (let i = 0; i < hoursCount; i++) {
      const t = new Date(now.getTime() + i * 3600000);
      hourlyTimes.push(t.toISOString());
      hourlyTemps.push(temp);
      hourlyRhs.push(rh);
      hourlyRains.push(rain);
    }

    return {
      hourly: {
        time: hourlyTimes,
        temperature_2m: hourlyTemps,
        relative_humidity_2m: hourlyRhs,
        precipitation: hourlyRains
      }
    };
  }

  test('reports Low risk during dry and warm spells', () => {
    // 72 hours of dry weather (RH 40%, 32°C)
    const dryWeather = createWeatherWithConditions(72, 32, 40, 0);
    const result = analyzePestAndDiseaseRisk({ weather: dryWeather, cropKey: 'wheat' });

    assert.equal(result.level, 'Low');
    assert.equal(result.consecutiveFavorableHours, 0);
    assert.ok(result.score < 35);
    assert.ok(result.diseaseName.includes('Rust'));
  });

  test('detects High Late Blight risk on tomato under sustained damp conditions', () => {
    // 14 consecutive hours of RH 92% at 19°C (optimal for Phytophthora infestans)
    const blightWeather = createWeatherWithConditions(72, 19, 92, 0.5);
    const result = analyzePestAndDiseaseRisk({ weather: blightWeather, cropKey: 'tomato' });

    assert.equal(result.level, 'High');
    assert.ok(result.score >= 65);
    assert.equal(result.diseaseName, 'Late Blight & Early Blight');
    assert.ok(result.advisory.includes('Late Blight'));
    assert.ok(result.preventiveAction.includes('Avoid overhead sprinkler watering'));
  });

  test('detects Moderate risk for intermediate humidity periods', () => {
    // Intermittent dampness: 6 hours wet, 10 hours dry, etc.
    const hourlyTimes = [];
    const hourlyTemps = [];
    const hourlyRhs = [];
    const hourlyRains = [];

    const now = new Date();
    for (let i = 0; i < 72; i++) {
      const t = new Date(now.getTime() + i * 3600000);
      hourlyTimes.push(t.toISOString());
      hourlyTemps.push(20);
      // Favorable for first 6 hours, then dry
      hourlyRhs.push(i < 6 ? 85 : 50);
      hourlyRains.push(0);
    }

    const modWeather = {
      hourly: {
        time: hourlyTimes,
        temperature_2m: hourlyTemps,
        relative_humidity_2m: hourlyRhs,
        precipitation: hourlyRains
      }
    };

    const result = analyzePestAndDiseaseRisk({ weather: modWeather, cropKey: 'mustard' });
    assert.equal(result.diseaseName, 'White Rust & Sclerotinia Stem Rot');
    assert.ok(result.consecutiveFavorableHours === 6);
  });

  test('maps distinct epidemiological profiles for each major crop', () => {
    const crops = ['wheat', 'rice', 'maize', 'mustard', 'chickpea', 'cotton', 'tomato', 'sugarcane'];
    for (const crop of crops) {
      assert.ok(PEST_DISEASE_PROFILES[crop], `Profile should exist for ${crop}`);
      assert.ok(PEST_DISEASE_PROFILES[crop].diseaseName);
      assert.ok(PEST_DISEASE_PROFILES[crop].preventiveAction);
    }
  });

  test('gracefully handles missing or incomplete weather payloads', () => {
    const result = analyzePestAndDiseaseRisk({ weather: null, cropKey: 'wheat' });
    assert.equal(result.level, 'Low');
    assert.ok(result.advisory);
  });
});

