import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.window = {
  localStorage: new MockLocalStorage()
};

import {
  store,
  saveSession,
  getSession,
  clearSession,
  saveLocation,
  getLocation,
  savePlot,
  getPlot,
  clearPlot,
  saveSetup,
  getSetup,
  saveNav,
  getNav,
  resetAllState
} from '../src/modules/storage.js';

describe('Storage Module Persistence Tests', () => {
  beforeEach(() => {
    globalThis.window.localStorage.clear();
  });

  test('session is saved, retrieved, and cleared', () => {
    saveSession({ email: 'farmer@example.com', guest: false, name: 'Farmer' });
    const session = getSession();
    assert.ok(session);
    assert.equal(session.email, 'farmer@example.com');
    assert.equal(session.guest, false);

    clearSession();
    assert.equal(getSession(), null);
  });

  test('expired session is rejected', () => {
    saveSession({ email: 'old@example.com', guest: false });
    // Manually backdate session timestamp to 20 days ago
    const raw = JSON.parse(globalThis.window.localStorage.getItem('km.session'));
    raw.at = Date.now() - 20 * 24 * 60 * 60 * 1000;
    globalThis.window.localStorage.setItem('km.session', JSON.stringify(raw));

    assert.equal(getSession(), null);
  });

  test('location is persisted and returns default fallback if empty', () => {
    const fallback = getLocation();
    assert.equal(fallback.name, 'Karnal, Haryana');
    assert.equal(fallback.lat, 29.6857);

    saveLocation({ lat: 28.6139, lon: 77.2090, name: 'Delhi', accuracy: 12 });
    const saved = getLocation();
    assert.equal(saved.lat, 28.6139);
    assert.equal(saved.lon, 77.209);
    assert.equal(saved.name, 'Delhi');
    assert.equal(saved.accuracy, 12);
  });

  test('plot boundary is saved, validated, and cleared', () => {
    assert.equal(getPlot(), null);

    const plotData = {
      points: [
        [29.685, 76.99],
        [29.685, 76.991],
        [29.686, 76.991],
        [29.686, 76.99]
      ],
      areaHa: 0.405,
      acres: 1.0,
      perimeter: 254,
      centre: [29.6855, 76.9905],
      isEstimate: true
    };

    savePlot(plotData);
    const restored = getPlot();
    assert.ok(restored);
    assert.equal(restored.points.length, 4);
    assert.equal(restored.acres, 1.0);
    assert.equal(restored.isEstimate, true);
    assert.equal(restored.dataType, 'estimated');

    clearPlot();
    assert.equal(getPlot(), null);
  });

  test('plot with fewer than 3 vertices is rejected and deleted', () => {
    savePlot({ points: [[29.68, 76.99]] });
    assert.equal(getPlot(), null);
  });

  test('farm setup persists crop, irrigation, acres, and fertilizer list', () => {
    saveSetup({
      crop: 'mustard',
      irrigation: 'drip',
      sowDate: '2026-10-15',
      ferts: ['Urea', 'Zinc'],
      acres: 3.5
    });

    const setup = getSetup();
    assert.equal(setup.crop, 'mustard');
    assert.equal(setup.irrigation, 'drip');
    assert.equal(setup.acres, 3.5);
    assert.deepEqual(setup.ferts, ['Urea', 'Zinc']);
  });

  test('navigation step progression is persisted and clamped', () => {
    saveNav(4, 5);
    const nav = getNav();
    assert.equal(nav.step, 4);
    assert.equal(nav.maxStep, 5);

    // Out of range clamping
    saveNav(99, 100);
    const clamped = getNav();
    assert.equal(clamped.step, 6);
    assert.equal(clamped.maxStep, 6);
  });

  test('store handles corrupted JSON gracefully', () => {
    globalThis.window.localStorage.setItem('km.corrupt', '{bad json--');
    const val = store.get('km.corrupt', 'fallback');
    assert.equal(val, 'fallback');
  });
});

