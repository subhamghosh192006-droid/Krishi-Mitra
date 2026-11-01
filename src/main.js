/**
 * Krishi Mitra — Client Application Core Controller
 * Orchestrates Geospatial GIS, Agronomic FAO-56 Models, Multi-step Navigation,
 * Resilient Persistence, and Accessible UI.
 */

import { CROPS } from './data/crops.js';
import { SOILS } from './data/soils.js';
import { getLanguage, setLanguage, t } from './data/i18n.js';
import {
  clamp,
  sum,
  avg,
  fmt,
  isoLocal,
  addDays,
  prettyDate,
  dayName,
  polygonAreaHa,
  polygonAreaAcres,
  perimeterM,
  centroid,
  generateAcreSquare,
  inferSoil,
  computeIrrigationDecision,
  rankCropSuitability,
  calcScenarioFactors
} from './modules/calculations.js';
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
} from './modules/storage.js';
import {
  fetchWeather,
  generateSyntheticWeather,
  reverseGeocode,
  searchPlaces
} from './modules/api.js';
import {
  isLeafletAvailable,
  initLocationMap,
  initTraceMap,
  syncTraceLayers,
  fitBounds
} from './modules/map.js';
import {
  STEP_METADATA,
  canNavigateToStep,
  calculateMaxStep
} from './modules/navigation.js';
import {
  fetchAiSummary,
  playSpeech,
  stopSpeech,
  isSpeechPlaying
} from './modules/aiAdvisor.js';
import {
  computeMandiArbitrage,
  evaluateStorageBreakeven,
  getCostOfCultivationBreakdown,
  MSP_BENCHMARKS
} from './modules/marketModel.js';

/* ---------------- DOM Helpers ---------------- */
const $ = (selector, el = document) => el.querySelector(selector);
const $$ = (selector, el = document) => Array.from(el.querySelectorAll(selector));

function toast(msg, kind = '') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3800);
}

/* ---------------- Application State ---------------- */
const state = {
  step: 1,
  maxStep: 2,
  user: null,
  guest: false,
  location: getLocation(),
  accuracy: null,
  weather: null,
  source: 'live', // 'live' | 'simulated'
  lastSync: null,
  fetching: false,
  soilKey: 'alluvial',
  plot: null,
  draft: [],
  markers: [],
  polygon: null,
  setup: getSetup(),
  decision: null,
  ranking: [],
  scenario: 'normal',
  sortMode: 'fit',
  analytics: false,
  marketCrop: 'wheat',
  storageHorizonDays: 60,
  maps: {
    loc: null,
    locMarker: null,
    trace: null
  }
};

/* ---------------- Navigation Controller ---------------- */

function goStep(targetStep, force = false) {
  const stepNum = Number(targetStep);

  if (!force) {
    const check = canNavigateToStep(stepNum, state);
    if (!check.allowed) {
      toast(check.reason, 'warn');
      return;
    }
  }

  stopSpeech();
  state.step = stepNum;
  state.maxStep = Math.max(state.maxStep, calculateMaxStep(state), stepNum);
  saveNav(state.step, state.maxStep);

  const isLogin = stepNum === 1;
  const loginView = $('#viewLogin');
  const appView = $('#viewApp');

  if (loginView && appView) {
    loginView.classList.toggle('active', isLogin);
    appView.classList.toggle('active', !isLogin);
  }

  if (isLogin) {
    window.scrollTo({ top: 0 });
    return;
  }

  const meta = STEP_METADATA[stepNum];
  if (meta) {
    const eyebrow = $('#stepEyebrow');
    const title = $('#stepTitle');
    const sub = $('#stepSub');
    const lang = getLanguage();
    if (eyebrow) {
      eyebrow.textContent = lang === 'hi'
        ? `चरण ${stepNum} (7 में से) · ${t('step' + stepNum)}`
        : `Step ${stepNum} of 7 · ${meta.label}`;
    }
    if (title) title.textContent = t(`step${stepNum}_title`, meta.title);
    if (sub) sub.textContent = t(`step${stepNum}_sub`, meta.sub);
  }

  $$('.panel-step').forEach((panel) => {
    panel.classList.toggle('active', Number(panel.dataset.step) === stepNum);
  });

  updateStepperUI();

  const backBtn = $('#backBtn');
  if (backBtn) {
    backBtn.textContent = t('backBtn');
    backBtn.style.visibility = stepNum <= 2 ? 'hidden' : 'visible';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Step activation hooks
  setTimeout(() => {
    if (stepNum === 2 && state.maps.loc) {
      state.maps.loc.invalidateSize();
    }
    if (stepNum === 3) {
      if (state.maps.trace) state.maps.trace.invalidateSize();
      renderPlotLayers();
    }
    if (stepNum === 4) {
      startScanProcess();
    }
    if (stepNum === 5) {
      renderDecisionView();
    }
    if (stepNum === 6) {
      renderCropsView();
    }
    if (stepNum === 7) {
      renderMarketView();
    }
  }, 90);
}

function updateStepperUI() {
  $$('#stepper li').forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('active', s === state.step);
    li.classList.toggle('done', s < state.step);
    const locked = s > state.maxStep;
    li.classList.toggle('locked', locked);

    // Update label text based on language
    const em = li.querySelector('em');
    if (em) em.textContent = t('step' + s);

    // Keyboard accessibility attributes
    li.setAttribute('role', 'tab');
    li.setAttribute('tabindex', locked ? '-1' : '0');
    li.setAttribute('aria-selected', s === state.step ? 'true' : 'false');
    li.setAttribute('aria-label', `Step ${s}: ${t('step' + s)}`);
  });

  const saveChip = $('#saveChip');
  if (saveChip) {
    if (state.source === 'simulated') {
      saveChip.innerHTML = `<span class="data-badge sim"><span class="dot"></span>${t('simulatedMode')}</span>`;
    } else {
      saveChip.innerHTML = `<span class="data-badge live"><span class="dot"></span>${t('liveSatellite')}</span>`;
    }
  }

  // Update language toggle button label
  const langLabel = $('#langLabel');
  if (langLabel) {
    langLabel.textContent = getLanguage() === 'hi' ? 'EN' : 'हिंदी';
  }
  const loginLangBtn = $('#loginLangBtn');
  if (loginLangBtn) {
    loginLangBtn.textContent = getLanguage() === 'hi' ? 'EN' : 'हिंदी';
  }
}

/* ---------------- Auth & Session ---------------- */

function loginUser(email, guest = false) {
  state.guest = !!guest;
  const rawName = guest
    ? 'Guest'
    : (email.split('@')[0] || 'Farmer').replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  state.user = { name: rawName, email: guest ? null : email };

  const av = rawName.trim().charAt(0).toUpperCase() || 'K';
  const userAv = $('#userAv');
  const userName = $('#userName');
  if (userAv) userAv.textContent = av;
  if (userName) userName.textContent = rawName.split(' ')[0];

  saveSession({ email, guest, name: rawName });

  // Restore navigation or go to Step 2
  const nav = getNav();
  const nextStep = nav.step > 1 ? nav.step : 2;
  goStep(nextStep);
}

function logoutUser() {
  clearSession();
  state.user = null;
  state.guest = false;
  state.step = 1;
  state.maxStep = 2;
  saveNav(1, 2);

  const loginForm = $('#loginForm');
  if (loginForm) loginForm.reset();
  const emailErr = $('#emailErr');
  const passErr = $('#passErr');
  if (emailErr) emailErr.textContent = '';
  if (passErr) passErr.textContent = '';

  goStep(1, true);
}

/* ---------------- Weather & Atmospheric Data ---------------- */

async function loadWeatherData(forceReload = false) {
  if (state.weather && !forceReload) return state.weather;
  if (state.fetching) return state.weather;

  state.fetching = true;
  try {
    const data = await fetchWeather(state.location.lat, state.location.lon);
    state.weather = data;
    state.source = data.source || (data._synthetic ? 'simulated' : 'live');
    if (state.source === 'simulated') {
      toast('Live weather was unreachable — showing a simulated field profile.', 'warn');
    }
  } catch (err) {
    state.weather = generateSyntheticWeather(state.location.lat, state.location.lon);
    state.source = 'simulated';
    toast('Live weather was unreachable — showing a simulated field profile.', 'warn');
  } finally {
    state.fetching = false;
    state.lastSync = new Date();
    updateStepperUI();
  }
  return state.weather;
}

/* ---------------- Location & Maps ---------------- */

function setupLocationMap() {
  if (!isLeafletAvailable() || state.maps.loc) return;
  const { map, marker } = initLocationMap('locMap', [state.location.lat, state.location.lon], (lat, lon) => {
    updateLocationCoords(lat, lon, false);
  });
  state.maps.loc = map;
  state.maps.locMarker = marker;
}

function setupTraceMap() {
  if (!isLeafletAvailable() || state.maps.trace) return;
  const map = initTraceMap('traceMap', [state.location.lat, state.location.lon], (lat, lon) => {
    if (state.step !== 3) return;
    addPlotVertex(lat, lon);
  });
  state.maps.trace = map;
}

function updateLocationCoords(lat, lon, skipGeocode = false, isGps = false) {
  const roundedLat = Number(lat.toFixed(5));
  const roundedLon = Number(lon.toFixed(5));
  state.location.lat = roundedLat;
  state.location.lon = roundedLon;

  if (state.maps.locMarker) {
    state.maps.locMarker.setLatLng([roundedLat, roundedLon]);
  }
  if (state.maps.loc) {
    state.maps.loc.setView([roundedLat, roundedLon], state.maps.loc.getZoom());
  }

  const locCoords = $('#locCoords');
  const locAcc = $('#locAcc');
  const locKv = $('#locKv');
  if (locCoords) locCoords.textContent = `${roundedLat.toFixed(5)}, ${roundedLon.toFixed(5)}`;
  if (locAcc) locAcc.textContent = isGps ? (state.accuracy ? `GPS ±${Math.round(state.accuracy)} m` : 'GPS located') : 'Pin set';
  if (locKv) {
    locKv.innerHTML = `
      <div class="kv"><span>Latitude</span><b>${roundedLat.toFixed(5)}</b></div>
      <div class="kv"><span>Longitude</span><b>${roundedLon.toFixed(5)}</b></div>
      <div class="kv"><span>Data Source</span><b><span class="data-badge live"><span class="dot"></span>Live GPS/Pin</span></b></div>
    `;
  }

  if (!skipGeocode) {
    reverseGeocode(roundedLat, roundedLon).then((name) => {
      state.location.name = name;
      const locTitle = $('#locTitle');
      if (locTitle) locTitle.textContent = name;
      saveLocation(state.location);
    });
  } else {
    saveLocation(state.location);
  }
}

/* ---------------- Plot Tracing & 1-Acre Estimation ---------------- */

function addPlotVertex(lat, lon) {
  state.draft.push([Number(lat.toFixed(5)), Number(lon.toFixed(5))]);
  updatePlotUI();
}

