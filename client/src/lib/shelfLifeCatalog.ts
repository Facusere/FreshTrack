/**
 * Catálogo de Vida Útil de Alimentos y Estimación Inocua
 *
 * Fuentes de referencia técnica para conservación e inocuidad alimentaria:
 * - USDA FoodKeeper App (Food Safety and Inspection Service, U.S. Department of Agriculture)
 *   https://www.foodsafety.gov/keep-food-safe/foodkeeper-app
 * - ANMAT / Código Alimentario Argentino (CAA) - Cap. II y Criterios microbiológicos para alimentos perecederos
 * - INTA (Instituto Nacional de Tecnología Agropecuaria, Argentina) - Guías de manipulación y frío hogareño
 *
 * Principio rector:
 * Si un alimento es desconocido, se utiliza el valor más CONSERVADOR (menor duración)
 * de la categoría y se advierte al usuario ("Estimado por categoría, verificá la fecha del envase").
 * Si el usuario realiza una corrección, se guarda localmente y se prioriza como "Con tu ajuste anterior".
 */

export type ShelfLifeState = "cerrado" | "abierto";
export type ShelfLifeConfidence = "specific" | "user-correction" | "category-estimate";

export type ShelfLifeEntry = {
  id: string;
  name: string;
  category: string;
  closedDays: number;
  openDays: number;
  aliases: string[];
  notes?: string;
};

export type ShelfLifeCorrection = {
  productName: string;
  normalizedName: string;
  closedDays: number;
  openDays: number;
  updatedAt: string;
};

export type ShelfLifeEstimate = {
  name: string;
  category: string;
  days: number;
  closedDays: number;
  openDays: number;
  state: ShelfLifeState;
  confidence: ShelfLifeConfidence;
  source: "base" | "user-correction" | "category-minimum";
  label?: string;
};

