/**
 * Krishi Mitra — Microclimate Pest & Fungal Disease Early Warning Engine
 * 
 * Evaluates hourly atmospheric signals (Leaf wetness duration inferred from RH >= 80%,
 * consecutive favorable temperature degree hours, and precipitation) against
 * peer-reviewed epidemiological thresholds (e.g. Wallin DSI for Late Blight,
 * ICAR crop pathology benchmarks).
 */

import { CROPS } from '../data/crops.js';
import { clamp, avg } from './calculations.js';

export const PEST_DISEASE_PROFILES = {
  wheat: {
    diseaseName: 'Yellow & Brown Rust',
    scientificName: 'Puccinia striiformis / recondita',
    tempMin: 10,
    tempMax: 22,
    criticalRh: 80,
    criticalHours: 8,
    advisory: 'Prolonged leaf dampness and mild temperatures favor rust spore germination. Monitor flag leaf for yellow-orange pustules.',
    preventiveAction: 'Apply preventive bio-fungicide (Trichoderma viride) or propiconazole 25% EC if damp weather persists.'
  },
  rice: {
    diseaseName: 'Blast & Sheath Blight',
    scientificName: 'Magnaporthe oryzae / Rhizoctonia solani',
    tempMin: 22,
    tempMax: 30,
    criticalRh: 88,
    criticalHours: 10,
    advisory: 'Sustained high canopy humidity (>88%) and warm nights accelerate blast lesions on foliage and panicle neck.',
    preventiveAction: 'Avoid excessive nitrogen top-dressing; maintain moderate water depth and spray Pseudomonas fluorescens.'
  },
  maize: {
    diseaseName: 'Fall Armyworm & Leaf Blight',
    scientificName: 'Spodoptera frugiperda / Exserohilum turcicum',
    tempMin: 20,
    tempMax: 30,
    criticalRh: 75,
    criticalHours: 8,
    advisory: 'Warm humid nights favor adult moth egg-laying in the central whorl and fungal leaf spot proliferation.',
    preventiveAction: 'Inspect whorls for pinhole feeding; apply neem formulation (Azadirachtin 1500 ppm) or install pheromone traps.'
  },
  mustard: {
    diseaseName: 'White Rust & Sclerotinia Stem Rot',
    scientificName: 'Albugo candida / Sclerotinia sclerotiorum',
    tempMin: 12,
    tempMax: 20,
    criticalRh: 80,
    criticalHours: 8,
    advisory: 'Cool temperatures with morning fog create extended leaf wetness, stimulating zoospore infection.',
    preventiveAction: 'Ensure good air circulation; spray wettable sulfur (2 g/L) or mancozeb if lower leaves show white blister spots.'
  },
  chickpea: {
    diseaseName: 'Ascochyta Blight & Pod Borer',
    scientificName: 'Ascochyta rabiei / Helicoverpa armigera',
    tempMin: 15,
    tempMax: 24,
    criticalRh: 75,
    criticalHours: 8,
    advisory: 'Overcast skies and high morning humidity promote Ascochyta circular lesions and pod borer moth activity.',
    preventiveAction: 'Set up bird perches (T-perches) across the field and apply HaNPV (250 LE/ha) at early larval appearance.'
  },
  cotton: {
    diseaseName: 'Bacterial Blight & Sucking Pests',
    scientificName: 'Xanthomonas citri pv. malvacearum / Bemisia tabaci',
    tempMin: 25,
    tempMax: 34,
    criticalRh: 70,
    criticalHours: 8,
    advisory: 'Warm humid conditions favor whitefly population multiplication and angular leaf spot transmission.',
    preventiveAction: 'Scout leaf undersides; deploy yellow sticky traps (10/acre) and spray neem oil or flonicamid if ETL is crossed.'
  },
  tomato: {
    diseaseName: 'Late Blight & Early Blight',
    scientificName: 'Phytophthora infestans / Alternaria solani',
    tempMin: 15,
    tempMax: 24,
    criticalRh: 85,
    criticalHours: 8,
    advisory: 'Severe danger of Late Blight! Extended canopy wetness triggers rapid water-soaked lesions on foliage and fruit.',
    preventiveAction: 'Avoid overhead sprinkler watering to keep leaves dry. Spray copper oxychloride (3 g/L) or metalaxyl as a protective barrier.'
  },
  sugarcane: {
    diseaseName: 'Red Rot & Smut',
    scientificName: 'Colletotrichum falcatum / Sporisorium scitamineum',
    tempMin: 24,
    tempMax: 32,
    criticalRh: 85,
    criticalHours: 12,
    advisory: 'High humidity combined with waterlogged soil creates ideal entry pathways for red rot pathogen multiplication.',
    preventiveAction: 'Clean furrow drainage channels to avoid standing water; rogue out any clumps showing midrib reddening.'
  }
};

