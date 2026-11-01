import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MSP_BENCHMARKS,
  calcFreightCost,
  getNearbyMandis,
  computeMandiArbitrage,
  evaluateStorageBreakeven,
  getCostOfCultivationBreakdown
} from '../src/modules/marketModel.js';

describe('Market Intelligence & Mandi Arbitrage Engine Tests', () => {
  test('contains calibrated MSP benchmarks for all 8 supported crops', () => {
    assert.equal(MSP_BENCHMARKS.wheat.msp, 2275);
    assert.equal(MSP_BENCHMARKS.mustard.msp, 5650);
    assert.equal(MSP_BENCHMARKS.chickpea.msp, 5440);
    assert.equal(MSP_BENCHMARKS.rice.msp, 2300);
  });

  test('calcFreightCost accurately models base handling and mileage rates', () => {
    const freight10km = calcFreightCost(10);
    const freight50km = calcFreightCost(50);
    assert.ok(freight50km > freight10km);
    assert.equal(freight10km, Math.round(15 + 10 * 1.85));
  });

  test('computeMandiArbitrage identifies net revenue differences after deducting transport', () => {
    const res = computeMandiArbitrage({
      cropKey: 'wheat',
      acres: 2,
      location: { lat: 29.685, lon: 76.99 }
    });

    assert.equal(res.acres, 2);
    assert.ok(res.totalYieldQuintals > 0);
    assert.equal(res.mandis.length, 3);
    assert.ok(res.bestMandi.netRevenue >= res.localMandi.netRevenue);
    assert.ok(typeof res.extraNetGain === 'number');
    assert.ok(typeof res.mspSpreadPercent === 'number');
  });

  test('evaluateStorageBreakeven recommends holding grains when price gain exceeds warehouse rent', () => {
    const res = evaluateStorageBreakeven({
      cropKey: 'mustard',
      acres: 2,
      harvestModalPrice: 5200
    });

    assert.equal(res.isPerishable, false);
    assert.ok(res.scenarios.length === 3);
    assert.ok(res.optimalDays >= 30);
    assert.ok(res.optimalGain > 0);
    assert.ok(res.recommendation.includes('Hold in WDRA warehouse'));
  });

  test('evaluateStorageBreakeven advises immediate selling for perishable crops like tomato', () => {
    const res = evaluateStorageBreakeven({
      cropKey: 'tomato',
      acres: 1,
      harvestModalPrice: 1800
    });

    assert.equal(res.isPerishable, true);
    assert.ok(res.recommendation.includes('Sell immediately'));
  });

  test('getCostOfCultivationBreakdown outputs CACP cost categories summing to total cost', () => {
    const coc = getCostOfCultivationBreakdown('wheat', 2.5);
    assert.equal(coc.cropKey, 'wheat');
    assert.equal(coc.acres, 2.5);
    assert.ok(coc.totalCostPerAcre > 0);
    assert.ok(coc.netProfitPerAcre > 0);
    assert.equal(coc.breakdown.length, 5);

    const sumAmounts = coc.breakdown.reduce((sum, item) => sum + item.amount, 0);
    assert.equal(sumAmounts, coc.totalCostPerAcre);
  });
});

