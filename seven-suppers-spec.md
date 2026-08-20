# Seven Suppers - Specification

Version: 0.17.0 (matches `APP_VERSION` in `seven-suppers.jsx`)

0.17.0 (recipe feedback):

- Every recipe card (catalog, week rail, and print view's on-screen state) ends with a "Cooked this? Tell us how it went." link that opens a prefilled GitHub issue using the `recipe-feedback` issue form (`.github/ISSUE_TEMPLATE/recipe-feedback.yml`): recipe name and title arrive filled in, and the form asks for servings cooked, what happened, the suggested change, and an optional supporting link. The link is `no-print`, so paper cards stay clean. `REPO_URL` holds the repository address.
- The form applies a `recipe-feedback` label (created repo-side) so kitchen reports are easy to filter from ordinary issues.

0.16.0 (diet profiles, weekly quotas, and 15 beef, pork, and fish recipes):

- The app outgrew its single household: an "Eating style" profile row now scopes the catalog, Shuffle, and Reroll. Six profiles: Heart healthy (default for fresh devices), All in, Gout friendly, Pescatarian, Vegetarian, Vegan. Profiles are device-local and never part of a share link; a link opened under a different profile still shows its week faithfully, with an "outside your style" marker on meals the local profile would not have drawn.
- Migration: a device holding a saved week from before profiles existed is inferred as Gout friendly (that is what the whole app enforced when the week was saved); only genuinely fresh devices get the Heart healthy default.
- Weekly quotas (`PROFILE_QUOTAS`): Heart healthy shapes the week to AHA-style ratios: a best-effort target of 2 fish dinners and a hard ceiling of 1 red-meat (beef or pork) dinner. Ceilings are never exceeded by a random draw: locked and hand-picked meals count against them first, and Reroll refuses replacements that would breach one. Targets yield when the shuffle chip filters make them impossible. Hand-picking past a ceiling warns in the filter row but never blocks, and locks are always honored.
- 15 new recipes (catalog 42 to 57): 8 fish (sheet-pan lemon salmon, honey-garlic salmon, baked fish tacos, tuna patties, fish sticks with sweet potato fries, tilapia foil packets, tomato-braised cod with white beans, teriyaki salmon bowls), 4 beef (classic beef tacos, sheet-pan steak fajitas, spaghetti with beefy hidden-veggie marinara, beef and bean chili), 3 pork (sheet-pan pork tenderloin with apples, ginger pork rice bowls, skillet pork chops). All lean cuts, written to the house step style, with USDA doneness: 145 F for fish and for whole beef and pork cuts (plus a rest), 160 F for ground beef and pork, thermometer always; canned tuna is precooked and exempt.
- New tags `beef`, `pork`, `fish`. The validator now scopes the dietary rules: organ meats, high-purine seafood (shellfish, anchovies, sardines), processed meats (bacon, sausage, ham, deli, hot dogs), lamb, veal, and Worcestershire stay banned everywhere; beef, pork, and fish are legal only in meals carrying the matching tag (and the tag must be earned by a matching protein ingredient, so profile filters and quotas can trust it); meals without those tags still satisfy the original gout rules. Pool checks guarantee the vegetarian, vegan, and gout profiles can each fill a 7-day week and that the fish target is reachable.
- Catalog chips gained Beef, Pork, and Fish, shown only when the active profile contains such meals; a profile switch that empties the selected chip drops it back to All.
- Every recipe (all 57) gained a `spice` field: a one-line, per-serving heat suggestion rendered under the steps as "Like it hotter? ..." on recipe cards and print view. The catalog stays kid-mild by default; the note tells heat-seekers how to fix their own plate without touching the shared batch. The validator requires the field on every meal.
- All 15 new recipes were verified against reputable published analogs (Budget Bytes, The Kitchn, Skinnytaste, Once Upon a Chef, America's Test Kitchen, RecipeTin Eats, Gimme Some Oven, Spend with Pennies, USDA temperature charts), the same pass 0.8.1 and 0.10.0 got. 9 of 15 needed no change; 6 fixes were applied: oil for browning lean ground beef in the tacos (packet directions assume nonstick and fattier beef), a full tablespoon of chili powder and half the broth so the chili actually thickens in its 15-minute simmer, a silverskin-trimming step and salt in the rub plus an honest 50 minutes for the pork tenderloin, an honest 30 minutes for the ginger pork bowls since they cook rice from raw (dropping their `fast` tag), thick-cut chops named in the ingredient with a thin-chop time warning and longer covered pea steaming, and the honey-garlic salmon's broccoli moved from "tuck into the skillet gaps" (it does not fit and comes out raw) to a parallel covered microwave steam.

0.15.0 (share links):

- The current plan now lives in the URL hash as a compact 16-character base64url slug packing 12 bytes: a format byte, the three `APP_VERSION` numbers, the servings count, and 7 slot bytes indexing into the catalog (255 = empty day). The address bar updates as the plan changes (`history.replaceState`), so sharing the week is copying the URL; a "Copy week link" button next to Shuffle and Clear does exactly that.
- Opening a link adopts its week and servings as the device's current plan, overwriting saved state; locks reset since saved locks belong to the replaced plan. Grocery checkboxes, locks, shuffle filters, and variety memory stay device-local.
- Forward compatibility: every meal gained a `v` field recording the version it was added in (the original 20 are `0.1.0`, the 0.10.0 expansion `0.10.0`). A decoder on a newer catalog rebuilds an old link's index space by filtering to meals with `v` at or below the link's version, so old links keep resolving as the catalog grows. New meals may land anywhere in the array with a higher `v`. The invariant that keeps this true, enforced by convention and documented in the validator: once a version ships, the meals it could see are never removed or reordered relative to each other. The validator checks that every meal has a well-formed `v` no newer than `APP_VERSION`, that version components fit one byte, and that the catalog stays under 255 meals. Links pin the week's composition, not recipe text: a link made before a recipe rebuild shows the current recipe.
- Unknown or out-of-range slot bytes decode to empty days, and an unparseable hash falls back to saved state.

0.14.0 (scaling honesty, prompted by a real cooked week):

- Chickpea coconut curry rebuilt after real-world feedback: it was the only meal in the catalog with zero salt from any source (rinsed chickpeas, unsalted coconut milk, salt-free spices), and 2 cans of chickpeas against 1 can of lite coconut milk simmered uncovered left it nearly dry. Now: half a teaspoon of salt plus a taste-and-adjust finish, garlic powder and ground ginger join the spices, a can of diced tomatoes gives the sauce body, and the simmer is covered.
- Recipe cards now scale countables honestly to the nearest half: "half an onion", "1 and a half sweet potatoes". Previously each card rounded its own 0.5 up to "1 onion", so three half-onion recipes printed a combined demand of 3 onions while the list correctly bought 2. Indivisible countables (`INDIVISIBLE`: eggs, tortillas, buns, pitas) still round up to whole ones. Names singularize at one or less ("1 avocado", not "1 avocados") via `ITEM_SINGULARS`.
- Grocery countable lines admit the true need behind the whole-item buy: "2 onions (need 1 and a half)".
- Steps were swept for wording that does not scale: "the whole can/jar/bag of X" became "the X" (17 rewrites across 15 recipes), shaped counts became per-unit ("one patty per bun", "a well for each egg", "about three balls per person", "two-thirds of a cup of water per seasoning packet used"). The validator now fails the build on "whole can/jar/bag/block", "both cans", "N shallow wells", or "into N patties/balls" in any step.
- Scaled recipe cards (any serving count other than 4) carry a note that fixed spelled-out step amounts (salt, water) mean the full four-serving batch.

0.13.0: every packaged ingredient (jars, cans, packets, blocks, bags) now shows the package size the recipes assume, in the grocery list and in recipe ingredient lists: "1 bag (14 oz) coleslaw mix", "1 can (28 oz) canned crushed tomatoes". The `SIZES` map holds the expected size per ingredient; the "(need X)" suffix stays size-free. A shopper facing a 14 oz and a 45 oz bag of the same thing now knows which one the plan means. The validator requires a `SIZES` (or `PACKS`) entry for every jar/can/packet/block/bag ingredient; heads, bunches, and loaves are natural units and stay size-free.

0.12.1: cherry tomatoes are stored in ounces with a "container (10 oz)" pack rule instead of "1 pint" — stores label the clamshells by ounces (10 oz and 24 oz are common), not pints. The now-unused `pint` unit left `DISCRETE_UNITS` and `UNIT_PLURALS`.

0.12.0: a "No soups" toggle joined the shuffle filters. It stacks with the time and diet filters, and since stacking can now shrink the pool below 7 (vegan, 35 min or less, no soups leaves 5), the filter row shows a cherry-colored note whenever a shuffle would leave days empty.

0.11.0 (five usability requests): the week now starts on Sunday; planned dinners can be dragged between days (drop on a planned day swaps the two meals, drop on an empty day moves it, locks travel with their meals); catalog cards for meals already on the menu gray out and cannot be added twice; vegan meals carry a small "vegan" pill on both the week rail and catalog cards; and shuffle filters ("35 min or less" toggle plus Anything / Veggie and vegan / Vegan only) constrain what Shuffle and Reroll draw from, persisted as `seven-suppers-shuffle`. When a narrow filter leaves fewer fresh meals than empty days, the shuffle tops up with last week's meals rather than leaving days blank.

0.10.1 (review pass): couscous is hard to find at the household's stores, so the kebab plates and chickpea patty bowls now serve white rice instead (which also merges their grocery lines with the six other rice meals). A new ingredient-versus-steps cross-check (`dev/xcheck.mjs`) caught and fixed two step gaps: the sweet potato bar never told the cook where the salsa goes, and the black bean burgers never mentioned the buns.

0.10.0 doubled the catalog from 20 meals to 42 and replaced every poultry doneness cue with an instant-read thermometer check. Sources for the new recipes were the same reputable analogs used in 0.8.1 (Budget Bytes, The Kitchn, Skinnytaste, Cookie and Kate, Love and Lemons, Smitten Kitchen), consulted for proportions, oven temperatures, and simmer times. Also in 0.10.0:

- Doneness: no recipe uses "cut it open, no pink" any more. Chicken pieces, ground turkey, and turkey meatballs all end on "poke an instant-read thermometer into the thickest part: 165 F", per USDA guidance that 165 F is the safe minimum for all poultry including thighs and ground poultry, and that color is not a reliable indicator. Thigh recipes note that 175 F is fine and more tender.
- Unit hygiene: dry spices and brown sugar are canonically measured in teaspoons and cornstarch in tablespoons, so a spice used by two meals merges into one grocery line instead of splitting into a tsp line and a tbsp line.
- `veggie-fried-rice` now lists dry white rice rather than "cooked rice", so the line is shoppable and merges with the other rice meals.
- `bunch` joined `DISCRETE_UNITS`, so a scaled-down week rounds half a bunch of green onions up to a whole one.
- Display names pluralize for countable ingredients via `ITEM_PLURALS` ("3 bell peppers", not "3 bell pepper"), and garlic reads "2 heads of garlic".
- `dev/validate.mjs` checks the catalog invariants below on every change.

In 0.8.1 the original 20 recipes were verified against reputable published analogs (Budget Bytes, Serious Eats, The Kitchn, Once Upon a Chef, USDA doneness guidance); 15 of 20 recipes needed no change, and 5 fixes were applied: taco simmer water (2/3 cup per seasoning packet), oiled panko for the tenders, honest times for omelet night (20 min) and the sweet potato bar (50 min, longer microwave fallback), and a thermometer-first 165 F doneness check for turkey burgers (color alone is unreliable for ground poultry).

0.9.0 folded in the verifiers' seasoning layer: every recipe gained a kid-mild dried-spice or citrus accent (oregano, Italian seasoning, smoked paprika, cumin, ginger, thyme, bay leaf, garam masala, onion powder, plus lime or lemon finishes). The new dried spices joined the `STAPLES` set, so they appear in the pantry-check section rather than the shopping aisles; the citrus lands in Produce.
Status: Implemented
Platform: Single-file React artifact (Claude Artifacts)

## Purpose

A simple weekly dinner planner. The app's single job: fill 7 dinner slots quickly and produce a combined grocery list. An "Eating style" profile (0.16.0) scopes the catalog per device: Heart healthy (default), All in, Gout friendly, Pescatarian, Vegetarian, Vegan. The catalog is written for beginner cooks and mixed tables (kid-friendly formats, mild by default); the Gout friendly style is the strictest rule set and was the app's original scope, which is why rule 1 below reads the way it does.

## Constraints and Dietary Rules

Rules 2 through 5 apply to every catalog meal. Rule 1 defines the Gout friendly profile and applies to every meal not tagged `beef`, `pork`, or `fish`; those three tags exist only for meals that earn them with a matching protein ingredient, and are banned from the gout pool wholesale. Banned everywhere, in any profile: organ meats, shellfish, anchovies, sardines, processed meats (bacon, sausage, ham, deli meat, hot dogs), lamb, veal, and Worcestershire sauce (contains anchovies).

1. Gout-friendly (low purine), the rule set the whole catalog satisfied before 0.16.0
   - No organ meats
   - No shellfish, anchovies, sardines, or other high-purine seafood
   - No red meat, no fish (moderate-purine fish as a gout-profile opt-in remains a possible future addition)
   - Allowed protein bases: chicken, turkey, eggs, low-fat dairy, beans, tofu
   - Chicken dishes use boneless thighs rather than breasts (household preference; the tenders keep tenderloins for the format)
   - Beef, pork, and fish meals (0.16.0) stay lean and heart-leaning: lean ground beef, flank steak, tenderloin, chops, salmon, cod, tilapia, canned tuna
2. Kid-friendly: familiar formats (tacos, pizza, pasta, nuggets, quesadillas), build-your-own options where possible
3. Beginner-friendly, written for a clueless but instruction-oriented cook (as of 0.5.0): 5 to 7 numbered steps per recipe that assume no technique knowledge. Every step names the pan and heat level, gives times and plain-language cut sizes ("coin-size", "as thick as your finger"), and cooking ends with a doneness check. Wash-hands reminders follow raw-meat handling, and every recipe lists all the fat it needs (no assumed pantry oil). Common techniques only, most meals 40 minutes or less
   - Poultry doneness is always an instant-read thermometer reading of 165 F (0.10.0), never a color or cut-open check. This covers chicken pieces, ground turkey cooked in crumbles (push into a mound, then probe), and turkey meatballs and patties. Thigh recipes add that 175 F is fine and more tender. Non-poultry doneness still uses plain visual and texture cues (a fork slides in with no resistance, whites no longer see-through)
4. Health-leaning: vegetables in most meals, Greek yogurt substituted for sour cream, low-sodium broth and soy sauce specified, no straight comfort-food mains (removed in 0.2.0)
5. Dairy-light: no milk as an ingredient, no cheese-centric mains. Cheese appears only as a skippable topping or mix-in. Reason: one household member is mildly lactose intolerant and a kid does not eat cheese

## Data Model

### Meal

| Field | Type | Notes |
|---|---|---|
| `id` | string | Kebab-case, unique |
| `title` | string | Display name |
| `v` | string | Version the meal was added in (0.15.0), e.g. `"0.10.0"`; anchors share-link index reconstruction |
| `time` | number | Total minutes |
| `tags` | string[] | Subset of: `chicken`, `turkey`, `beef`, `pork`, `fish`, `veggie`, `vegan`, `pasta`, `soup`, `fast` (fast = 25 min or less; vegan = no meat, eggs, dairy, or honey, and always paired with `veggie`; beef/pork/fish must be earned by a matching protein ingredient) |
| `spice` | string | One-line per-serving heat suggestion (0.16.0), shown as "Like it hotter? ..." under the steps; the shared batch always stays mild |
| `ing` | Ingredient[] | See below |
| `steps` | string[] | 5 to 7 numbered plain-language steps written for a total beginner, with explicit doneness cues |

All recipes are written for `BASE_SERVINGS` (4) servings; there is no per-meal serves field.

### Ingredient

| Field | Type | Notes |
|---|---|---|
| `n` | string | Name, lowercase, used as merge key |
| `q` | number | Quantity |
| `u` | string | Unit in singular canonical form, e.g. `cup` not `cups` ("" for countable items). Display pluralizes via `UNIT_PLURALS` when quantity is not 1; unitless countables pluralize the name itself via `ITEM_PLURALS`. Countable pantry items use the unit you would buy (`jar` for marinara, `loaf` for bread) so lines merge into shoppable quantities. Dry spices and sugar are always `tsp`, cornstarch always `tbsp` |
| `c` | string | Category: `produce`, `protein`, `dairy`, `grains`, `pantry` |

### Week

Array of 7 slots (Sunday through Saturday as of 0.11.0), each holding a meal `id` or `null`. The array is positional, so a week saved before 0.11.0 keeps its meals but they relabel to the new day order.

## Catalog

57 meals as of 0.16.0: 16 chicken, 8 turkey, 4 beef, 3 pork, 8 fish, 18 veggie (12 of them vegan), 9 pasta, 9 soup, 18 fast. Every profile pool can fill a week avoiding last week's seven.

Invariants enforced by `dev/validate.mjs`:

- Unique meal ids; 5 to 7 steps each; known tags and categories only
- One canonical unit and one canonical category per ingredient name, so grocery lines always merge
- `fast` tag if and only if the meal is 25 minutes or less; `vegan` implies `veggie` and no animal products
- Globally banned ingredients in no meal (organ meats, shellfish, anchovies, sardines, processed meats, lamb, veal, Worcestershire); beef, pork, and fish only in meals carrying the matching tag, and each such tag earned by a matching protein ingredient; meals without those tags contain no red meat or fish
- Doneness by instant-read thermometer, never a pinkness check: 165 F for all poultry, 160 F for ground beef and pork, 145 F for whole beef and pork cuts (with a rest step) and for fish; canned fish is precooked and exempt
- The vegetarian, vegan, and gout profile pools each hold at least 7 meals, and the fish pool covers the heart-healthy weekly target of 2
- Every non-staple ingredient is shoppable: sold by count or weight, in a discrete unit, or covered by a `PACKS` rule
- Share-link fields: every meal has a well-formed added-in version no newer than `APP_VERSION`, and the catalog stays under 255 meals

## Features

### 1. Week planning (three entry modes)

- Randomize: "Shuffle the whole week" fills all 7 days with unique random meals (no repeats within a week).
- Pick: Tap an empty day ("Pick a dinner") to enter select mode, then tap any catalog meal to assign it to that day.
- Randomize then modify: After a shuffle, each day supports:
  - Reroll: replaces that day with a random meal not already in the week
  - Swap: enters select mode for that day, assignment via catalog tap
  - Clear (X): empties the slot
- "Add to week" on a catalog card fills the first empty day when no day is selected. Disabled when the week is full.
- "Clear" resets the entire week and grocery checkboxes.
- Tapping a planned meal's title on its day ticket toggles the full recipe (ingredients and steps) inline, with a "Show recipe" / "Hide recipe" hint.
- Lock a day: a "Lock" button on each planned ticket. Locked days keep their meal through Shuffle; their Reroll, Swap, and X controls are hidden until unlocked. Locks persist and reset on Clear.
- Variety memory: when Shuffle or Clear replaces a non-empty plan, that plan is stored as "last week" (`seven-suppers-last-week`). Shuffle fills unlocked days avoiding last week's meals; Reroll prefers meals not on last week's plan, falling back if the pool empties.
- Shuffle filters (0.11.0): a "Shuffle from" chip row under the week actions. "35 min or less" and "No soups" (0.12.0) are on/off toggles; diet is single-select Anything / Veggie and vegan / Vegan only ("veggie" includes vegan meals since every vegan meal also carries the veggie tag). All apply to Shuffle and Reroll but never touch locked days or the catalog browse filters. Persisted together as `seven-suppers-shuffle` (JSON `{ time, diet, noSoups }`). If variety memory would leave days unfillable, the shuffle tops up with last week's meals; if the pool itself holds fewer than 7 meals (vegan, 35 min or less, no soups leaves 5), a note in the filter row warns that some days will stay empty.
- Drag to reorder (0.11.0): each planned ticket is draggable (a grip glyph hints at it). Dropping on another planned day swaps the two meals; dropping on an empty day moves the meal there. Lock state travels with the meal. The drop target shows a dashed cherry border while hovering. Uses HTML5 drag and drop, so it is mouse-only; touch rearranging still works via Swap.
- Vegan marker (0.11.0): meals tagged vegan show a small celery-green "vegan" pill after the title on week tickets and catalog cards.

### 2. Catalog browsing

- Filter chips: All, Chicken, Turkey, Veggie, Vegan, Pasta, Soup, 25 min or less. Single-select.
- Tapping a card (outside select mode) expands it inline to show the full ingredient list and 3 steps.
- Meals already on the week's menu gray out (opacity 0.45), label themselves "On the menu", and cannot be added again, from the card button or in select mode; `assignMeal` also refuses duplicates outright (0.11.0). Their recipes stay viewable.

### 3. Servings scaling

- "Cooking for N" stepper shown under the view toggle, range 1 to 12, default `DEFAULT_SERVINGS` (3, since the household usually cooks for 2 or 3). Recipes remain written for `BASE_SERVINGS` (4) and scale down automatically.
- Ingredient quantities in the recipe view and grocery list are multiplied by N / `BASE_SERVINGS`.
- Rounding at display time only: countable items (empty unit) round up to whole numbers; measured items round to the nearest quarter.
- N persists to artifact storage (key `seven-suppers-servings`).

### 4. Grocery list

- Toggle view: "Grocery list (N meals)" button, disabled at 0 planned meals.
- Aggregation: ingredients merged across all planned meals by `name + unit` key, quantities summed and scaled by the servings setting.
- Grouped by aisle in fixed order: Produce, Meat and Protein, Dairy and Eggs, Bread Grains and Pasta, Pantry. Alphabetical within groups.
- Pantry staples (the `STAPLES` set: oils including toasted sesame, butter, soy sauce, rice vinegar, Dijon, ketchup, honey, maple syrup, brown sugar, cornstarch, flour, baking powder, and the dried spices) are pulled out of the aisles into a final "From your pantry" group with a note that the amounts are what the week uses, so the shopping aisles list only what actually needs buying. The copied text includes the same group.
- Discrete-unit rounding (0.8.0): even without a `PACKS` entry, fractional quantities of whole purchasable things (`DISCRETE_UNITS`: jars, cans, heads, loaves, packets, blocks, bags, bottles, bunches) round up on the buy line with the true need shown: "1 jar (8 oz) basil pesto (need 0.5 jars)". Staples never get buy lines; their section shows plain usage amounts.
- Expected package sizes (0.13.0): the `SIZES` map annotates every jar/can/packet/block/bag line with the size the recipes assume, on screen, in the copied text, in the printout, and in recipe ingredient lists. The need amount is never size-annotated, so "need 0.5 bags" always refers to the stated bag.
- Store links (0.8.0): a "Shop at" picker on the grocery view (None default, Pick 'n Save, Metro Market, Meijer, Walmart; the `STORES` list) persists to `seven-suppers-store`. With a store selected, each aisle line gains a "Find it" link opening that item's search on the store site (leading "canned " stripped from queries) for building a pickup cart. Staples get no links; copy and print output stay store-free.
- Purchase conversion (0.7.0): the `PACKS` map records how each ingredient is sold at a typical US store (`per` = recipe units per package, plus singular/plural package labels). Aisle lines lead with the shoppable quantity and always append the true recipe total: "3 trays (1 lb) ground turkey (need 2.25 lb)", "2 dozen eggs (need 19)". Package counts round up, minimum 1. The needed amount is never omitted, so a shopper facing different package sizes (a 2 lb turkey tray) can buy correctly. Ingredients not in `PACKS` are already in purchase form (counts, cans, jars, by-weight meat) and print as before; staples never convert. Same format in the on-screen list, copied text, and printout.
- Each line has a checkbox (strikethrough when checked). Checkbox state is session-only; checks for items that leave the list after a plan change are pruned automatically.
- "Copy list" copies a plain-text version grouped by aisle headers with `- qty item` lines. Button confirms with "Copied" for 2 seconds only when the clipboard write succeeds.

### 5. Print view

- Third view-toggle button "Print week", disabled at 0 planned meals.
- Shows all planned recipes in day order (day, title, time, scaled ingredients, steps) followed by the grocery list, in print-friendly cards.
- "One recipe per page, like a card deck" checkbox (default on): each recipe prints on its own page, meal-kit style, and the grocery list follows on its own page. Unchecked, recipes pack together and the grocery list forces a fresh page. Session-only setting.
- "Print or save as PDF" button: at top level it calls `window.print()`; inside an embedded frame (like the hosted artifact page, where `window.print` is silently blocked) it opens a top-level copy of the page in a new tab and prints that. If pop-ups are also blocked, it falls back to `window.print()` and the helper text points at Ctrl+P. The intended workflow is plan the week, then print or save the combined recipes-plus-groceries sheet.
- Print CSS: `.no-print` hides app chrome (view toggle, servings stepper, buttons, footer); `.print-card` and list items avoid page breaks (modern and legacy `page-break-*` properties both set); the grocery list starts on a fresh page.

### 6. Persistence

- The week plan auto-saves to artifact storage (`window.storage`, key `seven-suppers-week`) on every change, after initial load completes. The servings setting (`seven-suppers-servings`), day locks (`seven-suppers-locks`), last week's plan (`seven-suppers-last-week`), and store choice (`seven-suppers-store`) save the same way.
- On mount, the saved week is restored if present and valid (array of length 7); saved ids no longer in the catalog become empty slots.
- All storage calls wrapped in try/catch; the app degrades to in-memory state if storage is unavailable.
- The shuffle filter persists as `seven-suppers-shuffle` (JSON `{ time, diet, noSoups }`).
- Not persisted: grocery checkboxes, active filter, expanded card, expanded day ticket, selected day, drag state.

## Removed in 0.2.0

Six meals were replaced to serve the dairy-light and healthy-eating rules: baked mac and cheese, grilled cheese and tomato soup, baked potato bar, breakfast-for-dinner pancakes, black bean quesadillas, and margherita flatbreads. Their replacements: turkey and white bean chili, veggie primavera pasta, mild chickpea coconut curry, egg and black bean breakfast burritos, loaded sweet potato bar, and turkey burgers with cucumber salad.

## Design

- Palette: celery paper `#F5F7EF`, spinach ink `#24331D`, cherry accent `#B8324F` (cherries chosen deliberately as the signature gout-friendly food), soft celery `#E4ECD8`, soft cherry `#F3DCE2`, line `#D8E0CC`.
- Type: Baloo 2 (display, rounded and warm) and Nunito Sans (body), loaded from Google Fonts with system fallbacks.
- Signature element: week days styled as kitchen order tickets with a perforated top edge, presented as a vertical rail.
- Layout: mobile-first single column; catalog uses an auto-fill grid (min 250px columns) on wider screens.
- Accessibility: visible focus outlines, `aria-label`s on icon-like buttons, reduced motion respected.
- Copy style: sentence case, active verbs, no emojis, no em dashes. The header is just the app name and version; no tagline (removed in 0.4.1).

## Technical Notes

- Single default-exported React component, no required props.
- Tailwind core classes avoided for theming; colors and fonts applied via inline styles from a palette constant (no Tailwind JIT available in the artifact runtime).
- No localStorage or sessionStorage (unsupported in artifacts); artifact storage API only.
- `APP_VERSION` const displayed in the header; semver incremented on changes (patch and minor at will, major requires approval).
- `dev/build.sh` bundles the component into `seven-suppers.html` (standalone) and `dev/artifact.html`, then runs four gates in order: `dev/validate.mjs` (catalog invariants), `dev/xcheck.mjs` (every listed ingredient is mentioned in its recipe's steps; keep its alias map current when adding ingredients), `dev/smoke.js` (jsdom render, catches the blank-page class of bug), and `dev/func-test.js` (shuffle variety, day locks, grocery rounding, store links, thermometer text in the print view). Any failure fails the build. Note when writing tests that `document.body.textContent` includes the inlined bundle source, so assertions must be scoped to `#root`.

## Out of Scope

- Fish meals (still pending user opt-in as of 0.10.0). Low-purine options like tilapia, cod, and sole would be the safe additions; salmon and tuna are moderate-purine and would need a clear label
- Pantry-exclusion ("I already have this") on the grocery list
- Multi-week history, favorites, or ratings
- Nutrition data per meal

## Ideas for Later

- Optional moderate-purine fish category with a clear label
- Export grocery list to a share sheet or reminders app
- Leftovers night as a plannable slot type
