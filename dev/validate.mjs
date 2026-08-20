// Catalog invariant checks for seven-suppers.jsx: unit and category consistency,
// dietary rules, thermometer doneness cues, and grocery-list shoppability
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VERSION = "0.6.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = readFileSync(join(ROOT, "seven-suppers.jsx"), "utf8");

function slice(startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error("missing " + startMarker);
  const j = src.indexOf(endMarker, i);
  return src.slice(i + startMarker.length, j);
}

const MEALS = eval("[" + slice("const MEALS = [", "\n];") + "]");
const STAPLES = new Set(eval("[" + slice("const STAPLES = new Set([", "\n]);") + "]"));
const PACKS = eval("({" + slice("const PACKS = {", "\n};") + "})");
const DISCRETE = new Set(eval("[" + slice("const DISCRETE_UNITS = new Set([", "]);") + "]"));
const SIZES = eval("({" + slice("const SIZES = {", "\n};") + "})");

let fails = 0;
const fail = (m) => { console.log("FAIL " + m); fails++; };

// 1. unique ids
const ids = new Set();
MEALS.forEach((m) => { if (ids.has(m.id)) fail(`duplicate id ${m.id}`); ids.add(m.id); });

// 2. one canonical unit per ingredient name
const units = new Map();
MEALS.forEach((m) => m.ing.forEach((i) => {
  if (!units.has(i.n)) units.set(i.n, new Map());
  units.get(i.n).set(i.u, (units.get(i.n).get(i.u) || 0) + 1);
}));
[...units].forEach(([n, u]) => { if (u.size > 1) fail(`${n} has units ${[...u.keys()].join(" / ")}`); });

// 3. one canonical category per ingredient name
const cats = new Map();
MEALS.forEach((m) => m.ing.forEach((i) => {
  if (!cats.has(i.n)) cats.set(i.n, new Set());
  cats.get(i.n).add(i.c);
}));
[...cats].forEach(([n, c]) => { if (c.size > 1) fail(`${n} in categories ${[...c].join(" / ")}`); });

// 4. shape and step count
const CATS = new Set(["produce", "protein", "dairy", "grains", "pantry"]);
const TAGS = new Set(["chicken", "turkey", "beef", "pork", "fish", "veggie", "vegan", "pasta", "soup", "fast"]);
MEALS.forEach((m) => {
  if (m.steps.length < 5 || m.steps.length > 7) fail(`${m.id} has ${m.steps.length} steps`);
  if (typeof m.time !== "number") fail(`${m.id} bad time`);
  if (typeof m.spice !== "string" || !m.spice.trim()) fail(`${m.id} has no spice note`);
  m.tags.forEach((t) => { if (!TAGS.has(t)) fail(`${m.id} unknown tag ${t}`); });
  m.ing.forEach((i) => {
    if (!CATS.has(i.c)) fail(`${m.id} bad category ${i.c}`);
    if (typeof i.q !== "number" || i.q <= 0) fail(`${m.id} bad qty for ${i.n}`);
    if (i.u !== i.u.toLowerCase() && i.u !== "") fail(`${m.id} unit not lowercase: ${i.u}`);
  });
});

// 5. tag rules: fast <= 25 min, vegan implies veggie and no animal products
const ANIMAL = /chicken|turkey|beef|steak|pork|salmon|cod\b|tilapia|tuna|\bfish\b|egg|yogurt|cheddar|parmesan|cream cheese|butter|honey|milk/i;
// Plant items whose names collide with the animal-product words above
const VEGAN_OK = new Set(["light coconut milk", "creamy peanut butter", "frozen shelled edamame"]);
MEALS.forEach((m) => {
  const fast = m.tags.includes("fast");
  if (fast && m.time > 25) fail(`${m.id} tagged fast but ${m.time} min`);
  if (!fast && m.time <= 25) fail(`${m.id} is ${m.time} min but not tagged fast`);
  if (m.tags.includes("vegan")) {
    if (!m.tags.includes("veggie")) fail(`${m.id} vegan without veggie`);
    m.ing.forEach((i) => {
      if (VEGAN_OK.has(i.n)) return;
      if (ANIMAL.test(i.n)) fail(`${m.id} vegan but contains ${i.n}`);
    });
  }
  if (m.tags.includes("veggie") && m.ing.some((i) => /chicken thigh|tenderloin|ground turkey|beef|steak|pork|salmon|cod\b|tilapia|tuna|\bfish\b/.test(i.n))) {
    fail(`${m.id} veggie but has meat or fish`);
  }
});

