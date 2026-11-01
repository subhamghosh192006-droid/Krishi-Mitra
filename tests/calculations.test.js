import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversine,
  polygonAreaHa,
  polygonAreaAcres,
  perimeterM,
  centroid,
  generateAcreSquare,
  calcDailyGDD,
  calcCropStage,
  calcEffectiveRootDepth,
  calcDynamicKc,
  calcSWC,
  calcTAW,
  calcRAW,
  calcEffectiveRain,
  computeIrrigationDecision,
  calcScenarioFactors,
  calcSystemCapacity,
  rankCropSuitability
} from '../src/modules/calculations.js';
import { CROPS } from '../src/data/crops.js';
import { SOILS } from '../src/data/soils.js';

describe('Geospatial Geometry Tests', () => {
  test('haversine calculates distance between two geographic coordinates', () => {
    // New Delhi (28.6139, 77.2090) to Karnal (29.6857, 76.9905) is approx 120-125 km
    const dist = haversine([28.6139, 77.2090], [29.6857, 76.9905]);
    assert.ok(dist > 115000 && dist < 130000, `Expected ~122 km, got ${dist} meters`);
  });

  test('haversine returns 0 for identical coordinates', () => {
    assert.equal(haversine([29.6857, 76.9905], [29.6857, 76.9905]), 0);
  });

  test('generateAcreSquare creates an accurate 1-acre square polygon', () => {
    const lat = 29.6857;
    const lon = 76.9905;
    const plot = generateAcreSquare(lat, lon, 1.0);

    assert.equal(plot.points.length, 4);
    assert.equal(plot.isEstimate, true);
    assert.equal(plot.dataType, 'estimated');

    // 1 acre = 0.404686 hectares
    assert.ok(Math.abs(plot.areaHa - 0.4047) < 0.01, `Area in Ha should be ~0.405, got ${plot.areaHa}`);
    assert.ok(Math.abs(plot.acres - 1.0) < 0.02, `Area in Acres should be ~1.00, got ${plot.acres}`);

    // Perimeter of a square of 1 acre (side ~63.6 m) should be ~254.5 m
    assert.ok(Math.abs(plot.perimeter - 254.5) < 5.0, `Perimeter should be ~254 m, got ${plot.perimeter}`);
  });

  test('centroid calculates geometric mean of points', () => {
    const points = [
      [10, 20],
      [10, 40],
      [30, 40],
      [30, 20]
    ];
    const c = centroid(points);
    assert.deepEqual(c, [20, 30]);
  });
});

describe('Agronomic FAO-56 Models Tests', () => {
  test('calcDailyGDD correctly truncates above upper threshold and below base', () => {
    // Base 0 (wheat), Tmax 25, Tmin 15 -> Mean 20, GDD = 20
    assert.equal(calcDailyGDD(25, 15, 0, 35), 20);

    // Extreme heat: Tmax 42 (capped to 35), Tmin 25 -> Mean (35+25)/2 = 30, base 10 -> GDD = 20
    assert.equal(calcDailyGDD(42, 25, 10, 35), 20);

    // Below base temp: Tmax 4, Tmin 0, base 5 -> Mean capped to base -> GDD = 0
    assert.equal(calcDailyGDD(4, 0, 5, 35), 0);
  });

  test('calcEffectiveRootDepth increases from seedling to maturity', () => {
    const crop = CROPS.wheat; // rootMin: 0.20, rootMax: 1.20
    const seedlingDepth = calcEffectiveRootDepth(crop, 0.05);
    const midSeasonDepth = calcEffectiveRootDepth(crop, 0.65);

    assert.ok(seedlingDepth < 0.35, `Seedling depth should be shallow, got ${seedlingDepth}`);
    assert.ok(midSeasonDepth >= 1.15, `Mid season depth should approach maximum, got ${midSeasonDepth}`);
  });

  test('calcDynamicKc transitions across initial, mid-season, and late season', () => {
    const crop = CROPS.wheat; // KcIni 0.35, KcMid 1.15, KcEnd 0.40
    const kcInitial = calcDynamicKc(crop, 0.10);
    const kcMid = calcDynamicKc(crop, 0.50);
    const kcLate = calcDynamicKc(crop, 0.95);

    assert.equal(kcInitial, 0.35);
    assert.equal(kcMid, 1.15);
    assert.ok(kcLate < 0.70 && kcLate > 0.38, `Late Kc should ramp down, got ${kcLate}`);
  });

  test('calcTAW computes total available water based on soil and root depth', () => {
    // Alluvial soil: FC 0.36, WP 0.16 -> TAW per meter = (0.36 - 0.16) * 1000 = 200 mm/m
    const taw = calcTAW(SOILS.alluvial.fc, SOILS.alluvial.wp, 1.0);
    assert.equal(Math.round(taw), 200);

    // At 0.5 m root depth
    const tawHalf = calcTAW(SOILS.alluvial.fc, SOILS.alluvial.wp, 0.5);
    assert.equal(Math.round(tawHalf), 100);
  });

  test('calcSWC depth-weights 0-7 cm and 7-28 cm layers', () => {
    const swc = calcSWC(0.20, 0.30);
    // 0.20 * 0.45 + 0.30 * 0.55 = 0.09 + 0.165 = 0.255
    assert.equal(swc, 0.255);
  });

  test('calcEffectiveRain discounts surface evaporation under 3 mm', () => {
    assert.equal(calcEffectiveRain([1, 1]), 0);
    assert.equal(calcEffectiveRain([10]), (10 - 3) * 0.80);
  });
});

