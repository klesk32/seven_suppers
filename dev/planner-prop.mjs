// Property-style tests for the planner engine: thousands of randomized
// profile / filter / locked-week states pushed through fillWeek and
// rerollDay, asserting the invariants that hand-picked scenarios miss:
// kept meals survive, no duplicates, auto-picks stay inside the pool,
// hard ceilings never break, best-effort targets are met when they are
// meetable, and days go empty only when the pool is truly exhausted.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VERSION = "0.1.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "seven-suppers.jsx"), "utf8");

function grab(startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error("missing " + startMarker);
  const j = src.indexOf(endMarker, i);
  if (j < 0) throw new Error("unterminated " + startMarker);
  return src.slice(i, j + endMarker.length);
}

const code = [
  grab('const DEFAULT_PROFILE = ', ";"),
  grab("const RED_MEAT_TAGS = ", ";"),
  grab("const GOUT_EXCLUDED_TAGS = ", ";"),
  grab("const MEALS = [", "\n];"),
  grab("const PROFILE_ALLOWS = {", "\n};"),
  grab("function profileAllows(", "\n}"),
  grab("const PROFILE_QUOTAS = {", "\n};"),
  grab("function shuffleMeals(", "\n}"),
  grab("const mealById = ", ";"),
  grab("function fillWeek(", "\n}"),
  grab("function rerollDay(", "\n}"),
].join("\n");
const api = new Function(code +
  "\nreturn { MEALS, PROFILE_QUOTAS, profileAllows, shuffleMeals, mealById, fillWeek, rerollDay };")();
const { MEALS, PROFILE_QUOTAS, profileAllows, shuffleMeals, mealById, fillWeek, rerollDay } = api;

// Deterministic PRNG so a failure reproduces (shuffleMeals uses Math.random)
let seed = 20260820;
Math.random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];

const PROFILE_IDS = ["heart", "all", "gout", "pesc", "veggie", "vegan"];
const ITERATIONS = 3000;
let fails = 0;
const fail = (iter, msg) => { if (fails < 10) console.log(`FAIL iter ${iter}: ${msg}`); fails++; };

for (let iter = 0; iter < ITERATIONS; iter++) {
  const profile = pick(PROFILE_IDS);
  const quotas = PROFILE_QUOTAS[profile] || null;
  const profileMeals = MEALS.filter((m) => profileAllows(profile, m));

  // Random shuffle filters, stacked like the UI stacks them
  const timeF = Math.random() < 0.4 ? 35 : null;
  const noSoups = Math.random() < 0.4;
  const diet = pick(["all", "all", "veggie", "vegan"]);
  const pool = profileMeals.filter((m) =>
    (timeF === null || m.time <= timeF) &&
    (diet === "all" || m.tags.includes(diet)) &&
    (!noSoups || !m.tags.includes("soup")));

  // Random kept days (locks and hand-picks; may deliberately exceed ceilings)
  const kept = Array(7).fill(null);
  const handPool = shuffleMeals(profileMeals);
  const keptCount = randInt(8);
  for (let i = 0; i < Math.min(keptCount, handPool.length); i++) kept[randInt(7)] = handPool[i].id;
  const usedIds = new Set(kept.filter(Boolean));

  const avoid = new Set(shuffleMeals(MEALS).slice(0, randInt(8)).map((m) => m.id));
  const candidates = shuffleMeals(pool.filter((m) => !usedIds.has(m.id)));
  const next = fillWeek(kept, candidates, quotas);

  const ids = next.filter(Boolean);
  const poolIds = new Set(pool.map((m) => m.id));
  const count = (week, test) => week.filter((id) => id && test(mealById(id))).length;

  // Kept meals survive in place
  kept.forEach((id, i) => { if (id && next[i] !== id) fail(iter, `kept day ${i} replaced`); });
  // No duplicates
  if (new Set(ids).size !== ids.length) fail(iter, "duplicate meals in week");
  // Auto-picks come only from the filtered pool
  next.forEach((id, i) => {
    if (id && !kept[i] && !poolIds.has(id)) fail(iter, `auto pick ${id} outside pool (${profile})`);
  });
  // Hard ceilings: never exceeded by auto-picks (hand-picks may already breach)
  ((quotas && quotas.ceilings) || []).forEach((c) => {
    const total = count(next, c.test);
    if (total > Math.max(count(kept, c.test), c.max)) fail(iter, `ceiling broken: ${c.label} = ${total}`);
  });
  // Best-effort targets: met whenever the pool and empty days made it possible
  ((quotas && quotas.targets) || []).forEach((t) => {
    const had = count(kept, t.test);
    const empties = kept.filter((id) => !id).length;
    const inPool = candidates.filter(t.test).length;
    const reachable = Math.min(t.want, had + empties, had + inPool);
    if (count(next, t.test) < reachable) fail(iter, `target missed: ${t.label} ${count(next, t.test)} < ${reachable}`);
  });
  // Empty days only when the pool is truly exhausted for the remaining slots
  if (next.some((id) => !id)) {
    const finalIds = new Set(ids);
    const fits = (m) => ((quotas && quotas.ceilings) || []).every((c) => !c.test(m) || count(next, c.test) < c.max);
    const leftovers = candidates.filter((m) => !finalIds.has(m.id) && fits(m));
    if (leftovers.length > 0) fail(iter, `left ${leftovers.length} usable meals unplaced`);
  }

  // Reroll: replacement respects pool, uniqueness, and ceilings
  const day = randInt(7);
  const rerolled = rerollDay(next, day, avoid, pool, quotas);
  rerolled.forEach((id, i) => { if (i !== day && id !== next[i]) fail(iter, "reroll touched another day"); });
  const rIds = rerolled.filter(Boolean);
  if (new Set(rIds).size !== rIds.length) fail(iter, "reroll made a duplicate");
  if (rerolled[day] !== next[day]) {
    if (!poolIds.has(rerolled[day])) fail(iter, `reroll picked ${rerolled[day]} outside pool`);
    ((quotas && quotas.ceilings) || []).forEach((c) => {
      if (c.test(mealById(rerolled[day])) && count(rerolled, c.test) > c.max) {
        fail(iter, `reroll broke ceiling ${c.label}`);
      }
    });
  }
}

console.log(fails === 0
  ? `planner properties: ${ITERATIONS} randomized states, all invariants held`
  : `\n${fails} property failures.`);
process.exit(fails === 0 ? 0 : 1);
