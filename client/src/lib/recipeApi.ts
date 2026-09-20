export type RecipeSuggestion = {
  id: string;
  title: string;
  image: string;
  area?: string;
  category?: string;
  matchedIngredients: string[];
  source: "TheMealDB" | "FreshTrack";
  url?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  instructions?: string;
};

type MealFilterResponse = { meals?: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null };
type MealDetail = { idMeal: string; strMeal: string; strMealThumb: string; strArea?: string; strCategory?: string; strInstructions?: string; [key: string]: string | undefined };

const ingredientAliases: Record<string, string> = {
  "espinaca fresca": "spinach",
  "tomates cherry": "tomato",
  "tomate redondo": "tomato",
  "pechuga de pollo": "chicken_breast",
  "pollo entero": "chicken",
  "leche entera": "milk",
  "huevo": "egg",
  "papas": "potatoes",
  "cebolla": "onion",
  "arroz largo fino": "rice",
  "pasta seca": "pasta",
};

const fallbackRecipes: RecipeSuggestion[] = [
  {
    id: "fallback-tortilla",
    title: "Tortilla verde de aprovechamiento",
    image: "https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg",
    matchedIngredients: ["Espinaca fresca", "Huevos"],
    source: "FreshTrack",
    ingredients: [
      { name: "espinaca", measure: "1 atado lavado" },
      { name: "huevos", measure: "3 unidades" },
      { name: "cebolla", measure: "1/2 unidad picada" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "sal y pimienta", measure: "a gusto" },
    ],
    instructions: "Lavá y picá la espinaca y la cebolla.\nSalteá la cebolla en una sartén con aceite hasta transparentar.\nSumá la espinaca y cociná por 2 minutos hasta que reduzca su volumen.\nBatí los huevos con sal y pimienta, e incorporá la verdura salteada.\nVolcá en la sartén caliente y cociná 4 minutos por lado hasta que cuaje bien.",
  },
  {
    id: "fallback-pollo",
    title: "Pollo salteado con verduras",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pechuga de pollo", "Tomates cherry"],
    source: "FreshTrack",
    ingredients: [
      { name: "pechuga de pollo", measure: "2 bifes cortados en tiras" },
      { name: "tomates cherry", measure: "1 taza cortados al medio" },
      { name: "aceite", measure: "1 cucharada" },
      { name: "ajo", measure: "1 diente picado" },
      { name: "sal y orégano", measure: "a gusto" },
    ],
    instructions: "Cortá el pollo en tiras finas y condimentá con sal y ajo picado.\nCalentá una sartén con aceite a fuego medio-alto y sellá el pollo por 5 minutos.\nAgregá los tomates cherry y salteá 3 minutos hasta que suelten jugo.\nCondimentá con orégano y serví recién preparado.",
  },
  {
    id: "fallback-pasta",
    title: "Pasta cremosa con lo que hay",
    image: "https://www.themealdb.com/images/media/meals/ustsqw1511384527.jpg",
    matchedIngredients: ["Pasta seca", "Leche entera"],
    source: "FreshTrack",
    ingredients: [
      { name: "pasta seca", measure: "200 gramos" },
      { name: "leche entera", measure: "1 taza" },
      { name: "queso", measure: "50 gramos rallado" },
      { name: "manteca o aceite", measure: "1 cucharada" },
      { name: "sal y nuez moscada", measure: "a gusto" },
    ],
    instructions: "Herví la pasta en abundante agua con sal hasta que esté al dente.\nEn una ollita derretí la manteca, sumá la leche caliente y el queso rallado.\nMezclá a fuego bajo hasta que se forme una salsa cremosa.\nEscurrí la pasta, mezclala con la salsa y serví con un toque de pimienta.",
  },
  {
    id: "fallback-ensalada",
    title: "Ensalada tibia de verduras",
    image: "https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg",
    matchedIngredients: ["Tomates cherry", "Espinaca fresca"],
    source: "FreshTrack",
    ingredients: [
      { name: "tomates cherry", measure: "150 gramos" },
      { name: "espinaca fresca", measure: "1 atado tierno" },
      { name: "aceite de oliva", measure: "2 cucharadas" },
      { name: "semillas o frutos secos", measure: "1 puñado" },
      { name: "aceto o vinagre", measure: "1 cucharadita" },
    ],
    instructions: "Lavá y secá bien las hojas de espinaca fresca.\nSalteá los tomates cherry en una sartén caliente con aceite de oliva 2 minutos.\nColocá la espinaca en un bol y volcá los tomates tibios por encima.\nTerminá con semillas tostadas y un aderezo suave.",
  },
  {
    id: "fallback-arroz",
    title: "Arroz salteado de heladera",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Arroz largo fino", "Cebolla"],
    source: "FreshTrack",
    ingredients: [
      { name: "arroz cocido", measure: "2 tazas sobrantes" },
      { name: "cebolla", measure: "1 unidad picada" },
      { name: "huevo", measure: "1 o 2 unidades" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "salsa de soja o sal", measure: "a gusto" },
    ],
    instructions: "Calentá el aceite en un wok o sartén amplia a fuego alto.\nRehogá la cebolla picada hasta que tome color dorado suave.\nAgregá el arroz frío y desgranalo salteando constantemente durante 3 minutos.\nHacé un hueco al centro, volcá el huevo batido, revolvé y mezclá todo.",
  },
  {
    id: "fallback-huevos",
    title: "Huevos revueltos con verdes",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Huevos", "Espinaca fresca"],
    source: "FreshTrack",
    ingredients: [
      { name: "huevos", measure: "2 unidades" },
      { name: "espinaca fresca", measure: "1 puñado picado" },
      { name: "manteca o aceite", measure: "1 cucharadita" },
      { name: "sal y pimienta", measure: "a gusto" },
    ],
    instructions: "Picá la espinaca fresca finamente.\nBatí ligeramente los huevos en un bol con sal y pimienta.\nCalentá la sartén con la manteca a fuego bajo y sumá la espinaca un minuto.\nVolcá los huevos y revolvé suavemente con espátula hasta que queden cremosos.",
  },
  {
    id: "fallback-sopa",
    title: "Sopa rápida de verduras",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Verduras", "Cebolla"],
    source: "FreshTrack",
    ingredients: [
      { name: "cebolla", measure: "1 unidad" },
      { name: "verduras surtidas", measure: "300 gramos" },
      { name: "agua o caldo", measure: "750 ml" },
      { name: "aceite", measure: "1 cucharada" },
      { name: "sal y laurel", measure: "a gusto" },
    ],
    instructions: "Cortá las verduras que tengas en cubos medianos.\nDorá la cebolla en una cacerola con aceite durante 3 minutos.\nAgregá el resto de las verduras, el agua y una hojita de laurel.\nHerví tapado a fuego suave durante 18 minutos hasta que todo esté tierno.",
  },
  {
    id: "fallback-papas",
    title: "Papas al horno con hierbas",
    image: "https://www.themealdb.com/images/media/meals/1549542994.jpg",
    matchedIngredients: ["Papas", "Aceite"],
    source: "FreshTrack",
    ingredients: [
      { name: "papas", measure: "3 unidades medianas" },
      { name: "aceite", measure: "3 cucharadas" },
      { name: "romero o pimentón", measure: "1 cucharadita" },
      { name: "sal gruesa", measure: "a gusto" },
    ],
    instructions: "Lavá bien las papas y cortalas en gajos o cubos parejos.\nColocalas en una asadera, rociá con aceite y condimentá con pimentón y sal.\nMezclá para que queden bien cubiertas.\nLlevalas a horno fuerte a 200°C durante 30 a 35 minutos hasta que queden crocantes.",
  },
  {
    id: "fallback-tostada",
    title: "Tostada de palta y tomate",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pan", "Palta", "Tomates cherry"],
    source: "FreshTrack",
    ingredients: [
      { name: "pan", measure: "2 rodajas tostadas" },
      { name: "palta", measure: "1/2 unidad pisada" },
      { name: "tomates cherry", measure: "4 unidades en rodajitas" },
      { name: "limón y sal", measure: "unas gotas a gusto" },
    ],
    instructions: "Tostá las rodajas de pan hasta que queden crujientes.\nPisá la palta con un tenedor agregando unas gotas de limón y sal.\nUntá generosamente sobre las tostadas.\nCompletá con los tomates cherry cortados y un toque de pimienta.",
  },
  {
    id: "fallback-yogur",
    title: "Yogur con fruta y avena",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Yogur natural", "Frutas"],
    source: "FreshTrack",
    ingredients: [
      { name: "yogur natural", measure: "1 pote" },
      { name: "fruta de estación", measure: "1 taza picada" },
      { name: "avena arrollada", measure: "3 cucharadas" },
      { name: "miel", measure: "1 cucharadita opcional" },
    ],
    instructions: "Serví el yogur natural en un bol.\nAgregá la fruta fresca madura cortada en trozos chicos.\nEspolvoreá la avena por encima y endulzá con miel a gusto.",
  },
  {
    id: "fallback-legumbres",
    title: "Ensalada de lentejas",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Lentejas", "Tomates cherry"],
    source: "FreshTrack",
    ingredients: [
      { name: "lentejas cocidas o en lata", measure: "1 taza escurrida" },
      { name: "tomates cherry", measure: "1/2 taza en mitades" },
      { name: "cebolla o verdeo", measure: "2 cucharadas picadas" },
      { name: "aceite y limón", measure: "para aliñar" },
    ],
    instructions: "Enjuagá y escurrí bien las lentejas cocidas.\nMezclalas en un bol con los tomates cherry y la cebolla picada.\nCondimentá con aceite, jugo de limón, sal y pimienta.\nDejá reposar 5 minutos antes de servir para integrar los sabores.",
  },
  {
    id: "fallback-pollo-horno",
    title: "Pollo al horno con papas",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pechuga de pollo", "Papas"],
    source: "FreshTrack",
    ingredients: [
      { name: "pechuga o presas de pollo", measure: "2 piezas" },
      { name: "papas", measure: "2 unidades cortadas" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "limón, sal y orégano", measure: "a gusto" },
    ],
    instructions: "Acomodá el pollo y las papas cortadas en una fuente para horno.\nRociá con el jugo de limón y aceite.\nCondimentá con sal, pimienta y orégano generosamente.\nHorneá a 190°C durante 40 minutos hasta que el pollo esté cocido y las papas doradas.",
  },
];