// 6. dietary rules, per protein scope. Organ meats, high-purine seafood,
// processed meats, and untagged red meat stay banned everywhere: beef, pork,
// and fish are allowed only in meals that carry the matching tag, so every
// profile filter can trust the tags. Meals without those tags must satisfy
// the original gout rules.
const GLOBAL_BANNED = /bacon|sausage|ham\b|hot dog|deli|lamb|veal|liver|kidney|shrimp|crab|lobster|scallop|anchov|sardine|mussel|clam|oyster|worcestershire/i;
const BEEF = /beef|steak|chuck|sirloin|brisket/i;
const PORK = /\bpork/i;
const FISH = /salmon|cod\b|tilapia|tuna|halibut|trout|\bfish\b/i;
MEALS.forEach((m) => m.ing.forEach((i) => {
  if (GLOBAL_BANNED.test(i.n)) fail(`${m.id} banned ingredient ${i.n}`);
  if (BEEF.test(i.n) && !m.tags.includes("beef")) fail(`${m.id} has beef (${i.n}) without the beef tag`);
  if (PORK.test(i.n) && !m.tags.includes("pork")) fail(`${m.id} has pork (${i.n}) without the pork tag`);
  if (FISH.test(i.n) && !m.tags.includes("fish")) fail(`${m.id} has fish (${i.n}) without the fish tag`);
}));

// 6b. the tags must be earned, too: a meal tagged beef/pork/fish without the
// ingredient would dodge quota ceilings and profile filters
MEALS.forEach((m) => {
  if (m.tags.includes("beef") && !m.ing.some((i) => BEEF.test(i.n) && i.c === "protein")) fail(`${m.id} tagged beef with no beef protein`);
  if (m.tags.includes("pork") && !m.ing.some((i) => PORK.test(i.n) && i.c === "protein")) fail(`${m.id} tagged pork with no pork protein`);
  if (m.tags.includes("fish") && !m.ing.some((i) => FISH.test(i.n) && i.c === "protein")) fail(`${m.id} tagged fish with no fish protein`);
});

// 7. every meat or fish recipe ends its cooking with a temp read, and nothing
// says "no pink": 165 F for all poultry, 160 F for ground beef and pork,
// 145 F plus a rest for whole beef and pork cuts, 145 F for fish (USDA)
MEALS.forEach((m) => {
  const text = m.steps.join(" ");
  if (/no pink|until no pink|check for pink/i.test(text)) fail(`${m.id} still uses a pinkness check`);
  const protein = (re) => m.ing.some((i) => re.test(i.n) && i.c === "protein");
  const ground = (re) => m.ing.some((i) => re.test(i.n) && /ground/.test(i.n) && i.c === "protein");
  const needsTemp = [];
  if (protein(/chicken|turkey/)) needsTemp.push("165 F");
  if (ground(BEEF) || ground(PORK)) needsTemp.push("160 F");
  if ((protein(BEEF) && !ground(BEEF)) || (protein(PORK) && !ground(PORK))) needsTemp.push("145 F");
  // Canned fish is precooked, so tuna patties need browning, not a temp
  if (m.ing.some((i) => FISH.test(i.n) && !/canned/.test(i.n) && i.c === "protein")) needsTemp.push("145 F");
  needsTemp.forEach((t) => { if (!text.includes(t)) fail(`${m.id} needs a ${t} check`); });
  if (needsTemp.length > 0 && !/instant-read thermometer/.test(text)) fail(`${m.id} cooks meat or fish but has no thermometer`);
  if ((protein(BEEF) && !ground(BEEF)) || (protein(PORK) && !ground(PORK))) {
    if (!/rest/i.test(text)) fail(`${m.id} has a whole beef/pork cut but no rest after cooking`);
  }
});

// 7c. profile pools must be able to fill a week, and the heart-healthy
// default must be able to hit its fish target (once fish meals exist)
const pool = (f) => MEALS.filter(f).length;
if (pool((m) => m.tags.includes("veggie")) < 7) fail("vegetarian pool under 7 meals");
if (pool((m) => m.tags.includes("vegan")) < 7) fail("vegan pool under 7 meals");
if (pool((m) => !m.tags.some((t) => ["beef", "pork", "fish"].includes(t))) < 7) fail("gout pool under 7 meals");
if (MEALS.some((m) => m.tags.includes("fish")) && pool((m) => m.tags.includes("fish")) < 2) {
  fail("fish meals exist but fewer than the heart-healthy weekly target of 2");
}