function undoPlotVertex() {
  if (!state.draft.length) return;
  state.draft.pop();
  if (state.draft.length < 3) {
    state.plot = null;
    clearPlot();
  }
  updatePlotUI();
}

function clearPlotVertices() {
  state.draft = [];
  state.plot = null;
  clearPlot();
  updatePlotUI();
  toast('Plot cleared.');
}

function estimatePlot1Acre() {
  const lat = state.location.lat;
  const lon = state.location.lon;
  const estimate = generateAcreSquare(lat, lon, 1.0);

  state.draft = estimate.points.slice();
  state.plot = estimate;
  savePlot(state.plot);

  updatePlotUI();

  if (state.maps.trace) {
    fitBounds(state.maps.trace, state.draft, [40, 40]);
  }

  toast('1-acre estimate placed around your pin.');
}

function updatePlotUI() {
  const pts = state.draft;
  const hasPoly = pts.length >= 3;
  const ha = hasPoly ? polygonAreaHa(pts) : 0;
  const acres = hasPoly ? polygonAreaAcres(pts) : 0;
  const per = pts.length >= 2 ? perimeterM(pts) : 0;
  const c = pts.length ? centroid(pts) : null;

  const areaAcres = $('#areaAcres');
  const areaHa = $('#areaHa');
  const areaBar = $('#areaBar');
  const traceKv = $('#traceKv');
  const scanBtn = $('#scanBtn');
  const traceHint = $('#traceHint');

  if (areaAcres) areaAcres.textContent = acres.toFixed(2);
  if (areaHa) areaHa.textContent = `${ha.toFixed(3)} hectares`;
  if (areaBar) areaBar.style.width = `${clamp((acres / 5) * 100, 0, 100)}%`;

  if (traceKv) {
    const isEstimated = state.plot?.isEstimate;
    traceKv.innerHTML = `
      <div class="kv"><span>Corners marked</span><b>${pts.length}</b></div>
      <div class="kv"><span>Perimeter</span><b>${per ? Math.round(per) + ' m' : '—'}</b></div>
      <div class="kv"><span>Center</span><b>${c ? c[0].toFixed(5) + ', ' + c[1].toFixed(5) : '—'}</b></div>
      <div class="kv"><span>Area calculation</span><b>${
        isEstimated
          ? '<span class="data-badge est">Estimated 1.00 ac</span>'
          : hasPoly
          ? '<span class="data-badge live">Satellite Traced</span>'
          : '—'
      }</b></div>
    `;
  }

  if (scanBtn) scanBtn.disabled = !hasPoly;
  if (traceHint) {
    traceHint.textContent = !hasPoly
      ? `Mark at least three corners (${pts.length}/3) or use the 1-acre estimate.`
      : `${pts.length} corners · ${acres.toFixed(2)} acres. Outline ready. Tap “Scan this plot”.`;
  }

  // Synchronize Leaflet map layers
  if (state.maps.trace) {
    const synced = syncTraceLayers(state.maps.trace, pts, state.markers, state.polygon);
    state.markers = synced.markers;
    state.polygon = synced.polygon;
  }

  if (hasPoly) {
    state.plot = {
      points: pts.slice(),
      areaHa: ha,
      acres,
      perimeter: per,
      centre: c,
      isEstimate: !!state.plot?.isEstimate,
      dataType: state.plot?.isEstimate ? 'estimated' : 'live'
    };
    savePlot(state.plot);
  }
}

function renderPlotLayers() {
  if (!state.maps.trace) return;
  if (state.plot && (!state.draft.length || state.draft.length !== state.plot.points.length)) {
    state.draft = state.plot.points.slice();
  }
  updatePlotUI();
  if (state.draft.length >= 2) {
    fitBounds(state.maps.trace, state.draft, [40, 40]);
  }
}

/* ---------------- Step 4: Multi-Signal Scan & Farm Setup ---------------- */

function startScanProcess() {
  if (!state.weather) {
    loadWeatherData().then(() => startScanAnimation());
  } else {
    startScanAnimation();
  }
}

function startScanAnimation() {
  const steps = [
    'Reading the latest satellite pass',
    'Pulling soil moisture from ECMWF ERA5-Land',
    'Estimating soil texture & available capacity',
    'Matching thermal time & crop window',
    'Building your agronomic advisory'
  ];

  const scanSteps = $('#scanSteps');
  const scanStage = $('#scanStage');
  const scanResults = $('#scanResults');
  const scanBarFill = $('#scanBarFill');

  if (scanSteps) {
    scanSteps.innerHTML = steps
      .map((s) => `<div class="scan-step"><span class="sd">•</span>${s}</div>`)
      .join('');
  }
  if (scanStage) scanStage.hidden = false;
  if (scanResults) scanResults.hidden = true;
  if (scanBarFill) scanBarFill.style.width = '0%';

  const nodes = $$('#scanSteps .scan-step');
  let idx = 0;
  clearInterval(startScanAnimation._timer);

  startScanAnimation._timer = setInterval(() => {
    if (idx > 0 && nodes[idx - 1]) {
      nodes[idx - 1].className = 'scan-step ok';
      nodes[idx - 1].querySelector('.sd').textContent = '✓';
    }
    if (idx < nodes.length && nodes[idx]) {
      nodes[idx].classList.add('on');
    }
    if (scanBarFill) {
      scanBarFill.style.width = `${Math.round(((idx + 1) / nodes.length) * 100)}%`;
    }
    idx++;

    if (idx > nodes.length) {
      clearInterval(startScanAnimation._timer);
      setTimeout(() => {
        if (nodes[nodes.length - 1]) {
          nodes[nodes.length - 1].className = 'scan-step ok';
          nodes[nodes.length - 1].querySelector('.sd').textContent = '✓';
        }
        if (scanStage) scanStage.hidden = true;
        if (scanResults) scanResults.hidden = false;
        renderScanDashboard();
      }, 350);
    }
  }, 380);
}

