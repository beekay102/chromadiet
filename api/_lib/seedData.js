// =============================================================
// api/_lib/seedData.js
// Canonical demo seed recipes for Alice (high-variety) and Bob
// (gappy). Mirrors the recipes in sql/06_seed_demo_recalls.sql.
//
// Used by /api/admin.js when the admin clicks "Re-seed demos."
// If you change the SQL seed, change here too — or vice versa.
// (One way to keep them synced is to regenerate both from a
// single source; see scripts/generate-seed.mjs as a future task.)
// =============================================================

export const DEMO_ACCOUNTS = {
  alice: 'demo-alice@chromadiet.app',
  bob:   'demo-bob@chromadiet.app',
};

// Each day's entries are processed in order: meal_occasion preserves order
// of insertion, so display_order is just the array index.
export const ALICE_DAYS = [
  // Day 1 — Berries + tea + greens + soy → score 95
  [
    { foodId:'blueberry',  portionG:80,  meal:'Breakfast' },
    { foodId:'oats',       portionG:50,  meal:'Breakfast' },
    { foodId:'green_tea',  portionG:240, meal:'Breakfast' },
    { foodId:'kale',       portionG:75,  meal:'Lunch' },
    { foodId:'red_onion',  portionG:30,  meal:'Lunch' },
    { foodId:'tofu',       portionG:120, meal:'Lunch' },
    { foodId:'walnuts',    portionG:20,  meal:'Snack' },
    { foodId:'orange',     portionG:130, meal:'Snack' },
    { foodId:'salmon',     portionG:140, meal:'Dinner' },
    { foodId:'broccoli',   portionG:80,  meal:'Dinner' },
    { foodId:'red_grape',  portionG:80,  meal:'Dinner' },
  ],
  // Day 2 — Variety with citrus + soy + chocolate → score 95
  [
    { foodId:'strawberry',     portionG:100, meal:'Breakfast' },
    { foodId:'whole_wheat',    portionG:60,  meal:'Breakfast' },
    { foodId:'soymilk',        portionG:240, meal:'Breakfast' },
    { foodId:'spinach',        portionG:90,  meal:'Lunch' },
    { foodId:'chicken',        portionG:120, meal:'Lunch' },
    { foodId:'almonds',        portionG:25,  meal:'Snack' },
    { foodId:'grapefruit',     portionG:150, meal:'Snack' },
    { foodId:'red_cabbage',    portionG:80,  meal:'Dinner' },
    { foodId:'edamame',        portionG:80,  meal:'Dinner' },
    { foodId:'dark_chocolate', portionG:25,  meal:'Dinner' },
  ],
  // Day 3 — Berries + parsley/celery (flavones) + tea → score 87
  [
    { foodId:'raspberry',   portionG:100, meal:'Breakfast' },
    { foodId:'oats',        portionG:60,  meal:'Breakfast' },
    { foodId:'parsley',     portionG:10,  meal:'Lunch' },
    { foodId:'tomato',      portionG:100, meal:'Lunch' },
    { foodId:'celery',      portionG:60,  meal:'Lunch' },
    { foodId:'apple',       portionG:150, meal:'Snack' },
    { foodId:'black_tea',   portionG:240, meal:'Snack' },
    { foodId:'eggplant',    portionG:120, meal:'Dinner' },
    { foodId:'avocado',     portionG:50,  meal:'Dinner' },
    { foodId:'pomegranate', portionG:80,  meal:'Dinner' },
  ],
];

export const BOB_DAYS = [
  // Day 1 — Very limited, mostly carbs/protein → score 16
  [
    { foodId:'whole_wheat', portionG:80,  meal:'Breakfast' },
    { foodId:'chicken',     portionG:120, meal:'Lunch' },
    { foodId:'brown_rice',  portionG:150, meal:'Dinner' },
  ],
  // Day 2 — Slightly better, banana + onion → score 33
  [
    { foodId:'banana',       portionG:120, meal:'Breakfast' },
    { foodId:'whole_wheat',  portionG:60,  meal:'Lunch' },
    { foodId:'yellow_onion', portionG:40,  meal:'Lunch' },
    { foodId:'salmon',       portionG:120, meal:'Dinner' },
  ],
  // Day 3 — Same gappy pattern → score 19
  [
    { foodId:'banana',     portionG:100, meal:'Breakfast' },
    { foodId:'oats',       portionG:50,  meal:'Breakfast' },
    { foodId:'chicken',    portionG:120, meal:'Dinner' },
    { foodId:'brown_rice', portionG:120, meal:'Dinner' },
  ],
];

/**
 * Build an array of three day timestamps relative to now (in UTC):
 *   2 days ago, 1 day ago, today, all at 19:30 UTC.
 * Returns [{ recallDate: 'YYYY-MM-DD', submittedAt: ISO8601 }, ...].
 */
export function buildDemoDates() {
  const dates = [];
  for (let daysAgo = 2; daysAgo >= 0; daysAgo--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(19, 30, 0, 0);
    dates.push({
      recallDate:  d.toISOString().slice(0, 10),
      submittedAt: d.toISOString(),
    });
  }
  return dates;
}
