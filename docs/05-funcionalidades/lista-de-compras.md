# Funcionalidad: Lista de Compras Inteligente

Este documento describe el módulo de lista de compras y reposición inteligente de FreshTrack, su integración con la despensa y el recetario, el ordenamiento por pasillos de supermercado y el flujo de migración de alimentos comprados hacia el inventario activo.

---

## 1. Perspectiva del Usuario

La lista de compras de FreshTrack trasciende la tradicional lista de texto plano al conectarse dinámicamente con los hábitos y el inventario del usuario:
- **Alimentación automática**: Detecta alimentos que se están agotando en la despensa (por ejemplo, menos de 1 unidad o menos de 100 gramos) y permite sumarlos a la lista con un clic.
- **Integración con recetas**: Si en una receta te falta un ingrediente, podés agregarlo directamente desde el recetario sin tener que tipear el nombre.
- **Sugerencias inteligentes**: Una barra interactiva te sugiere reponer aquellos alimentos que consumís con mayor frecuencia histórica o que se vencieron recientemente.
- **Paseo por el supermercado optimizado**: Los artículos se agrupan automáticamente por categoría respetando la disposición física habitual de las góndolas (verdulería, panadería, lácteos, carnicería, almacén seco).
- **De la bolsa a la despensa en un toque**: Al volver de las compras y marcar los productos como adquiridos, el botón *"Pasar a la despensa"* migra automáticamente los alimentos al inventario asignándoles su vida útil estimada y fecha de vencimiento calculada.

---

## 2. Flujo de Trabajo del Módulo de Compras

```mermaid
flowchart TD
    subgraph FuentesDeEntrada ["Fuentes de Entrada de Artículos"]
        ManualInput["Entrada manual (nombre, categoría, cantidad)"]
        LowStockBtn["Botón 'Cargar stock bajo' (isQuantityLow)"]
        RecipeMissing["Ingredientes faltantes de receta (RecetasSection)"]
        SmartSug["Sugerencias inteligentes (frecuentes / vencidos)"]
    end

    FuentesDeEntrada --> MergeFn["addOrMergeShoppingItem()"]
    MergeFn --> DedupeCheck{¿Ya existe en la lista?\n(areItemsSameProduct)}

    DedupeCheck -->|Sí| Combine["Combina motivos (reasons)\nAsocia recetas (recipeNames)\nToma la mayor cantidad\nDesmarca 'comprado'"]
    DedupeCheck -->|No| CreateItem["Crea nuevo ShoppingItem con reason inicial"]

    Combine --> ActiveList[Lista de Compras Activa]
    CreateItem --> ActiveList

    ActiveList --> GroupCat["groupShoppingItemsByCategory()"]
    GroupCat --> DisplayUI[Renderizado en ShoppingListModule.tsx\nAgrupado por pasillos ALL_CATEGORIES]

    DisplayUI --> UserAction{Acción del Usuario}
    UserAction -->|Editar cantidad| AdjustQty[updateShoppingItemQuantity / adjustStep]
    UserAction -->|Tildar comprado| CheckItem[completed: true]
    UserAction -->|Pasar comprados a despensa| MigratePantry["migratePurchasedItemsToPantry()"]

    MigratePantry --> EstLife["estimateShelfLife(name, 'cerrado', category)"]
    EstLife --> CreateStored["Genera StoredProduct[] con expiryDate = hoy + days"]
    CreateStored --> UpdateStores["Guarda en despensa activa y limpia comprados de la lista"]
```

---

## 3. Motivos de Inclusión (`ShoppingItemReason`)

Cada ítem de compra registra uno o más motivos por los cuales fue incorporado, reflejados en insignias visuales dentro de la interfaz:

| Motivo (`reason`) | Origen | Insignia en Pantalla (`getItemReasonBadges`) |
| :--- | :--- | :--- |
| **`stock_bajo`** | El alimento en despensa tiene una cantidad igual o menor a 1 unidad, menos de 100 g o ml, o la etiqueta "queda poco". | `"Queda poco"` |
| **`receta`** | Proviene de los ingredientes faltantes de una receta en la que el usuario hizo clic en "Agregar faltantes". | `"Lo necesitás para [Nombre de Receta]"` |
| **`frecuente`** | Sugerencia generada por alta frecuencia histórica de consumo en recetas. | `"Consumido N veces recientemente"` |
| **`vencido`** | Sugerencia generada para reponer un producto que caducó en la despensa. | `"Vencido en despensa — reponer fresco"` |
| **`manual`** | Agregado libremente por el usuario escribiendo en el campo de texto. | *(Sin insignia adicional)* |

