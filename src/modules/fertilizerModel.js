/**
 * Krishi Mitra — Fertilizer Stewardship & Nitrogen Leaching Guard
 * 
 * Implements 4R Nutrient Stewardship (Right Source, Right Rate, Right Time, Right Place)
 * in accordance with ICAR-IARI and International Nitrogen Management Guidelines.
 */

import { CROPS } from '../data/crops.js';
import { sum, clamp } from './calculations.js';

export const FERTILIZER_DOSES = {
  wheat: [
    { stage: 'Sowing / Basal', gdd: 0, dose: '1 bag DAP (50 kg) + 30 kg Urea per acre at sowing time.', timing: 'Basal application' },
    { stage: 'Tillering (CRI)', gdd: 420, dose: '1 bag Urea (45 kg) per acre directly after first irrigation.', timing: '1st Top-dress' },
    { stage: 'Jointing / Heading', gdd: 760, dose: '30 kg Urea + 5 kg Zinc Sulfate (21%) per acre for grain fill.', timing: '2nd Top-dress' },
    { stage: 'Maturity', gdd: 1420, dose: 'No further nitrogen required. Avoid late application to prevent lodging.', timing: 'Late stage' }
  ],
  rice: [
    { stage: 'Transplanting', gdd: 0, dose: '1 bag DAP (50 kg) + 25 kg MOP + 10 kg Zinc per acre at puddling.', timing: 'Basal application' },
    { stage: 'Active Tillering', gdd: 300, dose: '1 bag Urea (45 kg) per acre in moist soil (not deeply flooded).', timing: '1st Top-dress' },
    { stage: 'Panicle Initiation', gdd: 700, dose: '30 kg Urea per acre to maximize grain count per panicle.', timing: '2nd Top-dress' }
  ],
  maize: [
    { stage: 'Sowing', gdd: 0, dose: '1 bag DAP (50 kg) + 30 kg Urea + 10 kg Zinc per acre.', timing: 'Basal application' },
    { stage: 'Knee-high (V6)', gdd: 380, dose: '1 bag Urea (45 kg) per acre side-dressed along crop rows.', timing: '1st Top-dress' },
    { stage: 'Tasseling', gdd: 750, dose: '35 kg Urea per acre before silk emergence.', timing: '2nd Top-dress' }
  ],
  mustard: [
    { stage: 'Sowing', gdd: 0, dose: '40 kg DAP + 30 kg Urea + 80 kg Gypsum (source of Sulfur) per acre.', timing: 'Basal application' },
    { stage: 'Rosette / Bolting', gdd: 350, dose: '30 kg Urea per acre at first irrigation (30-35 days after sowing).', timing: '1st Top-dress' }
  ],
  chickpea: [
    { stage: 'Sowing', gdd: 0, dose: '35 kg DAP + 15 kg Starter Urea per acre. Rhizobium culture treatment.', timing: 'Basal application' },
    { stage: 'Flowering', gdd: 600, dose: 'Foliar spray of 2% Urea or DAP solution during early pod formation.', timing: 'Foliar boost' }
  ],
  cotton: [
    { stage: 'Sowing', gdd: 0, dose: '50 kg DAP + 30 kg Urea + 25 kg MOP per acre.', timing: 'Basal application' },
    { stage: 'Squaring', gdd: 500, dose: '40 kg Urea + 10 kg Magnesium Sulfate per acre.', timing: '1st Top-dress' },
    { stage: 'Boll Development', gdd: 900, dose: '35 kg Urea + foliar 13:0:45 (Potassium Nitrate 1%) spray.', timing: '2nd Top-dress' }
  ],
  tomato: [
    { stage: 'Transplanting', gdd: 0, dose: '50 kg NPK 10:26:26 + 10 tonnes well-rotted FYM/compost per acre.', timing: 'Basal application' },
    { stage: 'Vegetative / Flowering', gdd: 350, dose: 'Water-soluble NPK 19:19:19 (3-4 kg/acre/week) through drip.', timing: 'Fertigation' },
    { stage: 'Fruit Development', gdd: 700, dose: 'Calcium Nitrate (2 kg/acre) + Boron to prevent blossom end rot.', timing: 'Fertigation' }
  ],
  sugarcane: [
    { stage: 'Planting', gdd: 0, dose: '1.5 bags DAP (75 kg) + 35 kg Urea + 15 kg Zinc per acre in furrows.', timing: 'Basal application' },
    { stage: 'Tillering', gdd: 600, dose: '60 kg Urea per acre at first earthing up.', timing: '1st Top-dress' },
    { stage: 'Grand Growth', gdd: 1800, dose: '60 kg Urea per acre before onset of heavy monsoon.', timing: '2nd Top-dress' }
  ]
};

/**
 * Analyzes forward rainfall and crop phenology to prevent nutrient leaching
 * and generate stage-specific split dosing advice.
 */
export function analyzeFertilizerStewardship({
  cropKey = 'wheat',
  ferts = ['Urea', 'DAP'],
  stage = { progress: 0.25, gdd: 350, name: 'Tillering' },
  weather,
  acres = 1
}) {
  const crop = CROPS[cropKey] || CROPS.wheat;
  const plan = FERTILIZER_DOSES[cropKey] || FERTILIZER_DOSES.wheat;

  // 1. Calculate 48-hour forward precipitation to assess leaching hazard
  let rain48h = 0;
  if (weather && weather.hourly && weather.hourly.precipitation) {
    const h = weather.hourly;
    const now = Date.now();
    const hi = (h.time || []).findIndex((t) => new Date(t) >= new Date(now - 30 * 60000));
    const start = hi < 0 ? 0 : hi;
    rain48h = sum(h.precipitation.slice(start, start + 48));
  } else if (weather && weather.daily && weather.daily.precipitation_sum) {
    rain48h = sum(weather.daily.precipitation_sum.slice(0, 2));
  }

  // Leaching hazard calculation
  let leachingRisk = 'Low';
  let leachingAdvisory = 'Calm weather: Safe window for scheduled fertilizer application.';
  const hasNitrogen = ferts.some((f) => f.includes('Urea') || f.includes('DAP') || f.includes('NPK'));

  if (rain48h >= 12 && hasNitrogen) {
    leachingRisk = 'High';
    leachingAdvisory = `Heavy rain (${rain48h.toFixed(1)} mm) forecast in 48h. Do NOT broadcast Urea or DAP today! Rain will wash nitrogen past the root zone into the subsoil. Wait until the rain passes.`;
  } else if (rain48h >= 6 && hasNitrogen) {
    leachingRisk = 'Moderate';
    leachingAdvisory = `Moderate rain (${rain48h.toFixed(1)} mm) expected within 48h. Avoid foliar sprays; apply granules only if soil has capacity to absorb without surface pooling.`;
  }

  // 2. Identify Current Growth Stage Dosing
  const currentGdd = stage.gdd || 0;
  let activeDose = plan[0];
  for (let i = 0; i < plan.length; i++) {
    if (currentGdd >= plan[i].gdd) {
      activeDose = plan[i];
    }
  }

  return {
    leachingRisk,
    rain48h: Number(rain48h.toFixed(1)),
    leachingAdvisory,
    activeStageName: activeDose.stage,
    timing: activeDose.timing,
    recommendedDose: activeDose.dose,
    totalAcres: acres,
    dataType: 'estimated'
  };
}

