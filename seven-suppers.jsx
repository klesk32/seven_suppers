import { useState, useEffect, useMemo } from "react";

// Seven Suppers: a simple weekly dinner planner with eating-style profiles
const APP_VERSION = "0.17.4";

// Recipe feedback lands here as GitHub issues (see .github/ISSUE_TEMPLATE)
const REPO_URL = "https://github.com/klesk32/seven_suppers";

// Every recipe in the catalog is written for this many servings
const BASE_SERVINGS = 4;

// Default stepper value; the household usually cooks for 2 or 3
const DEFAULT_SERVINGS = 3;

// Palette: celery paper, spinach ink, cherry accent (cherries are a classic gout-friendly food)
const P = {
  paper: "#F5F7EF",
  ink: "#24331D",
  inkSoft: "#5C6B52",
  cherry: "#B8324F",
  cherrySoft: "#F3DCE2",
  celery: "#8AA86B",
  celerySoft: "#E4ECD8",
  card: "#FFFFFF",
  line: "#D8E0CC",
};

const FONT_DISPLAY = "'Baloo 2', 'Comic Sans MS', sans-serif";
const FONT_BODY = "'Nunito Sans', system-ui, sans-serif";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Pools the shuffle can draw from; "veggie" includes vegan meals since every
// vegan meal also carries the veggie tag
const SHUFFLE_DIETS = [
  { id: "all", label: "Anything" },
  { id: "veggie", label: "Veggie and vegan" },
  { id: "vegan", label: "Vegan only" },
];

// House diet profiles: which meals the catalog, Shuffle, and Reroll may draw
// from. Device-local and never part of a share link (links pin composition,
// not diet). "heart" is the default for fresh devices; a device with a saved
// week from before profiles existed is inferred as "gout", since that is what
// the whole app enforced when that week was saved.
const PROFILES = [
  { id: "heart", label: "Heart healthy", hint: "The whole catalog, aiming for fish twice a week and red meat at most once" },
  { id: "all", label: "All in", hint: "The whole catalog, no weekly ratios" },
  { id: "gout", label: "Gout friendly", hint: "No red meat or seafood: poultry, eggs, beans, and tofu" },
  { id: "pesc", label: "Pescatarian", hint: "Fish plus every meat-free meal" },
  { id: "veggie", label: "Vegetarian", hint: "Meat-free meals only" },
  { id: "vegan", label: "Vegan", hint: "No animal products at all" },
];
const DEFAULT_PROFILE = "heart";

const RED_MEAT_TAGS = new Set(["beef", "pork"]);
const GOUT_EXCLUDED_TAGS = new Set(["beef", "pork", "fish"]);

const PROFILE_ALLOWS = {
  heart: () => true,
  all: () => true,
  gout: (m) => !m.tags.some((t) => GOUT_EXCLUDED_TAGS.has(t)),
  pesc: (m) => m.tags.includes("veggie") || m.tags.includes("fish"),
  veggie: (m) => m.tags.includes("veggie"),
  vegan: (m) => m.tags.includes("vegan"),
};

function profileAllows(profileId, meal) {
  return (PROFILE_ALLOWS[profileId] || PROFILE_ALLOWS[DEFAULT_PROFILE])(meal);
}

// Weekly composition quotas, per profile. Ceilings are hard: Shuffle and
// Reroll never draw past them (locked and hand-picked meals count against
// them first, and hand-picking past one warns rather than blocks). Targets
// are best effort: Shuffle tries to hit them but yields when the filtered
// pool cannot, and Reroll ignores them.
const PROFILE_QUOTAS = {
  heart: {
    ceilings: [{ label: "red-meat dinner", test: (m) => m.tags.some((t) => RED_MEAT_TAGS.has(t)), max: 1 }],
    targets: [{ label: "fish dinner", test: (m) => m.tags.includes("fish"), want: 2 }],
  },
};

