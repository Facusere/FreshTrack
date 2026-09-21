export type ShelfLifeState = "cerrado" | "abierto";

export type ShelfLifeEntry = {
  id: string;
  name: string;
  category: string;
  closedDays: number;
  openDays: number;
  region: "Argentina/LatAm";
  source: "base" | "comunidad";
  votes: number;
  confidence: "base" | "validada" | "pendiente";
};

export type ShelfLifeSuggestion = {
  productId: string;
  productName: string;
  category: string;
  state: ShelfLifeState;
  days: number;
  userIds: string[];
  createdAt: string;
};

type CategorySeed = { category: string; closedDays: number; openDays: number; names: string[] };

// Base regional inicial: 15 categorías x 20 productos = 300 productos comunes.
// Los valores son promedios operativos para estimar vencimientos; siempre debe prevalecer la etiqueta del envase.
const categorySeeds: CategorySeed[] = [
  { category: "Lácteos", closedDays: 21, openDays: 5, names: ["Leche entera", "Leche descremada", "Leche larga vida", "Leche deslactosada", "Leche chocolatada", "Yogur natural", "Yogur bebible", "Yogur con cereales", "Yogur griego", "Yogur descremado", "Postre de vainilla", "Flan casero", "Queso cremoso", "Queso port salut", "Queso pategrás", "Queso reggianito", "Queso azul", "Ricota", "Crema de leche", "Manteca"] },
  { category: "Fiambres y embutidos", closedDays: 14, openDays: 4, names: ["Jamón cocido", "Jamón crudo", "Paleta cocida", "Pastrón", "Mortadela", "Salame milán", "Salame cantimpalo", "Salchichón primavera", "Lomito ahumado", "Bondiola feteada", "Pechuga de pavo", "Panceta ahumada", "Chorizo fresco", "Chorizo colorado", "Morcilla", "Salchichas", "Leberwurst", "Paté de hígado", "Matambre arrollado", "Carne mechada"] },
  { category: "Carnes", closedDays: 4, openDays: 2, names: ["Asado de tira", "Vacío", "Entraña", "Bife de chorizo", "Colita de cuadril", "Nalga", "Bola de lomo", "Roast beef", "Palomita", "Osobuco", "Carne picada", "Hamburguesa vacuna", "Pechuga de pollo", "Pata muslo", "Alitas de pollo", "Pollo entero", "Pechuga de pavo", "Bondiola de cerdo", "Costeleta de cerdo", "Carré de cerdo"] },
  { category: "Pescados y mariscos", closedDays: 3, openDays: 1, names: ["Merluza", "Salmón", "Trucha", "Atún fresco", "Pejerrey", "Brótola", "Lenguado", "Corvina", "Dorado", "Surubí", "Calamar", "Rabas", "Langostinos", "Camarones", "Mejillones", "Almejas", "Pulpo", "Filet de merluza", "Hamburguesa de pescado", "Bastones de pescado"] },
  { category: "Verduras frescas", closedDays: 7, openDays: 3, names: ["Papa", "Batata", "Cebolla", "Cebolla de verdeo", "Ajo", "Puerro", "Zanahoria", "Zapallo anco", "Zapallito", "Berenjena", "Tomate redondo", "Tomate cherry", "Morrón rojo", "Morrón verde", "Pepino", "Brócoli", "Coliflor", "Espinaca fresca", "Acelga", "Rúcula"] },
  { category: "Frutas frescas", closedDays: 7, openDays: 3, names: ["Banana", "Manzana roja", "Manzana verde", "Pera", "Naranja", "Mandarina", "Pomelo", "Limón", "Palta", "Frutilla", "Arándanos", "Uva", "Durazno", "Nectarina", "Ciruela", "Kiwi", "Ananá", "Mango", "Sandía", "Melón"] },
  { category: "Panadería", closedDays: 5, openDays: 3, names: ["Pan lactal", "Pan de molde integral", "Pan francés", "Pan mignon", "Baguette", "Pan árabe", "Tortillas de trigo", "Tortillas de maíz", "Rapiditas", "Prepizza", "Focaccia", "Ciabatta", "Pan de hamburguesa", "Pan de pancho", "Medialunas", "Facturas", "Torta de ricota", "Budín de limón", "Bizcochitos", "Galletas de agua"] },
  { category: "Almacén seco", closedDays: 365, openDays: 30, names: ["Arroz largo fino", "Arroz integral", "Arroz parboil", "Fideos spaghetti", "Fideos tirabuzón", "Fideos mostachol", "Fideos cabello de ángel", "Lentejas secas", "Porotos alubia", "Garbanzos secos", "Arvejas partidas", "Polenta", "Harina 000", "Harina leudante", "Harina integral", "Pan rallado", "Avena arrollada", "Cuscús", "Quinoa", "Semolín"] },
  { category: "Enlatados y conservas", closedDays: 730, openDays: 4, names: ["Atún al natural", "Atún en aceite", "Caballa en aceite", "Sardinas", "Choclo en lata", "Arvejas en lata", "Lentejas en lata", "Porotos en lata", "Garbanzos en lata", "Tomate triturado", "Tomate perita", "Puré de tomate", "Pimientos en conserva", "Champiñones en lata", "Palmitos", "Ananá en almíbar", "Duraznos en almíbar", "Jardinera de verduras", "Aceitunas verdes", "Aceitunas negras"] },
  { category: "Congelados", closedDays: 180, openDays: 30, names: ["Papas prefritas", "Medallones de pollo", "Nuggets de pollo", "Hamburguesas congeladas", "Arvejas congeladas", "Choclo congelado", "Espinaca congelada", "Brócoli congelado", "Coliflor congelada", "Mix de verduras", "Frutillas congeladas", "Arándanos congelados", "Milanesa de carne", "Milanesa de pollo", "Ravioles congelados", "Ñoquis congelados", "Empanadas congeladas", "Pizza congelada", "Helado de crema", "Helado de agua"] },
  { category: "Salsas y aderezos", closedDays: 365, openDays: 45, names: ["Mayonesa", "Ketchup", "Mostaza", "Salsa golf", "Salsa barbacoa", "Salsa de soja", "Salsa picante", "Salsa César", "Salsa de tomate", "Tuco listo", "Pesto", "Salsa cuatro quesos", "Salsa fileto", "Salsa de hongos", "Vinagre de alcohol", "Vinagre de manzana", "Aceto balsámico", "Aceite de oliva", "Aceite de girasol", "Aceite mezcla"] },
  { category: "Snacks y galletitas", closedDays: 180, openDays: 10, names: ["Papas fritas de paquete", "Chizitos", "Palitos salados", "Maní tostado", "Maní con chocolate", "Mix de frutos secos", "Nueces", "Almendras", "Pistachos", "Garrapiñada", "Galletitas dulces", "Galletitas con chips", "Galletitas de chocolate", "Galletitas rellenas", "Galletitas integrales", "Crackers", "Tostadas", "Barra de cereal", "Alfajor de chocolate", "Alfajor de maicena"] },
  { category: "Bebidas", closedDays: 365, openDays: 3, names: ["Agua mineral", "Agua saborizada", "Gaseosa cola", "Gaseosa lima limón", "Gaseosa naranja", "Jugo en polvo", "Jugo listo", "Néctar de durazno", "Limonada", "Bebida isotónica", "Bebida energética", "Cerveza rubia", "Cerveza roja", "Cerveza sin alcohol", "Vino tinto", "Vino blanco", "Vino rosado", "Sidra", "Fernet", "Vermú"] },
  { category: "Café, té y desayuno", closedDays: 365, openDays: 45, names: ["Café molido", "Café instantáneo", "Cápsulas de café", "Café torrado", "Té negro", "Té verde", "Té de hierbas", "Mate cocido", "Yerba mate", "Yerba compuesta", "Cacao en polvo", "Leche en polvo", "Mermelada de durazno", "Mermelada de frutilla", "Dulce de leche", "Miel", "Pasta de maní", "Granola", "Cereales de maíz", "Cereales de chocolate"] },
  { category: "Refrigerados preparados", closedDays: 7, openDays: 3, names: ["Hummus", "Guacamole", "Ensalada rusa", "Ensalada de papa", "Ensalada de quinoa", "Ensalada César", "Pasta fresca", "Ravioles frescos", "Sorrentinos frescos", "Ñoquis frescos", "Tapa de empanada", "Tapa de pascualina", "Masa de tarta", "Masa de pizza", "Tofu", "Tempeh", "Sopa refrigerada", "Caldo casero", "Comida preparada", "Pollo cocido"] },
];