const spanishInstructionMap: Array<[RegExp, string]> = [
  [/preheat|heat the oven/i, "Precalentá el horno"],
  [/chop|slice|dice|cut/i, "Cortá los ingredientes"],
  [/add|place|put|pour/i, "Agregá los ingredientes"],
  [/mix|stir|combine|whisk/i, "Mezclá todo hasta integrar"],
  [/cook|fry|saute|sauté/i, "Cociná a fuego medio"],
  [/bake|roast/i, "Horneá hasta que esté dorado"],
  [/boil|simmer/i, "Herví hasta que esté tierno"],
  [/season|garnish/i, "Condimentá a gusto"],
  [/serve|enjoy/i, "Serví caliente y disfrutá"],
  [/remove from heat|drain/i, "Retirá del fuego y escurrí"],
];

const spanishFoodWords: Record<string, string> = {
  spinach: "espinaca",
  tomato: "tomate",
  tomatoes: "tomates",
  onion: "cebolla",
  onions: "cebollas",
  garlic: "ajo",
  chicken: "pollo",
  beef: "carne vacuna",
  pork: "cerdo",
  salmon: "salmón",
  fish: "pescado",
  tuna: "atún",
  potato: "papa",
  potatoes: "papas",
  egg: "huevo",
  eggs: "huevos",
  milk: "leche",
  cream: "crema",
  cheese: "queso",
  butter: "manteca",
  bread: "pan",
  flour: "harina",
  rice: "arroz",
  pasta: "pasta",
  oil: "aceite",
  salt: "sal",
  pepper: "pimienta",
  water: "agua",
  curry: "curry",
  powder: "en polvo",
  fresh: "fresco",
  salad: "ensalada",
  soup: "sopa",
  beans: "porotos",
  lentils: "lentejas",
  avocado: "palta",
  oats: "avena",
  fruit: "fruta",
  vegetables: "verduras",
  vegetable: "verdura",
  carrot: "zanahoria",
  carrots: "zanahorias",
  lemon: "limón",
  lime: "lima",
  sugar: "azúcar",
  parsley: "perejil",
  oregano: "orégano",
  cilantro: "cilantro",
  basil: "albahaca",
  sauce: "salsa",
};

