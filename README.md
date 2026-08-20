<!-- Version: 0.6.0 -->

# Seven Suppers

A weekly dinner planner for beginner cooks and busy households, with or without kids. It has one job: fill seven dinner slots quickly and produce a combined grocery list.

The whole app is a single self-contained HTML file. No server, no install, no account.

## Try it

It is live at [dinner.tinkerling.net](https://dinner.tinkerling.net). Or open `seven-suppers.html` in any browser. That is the entire app: a 57-meal catalog, a Sunday-through-Saturday week rail, and a merged grocery list with checkboxes. Your plan persists in the browser between visits.

## What it does

- **Pick an eating style.** Six profiles scope what the planner draws from: Heart healthy (the default), All in, Gout friendly, Pescatarian, Vegetarian, and Vegan. Heart healthy additionally shapes each week toward sensible ratios: it aims for fish twice a week and never shuffles in more than one red-meat dinner. Hand-picking past that guideline gets a gentle note, never a block.

- **Fill a week fast.** Shuffle all seven days at once, reroll a single day, or pick meals from the catalog by hand. Lock days you are happy with so a reshuffle leaves them alone, and drag planned dinners between days to reorder.
- **Variety memory.** Shuffle avoids repeating last week's meals when it can, so two shuffles in a row do not serve the same seven dinners.
- **Shuffle filters.** Constrain the draw to 35 minutes or less, veggie or vegan only, or no soups. Filters stack and persist.
- **Share the week as a link.** The address bar always holds a short link for the current plan (a 16-character slug encoding the meals, their order, and the servings count), and a "Copy week link" button copies it. Open the link on another device, or send it to family or roommates, and it becomes that browser's plan. Links keep working as the catalog grows, since each recipe records the catalog version it was added in.
- **One grocery list.** Ingredients merge across recipes into shoppable lines grouped by aisle, with package sizes ("1 can (28 oz) crushed tomatoes") and honest need notes ("2 onions (need 1 and a half)"). Pantry staples get their own check-before-you-shop section.
- **Serving scaling.** Recipes are written for 4 servings and scale to your household size, rounding countable items to the nearest honest half and indivisible ones (eggs, buns, tortillas) up to whole units.
- **Printable recipe cards.** Each meal has 5 to 7 numbered steps written for a total beginner: every step names the pan and heat level, gives times and plain-language cut sizes, and ends with a doneness check.

## The food rules

The app was born in a household managing gout, and that heritage shows in the rules. Every meal in the catalog satisfies these:

1. **Kid-friendly, adult-fixable.** Familiar formats (tacos, pizza, pasta, nuggets, quesadillas) and build-your-own options where possible. Everything is mild by default, and every recipe card carries a "Like it hotter?" line with a per-serving heat suggestion, so spice lovers season their own plate while the shared batch stays gentle.
2. **Beginner-friendly.** Common techniques only, most meals in 40 minutes or less. Meat and fish doneness is always an instant-read thermometer check (165 F poultry, 160 F ground beef and pork, 145 F fish and whole cuts), never a color check.
3. **Health-leaning.** Vegetables in most meals, Greek yogurt instead of sour cream, low-sodium broth and soy sauce, lean cuts only, and no processed meats anywhere: no bacon, sausage, ham, or deli meat in any profile.
4. **Dairy-light.** No milk as an ingredient, no cheese-centric mains; cheese appears only as a skippable topping.

The Gout friendly profile applies the strictest rule set: no red meat, no fish, no shellfish or organ meats, with protein from chicken, turkey, eggs, low-fat dairy, beans, and tofu. Devices that used the app before eating styles existed keep this behavior automatically.

The full data model, invariants, and version history live in [seven-suppers-spec.md](seven-suppers-spec.md).

This is a home cooking tool built around one household's dietary needs, not medical advice. If you are managing gout or any other condition, talk to your doctor or dietitian about what belongs on your plate.

## Recipe feedback

Cooked something that did not go as written? Every recipe card has a "Cooked this? Tell us how it went." link that opens a prefilled [recipe feedback issue](https://github.com/klesk32/seven_suppers/issues/new?template=recipe-feedback.yml). Real-kitchen reports have rebuilt whole recipes before; times, amounts, and confusing steps are all fair game.

## Development

The app source is `seven-suppers.jsx`, a single React component. To rebuild the HTML after changing it:

```sh
./dev/build.sh
```

The script installs dependencies on first run, bundles with esbuild, embeds the result into `seven-suppers.html` (standalone) and `dev/artifact.html` (body-only variant for publishing as a claude.ai artifact), then runs the checks:

- `dev/validate.mjs` enforces the catalog invariants: canonical units and categories so grocery lines always merge, dietary rules, thermometer doneness cues, shoppable package sizes, and step wording that scales.
- `dev/xcheck.mjs` cross-checks that every listed ingredient is actually mentioned in its recipe's steps.
- `dev/smoke.js` loads the built HTML in jsdom and verifies the app mounts.
- `dev/func-test.js` exercises the features end to end: shuffle variety, locks, filters, scaling, drag reordering, and more.

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