// 7b. steps must scale: ingredient references may not bake in base-batch
// package counts or piece counts, since the ingredient list scales and the
// steps do not ("the whole can" is wrong at 2 servings)
const UNSCALED = /whole (can|jar|bag|block)\b|both cans|\b\d+ shallow wells|into \d+ (patties|balls)/i;
MEALS.forEach((m) => m.steps.forEach((s) => {
  if (UNSCALED.test(s)) fail(`${m.id} has non-scaling step wording: "${s.match(UNSCALED)[0]}"`);
}));

// 8. non-staple, non-discrete measured items should have a PACKS entry or be sold that way
const SELF_SHOPPABLE = new Set(["lb", "oz", "", "bunch"]);
MEALS.forEach((m) => m.ing.forEach((i) => {
  if (STAPLES.has(i.n) || PACKS[i.n] || DISCRETE.has(i.u) || SELF_SHOPPABLE.has(i.u)) return;
  if (["tsp", "tbsp"].includes(i.u)) return fail(`${m.id}: ${i.n} measured in ${i.u} but is not a staple`);
  fail(`${m.id}: ${i.n} (${i.u}) has no PACKS entry and is not directly shoppable`);
}));

// 9. packaged goods must declare an expected size, so two shelf sizes are
// never ambiguous; natural units (head, loaf, bunch, bottle) are exempt
const SIZED_UNITS = new Set(["jar", "can", "packet", "block", "bag"]);
MEALS.forEach((m) => m.ing.forEach((i) => {
  if (SIZED_UNITS.has(i.u) && !SIZES[i.n] && !PACKS[i.n]) {
    fail(`${m.id}: ${i.n} (${i.u}) has no SIZES entry`);
  }
}));

// 9b. share-link fields: every meal declares the version it was added in,
// no later than the current APP_VERSION, and every version number fits the
// slug's one byte per component; the catalog must stay under 255 meals so
// indexes fit a byte with 255 reserved for empty days. (The other half of
// the link contract, that shipped meals are never removed or reordered
// relative to each other, cannot be checked from a single snapshot.)
const APP_VERSION = slice('const APP_VERSION = "', '";');
MEALS.forEach((m) => {
  if (!/^\d+\.\d+\.\d+$/.test(m.v || "")) return fail(`${m.id} has no added-in version (v)`);
  const parts = m.v.split(".").map(Number);
  if (parts.some((n) => n > 255)) fail(`${m.id} version component over 255: ${m.v}`);
  const app = APP_VERSION.split(".").map(Number);
  const newer = parts[0] !== app[0] ? parts[0] > app[0] : parts[1] !== app[1] ? parts[1] > app[1] : parts[2] > app[2];
  if (newer) fail(`${m.id} added-in version ${m.v} is newer than APP_VERSION ${APP_VERSION}`);
});
if (MEALS.length >= 255) fail(`catalog has ${MEALS.length} meals; slug indexes only fit 254`);

// 10. PACKS / STAPLES / SIZES entries that no recipe uses
const allNames = new Set([...units.keys()]);
Object.keys(PACKS).forEach((n) => { if (!allNames.has(n)) console.log(`note: PACKS has unused "${n}"`); });
[...STAPLES].forEach((n) => { if (!allNames.has(n)) console.log(`note: STAPLES has unused "${n}"`); });
Object.keys(SIZES).forEach((n) => { if (!allNames.has(n)) console.log(`note: SIZES has unused "${n}"`); });

// summary
const count = (t) => MEALS.filter((m) => m.tags.includes(t)).length;
console.log(`\n${MEALS.length} meals: chicken ${count("chicken")}, turkey ${count("turkey")}, veggie ${count("veggie")}, vegan ${count("vegan")}, pasta ${count("pasta")}, soup ${count("soup")}, fast ${count("fast")}`);
console.log(`${allNames.size} distinct ingredients, ${Object.keys(PACKS).length} pack rules, ${STAPLES.size} staples`);
console.log(fails === 0 ? "\nAll catalog checks passed." : `\n${fails} failures.`);
process.exit(fails === 0 ? 0 : 1);
