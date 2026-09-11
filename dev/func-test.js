// Functional tests: shuffle variety, locks, staples, store links, discrete-unit
// rounding, spice merging, thermometer doneness text in the printed recipe,
// Sunday-first week, shuffle filters, vegan chips, catalog gray-out,
// drag-to-swap day reordering, share-link slugs, diet profiles, and
// heart-healthy weekly quotas, per-serving spice notes, feedback links, and
// print preferences
const VERSION = "0.13.0";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(ROOT, "seven-suppers.html"), "utf8");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}${extra ? " " + extra : ""}`);
  if (!ok) fails++;
};

function boot(seed, url = "http://localhost/") {
  return new JSDOM(html, {
    runScripts: "dangerously",
    url,
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
  const weekRail = adoc.querySelector('[aria-label="Your week"]').textContent;
  check("Sunday is the first day", weekRail.indexOf("Sunday") !== -1 && weekRail.indexOf("Sunday") < weekRail.indexOf("Monday"));

  // Shuffle filter: vegan only fills every unlocked day from the vegan pool
  const VEGAN = new Set([
    "chickpea-curry", "veggie-primavera", "veggie-minestrone", "tofu-nuggets",
    "sweet-potato-bar", "red-lentil-soup", "peanut-noodles-tofu", "black-bean-burgers",
    "sweet-potato-tacos", "pasta-e-ceci", "veggie-lo-mein", "potato-pea-curry",
  ]);
  abtn("Vegan only").click();
  await wait(100);
  abtn("Shuffle the whole week").click();
  await wait(300);
  const w3 = aweek();
  check("vegan-only shuffle respects the pool", w3.slice(1).every((id) => id === null || VEGAN.has(id)), "(day 0 stays locked)");

  // No soups stacks with the diet filter: vegan non-soup pool is 9 meals
  const SOUPS = new Set([
    "chicken-noodle-soup", "veggie-minestrone", "turkey-bean-chili", "chicken-tortilla-soup",
    "lemon-orzo-chicken-soup", "turkey-meatball-soup", "red-lentil-soup", "pasta-e-ceci",
  ]);
  abtn("No soups").click();
  await wait(100);
  abtn("Shuffle the whole week").click();
  await wait(300);
  const w4 = aweek();
  check("no-soups shuffle skips soups", w4.slice(1).every((id) => id === null || (VEGAN.has(id) && !SOUPS.has(id))));

  // Instance B: seeded week for 2 with Pick 'n Save selected, exercising the
  // grocery list edges: half jar, half bunch, fractional countables, and a
  // spice used by two meals
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
  check("partial jar buys one and states the real need", text.includes("1 jar (8 oz) basil pesto (need 4 oz)"));
  check("bags show expected size", text.includes("1 bag (16 oz) frozen stir-fry vegetables (need 8 oz)"));
  check("no package units reach the shopper as a measure", !/need [0-9.]+ (jars?|cans?|bags?|blocks?|bottles?|packets?|loaves|loaf)/.test(text));
  check("an exact package buy states no redundant need", text.includes("1 can (15 oz) canned black beans") && !text.includes("canned black beans (need"));
  check("bunch line is whole", /1 bunch green onions/.test(text) && !/0\.5 bunch/.test(text));
  check("staples section present", text.includes("From your pantry"));
  check("chili powder merges to one line", (text.match(/chili powder/g) || []).length === 1);
  const buyLines = text.split(/(?=\d)/).filter((x) => /^\d/.test(x)).map((x) => x.split('(need')[0]);
  check("no fractional-unit buy lines", !buyLines.some((l) => /^0?\.\d+ |^\d*\.\d+ (jars?|cans?|bunches|bunch|bags?|heads?|loaves|loaf|bottles?)/.test(l)));
  check("countable buy rounds up with true need", text.includes("1 onion (need half)"));
  check("sweet potatoes show half need", text.includes("2 sweet potatoes (need 1 and a half)"));
  check("merged whole countables singularize", text.includes("1 avocado") && !text.includes("1 avocados"));
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
  check("recipe cards carry the spice note", (ptext.match(/Want more heat\?/g) || []).length === 3);
  const fbLinks = [...cdoc.querySelectorAll("a")].filter((x) => x.href.includes("/issues/new?template=recipe-feedback"));
  check("recipe cards link to prefilled feedback issues",
    fbLinks.length === 3 && fbLinks.every((x) => x.href.includes("recipe=") && x.href.includes("title=Recipe%20feedback")));
  check("print view has no pinkness checks", !/no pink/i.test(ptext));
  check("recipe cards show fractional countables", ptext.includes("1 and a half cucumbers"));
  check("step amounts scale with servings", ptext.includes("three-quarters of a teaspoon of salt"));
  check("no unresolved step tokens leak", !ptext.includes("[["));
  check("the trim-to-match note is gone", !ptext.includes("trim it to match"));
  check("no fractional eggs anywhere", !/half an? egg/i.test(ptext));
  check("no fractional packages anywhere in print", !/[0-9]*\.[0-9]+ (jars?|cans?|bags?|blocks?|bottles?|packets?|loaves|loaf)\b/.test(ptext));

  // Instance C2: scaled cards state package goods as kitchen measures
  const c2 = boot({
    "seven-suppers-week": JSON.stringify(["beef-bean-chili", "omelet-night", null, null, null, null, null]),
    "seven-suppers-servings": "3",
  });
  await wait(600);
  [...c2.window.document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Print week")).click();
  await wait(200);
  const c2text = c2.window.document.getElementById("root").textContent;
  check("cans scale to ounces on the card", c2text.includes("11.25 oz canned black beans"));
  check("bread scales to slices on the card", c2text.includes("6 slices whole grain bread"));

  // Instance C3: print preferences. Card-per-page starts off, the title
  // defaults to "Week of" the upcoming Sunday, and the card choice persists
  const printWeekOf = (doc) => [...doc.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Print week"));
  const cardToggle = (doc) => [...doc.querySelectorAll('input[type="checkbox"]')]
    .find((x) => x.closest("label") && x.closest("label").textContent.includes("One recipe per page"));
  const c3 = boot({
    "seven-suppers-week": JSON.stringify(["omelet-night", "turkey-tacos", null, null, null, null, null]),
  });
  await wait(600);
  const c3doc = c3.window.document;
  printWeekOf(c3doc).click();
  await wait(200);
  check("card-per-page is off by default", !!cardToggle(c3doc) && !cardToggle(c3doc).checked);
  const MONTH_RE = "(January|February|March|April|May|June|July|August|September|October|November|December)";
  check("print title defaults to Week of",
    [...c3doc.querySelectorAll("#root h1")].some((h) => new RegExp(`^Week of ${MONTH_RE} \\d{1,2}$`).test(h.textContent.trim())));
  const dateInput = c3doc.querySelector('input[type="date"]');
  const picked = dateInput ? new Date(dateInput.value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOut = picked ? Math.round((picked - today) / 86400000) : -1;
  check("default week is the upcoming Sunday", !!picked && picked.getDay() === 0 && daysOut >= 1 && daysOut <= 7,
    `(${dateInput && dateInput.value})`);
  cardToggle(c3doc).click();
  await wait(150);
  const printPrefs = JSON.parse(c3.window.localStorage.getItem("seven-suppers-print") || "{}");
  check("card-per-page choice persists", printPrefs.cardPerPage === true);

  // Instance C4: saved custom title and card mode load, and card mode repeats
  // the title on every card (1 heading + 2 cards)
  const c4 = boot({
    "seven-suppers-week": JSON.stringify(["omelet-night", "turkey-tacos", null, null, null, null, null]),
    "seven-suppers-print": JSON.stringify({ cardPerPage: true, headerMode: "custom", headerText: "Dinners at the lake" }),
  });
  await wait(600);
  const c4doc = c4.window.document;
  printWeekOf(c4doc).click();
  await wait(200);
  const c4text = c4doc.getElementById("root").textContent;
  check("custom title prints", [...c4doc.querySelectorAll("#root h1")].some((h) => h.textContent.trim() === "Dinners at the lake"));
  check("card mode repeats the title on every card", (c4text.match(/Dinners at the lake/g) || []).length === 3);
  check("saved card-per-page preference loads", !!cardToggle(c4doc) && cardToggle(c4doc).checked);

  // Header date helpers, checked against fixed calendar days
  const jsx = fs.readFileSync(path.join(ROOT, "seven-suppers.jsx"), "utf8");
  const grab = (a, b) => { const i = jsx.indexOf(a); return jsx.slice(i, jsx.indexOf(b, i) + b.length); };
  const dates = new Function([
    grab("const MONTHS = ", ";"), grab("function isoDate(", "\n}"), grab("function parseIso(", "\n}"),
    grab("function nextSunday(", "\n}"), grab("function sundayOf(", "\n}"), grab("function weekOfLabel(", "\n}"),
  ].join("\n") + "\nreturn { nextSunday, sundayOf, weekOfLabel };")();
  check("Saturday plans tomorrow's week", dates.nextSunday(new Date(2026, 8, 12)) === "2026-09-13");
  check("Sunday plans the following week", dates.nextSunday(new Date(2026, 8, 13)) === "2026-09-20");
  check("mid-week plans the following week", dates.nextSunday(new Date(2026, 8, 16)) === "2026-09-20");
  check("the upcoming Sunday crosses the year", dates.nextSunday(new Date(2026, 11, 30)) === "2027-01-03");
  check("a picked day snaps to its Sunday", dates.sundayOf("2026-09-17") === "2026-09-13");
  check("the week label reads naturally", dates.weekOfLabel("2026-09-13") === "Week of September 13");

  // Instance D: vegan chip, catalog gray-out, and drag-to-swap
  const d = boot({
    "seven-suppers-week": JSON.stringify([
      "chickpea-curry", "turkey-tacos", null, null, null, null, null,
    ]),
  });
  const ddoc = d.window.document;
  await wait(600);
  const droot = ddoc.getElementById("root");
  const rail = droot.querySelector('[aria-label="Your week"]');
  check("vegan chip on the week rail", !!rail.querySelector('[aria-label="vegan meal"]'));
  const onMenu = [...droot.querySelectorAll("button")].filter((x) => x.textContent.trim() === "On the menu");
  check("on-menu catalog cards are blocked", onMenu.length === 2 && onMenu.every((x) => x.disabled));

  const tickets = [...rail.querySelectorAll(".ticket")];
  tickets[0].dispatchEvent(new d.window.Event("dragstart", { bubbles: true }));
  await wait(100);
  tickets[1].dispatchEvent(new d.window.Event("dragover", { bubbles: true, cancelable: true }));
  await wait(50);
  tickets[1].dispatchEvent(new d.window.Event("drop", { bubbles: true, cancelable: true }));
  await wait(200);
  const dweek = JSON.parse(d.window.localStorage.getItem("seven-suppers-week"));
  check("drag swaps two planned days", dweek[0] === "turkey-tacos" && dweek[1] === "chickpea-curry");

  const tickets2 = [...droot.querySelector('[aria-label="Your week"]').querySelectorAll(".ticket")];
  tickets2[1].dispatchEvent(new d.window.Event("dragstart", { bubbles: true }));
  await wait(100);
  tickets2[4].dispatchEvent(new d.window.Event("dragover", { bubbles: true, cancelable: true }));
  await wait(50);
  tickets2[4].dispatchEvent(new d.window.Event("drop", { bubbles: true, cancelable: true }));
  await wait(200);
  const dweek2 = JSON.parse(d.window.localStorage.getItem("seven-suppers-week"));
  check("drag onto an empty day moves the meal", dweek2[1] === null && dweek2[4] === "chickpea-curry");

  // Instance E: share links. The address bar of instance A holds the slug for
  // its current plan; booting a fresh instance from that URL must adopt the
  // same week and persist it, even with different state already saved.
  const ahash = a.window.location.hash;
  check("address bar carries a compact slug", /^#[A-Za-z0-9_-]{16}$/.test(ahash), `(${ahash})`);
  const e = boot({
    "seven-suppers-week": JSON.stringify(["omelet-night", null, null, null, null, null, null]),
    "seven-suppers-servings": "5",
  }, "http://localhost/" + ahash);
  await wait(600);
  const eweek = JSON.parse(e.window.localStorage.getItem("seven-suppers-week"));
  check("opening a link adopts its week over saved state", JSON.stringify(eweek) === JSON.stringify(aweek()));
  check("opening a link adopts its servings", e.window.localStorage.getItem("seven-suppers-servings") === "3");
  const ebtn = [...e.window.document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Copy week link");
  check("copy week link button present and enabled", !!ebtn && !ebtn.disabled);

  // Instance F: a hand-built slug (format 1, catalog 0.15.0, 2 servings,
  // meals 0 and 1, an out-of-range index, then empty days) degrades gracefully
  const slug = Buffer.from([1, 0, 15, 0, 2, 0, 1, 200, 255, 255, 255, 255]).toString("base64url");
  const f = boot(null, "http://localhost/#" + slug);
  await wait(600);
  const fweek = JSON.parse(f.window.localStorage.getItem("seven-suppers-week"));
  check("slug indexes resolve in catalog order",
    fweek[0] === "sheetpan-lemon-chicken" && fweek[1] === "turkey-tacos");
  check("out-of-range and empty slots decode to empty days", fweek.slice(2).every((id) => id === null));
  check("slug servings apply", f.window.localStorage.getItem("seven-suppers-servings") === "2");

  // Golden share links: slugs minted at past catalog versions must decode to
  // exactly the same weeks forever (dev/golden-links.json; never regenerate)
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "golden-links.json"), "utf8"));
  for (const fix of golden.links) {
    const gdom = boot(null, "http://localhost/#" + fix.slug);
    await wait(600);
    const gw = JSON.parse(gdom.window.localStorage.getItem("seven-suppers-week") || "[]");
    check(`golden link (${fix.version}) decodes to its exact week`,
      JSON.stringify(gw) === JSON.stringify(fix.week) &&
      gdom.window.localStorage.getItem("seven-suppers-servings") === String(fix.servings));
  }

  // Profiles: a fresh device defaults to heart healthy; a device with a saved
  // week from before profiles existed is inferred as gout friendly
  check("fresh device defaults to heart healthy", a.window.localStorage.getItem("seven-suppers-profile") === "heart");
  check("active profile description is visible, not tooltip-only",
    adoc.getElementById("root").textContent.includes("aiming for fish twice a week and red meat at most once"));
  check("pre-profile device with a saved week infers gout", b.window.localStorage.getItem("seven-suppers-profile") === "gout");

  // Instance G: heart-healthy quotas shape the shuffle: aim for 2 fish, never
  // more than 1 red-meat dinner
  const FISH_MEALS = new Set([
    "sheetpan-lemon-salmon", "honey-garlic-salmon", "fish-tacos", "tuna-patties",
    "baked-fish-sticks", "tilapia-foil-packets", "tomato-braised-cod", "teriyaki-salmon-bowls",
  ]);
  const RED_MEAT_MEALS = new Set([
    "beef-tacos", "steak-fajitas", "spaghetti-beef-marinara", "beef-bean-chili",
    "sheetpan-pork-tenderloin", "ginger-pork-rice-bowls", "skillet-pork-chops",
  ]);
  const g = boot();
  const gdoc = g.window.document;
  const gbtn = (label) => [...gdoc.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
  const gweek = () => JSON.parse(g.window.localStorage.getItem("seven-suppers-week") || "[]");
  await wait(600);
  let quotaOk = true;
  for (let round = 0; round < 5; round++) {
    gbtn("Shuffle the whole week").click();
    await wait(250);
    const w = gweek();
    const fishN = w.filter((id) => FISH_MEALS.has(id)).length;
    const redN = w.filter((id) => RED_MEAT_MEALS.has(id)).length;
    if (fishN < 2 || redN > 1) { quotaOk = false; break; }
  }
  check("heart shuffle hits 2 fish and caps red meat at 1, five rounds running", quotaOk);

  // Switching to gout friendly keeps beef, pork, and fish out of the shuffle
  gbtn("Gout friendly").click();
  await wait(100);
  gbtn("Shuffle the whole week").click();
  await wait(250);
  const gw = gweek();
  check("gout shuffle draws no beef, pork, or fish",
    gw.filter(Boolean).length === 7 && gw.every((id) => !FISH_MEALS.has(id) && !RED_MEAT_MEALS.has(id)));
  check("profile choice persists", g.window.localStorage.getItem("seven-suppers-profile") === "gout");

  // Instance H: a week that breaks the rules is shown honestly: an off-profile
  // meal gets a marker, a second red-meat dinner gets a quota note
  const h = boot({
    "seven-suppers-week": JSON.stringify([
      "beef-tacos", "skillet-pork-chops", null, null, null, null, null,
    ]),
    "seven-suppers-profile": "heart",
  });
  const hdoc = h.window.document;
  await wait(600);
  const htext = hdoc.getElementById("root").textContent;
  check("hand-picking past a ceiling warns", htext.includes("Heart healthy aims for at most 1 red-meat dinner a week; this week has 2."));
  check("in-profile meals carry no outside marker", !hdoc.querySelector('[aria-label="outside your eating style"]'));
  [...hdoc.querySelectorAll("button")].find((x) => x.textContent.trim() === "Vegan").click();
  await wait(200);
  check("off-profile meals are marked after a profile switch",
    hdoc.querySelectorAll('[aria-label="outside your eating style"]').length === 2);

  console.log(fails === 0 ? "\nAll functional checks passed." : `\n${fails} failures.`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
