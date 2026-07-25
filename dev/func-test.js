// Functional tests: shuffle variety, locks, staples, store links, discrete-unit
// rounding, spice merging, and thermometer doneness text in the printed recipe
const fs = require("fs");
const path = require("path");

const VERSION = "0.1.0";
const ROOT = path.join(__dirname, "..");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(ROOT, "seven-suppers.html"), "utf8");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}${extra ? " " + extra : ""}`);
  if (!ok) fails++;
};

function boot(seed) {
  return new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    beforeParse(window) {
      if (seed) Object.entries(seed).forEach(([k, v]) => window.localStorage.setItem(k, v));
    },
  });
}

(async () => {
  // Instance A: fresh, exercise shuffle variety and locks
  const a = boot();
  const adoc = a.window.document;
  const abtn = (label) => [...adoc.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(label));
  const aweek = () => JSON.parse(a.window.localStorage.getItem("seven-suppers-week") || "[]");
  await wait(600);
  abtn("Shuffle the whole week").click();
  await wait(300);
  const w1 = aweek();
  abtn("Shuffle the whole week").click();
  await wait(300);
  const w2 = aweek();
  check("shuffle avoids last week", w1.filter((id) => w2.includes(id)).length === 0);
  check("week is full of unique meals", w2.filter(Boolean).length === 7 && new Set(w2).size === 7);
  [...adoc.querySelectorAll("button")].find((b) => b.textContent.trim() === "Lock").click();
  await wait(100);
  abtn("Shuffle the whole week").click();
  await wait(300);
  check("lock survives shuffle", aweek()[0] === w2[0]);

  // Instance B: seeded week for 2 with Pick 'n Save selected, exercising the
  // grocery list edges: half jar, half bunch, and a spice used by two meals
  const b = boot({
    "seven-suppers-week": JSON.stringify([
      "pesto-pasta-peas", "veggie-lo-mein", "sweet-potato-tacos",
      "chicken-tortilla-soup", null, null, null,
    ]),
    "seven-suppers-servings": "2",
    "seven-suppers-store": "picknsave",
  });
  const bdoc = b.window.document;
  await wait(600);
  [...bdoc.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Grocery list")).click();
  await wait(200);
  const text = bdoc.getElementById("root").textContent;
  check("half jar rounds up", text.includes("1 jar basil pesto (need 0.5 jars)"));
  check("bunch line is whole", /1 bunch green onions/.test(text) && !/0\.5 bunch/.test(text));
  check("staples section present", text.includes("From your pantry"));
  check("chili powder merges to one line", (text.match(/chili powder/g) || []).length === 1);
  const buyLines = text.split(/(?=\d)/).filter((x) => /^\d/.test(x)).map((x) => x.split('(need')[0]);
  check("no fractional-unit buy lines", !buyLines.some((l) => /^0?\.\d+ |^\d*\.\d+ (jars?|cans?|bunches|bunch|bags?|heads?|loaves|loaf|bottles?)/.test(l)));
  const links = [...bdoc.getElementById("root").querySelectorAll("a")].filter((x) => x.textContent === "Find it");
  check("store links present", links.length > 0 && links.every((x) => x.href.startsWith("https://www.picknsave.com/search?query=")), `(${links.length} links)`);
  check("staples have no store links", ![...bdoc.getElementById("root").querySelectorAll("a")].some((x) => /olive oil|chili powder/.test(x.getAttribute("aria-label") || "")));

  // Instance C: print view must carry the thermometer doneness text
  const c = boot({
    "seven-suppers-week": JSON.stringify([
      "turkey-burgers", "sheetpan-lemon-chicken", "teriyaki-chicken-bowls",
      null, null, null, null,
    ]),
    "seven-suppers-servings": "3",
  });
  const cdoc = c.window.document;
  await wait(600);
  [...cdoc.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Print week")).click();
  await wait(200);
  const ptext = cdoc.getElementById("root").textContent;
  check("print view has 165 F checks", (ptext.match(/165 F/g) || []).length === 3);
  check("print view has no pinkness checks", !/no pink/i.test(ptext));

  console.log(fails === 0 ? "\nAll functional checks passed." : `\n${fails} failures.`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