export const normalizeSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Base regional con productos específicos y duraciones reales de referencia
export const SPECIFIC_PRODUCTS: ShelfLifeEntry[] = [
  // --- LÁCTEOS ---
  {
    id: "lacteos-leche-entera",
    name: "Leche entera",
    category: "Lácteos",
    closedDays: 5,
    openDays: 3,
    aliases: ["leche", "leche fluida", "leche sachet", "leche entera sachet", "leche pasteurizada"],
    notes: "USDA: 5-7 días de compra, 3 días abierta refrigerada a < 4°C",
  },
  {
    id: "lacteos-leche-descremada",
    name: "Leche descremada",
    category: "Lácteos",
    closedDays: 5,
    openDays: 3,
    aliases: ["leche descremada sachet", "leche descremada fluida"],
  },
  {
    id: "lacteos-leche-larga-vida",
    name: "Leche larga vida",
    category: "Lácteos",
    closedDays: 90,
    openDays: 4,
    aliases: ["leche uat", "leche tetra", "leche larga vida entera", "leche larga vida descremada"],
    notes: "En envase cerrado a temperatura ambiente hasta 90 días; una vez abierta, 3-4 días en heladera",
  },
  {
    id: "lacteos-leche-chocolatada",
    name: "Leche chocolatada",
    category: "Lácteos",
    closedDays: 30,
    openDays: 3,
    aliases: ["chocolatada", "leche con chocolate", "cindor"],
  },
  {
    id: "lacteos-yogur-natural",
    name: "Yogur natural",
    category: "Lácteos",
    closedDays: 14,
    openDays: 4,
    aliases: ["yogur", "yogurt", "yogur firme", "yogur bebible", "yogur descremado", "yogur griego"],
    notes: "USDA: 1-2 semanas en refrigerador",
  },
  {
    id: "lacteos-ricota",
    name: "Ricota",
    category: "Lácteos",
    closedDays: 7,
    openDays: 3,
    aliases: ["ricotta", "queso ricota"],
    notes: "Queso fresco de alta humedad; muy perecedero (3-4 días abierto)",
  },
  {
    id: "lacteos-crema-leche",
    name: "Crema de leche",
    category: "Lácteos",
    closedDays: 12,
    openDays: 3,
    aliases: ["crema", "crema para cocinar", "crema chantilly"],
  },
  {
    id: "lacteos-manteca",
    name: "Manteca",
    category: "Lácteos",
    closedDays: 60,
    openDays: 21,
    aliases: ["mantequilla"],
    notes: "USDA: 1-2 meses en refrigerador",
  },
  {
    id: "lacteos-queso-cremoso",
    name: "Queso cremoso / cuartirolo",
    category: "Lácteos",
    closedDays: 21,
    openDays: 7,
    aliases: ["queso cremoso", "cuartirolo", "queso mantecoso", "muzzarella", "mozzarella"],
  },
  {
    id: "lacteos-queso-port-salut",
    name: "Queso port salut",
    category: "Lácteos",
    closedDays: 21,
    openDays: 7,
    aliases: ["port salut", "queso por salut", "queso magro"],
  },
  {
    id: "lacteos-queso-pategras",
    name: "Queso semiduro (pategrás / gouda / tybo)",
    category: "Lácteos",
    closedDays: 45,
    openDays: 14,
    aliases: ["queso pategras", "queso gouda", "queso tybo", "queso de máquina", "queso barra"],
  },
  {
    id: "lacteos-queso-duro",
    name: "Queso duro (sardo / reggianito / parmesano)",
    category: "Lácteos",
    closedDays: 90,
    openDays: 30,
    aliases: ["queso sardo", "queso reggianito", "queso parmesano", "queso rallado", "provolone"],
  },
  {
    id: "lacteos-queso-azul",
    name: "Queso azul / roquefort",
    category: "Lácteos",
    closedDays: 21,
    openDays: 7,
    aliases: ["queso azul", "roquefort", "gorgonzola"],
  },
  {
    id: "lacteos-flan-casero",
    name: "Flan casero / postres lácteos con huevo",
    category: "Lácteos",
    closedDays: 4,
    openDays: 2,
    aliases: ["flan", "flan casero", "postre de vainilla", "postre serenito", "natilla"],
    notes: "Huevos y leche cocidos: máximo 3-4 días refrigerados",
  },

  // --- CARNES Y AVES ---
  {
    id: "carnes-carne-picada",
    name: "Carne picada / molida",
    category: "Carnes",
    closedDays: 2,
    openDays: 1,
    aliases: ["carne picada", "carne molida", "picada especial", "picada comun"],
    notes: "USDA: 1 a 2 días máximo en heladera; alta superficie expuesta a bacterias",
  },
  {
    id: "carnes-pechuga-pollo",
    name: "Pechuga de pollo",
    category: "Carnes",
    closedDays: 2,
    openDays: 1,
    aliases: ["pechuga de pollo", "pollo", "pata muslo", "alitas de pollo", "suprema de pollo", "pollo entero"],
    notes: "USDA: Aves crudas duran de 1 a 2 días en heladera",
  },
  {
    id: "carnes-corte-vacuno",
    name: "Corte vacuno entero (asado, bife, lomo)",
    category: "Carnes",
    closedDays: 4,
    openDays: 2,
    aliases: ["asado", "asado de tira", "vacio", "entrana", "bife de chorizo", "colita de cuadril", "nalga", "bola de lomo", "roast beef", "palomita", "osobuco", "peceto"],
    notes: "USDA: Bifes y cortes enteros crudos: 3 a 5 días",
  },
  {
    id: "carnes-cerdo",
    name: "Carne de cerdo fresca",
    category: "Carnes",
    closedDays: 3,
    openDays: 2,
    aliases: ["costeleta de cerdo", "carre de cerdo", "bondiola de cerdo", "pechito de cerdo", "matambre de cerdo"],
    notes: "USDA: 3 a 5 días en heladera",
  },
  {
    id: "carnes-hamburguesa-fresca",
    name: "Hamburguesas de carne frescas",
    category: "Carnes",
    closedDays: 2,
    openDays: 1,
    aliases: ["hamburguesa", "hamburguesa vacuna", "hamburguesa casera", "medallon de carne"],
  },

  // --- FIAMBRES Y EMBUTIDOS ---
  {
    id: "fiambres-jamon-cocido",
    name: "Jamón cocido / paleta feteada",
    category: "Fiambres y embutidos",
    closedDays: 4,
    openDays: 3,
    aliases: ["jamon cocido", "paleta cocida", "jamon feteado", "paleta feteada"],
    notes: "Fiambrería / feteado: consumir en 3 a 5 días",
  },
  {
    id: "fiambres-jamon-crudo",
    name: "Jamón crudo",
    category: "Fiambres y embutidos",
    closedDays: 30,
    openDays: 7,
    aliases: ["jamon crudo", "prosciutto", "jamon serrano"],
  },
  {
    id: "fiambres-salame",
    name: "Salame / salamines secos",
    category: "Fiambres y embutidos",
    closedDays: 45,
    openDays: 14,
    aliases: ["salame", "salame milan", "salame cantimpalo", "salamin"],
  },
  {
    id: "fiambres-salchichas",
    name: "Salchichas tipo viena",
    category: "Fiambres y embutidos",
    closedDays: 14,
    openDays: 4,
    aliases: ["salchichas", "salchicha", "viena", "panchos"],
  },
  {
    id: "fiambres-chorizo-fresco",
    name: "Chorizo fresco / morcilla",
    category: "Fiambres y embutidos",
    closedDays: 3,
    openDays: 1,
    aliases: ["chorizo", "chorizo fresco", "morcilla", "chorizo parrillero"],
    notes: "Embutido fresco sin secado: 1-2 días como carne picada",
  },

  // --- PESCADOS Y MARISCOS ---
  {
    id: "pescados-filet-merluza",
    name: "Filet de merluza / pescado blanco fresco",
    category: "Pescados y mariscos",
    closedDays: 2,
    openDays: 1,
    aliases: ["merluza", "filet de merluza", "pescado", "brotola", "lenguado", "pejerrey", "corvina"],
    notes: "USDA: Pescados frescos crudos deben consumirse en 1 a 2 días",
  },
  {
    id: "pescados-salmon",
    name: "Salmón fresco / trucha",
    category: "Pescados y mariscos",
    closedDays: 2,
    openDays: 1,
    aliases: ["salmon", "salmon rosado", "trucha", "atun fresco"],
  },
  {
    id: "pescados-mariscos",
    name: "Mariscos frescos (calamar, langostinos)",
    category: "Pescados y mariscos",
    closedDays: 2,
    openDays: 1,
    aliases: ["calamar", "rabas", "langostinos", "camarones", "mejillones", "pulpo"],
  },

  // --- VERDURAS FRESCAS ---
  {
    id: "verduras-espinaca-fresca",
    name: "Espinaca fresca",
    category: "Verduras frescas",
    closedDays: 5,
    openDays: 2,
    aliases: ["espinaca", "espinaco", "hojas de espinaca"],
    notes: "Sensibles a la humedad y marchitamiento rápido",
  },
  {
    id: "verduras-hojas-verdes",
    name: "Acelga / lechuga / rúcula",
    category: "Verduras frescas",
    closedDays: 5,
    openDays: 2,
    aliases: ["acelga", "lechuga", "rucula", "radicheta", "hojas verdes"],
  },
  {
    id: "verduras-tomates-cherry",
    name: "Tomates cherry",
    category: "Verduras frescas",
    closedDays: 7,
    openDays: 3,
    aliases: ["tomate cherry", "tomate", "tomates", "tomate perita", "tomate redondo"],
  },
  {
    id: "verduras-zanahoria",
    name: "Zanahoria",
    category: "Verduras frescas",
    closedDays: 21,
    openDays: 10,
    aliases: ["zanahoria", "zanahorias"],
  },
  {
    id: "verduras-papa-cebolla",
    name: "Papa / cebolla / ajo",
    category: "Verduras frescas",
    closedDays: 30,
    openDays: 14,
    aliases: ["papa", "papas", "cebolla", "cebollas", "ajo", "batata"],
  },
  {
    id: "verduras-morron",
    name: "Morrón / pimiento",
    category: "Verduras frescas",
    closedDays: 10,
    openDays: 4,
    aliases: ["morron", "morron rojo", "morron verde", "pimiento"],
  },
  {
    id: "verduras-zapallito",
    name: "Zapallito / zucchini / berenjena",
    category: "Verduras frescas",
    closedDays: 7,
    openDays: 3,
    aliases: ["zapallito", "zucchini", "berenjena", "zapallito verde"],
  },
  {
    id: "verduras-calabaza",
    name: "Calabaza / zapallo anco",
    category: "Verduras frescas",
    closedDays: 30,
    openDays: 5,
    aliases: ["calabaza", "zapallo", "zapallo anco", "calabacin"],
  },
  {
    id: "verduras-champiñones",
    name: "Champiñones / hongos frescos",
    category: "Verduras frescas",
    closedDays: 4,
    openDays: 2,
    aliases: ["champinon", "champinones", "hongos", "portobello"],
  },

  // --- FRUTAS FRESCAS ---
  {
    id: "frutas-frutillas",
    name: "Frutillas / arándanos (frutos rojos)",
    category: "Frutas frescas",
    closedDays: 4,
    openDays: 2,
    aliases: ["frutilla", "frutillas", "arandanos", "frambuesas", "moras"],
  },
  {
    id: "frutas-banana",
    name: "Banana",
    category: "Frutas frescas",
    closedDays: 5,
    openDays: 2,
    aliases: ["banana", "platano"],
  },
  {
    id: "frutas-manzana",
    name: "Manzana / pera",
    category: "Frutas frescas",
    closedDays: 21,
    openDays: 7,
    aliases: ["manzana", "manzana roja", "manzana verde", "pera"],
  },
  {
    id: "frutas-citricos",
    name: "Cítricos (naranja, mandarina, limón)",
    category: "Frutas frescas",
    closedDays: 21,
    openDays: 7,
    aliases: ["naranja", "mandarina", "limon", "pomelo"],
  },
  {
    id: "frutas-palta",
    name: "Palta / aguacate",
    category: "Frutas frescas",
    closedDays: 5,
    openDays: 2,
    aliases: ["palta", "aguacate"],
  },

  // --- REFRIGERADOS PREPARADOS Y SOBRAS COCIDAS ---
  {
    id: "prep-sobras-cocidas",
    name: "Comida cocida casera (guiso, tuco, carne cocida)",
    category: "Refrigerados preparados",
    closedDays: 4,
    openDays: 3,
    aliases: ["comida preparada", "sobras", "tuco", "guiso", "carne cocida", "pollo cocido", "salsa lista"],
    notes: "USDA: Platos cocidos deben consumirse dentro de los 3 a 4 días",
  },
  {
    id: "prep-arroz-pasta-cocida",
    name: "Arroz o pasta cocida",
    category: "Refrigerados preparados",
    closedDays: 3,
    openDays: 2,
    aliases: ["arroz cocido", "pasta cocida", "fideos cocidos"],
    notes: "Riesgo de Bacillus cereus en arroz/pasta cocida; refrigerar rápido y consumir en 3 días",
  },
  {
    id: "prep-ensalada-mayonesa",
    name: "Ensalada rusa / ensaladas con aderezo",
    category: "Refrigerados preparados",
    closedDays: 2,
    openDays: 1,
    aliases: ["ensalada rusa", "ensalada de papa", "ensalada cesar"],
  },
  {
    id: "prep-tapas-empanada",
    name: "Tapas de empanada / pascualina",
    category: "Refrigerados preparados",
    closedDays: 21,
    openDays: 3,
    aliases: ["tapa de empanada", "tapas de empanada", "tapa de pascualina", "masa de tarta", "masa de empanadas"],
  },
  {
    id: "prep-pasta-fresca",
    name: "Pasta fresca envasada (ravioles, ñoquis)",
    category: "Refrigerados preparados",
    closedDays: 14,
    openDays: 3,
    aliases: ["pasta fresca", "ravioles frescos", "noquis frescos", "sorrentinos frescos"],
  },
  {
    id: "prep-hummus",
    name: "Hummus / guacamole preparado",
    category: "Refrigerados preparados",
    closedDays: 5,
    openDays: 3,
    aliases: ["hummus", "guacamole"],
  },

  // --- PANADERÍA ---
  {
    id: "panaderia-pan-molde",
    name: "Pan de molde",
    category: "Panadería",
    closedDays: 10,
    openDays: 5,
    aliases: ["pan de molde", "pan lactal", "pan integral", "pan de sandwich"],
  },
  {
    id: "panaderia-pan-fresco",
    name: "Pan francés / baguette / flauta",
    category: "Panadería",
    closedDays: 2,
    openDays: 1,
    aliases: ["pan frances", "baguette", "pan mignon", "pan felipe", "pan de panaderia"],
  },
  {
    id: "panaderia-facturas",
    name: "Facturas / medialunas",
    category: "Panadería",
    closedDays: 2,
    openDays: 1,
    aliases: ["facturas", "medialunas", "medialuna"],
  },

  // --- ALMACÉN SECO ---
  {
    id: "almacen-pasta-seca",
    name: "Pasta seca",
    category: "Almacén seco",
    closedDays: 365,
    openDays: 90,
    aliases: ["pasta seca", "fideos", "fideos secos", "spaghetti", "tallarines", "tirabuzon"],
  },
  {
    id: "almacen-arroz",
    name: "Arroz largo fino",
    category: "Almacén seco",
    closedDays: 365,
    openDays: 90,
    aliases: ["arroz", "arroz largo fino", "arroz integral", "arroz parboil"],
  },
  {
    id: "almacen-legumbres",
    name: "Legumbres secas (lentejas, garbanzos)",
    category: "Almacén seco",
    closedDays: 365,
    openDays: 90,
    aliases: ["lentejas", "lentejas secas", "garbanzos", "porotos"],
  },
  {
    id: "almacen-harina",
    name: "Harina (trigo, leudante, integral)",
    category: "Almacén seco",
    closedDays: 240,
    openDays: 60,
    aliases: ["harina", "harina 000", "harina 0000", "harina leudante", "harina integral"],
  },

  // --- ENLATADOS Y CONSERVAS ---
  {
    id: "enlatados-atun",
    name: "Atún en lata / caballa / sardinas",
    category: "Enlatados y conservas",
    closedDays: 730,
    openDays: 3,
    aliases: ["atun", "atun al natural", "atun en aceite", "caballa", "sardinas"],
    notes: "Abierto: trasvasar a recipiente hermético no metálico y refrigerar hasta 3 días",
  },
  {
    id: "enlatados-tomate",
    name: "Puré de tomate / tomate triturado",
    category: "Enlatados y conservas",
    closedDays: 730,
    openDays: 4,
    aliases: ["pure de tomate", "tomate triturado", "tomate en lata", "extracto de tomate"],
  },
  {
    id: "enlatados-legumbres-choclo",
    name: "Choclo / arvejas / lentejas en lata",
    category: "Enlatados y conservas",
    closedDays: 730,
    openDays: 3,
    aliases: ["choclo en lata", "arvejas en lata", "lentejas en lata", "garbanzos en lata"],
  },

  // --- SALSAS Y ADEREZOS ---
  {
    id: "salsas-mayonesa",
    name: "Mayonesa comercial",
    category: "Salsas y aderezos",
    closedDays: 180,
    openDays: 30,
    aliases: ["mayonesa", "mayo"],
  },
  {
    id: "salsas-ketchup-mostaza",
    name: "Ketchup / mostaza",
    category: "Salsas y aderezos",
    closedDays: 365,
    openDays: 60,
    aliases: ["ketchup", "mostaza", "salsa barbacoa"],
  },

  // --- SNACKS Y GALLETITAS ---
  {
    id: "snacks-galletitas",
    name: "Galletitas dulces / crackers",
    category: "Snacks y galletitas",
    closedDays: 120,
    openDays: 10,
    aliases: ["galletitas", "galletas", "crackers", "galletitas dulces", "tostadas"],
  },

  // --- BEBIDAS ---
  {
    id: "bebidas-jugo",
    name: "Jugo de frutas refrigerado / listo",
    category: "Bebidas",
    closedDays: 30,
    openDays: 4,
    aliases: ["jugo", "jugo listo", "limonada", "nectar"],
  },
  {
    id: "bebidas-gaseosa",
    name: "Gaseosa / agua saborizada",
    category: "Bebidas",
    closedDays: 180,
    openDays: 4,
    aliases: ["gaseosa", "coca", "agua saborizada"],
  },

  // --- CAFÉ, TÉ Y DESAYUNO ---
  {
    id: "desayuno-mermelada",
    name: "Mermelada / dulce de leche",
    category: "Café, té y desayuno",
    closedDays: 180,
    openDays: 30,
    aliases: ["mermelada", "dulce de leche", "miel"],
  },
  {
    id: "desayuno-cafe-te",
    name: "Café molido / té en saquitos",
    category: "Café, té y desayuno",
    closedDays: 365,
    openDays: 90,
    aliases: ["cafe", "te", "yerba mate", "mate cocido"],
  },

  // --- CONGELADOS ---
  {
    id: "congelados-hamburguesas",
    name: "Hamburguesas / medallones congelados",
    category: "Congelados",
    closedDays: 120,
    openDays: 30,
    aliases: ["hamburguesas congeladas", "medallones congelados", "paty"],
  },
  {
    id: "congelados-vegetales",
    name: "Verduras congeladas",
    category: "Congelados",
    closedDays: 180,
    openDays: 30,
    aliases: ["verduras congeladas", "espinaca congelada", "choclo congelado", "arvejas congeladas"],
  },
];