const knownTitleTranslations: Record<string, string> = {
  "curried spinach from botswana": "Espinaca al curry de Botswana",
  "potato gratin with chicken": "Gratín de papas con pollo",
  "salmon avocado salad": "Ensalada de salmón y palta",
  "algerian bouzgene berber bread with roasted pepper sauce": "Pan bereber argelino con salsa de morrones asados",
  "arepa pabellón": "Arepa pabellón",
};

function translateFoodText(value: string) {
  return value.split(/(\s+)/).map((part) => spanishFoodWords[part.toLowerCase()] || part).join("");
}

function translateRecipeTitle(value: string) {
  return knownTitleTranslations[value.toLowerCase()] || translateFoodText(value);
}

function translateInstructions(instructions?: string) {
  if (!instructions) return "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.";
  return instructions.split(/\r?\n+/).filter(Boolean).map((step) => {
    const translated = spanishInstructionMap.find(([pattern]) => pattern.test(step))?.[1];
    return translated ? `${translated}.` : "Continuá la preparación hasta integrar bien los ingredientes.";
  }).join("\n");
}

function toApiIngredient(name: string) {
  const normalized = name.toLowerCase().trim();
  return ingredientAliases[normalized] || normalized.replace(/\s+/g, "_");
}

export async function searchRecipesByIngredients(ingredients: string[], signal?: AbortSignal): Promise<RecipeSuggestion[]> {
  const usable = ingredients.filter(Boolean).slice(0, 4);
  if (!usable.length) return fallbackRecipes;
  try {
    const responses = await Promise.all(usable.map(async (ingredient) => {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(toApiIngredient(ingredient))}`, { signal });
      if (!response.ok) throw new Error("TheMealDB no respondió");
      const data = await response.json() as MealFilterResponse;
      return (data.meals || []).slice(0, 5).map((meal) => ({ ...meal, matchedIngredient: ingredient }));
    }));
    const deduped = new Map<string, RecipeSuggestion>();
    responses.flat().forEach((meal) => {
      const current = deduped.get(meal.idMeal);
      if (current) current.matchedIngredients = Array.from(new Set([...current.matchedIngredients, meal.matchedIngredient]));
      else deduped.set(meal.idMeal, { id: meal.idMeal, title: translateRecipeTitle(meal.strMeal), image: meal.strMealThumb, matchedIngredients: [meal.matchedIngredient], source: "TheMealDB", url: `https://www.themealdb.com/meal.php?c=${meal.idMeal}` });
    });
    const results = Array.from(deduped.values()).sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length).slice(0, 12);
    return results.length ? results : fallbackRecipes;
  } catch {
    return fallbackRecipes;
  }
}

export async function getRecipeDetails(recipe: RecipeSuggestion, signal?: AbortSignal): Promise<RecipeSuggestion> {
  if (recipe.source === "FreshTrack") return recipe;
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.id}`, { signal });
  if (!response.ok) throw new Error("No se pudo cargar el detalle");
  const data = await response.json() as { meals?: MealDetail[] | null };
  const meal = data.meals?.[0];
  if (!meal) return recipe;
  const ingredients = Array.from({ length: 20 }, (_, index) => index + 1).map((index) => ({ name: translateFoodText(meal[`strIngredient${index}`]?.trim() || ""), measure: meal[`strMeasure${index}`]?.trim() || "" })).filter((item) => item.name);
  return { ...recipe, title: translateRecipeTitle(meal.strMeal), area: meal.strArea, category: meal.strCategory, ingredients, instructions: translateInstructions(meal.strInstructions) };
}
