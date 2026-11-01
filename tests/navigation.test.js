import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canNavigateToStep, calculateMaxStep } from '../src/modules/navigation.js';

describe('Navigation Step Guard Tests', () => {
  test('step 1 (login) is always accessible', () => {
    const res = canNavigateToStep(1, {});
    assert.equal(res.allowed, true);
  });

  test('blocks step 2 when unauthenticated', () => {
    const res = canNavigateToStep(2, { user: null, guest: false });
    assert.equal(res.allowed, false);
    assert.equal(res.suggestedStep, 1);
  });

  test('allows step 2 when user is logged in or guest', () => {
    assert.equal(canNavigateToStep(2, { user: { name: 'Farmer' } }).allowed, true);
    assert.equal(canNavigateToStep(2, { guest: true }).allowed, true);
  });

  test('blocks step 3 when location is missing', () => {
    const res = canNavigateToStep(3, { user: { name: 'Farmer' }, location: null });
    assert.equal(res.allowed, false);
    assert.equal(res.suggestedStep, 2);
  });

  test('allows step 3 when location is confirmed', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 }
    };
    assert.equal(canNavigateToStep(3, state).allowed, true);
  });

  test('blocks step 4 when plot has fewer than 3 corners', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: null,
      draft: [[29.68, 76.99], [29.69, 76.99]] // only 2 points
    };
    const res = canNavigateToStep(4, state);
    assert.equal(res.allowed, false);
    assert.equal(res.suggestedStep, 3);
  });

  test('allows step 4 when plot has 3 or more corners', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: { points: [[1, 1], [1, 2], [2, 2]] }
    };
    assert.equal(canNavigateToStep(4, state).allowed, true);
  });

  test('blocks step 5 when farm setup is incomplete', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: { points: [[1, 1], [1, 2], [2, 2]] },
      setup: { crop: '', acres: 0 }
    };
    const res = canNavigateToStep(5, state);
    assert.equal(res.allowed, false);
    assert.equal(res.suggestedStep, 4);
  });

  test('allows step 5 when farm setup is completed', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: { points: [[1, 1], [1, 2], [2, 2]] },
      setup: { crop: 'wheat', acres: 1.5, sowDate: '2026-10-10' }
    };
    assert.equal(canNavigateToStep(5, state).allowed, true);
  });

  test('blocks step 6 when weather is missing', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: { points: [[1, 1], [1, 2], [2, 2]] },
      setup: { crop: 'wheat', acres: 1.5, sowDate: '2026-10-10' },
      weather: null
    };
    const res = canNavigateToStep(6, state);
    assert.equal(res.allowed, false);
    assert.equal(res.suggestedStep, 4);
  });

  test('allows step 6 and 7 when setup and weather are ready', () => {
    const state = {
      user: { name: 'Farmer' },
      location: { lat: 29.6857, lon: 76.9905 },
      plot: { points: [[1, 1], [1, 2], [2, 2]] },
      setup: { crop: 'wheat', acres: 1.5, sowDate: '2026-10-10' },
      weather: { daily: {} }
    };
    assert.equal(canNavigateToStep(6, state).allowed, true);
    assert.equal(canNavigateToStep(7, state).allowed, true);
  });

  test('rejects out of bounds step numbers', () => {
    assert.equal(canNavigateToStep(0, {}).allowed, false);
    assert.equal(canNavigateToStep(8, {}).allowed, false);
    assert.equal(canNavigateToStep('invalid', {}).allowed, false);
  });

  test('calculateMaxStep correctly identifies progress threshold', () => {
    assert.equal(calculateMaxStep({ user: null }), 1);
    assert.equal(calculateMaxStep({ user: { name: 'F' } }), 2);
    assert.equal(calculateMaxStep({ user: { name: 'F' }, location: { lat: 29 } }), 3);
    assert.equal(calculateMaxStep({ user: { name: 'F' }, location: { lat: 29 }, plot: { points: [[1,1],[2,2],[3,3]] } }), 4);
    assert.equal(calculateMaxStep({ user: { name: 'F' }, location: { lat: 29 }, plot: { points: [[1,1],[2,2],[3,3]] }, setup: { crop: 'wheat', acres: 1 } }), 5);
    assert.equal(calculateMaxStep({ user: { name: 'F' }, location: { lat: 29 }, plot: { points: [[1,1],[2,2],[3,3]] }, setup: { crop: 'wheat', acres: 1 }, weather: {} }), 7);
  });
});