export const shelfLifeCatalog: ShelfLifeEntry[] = SPECIFIC_PRODUCTS;

export function getCatalogSize(): number {
  return shelfLifeCatalog.length;
}

/**
 * Mínimo conservador por categoría:
 * Si el producto es desconocido pero conocemos la categoría,
 * seleccionamos la menor duración de días cerrado y abierto de esa categoría.
 */
export const CATEGORY_CONSERVATIVE_MINIMUMS: Record<string, { closedDays: number; openDays: number }> = {
  "Lácteos": { closedDays: 4, openDays: 2 }, // Flan casero / postres con huevo
  "Carnes": { closedDays: 2, openDays: 1 }, // Carne picada
  "Pescados y mariscos": { closedDays: 2, openDays: 1 }, // Pescado fresco crudo
  "Fiambres y embutidos": { closedDays: 3, openDays: 1 }, // Chorizo fresco / embutido crudo
  "Verduras frescas": { closedDays: 4, openDays: 2 }, // Hojas verdes delicadas / champiñones
  "Frutas frescas": { closedDays: 4, openDays: 2 }, // Frutillas / frutos rojos
  "Refrigerados preparados": { closedDays: 2, openDays: 1 }, // Ensaladas con mayonesa
  "Panadería": { closedDays: 2, openDays: 1 }, // Pan fresco de panadería / facturas
  "Almacén seco": { closedDays: 180, openDays: 30 },
  "Enlatados y conservas": { closedDays: 365, openDays: 3 },
  "Congelados": { closedDays: 90, openDays: 15 },
  "Salsas y aderezos": { closedDays: 60, openDays: 15 },
  "Snacks y galletitas": { closedDays: 60, openDays: 7 },
  "Bebidas": { closedDays: 30, openDays: 3 },
  "Café, té y desayuno": { closedDays: 90, openDays: 21 },
};

