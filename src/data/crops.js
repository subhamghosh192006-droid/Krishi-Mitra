/**
 * Krishi Mitra — Crop Database
 * Agronomically validated parameters based on FAO-56 (Allen et al., 1998)
 * and Indian Council of Agricultural Research (ICAR / IARI) recommendations.
 */

export const CROPS = {
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    hi: 'गेहूँ',
    em: '🌾',
    base: 0,
    upperTemp: 35,
    root: 1.2,
    rootMin: 0.20,
    rootMax: 1.20,
    kcIni: 0.35,
    kcMid: 1.15,
    kcEnd: 0.40,
    depletionFraction: 0.55, // FAO-56 depletion factor p
    need: 450, // Seasonal water requirement (mm)
    months: [10, 11], // Optimal sowing months (Oct, Nov)
    profit: 24575, // Base profit in INR/acre
    dur: 125, // Duration in days
    risk: 'Low',
    ideal: [15, 25], // Optimal temperature range in °C
    s: [
      ['Sowing', 0],
      ['Germination', 120],
      ['Tillering', 420],
      ['Jointing', 760],
      ['Heading', 1180],
      ['Grain fill', 1420],
      ['Maturity', 1720]
    ],
    soil: { alluvial: 0.95, black: 0.70, red: 0.55, sandy: 0.55, laterite: 0.40, clay: 0.70 }
  },
  rice: {
    id: 'rice',
    name: 'Rice',
    hi: 'धान',
    em: '🌾',
    base: 10,
    upperTemp: 38,
    root: 0.9,
    rootMin: 0.15,
    rootMax: 0.90,
    kcIni: 1.05,
    kcMid: 1.20,
    kcEnd: 0.90,
    depletionFraction: 0.20, // High sensitivity to water stress in paddy
    need: 1200,
    months: [6, 7],
    profit: 22600,
    dur: 140,
    risk: 'Medium',
    ideal: [24, 32],
    s: [
      ['Transplanting', 0],
      ['Tillering', 300],
      ['Panicle initiation', 700],
      ['Heading', 1200],
      ['Grain fill', 1500],
      ['Maturity', 1900]
    ],
    soil: { alluvial: 0.95, black: 0.60, red: 0.60, sandy: 0.30, laterite: 0.80, clay: 0.90 }
  },
  maize: {
    id: 'maize',
    name: 'Maize',
    hi: 'मक्का',
    em: '🌽',
    base: 10,
    upperTemp: 36,
    root: 1.1,
    rootMin: 0.20,
    rootMax: 1.10,
    kcIni: 0.40,
    kcMid: 1.15,
    kcEnd: 0.60,
    depletionFraction: 0.50,
    need: 500,
    months: [6, 7, 10, 11],
    profit: 29800,
    dur: 100,
    risk: 'Medium',
    ideal: [20, 30],
    s: [
      ['Emergence', 0],
      ['V6 stage', 380],
      ['Tasseling', 750],
      ['Silking', 900],
      ['Grain fill', 1300],
      ['Maturity', 1700]
    ],
    soil: { alluvial: 0.85, black: 0.80, red: 0.80, sandy: 0.60, laterite: 0.75, clay: 0.75 }
  },
  mustard: {
    id: 'mustard',
    name: 'Mustard',
    hi: 'सरसों',
    em: '🌼',
    base: 5,
    upperTemp: 32,
    root: 1.0,
    rootMin: 0.15,
    rootMax: 1.00,
    kcIni: 0.35,
    kcMid: 1.05,
    kcEnd: 0.35,
    depletionFraction: 0.50,
    need: 280,
    months: [9, 10],
    profit: 30600,
    dur: 110,
    risk: 'Low',
    ideal: [15, 25],
    s: [
      ['Sowing', 0],
      ['Rosette', 260],
      ['Bolting', 450],
      ['Flowering', 650],
      ['Pod fill', 950],
      ['Maturity', 1250]
    ],
    soil: { alluvial: 0.80, black: 0.60, red: 0.60, sandy: 0.85, laterite: 0.50, clay: 0.55 }
  },
  chickpea: {
    id: 'chickpea',
    name: 'Chickpea',
    hi: 'चना',
    em: '🫘',
    base: 5,
    upperTemp: 32,
    root: 1.0,
    rootMin: 0.15,
    rootMax: 1.00,
    kcIni: 0.40,
    kcMid: 1.00,
    kcEnd: 0.35,
    depletionFraction: 0.50,
    need: 250,
    months: [10, 11],
    profit: 24050,
    dur: 115,
    risk: 'Low',
    ideal: [18, 28],
    s: [
      ['Sowing', 0],
      ['Vegetative', 400],
      ['Flowering', 700],
      ['Podding', 1000],
      ['Maturity', 1400]
    ],
    soil: { alluvial: 0.75, black: 0.90, red: 0.80, sandy: 0.80, laterite: 0.60, clay: 0.65 }
  },
  cotton: {
    id: 'cotton',
    name: 'Cotton',
    hi: 'कपास',
    em: '🌿',
    base: 15,
    upperTemp: 38,
    root: 1.3,
    rootMin: 0.25,
    rootMax: 1.30,
    kcIni: 0.35,
    kcMid: 1.20,
    kcEnd: 0.65,
    depletionFraction: 0.60,
    need: 700,
    months: [5, 6],
    profit: 14226,
    dur: 180,
    risk: 'High',
    ideal: [25, 35],
    s: [
      ['Emergence', 0],
      ['Squaring', 500],
      ['Flowering', 900],
      ['Boll development', 1400],
      ['Maturity', 2300]
    ],
    soil: { alluvial: 0.65, black: 0.95, red: 0.70, sandy: 0.50, laterite: 0.60, clay: 0.70 }
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    hi: 'टमाटर',
    em: '🍅',
    base: 10,
    upperTemp: 35,
    root: 0.8,
    rootMin: 0.15,
    rootMax: 0.80,
    kcIni: 0.60,
    kcMid: 1.15,
    kcEnd: 0.80,
    depletionFraction: 0.40,
    need: 600,
    months: [1, 2, 6, 7, 9, 10],
    profit: 82000,
    dur: 120,
    risk: 'High',
    ideal: [20, 28],
    s: [
      ['Transplanting', 0],
      ['Vegetative', 250],
      ['Flowering', 500],
      ['Fruit set', 800],
      ['Harvest', 1200],
      ['End of crop', 1500]
    ],
    soil: { alluvial: 0.80, black: 0.70, red: 0.85, sandy: 0.70, laterite: 0.80, clay: 0.65 }
  },
  sugarcane: {
    id: 'sugarcane',
    name: 'Sugarcane',
    hi: 'गन्ना',
    em: '🎋',
    base: 12,
    upperTemp: 40,
    root: 1.5,
    rootMin: 0.25,
    rootMax: 1.50,
    kcIni: 0.40,
    kcMid: 1.25,
    kcEnd: 0.75,
    depletionFraction: 0.65,
    need: 1800,
    months: [2, 3, 10, 11],
    profit: 51600,
    dur: 365,
    risk: 'Medium',
    ideal: [26, 35],
    s: [
      ['Germination', 0],
      ['Tillering', 800],
      ['Grand growth', 2400],
      ['Ripening', 4200],
      ['Maturity', 5000]
    ],
    soil: { alluvial: 0.90, black: 0.70, red: 0.60, sandy: 0.35, laterite: 0.70, clay: 0.85 }
  }
};

