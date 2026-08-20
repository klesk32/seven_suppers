// Step-scaling render checks: the live renderer at 4 servings must reproduce
// dev/steps-baseline.json byte for byte (so no edit silently rewords a
// recipe), and scaled renders must contain no unresolved tokens and no
// unmeasurable amounts at any supported serving count.
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
  return src.slice(i, j + endMarker.length);
}

const code = [
  grab("const MEALS = [", "\n];"),
  grab("const STEP_UNITS = ", ";"),
  grab("const STEP_GRAIN = ", ";"),
  grab("const STEP_TOKEN = ", ";"),
  grab("function stepQty(", "\n}"),
  grab("function renderStep(", "\n}"),
].join("\n");
const { MEALS, renderStep } = new Function(code + "\nreturn { MEALS, renderStep };")();

const baseline = JSON.parse(readFileSync(join(ROOT, "dev/steps-baseline.json"), "utf8")).steps;
let fails = 0;
const fail = (m) => { console.log("FAIL " + m); fails++; };

// 1. Scale 1 reproduces the approved baseline exactly
MEALS.forEach((m) => {
  const expected = baseline[m.id];
  if (!expected) return fail(`${m.id} missing from steps baseline; regenerate deliberately`);
  m.steps.forEach((s, i) => {
    const r = renderStep(s, 1);
    if (r !== expected[i]) fail(`${m.id} step ${i + 1} drifted from baseline:\n  baseline: ${expected[i]}\n  rendered: ${r}`);
  });
});
Object.keys(baseline).forEach((id) => {
  if (!MEALS.some((m) => m.id === id)) fail(`baseline has ${id} but the catalog does not`);
});

// 2. Every supported scale renders cleanly: no leftover token syntax, and no
// amount that a kitchen cannot measure (the formatter's own vocabulary)
const SCALES = [1, 2, 3, 4, 6, 8, 12].map((s) => s / 4);
const OK_AMOUNT = /^(a quarter|half a|three-quarters of a|\d+( and (a quarter|a half|three-quarters))?) (teaspoons?|tablespoons?|cups?)$/;
MEALS.forEach((m) => m.steps.forEach((s, i) => {
  SCALES.forEach((scale) => {
    const r = renderStep(s, scale);
    if (r.includes("[[") || r.includes("]]")) fail(`${m.id} step ${i + 1} has unresolved token at scale ${scale}`);
    if (/\bNaN|undefined\b/.test(r)) fail(`${m.id} step ${i + 1} renders garbage at scale ${scale}`);
  });
  for (const t of s.matchAll(/\[\[([0-9.]+)\|(tsp|tbsp|cup)\|/g)) {
    SCALES.forEach((scale) => {
      const rendered = renderStep(`[[${t[1]}|${t[2]}|X]]`, scale).replace(" X", "");
      if (!OK_AMOUNT.test(rendered)) fail(`${m.id} step ${i + 1}: unmeasurable "${rendered}" at scale ${scale}`);
    });
  }
}));

const tokens = MEALS.reduce((n, m) => n + m.steps.join(" ").split("[[").length - 1, 0);
console.log(fails === 0
  ? `step rendering: ${tokens} tokens, baseline exact at 4 servings, clean at all scales`
  : `\n${fails} render failures.`);
process.exit(fails === 0 ? 0 : 1);
