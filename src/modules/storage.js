/**
 * Krishi Mitra — Resilient Client Storage Layer
 * Handles schema validation, default fallbacks, quota exceptions,
 * and multi-step state persistence.
 */

const STORAGE_KEYS = {
  SESSION: 'km.session',
  LOCATION: 'km.location',
  PLOT: 'km.plot',
  SETUP: 'km.setup',
  NAV: 'km.nav'
};

/**
 * Low-level safe storage wrapper
 */
export const store = {
  get(key, fallback = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const val = window.localStorage.getItem(key);
      if (val === null || val === undefined) return fallback;
      return JSON.parse(val);
    } catch (e) {
      console.warn(`[Storage] Failed to read ${key}:`, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to write ${key}:`, e);
      return false;
    }
  },

  del(key) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove ${key}:`, e);
    }
  }
};

/* ---------------- Session Persistence ---------------- */

export function saveSession({ email, guest = false, name = '' }) {
  const session = {
    email: email || null,
    guest: !!guest,
    name: name || (guest ? 'Guest' : (email ? email.split('@')[0] : 'Farmer')),
    at: Date.now()
  };
  store.set(STORAGE_KEYS.SESSION, session);
  return session;
}

export function getSession(maxAgeMs = 14 * 24 * 60 * 60 * 1000) {
  const session = store.get(STORAGE_KEYS.SESSION, null);
  if (!session || !session.at) return null;
  // Expire after 14 days
  if (Date.now() - session.at > maxAgeMs) {
    clearSession();
    return null;
  }
  return session;
}

export function clearSession() {
  store.del(STORAGE_KEYS.SESSION);
}

/* ---------------- Location Persistence ---------------- */

const DEFAULT_LOCATION = {
  lat: 29.6857,
  lon: 76.9905,
  name: 'Karnal, Haryana',
  accuracy: null,
  dataType: 'live'
};

export function saveLocation(loc) {
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') return;
  const payload = {
    lat: Number(loc.lat.toFixed(5)),
    lon: Number(loc.lon.toFixed(5)),
    name: loc.name || 'Your field',
    accuracy: loc.accuracy != null ? Number(loc.accuracy) : null,
    updatedAt: Date.now()
  };
  store.set(STORAGE_KEYS.LOCATION, payload);
  return payload;
}

export function getLocation() {
  const saved = store.get(STORAGE_KEYS.LOCATION, null);
  if (!saved || typeof saved.lat !== 'number' || typeof saved.lon !== 'number') {
    return Object.assign({}, DEFAULT_LOCATION);
  }
  return Object.assign({}, DEFAULT_LOCATION, saved);
}

/* ---------------- Plot Boundary Persistence ---------------- */

export function savePlot(plot) {
  if (!plot || !Array.isArray(plot.points) || plot.points.length < 3) {
    store.del(STORAGE_KEYS.PLOT);
    return null;
  }
  const payload = {
    points: plot.points.map((p) => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]),
    areaHa: Number(plot.areaHa || 0),
    acres: Number(plot.acres || 0),
    perimeter: Number(plot.perimeter || 0),
    centre: plot.centre ? [Number(plot.centre[0].toFixed(5)), Number(plot.centre[1].toFixed(5))] : null,
    isEstimate: !!plot.isEstimate,
    dataType: plot.isEstimate ? 'estimated' : 'live',
    updatedAt: Date.now()
  };
  store.set(STORAGE_KEYS.PLOT, payload);
  return payload;
}

export function getPlot() {
  const saved = store.get(STORAGE_KEYS.PLOT, null);
  if (!saved || !Array.isArray(saved.points) || saved.points.length < 3) {
    return null;
  }
  return saved;
}

export function clearPlot() {
  store.del(STORAGE_KEYS.PLOT);
}

/* ---------------- Farm Setup Persistence ---------------- */

const DEFAULT_SETUP = {
  crop: 'wheat',
  irrigation: 'flood',
  sowDate: new Date().toISOString().slice(0, 10),
  ferts: ['DAP', 'Urea'],
  acres: 1.0
};

export function saveSetup(setup) {
  if (!setup) return;
  const payload = {
    crop: setup.crop || DEFAULT_SETUP.crop,
    irrigation: setup.irrigation || DEFAULT_SETUP.irrigation,
    sowDate: setup.sowDate || DEFAULT_SETUP.sowDate,
    ferts: Array.isArray(setup.ferts) ? setup.ferts : DEFAULT_SETUP.ferts,
    acres: Math.max(0.01, Number(setup.acres) || 1.0),
    updatedAt: Date.now()
  };
  store.set(STORAGE_KEYS.SETUP, payload);
  return payload;
}

export function getSetup() {
  const saved = store.get(STORAGE_KEYS.SETUP, null);
  return Object.assign({}, DEFAULT_SETUP, saved || {});
}

/* ---------------- Navigation / Step Progression ---------------- */

export function saveNav(step, maxStep) {
  const payload = {
    step: Number(step) || 1,
    maxStep: Math.max(Number(step) || 1, Number(maxStep) || 1)
  };
  store.set(STORAGE_KEYS.NAV, payload);
  return payload;
}

export function getNav() {
  const saved = store.get(STORAGE_KEYS.NAV, null);
  if (!saved || typeof saved.step !== 'number') {
    return { step: 1, maxStep: 2 };
  }
  return {
    step: Math.max(1, Math.min(6, saved.step)),
    maxStep: Math.max(1, Math.min(6, saved.maxStep || saved.step))
  };
}

export function resetAllState() {
  clearPlot();
  store.del(STORAGE_KEYS.LOCATION);
  store.del(STORAGE_KEYS.SETUP);
  store.del(STORAGE_KEYS.NAV);
}