export function getCategoryConservativeMinimum(category: string): { closedDays: number; openDays: number } {
  if (CATEGORY_CONSERVATIVE_MINIMUMS[category]) {
    return CATEGORY_CONSERVATIVE_MINIMUMS[category];
  }
  // Búsqueda dinámica en productos específicos de esa categoría
  const inCat = SPECIFIC_PRODUCTS.filter((p) => p.category === category);
  if (inCat.length > 0) {
    const minClosed = Math.min(...inCat.map((p) => p.closedDays));
    const minOpen = Math.min(...inCat.map((p) => p.openDays));
    return { closedDays: minClosed, openDays: minOpen };
  }
  // Conservador por defecto para cualquier producto comestible perecedero
  return { closedDays: 3, openDays: 1 };
}

// Persistencia de ajustes del usuario
export const CORRECTIONS_STORAGE_KEY = "freshtrack-shelf-corrections-v1";

export function loadShelfLifeCorrections(): Record<string, ShelfLifeCorrection> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(CORRECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveShelfLifeCorrection(
  productName: string,
  closedDays: number,
  openDays?: number
): ShelfLifeCorrection {
  const norm = normalizeSlug(productName);
  const existing = loadShelfLifeCorrections();
  const calculatedOpenDays = openDays ?? Math.max(1, Math.round(closedDays / 2));

  const correction: ShelfLifeCorrection = {
    productName: productName.trim(),
    normalizedName: norm,
    closedDays,
    openDays: calculatedOpenDays,
    updatedAt: new Date().toISOString(),
  };

  existing[norm] = correction;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CORRECTIONS_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn("No se pudo guardar la corrección de vida útil en localStorage", e);
    }
  }

  return correction;
}

