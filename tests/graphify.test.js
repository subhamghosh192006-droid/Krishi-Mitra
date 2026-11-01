import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE_NODES, KNOWLEDGE_EDGES, tracePath } from '../scripts/graphify.js';

describe('Graphify Labs Codebase Knowledge Graph Tests', () => {
  test('contains comprehensive architecture nodes across all 5 subsystem layers', () => {
    assert.ok(KNOWLEDGE_NODES.length >= 15);
    const layers = new Set(KNOWLEDGE_NODES.map((n) => n.layer));
    assert.ok(layers.has('Telemetry'));
    assert.ok(layers.has('Agronomy'));
    assert.ok(layers.has('AI_Voice'));
    assert.ok(layers.has('Backend'));
    assert.ok(layers.has('Frontend'));
  });

  test('contains explicitly labeled connections and derivations', () => {
    assert.ok(KNOWLEDGE_EDGES.length >= 20);
    const types = new Set(KNOWLEDGE_EDGES.map((e) => e.type));
    assert.ok(types.has('RUNTIME_DATA_FLOW'));
    assert.ok(types.has('MATHEMATICAL_DERIVATION'));
    assert.ok(types.has('EXPLICIT_IMPORT'));
    assert.ok(types.has('PROXIED_UPSTREAM'));
  });

  test('traces shortest path from OpenMeteo satellite feed to ElevenLabs voice synthesis', () => {
    const path = tracePath('OpenMeteoAPI', 'ElevenLabsVoice');
    assert.ok(path !== null);
    assert.ok(path.length >= 3);
    assert.equal(path[0].node.id, 'OpenMeteoAPI');
    assert.equal(path[path.length - 1].node.id, 'ElevenLabsVoice');
  });

  test('traces path from field geometry to Gemma AI summarizer', () => {
    const path = tracePath('GeospatialGeometry', 'GemmaSummarizer');
    assert.ok(path !== null);
    assert.equal(path[0].node.id, 'GeospatialGeometry');
    assert.equal(path[path.length - 1].node.id, 'GemmaSummarizer');
  });
});