---

## 4. Fusión Inteligente sin Duplicados

Para evitar que el usuario tenga duplicados como `"Tomates cherry"` y `"tomate cherry"`, o que una receta agregue un producto que ya estaba anotado, la función `addOrMergeShoppingItem()` aplica las siguientes reglas:

1. **Equivalencia de producto (`areItemsSameProduct`)**: Compara nombres utilizando el tokenizador y sinónimos canónicos de `ingredientMatching.ts` (umbral de coincidencia $\ge 75\%$).
2. **Fusión de motivos (`reasons`)**: Si el producto ya existía anotado manualmente y luego se agrega por una receta, conserva ambos motivos: `["manual", "receta"]`.
3. **Consolidación de cantidades**: Si ambas cantidades pertenecen a la misma familia física (por ejemplo `"500 g"` y `"1 kg"`), se selecciona el valor máximo necesario; si no son comparables, se preserva la cantidad entrante.
4. **Reactivación**: Si un producto ya estaba marcado como comprado pero vuelve a ingresar por stock bajo o por una receta nueva, se desmarca automáticamente (`completed: false`) para asegurar que no pase inadvertido.

---

## 5. Agrupación por Pasillos de Supermercado

La función `groupShoppingItemsByCategory()` organiza los productos según el orden del arreglo `ALL_CATEGORIES` definido en `client/src/lib/categories.ts`. Este orden reproduce el recorrido físico más eficiente en un supermercado estándar:
1. Almacén seco
2. Bebidas
3. Café, té y desayuno
4. Carnes
5. Congelados
6. Enlatados y conservas
7. Fiambres y embutidos
8. Frutas frescas
9. Lácteos
10. Panadería
11. Pescados y mariscos
12. Refrigerados preparados
13. Salsas y aderezos
14. Snacks y galletitas
15. Verduras frescas

Cualquier categoría personalizada adicional se ubica al final de la lista.

---

## 6. Migración hacia la Despensa (`migratePurchasedItemsToPantry`)

Cuando el usuario concluye su compra y presiona *"Pasar a la despensa"*:
1. Se filtran todos los ítems con `completed: true`.
2. Para cada ítem, se consulta `estimateShelfLife(name, "cerrado", category)` para obtener su duración estimada en días cerrados.
3. Se calcula la fecha ISO de vencimiento: `expiryDate = addDaysISO(shelfDays, today)`.
4. Se asigna un emoji contextual mediante `detectIconFn()`.
5. Se crean los nuevos objetos `StoredProduct` (con `estimated: true` y `state: "cerrado"`).
6. Los productos migrados ingresan a la despensa activa y se eliminan de la lista de compras, permaneciendo en ella únicamente los ítems pendientes.

---

## 7. Casos Borde

- **Cantidades sin unidades formales**: Si el usuario escribe `"unas cuantas manzanas"`, `parseQuantity()` no reconoce la familia pero extrae `"unas cuantas manzanas"` como texto descriptivo, formateándolo de manera segura sin interrumpir el proceso de compra.
- **Ajustes de cantidad en caliente**: Los botones `+` y `-` en la tarjeta del ítem reconocen la familia: para unidades suben de 1 en 1; para artículos pesables en gramos suben en pasos de 100 gramos (`delta: 100`).
- **Lista de compras vacía**: Al no haber ítems pendientes, `ShoppingListModule` despliega sugerencias de reposición basadas en el historial para incentivar la planificación antes de salir al comercio.

---

## 8. Pruebas que Cubren esta Funcionalidad

- `client/src/tests/shoppingList.test.ts`: Validación de combinación sin duplicados, generación de sugerencias inteligentes por frecuencia de consumo, agrupación por categorías y migración de compras a despensa.
- `client/src/tests/quantity.test.ts`: Pruebas de detección de stock bajo (`isQuantityLow`) para masa, volumen y unidades de empaque.

---

## Enlaces Relacionados
- [Funcionalidad: Despensa](despensa.md)
- [Funcionalidad: Recetas y Aprovechamiento](recetas.md)
- [Referencia de Módulos lib/](../07-referencia-de-modulos-lib.md)
- [Modelo de Datos y Almacenamiento](../06-modelo-de-datos-y-almacenamiento.md)