// Categories: produce, protein, dairy, grains, pantry
const MEALS = [
  {
    id: "sheetpan-lemon-chicken", v: "0.1.0", title: "Sheet-Pan Lemon Chicken and Potatoes", time: 40, tags: ["chicken"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "boneless chicken thighs", q: 1.5, u: "lb", c: "protein" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "broccoli", q: 1, u: "head", c: "produce" },
      { n: "lemon", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
    ],
    steps: [
      "Move an oven rack to the middle and heat the oven to 425 F. Line a large rimmed baking sheet with foil.",
      "Rinse the potatoes and cut each one in half. No peeling needed.",
      "Put the potatoes and chicken on the pan. Drizzle with the olive oil, sprinkle with the garlic powder, the oregano, 1 teaspoon of salt, and a little pepper, then mix with your hands until coated. Spread everything in a single layer. Wash your hands after touching raw chicken.",
      "Roast for 20 minutes. Set a timer.",
      "While it roasts, cut the broccoli into bite-size pieces and cut the lemon in half.",
      "Add the broccoli to the pan, stir once, and roast 15 more minutes. Poke an instant-read thermometer into the thickest piece of chicken, not touching the pan: it is done at 165 F. Thighs stay juicy even at 175 F, so give it 5 more minutes if it reads low.",
      "Squeeze the lemon halves over the whole pan and serve.",
    ],
  },
  {
    id: "turkey-tacos", v: "0.1.0", title: "Turkey Taco Night", time: 25, tags: ["turkey", "fast"],
    spice: "Add Tapatio or pickled jalapenos.",
    ing: [
      { n: "ground turkey", q: 1, u: "lb", c: "protein" },
      { n: "taco seasoning", q: 1, u: "packet", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "small flour tortillas", q: 8, u: "", c: "grains" },
      { n: "shredded cheddar", q: 1, u: "cup", c: "dairy" },
      { n: "romaine lettuce", q: 1, u: "head", c: "produce" },
      { n: "tomatoes", q: 2, u: "", c: "produce" },
      { n: "plain Greek yogurt", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Cut the lettuce into thin ribbons and the tomatoes into small cubes. Put them in bowls on the table with the cheese and yogurt.",
      "Put a large skillet on the stove over medium heat and let it warm up for 2 minutes.",
      "Add the turkey and cook 7 to 8 minutes, breaking it into small crumbles with a wooden spoon. Push the meat into a mound at one side of the pan and poke an instant-read thermometer into the middle of it: ground turkey is done at 165 F.",
      "Sprinkle the taco seasoning over the meat, add two-thirds of a cup of water per seasoning packet used, stir, and let it bubble gently 4 to 5 minutes until it thickens into a sauce. Squeeze half the lime in and stir.",
      "Warm the tortillas: 20 seconds in the microwave under a damp paper towel, or 30 seconds per side in a dry pan.",
      "Let everyone build their own. The yogurt stands in for sour cream.",
    ],
  },
  {
    id: "veggie-fried-rice", v: "0.1.0", title: "Veggie Fried Rice with Eggs", time: 20, tags: ["veggie", "fast"],
    spice: "Add sriracha or chili crisp.",
    ing: [
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "eggs", q: 4, u: "", c: "dairy" },
      { n: "frozen peas and carrots", q: 2, u: "cup", c: "produce" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "vegetable oil", q: 2, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Cook the rice following the package directions, then spread it on a plate to cool while you prep. Leftover cold rice from another night works even better and skips this step.",
      "Crack the eggs into a bowl and beat them with a fork until evenly yellow. Slice the green onions into thin rings.",
      "Heat 1 tablespoon of the oil in your largest skillet over medium heat for 1 minute. Pour in the eggs, wait 20 seconds, then push them around with a spatula until they set into soft clumps, about 1 minute. Slide them onto a plate.",
      "Add the rest of the oil to the pan, then the frozen peas and carrots straight from the bag. Sprinkle in the garlic powder and stir for 2 minutes.",
      "Add the rice and cook 3 to 4 minutes, stirring every 30 seconds, until everything is hot.",
      "Turn off the heat. Stir in the soy sauce, the eggs, and the green onions, and serve.",
    ],
  },
  {
    id: "creamy-tomato-pasta", v: "0.1.0", title: "Creamy Tomato Pasta with Hidden Veggies", time: 30, tags: ["veggie", "pasta"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "penne pasta", q: 12, u: "oz", c: "grains" },
      { n: "marinara sauce", q: 1, u: "jar", c: "pantry" },
      { n: "zucchini", q: 1, u: "", c: "produce" },
      { n: "carrots", q: 2, u: "", c: "produce" },
      { n: "cream cheese", q: 3, u: "oz", c: "dairy" },
      { n: "Italian seasoning", q: 1, u: "tsp", c: "pantry" },
      { n: "parmesan", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring it to a rolling boil over high heat.",
      "While the water heats, peel the carrots and grate them and the zucchini on the large holes of a box grater. The zucchini skin can stay on.",
      "Pour the marinara into a second pot over medium-low heat, stir in the grated vegetables and the Italian seasoning, and let it bubble gently for 8 minutes, stirring occasionally.",
      "When the water boils, add the penne and cook for the time printed on the box. Before draining, scoop out a coffee mug of the cooking water, then drain the pasta in a colander.",
      "Cut the cream cheese into chunks and stir it into the sauce until it melts smooth.",
      "Mix the pasta into the sauce, adding splashes of the saved water if it looks too thick. Top with parmesan.",
    ],
  },
  {
    id: "chicken-tenders", v: "0.1.0", title: "Baked Chicken Tenders and Sweet Potato Fries", time: 35, tags: ["chicken"],
    spice: "Add a dash of Frank's RedHot to the ketchup.",
    ing: [
      { n: "chicken tenderloins", q: 1.25, u: "lb", c: "protein" },
      { n: "sweet potatoes", q: 2, u: "", c: "produce" },
      { n: "panko breadcrumbs", q: 1.5, u: "cup", c: "pantry" },
      { n: "smoked paprika", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "eggs", q: 2, u: "", c: "dairy" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "ketchup", q: 0.5, u: "cup", c: "pantry" },
    ],
    steps: [
      "Move an oven rack to the middle and heat the oven to 425 F. Get out two baking sheets.",
      "Scrub the sweet potatoes (no peeling needed) and cut them into fries about as thick as your finger. Toss with 2 tablespoons of the olive oil and a big pinch of salt on one pan and spread them out flat.",
      "Crack the eggs into a bowl and beat them with a fork. Pour the panko into a second bowl with the smoked paprika, the garlic powder, half a teaspoon of salt, and the last tablespoon of olive oil, and stir until the crumbs look slightly damp; this is what lets them turn golden.",
      "One at a time: dip a tender in the egg, let the extra drip off, roll it in panko, press so the crumbs stick, and lay it on the second pan. Wash your hands when done.",
      "Bake both pans 10 minutes, flip everything with tongs, then bake 10 more, until the tenders are golden. Poke an instant-read thermometer lengthwise into the thickest tender: it is done at 165 F.",
      "Serve with ketchup.",
    ],
  },
  {
    id: "chickpea-curry", v: "0.1.0", title: "Mild Chickpea Coconut Curry", time: 25, tags: ["veggie", "vegan", "fast"],
    spice: "Add a pinch of cayenne.",
    ing: [
      { n: "canned chickpeas", q: 2, u: "can", c: "pantry" },
      { n: "light coconut milk", q: 1, u: "can", c: "pantry" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "mild curry powder", q: 3, u: "tsp", c: "pantry" },
      { n: "garam masala", q: 0.5, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "spinach", q: 3, u: "cup", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
    ],
    steps: [
      "Start the rice following the package directions. It takes about 20 minutes, so get it going first.",
      "Peel the onion and chop it into small pieces, roughly pea-size. Uneven is fine.",
      "Warm the olive oil in a medium pot over medium heat for 30 seconds. Add the onion and cook 4 minutes, stirring every minute, until it looks glassy instead of white.",
      "Add the curry powder, garam masala, garlic powder, and ground ginger and stir for 30 seconds until they smell toasty.",
      "Open the chickpeas, pour them into a colander, and rinse under the tap. Add them to the pot with the diced tomatoes (juice included), the coconut milk, and half a teaspoon of salt. Cover and let it bubble gently for 10 minutes.",
      "Turn off the heat and stir in the spinach a handful at a time until the leaves go dark and soft. Squeeze half the lime in, then taste a cooled spoonful and add salt a pinch at a time until it tastes bright instead of flat. Spoon over the rice.",
    ],
  },
  {
    id: "chicken-noodle-soup", v: "0.1.0", title: "Easy Chicken Noodle Soup", time: 35, tags: ["chicken", "soup"],
    spice: "Add black pepper and a dash of Tabasco.",
    ing: [
      { n: "boneless chicken thighs", q: 1, u: "lb", c: "protein" },
      { n: "carrots", q: 3, u: "", c: "produce" },
      { n: "celery", q: 3, u: "stalk", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "egg noodles", q: 6, u: "oz", c: "grains" },
      { n: "dried thyme", q: 0.5, u: "tsp", c: "pantry" },
      { n: "bay leaf", q: 1, u: "", c: "pantry" },
      { n: "low-sodium chicken broth", q: 8, u: "cup", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Peel the carrots and onion. Cut the carrots and celery into coin-size pieces and chop the onion into small bits.",
      "Warm the olive oil in your largest pot over medium heat for 30 seconds. Add the carrots, celery, and onion and cook 5 minutes, stirring every minute or two.",
      "Pour in all the broth and add the chicken thighs whole, plus the thyme and the bay leaf. Bring to a gentle bubble and cook 15 minutes.",
      "Poke an instant-read thermometer into the thickest thigh right in the pot: at 165 F it is done. Lift the chicken onto a plate with tongs, pull it into shreds with two forks, and put the shreds back in the pot.",
      "Add the noodles and cook 8 more minutes, until a noodle you fish out and blow on is soft.",
      "Fish out the bay leaf. Taste a cooled spoonful and add salt a pinch at a time until it tastes good to you.",
    ],
  },
  {
    id: "breakfast-burritos", v: "0.1.0", title: "Egg and Black Bean Breakfast Burritos", time: 20, tags: ["veggie", "fast"],
    spice: "Add Cholula or Valentina.",
    ing: [
      { n: "eggs", q: 8, u: "", c: "dairy" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "small flour tortillas", q: 8, u: "", c: "grains" },
      { n: "bell pepper", q: 1, u: "", c: "produce" },
      { n: "salsa", q: 1, u: "jar", c: "pantry" },
      { n: "avocados", q: 2, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground cumin", q: 0.5, u: "tsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Cut the bell pepper in half, pull out the stem, seeds, and white ribs, and chop it into small cubes.",
      "Crack the eggs into a bowl with the cumin and beat them with a fork until evenly yellow. Open the beans, pour into a colander, and rinse.",
      "Warm the olive oil in a large nonstick skillet over medium heat. Add the pepper and stir for 3 minutes.",
      "Pour in the eggs. Wait 20 seconds, then push them slowly around with a spatula until just set and no longer runny, about 2 minutes. Turn off the heat.",
      "Warm the beans in the microwave for 1 minute and the tortillas for 20 seconds under a damp paper towel.",
      "Cut around each avocado the long way, twist the halves apart, remove the pit with a spoon, and slice the flesh. Squeeze lime juice over the slices.",
      "Lay eggs, beans, salsa, and avocado down the middle of each tortilla, fold in the sides, and roll it up from the bottom.",
    ],
  },
  {
    id: "honey-garlic-stirfry", v: "0.1.0", title: "Honey-Garlic Chicken Stir-Fry", time: 25, tags: ["chicken", "fast"],
    spice: "Add sriracha to taste.",
    ing: [
      { n: "boneless chicken thighs", q: 1.25, u: "lb", c: "protein" },
      { n: "frozen stir-fry vegetables", q: 1, u: "bag", c: "produce" },
      { n: "honey", q: 3, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Cut the chicken into bite-size pieces on a cutting board. Wash the board, the knife, and your hands with soap right after.",
      "Peel the garlic and chop it into tiny bits. Stir the honey, soy sauce, garlic, and ground ginger together in a small bowl.",
      "Heat the oil in your largest skillet over medium-high until it shimmers. Add the chicken in one layer and leave it alone for 3 minutes, then stir and cook 3 more minutes.",
      "Add the frozen vegetables straight from the bag and cook 4 minutes, stirring often.",
      "Pour in the sauce and let it bubble 2 minutes until slightly sticky. Poke an instant-read thermometer into the biggest piece of chicken: 165 F means done. Serve over the rice.",
    ],
  },
  {
    id: "veggie-primavera", v: "0.1.0", title: "Veggie Primavera Pasta", time: 25, tags: ["veggie", "vegan", "pasta", "fast"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "whole wheat penne", q: 12, u: "oz", c: "grains" },
      { n: "zucchini", q: 1, u: "", c: "produce" },
      { n: "cherry tomatoes", q: 10, u: "oz", c: "produce" },
      { n: "dried oregano", q: 0.5, u: "tsp", c: "pantry" },
      { n: "frozen peas", q: 1.5, u: "cup", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring to a rolling boil over high heat.",
      "Cut the zucchini lengthwise into quarters, then across into small wedges. Cut the cherry tomatoes in half. Peel the garlic and chop it into tiny bits.",
      "Add the penne to the boiling water and cook for the time on the box, dropping the frozen peas in for the last 2 minutes. Before draining, scoop out a coffee mug of the cooking water.",
      "While the pasta cooks, warm the olive oil in a large skillet over medium heat. Add the zucchini and cook 3 minutes, then add the tomatoes, garlic, and oregano for 2 more.",
      "Drain the pasta and peas and add them to the skillet. Stir, adding splashes of the saved water so everything glides instead of clumping.",
      "Turn off the heat, squeeze the lemon over the top, add a pinch of salt, taste, and serve.",
    ],
  },
  {
    id: "turkey-meatballs", v: "0.1.0", title: "Turkey Meatballs with Spaghetti", time: 35, tags: ["turkey", "pasta"],
    spice: "Add red pepper flakes or Calabrian chile paste.",
    ing: [
      { n: "ground turkey", q: 1, u: "lb", c: "protein" },
      { n: "spaghetti", q: 12, u: "oz", c: "grains" },
      { n: "marinara sauce", q: 1, u: "jar", c: "pantry" },
      { n: "breadcrumbs", q: 0.5, u: "cup", c: "pantry" },
      { n: "Italian seasoning", q: 1, u: "tsp", c: "pantry" },
      { n: "onion powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "eggs", q: 1, u: "", c: "dairy" },
      { n: "parmesan", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Crack the egg into a large bowl. Add the turkey, breadcrumbs, Italian seasoning, onion powder, and half a teaspoon of salt, and mix with clean hands just until combined.",
      "Roll the mix into balls the size of a golf ball and set them on a plate. Wash your hands after.",
      "Warm the olive oil in a large skillet over medium heat. Add the meatballs and turn them every 2 minutes with tongs until browned in spots, about 6 minutes. They finish cooking in the sauce.",
      "Pour the marinara over the meatballs, lower the heat to a gentle bubble, cover, and cook 12 minutes. Poke an instant-read thermometer into the middle of the biggest meatball: 165 F means done.",
      "Meanwhile, boil a large pot of salted water and cook the spaghetti for the time on the box. Drain it in a colander.",
      "Serve the spaghetti topped with meatballs, sauce, and parmesan.",
    ],
  },
  {
    id: "omelet-night", v: "0.1.0", title: "Veggie Omelet Night with Toast", time: 20, tags: ["veggie", "fast"],
    spice: "Add Cholula or Tabasco.",
    ing: [
      { n: "eggs", q: 8, u: "", c: "dairy" },
      { n: "bell pepper", q: 1, u: "", c: "produce" },
      { n: "spinach", q: 2, u: "cup", c: "produce" },
      { n: "garlic powder", q: 0.25, u: "tsp", c: "pantry" },
      { n: "shredded cheddar", q: 1, u: "cup", c: "dairy" },
      { n: "whole grain bread", q: 1, u: "loaf", c: "grains" },
      { n: "butter", q: 2, u: "tbsp", c: "dairy" },
    ],
    steps: [
      "Cut the bell pepper into small cubes. Melt a small pat of the butter in a nonstick skillet over medium heat, cook the pepper 2 minutes, then add the spinach until it wilts, about 1 minute. Scrape onto a plate.",
      "For each omelet, crack 2 eggs into a bowl with a pinch of salt, a small pinch of garlic powder, and a little pepper, and beat with a fork until evenly yellow.",
      "Melt another small pat of butter in the same pan over medium heat and pour in the eggs, tilting the pan so they cover the bottom.",
      "When the edges look set and the top is damp but no longer liquid, about 1 minute, sprinkle a share of the vegetables and cheese over one half.",
      "Slide a spatula under the empty half, fold it over the filling, and slide the omelet onto a plate. Repeat for each person.",
      "Toast the bread, butter it, and serve alongside.",
    ],
  },
  {
    id: "fajita-bowls", v: "0.1.0", title: "Chicken Fajita Bowls", time: 30, tags: ["chicken"],
    spice: "Add Tapatio or sliced jalapenos.",
    ing: [
      { n: "boneless chicken thighs", q: 1.25, u: "lb", c: "protein" },
      { n: "bell pepper", q: 2, u: "", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "fajita seasoning", q: 1, u: "packet", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "garlic powder", q: 0.25, u: "tsp", c: "pantry" },
      { n: "shredded cheddar", q: 1, u: "cup", c: "dairy" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Cut the chicken into finger-width strips. Wash the board, knife, and your hands with soap right after. Cut the peppers and onion into strips too.",
      "Warm the olive oil in your largest skillet over medium-high heat until it shimmers. Add the chicken, sprinkle the fajita seasoning over it, and cook 6 minutes, stirring halfway.",
      "Add the peppers and onion and cook 6 more minutes, stirring now and then, until the vegetables are soft at the edges.",
      "Poke an instant-read thermometer into the thickest strip of chicken: 165 F means done.",
      "Stir half the lime's juice and the garlic powder into the cooked rice. Build bowls: rice on the bottom, chicken and vegetables on top, cheese over that, and a squeeze of the remaining lime.",
    ],
  },
  {
    id: "veggie-minestrone", v: "0.1.0", title: "Weeknight Vegetable Minestrone", time: 35, tags: ["veggie", "vegan", "soup"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "canned cannellini beans", q: 1, u: "can", c: "pantry" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "carrots", q: 2, u: "", c: "produce" },
      { n: "zucchini", q: 1, u: "", c: "produce" },
      { n: "small pasta shells", q: 1, u: "cup", c: "grains" },
      { n: "low-sodium vegetable broth", q: 6, u: "cup", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Peel the carrots. Cut the carrots and zucchini into coin-size pieces.",
      "Warm the olive oil in your largest pot over medium heat for 30 seconds. Add the carrots and zucchini and cook 5 minutes, stirring every minute or two.",
      "Open the beans, rinse them in a colander, and add them with the broth, the oregano, and the tomatoes, juice included. Bring to a gentle bubble and cook 10 minutes.",
      "Add the pasta shells and cook 9 minutes, until one you fish out and blow on is soft.",
      "Squeeze half the lemon in. Taste a cooled spoonful, add salt a pinch at a time until it tastes good, and ladle into bowls.",
    ],
  },
  {
    id: "turkey-bean-chili", v: "0.1.0", title: "Turkey and White Bean Chili", time: 35, tags: ["turkey", "soup"],
    spice: "Add a pinch of cayenne or minced chipotle in adobo.",
    ing: [
      { n: "ground turkey", q: 1, u: "lb", c: "protein" },
      { n: "canned cannellini beans", q: 2, u: "can", c: "pantry" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "frozen corn", q: 1.5, u: "cup", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "chili powder", q: 4.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "low-sodium chicken broth", q: 2, u: "cup", c: "pantry" },
    ],
    steps: [
      "Peel the onion and chop it into small pieces.",
      "Warm the olive oil in your largest pot over medium heat. Add the turkey and onion and cook 6 to 8 minutes, breaking the meat into crumbles with a wooden spoon. Push the meat into a mound and poke an instant-read thermometer into the middle: ground turkey is done at 165 F.",
      "Add the chili powder and cumin and stir for 30 seconds.",
      "Open the beans, rinse them in a colander, and add them with the tomatoes (juice included), corn, and broth. Bring to a gentle bubble and cook 20 minutes, stirring occasionally.",
      "Squeeze half the lime in. Taste a cooled spoonful and add salt a pinch at a time until it tastes right.",
      "Ladle into bowls and let everyone add their own toppings.",
    ],
  },
  {
    id: "chicken-kebab-plates", v: "0.1.0", title: "Oven Chicken and Veggie Kebab Plates", time: 35, tags: ["chicken"],
    spice: "Add Aleppo pepper or harissa.",
    ing: [
      { n: "boneless chicken thighs", q: 1.25, u: "lb", c: "protein" },
      { n: "bell pepper", q: 2, u: "", c: "produce" },
      { n: "zucchini", q: 1, u: "", c: "produce" },
      { n: "red onion", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 0.5, u: "tsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
      { n: "plain Greek yogurt", q: 1, u: "cup", c: "dairy" },
    ],
    steps: [
      "Start the rice following the package directions. Turn the broiler on high and move an oven rack about 6 inches below it. Line a baking sheet with foil.",
      "Cut the chicken, peppers, zucchini, and onion into chunks of roughly the same size, about an inch. Wash the board, knife, and your hands with soap after the chicken.",
      "Toss everything with the olive oil, the oregano, the smoked paprika, a teaspoon of salt, and some pepper, then thread onto skewers or just spread it on the pan.",
      "Broil 6 to 7 minutes, turn everything with tongs, and broil 6 to 7 more, until the edges brown. Poke an instant-read thermometer into the middle of a big chicken chunk: 165 F means done.",
      "Fluff the rice with a fork, squeeze the lemon over the chicken, and serve it all together with the yogurt for dipping.",
    ],
  },
  {
    id: "tofu-nuggets", v: "0.1.0", title: "Crispy Tofu Nuggets with Rice and Cucumbers", time: 30, tags: ["veggie", "vegan"],
    spice: "Add sriracha to the dipping sauce.",
    ing: [
      { n: "extra-firm tofu", q: 1, u: "block", c: "protein" },
      { n: "cornstarch", q: 3, u: "tbsp", c: "pantry" },
      { n: "vegetable oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "maple syrup", q: 2, u: "tbsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "cucumbers", q: 2, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Open the tofu over the sink and pour off the water. Wrap the block in a clean kitchen towel and press it under a heavy plate for 5 minutes.",
      "Cut the tofu into bite-size cubes and toss them gently in a bowl with the cornstarch until white all over.",
      "Heat the oil in a nonstick skillet over medium-high until it shimmers. Add the tofu and turn the pieces every 2 minutes until golden on most sides, about 8 minutes total.",
      "Turn off the heat, pour in the soy sauce and maple syrup with the garlic powder and ground ginger, and stir for 30 seconds until glossy.",
      "Slice the cucumbers into rounds. Serve the tofu over rice with the cucumbers on the side.",
    ],
  },
  {
    id: "sweet-potato-bar", v: "0.1.0", title: "Loaded Sweet Potato Bar", time: 50, tags: ["veggie", "vegan"],
    spice: "Add Cholula or chipotle salsa.",
    ing: [
      { n: "sweet potatoes", q: 4, u: "", c: "produce" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "frozen corn", q: 1, u: "cup", c: "produce" },
      { n: "salsa", q: 1, u: "jar", c: "pantry" },
      { n: "avocados", q: 2, u: "", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "ground cumin", q: 0.5, u: "tsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Heat the oven to 425 F. Wash the sweet potatoes and stab each one a few times with a fork so steam can escape.",
      "Put them right on the oven rack and bake 40 to 45 minutes, until a knife slides into the middle with no resistance. In a hurry: microwave on a plate 10 to 12 minutes, turning once, until the knife test passes, instead.",
      "Near the end, open the beans, rinse them in a colander, and warm them with the corn, the cumin, and a big squeeze of lime in a small pot or in the microwave for 2 minutes.",
      "Cut around each avocado the long way, twist the halves apart, remove the pit with a spoon, and slice. Slice the green onions into thin rings.",
      "Split the potatoes open, squeeze the ends so the insides fluff up, and let everyone load their own toppings: beans and corn, salsa, avocado, and green onions.",
    ],
  },
  {
    id: "pesto-pasta-peas", v: "0.1.0", title: "Pesto Pasta with Peas and Chicken", time: 25, tags: ["chicken", "pasta", "fast"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "rotini pasta", q: 12, u: "oz", c: "grains" },
      { n: "basil pesto", q: 1, u: "jar", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
      { n: "boneless chicken thighs", q: 1, u: "lb", c: "protein" },
      { n: "frozen peas", q: 1.5, u: "cup", c: "produce" },
      { n: "parmesan", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring to a rolling boil.",
      "Cut the chicken into bite-size pieces. Wash the board, knife, and your hands with soap right after.",
      "Add the rotini to the boiling water and cook for the time on the box, dropping the frozen peas in for the last 2 minutes. Scoop out a coffee mug of the cooking water before draining.",
      "While the pasta cooks, warm the olive oil in a large skillet over medium-high heat. Add the chicken in one layer, leave it 4 minutes, then stir and cook 4 more. Poke an instant-read thermometer into a big piece: 165 F means done.",
      "Turn off the heat. Add the drained pasta and peas, the pesto, and a squeeze of half the lemon to the skillet, stirring in splashes of the saved water until everything is coated and glossy.",
      "Top with parmesan and serve.",
    ],
  },
  {
    id: "turkey-burgers", v: "0.1.0", title: "Turkey Burgers with Cucumber Salad", time: 25, tags: ["turkey", "fast"],
    spice: "Add a dash of Frank's RedHot.",
    ing: [
      { n: "ground turkey", q: 1.25, u: "lb", c: "protein" },
      { n: "whole wheat burger buns", q: 4, u: "", c: "grains" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "onion powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "romaine lettuce", q: 1, u: "head", c: "produce" },
      { n: "tomatoes", q: 2, u: "", c: "produce" },
      { n: "cucumbers", q: 2, u: "", c: "produce" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Put the turkey in a bowl with the garlic powder, onion powder, a teaspoon of salt, and some pepper. Mix briefly and shape into patties a little wider than the buns (they shrink), one per bun, pressing a small dimple into the center of each. Wash your hands after.",
      "Slice the cucumbers and tomatoes, and toss them with 1 tablespoon of the olive oil, the juice of the lemon, and a pinch of salt.",
      "Heat the rest of the oil in a large skillet over medium heat. Lay in the patties and cook 5 minutes per side without pressing on them.",
      "Poke an instant-read thermometer through the side of a patty into its middle: ground turkey is done at 165 F. Color alone cannot tell you this, so cook another minute per side and check again if it reads low.",
      "Optional: toast the buns cut-side down in the empty pan for 1 minute.",
      "Build the burgers with lettuce and serve the salad on the side.",
    ],
  },
  {
    id: "chicken-shawarma-bowls", v: "0.10.0", title: "Sheet-Pan Chicken Shawarma Bowls", time: 40, tags: ["chicken"],
    spice: "Add harissa to taste.",
    ing: [
      { n: "boneless chicken thighs", q: 1.5, u: "lb", c: "protein" },
      { n: "canned chickpeas", q: 1, u: "can", c: "pantry" },
      { n: "red onion", q: 1, u: "", c: "produce" },
      { n: "ground cumin", q: 2, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "plain Greek yogurt", q: 1, u: "cup", c: "dairy" },
      { n: "lemon", q: 1, u: "", c: "produce" },
      { n: "pita bread", q: 4, u: "", c: "grains" },
    ],
    steps: [
      "Move an oven rack to the middle and heat the oven to 425 F. Line a large rimmed baking sheet with foil.",
      "Peel the red onion and cut it into thin wedges. Open the chickpeas, pour them into a colander, rinse under the tap, and shake them dry.",
      "Put the chicken, onion, and chickpeas on the pan. Add the olive oil, cumin, smoked paprika, garlic powder, a teaspoon of salt, and some pepper, and mix with your hands until everything is coated. Spread it into a single layer. Wash your hands after touching raw chicken.",
      "Roast 30 minutes without stirring. Poke an instant-read thermometer into the thickest piece of chicken: 165 F means done, and thighs are even better at 175 F.",
      "While it roasts, stir the yogurt in a small bowl with the juice of half the lemon and a pinch of salt. That is your sauce.",
      "Put the pitas in the oven for the last 2 minutes to warm.",
      "Cut the chicken into strips, squeeze the rest of the lemon over the pan, and build bowls with torn pita, chicken, chickpeas, onion, and a spoon of yogurt sauce.",
    ],
  },
  {
    id: "chicken-tortilla-soup", v: "0.10.0", title: "Chicken Tortilla Soup", time: 35, tags: ["chicken", "soup"],
    spice: "Add Valentina or sliced jalapenos.",
    ing: [
      { n: "boneless chicken thighs", q: 1, u: "lb", c: "protein" },
      { n: "low-sodium chicken broth", q: 6, u: "cup", c: "pantry" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "frozen corn", q: 1.5, u: "cup", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "chili powder", q: 3, u: "tsp", c: "pantry" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "avocados", q: 1, u: "", c: "produce" },
      { n: "tortilla chips", q: 1, u: "bag", c: "grains" },
    ],
    steps: [
      "Peel the onion and chop it into small pieces.",
      "Warm the olive oil in your largest pot over medium heat. Add the onion and cook 4 minutes, stirring now and then, until it looks glassy instead of white.",
      "Stir in the chili powder and cumin for 30 seconds, then pour in all the broth and add the chicken thighs whole. Bring to a gentle bubble and cook 15 minutes.",
      "Poke an instant-read thermometer into the thickest thigh: at 165 F it is done. Lift it onto a plate, shred it with two forks, and return the shreds to the pot.",
      "Open the beans, rinse them in a colander, and add them with the tomatoes, juice included, and the corn. Cook 5 more minutes.",
      "Squeeze half the lime in. Taste a cooled spoonful and add salt a pinch at a time until it tastes good to you.",
      "Slice the avocado. Ladle the soup into bowls and let everyone crush tortilla chips over the top.",
    ],
  },
  {
    id: "teriyaki-chicken-bowls", v: "0.10.0", title: "Teriyaki Chicken Rice Bowls", time: 25, tags: ["chicken", "fast"],
    spice: "Add sriracha to taste.",
    ing: [
      { n: "boneless chicken thighs", q: 1.25, u: "lb", c: "protein" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "low-sodium soy sauce", q: 4, u: "tbsp", c: "pantry" },
      { n: "honey", q: 3, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 1, u: "tbsp", c: "pantry" },
      { n: "cornstarch", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "garlic", q: 2, u: "clove", c: "produce" },
      { n: "frozen broccoli florets", q: 1, u: "bag", c: "produce" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Cut the chicken into bite-size pieces. Wash the board, knife, and your hands with soap right after.",
      "Peel the garlic and chop it into tiny bits. Stir the soy sauce, honey, rice vinegar, ground ginger, garlic, cornstarch, and 3 tablespoons of water together in a small bowl until no lumps are left.",
      "Heat the oil in your largest skillet over medium-high until it shimmers. Add the chicken in one layer, leave it 3 minutes, then stir and cook 3 more.",
      "Add the frozen broccoli straight from the bag with a splash of water, cover, and cook 4 minutes.",
      "Stir the sauce again (the cornstarch settles to the bottom) and pour it in. Let it bubble 1 to 2 minutes until it turns glossy and clings to the chicken. Poke an instant-read thermometer into the biggest piece: 165 F means done.",
      "Spoon everything over the rice.",
    ],
  },
  {
    id: "bbq-chicken-sheetpan", v: "0.10.0", title: "Sheet-Pan BBQ Chicken and Potatoes", time: 45, tags: ["chicken"],
    spice: "Swap in a spicier barbecue sauce.",
    ing: [
      { n: "boneless chicken thighs", q: 1.5, u: "lb", c: "protein" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "green beans", q: 0.75, u: "lb", c: "produce" },
      { n: "barbecue sauce", q: 1, u: "bottle", c: "pantry" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "smoked paprika", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
    ],
    steps: [
      "Move an oven rack to the middle and heat the oven to 425 F. Line a large rimmed baking sheet with foil. Do not skip the foil here, because barbecue sauce bakes onto a bare pan like glue.",
      "Rinse the potatoes and cut each one in half. Toss them on the pan with 1 tablespoon of the olive oil, the smoked paprika, the garlic powder, and a big pinch of salt, then push them to one side.",
      "Put the chicken on the empty side, rub it with the rest of the oil and a teaspoon of salt, and wash your hands.",
      "Roast 20 minutes. Set a timer.",
      "Snap the stem ends off the green beans. Scatter them over the pan, then brush the chicken generously with barbecue sauce.",
      "Roast 15 more minutes. Poke an instant-read thermometer into the thickest piece of chicken: 165 F means done, and 175 F makes thighs even more tender.",
      "Serve with more barbecue sauce on the side.",
    ],
  },
  {
    id: "sesame-noodles-chicken", v: "0.10.0", title: "Sesame Noodles with Chicken and Cucumber", time: 25, tags: ["chicken", "pasta", "fast"],
    spice: "Add chili crisp or sriracha.",
    ing: [
      { n: "spaghetti", q: 12, u: "oz", c: "grains" },
      { n: "boneless chicken thighs", q: 1, u: "lb", c: "protein" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "toasted sesame oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "honey", q: 1, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 1, u: "tbsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "cucumbers", q: 2, u: "", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring it to a rolling boil over high heat.",
      "Cut the chicken into bite-size pieces. Wash the board, knife, and your hands with soap right after.",
      "Stir the soy sauce, sesame oil, honey, rice vinegar, and garlic powder together in a small bowl. Slice the cucumbers into thin half-moons and the green onions into rings.",
      "Add the spaghetti to the boiling water and cook for the time on the box. Before draining, scoop out a coffee mug of the cooking water.",
      "While the pasta cooks, heat the vegetable oil in a large skillet over medium-high. Add the chicken in one layer, leave it 4 minutes, then stir and cook 4 more. Poke an instant-read thermometer into a big piece: 165 F means done.",
      "Turn off the heat. Add the drained spaghetti and the sauce to the skillet and toss, loosening with splashes of the saved water until the noodles are slick instead of sticky.",
      "Pile the cucumbers and green onions on top. This one is good hot or at room temperature.",
    ],
  },
  {
    id: "lemon-orzo-chicken-soup", v: "0.10.0", title: "Lemon Orzo Chicken Soup", time: 35, tags: ["chicken", "soup"],
    spice: "Add black pepper and red pepper flakes.",
    ing: [
      { n: "boneless chicken thighs", q: 1, u: "lb", c: "protein" },
      { n: "orzo", q: 1, u: "cup", c: "grains" },
      { n: "low-sodium chicken broth", q: 8, u: "cup", c: "pantry" },
      { n: "carrots", q: 3, u: "", c: "produce" },
      { n: "celery", q: 3, u: "stalk", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "spinach", q: 3, u: "cup", c: "produce" },
      { n: "dried oregano", q: 0.5, u: "tsp", c: "pantry" },
      { n: "lemon", q: 2, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Peel the carrots and onion. Cut the carrots and celery into coin-size pieces and chop the onion into small bits.",
      "Warm the olive oil in your largest pot over medium heat for 30 seconds. Add the carrots, celery, and onion and cook 5 minutes, stirring every minute or two.",
      "Pour in all the broth, add the chicken thighs whole and the oregano, and bring to a gentle bubble. Cook 15 minutes.",
      "Poke an instant-read thermometer into the thickest thigh: at 165 F it is done. Lift it onto a plate, shred it with two forks, and return the shreds to the pot.",
      "Add the orzo and cook 8 minutes, stirring now and then so it does not stick to the bottom, until one you fish out and blow on is soft.",
      "Turn off the heat. Stir in the spinach until the leaves go dark, then squeeze in the juice of both lemons. Taste a cooled spoonful and add salt a pinch at a time until it tastes bright.",
    ],
  },
  {
    id: "honey-mustard-chicken", v: "0.10.0", title: "Honey-Mustard Chicken with Green Beans", time: 40, tags: ["chicken"],
    spice: "Add a pinch of cayenne to the glaze.",
    ing: [
      { n: "boneless chicken thighs", q: 1.5, u: "lb", c: "protein" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "green beans", q: 0.75, u: "lb", c: "produce" },
      { n: "Dijon mustard", q: 3, u: "tbsp", c: "pantry" },
      { n: "honey", q: 3, u: "tbsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "dried thyme", q: 0.5, u: "tsp", c: "pantry" },
    ],
    steps: [
      "Move an oven rack to the middle and heat the oven to 425 F. Line a large rimmed baking sheet with foil.",
      "Stir the Dijon, honey, 1 tablespoon of the olive oil, the garlic powder, and the thyme together in a small bowl.",
      "Rinse the potatoes and cut each one in half. Toss them on the pan with the rest of the oil and a big pinch of salt, and spread them out flat. Roast 15 minutes.",
      "Push the potatoes to one side of the pan. Lay the chicken on the empty side, spoon the honey-mustard over it, and wash your hands after touching raw chicken.",
      "Roast 15 minutes.",
      "Snap the stem ends off the green beans, scatter them around the pan, and roast 8 more minutes. Poke an instant-read thermometer into the thickest piece of chicken: 165 F means done, 175 F for extra-tender thighs.",
    ],
  },
  {
    id: "chicken-enchilada-skillet", v: "0.10.0", title: "Chicken Enchilada Skillet", time: 30, tags: ["chicken"],
    spice: "Add Tapatio or sliced jalapenos.",
    ing: [
      { n: "boneless chicken thighs", q: 1.25, u: "lb", c: "protein" },
      { n: "small corn tortillas", q: 8, u: "", c: "grains" },
      { n: "enchilada sauce", q: 1, u: "can", c: "pantry" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "frozen corn", q: 1, u: "cup", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "shredded cheddar", q: 1, u: "cup", c: "dairy" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Cut the chicken into bite-size pieces and chop the onion small. Wash the board, knife, and your hands with soap right after the chicken.",
      "Warm the olive oil in your largest skillet over medium-high heat. Add the chicken and onion and cook 7 minutes, stirring twice.",
      "Sprinkle in the cumin and stir 30 seconds. Poke an instant-read thermometer into the biggest piece of chicken: 165 F means done.",
      "Open the beans, rinse them in a colander, and stir them in with the corn and the enchilada sauce. Let it bubble gently 3 minutes.",
      "Stack the tortillas, cut them into strips about an inch wide, and fold them into the skillet so they soften in the sauce, about 3 minutes.",
      "Turn off the heat and squeeze in half the lime. Sprinkle cheese over the side of the pan belonging to whoever wants it, and serve straight from the skillet.",
    ],
  },
  {
    id: "coconut-butter-chicken", v: "0.10.0", title: "Mild Coconut Butter Chicken", time: 35, tags: ["chicken"],
    spice: "Add a pinch of cayenne.",
    ing: [
      { n: "boneless chicken thighs", q: 1.5, u: "lb", c: "protein" },
      { n: "canned tomato sauce", q: 1, u: "can", c: "pantry" },
      { n: "light coconut milk", q: 1, u: "can", c: "pantry" },
      { n: "garam masala", q: 3, u: "tsp", c: "pantry" },
      { n: "mild curry powder", q: 1, u: "tsp", c: "pantry" },
      { n: "ground ginger", q: 0.5, u: "tsp", c: "pantry" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "butter", q: 2, u: "tbsp", c: "dairy" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Cut the chicken into bite-size pieces. Wash the board, knife, and your hands with soap right after. Peel and chop the onion small and chop the garlic into tiny bits.",
      "Melt the butter in your largest skillet over medium heat. Add the onion and cook 5 minutes until glassy, then add the garlic, garam masala, curry powder, and ground ginger and stir 30 seconds until they smell toasty.",
      "Add the chicken and stir to coat, then pour in the tomato sauce and the coconut milk. Stir and bring to a gentle bubble.",
      "Cook uncovered 15 minutes, stirring every few minutes, until the sauce darkens and thickens enough to coat the back of a spoon.",
      "Poke an instant-read thermometer into the biggest piece of chicken: 165 F means done. Squeeze in half the lemon, add salt to taste, and spoon over the rice.",
    ],
  },
  {
    id: "turkey-sloppy-joes", v: "0.10.0", title: "Turkey Sloppy Joes", time: 25, tags: ["turkey", "fast"],
    spice: "Add a dash of Frank's RedHot.",
    ing: [
      { n: "ground turkey", q: 1.25, u: "lb", c: "protein" },
      { n: "canned tomato sauce", q: 1, u: "can", c: "pantry" },
      { n: "ketchup", q: 0.25, u: "cup", c: "pantry" },
      { n: "Dijon mustard", q: 1, u: "tbsp", c: "pantry" },
      { n: "brown sugar", q: 3, u: "tsp", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "bell pepper", q: 1, u: "", c: "produce" },
      { n: "chili powder", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "whole wheat burger buns", q: 4, u: "", c: "grains" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Peel the onion and chop it small. Cut the bell pepper in half, pull out the stem, seeds, and white ribs, and chop it small too.",
      "Warm the olive oil in a large skillet over medium heat. Add the onion and pepper and cook 4 minutes, stirring now and then.",
      "Add the turkey and cook 7 minutes, breaking it into small crumbles with a wooden spoon. Push the meat into a mound at one side of the pan and poke an instant-read thermometer into the middle: ground turkey is done at 165 F.",
      "Stir in the chili powder and garlic powder for 30 seconds, then add the tomato sauce, ketchup, Dijon, and brown sugar.",
      "Let it bubble gently 8 minutes, stirring now and then, until it thickens enough to sit on a spoon instead of running off. Taste and add salt a pinch at a time.",
      "Toast the buns cut-side down in a dry pan for a minute, then spoon the filling in.",
    ],
  },
  {
    id: "turkey-stuffed-peppers", v: "0.10.0", title: "Turkey and Rice Stuffed Peppers", time: 50, tags: ["turkey"],
    spice: "Add a dash of Tabasco.",
    ing: [
      { n: "ground turkey", q: 1, u: "lb", c: "protein" },
      { n: "bell pepper", q: 4, u: "", c: "produce" },
      { n: "white rice", q: 1, u: "cup", c: "grains" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "Italian seasoning", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "low-sodium chicken broth", q: 1, u: "cup", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "shredded cheddar", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Start the rice following the package directions. Heat the oven to 400 F.",
      "Cut the peppers in half through the stem and pull out the seeds and white ribs. Stand them cut-side up in a baking dish.",
      "Peel and chop the onion small. Warm the olive oil in a large skillet over medium heat, add the onion, and cook 4 minutes.",
      "Add the turkey, the Italian seasoning, the garlic powder, and a teaspoon of salt, and cook 7 minutes, breaking the meat into crumbles. Push it into a mound and poke an instant-read thermometer into the middle: ground turkey is done at 165 F.",
      "Stir in the cooked rice and the tomatoes with their juice, then spoon the mix into the pepper halves, mounding it up.",
      "Pour the broth into the bottom of the dish, cover it tightly with foil, and bake 35 minutes, until a knife slides through a pepper wall easily.",
      "Uncover, sprinkle cheese on the halves that want it, and bake 5 more minutes.",
    ],
  },
  {
    id: "turkey-meatball-soup", v: "0.10.0", title: "Turkey Meatball and Orzo Soup", time: 40, tags: ["turkey", "soup"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "ground turkey", q: 1, u: "lb", c: "protein" },
      { n: "breadcrumbs", q: 0.5, u: "cup", c: "pantry" },
      { n: "eggs", q: 1, u: "", c: "dairy" },
      { n: "orzo", q: 0.75, u: "cup", c: "grains" },
      { n: "low-sodium chicken broth", q: 8, u: "cup", c: "pantry" },
      { n: "carrots", q: 3, u: "", c: "produce" },
      { n: "celery", q: 2, u: "stalk", c: "produce" },
      { n: "spinach", q: 3, u: "cup", c: "produce" },
      { n: "Italian seasoning", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Crack the egg into a large bowl. Add the turkey, breadcrumbs, Italian seasoning, garlic powder, and half a teaspoon of salt, and mix with clean hands just until combined.",
      "Roll the mix into small balls about the size of a walnut and set them on a plate. Wash your hands after.",
      "Peel the carrots. Cut the carrots and celery into coin-size pieces. Warm the olive oil in your largest pot over medium heat and cook them 5 minutes, stirring now and then.",
      "Pour in all the broth and bring it to a gentle bubble. Lower the meatballs in one at a time and cook 10 minutes, stirring as little as possible so they hold together.",
      "Add the orzo and cook 8 more minutes. Poke an instant-read thermometer into the middle of the biggest meatball: 165 F means done.",
      "Turn off the heat, stir in the spinach until the leaves go dark, and squeeze in half the lemon. Taste a cooled spoonful and add salt a pinch at a time.",
    ],
  },
  {
    id: "turkey-egg-roll-bowls", v: "0.10.0", title: "Turkey Egg Roll Bowls", time: 25, tags: ["turkey", "fast"],
    spice: "Add sriracha or chili crisp.",
    ing: [
      { n: "ground turkey", q: 1.25, u: "lb", c: "protein" },
      { n: "coleslaw mix", q: 1, u: "bag", c: "produce" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "toasted sesame oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 0.5, u: "tsp", c: "pantry" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Peel the garlic and chop it into tiny bits. Slice the green onions into thin rings. Stir the soy sauce, sesame oil, rice vinegar, and ground ginger together in a small bowl.",
      "Heat the vegetable oil in your largest skillet over medium-high. Add the turkey and cook 8 minutes, breaking it into crumbles with a wooden spoon. Push the meat into a mound and poke an instant-read thermometer into the middle: ground turkey is done at 165 F.",
      "Add the garlic and stir for 30 seconds.",
      "Dump in the coleslaw mix and cook 5 minutes, stirring often, until the cabbage wilts down but still has a little crunch.",
      "Pour in the sauce, stir 1 minute, and turn off the heat. Serve over the rice with the green onions scattered on top.",
    ],
  },
  {
    id: "red-lentil-soup", v: "0.10.0", title: "Red Lentil and Coconut Soup", time: 35, tags: ["veggie", "vegan", "soup"],
    spice: "Add a pinch of cayenne.",
    ing: [
      { n: "red lentils", q: 1.5, u: "cup", c: "pantry" },
      { n: "light coconut milk", q: 1, u: "can", c: "pantry" },
      { n: "low-sodium vegetable broth", q: 6, u: "cup", c: "pantry" },
      { n: "carrots", q: 3, u: "", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "mild curry powder", q: 3, u: "tsp", c: "pantry" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "spinach", q: 3, u: "cup", c: "produce" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Peel the carrots and onion. Chop the onion small and cut the carrots into coin-size pieces. Peel the garlic and chop it into tiny bits.",
      "Warm the olive oil in your largest pot over medium heat. Add the onion and carrots and cook 5 minutes, stirring now and then.",
      "Add the garlic, curry powder, and cumin and stir 30 seconds until they smell toasty.",
      "Pour the lentils into a colander and rinse them under the tap. Add them to the pot with all the broth and the coconut milk.",
      "Bring to a gentle bubble and cook 20 minutes, stirring every few minutes so nothing sticks to the bottom, until the lentils have fallen apart and the soup is thick.",
      "Turn off the heat, stir in the spinach until the leaves go dark, and squeeze in half the lime. Taste a cooled spoonful and add salt a pinch at a time.",
    ],
  },
  {
    id: "peanut-noodles-tofu", v: "0.10.0", title: "Peanut Noodles with Tofu and Edamame", time: 25, tags: ["veggie", "vegan", "pasta", "fast"],
    spice: "Add sriracha or chili crisp.",
    ing: [
      { n: "spaghetti", q: 12, u: "oz", c: "grains" },
      { n: "extra-firm tofu", q: 1, u: "block", c: "protein" },
      { n: "creamy peanut butter", q: 0.5, u: "cup", c: "pantry" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 2, u: "tbsp", c: "pantry" },
      { n: "toasted sesame oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "maple syrup", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "cornstarch", q: 2, u: "tbsp", c: "pantry" },
      { n: "frozen shelled edamame", q: 1.5, u: "cup", c: "produce" },
      { n: "cucumbers", q: 1, u: "", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "vegetable oil", q: 2, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring it to a rolling boil over high heat.",
      "Open the tofu over the sink and pour off the water. Wrap the block in a clean kitchen towel and press it under a heavy plate for 5 minutes, then cut it into bite-size cubes and toss them gently with the cornstarch until white all over.",
      "In a bowl, stir the peanut butter, soy sauce, rice vinegar, sesame oil, maple syrup, and ground ginger together, then stir in warm water a spoonful at a time until the sauce is smooth and pourable, about 6 tablespoons for the full recipe.",
      "Cook the spaghetti for the time on the box, dropping the frozen edamame in for the last 3 minutes. Scoop out a coffee mug of the cooking water before draining.",
      "While the pasta cooks, heat the vegetable oil in a nonstick skillet over medium-high until it shimmers. Add the tofu and turn the pieces every 2 minutes until golden on most sides, about 8 minutes total.",
      "Toss the drained noodles and edamame with the peanut sauce back in the big pot, loosening with splashes of the saved water until everything is evenly coated.",
      "Slice the cucumber into thin half-moons and the green onions into rings, and scatter both over the top along with the tofu.",
    ],
  },
  {
    id: "black-bean-burgers", v: "0.10.0", title: "Black Bean Burgers with Oven Fries", time: 50, tags: ["veggie", "vegan"],
    spice: "Add Cholula or sliced jalapenos.",
    ing: [
      { n: "canned black beans", q: 2, u: "can", c: "pantry" },
      { n: "rolled oats", q: 1, u: "cup", c: "grains" },
      { n: "russet potatoes", q: 2, u: "", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 1, u: "tsp", c: "pantry" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "whole wheat burger buns", q: 4, u: "", c: "grains" },
      { n: "romaine lettuce", q: 1, u: "head", c: "produce" },
      { n: "tomatoes", q: 1, u: "", c: "produce" },
      { n: "ketchup", q: 0.25, u: "cup", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Heat the oven to 425 F and line two baking sheets with foil.",
      "Scrub the potatoes (no peeling needed) and cut them into fries about as thick as your finger. Toss with 2 tablespoons of the olive oil and a big pinch of salt on one pan, spread them flat, and roast 30 minutes, flipping once with a spatula halfway.",
      "Open the beans, rinse them in a colander, and shake them very dry. Spread them on the second pan and bake 10 minutes to dry them out. This step is what keeps the burgers from turning to mush.",
      "Tip the beans into a big bowl and mash them with a fork or potato masher until most are broken but some whole ones remain. Peel and finely chop the onion and stir it in with the oats, cumin, smoked paprika, garlic powder, and a teaspoon of salt.",
      "Squeeze the mix into palm-size patties, one per bun, packing them tight so they hold. Wipe the bean pan, brush it with the last tablespoon of olive oil, and set the patties on it.",
      "Bake 12 minutes, flip carefully with a thin spatula, and bake 12 more, until the outsides are firm and dry to the touch.",
      "Build the burgers on the buns with lettuce, sliced tomato, and ketchup, and serve the fries alongside.",
    ],
  },
  {
    id: "shakshuka", v: "0.10.0", title: "Skillet Eggs in Spiced Tomato Sauce", time: 30, tags: ["veggie"],
    spice: "Add harissa or a pinch of cayenne.",
    ing: [
      { n: "eggs", q: 8, u: "", c: "dairy" },
      { n: "canned crushed tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "bell pepper", q: 2, u: "", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 1, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "whole grain bread", q: 1, u: "loaf", c: "grains" },
    ],
    steps: [
      "Cut the peppers in half, pull out the stems, seeds, and white ribs, and slice them into thin strips. Peel and chop the onion small and chop the garlic into tiny bits.",
      "Warm the olive oil in a large skillet over medium heat. Add the peppers and onion and cook 8 minutes, stirring now and then, until they are soft and floppy.",
      "Add the garlic, cumin, and smoked paprika and stir 30 seconds until they smell toasty.",
      "Pour in the crushed tomatoes with a teaspoon of salt. Let it bubble gently for 10 minutes, stirring often, until it thickens enough that dragging a spoon through leaves a trench for a second.",
      "Make a shallow well in the sauce with the back of a spoon for each egg, and crack one into each.",
      "Cover the pan, turn the heat to medium-low, and cook 7 to 10 minutes. The whites should be firm and no longer see-through; the yolks can be as runny or set as you like.",
      "Toast the bread and serve it alongside for scooping.",
    ],
  },
  {
    id: "sweet-potato-tacos", v: "0.10.0", title: "Sweet Potato and Black Bean Tacos", time: 40, tags: ["veggie", "vegan"],
    spice: "Add Tapatio or Cholula.",
    ing: [
      { n: "sweet potatoes", q: 3, u: "", c: "produce" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "small corn tortillas", q: 8, u: "", c: "grains" },
      { n: "ground cumin", q: 1.5, u: "tsp", c: "pantry" },
      { n: "chili powder", q: 1, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 0.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "romaine lettuce", q: 1, u: "head", c: "produce" },
      { n: "avocados", q: 1, u: "", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Heat the oven to 425 F and line a large rimmed baking sheet with foil.",
      "Scrub the sweet potatoes (no peeling needed) and cut them into cubes about an inch across. Toss them on the pan with 2 tablespoons of the olive oil, the cumin, chili powder, smoked paprika, and a teaspoon of salt, then spread them into a single layer.",
      "Roast 30 minutes, turning everything with a spatula halfway through, until the edges are browned and a fork slides into a cube with no resistance.",
      "Near the end, open the beans, rinse them in a colander, and warm them in a small pot with the last tablespoon of olive oil and a squeeze of lime, about 3 minutes.",
      "Cut the lettuce into thin ribbons and slice the green onions into rings. Cut around the avocado the long way, twist the halves apart, remove the pit with a spoon, and slice the flesh.",
      "Warm the tortillas 20 seconds in the microwave under a damp paper towel, or 30 seconds per side in a dry pan.",
      "Build tacos with sweet potato, beans, lettuce, avocado, and green onion, and squeeze the rest of the lime over the top.",
    ],
  },
  {
    id: "pasta-e-ceci", v: "0.10.0", title: "Chickpea and Tomato Pasta Stew", time: 30, tags: ["veggie", "vegan", "pasta", "soup"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "canned chickpeas", q: 2, u: "can", c: "pantry" },
      { n: "small pasta shells", q: 1.5, u: "cup", c: "grains" },
      { n: "canned crushed tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "low-sodium vegetable broth", q: 4, u: "cup", c: "pantry" },
      { n: "garlic", q: 4, u: "clove", c: "produce" },
      { n: "dried rosemary", q: 0.5, u: "tsp", c: "pantry" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Peel the garlic and chop it into tiny bits.",
      "Warm 2 tablespoons of the olive oil in your largest pot over medium heat. Add the garlic, rosemary, and oregano and stir for 1 minute, until fragrant but not browned. Browned garlic turns bitter, so keep it moving.",
      "Open the chickpeas, rinse them in a colander, and add them to the pot. Mash about a third of them against the side with a wooden spoon; that is what makes the broth creamy without any cream.",
      "Add the crushed tomatoes and all the broth, bring to a gentle bubble, and cook 10 minutes.",
      "Add the pasta shells and cook 10 more minutes, stirring often so they do not stick, until one you fish out and blow on is soft. It should look like a loose stew, so add a splash of water if it tightens too much.",
      "Turn off the heat, squeeze in half the lemon, drizzle the last tablespoon of olive oil over the top, and salt to taste.",
    ],
  },
  {
    id: "veggie-lo-mein", v: "0.10.0", title: "Veggie Lo Mein", time: 25, tags: ["veggie", "vegan", "pasta", "fast"],
    spice: "Add sriracha or chili crisp.",
    ing: [
      { n: "spaghetti", q: 12, u: "oz", c: "grains" },
      { n: "frozen stir-fry vegetables", q: 1, u: "bag", c: "produce" },
      { n: "low-sodium soy sauce", q: 4, u: "tbsp", c: "pantry" },
      { n: "toasted sesame oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "brown sugar", q: 1, u: "tsp", c: "pantry" },
      { n: "ground ginger", q: 0.25, u: "tsp", c: "pantry" },
      { n: "cornstarch", q: 0.5, u: "tbsp", c: "pantry" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "vegetable oil", q: 2, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Fill your largest pot two-thirds with water, add a tablespoon of salt, cover, and bring it to a rolling boil. Cook the spaghetti for the time on the box, then drain it in a colander.",
      "While the water heats, peel the garlic and chop it into tiny bits, and slice the green onions into thin rings.",
      "Stir the soy sauce, sesame oil, brown sugar, ground ginger, cornstarch, and 3 tablespoons of water together in a small bowl until no lumps are left.",
      "Heat the vegetable oil in your largest skillet over medium-high until it shimmers. Add the frozen vegetables straight from the bag and cook 5 minutes, stirring often, until they are hot and the water they release has cooked off.",
      "Add the garlic and stir for 30 seconds.",
      "Add the drained spaghetti, stir the sauce again, and pour it in. Toss for 2 minutes until the noodles are coated and no liquid pools in the bottom of the pan. Scatter the green onions over the top.",
    ],
  },
  {
    id: "potato-pea-curry", v: "0.10.0", title: "Potato and Pea Curry", time: 40, tags: ["veggie", "vegan"],
    spice: "Add a pinch of cayenne.",
    ing: [
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "frozen peas", q: 1.5, u: "cup", c: "produce" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "light coconut milk", q: 1, u: "can", c: "pantry" },
      { n: "mild curry powder", q: 3, u: "tsp", c: "pantry" },
      { n: "garam masala", q: 1, u: "tsp", c: "pantry" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "lime", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice following the package directions.",
      "Rinse the potatoes and cut them into quarters so every piece is roughly bite-size. Peel and chop the onion small and chop the garlic into tiny bits.",
      "Warm the olive oil in a large pot over medium heat. Add the onion and cook 4 minutes until glassy, then add the garlic, curry powder, garam masala, and cumin and stir 30 seconds until they smell toasty.",
      "Add the potatoes, the tomatoes with their juice, and the coconut milk. Stir and bring to a gentle bubble.",
      "Cover and cook 18 to 20 minutes, stirring now and then, until a fork slides into a potato piece with no resistance.",
      "Stir in the frozen peas and cook 3 more minutes. Squeeze in half the lime, add salt to taste, and spoon over the rice.",
    ],
  },
  {
    id: "falafel-bowls", v: "0.10.0", title: "Baked Chickpea Patty Bowls", time: 40, tags: ["veggie"],
    spice: "Add harissa to taste.",
    ing: [
      { n: "canned chickpeas", q: 2, u: "can", c: "pantry" },
      { n: "fresh parsley", q: 1, u: "bunch", c: "produce" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "ground cumin", q: 2, u: "tsp", c: "pantry" },
      { n: "all-purpose flour", q: 3, u: "tbsp", c: "pantry" },
      { n: "baking powder", q: 0.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "cucumbers", q: 2, u: "", c: "produce" },
      { n: "tomatoes", q: 2, u: "", c: "produce" },
      { n: "plain Greek yogurt", q: 1, u: "cup", c: "dairy" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice following the package directions. Heat the oven to 400 F. Line a baking sheet with foil and brush it with 1 tablespoon of the olive oil.",
      "Open the chickpeas, rinse them in a colander, and shake them as dry as you can. Peel the onion and cut it into chunks, and peel the garlic.",
      "Put the chickpeas, onion, garlic, the parsley (leaves and thin stems both), the cumin, a teaspoon of salt, the flour, and the baking powder in a food processor. Pulse until it looks like coarse crumbs that hold together when you squeeze a handful. No food processor? Mash the chickpeas with a fork, chop the onion, garlic, and parsley very fine, and mix it all by hand.",
      "Scoop the mix into golf-ball-size balls, about three per person, and press each into a patty about half an inch thick on the pan. Brush the tops with another tablespoon of olive oil.",
      "Bake 25 minutes, flipping halfway with a thin spatula, until both sides are golden and firm to the touch.",
      "Meanwhile, chop the cucumbers and tomatoes and toss them with the last tablespoon of olive oil, the juice of half the lemon, and a pinch of salt.",
      "Stir the yogurt with the rest of the lemon juice and a pinch of salt. Build bowls: rice, patties, salad, and a spoon of sauce.",
    ],
  },
  {
    id: "sheetpan-lemon-salmon", v: "0.16.0", title: "Sheet-Pan Lemon Salmon with Potatoes and Green Beans", time: 35, tags: ["fish"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "salmon fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "green beans", q: 1, u: "lb", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 2, u: "", c: "produce" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "dried thyme", q: 1, u: "tsp", c: "pantry" },
    ],
    steps: [
      "Heat the oven to 425 F. Halve the baby potatoes (quarter any bigger than a golf ball) and toss them on a sheet pan with 2 tablespoons of the olive oil, the thyme, and half a teaspoon of salt. Roast 15 minutes.",
      "While the potatoes roast, snap the stem ends off the green beans and pat the salmon dry with a paper towel. Wash your hands after handling the raw fish.",
      "Pull the pan out, push the potatoes to one side, and lay the green beans and the salmon (skin-side down) in the cleared space. Drizzle the rest of the oil over them and sprinkle the garlic powder and a pinch of salt over everything.",
      "Slice half of the lemons into thin rounds and lay them on the salmon; save the rest for serving. Roast 12 to 15 minutes more.",
      "Poke an instant-read thermometer into the thickest part of the salmon: fish is done at 145 F, and it should flake when you drag a fork across it. Roast 3 more minutes and check again if it reads low.",
      "Cut the saved lemons into wedges, squeeze them over everything, and serve straight from the pan.",
    ],
  },
  {
    id: "honey-garlic-salmon", v: "0.16.0", title: "Honey-Garlic Salmon with Broccoli and Rice", time: 25, tags: ["fish", "fast"],
    spice: "Add sriracha to taste.",
    ing: [
      { n: "salmon fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "broccoli", q: 1, u: "head", c: "produce" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "honey", q: 2, u: "tbsp", c: "pantry" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "ground ginger", q: 0.5, u: "tsp", c: "pantry" },
      { n: "vegetable oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Start the rice: rinse it in a strainer, then put it in a small pot with double its volume of water and a pinch of salt. Bring to a boil, cover, and turn the heat to low for 15 minutes. No peeking.",
      "Cut the broccoli into bite-size florets. Cut the salmon into pieces about the size of a deck of cards, pat them dry, and sprinkle with a pinch of salt. Wash your hands after handling the raw fish.",
      "Peel and mince the garlic, then stir it in a cup with the soy sauce, honey, and ground ginger.",
      "Heat the oil in a large skillet over medium-high heat. Lay the salmon in skin-side up and cook 3 minutes without moving it, then flip and cook 3 minutes more. Meanwhile, microwave the broccoli in a covered bowl with a splash of water for 3 to 4 minutes until bright green and just tender.",
      "Add the broccoli to the skillet, pour the sauce over everything, turn the heat to medium-low, and let it bubble 2 minutes, spooning sauce over the salmon as it thickens.",
      "Poke an instant-read thermometer into the thickest piece: fish is done at 145 F and flakes with a fork. Serve over the rice, with the lemon cut into wedges for squeezing.",
    ],
  },
  {
    id: "fish-tacos", v: "0.16.0", title: "Crispy Baked Fish Tacos with Slaw", time: 35, tags: ["fish"],
    spice: "Add Tapatio or Valentina.",
    ing: [
      { n: "cod fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "small corn tortillas", q: 8, u: "", c: "grains" },
      { n: "panko breadcrumbs", q: 1.5, u: "cup", c: "pantry" },
      { n: "all-purpose flour", q: 4, u: "tbsp", c: "pantry" },
      { n: "eggs", q: 2, u: "", c: "dairy" },
      { n: "coleslaw mix", q: 1, u: "bag", c: "produce" },
      { n: "plain Greek yogurt", q: 0.75, u: "cup", c: "dairy" },
      { n: "lime", q: 2, u: "", c: "produce" },
      { n: "chili powder", q: 1, u: "tsp", c: "pantry" },
      { n: "ground cumin", q: 0.5, u: "tsp", c: "pantry" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "avocados", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Heat the oven to 425 F. Stir the panko with the olive oil and a pinch of salt on a sheet pan, toast it in the oven for 3 minutes until barely golden, and pour it into a shallow bowl. Stir the chili powder and cumin into it.",
      "Cut the cod into strips about as wide as two fingers. Set up two more shallow bowls: the flour in one, the eggs beaten in the other.",
      "Coat each strip: roll it in flour, dip it in egg, then press it into the panko on all sides. Line the strips up on the sheet pan with space between them. Wash your hands after handling the raw fish.",
      "Bake 12 to 15 minutes until golden. Poke an instant-read thermometer into the thickest strip: fish is done at 145 F and flakes with a fork.",
      "While the fish bakes, stir the yogurt with the juice of half the limes and a pinch of salt. Toss half of that dressing with the coleslaw mix; the rest is drizzle.",
      "Wrap the tortillas in a damp paper towel and microwave 30 seconds. Slice the avocados.",
      "Build the tacos: slaw, fish, a couple of avocado slices each, a drizzle of dressing, and the rest of the limes in wedges.",
    ],
  },
  {
    id: "tuna-patties", v: "0.16.0", title: "Crispy Tuna Patties with Lemon Yogurt Sauce", time: 25, tags: ["fish", "fast"],
    spice: "Add a dash of Tabasco to the yogurt sauce.",
    ing: [
      { n: "canned tuna", q: 3, u: "can", c: "protein" },
      { n: "eggs", q: 2, u: "", c: "dairy" },
      { n: "panko breadcrumbs", q: 1, u: "cup", c: "pantry" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
      { n: "Dijon mustard", q: 1, u: "tbsp", c: "pantry" },
      { n: "plain Greek yogurt", q: 0.5, u: "cup", c: "dairy" },
      { n: "lemon", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "frozen peas", q: 2, u: "cup", c: "produce" },
    ],
    steps: [
      "Drain the tuna well, pressing out the liquid, and flake it into a bowl.",
      "Slice the green onions thin and add them to the bowl with the eggs, the panko, the mustard, the zest of the lemon (grate just the yellow skin), and a pinch of salt and pepper. Mix, then shape into patties about the size of your palm, about two per person. Wash your hands after.",
      "Heat the olive oil in a large skillet over medium heat. Lay the patties in and cook 3 to 4 minutes per side until deeply golden. Canned tuna is already cooked, so golden and hot through is the goal here.",
      "Microwave the peas with a splash of water for 2 to 3 minutes and season with a pinch of salt.",
      "Stir the yogurt with the juice of the lemon and a spoonful of water until it drizzles off the spoon.",
      "Serve the patties over the peas with the sauce spooned on top.",
    ],
  },
  {
    id: "baked-fish-sticks", v: "0.16.0", title: "Baked Fish Sticks with Sweet Potato Fries", time: 40, tags: ["fish"],
    spice: "Add a dash of Frank's RedHot to the ketchup.",
    ing: [
      { n: "cod fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "sweet potatoes", q: 2, u: "", c: "produce" },
      { n: "panko breadcrumbs", q: 1.5, u: "cup", c: "pantry" },
      { n: "all-purpose flour", q: 4, u: "tbsp", c: "pantry" },
      { n: "eggs", q: 2, u: "", c: "dairy" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "smoked paprika", q: 0.5, u: "tsp", c: "pantry" },
      { n: "ketchup", q: 0.5, u: "cup", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Heat the oven to 425 F. Scrub the sweet potatoes and cut them into fries about as thick as your finger. Toss them on a sheet pan with 1 tablespoon of the olive oil and a pinch of salt, and get them in the oven; they take about 30 minutes total, flipped halfway.",
      "Stir the panko with the rest of the olive oil, the smoked paprika, and a pinch of salt on a second sheet pan, toast it in the oven for 3 minutes until barely golden, and pour it into a shallow bowl.",
      "Cut the cod into sticks about as thick as your finger. Set up two more shallow bowls: the flour in one, the eggs beaten in the other.",
      "Coat each stick: flour, then egg, then press it into the panko all over. Line the sticks up on the second pan with space between them. Wash your hands after handling the raw fish.",
      "Bake the fish 12 to 15 minutes until golden. Poke an instant-read thermometer into the thickest stick: fish is done at 145 F and flakes with a fork.",
      "Serve with the fries, the ketchup for dunking, and the lemon in wedges for the grown-ups.",
    ],
  },
  {
    id: "tilapia-foil-packets", v: "0.16.0", title: "Tilapia and Veggie Foil Packets", time: 30, tags: ["fish"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "tilapia fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "zucchini", q: 2, u: "", c: "produce" },
      { n: "bell pepper", q: 2, u: "", c: "produce" },
      { n: "cherry tomatoes", q: 10, u: "oz", c: "produce" },
      { n: "garlic", q: 2, u: "clove", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
      { n: "lemon", q: 2, u: "", c: "produce" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
    ],
    steps: [
      "Heat the oven to 425 F. Start the rice: rinse it, put it in a small pot with double its volume of water and a pinch of salt, bring to a boil, then cover on low heat for 15 minutes.",
      "Slice the zucchini into coins, the bell peppers into strips, and halve the cherry tomatoes. Peel and mince the garlic.",
      "Tear one big square of foil per fillet. Lay a tilapia fillet in the middle of each, pile the vegetables on and around it, drizzle the olive oil over, and sprinkle on the oregano, garlic, and a pinch of salt. Wash your hands after handling the raw fish.",
      "Fold each packet closed and crimp the edges, leaving some puff for steam. Set the packets on a sheet pan and bake 15 minutes.",
      "Open one packet carefully (the steam is hot) and poke an instant-read thermometer into the fish: it is done at 145 F and flakes with a fork. Re-crimp and bake 4 more minutes if it reads low.",
      "Serve the packets over the rice, with the lemons cut into wedges for squeezing.",
    ],
  },
  {
    id: "tomato-braised-cod", v: "0.16.0", title: "Tomato-Braised Cod with White Beans", time: 30, tags: ["fish"],
    spice: "Add red pepper flakes or Calabrian chile paste.",
    ing: [
      { n: "cod fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "canned cannellini beans", q: 1, u: "can", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 3, u: "clove", c: "produce" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "dried oregano", q: 1, u: "tsp", c: "pantry" },
      { n: "spinach", q: 3, u: "cup", c: "produce" },
      { n: "whole grain bread", q: 0.5, u: "loaf", c: "grains" },
    ],
    steps: [
      "Chop the onion small and mince the garlic. Heat the olive oil in a large skillet over medium heat and cook the onion 4 minutes until soft, then add the garlic and oregano for 30 seconds.",
      "Pour in the tomatoes with their juice and the beans (rinsed in a strainer first). Add a splash of water and a pinch of salt and let it simmer 5 minutes.",
      "Cut the cod into chunks about the size of a deck of cards and season with a pinch of salt. Wash your hands after handling the raw fish.",
      "Nestle the cod down into the sauce, cover the pan, and cook 6 to 8 minutes on medium-low.",
      "Poke an instant-read thermometer into the thickest piece: fish is done at 145 F and flakes with a fork. Stir the spinach in around the fish until it wilts, about 1 minute.",
      "Toast thick slices of the bread and serve them alongside for mopping up the sauce.",
    ],
  },
  {
    id: "teriyaki-salmon-bowls", v: "0.16.0", title: "Teriyaki Salmon Rice Bowls", time: 30, tags: ["fish"],
    spice: "Add sriracha to taste.",
    ing: [
      { n: "salmon fillets", q: 1.5, u: "lb", c: "protein" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "frozen shelled edamame", q: 1.5, u: "cup", c: "produce" },
      { n: "carrots", q: 2, u: "", c: "produce" },
      { n: "cucumbers", q: 1, u: "", c: "produce" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "honey", q: 2, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 0.5, u: "tsp", c: "pantry" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
    ],
    steps: [
      "Start the rice: rinse it, put it in a small pot with double its volume of water and a pinch of salt, bring to a boil, then cover on low heat for 15 minutes.",
      "Stir the soy sauce, honey, rice vinegar, and ground ginger together in a cup. Cut the salmon into big bite-size cubes and pat them dry. Wash your hands after handling the raw fish.",
      "Heat the oil in a large skillet over medium-high heat. Add the salmon cubes and cook about 2 minutes per side until browned.",
      "Pour the sauce in, turn the heat to medium-low, and let it bubble 2 minutes, turning the cubes gently so they glaze all over.",
      "Poke an instant-read thermometer into a thick cube: fish is done at 145 F and flakes with a fork. Microwave the edamame with a splash of water for 2 minutes.",
      "Peel the carrots into ribbons with the peeler and slice the cucumber thin. Build bowls: rice, salmon, edamame, and the crunchy vegetables.",
    ],
  },
  {
    id: "beef-tacos", v: "0.16.0", title: "Classic Beef Taco Night", time: 25, tags: ["beef", "fast"],
    spice: "Add Tapatio or pickled jalapenos.",
    ing: [
      { n: "lean ground beef", q: 1.25, u: "lb", c: "protein" },
      { n: "olive oil", q: 0.5, u: "tbsp", c: "pantry" },
      { n: "taco seasoning", q: 1, u: "packet", c: "pantry" },
      { n: "small flour tortillas", q: 8, u: "", c: "grains" },
      { n: "romaine lettuce", q: 1, u: "head", c: "produce" },
      { n: "tomatoes", q: 2, u: "", c: "produce" },
      { n: "shredded cheddar", q: 1, u: "cup", c: "dairy" },
      { n: "salsa", q: 1, u: "jar", c: "pantry" },
      { n: "plain Greek yogurt", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Heat the olive oil in a large skillet over medium-high heat (lean beef sticks without it; skip it only if your skillet is nonstick). Add the beef and cook 6 to 8 minutes, breaking it into small crumbles with your spatula. Wash your hands after handling the raw meat.",
      "Push the crumbles into a mound and poke an instant-read thermometer into the middle: ground beef is done at 160 F. Cook 2 more minutes and check again if it reads low. Tilt the pan and spoon off any pooled fat.",
      "Stir in the taco seasoning and two-thirds of a cup of water per seasoning packet used. Simmer 3 to 4 minutes until saucy.",
      "While it simmers, chop the lettuce and dice the tomatoes into taco-size pieces.",
      "Wrap the tortillas in a damp paper towel and microwave 30 seconds.",
      "Set everything out build-your-own style: beef, lettuce, tomatoes, salsa, and yogurt instead of sour cream. Cheese is there for whoever wants it and easy to skip.",
    ],
  },
  {
    id: "steak-fajitas", v: "0.16.0", title: "Sheet-Pan Steak Fajitas", time: 35, tags: ["beef"],
    spice: "Add Tapatio or sliced jalapenos.",
    ing: [
      { n: "flank steak", q: 1.25, u: "lb", c: "protein" },
      { n: "bell pepper", q: 3, u: "", c: "produce" },
      { n: "red onion", q: 1, u: "", c: "produce" },
      { n: "fajita seasoning", q: 1, u: "packet", c: "pantry" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "small flour tortillas", q: 8, u: "", c: "grains" },
      { n: "lime", q: 1, u: "", c: "produce" },
      { n: "plain Greek yogurt", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Heat the oven to 450 F. Slice the bell peppers and the onion into strips and toss them on a sheet pan with 1 tablespoon of the olive oil and half of the fajita seasoning.",
      "Rub the steak all over with the rest of the oil and seasoning and lay it on top of the vegetables. Wash your hands after handling the raw meat.",
      "Roast 12 to 15 minutes. Poke an instant-read thermometer into the thickest part of the steak: 145 F is medium with a blush of pink. Roast 3 more minutes and check again if it reads low.",
      "Move the steak to a cutting board and let it rest 5 minutes so the juices stay in; stir the vegetables and return them to the oven meanwhile.",
      "Look for the lines running along the steak and slice it thin across them (across the grain); this is what makes flank steak tender.",
      "Wrap the tortillas in a damp paper towel and microwave 30 seconds. Build fajitas with steak, vegetables, a squeeze of the lime, and a spoon of yogurt.",
    ],
  },
  {
    id: "spaghetti-beef-marinara", v: "0.16.0", title: "Spaghetti with Beefy Hidden-Veggie Marinara", time: 35, tags: ["beef", "pasta"],
    spice: "Add red pepper flakes to taste.",
    ing: [
      { n: "lean ground beef", q: 1, u: "lb", c: "protein" },
      { n: "spaghetti", q: 12, u: "oz", c: "grains" },
      { n: "marinara sauce", q: 1, u: "jar", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "garlic", q: 2, u: "clove", c: "produce" },
      { n: "zucchini", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "Italian seasoning", q: 1, u: "tsp", c: "pantry" },
      { n: "parmesan", q: 0.25, u: "cup", c: "dairy" },
    ],
    steps: [
      "Put a big pot of water on to boil with a small handful of salt. Chop the onion small, mince the garlic, and grate the zucchini on the big holes of a box grater.",
      "Heat the olive oil in a large skillet over medium-high heat. Add the beef and onion and cook 6 to 8 minutes, breaking the meat into crumbles. Wash your hands after handling the raw meat.",
      "Push the crumbles into a mound and poke an instant-read thermometer into the middle: ground beef is done at 160 F. Cook 2 more minutes and check again if it reads low.",
      "Add the garlic, the grated zucchini, and the Italian seasoning and stir 1 minute; the zucchini melts into the sauce where kids never find it. Pour in the marinara, rinse the jar with a splash of water into the pan, and simmer on low 10 minutes.",
      "Meanwhile cook the spaghetti in the boiling water per the package time, then drain it.",
      "Serve the sauce over the spaghetti. Parmesan on top is optional and easy to skip.",
    ],
  },
  {
    id: "beef-bean-chili", v: "0.16.0", title: "Beef and Bean Chili with Chips", time: 40, tags: ["beef", "soup"],
    spice: "Add a pinch of cayenne or minced chipotle in adobo.",
    ing: [
      { n: "lean ground beef", q: 1, u: "lb", c: "protein" },
      { n: "canned black beans", q: 1, u: "can", c: "pantry" },
      { n: "canned diced tomatoes", q: 1, u: "can", c: "pantry" },
      { n: "canned tomato sauce", q: 1, u: "can", c: "pantry" },
      { n: "onion", q: 1, u: "", c: "produce" },
      { n: "bell pepper", q: 1, u: "", c: "produce" },
      { n: "olive oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "chili powder", q: 3, u: "tsp", c: "pantry" },
      { n: "ground cumin", q: 1, u: "tsp", c: "pantry" },
      { n: "low-sodium chicken broth", q: 0.5, u: "cup", c: "pantry" },
      { n: "tortilla chips", q: 1, u: "bag", c: "grains" },
      { n: "shredded cheddar", q: 0.5, u: "cup", c: "dairy" },
    ],
    steps: [
      "Chop the onion and bell pepper small. Heat the olive oil in a big soup pot over medium-high heat and cook them 4 minutes until soft.",
      "Add the beef and cook 6 to 8 minutes, breaking it into crumbles. Wash your hands after handling the raw meat.",
      "Push the crumbles into a mound and poke an instant-read thermometer into the middle: ground beef is done at 160 F. Cook 2 more minutes and check again if it reads low.",
      "Stir in the chili powder and cumin for 30 seconds, then add the tomatoes with their juice, the tomato sauce, the beans (rinsed in a strainer), and the broth.",
      "Simmer uncovered on medium-low for 15 minutes, stirring now and then, until it thickens to a scoopable chili. Taste and add salt a pinch at a time.",
      "Serve in bowls with the chips for scooping. Cheese on top is optional and easy to skip.",
    ],
  },
  {
    id: "sheetpan-pork-tenderloin", v: "0.16.0", title: "Sheet-Pan Pork Tenderloin with Apples and Potatoes", time: 50, tags: ["pork"],
    spice: "Add a pinch of cayenne to the rub.",
    ing: [
      { n: "pork tenderloin", q: 1.25, u: "lb", c: "protein" },
      { n: "apples", q: 2, u: "", c: "produce" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "olive oil", q: 3, u: "tbsp", c: "pantry" },
      { n: "Dijon mustard", q: 1, u: "tbsp", c: "pantry" },
      { n: "maple syrup", q: 1, u: "tbsp", c: "pantry" },
      { n: "dried rosemary", q: 1, u: "tsp", c: "pantry" },
    ],
    steps: [
      "Heat the oven to 425 F. Halve the baby potatoes and toss them on a sheet pan with 2 tablespoons of the olive oil, the rosemary, and half a teaspoon of salt. Roast 10 minutes.",
      "Check the pork for a shiny, silvery strip along one side (silverskin); if you see one, slide the tip of a knife under it and cut it away, since it turns tough when cooked. Many store tenderloins come with it already removed.",
      "Stir the mustard, maple syrup, half a teaspoon of salt, and the rest of the oil into a paste and rub it all over the pork. Wash your hands after handling the raw meat.",
      "Cut the apples into thick wedges (no need to peel; just cut around the core).",
      "Pull the pan out, push the potatoes to the edges, lay the pork in the middle, and scatter the apple wedges around it. Roast 18 to 22 minutes.",
      "Poke an instant-read thermometer into the thickest part of the pork: it is done at 145 F with a blush of pink inside, which is safe and juicy. Roast 4 more minutes and check again if it reads low.",
      "Move the pork to a cutting board and let it rest 5 minutes so the juices stay in, leaving the pan in the turned-off oven. Slice the pork into thick coins and serve with the potatoes and apples.",
    ],
  },
  {
    id: "ginger-pork-rice-bowls", v: "0.16.0", title: "Ginger Pork Rice Bowls", time: 30, tags: ["pork"],
    spice: "Add sriracha or chili crisp.",
    ing: [
      { n: "ground pork", q: 1, u: "lb", c: "protein" },
      { n: "white rice", q: 1.5, u: "cup", c: "grains" },
      { n: "coleslaw mix", q: 1, u: "bag", c: "produce" },
      { n: "garlic", q: 2, u: "clove", c: "produce" },
      { n: "low-sodium soy sauce", q: 3, u: "tbsp", c: "pantry" },
      { n: "rice vinegar", q: 1, u: "tbsp", c: "pantry" },
      { n: "ground ginger", q: 1, u: "tsp", c: "pantry" },
      { n: "vegetable oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "toasted sesame oil", q: 1, u: "tbsp", c: "pantry" },
      { n: "green onions", q: 1, u: "bunch", c: "produce" },
    ],
    steps: [
      "Start the rice: rinse it, put it in a small pot with double its volume of water and a pinch of salt, bring to a boil, then cover on low heat for 15 minutes.",
      "Heat the vegetable oil in a large skillet over medium-high heat. Add the pork and cook 6 to 8 minutes, breaking it into small crumbles. Wash your hands after handling the raw meat.",
      "Push the crumbles into a mound and poke an instant-read thermometer into the middle: ground pork is done at 160 F. Cook 2 more minutes and check again if it reads low.",
      "Peel and mince the garlic and add it with the ground ginger, soy sauce, and rice vinegar; stir 30 seconds.",
      "Add the coleslaw mix and toss 2 minutes, just until it wilts but still has crunch. Turn off the heat and stir in the sesame oil.",
      "Slice the green onions thin. Serve the pork over the rice with the green onions on top.",
    ],
  },
  {
    id: "skillet-pork-chops", v: "0.16.0", title: "Skillet Pork Chops with Smashed Potatoes and Peas", time: 35, tags: ["pork"],
    spice: "Add a dash of Frank's RedHot.",
    ing: [
      { n: "thick-cut boneless pork chops", q: 1.5, u: "lb", c: "protein" },
      { n: "baby potatoes", q: 1.5, u: "lb", c: "produce" },
      { n: "frozen peas", q: 2, u: "cup", c: "produce" },
      { n: "olive oil", q: 2, u: "tbsp", c: "pantry" },
      { n: "butter", q: 1, u: "tbsp", c: "dairy" },
      { n: "garlic powder", q: 1, u: "tsp", c: "pantry" },
      { n: "smoked paprika", q: 0.5, u: "tsp", c: "pantry" },
      { n: "lemon", q: 1, u: "", c: "produce" },
    ],
    steps: [
      "Put the baby potatoes in a pot, cover with water and a big pinch of salt, and boil 12 to 15 minutes until a fork slides in with no resistance.",
      "Pat the pork chops dry and sprinkle each side with the garlic powder, smoked paprika, and a pinch of salt. Wash your hands after handling the raw meat.",
      "Heat the olive oil in a large skillet over medium-high heat. Lay the chops in and cook 4 to 5 minutes per side without moving them, so they brown. These times fit chops about an inch thick; thin half-inch chops need only 2 to 3 minutes per side.",
      "Poke an instant-read thermometer through the side of the thickest chop into its middle: pork is done at 145 F with a blush of pink, which is safe and juicy. Cook 2 more minutes per side and check again if it reads low.",
      "Move the chops to a plate and let them rest 5 minutes so the juices stay in.",
      "Drain the potatoes, add the butter and a pinch of salt, and smash them roughly with a fork. Microwave the peas with a splash of water, covered, for 3 to 4 minutes, stirring halfway.",
      "Serve the chops with the potatoes and peas, with the lemon in wedges for squeezing over.",
    ],
  },
];

const CAT_ORDER = ["produce", "protein", "dairy", "grains", "pantry"];
const CAT_LABELS = {
  produce: "Produce",
  protein: "Meat and Protein",
  dairy: "Dairy and Eggs",
  grains: "Bread, Grains, and Pasta",
  pantry: "Pantry",
  staples: "From your pantry",
};

// Things a stocked kitchen already has; shown separately so the shopping
// aisles only list what actually needs buying
const STAPLES = new Set([
  "olive oil", "vegetable oil", "toasted sesame oil", "butter",
  "low-sodium soy sauce", "rice vinegar", "Dijon mustard", "ketchup",
  "honey", "maple syrup", "brown sugar", "cornstarch", "all-purpose flour",
  "baking powder", "garlic powder", "chili powder", "mild curry powder",
  "dried oregano", "dried rosemary", "Italian seasoning", "smoked paprika",
  "ground cumin", "ground ginger", "dried thyme", "bay leaf", "garam masala",
  "onion powder",
]);

const GROUP_ORDER = [...CAT_ORDER, "staples"];

// How each ingredient is actually sold at a US grocery store: `per` is how much
// of the recipe unit one package holds. Sizes are typical, not universal, which
// is why the list always shows the needed amount alongside the buy suggestion.
// Ingredients absent from this map are already in purchase form (counts, cans,
// jars, by-weight meat) or are cupboard staples.
const PACKS = {
  "ground turkey": { per: 1, one: "tray (1 lb)", many: "trays (1 lb)" },
  "lean ground beef": { per: 1, one: "tray (1 lb)", many: "trays (1 lb)" },
  "ground pork": { per: 1, one: "tray (1 lb)", many: "trays (1 lb)" },
  "chicken tenderloins": { per: 1.5, one: "pack (1.5 lb)", many: "packs (1.5 lb)" },
  "eggs": { per: 12, one: "dozen", many: "dozen" },
  "shredded cheddar": { per: 2, one: "bag (8 oz)", many: "bags (8 oz)" },
  "plain Greek yogurt": { per: 4, one: "tub (32 oz)", many: "tubs (32 oz)" },
  "cream cheese": { per: 8, one: "brick (8 oz)", many: "bricks (8 oz)" },
  "parmesan": { per: 2, one: "container (8 oz)", many: "containers (8 oz)" },
  "penne pasta": { per: 16, one: "box (16 oz)", many: "boxes (16 oz)" },
  "whole wheat penne": { per: 16, one: "box (16 oz)", many: "boxes (16 oz)" },
  "spaghetti": { per: 16, one: "box (16 oz)", many: "boxes (16 oz)" },
  "rotini pasta": { per: 16, one: "box (16 oz)", many: "boxes (16 oz)" },
  "small pasta shells": { per: 4, one: "box (16 oz)", many: "boxes (16 oz)" },
  "orzo": { per: 2.5, one: "box (16 oz)", many: "boxes (16 oz)" },
  "egg noodles": { per: 12, one: "bag (12 oz)", many: "bags (12 oz)" },
  "small flour tortillas": { per: 10, one: "pack of 10", many: "packs of 10" },
  "small corn tortillas": { per: 12, one: "pack of 12", many: "packs of 12" },
  "pita bread": { per: 6, one: "pack of 6", many: "packs of 6" },
  "whole wheat burger buns": { per: 8, one: "pack of 8", many: "packs of 8" },
  "white rice": { per: 5, one: "bag (2 lb)", many: "bags (2 lb)" },
  "rolled oats": { per: 6, one: "canister (18 oz)", many: "canisters (18 oz)" },
  "panko breadcrumbs": { per: 2, one: "box (8 oz)", many: "boxes (8 oz)" },
  "breadcrumbs": { per: 2, one: "canister (8 oz)", many: "canisters (8 oz)" },
  "red lentils": { per: 2.25, one: "bag (1 lb)", many: "bags (1 lb)" },
  "creamy peanut butter": { per: 1.75, one: "jar (16 oz)", many: "jars (16 oz)" },
  "low-sodium chicken broth": { per: 4, one: "carton (32 oz)", many: "cartons (32 oz)" },
  "low-sodium vegetable broth": { per: 4, one: "carton (32 oz)", many: "cartons (32 oz)" },
  "spinach": { per: 4, one: "bag (5 oz)", many: "bags (5 oz)" },
  "frozen peas and carrots": { per: 2.5, one: "bag (12 oz)", many: "bags (12 oz)" },
  "frozen peas": { per: 2.5, one: "bag (12 oz)", many: "bags (12 oz)" },
  "frozen corn": { per: 3, one: "bag (16 oz)", many: "bags (16 oz)" },
  "frozen shelled edamame": { per: 2.5, one: "bag (12 oz)", many: "bags (12 oz)" },
  "garlic": { per: 10, one: "head of", many: "heads of" },
  "celery": { per: 8, one: "bunch", many: "bunches" },
  "baby potatoes": { per: 1.5, one: "bag (1.5 lb)", many: "bags (1.5 lb)" },
  "cherry tomatoes": { per: 10, one: "container (10 oz)", many: "containers (10 oz)" },
};

// Units that are whole purchasable things: a scaled-down week can need half a
// jar, but the store only sells whole ones, so the buy line rounds up
const DISCRETE_UNITS = new Set(["jar", "can", "head", "loaf", "packet", "block", "bag", "bottle", "bunch"]);

// The package size each recipe assumes, shown after the unit ("1 jar (24 oz)
// marinara sauce") so two different shelf sizes are never ambiguous. Heads,
// bunches, and loaves are natural units and stay size-free.
const SIZES = {
  "canned tuna": "5 oz",
  "marinara sauce": "24 oz",
  "basil pesto": "8 oz",
  "salsa": "16 oz",
  "canned chickpeas": "15 oz",
  "canned black beans": "15 oz",
  "canned cannellini beans": "15 oz",
  "canned diced tomatoes": "14.5 oz",
  "canned crushed tomatoes": "28 oz",
  "canned tomato sauce": "15 oz",
  "light coconut milk": "13.5 oz",
  "enchilada sauce": "15 oz",
  "taco seasoning": "1 oz",
  "fajita seasoning": "1 oz",
  "extra-firm tofu": "14 oz",
  "frozen stir-fry vegetables": "16 oz",
  "coleslaw mix": "14 oz",
  "frozen broccoli florets": "12 oz",
  "tortilla chips": "10 oz",
};

// Stores the grocery list can link into. "None" keeps the list store-free;
// picking one adds a "Find it" search link per line for building a pickup cart.
const STORES = [
  { id: "none", label: "None" },
  { id: "picknsave", label: "Pick 'n Save", searchUrl: "https://www.picknsave.com/search?query=" },
  { id: "metromarket", label: "Metro Market", searchUrl: "https://www.metromarket.net/search?query=" },
  { id: "meijer", label: "Meijer", searchUrl: "https://www.meijer.com/shopping/search.html?text=" },
  { id: "walmart", label: "Walmart", searchUrl: "https://www.walmart.com/search?q=" },
];

const TAG_FILTERS = [
  { id: "all", label: "All" },
  { id: "chicken", label: "Chicken" },
  { id: "turkey", label: "Turkey" },
  { id: "beef", label: "Beef" },
  { id: "pork", label: "Pork" },
  { id: "fish", label: "Fish" },
  { id: "veggie", label: "Veggie" },
  { id: "vegan", label: "Vegan" },
  { id: "pasta", label: "Pasta" },
  { id: "soup", label: "Soup" },
  { id: "fast", label: "25 min or less" },
];

// Share links: the plan packs into a 12-byte base64url slug in the URL hash:
// format byte, the three APP_VERSION numbers, servings, then 7 slot bytes
// indexing into the catalog as it stood at that version (255 = empty day).
// Every meal carries the version it was added in (`v`), so a decoder on a
// newer catalog rebuilds the older index space by filtering to v <= the
// slug's version. The invariant that keeps old links working: once a version
// ships, the meals it could see are never removed or reordered relative to
// each other; new meals may land anywhere in the array with a higher `v`.
const SLUG_FORMAT = 1;
const SLUG_EMPTY = 255;

function verParts(v) {
  return v.split(".").map((n) => parseInt(n, 10));
}

function verLte(a, b) {
  const [a1, a2, a3] = verParts(a);
  const [b1, b2, b3] = verParts(b);
  return a1 !== b1 ? a1 < b1 : a2 !== b2 ? a2 < b2 : a3 <= b3;
}

function catalogAt(version) {
  return MEALS.filter((m) => verLte(m.v, version));
}

function encodeSlug(week, servings) {
  const catalog = catalogAt(APP_VERSION);
  const bytes = [SLUG_FORMAT, ...verParts(APP_VERSION), servings];
  week.forEach((id) => {
    const i = id ? catalog.findIndex((m) => m.id === id) : -1;
    bytes.push(i >= 0 ? i : SLUG_EMPTY);
  });
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSlug(hash) {
  try {
    const raw = atob(hash.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/"));
    if (raw.length !== 12) return null;
    const bytes = [...raw].map((ch) => ch.charCodeAt(0));
    if (bytes[0] !== SLUG_FORMAT) return null;
    const catalog = catalogAt(bytes.slice(1, 4).join("."));
    const servings = Math.min(12, Math.max(1, bytes[4]));
    const week = bytes.slice(5, 12).map((i) => (i < catalog.length ? catalog[i].id : null));
    if (!week.some(Boolean)) return null;
    return { week, servings };
  } catch (e) {
    // Not a slug this build understands; fall back to saved state
    return null;
  }
}

function shuffleMeals(pool = MEALS) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const mealById = (id) => MEALS.find((m) => m.id === id);

// Fill the empty days of `kept` from `pool` (already in preference order:
// fresh meals before last week's repeats), honoring the profile's weekly
// quotas. Meals already on the plan count against ceilings first, targets
// fill before the general pass, and target placement lands on random empty
// days so fish nights do not pile up at the start of the week. With no
// quotas this reduces to the plain first-come fill.
function fillWeek(kept, pool, quotas) {
  const next = [...kept];
  const onPlan = (test) => next.filter((id) => id && test(mealById(id))).length;
  const ceilings = ((quotas && quotas.ceilings) || []).map((c) => ({ ...c, n: onPlan(c.test) }));
  const targets = ((quotas && quotas.targets) || []).map((t) => ({ ...t, n: onPlan(t.test) }));
  const fits = (m) => ceilings.every((c) => !c.test(m) || c.n < c.max);
  const empties = shuffleMeals(next.map((id, i) => (id ? null : i)).filter((i) => i !== null));
  const remaining = new Set(pool.map((m) => m.id));
  const take = (m) => {
    next[empties.shift()] = m.id;
    remaining.delete(m.id);
    ceilings.forEach((c) => { if (c.test(m)) c.n++; });
    targets.forEach((t) => { if (t.test(m)) t.n++; });
  };
  targets.forEach((t) => {
    for (const m of pool) {
      if (t.n >= t.want || empties.length === 0) break;
      if (remaining.has(m.id) && t.test(m) && fits(m)) take(m);
    }
  });
  for (const m of pool) {
    if (empties.length === 0) break;
    if (remaining.has(m.id) && fits(m)) take(m);
  }
  return next;
}

function rerollDay(week, dayIndex, avoid = new Set(), pool = MEALS, quotas = null) {
  const used = new Set(week.filter((id, i) => id && i !== dayIndex));
  // A replacement may not push the rest of the week past a quota ceiling
  const rest = week.filter((id, i) => id && i !== dayIndex).map(mealById);
  const fits = (m) => ((quotas && quotas.ceilings) || []).every((c) => !c.test(m) || rest.filter(c.test).length < c.max);
  // Prefer meals that were not on last week's plan; fall back if that empties the pool
  let options = pool.filter((m) => !used.has(m.id) && m.id !== week[dayIndex] && !avoid.has(m.id) && fits(m));
  if (options.length === 0) options = pool.filter((m) => !used.has(m.id) && m.id !== week[dayIndex] && fits(m));
  const pick = options[Math.floor(Math.random() * options.length)];
  const next = [...week];
  next[dayIndex] = pick ? pick.id : week[dayIndex];
  return next;
}

// Units are stored in singular canonical form; pluralize for display only
const UNIT_PLURALS = {
  cup: "cups", can: "cans", jar: "jars", head: "heads", loaf: "loaves",
  bunch: "bunches", stalk: "stalks", slice: "slices", clove: "cloves",
  packet: "packets", block: "blocks", bag: "bags", bottle: "bottles",
};

// Countable ingredients carry no unit, so the name itself has to pluralize.
// Only names stored in the singular need an entry.
const ITEM_PLURALS = {
  lemon: "lemons", lime: "limes", onion: "onions", "red onion": "red onions",
  "bell pepper": "bell peppers", "bay leaf": "bay leaves",
};

// The reverse: names stored in the plural need a singular form when a scaled
// quantity lands on one or less ("1 avocado", "half an onion")
const ITEM_SINGULARS = {
  eggs: "egg", avocados: "avocado", tomatoes: "tomato", carrots: "carrot",
  cucumbers: "cucumber", "sweet potatoes": "sweet potato", "russet potatoes": "russet potato",
  apples: "apple",
};

// Countables you cannot cook a fraction of: recipe cards round these up to
// whole ones instead of asking for half an egg
const INDIVISIBLE = new Set([
  "eggs", "small flour tortillas", "small corn tortillas",
  "whole wheat burger buns", "pita bread",
]);

// Scaled countable quantities round up to the nearest half so recipe cards can
// say "half an onion" and the grocery list can show the true need behind a
// whole-onion buy line. Only halves, never quarters; nobody cuts a quarter lime.
function countLabel(q) {
  const half = Math.ceil(q * 2 - 1e-9) / 2;
  const whole = Math.floor(half);
  if (half - whole === 0.5) return whole === 0 ? "half" : `${whole} and a half`;
  return String(whole);
}

function countName(n, effectiveQ) {
  if (effectiveQ > 1) return ITEM_PLURALS[n] || n;
  return ITEM_SINGULARS[n] || n;
}

// The scaled amount of a unitless countable as it should read on a recipe
// card: "half an onion", "1 and a half sweet potatoes", "4 eggs"
function recipeCount(ing) {
  if (INDIVISIBLE.has(ing.n)) {
    const c = Math.ceil(ing.q - 1e-9);
    return `${c} ${countName(ing.n, c)}`;
  }
  const half = Math.ceil(ing.q * 2 - 1e-9) / 2;
  const label = countLabel(ing.q);
  if (half === 0.5) return `half ${/^[aeiou]/i.test(countName(ing.n, half)) ? "an" : "a"} ${countName(ing.n, half)}`;
  return `${label} ${countName(ing.n, half)}`;
}

function formatQty(q, u, name) {
  // Countable items round up to whole; measured items to the nearest quarter.
  // Passing a name appends the expected package size ("1 jar (24 oz)").
  const rounded = u === "" ? Math.ceil(q - 1e-9) : Math.round(q * 4) / 4;
  let unit = rounded !== 1 && UNIT_PLURALS[u] ? UNIT_PLURALS[u] : u;
  if (unit && name && SIZES[name]) unit += ` (${SIZES[name]})`;
  return unit ? `${rounded} ${unit}` : String(rounded);
}


function buildGroceries(week, servings) {
  const scale = servings / BASE_SERVINGS;
  const map = new Map();
  week.forEach((id) => {
    if (!id) return;
    const meal = MEALS.find((m) => m.id === id);
    if (!meal) return;
    meal.ing.forEach((ing) => {
      const key = `${ing.n}|${ing.u}`;
      if (map.has(key)) {
        map.get(key).q += ing.q * scale;
      } else {
        map.set(key, { ...ing, q: ing.q * scale });
      }
    });
  });
  const grouped = {};
  GROUP_ORDER.forEach((c) => (grouped[c] = []));
  [...map.values()].forEach((ing) => grouped[STAPLES.has(ing.n) ? "staples" : ing.c].push(ing));
  GROUP_ORDER.forEach((c) => grouped[c].sort((a, b) => a.n.localeCompare(b.n)));
  return grouped;
}

function buyPlan(ing) {
  const pack = PACKS[ing.n];
  if (pack) {
    const count = Math.max(1, Math.ceil(ing.q / pack.per - 1e-9));
    return `${count} ${count === 1 ? pack.one : pack.many}`;
  }
  // No pack info, but you still cannot buy half a jar or half a head
  if (DISCRETE_UNITS.has(ing.u) && ing.q % 1 !== 0) {
    const count = Math.ceil(ing.q);
    let unit = count !== 1 && UNIT_PLURALS[ing.u] ? UNIT_PLURALS[ing.u] : ing.u;
    if (SIZES[ing.n]) unit += ` (${SIZES[ing.n]})`;
    return `${count} ${unit}`;
  }
  return null;
}

function storeSearchUrl(ing, storeObj) {
  return storeObj.searchUrl + encodeURIComponent(ing.n.replace(/^canned /, ""));
}

// One grocery line, split for display: qty (bold in the UI), name, and an
// optional true-need suffix. Countable buys round up to whole items but admit
// the fractional need ("2 onions (need 1 and a half)") so the recipe cards
// and the list always agree.
function groceryLine(ing, isStaple) {
  if (!isStaple) {
    const buy = buyPlan(ing);
    if (buy) return { qty: buy, name: ing.n, need: formatQty(ing.q, ing.u) };
    if (ing.u === "") {
      const c = Math.ceil(ing.q - 1e-9);
      const half = Math.ceil(ing.q * 2 - 1e-9) / 2;
      const need = !INDIVISIBLE.has(ing.n) && half !== c ? countLabel(ing.q) : null;
      return { qty: String(c), name: countName(ing.n, c), need };
    }
  }
  return { qty: formatQty(ing.q, ing.u, isStaple ? undefined : ing.n), name: ing.n, need: null };
}

function groceryText(ing, isStaple) {
  const p = groceryLine(ing, isStaple);
  return p.need ? `${p.qty} ${p.name} (need ${p.need})` : `${p.qty} ${p.name}`.trim();
}

// At-a-glance marker so vegan nights stand out on the week and in the catalog
function VeganChip() {
  return (
    <span aria-label="vegan meal" style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800,
      letterSpacing: "0.5px", textTransform: "uppercase", color: "#fff", background: P.celery,
      borderRadius: 999, padding: "2px 8px", marginLeft: 8, verticalAlign: "middle", whiteSpace: "nowrap" }}>
      vegan
    </span>
  );
}

// A shared link or a profile switch can leave a planned meal the current
// eating style would not have drawn; show the week faithfully, but say so
function OutsideChip() {
  return (
    <span aria-label="outside your eating style" style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800,
      letterSpacing: "0.5px", textTransform: "uppercase", color: "#fff", background: P.cherry,
      borderRadius: 999, padding: "2px 8px", marginLeft: 8, verticalAlign: "middle", whiteSpace: "nowrap" }}>
      outside your style
    </span>
  );
}

function RecipeDetails({ meal, scale }) {
  return (
    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: P.celery, marginBottom: 4 }}>
        You will need
      </div>
      <div style={{ color: P.inkSoft, marginBottom: 8 }}>
        {meal.ing.map((ing) => {
          const scaled = { ...ing, q: ing.q * scale };
          if (scaled.u === "") return recipeCount(scaled);
          return `${formatQty(scaled.q, scaled.u, scaled.n)} ${scaled.n}`;
        }).join(", ")}
      </div>
      {scale !== 1 && (
        <div style={{ fontSize: 12, color: P.inkSoft, marginBottom: 8 }}>
          Amounts above are scaled to your serving count. Where a step spells out a fixed
          amount (a teaspoon of salt, a cup of water), that means the full four-serving
          batch, so trim it to match.
        </div>
      )}
      <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: P.celery, marginBottom: 4 }}>
        Steps
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, color: P.ink }}>
        {meal.steps.map((s, si) => <li key={si} style={{ marginBottom: 4 }}>{s}</li>)}
      </ol>
      {meal.spice && (
        <div style={{ fontSize: 12, color: P.inkSoft, marginTop: 8 }}>
          Want more heat? {meal.spice}
        </div>
      )}
      {/* The recipe field prefills through the issue form's field id */}
      <a className="no-print" target="_blank" rel="noreferrer"
        href={`${REPO_URL}/issues/new?template=recipe-feedback.yml&title=${encodeURIComponent(`Recipe feedback: ${meal.title}`)}&recipe=${encodeURIComponent(meal.title)}`}
        style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: P.inkSoft }}>
        Cooked this? Tell us how it went.
      </a>
    </div>
  );
}

export default function SevenSuppers() {
  const [week, setWeek] = useState(Array(7).fill(null));
  const [locks, setLocks] = useState(Array(7).fill(false));
  const [lastWeek, setLastWeek] = useState([]);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [servings, setServings] = useState(DEFAULT_SERVINGS);
  const [store, setStore] = useState("none");
  const [cardPerPage, setCardPerPage] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [view, setView] = useState("plan");
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shuffleTime, setShuffleTime] = useState(null); // null = any, 35 = 35 min or less
  const [shuffleDiet, setShuffleDiet] = useState("all");
  const [shuffleNoSoups, setShuffleNoSoups] = useState(false);
  const [dragDay, setDragDay] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);

  useEffect(() => {
    (async () => {
      // A share link in the URL wins over saved state: opening it adopts that
      // week (and servings) as this device's plan. Locks stay unlocked since
      // saved locks belong to the plan being replaced.
      let fromLink = null;
      try {
        fromLink = decodeSlug(window.location.hash);
      } catch (e) {
        // No usable URL in this context
      }
      try {
        const result = await window.storage.get("seven-suppers-profile");
        if (result && result.value && PROFILES.some((p) => p.id === result.value)) {
          setProfile(result.value);
        } else {
          // Migration: a device holding a saved week predates profiles, and
          // back then the whole app was gout friendly; only genuinely fresh
          // devices get the heart-healthy default
          const w = await window.storage.get("seven-suppers-week");
          if (w && w.value) setProfile("gout");
        }
      } catch (e) {
        // Fresh device, keep the default profile
      }
      if (fromLink) {
        setWeek(fromLink.week);
        setServings(fromLink.servings);
      }
      if (!fromLink) {
        try {
          const result = await window.storage.get("seven-suppers-week");
          if (result && result.value) {
            const saved = JSON.parse(result.value);
            if (Array.isArray(saved) && saved.length === 7) {
              // Drop ids that no longer exist in the catalog so slots stay usable
              setWeek(saved.map((id) => (MEALS.some((m) => m.id === id) ? id : null)));
            }
          }
        } catch (e) {
          // No saved week yet, start fresh
        }
        try {
          const result = await window.storage.get("seven-suppers-servings");
          if (result && result.value) {
            const n = parseInt(result.value, 10);
            if (n >= 1 && n <= 12) setServings(n);
          }
        } catch (e) {
          // No saved servings, use the default
        }
        try {
          const result = await window.storage.get("seven-suppers-locks");
          if (result && result.value) {
            const saved = JSON.parse(result.value);
            if (Array.isArray(saved) && saved.length === 7) setLocks(saved.map(Boolean));
          }
        } catch (e) {
          // No saved locks, start unlocked
        }
      }
      try {
        const result = await window.storage.get("seven-suppers-last-week");
        if (result && result.value) {
          const saved = JSON.parse(result.value);
          if (Array.isArray(saved)) setLastWeek(saved.filter((id) => MEALS.some((m) => m.id === id)));
        }
      } catch (e) {
        // No previous week recorded yet
      }
      try {
        const result = await window.storage.get("seven-suppers-store");
        if (result && result.value && STORES.some((s) => s.id === result.value)) {
          setStore(result.value);
        }
      } catch (e) {
        // No saved store, stay store-free
      }
      try {
        const result = await window.storage.get("seven-suppers-shuffle");
        if (result && result.value) {
          const saved = JSON.parse(result.value);
          if (saved.time === 35) setShuffleTime(35);
          if (SHUFFLE_DIETS.some((d) => d.id === saved.diet)) setShuffleDiet(saved.diet);
          if (saved.noSoups === true) setShuffleNoSoups(true);
        }
      } catch (e) {
        // No saved shuffle filter, draw from everything
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-week", JSON.stringify(week));
      } catch (e) {
        // Storage unavailable, plan lives in memory for this session
      }
    })();
  }, [week, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-servings", String(servings));
      } catch (e) {
        // Storage unavailable, servings live in memory for this session
      }
    })();
  }, [servings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-locks", JSON.stringify(locks));
      } catch (e) {
        // Storage unavailable
      }
    })();
  }, [locks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-last-week", JSON.stringify(lastWeek));
      } catch (e) {
        // Storage unavailable
      }
    })();
  }, [lastWeek, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-store", store);
      } catch (e) {
        // Storage unavailable
      }
    })();
  }, [store, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-profile", profile);
      } catch (e) {
        // Storage unavailable
      }
    })();
  }, [profile, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("seven-suppers-shuffle", JSON.stringify({ time: shuffleTime, diet: shuffleDiet, noSoups: shuffleNoSoups }));
      } catch (e) {
        // Storage unavailable
      }
    })();
  }, [shuffleTime, shuffleDiet, shuffleNoSoups, loaded]);

  // The address bar always holds the share link for the current plan, so
  // sharing the week is just copying the URL
  useEffect(() => {
    if (!loaded) return;
    try {
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", week.some(Boolean) ? base + "#" + encodeSlug(week, servings) : base);
    } catch (e) {
      // Sandboxed contexts (artifact iframes) may refuse URL edits
    }
  }, [week, servings, loaded]);

  const activeStore = STORES.find((s) => s.id === store && s.searchUrl) || null;

  const groceries = useMemo(() => buildGroceries(week, servings), [week, servings]);
  const scale = servings / BASE_SERVINGS;
  const plannedCount = week.filter(Boolean).length;

  // Prune checkboxes for items that left the list when the plan changes
  useEffect(() => {
    setChecked((prev) => {
      const valid = new Set();
      GROUP_ORDER.forEach((c) => groceries[c].forEach((ing) => valid.add(`${ing.n}|${ing.u}`)));
      const stale = Object.keys(prev).filter((k) => !valid.has(k));
      if (stale.length === 0) return prev;
      const next = { ...prev };
      stale.forEach((k) => delete next[k]);
      return next;
    });
  }, [groceries]);

  // The catalog this device sees: the active profile's slice of MEALS
  const profileMeals = useMemo(() => MEALS.filter((m) => profileAllows(profile, m)), [profile]);
  const activeQuotas = PROFILE_QUOTAS[profile] || null;

  const filteredMeals = useMemo(() => {
    if (filter === "all") return profileMeals;
    return profileMeals.filter((m) => m.tags.includes(filter));
  }, [filter, profileMeals]);

  // Hide catalog chips no meal in this profile carries, and drop a stranded
  // selection back to All when the profile switch empties it
  const visibleTagFilters = useMemo(() => TAG_FILTERS.filter((t) =>
    t.id === "all" || profileMeals.some((m) => m.tags.includes(t.id))
  ), [profileMeals]);
  useEffect(() => {
    if (!visibleTagFilters.some((t) => t.id === filter)) setFilter("all");
  }, [visibleTagFilters, filter]);

  // What Shuffle and Reroll draw from: the profile's meals, narrowed by the shuffle filters
  const shufflePool = useMemo(() => profileMeals.filter((m) =>
    (shuffleTime === null || m.time <= shuffleTime) &&
    (shuffleDiet === "all" || m.tags.includes(shuffleDiet)) &&
    (!shuffleNoSoups || !m.tags.includes("soup"))
  ), [profileMeals, shuffleTime, shuffleDiet, shuffleNoSoups]);

  // Hand-picking past a quota ceiling warns rather than blocks
  const quotaNotes = useMemo(() => {
    if (!activeQuotas) return [];
    const label = PROFILES.find((p) => p.id === profile).label;
    return (activeQuotas.ceilings || []).flatMap((c) => {
      const n = week.filter((id) => id && c.test(mealById(id))).length;
      return n > c.max ? [`${label} aims for at most ${c.max} ${c.label} a week; this week has ${n}.`] : [];
    });
  }, [week, profile, activeQuotas]);

  function assignMeal(mealId) {
    if (week.includes(mealId)) return; // each meal at most once per week
    const next = [...week];
    if (selectedDay !== null) {
      next[selectedDay] = mealId;
      setSelectedDay(null);
    } else {
      const empty = next.findIndex((d) => d === null);
      if (empty === -1) return;
      next[empty] = mealId;
    }
    setWeek(next);
  }

  // Dragging a planned dinner onto another day swaps the two days' meals
  // (dropping on an empty day just moves it). Locks travel with their meals.
  function swapDays(from, to) {
    if (from === null || from === to) return;
    const nextWeek = [...week];
    [nextWeek[from], nextWeek[to]] = [nextWeek[to], nextWeek[from]];
    const nextLocks = [...locks];
    [nextLocks[from], nextLocks[to]] = [nextLocks[to], nextLocks[from]];
    setWeek(nextWeek);
    setLocks(nextLocks);
    setExpandedDay(null);
  }

  function clearDay(i) {
    const next = [...week];
    next[i] = null;
    setWeek(next);
  }

  function toggleLock(i) {
    const next = [...locks];
    next[i] = !next[i];
    setLocks(next);
  }

  function shuffleWeek() {
    // The plan being replaced becomes "last week" so the new one avoids repeats
    const current = week.filter(Boolean);
    const avoid = current.length > 0 ? new Set(current) : new Set(lastWeek);
    if (current.length > 0) setLastWeek(current);
    const kept = week.map((id, i) => (locks[i] && id ? id : null));
    const used = new Set(kept.filter(Boolean));
    const candidates = shufflePool.filter((m) => !used.has(m.id));
    // Variety memory first; when a narrow filter leaves too few fresh meals,
    // top the pool up with last week's rather than leaving days empty
    const fresh = shuffleMeals(candidates.filter((m) => !avoid.has(m.id)));
    const repeats = shuffleMeals(candidates.filter((m) => avoid.has(m.id)));
    setWeek(fillWeek(kept, [...fresh, ...repeats], activeQuotas));
    setSelectedDay(null);
  }

  function clearWeek() {
    const current = week.filter(Boolean);
    if (current.length > 0) setLastWeek(current);
    setWeek(Array(7).fill(null));
    setLocks(Array(7).fill(false));
    setSelectedDay(null);
    setExpandedDay(null);
    setChecked({});
  }

  async function copyList() {
    const lines = [];
    GROUP_ORDER.forEach((c) => {
      if (groceries[c].length === 0) return;
      lines.push(CAT_LABELS[c].toUpperCase());
      groceries[c].forEach((ing) => lines.push(`- ${groceryText(ing, c === "staples")}`));
      lines.push("");
    });
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard unavailable in some contexts
    }
  }

  async function copyLink() {
    const url = window.location.href.split("#")[0] + "#" + encodeSlug(week, servings);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      // Clipboard unavailable in some contexts
    }
  }

  function printWeek() {
    let framed = true;
    try {
      framed = window.self !== window.top;
    } catch (e) {
      framed = true;
    }
    if (!framed) {
      window.print();
      return;
    }
    // Embedded frames (like the artifact page) often silently block
    // window.print, so print a top-level copy of the current page instead
    const w = window.open("", "_blank");
    if (!w) {
      window.print();
      return;
    }
    w.document.write("<!doctype html>" + document.documentElement.outerHTML);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 350);
  }

  const btnBase = {
    fontFamily: FONT_BODY,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    borderRadius: 10,
  };

  return (
    <div style={{ minHeight: "100vh", background: P.paper, color: P.ink, fontFamily: FONT_BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito+Sans:wght@400;700;800&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 3px solid ${P.cherry}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media print {
          .no-print { display: none !important; }
          .print-card { break-inside: avoid; page-break-inside: avoid; }
          li { break-inside: avoid; page-break-inside: avoid; }
          .card-per-page .recipe-card { break-after: page; page-break-after: always; }
        }
        .ticket { position: relative; }
        .ticket::before {
          content: ""; position: absolute; top: -6px; left: 12px; right: 12px; height: 6px;
          background-image: radial-gradient(circle at 4px 6px, ${P.paper} 3px, transparent 3px);
          background-size: 12px 6px; background-repeat: repeat-x;
        }
      `}</style>

      {/* Header */}
      <header style={{ padding: "20px 16px 8px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34, margin: 0, letterSpacing: "-0.5px" }}>
            Seven Suppers
          </h1>
          <span style={{ fontSize: 11, color: P.inkSoft }}>v{APP_VERSION}</span>
        </div>
      </header>

      {/* View toggle */}
      <div className="no-print" style={{ maxWidth: 860, margin: "12px auto 0", padding: "0 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setView("plan")}
          style={{ ...btnBase, flex: 1, padding: "10px 0", fontSize: 15,
            background: view === "plan" ? P.ink : P.celerySoft,
            color: view === "plan" ? "#fff" : P.ink }}>
          Plan the week
        </button>
        <button
          onClick={() => setView("list")}
          disabled={plannedCount === 0}
          style={{ ...btnBase, flex: 1, padding: "10px 0", fontSize: 15,
            background: view === "list" ? P.cherry : P.cherrySoft,
            color: view === "list" ? "#fff" : plannedCount === 0 ? P.inkSoft : P.cherry,
            opacity: plannedCount === 0 ? 0.6 : 1 }}>
          Grocery list {plannedCount > 0 ? `(${plannedCount} meals)` : ""}
        </button>
        <button
          onClick={() => setView("print")}
          disabled={plannedCount === 0}
          style={{ ...btnBase, flex: 1, padding: "10px 0", fontSize: 15,
            background: view === "print" ? P.celery : P.celerySoft,
            color: view === "print" ? "#fff" : plannedCount === 0 ? P.inkSoft : P.ink,
            opacity: plannedCount === 0 ? 0.6 : 1 }}>
          Print week
        </button>
      </div>

      {/* House diet profile */}
      <div className="no-print" style={{ maxWidth: 860, margin: "10px auto 0", padding: "0 16px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: P.inkSoft }}>Eating style</span>
        {PROFILES.map((p) => (
          <button key={p.id} onClick={() => setProfile(p.id)} title={p.hint}
            aria-pressed={profile === p.id}
            style={{ ...btnBase, padding: "5px 11px", fontSize: 12,
              background: profile === p.id ? P.cherry : P.card,
              color: profile === p.id ? "#fff" : P.inkSoft,
              border: `1.5px solid ${profile === p.id ? P.cherry : P.line}` }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Servings */}
      <div className="no-print" style={{ maxWidth: 860, margin: "10px auto 0", padding: "0 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: P.inkSoft }}>Cooking for</span>
        <button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Fewer people"
          style={{ ...btnBase, background: P.celerySoft, color: P.ink, width: 32, height: 32, fontSize: 16 }}>
          -
        </button>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, minWidth: 20, textAlign: "center" }}>
          {servings}
        </span>
        <button onClick={() => setServings(Math.min(12, servings + 1))} aria-label="More people"
          style={{ ...btnBase, background: P.celerySoft, color: P.ink, width: 32, height: 32, fontSize: 16 }}>
          +
        </button>
        <span style={{ fontSize: 12, color: P.inkSoft }}>
          Recipes serve {BASE_SERVINGS}; ingredient amounts scale to match.
        </span>
      </div>

      {view === "plan" && (
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "16px" }}>
          {/* Week actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={shuffleWeek}
              style={{ ...btnBase, background: P.cherry, color: "#fff", padding: "10px 16px", fontSize: 14 }}>
              Shuffle the whole week
            </button>
            <button onClick={clearWeek}
              style={{ ...btnBase, background: "transparent", color: P.inkSoft, padding: "10px 12px", fontSize: 14,
                border: `1.5px solid ${P.line}` }}>
              Clear
            </button>
            <button onClick={copyLink} disabled={plannedCount === 0}
              title="Copy a link that opens this exact week on any device"
              style={{ ...btnBase, background: "transparent", color: plannedCount === 0 ? P.inkSoft : P.cherry,
                padding: "10px 12px", fontSize: 14, border: `1.5px solid ${P.line}`,
                opacity: plannedCount === 0 ? 0.6 : 1 }}>
              {linkCopied ? "Link copied" : "Copy week link"}
            </button>
          </div>

          {/* Shuffle filters: what the shuffle (and Reroll) may draw from */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft, marginRight: 2 }}>Shuffle from</span>
            <button onClick={() => setShuffleTime(shuffleTime === 35 ? null : 35)}
              aria-pressed={shuffleTime === 35}
              style={{ ...btnBase, padding: "5px 11px", fontSize: 12,
                background: shuffleTime === 35 ? P.ink : P.card,
                color: shuffleTime === 35 ? "#fff" : P.inkSoft,
                border: `1.5px solid ${shuffleTime === 35 ? P.ink : P.line}` }}>
              35 min or less
            </button>
            <button onClick={() => setShuffleNoSoups(!shuffleNoSoups)}
              aria-pressed={shuffleNoSoups}
              style={{ ...btnBase, padding: "5px 11px", fontSize: 12,
                background: shuffleNoSoups ? P.ink : P.card,
                color: shuffleNoSoups ? "#fff" : P.inkSoft,
                border: `1.5px solid ${shuffleNoSoups ? P.ink : P.line}` }}>
              No soups
            </button>
            <span aria-hidden="true" style={{ color: P.line }}>|</span>
            {SHUFFLE_DIETS.map((d) => (
              <button key={d.id} onClick={() => setShuffleDiet(d.id)}
                aria-pressed={shuffleDiet === d.id}
                style={{ ...btnBase, padding: "5px 11px", fontSize: 12,
                  background: shuffleDiet === d.id ? P.ink : P.card,
                  color: shuffleDiet === d.id ? "#fff" : P.inkSoft,
                  border: `1.5px solid ${shuffleDiet === d.id ? P.ink : P.line}` }}>
                {d.label}
              </button>
            ))}
            {shufflePool.length < 7 && (
              <span style={{ fontSize: 12, color: P.cherry, fontWeight: 700 }}>
                Only {shufflePool.length} dinners match, so a shuffle leaves some days empty.
              </span>
            )}
          </div>

          {/* Quota ceilings exceeded by hand-picked meals: warn, never block */}
          {quotaNotes.map((note) => (
            <div key={note} style={{ fontSize: 12, color: P.cherry, fontWeight: 700, marginBottom: 14 }}>
              {note}
            </div>
          ))}

          {/* Week rail: order tickets */}
          <section aria-label="Your week" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            {DAYS.map((day, i) => {
              const meal = week[i] ? MEALS.find((m) => m.id === week[i]) : null;
              const isSelected = selectedDay === i;
              const isLocked = !!meal && locks[i];
              const isDropTarget = dragDay !== null && dragOverDay === i && dragDay !== i;
              return (
                <div key={day} className="ticket"
                  draggable={!!meal}
                  onDragStart={(e) => {
                    setDragDay(i);
                    try { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; } catch (err) { /* jsdom and older browsers */ }
                  }}
                  onDragEnd={() => { setDragDay(null); setDragOverDay(null); }}
                  onDragOver={(e) => { if (dragDay !== null && dragDay !== i) { e.preventDefault(); setDragOverDay(i); } }}
                  onDragLeave={() => { if (dragOverDay === i) setDragOverDay(null); }}
                  onDrop={(e) => { e.preventDefault(); swapDays(dragDay, i); setDragDay(null); setDragOverDay(null); }}
                  style={{ background: P.card, borderRadius: 12, padding: "12px 14px",
                    border: isDropTarget ? `2px dashed ${P.cherry}` : isSelected ? `2px solid ${P.cherry}` : `1.5px solid ${P.line}`,
                    boxShadow: "0 1px 3px rgba(36,51,29,0.08)",
                    opacity: dragDay === i ? 0.5 : 1,
                    cursor: meal ? "grab" : "default" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {meal && (
                        <span aria-hidden="true" title="Drag onto another day to swap the two dinners"
                          style={{ color: P.line, fontSize: 18, lineHeight: 1, userSelect: "none", flexShrink: 0 }}>
                          ⠿
                        </span>
                      )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: P.celery }}>
                        {day}
                      </div>
                      {meal ? (
                        <button onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                          aria-expanded={expandedDay === i}
                          style={{ ...btnBase, background: "transparent", padding: 0, textAlign: "left", color: P.ink }}>
                          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 17, lineHeight: 1.25, display: "block" }}>
                            {meal.title}
                            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: P.inkSoft, fontWeight: 700 }}> {" "}{meal.time} min</span>
                            {meal.tags.includes("vegan") && <VeganChip />}
                            {!profileAllows(profile, meal) && <OutsideChip />}
                          </span>
                          <span style={{ fontSize: 11, color: P.inkSoft, textDecoration: "underline" }}>
                            {expandedDay === i ? "Hide recipe" : "Show recipe"}
                          </span>
                        </button>
                      ) : (
                        <button onClick={() => setSelectedDay(isSelected ? null : i)}
                          style={{ ...btnBase, background: "transparent", color: isSelected ? P.cherry : P.inkSoft,
                            padding: "2px 0", fontSize: 15, textDecoration: "underline" }}>
                          {isSelected ? "Now tap a meal below" : "Pick a dinner"}
                        </button>
                      )}
                    </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {meal ? (
                        <button onClick={() => toggleLock(i)}
                          aria-label={isLocked ? `Unlock ${day}` : `Lock ${day} so Shuffle keeps it`}
                          style={{ ...btnBase, background: isLocked ? P.ink : "transparent",
                            color: isLocked ? "#fff" : P.inkSoft, padding: "8px 10px", fontSize: 13,
                            border: `1.5px solid ${isLocked ? P.ink : P.line}` }}>
                          {isLocked ? "Locked" : "Lock"}
                        </button>
                      ) : null}
                      {!isLocked && (
                        <button onClick={() => setWeek(rerollDay(week, i, new Set(lastWeek), shufflePool, activeQuotas))} aria-label={`Randomize ${day}`}
                          style={{ ...btnBase, background: P.celerySoft, color: P.ink, padding: "8px 10px", fontSize: 13 }}>
                          Reroll
                        </button>
                      )}
                      {meal && !isLocked ? (
                        <>
                          <button onClick={() => setSelectedDay(isSelected ? null : i)} aria-label={`Swap ${day}`}
                            style={{ ...btnBase, background: isSelected ? P.cherry : P.cherrySoft,
                              color: isSelected ? "#fff" : P.cherry, padding: "8px 10px", fontSize: 13 }}>
                            Swap
                          </button>
                          <button onClick={() => clearDay(i)} aria-label={`Clear ${day}`}
                            style={{ ...btnBase, background: "transparent", color: P.inkSoft, padding: "8px 8px",
                              fontSize: 13, border: `1.5px solid ${P.line}` }}>
                            X
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {meal && expandedDay === i && <RecipeDetails meal={meal} scale={scale} />}
                </div>
              );
            })}
          </section>

          {/* Catalog */}
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>
            The dinner catalog
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: P.inkSoft }}>
            {selectedDay !== null
              ? `Tap any meal to put it on ${DAYS[selectedDay]}.`
              : "Tap a meal to see the recipe. Add to week fills the next empty day."}
          </p>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {visibleTagFilters.map((t) => (
              <button key={t.id} onClick={() => setFilter(t.id)}
                style={{ ...btnBase, padding: "6px 12px", fontSize: 13,
                  background: filter === t.id ? P.ink : P.card,
                  color: filter === t.id ? "#fff" : P.inkSoft,
                  border: `1.5px solid ${filter === t.id ? P.ink : P.line}` }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {filteredMeals.map((meal) => {
              const isOpen = expanded === meal.id;
              const inWeek = week.includes(meal.id);
              const addable = !inWeek && week.includes(null);
              return (
                <div key={meal.id}
                  style={{ background: P.card, borderRadius: 12, border: `1.5px solid ${P.line}`,
                    padding: "12px 14px", boxShadow: "0 1px 2px rgba(36,51,29,0.06)",
                    opacity: inWeek ? 0.45 : 1 }}>
                  <button onClick={() => (selectedDay !== null && !inWeek ? assignMeal(meal.id) : setExpanded(isOpen ? null : meal.id))}
                    style={{ ...btnBase, background: "transparent", padding: 0, textAlign: "left", width: "100%", color: P.ink }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, lineHeight: 1.3, display: "block" }}>
                      {meal.title}
                      {meal.tags.includes("vegan") && <VeganChip />}
                    </span>
                    <span style={{ fontSize: 12, color: P.inkSoft, fontWeight: 700 }}>
                      {meal.time} min {inWeek ? " | On the menu this week" : ""}
                    </span>
                  </button>
                  {isOpen && <RecipeDetails meal={meal} scale={scale} />}
                  {selectedDay === null && (
                    <button onClick={() => assignMeal(meal.id)} disabled={!addable}
                      style={{ ...btnBase, marginTop: 10, background: P.celerySoft, color: P.ink,
                        padding: "8px 12px", fontSize: 13, width: "100%",
                        opacity: addable ? 1 : 0.5, cursor: addable ? "pointer" : "default" }}>
                      {inWeek ? "On the menu" : week.includes(null) ? "Add to week" : "Week is full"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      )}

      {view === "list" && (
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, margin: 0 }}>Grocery list</h2>
            <button onClick={copyList} style={{ ...btnBase, background: P.cherry, color: "#fff", padding: "8px 14px", fontSize: 13 }}>
              {copied ? "Copied" : "Copy list"}
            </button>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: P.inkSoft }}>
            Everything for the {plannedCount} {plannedCount === 1 ? "dinner" : "dinners"} on your plan, scaled
            for {servings} {servings === 1 ? "person" : "people"}, combined and sorted by aisle. Bold is what to
            grab at the store; "need" is what the recipes actually use, in case your store's sizes differ.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px" }}>
            <label htmlFor="store-pick" style={{ fontSize: 13, fontWeight: 700, color: P.inkSoft }}>
              Shop at
            </label>
            <select id="store-pick" value={store} onChange={(e) => setStore(e.target.value)}
              style={{ fontFamily: FONT_BODY, fontSize: 13, padding: "6px 8px", borderRadius: 8,
                border: `1.5px solid ${P.line}`, background: P.card, color: P.ink }}>
              {STORES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {activeStore && (
              <span style={{ fontSize: 12, color: P.inkSoft }}>
                "Find it" opens each item at {activeStore.label}; add to cart, then check out as a pickup order.
              </span>
            )}
          </div>
          {GROUP_ORDER.map((c) =>
            groceries[c].length === 0 ? null : (
              <section key={c} style={{ background: P.card, borderRadius: 12, border: `1.5px solid ${P.line}`, padding: "12px 14px", marginBottom: 12 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: P.celery }}>
                  {CAT_LABELS[c]}
                </h3>
                {c === "staples" && (
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: P.inkSoft }}>
                    You probably have these already. Amounts are what the week uses; grab any you are missing.
                  </p>
                )}
                {groceries[c].map((ing) => {
                  const key = `${ing.n}|${ing.u}`;
                  const done = !!checked[key];
                  const line = groceryLine(ing, c === "staples");
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", flex: 1, minWidth: 0 }}>
                        <input type="checkbox" checked={done}
                          onChange={() => setChecked({ ...checked, [key]: !done })}
                          style={{ width: 18, height: 18, accentColor: P.cherry, flexShrink: 0 }} />
                        <span style={{ fontSize: 15, color: done ? P.inkSoft : P.ink,
                          textDecoration: done ? "line-through" : "none" }}>
                          <strong>{line.qty}</strong> {line.name}
                          {line.need && (
                            <>
                              {" "}<span style={{ fontSize: 13, color: P.inkSoft }}>(need {line.need})</span>
                            </>
                          )}
                        </span>
                      </label>
                      {activeStore && c !== "staples" && (
                        <a href={storeSearchUrl(ing, activeStore)} target="_blank" rel="noreferrer"
                          aria-label={`Find ${ing.n} at ${activeStore.label}`}
                          style={{ fontSize: 12, color: P.cherry, fontWeight: 700, flexShrink: 0 }}>
                          Find it
                        </a>
                      )}
                    </div>
                  );
                })}
              </section>
            )
          )}
        </main>
      )}

      {view === "print" && (
        <main className={cardPerPage ? "card-per-page" : undefined} style={{ maxWidth: 720, margin: "0 auto", padding: "16px" }}>
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: P.inkSoft }}>
              Everything below goes to paper. Choose "Save as PDF" in the print dialog to keep a copy.
              If nothing happens, allow pop-ups for this page or press Ctrl+P.
            </p>
            <button onClick={printWeek}
              style={{ ...btnBase, background: P.cherry, color: "#fff", padding: "8px 14px", fontSize: 13, flexShrink: 0 }}>
              Print or save as PDF
            </button>
          </div>
          <label className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, color: P.inkSoft, cursor: "pointer" }}>
            <input type="checkbox" checked={cardPerPage} onChange={() => setCardPerPage(!cardPerPage)}
              style={{ width: 16, height: 16, accentColor: P.cherry }} />
            One recipe per page, like a card deck
          </label>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, margin: "0 0 10px" }}>
            This week's dinners, for {servings} {servings === 1 ? "person" : "people"}
          </h2>
          {DAYS.map((day, i) => {
            const meal = week[i] ? MEALS.find((m) => m.id === week[i]) : null;
            if (!meal) return null;
            return (
              <section key={day} className="print-card recipe-card"
                style={{ background: P.card, borderRadius: 12, border: `1.5px solid ${P.line}`, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: P.celery }}>
                  {day}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 17, lineHeight: 1.25 }}>
                  {meal.title}
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: P.inkSoft, fontWeight: 700 }}> {" "}{meal.time} min</span>
                </div>
                <RecipeDetails meal={meal} scale={scale} />
              </section>
            );
          })}
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, margin: "16px 0 10px",
            ...(cardPerPage ? {} : { breakBefore: "page", pageBreakBefore: "always" }) }}>
            Grocery list
          </h2>
          {GROUP_ORDER.map((c) =>
            groceries[c].length === 0 ? null : (
              <section key={c} className="print-card" style={{ marginBottom: 10 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: P.celery }}>
                  {CAT_LABELS[c]}
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groceries[c].map((ing) => (
                    <li key={`${ing.n}|${ing.u}`} style={{ fontSize: 14, marginBottom: 2 }}>
                      {groceryText(ing, c === "staples")}
                    </li>
                  ))}
                </ul>
              </section>
            )
          )}
        </main>
      )}

      <footer className="no-print" style={{ maxWidth: 860, margin: "0 auto", padding: "8px 16px 28px", fontSize: 12, color: P.inkSoft, lineHeight: 1.5 }}>
        Eating styles follow common published dietary guidance, and doneness checks follow USDA
        temperatures. Recipes contain common allergens (peanuts, eggs, dairy, wheat, soy, fish);
        check ingredient lists against your own needs. This is a home cooking tool, not medical
        advice; for questions about your own diet, check with your doctor or a dietitian.
      </footer>
    </div>
  );
}