function renderScanDashboard() {
  const w = state.weather;
  if (!w || !w.daily || !w.hourly) return;

  const d = w.daily;
  const h = w.hourly;
  const ti = d.time.indexOf(isoLocal()) >= 0 ? d.time.indexOf(isoLocal()) : Math.min(2, d.time.length - 1);
  const hi = (h.time || []).findIndex((t) => new Date(t) >= new Date(Date.now() - 30 * 60000));
  const hourIdx = hi < 0 ? (h.time || []).length - 1 : hi;

  const rainToday = d.precipitation_sum?.[ti] ?? 0;
  const rain3 = sum(d.precipitation_sum?.slice(ti, ti + 3));
  const tmax = d.temperature_2m_max?.[ti] ?? 30;
  const tmin = d.temperature_2m_min?.[ti] ?? 18;
  const wind = w.current?.wind_speed_10m ?? h.wind_speed_10m?.[hourIdx] ?? 8;
  const rh = w.current?.relative_humidity_2m ?? h.relative_humidity_2m?.[hourIdx] ?? 60;
  const sm07 = h.soil_moisture_0_to_7cm?.[hourIdx] ?? 0.21;
  const sm728 = h.soil_moisture_7_to_28cm?.[hourIdx] ?? 0.23;
  const et0 = d.et0_fao_evapotranspiration?.[ti] ?? 4.0;

  const isSim = state.source === 'simulated' || w._synthetic;
  const srcBadge = isSim
    ? '<span class="data-badge sim"><span class="dot"></span>Simulated</span>'
    : '<span class="data-badge live"><span class="dot"></span>Live</span>';

  // 6 Tiles Strip with explicit Live / Simulated separation
  const tiles = [
    { title: 'Rain today', val: fmt(rainToday, 1), unit: 'mm', note: 'next 24h', badge: srcBadge },
    { title: 'Rain in 3 days', val: fmt(rain3, 1), unit: 'mm', note: rain3 > 15 ? 'useful' : 'light', badge: srcBadge },
    { title: 'Temperature', val: `${fmt(tmax)}°`, unit: `/${fmt(tmin)}°`, note: 'today', badge: srcBadge },
    { title: 'Wind speed', val: fmt(wind), unit: 'km/h', note: wind > 18 ? 'breezy' : 'calm', badge: srcBadge },
    { title: 'Humidity', val: fmt(rh), unit: '%', note: rh > 80 ? 'humid' : 'dry', badge: srcBadge },
    { title: 'Soil moisture', val: fmt(sm07 * 100, 0), unit: '%', note: '0–7 cm (ERA5)', badge: srcBadge }
  ];

  const dataStrip = $('#dataStrip');
  if (dataStrip) {
    dataStrip.innerHTML = tiles
      .map(
        (t) => `
        <div class="tile">
          <div class="tl"><span>${t.title}</span>${t.badge}</div>
          <div class="tv">${t.val}<small>${t.unit}</small></div>
          <div class="tn">${t.note}</div>
        </div>
      `
      )
      .join('');
  }

  // Soil Inference & Profile Card
  state.soilKey = inferSoil(state.location.lat, state.location.lon, sm07);
  const s = SOILS[state.soilKey];
  const soilCard = $('#soilCard');
  if (soilCard) {
    soilCard.innerHTML = `
      <div class="soil-head">
        <div>
          <div class="eyebrow">Soil profile · <span class="data-badge est"><span class="dot"></span>Estimated Model</span></div>
          <div class="soil-name">${s.name}</div>
          <div class="soil-sub">Calibrated for coordinates & ERA5 moisture</div>
        </div>
        <div class="soil-swatch" style="background:${s.color}"></div>
      </div>
      <div class="kv-list">
        <div class="kv"><span>Texture class</span><b>${s.texture}</b></div>
        <div class="kv"><span>Soil pH</span><b>${s.ph}</b></div>
        <div class="kv"><span>Organic matter</span><b>${s.om}</b></div>
        <div class="kv"><span>Internal drainage</span><b>${s.drain}</b></div>
        <div class="kv"><span>Available capacity</span><b>${s.hold} (~${s.tawPerMeter} mm/m)</b></div>
        <div class="kv"><span>Top / Deep moisture</span><b>${fmt(sm07 * 100, 0)}% / ${fmt(sm728 * 100, 0)}%</b></div>
      </div>
      <p class="soil-note">${s.note}</p>
      <div class="conf-tag" style="display:inline-block;margin-top:10px">Inferred · ICAR agro-zone + ERA5-Land moisture</div>
    `;
  }

  // Farm Setup Form Populate
  const cropChoose = $('#cropChoose');
  if (cropChoose) {
    cropChoose.innerHTML = Object.entries(CROPS)
      .map(
        ([key, c]) =>
          `<button type="button" class="crop-opt ${state.setup.crop === key ? 'on' : ''}" data-crop="${key}" aria-pressed="${
            state.setup.crop === key
          }"><span class="ce">${c.em}</span>${c.name}</button>`
      )
      .join('');

    $$('#cropChoose .crop-opt').forEach((b) => {
      b.addEventListener('click', () => {
        state.setup.crop = b.dataset.crop;
        $$('#cropChoose .crop-opt').forEach((btn) => {
          const isActive = btn === b;
          btn.classList.toggle('on', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        saveSetup(state.setup);
      });
    });
  }

  const irrigationSel = $('#irrigation');
  const sowDateInput = $('#sowDate');
  const acresInput = $('#acres');

  if (irrigationSel) irrigationSel.value = state.setup.irrigation;
  if (sowDateInput) sowDateInput.value = state.setup.sowDate || isoLocal();
  if (acresInput) {
    const targetAcres = state.plot ? Math.max(0.1, Number(state.plot.acres.toFixed(2))) : state.setup.acres;
    acresInput.value = targetAcres;
    state.setup.acres = targetAcres;
  }

  $$('#fertChips button').forEach((b) => {
    const isSelected = state.setup.ferts.includes(b.dataset.fert);
    b.classList.toggle('on', isSelected);
    b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

/* ---------------- Step 5: Irrigation Decision Engine View ---------------- */

function renderDecisionView() {
  if (!state.weather) return;

  const decision = computeIrrigationDecision({
    weather: state.weather,
    soilKey: state.soilKey,
    cropKey: state.setup.crop,
    irrigationType: state.setup.irrigation,
    sowDate: state.setup.sowDate,
    acres: state.setup.acres,
    ferts: state.setup.ferts,
    source: state.source
  });
  state.decision = decision;

  const lang = getLanguage();
  const crop = CROPS[state.setup.crop] || CROPS.wheat;
  const cropDisplayName = lang === 'hi' ? (crop.hi || crop.name) : crop.name;
  const soil = SOILS[state.soilKey] || SOILS.alluvial;

  const verdictTitleKey = 'verdict_' + decision.verdict;
  const verdictSubKey = 'verdict_' + decision.verdict + '_sub';
  const localizedTitle = t(verdictTitleKey);
  const localizedSub = t(verdictSubKey);

  const icons = { today: '💧', soon: '🌤️', hold: '🌧️', skip: '🌱' };

  const verdictCard = $('#verdictCard');
  const verdictBadge = $('#verdictBadge');
  const verdictIcon = $('#verdictIcon');
  const verdictTitle = $('#verdictTitle');
  const verdictSub = $('#verdictSub');
  const decisionConf = $('#decisionConf');
  const verdictStats = $('#verdictStats');
  const reasonsEl = $('#reasons');
  const reasonHead = $('#reasonHead');
  const waterNote = $('#waterNote');

  if (verdictCard) verdictCard.dataset.tone = decision.tone;
  if (verdictBadge) {
    const badgeText =
      decision.verdict === 'today'
        ? (lang === 'hi' ? 'आज की कार्यवाही' : 'Action today')
        : decision.verdict === 'soon'
        ? (lang === 'hi' ? 'कल के लिए योजना' : 'Plan for tomorrow')
        : decision.verdict === 'hold'
        ? (lang === 'hi' ? 'बारिश की प्रतीक्षा' : 'Wait for rain')
        : (lang === 'hi' ? 'निश्चिंत रहें' : 'Relax');
    verdictBadge.textContent = badgeText;
  }
  if (verdictIcon) verdictIcon.textContent = icons[decision.verdict];
  if (verdictTitle) verdictTitle.textContent = localizedTitle;

  if (verdictSub) {
    const detail =
      decision.verdict === 'hold'
        ? (lang === 'hi' ? `अनुमानित बारिश: अगले 24 घंटे में ${fmt(decision.rain24, 1)} मिमी।` : `Expected rain: ${fmt(decision.rain24, 1)} mm in 24 h.`)
        : decision.verdict === 'today'
        ? (lang === 'hi' ? `आज सुबह लगभग ${decision.mm} मिमी पानी लगाएं।` : `Apply about ${decision.mm} mm this morning.`)
        : decision.verdict === 'soon'
        ? (lang === 'hi' ? `${decision.when} में ${decision.mm} मिमी पानी लगाने की तैयारी करें।` : `Plan for ${decision.mm} mm in ${decision.when}.`)
        : (lang === 'hi' ? `आपके ${cropDisplayName} के लिए अभी पर्याप्त पानी है।` : `Your ${crop.name} has enough water for now.`);
    verdictSub.textContent = `${localizedSub} ${detail}`;
  }

  if (decisionConf) {
    const srcTag =
      state.source === 'simulated'
        ? `<span class="data-badge sim"><span class="dot"></span>${t('simulatedMode')}</span>`
        : `<span class="data-badge live"><span class="dot"></span>${t('liveSatellite')}</span>`;
    decisionConf.innerHTML = `${srcTag} · ${lang === 'hi' ? 'सटीकता' : 'Confidence'} ${decision.confidence}%`;
  }

  if (verdictStats) {
    verdictStats.innerHTML = [
      [t('recWater'), decision.mm ? `${decision.mm}<small>mm</small>` : '—', decision.mm ? `≈ ${decision.litres.toLocaleString('en-IN')} L` : (lang === 'hi' ? 'सिंचाई जरूरी नहीं' : 'No application')],
      [t('bestWindow'), decision.verdict === 'hold' ? (lang === 'hi' ? 'बारिश के बाद' : 'After rain') : (lang === 'hi' ? 'सुबह 5–8 बजे' : '5–8 am'), decision.verdict === 'hold' ? (lang === 'hi' ? '48 घंटे में पुनः जांचें' : 'Recheck in 48 h') : decision.when.charAt(0).toUpperCase() + decision.when.slice(1)],
      [t('soilWater'), `${Math.round(decision.avail * 100)}<small>%</small>`, lang === 'hi' ? 'उपयोगी क्षमता का' : 'of usable capacity'],
      [t('cropStage'), decision.stage.name, `${Math.round(decision.stage.progress * 100)}% ${lang === 'hi' ? 'परिपक्वता' : 'to maturity'}`]
    ]
      .map(
        (s) => `
        <div class="vs">
          <div class="k">${s[0]}</div>
          <div class="v">${s[1]}</div>
          <div class="k" style="text-transform:none;letter-spacing:0;font-weight:500;margin-top:3px">${s[2]}</div>
        </div>
      `
      )
      .join('');
  }

  if (reasonsEl) {
    reasonsEl.innerHTML = decision.reasons
      .map(
        (r) => `
        <div class="reason">
          <span class="ri ${r.s}">${r.i}</span>
          <div>
            <div class="rt">${r.t}</div>
            <div class="rd">${r.d}</div>
          </div>
        </div>
      `
      )
      .join('');
  }

  if (reasonHead) {
    reasonHead.textContent = lang === 'hi'
      ? `${cropDisplayName} हेतु (${soil.name}) · ${state.setup.acres.toFixed(2)} एकड़`
      : `For ${crop.name} on ${soil.name.toLowerCase()} · ${state.setup.acres.toFixed(2)} acres`;
  }

  renderWaterBalanceChart(decision);

  if (waterNote) {
    waterNote.textContent = lang === 'hi'
      ? 'डैश रेखा फसल जल-तनाव सीमा को दर्शाती है। बार्स संभावित वर्षा हैं। गणना FAO-56 दोहरे फसल गुणांक पर आधारित है।'
      : 'Dashed line marks the crop stress threshold. Bars are forecast precipitation. Calculated using FAO-56 dual crop coefficient.';
  }
}

function renderWaterBalanceChart(decision) {
  const chartEl = $('#waterChart');
  if (!chartEl || !state.weather) return;

  const d = state.weather.daily;
  const ti = d.time.indexOf(isoLocal()) >= 0 ? d.time.indexOf(isoLocal()) : Math.min(2, d.time.length - 1);
  const vals = [];
  const rain = [];
  let moisturePercent = decision.avail * 100;

  for (let i = 0; i < 7; i++) {
    const rainDay = d.precipitation_sum?.[ti + i] || 0;
    const etDay = (d.et0_fao_evapotranspiration?.[ti + i] || 4.0) * decision.kc;
    const taw = decision.taw || 200;
    moisturePercent = clamp(moisturePercent + ((rainDay * 0.75) / taw) * 100 - (etDay / taw) * 100, 0, 100);
    vals.push(moisturePercent);
    rain.push(rainDay);
  }

  const W = 620, H = 250, PL = 34, PR = 10, PT = 18, PB = 38;
  const x = (i) => PL + (i + 0.5) * ((W - PL - PR) / 7);
  const y = (p) => PT + ((100 - p) / 100) * (H - PT - PB);
  const maxRain = Math.max(2, ...rain);

  const bars = rain
    .map((r, i) => {
      const barH = (r / maxRain) * 46;
      return `<rect x="${x(i) - 11}" y="${H - PB - barH}" width="22" height="${barH}" rx="4" fill="#e3c78d" opacity=".75"/>`;
    })
    .join('');

  const pts = vals.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p).toFixed(1)).join(' ');
  const dots = vals
    .map((p, i) => `<circle cx="${x(i)}" cy="${y(p)}" r="3.4" fill="#fffaf0" stroke="#3f6b45" stroke-width="2"/>`)
    .join('');
  const labels = vals
    .map((p, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#6d7a68">${dayName(d.time[ti + i])}</text>`)
    .join('');
  const grid = [0, 25, 50, 75, 100]
    .map(
      (p) => `
      <line x1="${PL}" x2="${W - PR}" y1="${y(p)}" y2="${y(p)}" stroke="#e9e3d3"/>
      <text x="${PL - 6}" y="${y(p) + 3}" text-anchor="end" font-size="9" fill="#a3ad9b">${p}</text>
    `
    )
    .join('');

  const stressThreshold = Math.round((decision.stressThresholdFrac || 0.40) * 100);

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="7-Day projected soil moisture and rainfall chart">
      ${grid}${bars}
      <line x1="${PL}" x2="${W - PR}" y1="${y(stressThreshold)}" y2="${y(stressThreshold)}" stroke="#c2723f" stroke-width="1.4" stroke-dasharray="5 4"/>
      <path d="${pts} L${x(6)},${H - PB} L${x(0)},${H - PB} Z" fill="rgba(63,107,69,.10)"/>
      <path d="${pts}" fill="none" stroke="#3f6b45" stroke-width="2.4" stroke-linecap="round"/>
      ${dots}${labels}
    </svg>
  `;
}

/* ---------------- Step 6: Crop Suitability & Financial Intelligence ---------------- */

function renderCropsView() {
  if (!state.weather) return;

  const { list, meanTemp } = rankCropSuitability({
    weather: state.weather,
    soilKey: state.soilKey,
    sowDate: state.setup.sowDate,
    irrigationType: state.setup.irrigation,
    scenario: state.scenario,
    sortMode: state.sortMode
  });
  state.ranking = list;

  const top = list[0];
  const acres = state.setup.acres || 1;

  const topPick = $('#topPick');
  if (topPick && top) {
    topPick.innerHTML = `
      <div class="tp-main">
        <div class="tp-ribbon">Best fit for this field · <span class="data-badge est"><span class="dot"></span>Estimated Profit</span></div>
        <div class="tp-name"><span>${top.crop.em}</span>${top.crop.name}</div>
        <div class="tp-sub">${SOILS[state.soilKey].name} · sown ${prettyDate(state.setup.sowDate)} · ${acres.toFixed(2)} acres · ${top.score}/100 fit score</div>
      </div>
      <div class="tp-cell">
        <div class="k">Profit per acre</div>
        <div class="v">₹${top.profit.toLocaleString('en-IN')}</div>
        <div class="d">Indicative, after input costs</div>
      </div>
      <div class="tp-cell">
        <div class="k">For your ${acres.toFixed(2)} acres</div>
        <div class="v">₹${Math.round(top.profit * acres).toLocaleString('en-IN')}</div>
        <div class="d">±15% around this estimate</div>
      </div>
    `;
  }

  const rankList = $('#rankList');
  if (rankList) {
    rankList.innerHTML = list
      .map((r, i) => {
        const risk = r.crop.risk.toLowerCase();
        return `
          <div class="rank-row">
            <div class="rank-n">${i + 1}</div>
            <div class="ring" style="--p:${r.score}"><span>${r.score}</span></div>
            <div class="rank-main">
              <div class="rn"><span class="em">${r.crop.em}</span>${r.crop.name} <span class="rank-tag ${risk}">${r.crop.risk} risk</span></div>
              <div class="rd">${r.crop.dur} days · ${r.crop.need} mm water · ${r.crop.months.map((m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]).join('/')} sowing</div>
            </div>
            <div class="rank-meta">
              <div class="rm">₹${r.profit.toLocaleString('en-IN')}<small>profit / acre</small></div>
            </div>
            <div class="rank-meta">
              <div class="rm" style="font-size:15px">₹${(r.profit * acres / 1000).toFixed(0)}k<small>total</small></div>
            </div>
            <div class="rank-why">${whyCropFits(r)}</div>
          </div>
        `;
      })
      .join('');
  }

  function whyCropFits(r) {
    const bits = [];
    if (r.soilFit >= 0.8) bits.push('soil suits it strongly');
    else if (r.soilFit < 0.55) bits.push('soil is a limitation');

    if (r.climateFit >= 0.9) bits.push('temperature is in range');
    else if (r.climateFit < 0.6) bits.push('heat or cold is a risk');

    if (r.waterFit >= 0.85) bits.push(`your ${state.setup.irrigation} system can meet its water need`);
    else bits.push('water demand is high for your system');

    if (r.seasonFit >= 0.9) bits.push('sowing window is open now');
    else bits.push('outside its ideal sowing month');

    return bits.join(' · ').replace(/^\w/, (c) => c.toUpperCase()) + '.';
  }

  renderProfitChartSvg(list, acres);
  renderAnalyticsScatterSvg(list, meanTemp);

  const profitChip = $('#profitChip');
  if (profitChip) profitChip.textContent = `₹ / acre · ${acres.toFixed(2)} acres`;
}

function renderProfitChartSvg(list, acres) {
  const chartEl = $('#profitChart');
  if (!chartEl) return;

  const W = 760, rowH = 44, H = list.length * rowH + 26, PL = 132, PR = 90;
  const max = Math.max(...list.map((r) => r.profit)) || 1;

  const rows = list
    .map((r, i) => {
      const y = i * rowH + 8;
      const w = (r.profit / max) * (W - PL - PR);
      return `
        <text x="${PL - 12}" y="${y + 18}" text-anchor="end" font-size="12" fill="#41523f">${r.crop.name}</text>
        <rect x="${PL}" y="${y}" width="${W - PL - PR}" height="24" rx="7" fill="#f0ebdc"/>
        <rect x="${PL}" y="${y}" width="${w}" height="24" rx="7" fill="${i === 0 ? '#3f6b45' : '#b9c9a9'}"/>
        <text x="${PL + w + 10}" y="${y + 17}" font-size="11.5" fill="#41523f">₹${r.profit.toLocaleString('en-IN')}</text>
      `;
    })
    .join('');

  chartEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Profit comparison bar chart">${rows}</svg>`;
}

function renderAnalyticsScatterSvg(list, meanTemp) {
  const panel = $('#analyticsPanel');
  if (panel) panel.hidden = !state.analytics;
  if (!state.analytics) return;

  const top = list[0];
  const noteEl = $('#analyticsNote');
  if (noteEl && top) {
    noteEl.textContent = `For a 7-day mean temperature of ${fmt(meanTemp, 1)}°C on ${SOILS[state.soilKey].name.toLowerCase()}, ${top.crop.name} leads on fit. Scenario: ${
      state.scenario === 'dry'
        ? 'Dry year (−25% water, +8% price).'
        : state.scenario === 'wet'
        ? 'Strong monsoon (+15% water, −4% price).'
        : 'Normal rainfall and baseline market rates.'
    }`;
  }

  const chartEl = $('#scatterChart');
  if (!chartEl) return;

  const W = 640, H = 300, PL = 54, PR = 30, PT = 24, PB = 46;
  const maxP = Math.max(...list.map((r) => r.profit)) * 1.1 || 100000;
  const maxN = 1900;
  const x = (n) => PL + (n / maxN) * (W - PL - PR);
  const y = (p) => PT + (1 - p / maxP) * (H - PT - PB);

  const dots = list
    .map((r) => {
      const isTop = top && r.key === top.key;
      return `
        <circle cx="${x(r.crop.need)}" cy="${y(r.profit)}" r="${isTop ? 7 : 5}" fill="${isTop ? '#d9ae61' : '#6f8f7c'}" opacity=".9"/>
        <text x="${x(r.crop.need) + 9}" y="${y(r.profit) + 4}" font-size="10" fill="#41523f">${r.crop.name}</text>
      `;
    })
    .join('');

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (f) => `
      <line x1="${PL}" x2="${W - PR}" y1="${PT + f * (H - PT - PB)}" y2="${PT + f * (H - PT - PB)}" stroke="#ece6d7"/>
      <text x="${PL - 8}" y="${PT + f * (H - PT - PB) + 3}" text-anchor="end" font-size="9" fill="#a3ad9b">₹${Math.round((maxP * (1 - f)) / 1000)}k</text>
    `
    )
    .join('');

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Scatter chart of seasonal water requirement vs net profit">
      ${grid}${dots}
      <text x="${(W + PL) / 2}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#6d7a68">Seasonal water need (mm) →</text>
    </svg>
  `;
}

/* ---------------- Step 7 · Mandi & Market Intelligence ---------------- */

function renderMarketView() {
  const lang = getLanguage();
  const isHi = lang === 'hi';

  if (!state.marketCrop) {
    state.marketCrop = state.setup?.crop || 'wheat';
  }
  const cropKey = state.marketCrop;
  const acres = state.setup?.acres || 1;
  const crop = CROPS[cropKey] || CROPS.wheat;
  const cropName = isHi ? (crop.hi || crop.name) : crop.name;

  const cropSel = $('#marketCropSel');
  if (cropSel && cropSel.value !== cropKey) {
    cropSel.value = cropKey;
  }

  const cropChip = $('#marketCropChip');
  if (cropChip) {
    cropChip.textContent = `${cropName} · ${acres} ${isHi ? 'एकड़' : acres > 1 ? 'Acres' : 'Acre'}`;
  }

  $$('#marketHorizonSeg button').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.days) === Number(state.storageHorizonDays || 60));
  });

  const arb = computeMandiArbitrage({
    cropKey,
    acres,
    location: state.location || { lat: 29.685, lon: 76.99 }
  });

  // Top Pick Mandi Banner
  const bestBanner = $('#bestMandiBanner');
  if (bestBanner) {
    const best = arb.bestMandi;
    const local = arb.localMandi;
    const isLocalBest = best.id === local.id;
    const bestName = isHi ? (best.hindiName || best.name) : best.name;

    bestBanner.innerHTML = `
      <div class="tp-main">
        <span class="tp-badge">${isHi ? 'सर्वोत्तम शुद्ध मुनाफा मंडी' : 'TOP REALIZATION APMC MANDI'}</span>
        <div class="tp-title">${bestName}</div>
        <div class="tp-sub">
          ${isLocalBest
            ? (isHi ? 'स्थानीय तहसील मंडी में ही उच्चतम शुद्ध मुनाफा मिल रहा है (परिवहन लागत न्यूनतम)।' : 'Your local tehsil mandi delivers maximum net return; transport freight savings outweigh outer hub margins.')
            : (isHi
                ? `अतिरिक्त दूरी तय करके भी प्रति एकड़ <b>+₹${arb.extraNetGain.toLocaleString('en-IN')}</b> अधिक शुद्ध आमदनी होगी।`
                : `Higher buyer competition delivers an extra <b>+₹${arb.extraNetGain.toLocaleString('en-IN')}</b> net gain after deducting all freight.`)}
        </div>
      </div>
      <div class="tp-cell">
        <div class="tp-lbl">${isHi ? 'शुद्ध प्राप्त दर' : 'Net Realized Rate'}</div>
        <div class="tp-val">₹${best.netRatePerQuintal.toLocaleString('en-IN')}<small>/q</small></div>
        <div class="tp-sub">${isHi ? 'ढुलाई काटकर जेब में' : 'In-pocket net'}</div>
      </div>
      <div class="tp-cell">
        <div class="tp-lbl">${isHi ? 'अतिरिक्त शुद्ध लाभ' : 'Extra Net Gain'}</div>
        <div class="tp-val" style="color:${arb.extraNetGain > 0 ? '#4d7a52' : 'inherit'}">+₹${arb.extraNetGain.toLocaleString('en-IN')}</div>
        <div class="tp-sub">${isHi ? 'स्थानीय मंडी की तुलना में' : 'vs. Local Tehsil Mandi'}</div>
      </div>
    `;
  }

  // APMC Mandi Cards
  const mandiCardsEl = $('#mandiCards');
  if (mandiCardsEl) {
    mandiCardsEl.innerHTML = arb.mandis.map((m) => {
      const isBest = m.id === arb.bestMandi.id;
      const mName = isHi ? (m.hindiName || m.name) : m.name;
      return `
        <div class="mandi-card ${isBest ? 'best' : ''}">
          <div class="m-head">
            <div>
              <div class="m-name">${mName}</div>
              <div class="m-sub">${m.distanceKm} km · ~${Math.round(m.distanceKm * 2.2)} min transit</div>
            </div>
            ${isBest
              ? `<span class="mandi-badge best">${isHi ? '★ सर्वोत्तम' : '★ Top Net'}</span>`
              : `<span class="mandi-badge dist">${m.distanceKm} km</span>`}
          </div>
          <div class="m-net">₹${m.netRatePerQuintal.toLocaleString('en-IN')}<small>/q ${isHi ? 'शुद्ध' : 'net'}</small></div>
          <div class="m-stats">
            <div class="m-stat">
              <span>${isHi ? 'मंडी थोक भाव' : 'Gross Modal Price'}:</span>
              <b>₹${m.modalPrice.toLocaleString('en-IN')}/q</b>
            </div>
            <div class="m-stat">
              <span>${isHi ? 'अनुमानित मालभाड़ा' : 'Freight & Handling'}:</span>
              <b style="color:#a4502b">−₹${m.freightPerQuintal}/q</b>
            </div>
            <div class="m-stat">
              <span>${isHi ? 'खेत की कुल शुद्ध आय' : 'Total Plot Realization'}:</span>
              <b style="color:var(--forest)">₹${m.netRevenue.toLocaleString('en-IN')}</b>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // MSP Spread Card
  const mspEl = $('#mspContent');
  if (mspEl) {
    const isAbove = arb.isAboveMSP;
    const spreadSign = arb.mspSpreadPercent >= 0 ? '+' : '';
    const spreadColor = arb.mspSpreadPercent >= 0 ? '#3f6b45' : '#a4502b';

    mspEl.innerHTML = `
      <div class="kv-list" style="margin-top:8px">
        <div class="kv">
          <span>${isHi ? 'सरकारी न्यूनतम समर्थन मूल्य (MSP)' : 'Official GoI CACP MSP'}:</span>
          <b>₹${arb.msp.toLocaleString('en-IN')}/q</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'वर्तमान मंडी मॉडल भाव' : 'Top Modal Mandi Rate'}:</span>
          <b>₹${arb.bestMandi.modalPrice.toLocaleString('en-IN')}/q</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'MSP से अंतर' : 'Market Spread vs MSP'}:</span>
          <b style="color:${spreadColor}">${spreadSign}${arb.mspSpreadPercent}% (${spreadSign}₹${(arb.bestMandi.modalPrice - arb.msp).toLocaleString('en-IN')}/q)</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'सरकारी खरीद एजेंसी' : 'Procurement Channel'}:</span>
          <b>${arb.mspAgency}</b>
        </div>
      </div>
      <div style="background:${isAbove ? '#eef5e8' : '#fcedea'};border:1px solid ${isAbove ? '#c8ddbc' : '#f2c6be'};border-radius:10px;padding:12px;margin-top:12px;font-size:12px;color:var(--ink-2);line-height:1.5">
        <b>${isHi ? 'सिफ़ारिश' : 'Advisory'}:</b> ${isAbove
          ? (isHi
              ? `खुले बाज़ार (APMC) में भाव सरकारी MSP से ${arb.mspSpreadPercent}% अधिक है। खुले बाज़ार में सीधे बेचना सबसे अधिक लाभदायक है।`
              : `Open APMC market is trading ${arb.mspSpreadPercent}% above official MSP. Sell directly in the top mandi to maximize realization.`)
          : (isHi
              ? `मंडी भाव सरकारी MSP से नीचे चल रहा है। तुरंत ई-उपार्जन / मेरी फसल मेरा ब्योरा पोर्टल पर पंजीकरण कर FCI/NAFED को MSP पर बेचें।`
              : `Market rate is below MSP. Register immediately for Government procurement (FCI/NAFED) to secure the guaranteed floor price.`)}
      </div>
    `;
  }

  // Storage Breakeven Simulator
  const storageEl = $('#storageContent');
  if (storageEl) {
    const horizonDays = Number(state.storageHorizonDays || 60);
    const storageData = evaluateStorageBreakeven({
      cropKey,
      acres,
      harvestModalPrice: arb.bestMandi.modalPrice
    });

    const activeScenario = storageData.scenarios.find((s) => s.days === horizonDays) || storageData.scenarios[1];
    const isGain = activeScenario.netGain > 0;
    const gainSign = activeScenario.netGain >= 0 ? '+' : '';

    storageEl.innerHTML = `
      <div class="kv-list" style="margin-top:8px">
        <div class="kv">
          <span>${isHi ? 'कटाई पर तुरंत बिक्री आय' : 'Immediate Sale at Harvest Glut'}:</span>
          <b>₹${storageData.immediateRevenue.toLocaleString('en-IN')}</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'गोदाम अवधि' : 'Warehouse Storage Horizon'}:</span>
          <b>${horizonDays} ${isHi ? 'दिन (WDRA मान्यता प्राप्त)' : 'Days (WDRA Accredited)'}</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'अनुमानित ऑफ-सीजन भाव' : 'Expected Off-Season Price'}:</span>
          <b>₹${activeScenario.projectedPrice.toLocaleString('en-IN')}/q</b>
        </div>
        <div class="kv">
          <span>${isHi ? 'कुल गोदाम किराया व सूख' : 'Total Rent & Shrinkage'}:</span>
          <b style="color:#a4502b">−₹${activeScenario.totalStorageRent.toLocaleString('en-IN')}</b>
        </div>
        <div class="kv" style="border-bottom:0">
          <span>${isHi ? 'गोदाम रखने पर शुद्ध लाभ/हानि' : 'Net Holding Gain/Loss'}:</span>
          <b style="color:${isGain ? '#3f6b45' : '#a4502b'};font-size:14px">${gainSign}₹${activeScenario.netGain.toLocaleString('en-IN')}</b>
        </div>
      </div>
      <div style="background:${isGain ? '#eef5e8' : '#fbf3ea'};border:1px solid ${isGain ? '#c8ddbc' : '#edd8c0'};border-radius:10px;padding:12px;margin-top:12px;font-size:12px;color:var(--ink-2);line-height:1.5">
        <b>${isHi ? 'रणनीति' : 'Strategy'}:</b> ${isHi
          ? (storageData.isPerishable
              ? 'टमाटर जैसी खराब होने वाली फसल के लिए तुरंत बेचना बेहतर है; कोल्ड स्टोरेज का खर्च मूल्य वृद्धि से अधिक है।'
              : isGain
              ? `फसल को WDRA गोदाम में ${horizonDays} दिन रखने पर किराया काटकर भी +₹${activeScenario.netGain.toLocaleString('en-IN')} का अतिरिक्त शुद्ध लाभ अनुमानित है।`
              : 'वर्तमान समय में फसल को सीधे बेचना उपयुक्त है।')
          : storageData.recommendation}
      </div>
    `;
  }

  // Cost of Cultivation (A2+FL & C2) Input Economics
  const cocEl = $('#cocContent');
  const cocMarginChip = $('#cocMarginChip');
  if (cocEl) {
    const coc = getCostOfCultivationBreakdown(cropKey, acres);
    if (cocMarginChip) {
      cocMarginChip.textContent = `${isHi ? 'शुद्ध मार्जिन' : 'Net Margin'}: +${coc.netMarginPercent}%`;
    }

    const colors = ['#6f8f7c', '#d9ae61', '#4d7a52', '#a4502b', '#7c5295'];

    const progressSegments = coc.breakdown.map((item, idx) => `
      <span style="width:${item.pct}%;background:${colors[idx % colors.length]}" title="${item.category}: ${item.pct}%"></span>
    `).join('');

    const legendItems = coc.breakdown.map((item, idx) => `
      <div class="coc-legend-item">
        <span class="coc-legend-dot" style="background:${colors[idx % colors.length]}"></span>
        <span>${isHi ? item.hindi : item.category} <b>₹${item.amount.toLocaleString('en-IN')}</b> (${item.pct}%)</span>
      </div>
    `).join('');

    cocEl.innerHTML = `
      <div class="data-strip" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
        <div class="tile">
          <div class="tl"><span>${isHi ? 'कुल लागत / एकड़' : 'Cost / Acre'}</span></div>
          <div class="tv">₹${coc.totalCostPerAcre.toLocaleString('en-IN')}</div>
          <div class="tn">${isHi ? 'A2+FL बीज, खाद, श्रम' : 'Seeds, Fert, Power, Labor'}</div>
        </div>
        <div class="tile">
          <div class="tl"><span>${isHi ? 'सकल आमदनी / एकड़' : 'Gross Revenue / Acre'}</span></div>
          <div class="tv">₹${coc.grossPerAcre.toLocaleString('en-IN')}</div>
          <div class="tn">${isHi ? 'अनुमानित उपज मूल्य' : 'Estimated production yield'}</div>
        </div>
        <div class="tile">
          <div class="tl"><span>${isHi ? 'शुद्ध मुनाफा / एकड़' : 'Net Margin / Acre'}</span></div>
          <div class="tv" style="color:#3f6b45">₹${coc.netProfitPerAcre.toLocaleString('en-IN')}</div>
          <div class="tn">${isHi ? 'लागत के बाद बचत' : `+${coc.netMarginPercent}% Profit Margin`}</div>
        </div>
        <div class="tile">
          <div class="tl"><span>${isHi ? 'खेत का कुल शुद्ध लाभ' : `Total Plot (${acres} Ac)`}</span></div>
          <div class="tv" style="color:var(--forest)">₹${coc.netProfitForAcres.toLocaleString('en-IN')}</div>
          <div class="tn">${acres} ${isHi ? 'एकड़ के लिए' : 'acres overall'}</div>
        </div>
      </div>

      <div style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);margin-bottom:4px">
          <span>${isHi ? 'CACP इनपुट लागत वितरण' : 'CACP Input Expense Distribution'}</span>
          <span>100%</span>
        </div>
        <div class="coc-progress">${progressSegments}</div>
        <div class="coc-legend">${legendItems}</div>
      </div>

      <div style="background:#f4f7ee;border:1px solid #c9d8bc;border-radius:10px;padding:12px;margin-top:14px;font-size:12px;color:#2c4c31;line-height:1.5">
        💡 <b>${isHi ? 'कृषि मित्र द्वारा लागत बचत' : 'Krishi Mitra Resource Efficiency'}:</b> ${isHi
          ? 'चरण 5 के उपग्रह व मिट्टी नमी आधारित सिंचाई कार्यक्रम से औसतन ₹1,200/एकड़ ट्यूबवेल बिजली-डीजल की बचत और समय पर खाद प्रबंधन से ₹850/एकड़ की उर्वरक बर्बादी रुकती है।'
          : 'Step 5 precision telemetry reduces tubewell diesel/electricity pumping costs by ~₹1,200/acre and prevents ~₹850/acre in fertilizer leaching.'}
      </div>
    `;
  }
}

/* ---------------- Multilingual Localization Controller ---------------- */

function toggleLanguage() {
  const current = getLanguage();
  const nextLang = current === 'hi' ? 'en' : 'hi';
  setLanguage(nextLang);
  applyTranslations();
  toast(nextLang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई।' : 'Language switched to English.');
}

function applyTranslations() {
  const lang = getLanguage();
  const isHi = lang === 'hi';

  // Toggle button texts
  const langLabel = $('#langLabel');
  if (langLabel) langLabel.textContent = isHi ? 'EN' : 'हिंदी';
  const loginLangBtn = $('#loginLangBtn');
  if (loginLangBtn) loginLangBtn.textContent = isHi ? 'EN' : 'हिंदी';

  // Login View
  const loginTitle = $('#loginTitle');
  const loginSub = $('#loginSub');
  const loginEmailLbl = $('#loginEmailLbl');
  const loginPassLbl = $('#loginPassLbl');
  const loginRememberLbl = $('#loginRememberLbl');
  const loginBtn = $('#loginBtn');
  const guestBtn = $('#guestBtn');

  if (loginTitle) loginTitle.textContent = t('signInTitle');
  if (loginSub) loginSub.textContent = t('signInSub');
  if (loginEmailLbl) loginEmailLbl.textContent = t('emailLabel');
  if (loginPassLbl) loginPassLbl.textContent = t('passwordLabel');
  if (loginRememberLbl) loginRememberLbl.textContent = t('rememberMe');
  if (loginBtn) loginBtn.textContent = t('continueBtn');
  if (guestBtn) guestBtn.textContent = t('continueGuestBtn');

  // Step 2
  const locSearch = $('#locSearch');
  if (locSearch) locSearch.placeholder = t('searchPlaceholder');
  const gpsBtn = $('#gpsBtn');
  if (gpsBtn) gpsBtn.textContent = t('useMyLocation');
  const gpsBtn2 = $('#gpsBtn2');
  if (gpsBtn2) gpsBtn2.textContent = t('useMyCurrentLocation');
  const confirmLocBtn = $('#confirmLocBtn');
  if (confirmLocBtn) confirmLocBtn.textContent = t('confirmLocation');

  // Step 3
  const undoBtn = $('#undoBtn');
  if (undoBtn) undoBtn.textContent = t('undo');
  const clearBtn = $('#clearBtn');
  if (clearBtn) clearBtn.textContent = t('clear');
  const finishBtn = $('#finishBtn');
  if (finishBtn) finishBtn.textContent = t('finishOutline');
  const scanBtn = $('#scanBtn');
  if (scanBtn) scanBtn.textContent = t('scanThisPlot');
  const estimateBtn = $('#estimateBtn');
  if (estimateBtn) estimateBtn.textContent = t('use1AcreEstimate');

  // Step 4
  const decisionBtn = $('#decisionBtn');
  if (decisionBtn) decisionBtn.textContent = t('getWateringDecision');

  // Step 5
  const editSetupBtn = $('#editSetupBtn');
  if (editSetupBtn) editSetupBtn.textContent = t('editSetup');
  const toCropsBtn = $('#toCropsBtn');
  if (toCropsBtn) toCropsBtn.textContent = t('seeBestCrops');

  // Step 6
  const restartBtn = $('#restartBtn');
  if (restartBtn) restartBtn.textContent = t('startOver');
  const printBtn = $('#printBtn');
  if (printBtn) printBtn.textContent = t('savePrintSummary');
  const toMarketBtn = $('#toMarketBtn');
  if (toMarketBtn) toMarketBtn.textContent = t('toMarketBtn');

  // Step 7
  const backToCropsBtn = $('#backToCropsBtn');
  if (backToCropsBtn) backToCropsBtn.textContent = isHi ? '← फसल चयन पर वापस' : '← Back to Crops';
  const marketRestartBtn = $('#marketRestartBtn');
  if (marketRestartBtn) marketRestartBtn.textContent = t('startOver');
  const marketPrintBtn = $('#marketPrintBtn');
  if (marketPrintBtn) marketPrintBtn.textContent = t('savePrintSummary');
  const marketCropLabel = $('#marketCropLabel');
  if (marketCropLabel) marketCropLabel.textContent = isHi ? 'फसल चुनें' : 'Selected Crop';

  // AI & Voice Assistant buttons
  const step5AiBtnLbl = $('#step5AiBtn [data-i18n]');
  if (step5AiBtnLbl) step5AiBtnLbl.textContent = t('aiAdvisory');
  const step5VoiceBtnLbl = $('#step5VoiceBtn [data-i18n]');
  if (step5VoiceBtnLbl) step5VoiceBtnLbl.textContent = t('listenAdvisory');
  const step6AiBtnLbl = $('#step6AiBtn [data-i18n]');
  if (step6AiBtnLbl) step6AiBtnLbl.textContent = t('aiProfitAdvisory');
  const step6VoiceBtnLbl = $('#step6VoiceBtn [data-i18n]');
  if (step6VoiceBtnLbl) step6VoiceBtnLbl.textContent = t('listenProfit');
  const step7AiBtnLbl = $('#step7AiBtn [data-i18n]');
  if (step7AiBtnLbl) step7AiBtnLbl.textContent = t('aiMarketAdvisory');
  const step7VoiceBtnLbl = $('#step7VoiceBtn [data-i18n]');
  if (step7VoiceBtnLbl) step7VoiceBtnLbl.textContent = t('listenMarket');

  const step5AiPlayLabel = $('#step5AiPlayLabel');
  if (step5AiPlayLabel) step5AiPlayLabel.textContent = t('listenAdvisory');
  const step6AiPlayLabel = $('#step6AiPlayLabel');
  if (step6AiPlayLabel) step6AiPlayLabel.textContent = t('listenProfit');
  const step7AiPlayLabel = $('#step7AiPlayLabel');
  if (step7AiPlayLabel) step7AiPlayLabel.textContent = t('listenMarket');

  const copyStep5AiBtn = $('#copyStep5AiBtn');
  if (copyStep5AiBtn) copyStep5AiBtn.textContent = t('copyAdvice');
  const copyStep6AiBtn = $('#copyStep6AiBtn');
  if (copyStep6AiBtn) copyStep6AiBtn.textContent = t('copyAdvice');
  const copyStep7AiBtn = $('#copyStep7AiBtn');
  if (copyStep7AiBtn) copyStep7AiBtn.textContent = t('copyAdvice');

  const step5AiTitle = $('#step5AiTitle');
  if (step5AiTitle) step5AiTitle.textContent = isHi ? 'गेम्मा एआई फील्ड सलाहकार' : 'Gemma AI Field Advisor';
  const step6AiTitle = $('#step6AiTitle');
  if (step6AiTitle) step6AiTitle.textContent = isHi ? 'गेम्मा एआई वित्तीय विश्लेषण' : 'Gemma AI Financial Outlook';
  const step7AiTitle = $('#step7AiTitle');
  if (step7AiTitle) step7AiTitle.textContent = isHi ? 'गेम्मा एआई मंडी व बाज़ार ब्रीफिंग' : 'Gemma AI Market & Mandi Briefing';

  // Translate all [data-i18n] tags in static HTML
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) {
      const val = t(key);
      if (val) el.textContent = val;
    }
  });

  // Re-render stepper & active step headers
  updateStepperUI();
  const meta = STEP_METADATA[state.step];
  if (meta) {
    const eyebrow = $('#stepEyebrow');
    const title = $('#stepTitle');
    const sub = $('#stepSub');
    if (eyebrow) {
      eyebrow.textContent = isHi
        ? `चरण ${state.step} (7 में से) · ${t('step' + state.step)}`
        : `Step ${state.step} of 7 · ${meta.label}`;
    }
    if (title) title.textContent = t(`step${state.step}_title`, meta.title);
    if (sub) sub.textContent = t(`step${state.step}_sub`, meta.sub);
  }

  // Active step view refresh
  if (state.step === 4) renderScanDashboard();
  if (state.step === 5) renderDecisionView();
  if (state.step === 6) renderCropsView();
  if (state.step === 7) renderMarketView();
}

/* ---------------- Event Listeners & Binding ---------------- */

function bindAuthEvents() {
  const loginLangBtn = $('#loginLangBtn');
  if (loginLangBtn) loginLangBtn.addEventListener('click', toggleLanguage);

  const eyeBtn = $('#eyeBtn');
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      const passInput = $('#password');
      if (!passInput) return;
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      eyeBtn.textContent = isPass ? 'hide' : 'show';
      eyeBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
    });
  }

  const guestBtn = $('#guestBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => loginUser('', true));
  }

  const forgotBtn = $('#forgotBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      toast('Demo mode: Use guest mode or any email with 6+ character password.');
    });
  }

  const loginForm = $('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = ($('#email')?.value || '').trim();
      const pass = $('#password')?.value || '';
      const emailErr = $('#emailErr');
      const passErr = $('#passErr');
      if (emailErr) emailErr.textContent = '';
      if (passErr) passErr.textContent = '';

      let valid = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (emailErr) emailErr.textContent = 'Enter a valid email address (e.g., farmer@gmail.com).';
        valid = false;
      }
      if (pass.length < 6) {
        if (passErr) passErr.textContent = 'Password must be at least 6 characters.';
        valid = false;
      }
      if (!valid) return;

      const loginBtn = $('#loginBtn');
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spin"></span> Signing in…';
      }

      setTimeout(() => {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Continue';
        }
        loginUser(email, false);
        toast(`Welcome back, ${state.user.name.split(' ')[0]}.`);
      }, 500);
    });
  }
}