export function clearShelfLifeCorrections(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CORRECTIONS_STORAGE_KEY);
  }
}

export function getShelfLifeCorrection(productName: string): ShelfLifeCorrection | undefined {
  const norm = normalizeSlug(productName);
  const all = loadShelfLifeCorrections();
  if (all[norm]) return all[norm];

  // Búsqueda aproximada si el nombre contiene la clave corregida
  for (const key of Object.keys(all)) {
    if (norm.includes(key) || key.includes(norm)) {
      return all[key];
    }
  }
  return undefined;
}

/**
 * Busca coincidencia específica por nombre exacto o alias
 */
export function findSpecificProduct(productName: string): ShelfLifeEntry | undefined {
  const norm = normalizeSlug(productName);
  if (!norm) return undefined;

  // 1. Coincidencia exacta por slug de nombre
  const exact = SPECIFIC_PRODUCTS.find((p) => normalizeSlug(p.name) === norm);
  if (exact) return exact;

  // 2. Coincidencia en lista de alias
  const aliasMatch = SPECIFIC_PRODUCTS.find((p) =>
    p.aliases.some((alias) => normalizeSlug(alias) === norm)
  );
  if (aliasMatch) return aliasMatch;

  // 3. Subcadena en alias o nombre (ej. "leche sachet serenisima" matchea "leche sachet")
  const subMatch = SPECIFIC_PRODUCTS.find((p) => {
    const pSlug = normalizeSlug(p.name);
    if (norm.includes(pSlug) && pSlug.length >= 4) return true;
    return p.aliases.some((alias) => {
      const aSlug = normalizeSlug(alias);
      return aSlug.length >= 4 && norm.includes(aSlug);
    });
  });

  return subMatch;
}