/**
 * Evaluates the next 72 hours of hourly microclimate forecast for infection risk.
 */
export function analyzePestAndDiseaseRisk({ weather, cropKey = 'wheat' }) {
  const profile = PEST_DISEASE_PROFILES[cropKey] || PEST_DISEASE_PROFILES.wheat;
  const crop = CROPS[cropKey] || CROPS.wheat;

  if (!weather || !weather.hourly) {
    return {
      level: 'Low',
      score: 15,
      diseaseName: profile.diseaseName,
      scientificName: profile.scientificName,
      consecutiveFavorableHours: 0,
      advisory: 'Weather signals are dry and calm; disease pressure is minimal.',
      preventiveAction: 'Standard weekly visual scouting recommended.',
      dataType: 'estimated'
    };
  }

  const h = weather.hourly;
  const now = Date.now();
  const hi = (h.time || []).findIndex((t) => new Date(t) >= new Date(now - 30 * 60000));
  const startIdx = hi < 0 ? 0 : hi;
  const endIdx = Math.min((h.time || []).length, startIdx + 72);

  let currentStreak = 0;
  let maxStreak = 0;
  let totalFavorableHours = 0;
  const favorableTemps = [];

  for (let i = startIdx; i < endIdx; i++) {
    const temp = h.temperature_2m?.[i] ?? 25;
    const rh = h.relative_humidity_2m?.[i] ?? 60;
    const rain = h.precipitation?.[i] ?? 0;

    const isTempFavorable = temp >= profile.tempMin && temp <= profile.tempMax;
    // High relative humidity or active precipitation creates surface leaf wetness
    const isLeafWet = rh >= profile.criticalRh || rain > 0.2;

    if (isTempFavorable && isLeafWet) {
      currentStreak++;
      totalFavorableHours++;
      favorableTemps.push(temp);
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // Calculate Disease Severity Index (DSI) from 0 to 100
  // Wallin DSI-inspired: streak weight (60%) + cumulative volume (40%)
  const streakScore = clamp((maxStreak / profile.criticalHours) * 50, 0, 60);
  const volumeScore = clamp((totalFavorableHours / (profile.criticalHours * 2.5)) * 40, 0, 40);
  const severityScore = Math.round(streakScore + volumeScore);

  let level = 'Low';
  if (severityScore >= 65 || maxStreak >= profile.criticalHours * 1.5) {
    level = 'High';
  } else if (severityScore >= 35 || maxStreak >= profile.criticalHours * 0.75) {
    level = 'Moderate';
  }

  return {
    level,
    score: severityScore,
    diseaseName: profile.diseaseName,
    scientificName: profile.scientificName,
    consecutiveFavorableHours: maxStreak,
    totalFavorableHours,
    meanTempDuringFavorable: favorableTemps.length ? Math.round(avg(favorableTemps)) : null,
    advisory: profile.advisory,
    preventiveAction: profile.preventiveAction,
    cropName: crop.name,
    dataType: 'estimated'
  };
}

