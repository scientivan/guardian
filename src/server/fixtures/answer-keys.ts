// Answer keys written by hand from the fixture design, before any LLM run.
// Money in fen. Arithmetic shown so a reviewer can check it without code.

export const D2_KEY = {
  itemCount: 40,
  // room 7,500 = (1,200 + 180 + 120) x 5
  // procedure 25,450 = 18,000 + 4,500 + 2,500 + 3 x 150
  // other 350 = 50 + 5 x 60
  // drug 1,702 = 450 + 300 + 40 + 190 + 100 + 120 + 120 + 112 + 140 + 30 + 84 + 16
  // lab 1,150 = 60 + 60 + 80 + 90 + 120 + 100 + 110 + 380 + 150
  // consumable 630 = 75 + 75 + 40 + 60 + 75 + 40 + 60 + 45 + 60 + 100
  byCategory: { room: 750_000, procedure: 2_545_000, other: 35_000, drug: 170_200, lab: 115_000, consumable: 63_000 },
  total: 3_678_200, // CNY 36,782 = 7,500 + 25,450 + 350 + 1,702 + 1,150 + 630
  overHigh: 278_200, // 36,782 - 34,000
  causes: [
    { kind: "longer_stay", extraDays: 2, amount: 300_000 }, // 2 days x CNY 1,500
    { kind: "category_over", category: "procedure", amount: 45_000 }, // 25,450 - 25,000
    { kind: "category_over", category: "drug", amount: 20_200 }, // 1,702 - 1,500
    { kind: "not_in_estimate", category: "other", amount: 35_000 },
    { kind: "not_in_estimate", category: "consumable", amount: 63_000 },
  ],
  // Room overrun is fully explained by the longer stay: no room category_over.
  // Lab is under estimate by CNY 50, so no lab cause.
  // Check: causes 4,632 - lab under 50 = 4,582 = 36,782 - 32,200 (sum of estimate categories).
  duplicates: ["Complete blood count"],
  basicItems: ["Pillow case", "Alcohol swab", "Disposable gloves (pair)", "Bed sheet change"],
  aboveReference: ["Ceftriaxone 1g injection"],
  statedReasons: ["antibiotic course extended to 5 days"],
  // The documents state no clinical cause for the longer stay. An explanation
  // that names one (e.g. "infection", "complication") is wrong.
  forbiddenClaims: [/infection/i, /complication/i, /sepsis/i, /abscess/i, /perforat/i],
};

export const D5_KEY = {
  finalTotal: 7_100_000,
  deposits: 8_000_000,
  refund: 900_000, // 80,000 - 71,000
};
