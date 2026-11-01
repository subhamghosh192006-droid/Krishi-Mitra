/**
 * Krishi Mitra — Network API & Deterministic Synthetic Engine
 * Handles live satellite data pulls, reverse geocoding, mandi rate queries,
 * and zero-downtime offline PRNG simulation.
 */

import { isoLocal, addDays, clamp } from './calculations.js';

/* ---------------- Deterministic PRNG Fallback ---------------- */

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates an offline diurnal weather and soil profile using deterministic PRNG.
 * Explicitly tagged as simulated data.
 */
export function generateSyntheticWeather(lat, lon, seedDate = isoLocal()) {
  const seed = hashStr(lat.toFixed(3) + lon.toFixed(3) + seedDate);
  const rnd = mulberry32(seed);

  const times = [];
  const temp = [];
  const rh = [];
  const rain = [];
  const s1 = [];
  const s2 = [];
  const st = [];
  const et = [];
  const wind = [];
  const cloud = [];

  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() - 48);

  for (let i = 0; i < 14 * 24; i++) {
    const t = new Date(start.getTime() + i * 3600000);
    const h = t.getHours();
    // Diurnal sine wave peaking at 14:00 (2 PM)
    const d = Math.sin(((h - 8) / 24) * Math.PI * 2);
    const tv = 25 + d * 7 + (rnd() - 0.5) * 1.5;
    const rhv = clamp(72 - d * 20 + (rnd() - 0.5) * 9, 30, 97);

    times.push(isoLocal(t) + 'T' + String(h).padStart(2, '0') + ':00');
    temp.push(+tv.toFixed(1));
    rh.push(Math.round(rhv));
    rain.push(rnd() > 0.94 ? +(rnd() * 4).toFixed(1) : 0);
    s1.push(+(0.21 + (rnd() - 0.5) * 0.02).toFixed(3));
    s2.push(+(0.23 + (rnd() - 0.5) * 0.015).toFixed(3));
    st.push(+(tv - 3).toFixed(1));
    et.push(+clamp(0.06 + Math.max(0, d) * 0.22, 0, 0.4).toFixed(2));
    wind.push(Math.round(4 + rnd() * 12));
    cloud.push(Math.round(rnd() * 100));
  }

  const D = {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    precipitation_sum: [],
    precipitation_probability_max: [],
    et0_fao_evapotranspiration: [],
    wind_speed_10m_max: [],
    uv_index_max: [],
    sunrise: [],
    sunset: []
  };

  for (let i = 0; i < 16; i++) {
    const date = addDays(isoLocal(start), i);
    const base = 27 + Math.sin(i / 3) * 3;
    const rr = rnd() > 0.72 ? +(rnd() * 12).toFixed(1) : 0;
    D.time.push(date);
    D.weather_code.push(rr > 6 ? 82 : rr > 0 ? 61 : 2);
    D.temperature_2m_max.push(+(base + 3 + rnd()).toFixed(1));
    D.temperature_2m_min.push(+(base - 8 + rnd()).toFixed(1));
    D.precipitation_sum.push(rr);
    D.precipitation_probability_max.push(Math.round(clamp(rr * 14 + rnd() * 20, 0, 90)));
    D.et0_fao_evapotranspiration.push(+(3.4 + rnd() * 1.8).toFixed(2));
    D.wind_speed_10m_max.push(Math.round(8 + rnd() * 14));
    D.uv_index_max.push(+(5 + rnd() * 3).toFixed(1));
    D.sunrise.push(date + 'T06:12');
    D.sunset.push(date + 'T17:48');
  }

  return {
    _synthetic: true,
    dataType: 'simulated',
    source: 'simulated',
    current: {
      temperature_2m: temp[48],
      relative_humidity_2m: rh[48],
      apparent_temperature: temp[48] + 1,
      precipitation: 0,
      weather_code: D.weather_code[2],
      wind_speed_10m: wind[48],
      wind_direction_10m: 140,
      cloud_cover: cloud[48]
    },
    hourly: {
      time: times,
      temperature_2m: temp,
      relative_humidity_2m: rh,
      precipitation: rain,
      soil_moisture_0_to_7cm: s1,
      soil_moisture_7_to_28cm: s2,
      soil_temperature_0_to_7cm: st,
      et0_fao_evapotranspiration: et,
      wind_speed_10m: wind,
      cloud_cover: cloud
    },
    daily: D
  };
}

/* ---------------- Weather API ---------------- */

export function buildWeatherURL(lat, lon) {
  return (
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    lat +
    '&longitude=' +
    lon +
    '&hourly=temperature_2m,relative_humidity_2m,precipitation,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_temperature_0_to_7cm,et0_fao_evapotranspiration,wind_speed_10m,cloud_cover' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,wind_speed_10m_max,uv_index_max,sunrise,sunset' +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover' +
    '&timezone=auto&past_days=2&forecast_days=14'
  );
}

export async function fetchWeather(lat, lon, timeoutMs = 12000) {
  const url = buildWeatherURL(lat, lon);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.daily || !json.hourly) throw new Error('Malformed payload');
    json.dataType = 'live';
    json.source = 'live';
    json._synthetic = false;
    return json;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[API] Weather request failed, using deterministic simulated fallback:', err);
    return generateSyntheticWeather(lat, lon);
  }
}

/* ---------------- Geocoding ---------------- */

export async function reverseGeocode(lat, lon, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const parts = [j.city || j.locality || j.village, j.principalSubdivision].filter(Boolean);
    return parts.join(', ') || 'Your field';
  } catch (err) {
    clearTimeout(timer);
    return 'Your field';
  }
}

export async function searchPlaces(query, timeoutMs = 5000) {
  if (!query || query.trim().length < 2) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=6&language=en&format=json`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const j = await res.json();
    return j.results || [];
  } catch (err) {
    clearTimeout(timer);
    return [];
  }
}

/* ---------------- Mandi Commodity Rates ---------------- */

export async function fetchMandiRates(commodity = 'Wheat') {
  try {
    const res = await fetch(`/api/market?commodity=${encodeURIComponent(commodity)}`);
    if (!res.ok) return [];
    const j = await res.json();
    return j.records || [];
  } catch (err) {
    return [];
  }
}

