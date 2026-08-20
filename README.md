<!-- Version: 0.7.2 -->

# Seven Suppers

A simple weekly dinner planner. Pick an eating style, fill seven dinner slots, and get one combined grocery list.

The whole app is a single self-contained HTML file. No server, no install, no account.

## Try it

Live at [dinner.tinkerling.net](https://dinner.tinkerling.net), or open `seven-suppers.html` in any browser. Your plan persists in the browser between visits.

## What it does

- **Six eating styles.** Heart healthy (the default), All in, Gout friendly, Pescatarian, Vegetarian, and Vegan. The style scopes the 57-meal catalog and everything the shuffle draws from. Heart healthy also shapes the week toward sensible ratios: fish twice a week, red meat at most once. Hand-picking past a guideline gets a note, never a block.
- **Fill a week fast.** Shuffle all seven days, reroll one, or pick by hand. Lock days you like, drag dinners between days, and let variety memory keep this week from repeating last week.
- **Shuffle filters.** Constrain the draw to 35 minutes or less, veggie or vegan only, or no soups. Filters stack and persist.
- **One grocery list.** Ingredients merge across recipes into shoppable lines grouped by aisle, with package sizes ("1 can (28 oz) crushed tomatoes") and honest need notes ("2 onions (need 1 and a half)"). Pantry staples get their own check-before-you-shop section.
- **Serving scaling.** Recipes are written for 4 and scale from 1 to 12, rounding countable items to the nearest honest half and indivisible ones (eggs, buns, tortillas) up to whole units.
- **Share the week as a link.** The address bar always holds a short link for the current plan, and a "Copy week link" button copies it. Open it on another device or send it to whoever you cook with, and it becomes that browser's plan. Links keep working as the catalog grows.
- **Printable recipe cards.** Each meal has 5 to 7 numbered steps that assume no technique knowledge: every step names the pan and heat level, gives times and plain-language cut sizes, and ends with a doneness check.

## The recipes

All 57 meals share a few commitments:

- **Approachable.** Familiar formats (tacos, pasta, sheet-pan dinners, build-your-own bowls) that work for mixed tables, kids included. Everything is mild by default; each card carries a "Want more heat?" line naming a dish-appropriate additive (Tapatio on the tacos, chili crisp on the noodles, harissa on the shakshuka).
- **Precise about doneness.** Always an instant-read thermometer per USDA (165 F poultry, 160 F ground beef and pork, 145 F fish and whole cuts), never a color check.
- **Health-leaning.** Vegetables in most meals, Greek yogurt over sour cream, low-sodium broth and soy sauce, lean cuts only, no processed meats anywhere.
- **Dairy-light.** No milk as an ingredient and no cheese-centric mains; cheese appears only as a skippable topping.

The Gout friendly style is the strictest: no red meat, no fish or shellfish, no organ meats, with protein from poultry, eggs, low-fat dairy, beans, and tofu. Recipes contain common allergens (peanuts, eggs, dairy, wheat, soy, fish); check ingredient lists against your own needs. This is a home cooking tool, not medical advice; if you are managing a condition, check with your doctor or dietitian.

## Recipe feedback

Cooked something that did not go as written? Every recipe card has a "Cooked this? Tell us how it went." link that opens a prefilled [recipe feedback issue](https://github.com/klesk32/seven_suppers/issues/new?template=recipe-feedback.yml). Real-kitchen reports have rebuilt whole recipes before; times, amounts, and confusing steps are all fair game.

## Development

The app source is `seven-suppers.jsx`, a single React component. To rebuild the HTML after changing it:

```sh
./dev/build.sh
```

The script installs dependencies on first run, bundles with esbuild, embeds the result into `seven-suppers.html` (standalone) and `dev/artifact.html` (body-only variant for publishing as a claude.ai artifact), then runs the checks:

- `dev/validate.mjs` enforces the catalog invariants: canonical units and categories so grocery lines always merge, per-style dietary rules, thermometer doneness cues, shoppable package sizes, and step wording that scales.
- `dev/xcheck.mjs` cross-checks that every listed ingredient is actually mentioned in its recipe's steps.
- `dev/smoke.js` loads the built HTML in jsdom and verifies the app mounts.
- `dev/func-test.js` exercises the features end to end: shuffle variety, locks, filters, scaling, share links, eating styles, quotas, and more.

A build fails if any check fails.

### Deploying

The site is a static-assets Cloudflare Worker (`wrangler.jsonc`); the build stages the app into `public/index.html`. To ship a new build:

```sh
./dev/build.sh
CLOUDFLARE_API_TOKEN=<your token> npx wrangler deploy
```

## Repository layout

| Path | What it is |
|---|---|
| `seven-suppers.jsx` | The app: catalog, data rules, and UI in one React component |
| `seven-suppers.html` | Built standalone app, ready to open |
| `seven-suppers-spec.md` | Specification and version history |
| `wrangler.jsonc` | Cloudflare deploy config for dinner.tinkerling.net |
| `dev/` | Build script, validators, and tests |