function bindAppEvents() {
  const langToggle = $('#langToggle');
  if (langToggle) langToggle.addEventListener('click', toggleLanguage);

  const exitBtn = $('#exitBtn');
  if (exitBtn) exitBtn.addEventListener('click', logoutUser);

  const backBtn = $('#backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (state.step > 2) goStep(state.step - 1);
    });
  }

  // Stepper Click & Keyboard Accessibility
  $$('#stepper li').forEach((li) => {
    const handleStepNav = () => {
      const s = Number(li.dataset.step);
      goStep(s);
    };

    li.addEventListener('click', handleStepNav);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStepNav();
      }
    });
  });

  // GPS Locate Buttons
  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not available in this browser.', 'warn');
      return;
    }
    toast('Locating field coordinates via GPS…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        state.accuracy = pos.coords.accuracy;
        updateLocationCoords(lat, lon, true, true);
        const name = await reverseGeocode(lat, lon);
        state.location.name = name;
        const locTitle = $('#locTitle');
        if (locTitle) locTitle.textContent = name;
        saveLocation(state.location);
        toast('Pin moved to your GPS location.');
      },
      () => toast('Location permission was denied — search for your village instead.', 'warn'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const gpsBtn = $('#gpsBtn');
  const gpsBtn2 = $('#gpsBtn2');
  if (gpsBtn) gpsBtn.addEventListener('click', handleLocate);
  if (gpsBtn2) gpsBtn2.addEventListener('click', handleLocate);

  // Confirm Location Button
  const confirmLocBtn = $('#confirmLocBtn');
  if (confirmLocBtn) {
    confirmLocBtn.addEventListener('click', async () => {
      confirmLocBtn.disabled = true;
      confirmLocBtn.innerHTML = '<span class="spin"></span> Loading weather data…';
      await loadWeatherData();
      confirmLocBtn.disabled = false;
      confirmLocBtn.innerHTML = 'Confirm this location →';
      goStep(3);
    });
  }

  // Step 3 Trace Controls
  const undoBtn = $('#undoBtn');
  const clearBtn = $('#clearBtn');
  const finishBtn = $('#finishBtn');
  const estimateBtn = $('#estimateBtn');
  const scanBtn = $('#scanBtn');

  if (undoBtn) undoBtn.addEventListener('click', undoPlotVertex);
  if (clearBtn) clearBtn.addEventListener('click', clearPlotVertices);
  if (estimateBtn) estimateBtn.addEventListener('click', estimatePlot1Acre);

  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      if (state.draft.length < 3) {
        toast('Mark at least three corners of the plot.', 'warn');
        return;
      }
      updatePlotUI();
      toast(`Outline saved — ${state.plot.acres.toFixed(2)} acres.`);
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      if (!state.plot || state.plot.points.length < 3) {
        toast('Mark at least three corners or use 1-acre estimate.', 'warn');
        return;
      }
      goStep(4);
    });
  }

  // Farm Setup Form
  const setupForm = $('#setupForm');
  if (setupForm) {
    setupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const acresVal = parseFloat($('#acres')?.value || '1');
      if (!(acresVal > 0)) {
        toast('Enter an area greater than zero.', 'warn');
        return;
      }
      state.setup.irrigation = $('#irrigation')?.value || 'flood';
      state.setup.sowDate = $('#sowDate')?.value || isoLocal();
      state.setup.acres = acresVal;
      state.setup.ferts = $$('#fertChips button.on').map((b) => b.dataset.fert);
      saveSetup(state.setup);
      goStep(5);
    });
  }

  // Fertilizer Chips
  $$('#fertChips button').forEach((b) => {
    b.addEventListener('click', () => {
      b.classList.toggle('on');
      b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false');
    });
  });

  // Step 5 & 6 Controls
  const editSetupBtn = $('#editSetupBtn');
  const toCropsBtn = $('#toCropsBtn');
  const scenarioSel = $('#scenarioSel');
  const analyticsToggle = $('#analyticsToggle');
  const restartBtn = $('#restartBtn');
  const printBtn = $('#printBtn');

  if (editSetupBtn) editSetupBtn.addEventListener('click', () => goStep(4));
  if (toCropsBtn) toCropsBtn.addEventListener('click', () => goStep(6));

  if (scenarioSel) {
    scenarioSel.addEventListener('change', (e) => {
      state.scenario = e.target.value;
      renderCropsView();
    });
  }

  $$('#sortSeg button').forEach((b) => {
    b.addEventListener('click', () => {
      state.sortMode = b.dataset.sort;
      $$('#sortSeg button').forEach((btn) => btn.classList.toggle('active', btn === b));
      renderCropsView();
    });
  });

  if (analyticsToggle) {
    analyticsToggle.addEventListener('change', (e) => {
      state.analytics = e.target.checked;
      renderCropsView();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      clearPlotVertices();
      state.plot = null;
      state.decision = null;
      state.maxStep = 2;
      saveNav(2, 2);
      goStep(2);
      toast('Reset to field location.');
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // Step 7 Mandi & Market Controls
  const toMarketBtn = $('#toMarketBtn');
  if (toMarketBtn) toMarketBtn.addEventListener('click', () => goStep(7));

  const backToCropsBtn = $('#backToCropsBtn');
  if (backToCropsBtn) backToCropsBtn.addEventListener('click', () => goStep(6));

  const marketRestartBtn = $('#marketRestartBtn');
  if (marketRestartBtn) {
    marketRestartBtn.addEventListener('click', () => {
      clearPlotVertices();
      state.plot = null;
      state.decision = null;
      state.maxStep = 2;
      saveNav(2, 2);
      goStep(2);
      toast('Reset to field location.');
    });
  }

  const marketPrintBtn = $('#marketPrintBtn');
  if (marketPrintBtn) {
    marketPrintBtn.addEventListener('click', () => window.print());
  }

  const marketCropSel = $('#marketCropSel');
  if (marketCropSel) {
    marketCropSel.addEventListener('change', (e) => {
      state.marketCrop = e.target.value;
      renderMarketView();
    });
  }

  $$('#marketHorizonSeg button').forEach((b) => {
    b.addEventListener('click', () => {
      state.storageHorizonDays = Number(b.dataset.days);
      $$('#marketHorizonSeg button').forEach((btn) => btn.classList.toggle('active', btn === b));
      renderMarketView();
    });
  });

  bindSearchAutocomplete();
  bindAiAdvisorEvents();
}

function bindAiAdvisorEvents() {
  // Step 5 AI & Voice
  const step5AiBtn = $('#step5AiBtn');
  const step5VoiceBtn = $('#step5VoiceBtn');
  const step5AiCard = $('#step5AiCard');
  const step5AiText = $('#step5AiText');
  const step5AiPlayBtn = $('#step5AiPlayBtn');
  const step5AiPlayLabel = $('#step5AiPlayLabel');
  const step5VoiceWave = $('#step5VoiceWave');
  const step5VoiceStatus = $('#step5VoiceStatus');
  const closeStep5AiBtn = $('#closeStep5AiBtn');
  const copyStep5AiBtn = $('#copyStep5AiBtn');

  async function getStep5Advice(force = false) {
    if (!state.decision) return null;
    const lang = getLanguage();
    if (!force && state.aiSummaries?.step5 && state.aiSummaries.step5Lang === lang) {
      return state.aiSummaries.step5;
    }

    if (step5AiText) step5AiText.textContent = t('generatingAi');
    if (step5AiCard) step5AiCard.hidden = false;

    const crop = CROPS[state.setup.crop] || CROPS.wheat;
    const soil = SOILS[state.soilKey] || SOILS.alluvial;
    const data = {
      crop: lang === 'hi' ? (crop.hi || crop.name) : crop.name,
      soil: soil.name,
      acres: state.setup.acres,
      verdict: state.decision.verdict,
      mm: state.decision.mm,
      litres: state.decision.litres,
      when: state.decision.when,
      stage: state.decision.stage,
      pestRisk: state.decision.pestRisk,
      fertPlan: state.decision.fertPlan
    };

    const res = await fetchAiSummary({ type: 'irrigation', lang, data });
    state.aiSummaries = state.aiSummaries || {};
    state.aiSummaries.step5 = res.summary;
    state.aiSummaries.step5Lang = lang;
    if (step5AiText) step5AiText.textContent = res.summary;
    return res.summary;
  }

  if (step5AiBtn) {
    step5AiBtn.addEventListener('click', async () => {
      if (step5AiCard) step5AiCard.hidden = false;
      await getStep5Advice();
      step5AiCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function updateStep5VoiceState(isPlaying) {
    if (step5VoiceBtn) {
      step5VoiceBtn.classList.toggle('playing', isPlaying);
      const icon = step5VoiceBtn.querySelector('.voice-icon') || step5VoiceBtn.querySelector('span');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      const lbl = step5VoiceBtn.querySelector('[data-i18n]');
      if (lbl) lbl.textContent = isPlaying ? t('stopAudio') : t('listenAdvisory');
    }
    if (step5AiPlayBtn) {
      step5AiPlayBtn.classList.toggle('playing', isPlaying);
      const icon = step5AiPlayBtn.querySelector('.voice-play-icon');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      if (step5AiPlayLabel) step5AiPlayLabel.textContent = isPlaying ? t('stopAudio') : t('listenAdvisory');
    }
    if (step5VoiceWave) {
      step5VoiceWave.classList.toggle('active', isPlaying);
    }
    if (step5VoiceStatus) {
      step5VoiceStatus.textContent = isPlaying ? t('playingAudio') : 'Natural vernacular audio via ElevenLabs';
    }
  }

  async function toggleStep5Voice() {
    if (isSpeechPlaying()) {
      stopSpeech();
      updateStep5VoiceState(false);
      return;
    }

    const advice = await getStep5Advice();
    if (!advice) return;

    const lang = getLanguage();
    playSpeech(advice, lang, {
      onStart: () => {
        updateStep5VoiceState(true);
      },
      onEnd: () => {
        updateStep5VoiceState(false);
      },
      onError: () => {
        updateStep5VoiceState(false);
        toast('Voice playback unavailable.', 'warn');
      }
    });
  }

  if (step5VoiceBtn) step5VoiceBtn.addEventListener('click', toggleStep5Voice);
  if (step5AiPlayBtn) step5AiPlayBtn.addEventListener('click', toggleStep5Voice);

  if (closeStep5AiBtn) {
    closeStep5AiBtn.addEventListener('click', () => {
      if (isSpeechPlaying()) {
        stopSpeech();
        updateStep5VoiceState(false);
      }
      if (step5AiCard) step5AiCard.hidden = true;
    });
  }

  if (copyStep5AiBtn) {
    copyStep5AiBtn.addEventListener('click', () => {
      const text = step5AiText?.textContent || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        copyStep5AiBtn.textContent = t('copied');
        setTimeout(() => (copyStep5AiBtn.textContent = t('copyAdvice')), 2000);
      }
    });
  }

  // Step 6 AI & Voice
  const step6AiBtn = $('#step6AiBtn');
  const step6VoiceBtn = $('#step6VoiceBtn');
  const step6AiCard = $('#step6AiCard');
  const step6AiText = $('#step6AiText');
  const step6AiPlayBtn = $('#step6AiPlayBtn');
  const step6AiPlayLabel = $('#step6AiPlayLabel');
  const step6VoiceWave = $('#step6VoiceWave');
  const step6VoiceStatus = $('#step6VoiceStatus');
  const closeStep6AiBtn = $('#closeStep6AiBtn');
  const copyStep6AiBtn = $('#copyStep6AiBtn');

  async function getStep6Advice(force = false) {
    if (!state.ranking || !state.ranking.length) return null;
    const lang = getLanguage();
    if (!force && state.aiSummaries?.step6 && state.aiSummaries.step6Lang === lang && state.aiSummaries.step6Scenario === state.scenario) {
      return state.aiSummaries.step6;
    }

    if (step6AiText) step6AiText.textContent = t('generatingAi');
    if (step6AiCard) step6AiCard.hidden = false;

    const top = state.ranking[0];
    const second = state.ranking[1] || top;
    const soil = SOILS[state.soilKey] || SOILS.alluvial;
    const data = {
      acres: state.setup.acres,
      soil: soil.name,
      scenario: state.scenario,
      topCrop: top ? { name: lang === 'hi' ? (top.crop.hi || top.crop.name) : top.crop.name, profit: top.profit } : null,
      secondCrop: second ? { name: lang === 'hi' ? (second.crop.hi || second.crop.name) : second.crop.name, profit: second.profit } : null
    };

    const res = await fetchAiSummary({ type: 'profit', lang, data });
    state.aiSummaries = state.aiSummaries || {};
    state.aiSummaries.step6 = res.summary;
    state.aiSummaries.step6Lang = lang;
    state.aiSummaries.step6Scenario = state.scenario;
    if (step6AiText) step6AiText.textContent = res.summary;
    return res.summary;
  }

  if (step6AiBtn) {
    step6AiBtn.addEventListener('click', async () => {
      if (step6AiCard) step6AiCard.hidden = false;
      await getStep6Advice();
      step6AiCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function updateStep6VoiceState(isPlaying) {
    if (step6VoiceBtn) {
      step6VoiceBtn.classList.toggle('playing', isPlaying);
      const icon = step6VoiceBtn.querySelector('.voice-icon') || step6VoiceBtn.querySelector('span');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      const lbl = step6VoiceBtn.querySelector('[data-i18n]');
      if (lbl) lbl.textContent = isPlaying ? t('stopAudio') : t('listenProfit');
    }
    if (step6AiPlayBtn) {
      step6AiPlayBtn.classList.toggle('playing', isPlaying);
      const icon = step6AiPlayBtn.querySelector('.voice-play-icon');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      if (step6AiPlayLabel) step6AiPlayLabel.textContent = isPlaying ? t('stopAudio') : t('listenProfit');
    }
    if (step6VoiceWave) {
      step6VoiceWave.classList.toggle('active', isPlaying);
    }
    if (step6VoiceStatus) {
      step6VoiceStatus.textContent = isPlaying ? t('playingAudio') : 'Natural vernacular audio via ElevenLabs';
    }
  }

  async function toggleStep6Voice() {
    if (isSpeechPlaying()) {
      stopSpeech();
      updateStep6VoiceState(false);
      return;
    }

    const advice = await getStep6Advice();
    if (!advice) return;

    const lang = getLanguage();
    playSpeech(advice, lang, {
      onStart: () => {
        updateStep6VoiceState(true);
      },
      onEnd: () => {
        updateStep6VoiceState(false);
      },
      onError: () => {
        updateStep6VoiceState(false);
        toast('Voice playback unavailable.', 'warn');
      }
    });
  }

  if (step6VoiceBtn) step6VoiceBtn.addEventListener('click', toggleStep6Voice);
  if (step6AiPlayBtn) step6AiPlayBtn.addEventListener('click', toggleStep6Voice);

  if (closeStep6AiBtn) {
    closeStep6AiBtn.addEventListener('click', () => {
      if (isSpeechPlaying()) {
        stopSpeech();
        updateStep6VoiceState(false);
      }
      if (step6AiCard) step6AiCard.hidden = true;
    });
  }

  if (copyStep6AiBtn) {
    copyStep6AiBtn.addEventListener('click', () => {
      const text = step6AiText?.textContent || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        copyStep6AiBtn.textContent = t('copied');
        setTimeout(() => (copyStep6AiBtn.textContent = t('copyAdvice')), 2000);
      }
    });
  }

  // Step 7 AI & Voice
  const step7AiBtn = $('#step7AiBtn');
  const step7VoiceBtn = $('#step7VoiceBtn');
  const step7AiCard = $('#step7AiCard');
  const step7AiText = $('#step7AiText');
  const step7AiPlayBtn = $('#step7AiPlayBtn');
  const step7AiPlayLabel = $('#step7AiPlayLabel');
  const step7VoiceWave = $('#step7VoiceWave');
  const step7VoiceStatus = $('#step7VoiceStatus');
  const closeStep7AiBtn = $('#closeStep7AiBtn');
  const copyStep7AiBtn = $('#copyStep7AiBtn');

  async function getStep7Advice(force = false) {
    const lang = getLanguage();
    const cropKey = state.marketCrop || state.setup?.crop || 'wheat';
    if (!force && state.aiSummaries?.step7 && state.aiSummaries.step7Lang === lang && state.aiSummaries.step7Crop === cropKey) {
      return state.aiSummaries.step7;
    }

    if (step7AiText) step7AiText.textContent = t('generatingAi');
    if (step7AiCard) step7AiCard.hidden = false;

    const acres = state.setup?.acres || 1;
    const arb = computeMandiArbitrage({
      cropKey,
      acres,
      location: state.location || { lat: 29.685, lon: 76.99 }
    });
    const storageData = evaluateStorageBreakeven({
      cropKey,
      acres,
      harvestModalPrice: arb.bestMandi.modalPrice
    });

    const data = {
      crop: lang === 'hi' ? arb.cropHindi : arb.cropName,
      acres,
      bestMandi: lang === 'hi' ? (arb.bestMandi.hindiName || arb.bestMandi.name) : arb.bestMandi.name,
      localMandi: lang === 'hi' ? (arb.localMandi.hindiName || arb.localMandi.name) : arb.localMandi.name,
      extraGain: arb.extraNetGain,
      msp: arb.msp,
      mspSpread: arb.mspSpreadPercent,
      storageOptimalDays: storageData.optimalDays,
      storageOptimalGain: storageData.optimalGain,
      storageRecommendation: storageData.recommendation
    };

    const res = await fetchAiSummary({ type: 'market', lang, data });
    state.aiSummaries = state.aiSummaries || {};
    state.aiSummaries.step7 = res.summary;
    state.aiSummaries.step7Lang = lang;
    state.aiSummaries.step7Crop = cropKey;
    if (step7AiText) step7AiText.textContent = res.summary;
    return res.summary;
  }

  if (step7AiBtn) {
    step7AiBtn.addEventListener('click', async () => {
      if (step7AiCard) step7AiCard.hidden = false;
      await getStep7Advice();
      step7AiCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function updateStep7VoiceState(isPlaying) {
    if (step7VoiceBtn) {
      step7VoiceBtn.classList.toggle('playing', isPlaying);
      const icon = step7VoiceBtn.querySelector('.voice-icon') || step7VoiceBtn.querySelector('span');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      const lbl = step7VoiceBtn.querySelector('[data-i18n]');
      if (lbl) lbl.textContent = isPlaying ? t('stopAudio') : t('listenMarket');
    }
    if (step7AiPlayBtn) {
      step7AiPlayBtn.classList.toggle('playing', isPlaying);
      const icon = step7AiPlayBtn.querySelector('.voice-play-icon');
      if (icon) icon.textContent = isPlaying ? '⏹' : '🔊';
      if (step7AiPlayLabel) step7AiPlayLabel.textContent = isPlaying ? t('stopAudio') : t('listenMarket');
    }
    if (step7VoiceWave) {
      step7VoiceWave.classList.toggle('active', isPlaying);
    }
    if (step7VoiceStatus) {
      step7VoiceStatus.textContent = isPlaying ? t('playingAudio') : 'Natural vernacular audio via ElevenLabs';
    }
  }

  async function toggleStep7Voice() {
    if (isSpeechPlaying()) {
      stopSpeech();
      updateStep7VoiceState(false);
      return;
    }

    const advice = await getStep7Advice();
    if (!advice) return;

    const lang = getLanguage();
    playSpeech(advice, lang, {
      onStart: () => {
        updateStep7VoiceState(true);
      },
      onEnd: () => {
        updateStep7VoiceState(false);
      },
      onError: () => {
        updateStep7VoiceState(false);
        toast('Voice playback unavailable.', 'warn');
      }
    });
  }

  if (step7VoiceBtn) step7VoiceBtn.addEventListener('click', toggleStep7Voice);
  if (step7AiPlayBtn) step7AiPlayBtn.addEventListener('click', toggleStep7Voice);

  if (closeStep7AiBtn) {
    closeStep7AiBtn.addEventListener('click', () => {
      if (isSpeechPlaying()) {
        stopSpeech();
        updateStep7VoiceState(false);
      }
      if (step7AiCard) step7AiCard.hidden = true;
    });
  }

  if (copyStep7AiBtn) {
    copyStep7AiBtn.addEventListener('click', () => {
      const text = step7AiText?.textContent || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        copyStep7AiBtn.textContent = t('copied');
        setTimeout(() => (copyStep7AiBtn.textContent = t('copyAdvice')), 2000);
      }
    });
  }
}

function bindSearchAutocomplete() {
  const input = $('#locSearch');
  const pop = $('#locPop');
  if (!input || !pop) return;

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      pop.classList.remove('open');
      return;
    }
    timer = setTimeout(async () => {
      const results = await searchPlaces(q);
      if (!results.length) {
        pop.innerHTML = '<div style="padding:12px 13px;font-size:12px;color:#6d7a68">No place found</div>';
      } else {
        pop.innerHTML = results
          .map(
            (x, i) =>
              `<button type="button" data-i="${i}" tabindex="0">${[x.name, x.admin1, x.country].filter(Boolean).join(', ')}</button>`
          )
          .join('');

        $$('button', pop).forEach((btn) => {
          btn.addEventListener('click', () => {
            const item = results[Number(btn.dataset.i)];
            const formatted = [item.name, item.admin1].filter(Boolean).join(', ');
            state.location.name = formatted;
            const locTitle = $('#locTitle');
            if (locTitle) locTitle.textContent = formatted;
            updateLocationCoords(item.latitude, item.longitude, true);
            pop.classList.remove('open');
            input.value = '';
          });
        });
      }
      pop.classList.add('open');
    }, 280);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      pop.classList.remove('open');
    } else if (e.key === 'ArrowDown') {
      const firstBtn = $('button', pop);
      if (firstBtn) {
        e.preventDefault();
        firstBtn.focus();
      }
    }
  });

  pop.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = active.nextElementSibling;
      if (next && next.tagName === 'BUTTON') next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = active.previousElementSibling;
      if (prev && prev.tagName === 'BUTTON') {
        prev.focus();
      } else {
        input.focus();
      }
    } else if (e.key === 'Escape') {
      pop.classList.remove('open');
      input.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-inline')) {
      pop.classList.remove('open');
    }
  });
}

/* ---------------- Boot Orchestrator ---------------- */

export function bootApp() {
  setupLocationMap();
  setupTraceMap();
  bindAuthEvents();
  bindAppEvents();
  applyTranslations();

  // Restore saved state
  const savedLoc = getLocation();
  state.location = savedLoc;
  const locTitle = $('#locTitle');
  if (locTitle) locTitle.textContent = state.location.name;
  updateLocationCoords(state.location.lat, state.location.lon, true);

  const savedSetup = getSetup();
  state.setup = savedSetup;

  const savedPlot = getPlot();
  if (savedPlot) {
    state.plot = savedPlot;
    state.draft = savedPlot.points.slice();
    updatePlotUI();
  }

  const session = getSession();
  const nav = getNav();

  if (session && (session.email || session.guest)) {
    state.user = { name: session.name || (session.guest ? 'Guest' : 'Farmer'), email: session.email };
    state.guest = !!session.guest;
    const userAv = $('#userAv');
    const userName = $('#userName');
    if (userAv) userAv.textContent = (state.user.name.charAt(0) || 'K').toUpperCase();
    if (userName) userName.textContent = state.user.name.split(' ')[0];

    // Restore step safely
    const targetStep = Math.max(2, Math.min(nav.step, calculateMaxStep(state)));
    state.maxStep = Math.max(nav.maxStep, targetStep);
    goStep(targetStep);
  } else {
    goStep(1, true);
  }
}

// Auto-boot if running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }
}

