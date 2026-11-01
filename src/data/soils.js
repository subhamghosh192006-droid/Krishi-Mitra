/**
 * Krishi Mitra — Soil Database
 * Agronomically validated parameters based on ICAR Soil Survey of India
 * and FAO-56 Irrigation and Drainage guidelines.
 */

export const SOILS = {
  alluvial: {
    id: 'alluvial',
    name: 'Alluvial loam',
    texture: 'Silt loam',
    ph: 7.2,
    om: '0.7%',
    drain: 'Good',
    hold: 'High',
    fc: 0.36,
    wp: 0.16,
    tawPerMeter: 200, // (0.36 - 0.16) * 1000 = 200 mm/m
    color: 'linear-gradient(160deg,#c8a978,#9d7c4e)',
    note: 'Deep, fertile Indo-Gangetic soil. Holds water well and responds to balanced NPK.'
  },
  black: {
    id: 'black',
    name: 'Black cotton soil',
    texture: 'Clay',
    ph: 7.8,
    om: '0.6%',
    drain: 'Moderate',
    hold: 'Very high',
    fc: 0.42,
    wp: 0.20,
    tawPerMeter: 220, // (0.42 - 0.20) * 1000 = 220 mm/m
    color: 'linear-gradient(160deg,#5a554a,#2f2c26)',
    note: 'High shrink-swell montmorillonite clay with strong moisture retention. Avoid tillage when saturated.'
  },
  red: {
    id: 'red',
    name: 'Red loam',
    texture: 'Sandy loam',
    ph: 6.3,
    om: '0.45%',
    drain: 'Good',
    hold: 'Medium',
    fc: 0.30,
    wp: 0.13,
    tawPerMeter: 170, // (0.30 - 0.13) * 1000 = 170 mm/m
    color: 'linear-gradient(160deg,#b2694b,#8a4530)',
    note: 'Well drained and slightly acidic. Benefits from organic matter and regular light irrigation.'
  },
  sandy: {
    id: 'sandy',
    name: 'Sandy loam',
    texture: 'Sandy',
    ph: 7.6,
    om: '0.3%',
    drain: 'Very fast',
    hold: 'Low',
    fc: 0.22,
    wp: 0.08,
    tawPerMeter: 140, // (0.22 - 0.08) * 1000 = 140 mm/m
    color: 'linear-gradient(160deg,#d8bd8d,#b39463)',
    note: 'Drains quickly with low retention. Frequent small irrigations outperform deep flooding.'
  },
  laterite: {
    id: 'laterite',
    name: 'Laterite',
    texture: 'Clay loam',
    ph: 5.8,
    om: '0.5%',
    drain: 'Moderate',
    hold: 'Medium',
    fc: 0.32,
    wp: 0.16,
    tawPerMeter: 160, // (0.32 - 0.16) * 1000 = 160 mm/m
    color: 'linear-gradient(160deg,#a06a45,#7a4a2d)',
    note: 'Iron-rich and acidic. Agricultural lime plus compost lifts nutrient availability.'
  },
  clay: {
    id: 'clay',
    name: 'Clay loam',
    texture: 'Clay loam',
    ph: 7.0,
    om: '0.8%',
    drain: 'Slow',
    hold: 'High',
    fc: 0.40,
    wp: 0.19,
    tawPerMeter: 210, // (0.40 - 0.19) * 1000 = 210 mm/m
    color: 'linear-gradient(160deg,#8a7658,#655442)',
    note: 'Holds water and nutrients firmly; monitor drainage closely to prevent root hypoxia after heavy rains.'
  }
};