describe('Irrigation Decision Engine Tests', () => {
  // Construct a mock weather dataset
  function createMockWeather(soilMoisture = 0.18, rain24 = 0, rain72 = 0) {
    const today = new Date().toISOString().slice(0, 10);
    const hourlyTimes = [];
    const hourlySm1 = [];
    const hourlySm2 = [];
    const hourlyRain = [];
    const now = Date.now();

    for (let i = 0; i < 72; i++) {
      const t = new Date(now + i * 3600000);
      hourlyTimes.push(t.toISOString());
      hourlySm1.push(soilMoisture);
      hourlySm2.push(soilMoisture);
      hourlyRain.push(i < 24 ? rain24 / 24 : (rain72 - rain24) / 48);
    }

    return {
      daily: {
        time: [today, '2026-10-29', '2026-10-30'],
        temperature_2m_max: [30, 31, 30],
        temperature_2m_min: [18, 18, 17],
        precipitation_sum: [rain24, rain72 - rain24, 0],
        et0_fao_evapotranspiration: [4.5, 4.2, 4.0]
      },
      hourly: {
        time: hourlyTimes,
        soil_moisture_0_to_7cm: hourlySm1,
        soil_moisture_7_to_28cm: hourlySm2,
        precipitation: hourlyRain
      }
    };
  }

  test('recommends "today" when soil moisture is critically dry with no rain', () => {
    const dryWeather = createMockWeather(0.17, 0, 0); // Very dry (WP is 0.16)
    const res = computeIrrigationDecision({
      weather: dryWeather,
      soilKey: 'alluvial',
      cropKey: 'wheat',
      irrigationType: 'drip',
      sowDate: '2026-10-01',
      acres: 2.0
    });

    assert.equal(res.verdict, 'today');
    assert.ok(res.mm >= 12, `Expected recommended mm >= 12, got ${res.mm}`);
    assert.ok(res.litres > 0, `Expected litres > 0, got ${res.litres}`);
    // Liters for 2 acres at ~20 mm: 20 * 4046.86 * 2 ≈ 161,874 L
    assert.equal(res.litres, Math.round(res.mm * 4046.85642 * 2.0));
  });

  test('recommends "hold" when significant rain is imminent', () => {
    const rainyWeather = createMockWeather(0.25, 18, 25); // 18 mm rain in 24h
    const res = computeIrrigationDecision({
      weather: rainyWeather,
      soilKey: 'alluvial',
      cropKey: 'wheat',
      irrigationType: 'flood',
      sowDate: '2026-10-01',
      acres: 1.0
    });

    assert.equal(res.verdict, 'hold');
    assert.equal(res.mm, 0);
    assert.equal(res.litres, 0);
  });

  test('recommends "skip" when soil moisture is comfortably high', () => {
    const wetSoilWeather = createMockWeather(0.35, 0, 0); // Field capacity is 0.36
    const res = computeIrrigationDecision({
      weather: wetSoilWeather,
      soilKey: 'alluvial',
      cropKey: 'wheat',
      irrigationType: 'flood',
      sowDate: '2026-10-01',
      acres: 1.0
    });

    assert.equal(res.verdict, 'skip');
    assert.equal(res.mm, 0);
  });
});

describe('Crop Suitability & Financial Models Tests', () => {
  test('scenario factors adjust water availability and commodity prices', () => {
    const dry = calcScenarioFactors('dry');
    assert.equal(dry.water, 0.72);
    assert.equal(dry.price, 1.08);

    const wet = calcScenarioFactors('wet');
    assert.equal(wet.water, 1.15);
    assert.equal(wet.price, 0.96);

    const normal = calcScenarioFactors('normal');
    assert.equal(normal.water, 1.0);
    assert.equal(normal.price, 1.0);
  });

  test('rankCropSuitability returns ranked crops with economic metrics', () => {
    const today = new Date().toISOString().slice(0, 10);
    const mockWeather = {
      daily: {
        time: [today, '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'],
        temperature_2m_max: [24, 25, 23, 22, 24, 25, 24],
        temperature_2m_min: [14, 15, 13, 12, 14, 15, 14]
      }
    };

    const res = rankCropSuitability({
      weather: mockWeather,
      soilKey: 'alluvial',
      sowDate: '2026-10-15',
      irrigationType: 'flood',
      scenario: 'normal',
      sortMode: 'fit'
    });

    assert.ok(res.list.length > 0);
    // Highest fit score is at the top
    assert.ok(res.list[0].score >= res.list[res.list.length - 1].score);
    assert.ok(res.list[0].profit > 0);
  });
});