const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const shelfLifeCatalog: ShelfLifeEntry[] = categorySeeds.flatMap((seed) => seed.names.map((name) => ({
  id: `${slug(seed.category)}-${slug(name)}`,
  name,
  category: seed.category,
  closedDays: seed.closedDays,
  openDays: seed.openDays,
  region: "Argentina/LatAm" as const,
  source: "base" as const,
  votes: 0,
  confidence: "base" as const,
})));

const SUGGESTIONS_KEY = "freshtrack-shelf-life-suggestions-v1";
const VALIDATED_KEY = "freshtrack-shelf-life-community-v1";
const VALIDATION_THRESHOLD = 3;

export function getCatalogSize() { return shelfLifeCatalog.length; }

export function findShelfLife(productName: string, category?: string): ShelfLifeEntry | undefined {
  const normalized = slug(productName);
  const community = loadValidatedShelfLife();
  const fromCommunity = community.find((entry) => slug(entry.name) === normalized);
  if (fromCommunity) return fromCommunity;
  return shelfLifeCatalog.find((entry) => slug(entry.name) === normalized || (category && entry.category === category));
}

export function estimateShelfLife(productName: string, state: ShelfLifeState = "cerrado", category?: string) {
  const entry = findShelfLife(productName, category);
  if (!entry) return undefined;
  return { ...entry, days: state === "abierto" ? entry.openDays : entry.closedDays, state };
}

