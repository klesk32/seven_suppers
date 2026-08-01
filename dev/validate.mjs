// Catalog invariant checks for seven-suppers.jsx: unit and category consistency,
// dietary rules, thermometer doneness cues, and grocery-list shoppability
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VERSION = "0.3.0";
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
const TAGS = new Set(["chicken", "turkey", "veggie", "vegan", "pasta", "soup", "fast"]);
MEALS.forEach((m) => {
  if (m.steps.length < 5 || m.steps.length > 7) fail(`${m.id} has ${m.steps.length} steps`);
  if (typeof m.time !== "number") fail(`${m.id} bad time`);
  m.tags.forEach((t) => { if (!TAGS.has(t)) fail(`${m.id} unknown tag ${t}`); });
  m.ing.forEach((i) => {
    if (!CATS.has(i.c)) fail(`${m.id} bad category ${i.c}`);
    if (typeof i.q !== "number" || i.q <= 0) fail(`${m.id} bad qty for ${i.n}`);
    if (i.u !== i.u.toLowerCase() && i.u !== "") fail(`${m.id} unit not lowercase: ${i.u}`);
  });
});

// 5. tag rules: fast <= 25 min, vegan implies veggie and no animal products
const ANIMAL = /chicken|turkey|egg|yogurt|cheddar|parmesan|cream cheese|butter|honey|milk/i;
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
  if (m.tags.includes("veggie") && m.ing.some((i) => /chicken thigh|tenderloin|ground turkey/.test(i.n))) {
    fail(`${m.id} veggie but has meat`);
  }
});

// 6. gout rules
const BANNED = /beef|pork|bacon|sausage|lamb|veal|liver|shrimp|crab|lobster|scallop|anchov|sardine|mussel|clam|oyster|worcestershire/i;
MEALS.forEach((m) => m.ing.forEach((i) => { if (BANNED.test(i.n)) fail(`${m.id} banned ingredient ${i.n}`); }));

// 7. every poultry recipe ends its cooking with a temp read, and nothing says "no pink"
MEALS.forEach((m) => {
  const text = m.steps.join(" ");
  if (/no pink|until no pink|check for pink/i.test(text)) fail(`${m.id} still uses a pinkness check`);
  const hasPoultry = m.ing.some((i) => /chicken|turkey/.test(i.n) && i.c === "protein");
  if (hasPoultry && !/165 F/.test(text)) fail(`${m.id} has poultry but no 165 F check`);
  if (hasPoultry && !/instant-read thermometer/.test(text)) fail(`${m.id} has poultry but no thermometer`);
});

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
