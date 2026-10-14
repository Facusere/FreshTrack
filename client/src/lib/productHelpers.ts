import { StoredProduct } from "@/types/product";
import { addDaysISO } from "./dates";

export function scaleMeasure(measure: string, factor: number): string {
  if (factor === 1 || !measure) return measure;
  return measure.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(",", "."));
    if (isNaN(num)) return match;
    const scaled = Math.round(num * factor * 10) / 10;
    return String(scaled);
  });
}

export function detectProductIcon(name: string, category: string): string {
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const c = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("leche") || n.includes("queso") || n.includes("crema") || n.includes("manteca")) return "🥛";
  if (n.includes("yogur")) return "🥣";
  if (n.includes("pollo") || n.includes("carne") || n.includes("asado") || n.includes("bife") || n.includes("milanesa")) return "🍗";
  if (n.includes("pescado") || n.includes("merluza") || n.includes("atun") || n.includes("salmon")) return "🐟";
  if (n.includes("pan") || n.includes("tostada") || n.includes("factura") || n.includes("medialuna") || n.includes("gallet")) return "🍞";
  if (n.includes("tomate")) return "🍅";
  if (n.includes("espinaca") || n.includes("acelga") || n.includes("lechuga") || n.includes("rucula")) return "🥬";
  if (n.includes("manzana")) return "🍎";
  if (n.includes("banana")) return "🍌";
  if (n.includes("palta") || n.includes("aguacate")) return "🥑";
  if (n.includes("papa") || n.includes("patata") || n.includes("pure")) return "🥔";
  if (n.includes("huevo")) return "🥚";
  if (n.includes("arroz")) return "🍚";
  if (n.includes("pasta") || n.includes("fideo") || n.includes("ravioles") || n.includes("noquis")) return "🍝";
  if (c.includes("bebida")) return "🧃";
  if (c.includes("cafe") || c.includes("te") || c.includes("mate")) return "☕";
  if (c.includes("fruta")) return "🍎";
  if (c.includes("verdura")) return "🥬";
  if (c.includes("carne")) return "🥩";
  if (c.includes("enlatado")) return "🥫";
  return "📦";
}

export function inferLocation(category: string): string {
  const cat = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (cat.includes("lacteo") || cat.includes("fiambre") || cat.includes("carne") || cat.includes("pescado") || cat.includes("refrigerado")) {
    return "Heladera";
  }
  if (cat.includes("verdura") || cat.includes("fruta")) {
    return "Cajón verduras";
  }
  if (cat.includes("congelado")) {
    return "Freezer";
  }
  return "Alacena";
}

export function buildDemoProducts(today: Date = new Date()): StoredProduct[] {
  return [
    { id: 1, name: "Yogur natural", category: "Lácteos", expiryDate: addDaysISO(3, today), quantity: "4 unidades", icon: "🥣", estimated: true, dateLabel: "vencimiento" },
    { id: 2, name: "Espinaca fresca", category: "Verduras frescas", expiryDate: addDaysISO(4, today), quantity: "1 atado", icon: "🥬" },
    { id: 3, name: "Pechuga de pollo", category: "Carnes", expiryDate: addDaysISO(6, today), quantity: "2 unidades", icon: "🍗" },
    { id: 4, name: "Pan de molde", category: "Panadería", expiryDate: addDaysISO(9, today), quantity: "1 paquete", icon: "🍞" },
    { id: 5, name: "Tomates cherry", category: "Verduras frescas", expiryDate: addDaysISO(1, today), quantity: "1 bandeja", icon: "🍅" },
    { id: 6, name: "Leche entera", category: "Lácteos", expiryDate: addDaysISO(-1, today), quantity: "2 litros", icon: "🥛" },
    { id: 7, name: "Pasta seca", category: "Almacén seco", expiryDate: addDaysISO(331, today), quantity: "2 paquetes", icon: "🍝" },
  ];
}
