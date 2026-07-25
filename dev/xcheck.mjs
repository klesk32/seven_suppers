// Cross-check: every listed ingredient should be mentioned in its recipe's
// steps, and salt/pepper/water mentions are fine as assumed kitchen basics.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VERSION = "0.1.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = readFileSync(join(ROOT, "seven-suppers.jsx"), "utf8");
const i0 = src.indexOf("const MEALS = [");
const j0 = src.indexOf("\n];", i0);
const MEALS = eval("[" + src.slice(i0 + "const MEALS = [".length, j0) + "]");

// Words in the steps that stand in for the full ingredient name
const ALIASES = {
  "boneless chicken thighs": ["chicken"],
  "chicken tenderloins": ["tender"],
  "ground turkey": ["turkey"],
  "plain Greek yogurt": ["yogurt"],
  "shredded cheddar": ["cheese"],
  "low-sodium soy sauce": ["soy sauce"],
  "low-sodium chicken broth": ["broth"],
  "low-sodium vegetable broth": ["broth"],
  "light coconut milk": ["coconut milk"],
  "canned chickpeas": ["chickpeas"],
  "canned black beans": ["beans"],
  "canned cannellini beans": ["beans"],
  "canned diced tomatoes": ["tomatoes", "can of tomatoes"],
  "canned crushed tomatoes": ["crushed tomatoes", "can of crushed"],
  "canned tomato sauce": ["tomato sauce"],
  "small flour tortillas": ["tortillas"],
  "small corn tortillas": ["tortillas"],
  "whole wheat burger buns": ["buns"],
  "whole grain bread": ["bread", "toast"],
  "pita bread": ["pita"],
  "baby potatoes": ["potatoes"],
  "russet potatoes": ["potatoes"],
  "sweet potatoes": ["sweet potato"],
  "frozen peas and carrots": ["peas and carrots"],
  "frozen stir-fry vegetables": ["frozen vegetables", "vegetables straight from the bag"],
  "frozen broccoli florets": ["broccoli"],
  "frozen shelled edamame": ["edamame"],
  "frozen peas": ["peas"],
  "frozen corn": ["corn"],
  "extra-firm tofu": ["tofu"],
  "creamy peanut butter": ["peanut butter"],
  "basil pesto": ["pesto"],
  "marinara sauce": ["marinara"],
  "enchilada sauce": ["enchilada sauce"],
  "barbecue sauce": ["barbecue sauce"],
  "taco seasoning": ["seasoning"],
  "fajita seasoning": ["seasoning"],
  "mild curry powder": ["curry powder"],
  "toasted sesame oil": ["sesame oil"],
  "all-purpose flour": ["flour"],
  "romaine lettuce": ["lettuce"],
  "cherry tomatoes": ["tomatoes"],
  "green onions": ["green onion"],
  "red onion": ["onion"],
  "fresh parsley": ["parsley"],
  "red lentils": ["lentils"],
  "white rice": ["rice"],
  "penne pasta": ["penne"],
  "whole wheat penne": ["penne"],
  "rotini pasta": ["rotini"],
  "small pasta shells": ["shells"],
  "egg noodles": ["noodles"],
  "panko breadcrumbs": ["panko"],
  "eggs": ["egg"],
  "avocados": ["avocado"],
  "tomatoes": ["tomato"],
  "carrots": ["carrot"],
  "cucumbers": ["cucumber"],
  "coleslaw mix": ["coleslaw"],
  "green beans": ["green beans"],
  "bay leaf": ["bay leaf"],
  "tortilla chips": ["chips"],
  "dried oregano": ["oregano"],
  "dried thyme": ["thyme"],
  "dried rosemary": ["rosemary"],
  "ground cumin": ["cumin"],
  "vegetable oil": ["oil"],
  "Dijon mustard": ["dijon", "mustard"],
  "bell pepper": ["pepper"],
  "rolled oats": ["oats"],
};

let notes = 0;
MEALS.forEach((m) => {
  const text = m.steps.join(" ").toLowerCase();
  m.ing.forEach((i) => {
    const names = [i.n.toLowerCase(), ...(ALIASES[i.n] || [])];
    if (!names.some((n) => text.includes(n.toLowerCase()))) {
      console.log(`${m.id}: "${i.n}" never mentioned in steps`);
      notes++;
    }
  });
});
console.log(notes === 0 ? "every ingredient is used in its steps" : `${notes} unused ingredients`);
process.exit(notes === 0 ? 0 : 1);