/**
 * Estima la vida útil para un producto, considerando:
 * 1. Ajustes manuales previos del usuario ("Con tu ajuste anterior")
 * 2. Valores específicos del producto según FoodKeeper / ANMAT
 * 3. Mínimo conservador de la categoría ("Estimado por categoría, verificá la fecha del envase")
 */
export function estimateShelfLife(
  productName: string,
  state: ShelfLifeState = "cerrado",
  category?: string
): ShelfLifeEstimate | undefined {
  const cleanName = productName.trim();

  // 1. Prioridad: corrección previa del usuario
  const userCorrection = getShelfLifeCorrection(cleanName);
  if (userCorrection) {
    const days = state === "abierto" ? userCorrection.openDays : userCorrection.closedDays;
    return {
      name: cleanName,
      category: category || "General",
      days,
      closedDays: userCorrection.closedDays,
      openDays: userCorrection.openDays,
      state,
      confidence: "user-correction",
      source: "user-correction",
      label: "Con tu ajuste anterior",
    };
  }

  // 2. Coincidencia específica en catálogo
  const specific = findSpecificProduct(cleanName);
  if (specific) {
    const days = state === "abierto" ? specific.openDays : specific.closedDays;
    return {
      name: specific.name,
      category: specific.category,
      days,
      closedDays: specific.closedDays,
      openDays: specific.openDays,
      state,
      confidence: "specific",
      source: "base",
    };
  }

  // 3. Fallback conservador por categoría
  if (category) {
    const conservative = getCategoryConservativeMinimum(category);
    const days = state === "abierto" ? conservative.openDays : conservative.closedDays;
    return {
      name: cleanName || `Producto de ${category}`,
      category,
      days,
      closedDays: conservative.closedDays,
      openDays: conservative.openDays,
      state,
      confidence: "category-estimate",
      source: "category-minimum",
      label: "Estimado por categoría, verificá la fecha del envase",
    };
  }

  return undefined;
}

export function findShelfLife(productName: string, category?: string): ShelfLifeEntry | undefined {
  const specific = findSpecificProduct(productName);
  if (specific) return specific;
  if (category) {
    const conservative = getCategoryConservativeMinimum(category);
    return {
      id: `category-min-${normalizeSlug(category)}`,
      name: `Estimación para ${category}`,
      category,
      closedDays: conservative.closedDays,
      openDays: conservative.openDays,
      aliases: [],
    };
  }
  return undefined;
}
