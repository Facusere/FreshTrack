import React from "react";
import { ShoppingListModule } from "@/components/ShoppingListModule";
import { ShoppingItem } from "@/lib/shoppingList";
import { Product, StoredProduct } from "@/types/product";
import { ConsumptionRecord } from "@/lib/inventoryConsumption";

export interface ShoppingSectionProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  pantryProducts: Product[];
  consumptionHistory: ConsumptionRecord[];
  onAddProductsToPantry: (products: StoredProduct[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

export function ShoppingSection({
  shoppingList,
  setShoppingList,
  pantryProducts,
  consumptionHistory,
  onAddProductsToPantry,
  detectIconFn,
}: ShoppingSectionProps) {
  return (
    <section id="module-shopping" className="scroll-mt-24 mt-6">
      <ShoppingListModule
        shoppingList={shoppingList}
        setShoppingList={setShoppingList}
        pantryProducts={pantryProducts}
        consumptionHistory={consumptionHistory as any}
        onAddProductsToPantry={onAddProductsToPantry}
        detectIconFn={detectIconFn}
      />
    </section>
  );
}