export function loadValidatedShelfLife(): ShelfLifeEntry[] {
  try { return JSON.parse(localStorage.getItem(VALIDATED_KEY) || "[]") as ShelfLifeEntry[]; } catch { return []; }
}

export function loadShelfLifeSuggestions(): ShelfLifeSuggestion[] {
  try { return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || "[]") as ShelfLifeSuggestion[]; } catch { return []; }
}

export function submitShelfLifeSuggestion(input: Omit<ShelfLifeSuggestion, "userIds" | "createdAt">, userId = "local-user") {
  const suggestions = loadShelfLifeSuggestions();
  const key = `${slug(input.productName)}:${input.state}:${input.days}`;
  const existing = suggestions.find((suggestion) => `${slug(suggestion.productName)}:${suggestion.state}:${suggestion.days}` === key);
  if (existing) { if (!existing.userIds.includes(userId)) existing.userIds.push(userId); } else suggestions.push({ ...input, userIds: [userId], createdAt: new Date().toISOString() });
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  const matching = suggestions.find((suggestion) => `${slug(suggestion.productName)}:${suggestion.state}:${suggestion.days}` === key)!;
  if (matching.userIds.length >= VALIDATION_THRESHOLD) validateShelfLifeSuggestion(matching);
  return { ...matching, validated: matching.userIds.length >= VALIDATION_THRESHOLD, votesNeeded: Math.max(0, VALIDATION_THRESHOLD - matching.userIds.length) };
}

function validateShelfLifeSuggestion(suggestion: ShelfLifeSuggestion) {
  const validated = loadValidatedShelfLife();
  const existing = validated.find((entry) => slug(entry.name) === slug(suggestion.productName));
  const base = shelfLifeCatalog.find((entry) => slug(entry.name) === slug(suggestion.productName));
  const entry: ShelfLifeEntry = {
    id: base?.id || `community-${slug(suggestion.productName)}`,
    name: suggestion.productName,
    category: suggestion.category || base?.category || "Otros",
    closedDays: base?.closedDays || suggestion.days,
    openDays: base?.openDays || Math.max(1, Math.round(suggestion.days / 5)),
    region: "Argentina/LatAm",
    source: "comunidad",
    votes: suggestion.userIds.length,
    confidence: "validada",
  };
  if (suggestion.state === "abierto") entry.openDays = suggestion.days; else entry.closedDays = suggestion.days;
  if (existing) Object.assign(existing, entry); else validated.push(entry);
  localStorage.setItem(VALIDATED_KEY, JSON.stringify(validated));
}

export function getValidationThreshold() { return VALIDATION_THRESHOLD; }
