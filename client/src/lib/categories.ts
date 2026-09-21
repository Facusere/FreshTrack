export const ALL_CATEGORIES = [
  "Almacén seco",
  "Bebidas",
  "Café, té y desayuno",
  "Carnes",
  "Congelados",
  "Enlatados y conservas",
  "Fiambres y embutidos",
  "Frutas frescas",
  "Lácteos",
  "Panadería",
  "Pescados y mariscos",
  "Refrigerados preparados",
  "Salsas y aderezos",
  "Snacks y galletitas",
  "Verduras frescas",
] as const;

export type ProductCategory = (typeof ALL_CATEGORIES)[number];
