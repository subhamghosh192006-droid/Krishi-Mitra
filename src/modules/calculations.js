/**
 * Krishi Mitra — Mathematical, Geospatial & Agronomic Calculation Engine
 * 
 * Verified against FAO Irrigation and Drainage Paper 56 (FAO-56)
 * Dual Crop Coefficient & Soil Water Balance Method (Allen et al., 1998)
 */

import { CROPS } from '../data/crops.js';
import { SOILS } from '../data/soils.js';
import { analyzePestAndDiseaseRisk } from './pestModel.js';
import { analyzeFertilizerStewardship } from './fertilizerModel.js';

export { analyzePestAndDiseaseRisk, analyzeFertilizerStewardship };

/* ---------------- Basic Math & Formatting ---------------- */

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const sum = (arr) => (arr || []).reduce((acc, val) => acc + (Number(val) || 0), 0);
export const avg = (arr) => (arr && arr.length ? sum(arr) / arr.length : 0);
export const fmt = (n, d = 0) => (Number.isFinite(+n) ? (+n).toFixed(d) : '—');

export function isoLocal(d = new Date()) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

export function prettyDate(iso, options = {}) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString(
    'en-IN',
    Object.assign({ day: 'numeric', month: 'short' }, options)
  );
}

export function dayName(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

/* ---------------- Geospatial Geometry (WGS84 Spherical) ---------------- */

/**
 * Great-circle distance between two [lat, lon] points in meters using Haversine formula.
 * Earth mean radius R = 6,371,000 meters.
 */
export function haversine(a, b) {
  if (!a || !b || a.length < 2 || b.length < 2) return 0;
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Spherical polygon area on Earth in hectares using Green's Theorem.
 * Earth radius R = 6,378,137 meters (WGS84 authalic / equatorial radius).
 */
export function polygonAreaHa(pts) {
  if (!pts || pts.length < 3) return 0;
  const R = 6378137;
  const rad = Math.PI / 180;
  let total = 0;
  const len = pts.length;

  for (let i = 0; i < len; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % len];
    total += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }
  return Math.abs((total * R * R) / 2) / 10000;
}

export function polygonAreaAcres(pts) {
  return polygonAreaHa(pts) * 2.4710538;
}

/**
 * Perimeter of polygon in meters.
 */
export function perimeterM(pts) {
  if (!pts || pts.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    p += haversine(pts[i], pts[(i + 1) % pts.length]);
  }
  return p;
}

/**
 * Center / Centroid of polygon vertices [lat, lon].
 */
export function centroid(pts) {
  if (!pts || !pts.length) return null;
  return [avg(pts.map((p) => p[0])), avg(pts.map((p) => p[1]))];
}

/**
 * Generates an accurate square polygon around a center coordinate.
 * 1 acre = 4046.85642 m².
 * Side length = sqrt(4046.85642 * targetAcres) meters.
 */
export function generateAcreSquare(centerLat, centerLon, targetAcres = 1) {
  const sqMeters = targetAcres * 4046.85642;
  const sideMeters = Math.sqrt(sqMeters);
  const halfSide = sideMeters / 2;

  // 1 degree latitude ~ 111,320 meters
  const dLat = halfSide / 111320;
  // 1 degree longitude ~ 111,320 * cos(lat) meters
  const radLat = (centerLat * Math.PI) / 180;
  const dLon = halfSide / (111320 * Math.cos(radLat));

  // Closed counter-clockwise square corners
  const points = [
    [centerLat - dLat, centerLon - dLon],
    [centerLat - dLat, centerLon + dLon],
    [centerLat + dLat, centerLon + dLon],
    [centerLat + dLat, centerLon - dLon]
  ];

  const ha = polygonAreaHa(points);
  const acres = ha * 2.4710538;
  const per = perimeterM(points);

  return {
    points,
    areaHa: ha,
    acres: acres,
    perimeter: per,
    centre: [centerLat, centerLon],
    isEstimate: true,
    dataType: 'estimated'
  };
}

/* ---------------- Agronomic Models (FAO-56 Validated) ---------------- */

/**
 * Growing Degree Days (GDD) thermal time calculation.
 * Standard FAO/USDA formula with upper heat stress truncation at upperTemp.
 */
export function calcDailyGDD(tmax, tmin, baseTemp, upperTemp = 35) {
  const tmaxAdj = Math.max(baseTemp, Math.min(tmax, upperTemp));
  const tminAdj = Math.max(baseTemp, Math.min(tmin, upperTemp));
  const mean = (tmaxAdj + tminAdj) / 2;
  return Math.max(0, mean - baseTemp);
}

/**
 * Accumulates GDD from sowing date to today to establish crop phenology.
 */
export function calcCropStage(crop, sowDate, dailyWeather) {
  const d = dailyWeather;
  if (!d || !d.time || !d.time.length) {
    return { gdd: 0, idx: 0, name: crop.s[0][0], progress: 0, maturity: crop.s[crop.s.length - 1][1] };
  }

  const today = isoLocal();
  const ti = d.time.indexOf(today) >= 0 ? d.time.indexOf(today) : Math.min(2, d.time.length - 1);
  const fallbackTmax = avg(d.temperature_2m_max.slice(ti, ti + 5)) || 28;
  const fallbackTmin = avg(d.temperature_2m_min.slice(ti, ti + 5)) || 16;

  let gdd = 0;
  let date = sowDate;
  let guard = 0;

  while (date <= today && guard < 400) {
    const i = d.time.indexOf(date);
    const tmax = i >= 0 ? d.temperature_2m_max[i] : fallbackTmax;
    const tmin = i >= 0 ? d.temperature_2m_min[i] : fallbackTmin;
    gdd += calcDailyGDD(tmax, tmin, crop.base, crop.upperTemp || 35);
    date = addDays(date, 1);
    guard++;
  }

  let idx = 0;
  crop.s.forEach((stage, i) => {
    if (gdd >= stage[1]) idx = i;
  });

  const maturity = crop.s[crop.s.length - 1][1];
  const progress = clamp(gdd / (maturity || 1), 0, 1);

  return {
    gdd: Math.round(gdd),
    idx,
    name: crop.s[idx][0],
    progress,
    maturity
  };
}

/**
 * Dynamic Root Depth: Root depth increases with crop growth stage (FAO-56).
 * Early vegetative crops have shallow root zones (0.15-0.25 m); full depth is reached at flowering.
 */
export function calcEffectiveRootDepth(crop, progress) {
  const minDepth = crop.rootMin || 0.20;
  const maxDepth = crop.rootMax || crop.root || 1.0;
  // Roots expand quickly and reach ~95% by 65% of season (flowering/reproduction)
  const rootProgress = clamp(progress / 0.65, 0, 1);
  return minDepth + (maxDepth - minDepth) * rootProgress;
}

/**
 * Dynamic FAO-56 4-Stage Crop Coefficient (Kc).
 * Transitions smoothly from initial (KcIni) to mid-season (KcMid) to end-season (KcEnd).
 */
export function calcDynamicKc(crop, progress) {
  const kcIni = crop.kcIni || 0.35;
  const kcMid = crop.kcMid || 1.15;
  const kcEnd = crop.kcEnd || 0.40;

  if (progress < 0.15) {
    // Initial stage
    return kcIni;
  } else if (progress < 0.40) {
    // Crop development stage: linear ramp
    const frac = (progress - 0.15) / (0.40 - 0.15);
    return kcIni + (kcMid - kcIni) * frac;
  } else if (progress < 0.75) {
    // Mid-season stage: peak transpiration
    return kcMid;
  } else {
    // Late season / ripening stage
    const frac = (progress - 0.75) / (1.0 - 0.75);
    return kcMid + (kcEnd - kcMid) * frac;
  }
}

/**
 * Depth-weighted Composite Soil Water Content (SWC).
 * 45% topsoil (0-7 cm) + 55% root-zone (7-28 cm) from ECMWF ERA5-Land.
 */
export function calcSWC(topMoisture, deepMoisture) {
  const top = Number.isFinite(topMoisture) ? topMoisture : 0.21;
  const deep = Number.isFinite(deepMoisture) ? deepMoisture : 0.23;
  return top * 0.45 + deep * 0.55;
}

/**
 * Total Available Water (TAW) in the root zone in millimeters.
 * TAW = 1000 * (Field Capacity - Wilting Point) * Effective Root Depth
 */
export function calcTAW(soilFc, soilWp, effectiveRootDepth) {
  return (soilFc - soilWp) * effectiveRootDepth * 1000;
}

/**
 * Readily Available Water (RAW) before crop water stress occurs.
 * RAW = p * TAW, where p is FAO-56 depletion factor adjusted for atmospheric demand.
 */
export function calcRAW(taw, depletionFraction = 0.55, et0 = 4) {
  // FAO-56 equation 56: p_adj = p + 0.04 * (5 - ETc)
  const pAdj = clamp(depletionFraction + 0.04 * (5 - et0), 0.15, 0.80);
  return taw * pAdj;
}

/**
 * Effective rainfall calculation: light showers under 3 mm evaporate rapidly;
 * remaining precipitation is ~80% effective up to soil moisture deficit.
 */
export function calcEffectiveRain(rainArray) {
  const total = sum(rainArray);
  if (total <= 3) return 0;
  return (total - 3) * 0.80;
}

/**
 * Soil inference from geographic bounding boxes in India & ERA5-Land baseline moisture.
 */
export function inferSoil(lat, lon, sm) {
  if (lat > 24 && lat < 32 && lon > 73 && lon < 89) return 'alluvial';
  if (lat > 15 && lat < 24 && lon > 73 && lon < 80) return 'black';
  if (lat > 23 && lat < 31 && lon > 68 && lon < 75.5) return 'sandy';
  if (lat > 8 && lat < 16 && lon > 73 && lon < 78) return 'laterite';
  if (lat > 10 && lat < 22 && lon > 77 && lon < 85) return 'red';
  return sm > 0.30 ? 'clay' : 'red';
}

/**
 * Comprehensive FAO-56 Irrigation Decision Engine.
 * Combines root-zone water balance, dynamic phenology, and atmospheric forecast.
 */
export function computeIrrigationDecision({
  weather,
  soilKey = 'alluvial',
  cropKey = 'wheat',
  irrigationType = 'flood',
  sowDate = isoLocal(),
  acres = 1,
  ferts = ['Urea', 'DAP'],
  source = 'live'
}) {
  if (!weather || !weather.daily || !weather.hourly) {
    throw new Error('Weather data is missing or incomplete for irrigation calculation.');
  }

  const d = weather.daily;
  const h = weather.hourly;
  const today = isoLocal();
  const ti = d.time.indexOf(today) >= 0 ? d.time.indexOf(today) : Math.min(2, d.time.length - 1);

  // Current hour index in hourly arrays
  const hi = (h.time || []).findIndex((t) => new Date(t) >= new Date(Date.now() - 30 * 60000));
  const hourIdx = hi < 0 ? (h.time || []).length - 1 : hi;

  const crop = CROPS[cropKey] || CROPS.wheat;
  const soil = SOILS[soilKey] || SOILS.alluvial;

  // System application efficiency (FAO standard)
  const systemEfficiency = { drip: 0.90, sprinkler: 0.75, flood: 0.55, rainfed: 0.40 }[irrigationType] || 0.60;

  // Hourly soil moisture from ERA5-Land
  const topSm = h.soil_moisture_0_to_7cm?.[hourIdx] ?? 0.21;
  const deepSm = h.soil_moisture_7_to_28cm?.[hourIdx] ?? 0.23;
  const swc = calcSWC(topSm, deepSm);

  // Phenology & growth stage
  const stage = calcCropStage(crop, sowDate, d);
  const rootDepth = calcEffectiveRootDepth(crop, stage.progress);
  const kc = calcDynamicKc(crop, stage.progress);
  const et0 = d.et0_fao_evapotranspiration?.[ti] ?? 4.0;
  const cropET = et0 * kc;

  // Soil water balance
  const taw = calcTAW(soil.fc, soil.wp, rootDepth);
  const avail = clamp((swc - soil.wp) / (soil.fc - soil.wp || 0.001), 0, 1);
  const paw = avail * taw;
  const raw = calcRAW(taw, crop.depletionFraction || 0.55, cropET);
  const stressThresholdFrac = clamp(1 - (crop.depletionFraction || 0.55), 0.25, 0.65);

  // Precipitation forecasts
  const rain24Raw = sum((h.precipitation || []).slice(hourIdx, hourIdx + 24));
  const rain72Raw = sum((h.precipitation || []).slice(hourIdx, hourIdx + 72));
  const rain72Eff = calcEffectiveRain((h.precipitation || []).slice(hourIdx, hourIdx + 72));

  // Irrigation deficit calculation:
  // Water needed to bring root zone back to optimal field capacity
  const targetBuffer = taw * 0.75;
  const deficit = Math.max(0, targetBuffer - paw);
  const netApplication = Math.max(0, deficit - rain72Eff);
  const grossApplication = Math.min(65, Math.round(netApplication / Math.max(0.40, systemEfficiency)));

  // Scientific Verdict Determination
  let verdict = 'skip';
  let tone = 'hold';

  // Rule 1: Imminent rain -> Hold water to avoid waterlogging and nitrogen leaching
  if (rain24Raw >= 6 || (rain72Raw >= 14 && avail > 0.32)) {
    verdict = 'hold';
    tone = 'hold';
  }
  // Rule 2: Soil water is below allowable depletion threshold (stress zone) and no rain
  else if (avail < stressThresholdFrac && rain72Raw < 10) {
    verdict = 'today';
    tone = 'today';
  }
  // Rule 3: Moisture is dropping towards stress threshold within 1-2 days
  else if (avail < 0.55 && rain72Raw < 12) {
    verdict = 'soon';
    tone = 'soon';
  } else {
    verdict = 'skip';
    tone = 'hold';
  }

  // Recommended depth in mm
  const mm = verdict === 'today'
    ? Math.max(12, grossApplication)
    : verdict === 'soon'
    ? Math.max(8, Math.round(grossApplication * 0.65))
    : 0;

  // Best application window
  const when = verdict === 'today'
    ? 'today, 5–8 am'
    : verdict === 'soon'
    ? 'in ' + Math.max(1, Math.ceil((stressThresholdFrac + 0.10 - avail) * 10)) + ' days, early morning'
    : 'not before ' + prettyDate(addDays(today, Math.max(2, Math.round((avail - 0.35) * 14))), { day: 'numeric', month: 'short' });

  // Volume in Liters (1 mm over 1 m² = 1 L; 1 acre = 4046.86 m²)
  const litres = Math.round(mm * 4046.85642 * acres);

  // Confidence index (penalized if running on synthetic fallback)
  const isSynthetic = source === 'simulated' || source === 'demo' || weather._synthetic;
  const confidence = Math.round(
    clamp(76 + (isSynthetic ? -16 : 8) + (acres > 0 ? 5 : 0) + (rain72Raw > 0 ? 3 : 0), 45, 96)
  );

  // Transparent evidence trail
  const reasons = [
    {
      s: avail >= 0.55 ? 'good' : avail >= stressThresholdFrac ? 'neu' : 'bad',
      i: '◉',
      t: `Plant-available soil water is ${Math.round(avail * 100)}%`,
      d: `Root zone (${rootDepth.toFixed(2)} m) holds ${Math.round(paw)} mm of the ${Math.round(taw)} mm your ${crop.name} roots can reach.`
    },
    {
      s: rain24Raw >= 5 ? 'good' : 'neu',
      i: '☂',
      t: `${fmt(rain24Raw, 1)} mm rain expected in 24 hours`,
      d: rain24Raw >= 5
        ? 'Enough to satisfy one day of crop transpiration demand without irrigation.'
        : 'Light precipitation will not infiltrate deeply into the root zone.'
    },
    {
      s: rain72Raw >= 12 ? 'good' : 'neu',
      i: '⋯',
      t: `${fmt(rain72Raw, 1)} mm expected over three days`,
      d: 'Forecast rain is counted with FAO effective infiltration discounting surface runoff.'
    },
    {
      s: cropET > 5 ? 'bad' : 'neu',
      i: '☀',
      t: `Crop water demand today ≈ ${fmt(cropET, 1)} mm`,
      d: `ET₀ ${fmt(et0, 1)} mm/day × dynamic Kc ${kc.toFixed(2)} (${stage.name} stage).`
    },
    {
      s: 'neu',
      i: '⛆',
      t: `${irrigationType.charAt(0).toUpperCase() + irrigationType.slice(1)} system at ${Math.round(systemEfficiency * 100)}% efficiency`,
      d: grossApplication
        ? `Applying ${grossApplication} mm delivers ~${Math.round(grossApplication * systemEfficiency)} mm directly to root depth.`
        : 'No supplementary irrigation required under current moisture conditions.'
    }
  ];

  // Pest & Fungal Early Warning Analysis
  const pestRisk = analyzePestAndDiseaseRisk({ weather, cropKey });
  reasons.push({
    s: pestRisk.level === 'High' ? 'bad' : pestRisk.level === 'Moderate' ? 'neu' : 'good',
    i: pestRisk.level === 'High' ? '⚠️' : pestRisk.level === 'Moderate' ? '🔍' : '🛡️',
    t: `Pest & disease risk: ${pestRisk.level} · ${pestRisk.diseaseName}`,
    d: `${pestRisk.advisory} ${pestRisk.preventiveAction}`
  });

  // 4R Fertilizer Stewardship & Leaching Guard
  const fertPlan = analyzeFertilizerStewardship({
    cropKey,
    ferts: Array.isArray(ferts) ? ferts : ['Urea', 'DAP'],
    stage,
    weather,
    acres
  });
  reasons.push({
    s: fertPlan.leachingRisk === 'High' ? 'bad' : fertPlan.leachingRisk === 'Moderate' ? 'neu' : 'good',
    i: fertPlan.leachingRisk === 'High' ? '⛔' : '🌱',
    t: `Nutrient stewardship: ${fertPlan.leachingRisk === 'High' ? 'Hold Fertilizer' : fertPlan.timing}`,
    d: fertPlan.leachingRisk === 'High'
      ? fertPlan.leachingAdvisory
      : `${fertPlan.activeStageName}: ${fertPlan.recommendedDose}`
  });

  return {
    verdict,
    tone,
    avail,
    paw,
    taw,
    raw,
    rootDepth,
    stressThresholdFrac,
    rain24: rain24Raw,
    rain72: rain72Raw,
    et0,
    cropET,
    kc,
    gross: grossApplication,
    mm,
    when,
    confidence,
    reasons,
    eff: systemEfficiency,
    stage,
    litres,
    acres,
    pestRisk,
    fertPlan,
    dataType: isSynthetic ? 'simulated' : 'estimated',
    weatherSource: isSynthetic ? 'simulated' : 'live'
  };
}

/* ---------------- Crop Suitability & Financial Models ---------------- */

export function calcScenarioFactors(scenario = 'normal') {
  if (scenario === 'dry') return { water: 0.72, price: 1.08 };
  if (scenario === 'wet') return { water: 1.15, price: 0.96 };
  return { water: 1.0, price: 1.0 };
}

export function calcSystemCapacity(irrigationType = 'flood') {
  return { drip: 1100, sprinkler: 950, flood: 1400, rainfed: 520 }[irrigationType] || 900;
}

/**
 * Multi-criteria crop suitability ranking engine.
 * Weights: Soil affinity (32%), Climate temperature match (24%), Water capacity (24%), Sowing calendar (20%).
 */
export function rankCropSuitability({
  weather,
  soilKey = 'alluvial',
  sowDate = isoLocal(),
  irrigationType = 'flood',
  scenario = 'normal',
  sortMode = 'fit'
}) {
  if (!weather || !weather.daily) {
    return { list: [], meanTemp: 24 };
  }

  const d = weather.daily;
  const ti = d.time.indexOf(isoLocal()) >= 0 ? d.time.indexOf(isoLocal()) : Math.min(2, d.time.length - 1);
  const next7Max = d.temperature_2m_max.slice(ti, ti + 7);
  const next7Min = d.temperature_2m_min.slice(ti, ti + 7);
  const meanTemp = avg(next7Max.concat(next7Min)) || 25;

  const month = new Date(sowDate + 'T12:00:00').getMonth() + 1;
  const sf = calcScenarioFactors(scenario);
  const cap = calcSystemCapacity(irrigationType);

  const list = Object.entries(CROPS).map(([key, crop]) => {
    const soilFit = crop.soil[soilKey] ?? 0.50;
    const climateFit = meanTemp >= crop.ideal[0] && meanTemp <= crop.ideal[1]
      ? 1.0
      : clamp(1 - Math.min(Math.abs(meanTemp - crop.ideal[0]), Math.abs(meanTemp - crop.ideal[1])) / 14, 0.15, 1.0);

    const waterFit = crop.need <= cap
      ? 1.0
      : clamp(1 - ((crop.need - cap) / crop.need) * 1.35, 0.18, 1.0) * sf.water;

    const seasonFit = crop.months.includes(month)
      ? 1.0
      : crop.months.includes(month === 1 ? 12 : month - 1) || crop.months.includes(month === 12 ? 1 : month + 1)
      ? 0.65
      : 0.30;

    const score = Math.round(
      100 * (0.32 * soilFit + 0.24 * climateFit + 0.24 * clamp(waterFit, 0, 1) + 0.20 * seasonFit)
    );

    const profitPerAcre = Math.round(crop.profit * (0.86 + (0.14 * score) / 100) * sf.price);

    return {
      key,
      crop,
      score,
      soilFit,
      climateFit,
      waterFit: clamp(waterFit, 0, 1),
      seasonFit,
      profit: profitPerAcre,
      dataType: 'estimated'
    };
  });

  list.sort((a, b) => (sortMode === 'profit' ? b.profit - a.profit : b.score - a.score));

  return { list, meanTemp };
}

