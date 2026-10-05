# Funcionalidad: Vida Útil y Gestión de Fechas

Este documento detalla el motor bromatológico y la lógica de manejo temporal de FreshTrack, incluyendo las fuentes técnicas de referencia (ANMAT y USDA FoodKeeper), el cálculo de fechas en tiempo local, las reglas para envases abiertos y la heurística de inferencia conservadora.

---

## 1. Perspectiva del Usuario

El usuario no necesita memorizar cuánto dura un alimento abierto ni descifrar tablas complejas de conservación. Al agregar un alimento o escanearlo:
- Si el producto tiene fecha de vencimiento explícita, se calcula cuántos días restan y se le asigna un semáforo visual.
- Si es un producto fresco (como frutas, verduras o panadería) o no tiene fecha visible, FreshTrack estima automáticamente los días seguros de conservación basándose en tablas bromatológicas.
- Si el usuario abre un producto cerrado (como una leche o una salsa), el sistema recalcula inmediatamente la fecha de caducidad acorde al tiempo seguro en heladera una vez roto el sello.
- Si en su hogar un producto suele durar más o menos tiempo, el usuario puede ajustar los días; el sistema recordará su preferencia para futuras detecciones bajo la leyenda *"Con tu ajuste anterior"*.

---

## 2. Flujo de Decisión para la Estimación de Vida Útil

Cuando se invoca `estimateShelfLife(productName, state, category, freshCondition)`, el sistema recorre un árbol de decisión estricto priorizando la experiencia personalizada y la inocuidad:

```mermaid
flowchart TD
    Start([Solicitud de Estimación: estimateShelfLife]) --> CheckUserCorrection{¿Existe corrección manual previa del usuario?}

    CheckUserCorrection -->|Sí| ReturnUser[Retorna días corregidos por el usuario\nConfidence: user-correction\nLabel: Con tu ajuste anterior]

    CheckUserCorrection -->|No| CheckSpecificCatalog{¿Existe coincidencia exacta o por alias en catálogo?}

    CheckSpecificCatalog -->|Sí (66 productos)| ReturnSpecific[Retorna días según FoodKeeper/ANMAT\n(closedDays / openDays / agingDays)\nConfidence: specific\nSource: base]

    CheckSpecificCatalog -->|No| CheckCategory{¿Se conoce la categoría del producto?}

    CheckCategory -->|Sí| ReturnConservative[Aplica Mínimo Conservador de la Categoría\nConfidence: category-estimate\nSource: category-minimum\nLabel: Estimado por categoría, verificá la fecha del envase]

    CheckCategory -->|No| ReturnUndefined[Retorna undefined\n(Requiere ingreso manual de fecha)]
```

---

## 3. Fuentes Bromatológicas y Catálogo Regional

El catálogo base (`client/src/lib/shelfLifeCatalog.ts`) contiene 66 entradas específicas (`SPECIFIC_PRODUCTS`) con nombres populares en el Cono Sur (ej. *tapa de asado*, *ricota*, *leche sachet*, *dulce de leche*, *medialunas*) y referencias cruzadas tomadas de:
1. **USDA FoodKeeper App** (*Food Safety and Inspection Service*, Departamento de Agricultura de EE.UU.).
2. **ANMAT / Código Alimentario Argentino (CAA)**: Capítulos II y criterios microbiológicos para alimentos perecederos a temperatura controlada.
3. **INTA** (*Instituto Nacional de Tecnología Agropecuaria*, Argentina): Manuales de buenas prácticas de manipulación y frío hogareño.

Cada entrada del catálogo define:
- `closedDays`: Días seguros cerrado a temperatura adecuada.
- `openDays`: Días de vida útil una vez abierto y refrigerado a $< 4^\circ\text{C}$.
- `agingDays?`: Días aplicables si el vegetal o fruta ya está maduro o avanzado.
- `aliases`: Sinónimos y variantes comerciales comunes (ej. `["leche", "leche sachet", "leche fluida", "leche entera sachet"]`).

---

## 4. Mínimos Conservadores por Categoría

Si un alimento no coincide con ningún producto específico de la lista pero se identifica su categoría, FreshTrack recurre a `CATEGORY_CONSERVATIVE_MINIMUMS`:

| Categoría | Días Cerrado | Días Abierto | Criterio Bromatológico de Referencia |
| :--- | :---: | :---: | :--- |
| **Carnes** | 2 | 1 | Carne picada fresca (máxima vulnerabilidad microbiana). |
| **Pescados y mariscos** | 2 | 1 | Pescado blanco fresco crudo. |
| **Refrigerados preparados** | 2 | 1 | Ensaladas y tartas caseras con mayonesa o huevo. |
| **Panadería** | 2 | 1 | Pan fresco artesanal sin conservantes y facturas. |
| **Fiambres y embutidos** | 3 | 1 | Embutidos frescos crudos (chorizo / salchicha parrillera). |
| **Lácteos** | 4 | 2 | Postres con leche y huevo o quesos blandos muy húmedos. |
| **Verduras frescas** | 4 | 2 | Hojas verdes tiernas (rúcula, espinaca) y champiñones. |
| **Frutas frescas** | 4 | 2 | Frutillas y frutos rojos delicados. |
| **Bebidas** | 30 | 3 | Jugos naturales pasteurizados abiertos en frío. |
| **Salsas y aderezos** | 60 | 15 | Salsas emulsionadas abiertas en heladera. |
| **Snacks y galletitas** | 60 | 7 | Galletitas secas una vez abierto el paquete protector. |
| **Café, té y desayuno** | 90 | 21 | Cereales de desayuno expuestos a la humedad ambiente. |
| **Congelados** | 90 | 15 | Alimentos en freezer hogareño estándar ($-18^\circ\text{C}$). |
| **Almacén seco** | 180 | 30 | Harinas, legumbres y pastas secas. |
| **Enlatados y conservas** | 365 | 3 | Conservas cerradas esterilizadas; 3 días al trasvasar a frío. |

---

## 5. Recálculo por Apertura de Envase (`calculateOpenProduct`)

Cuando el usuario marca un alimento como "Abierto", se activa la función `calculateOpenProduct(product, today)`:
1. Se fija la fecha de apertura: `openedAt = todayISO(today)`.
2. Se consulta el catálogo para obtener los `openDays` correspondientes.
3. Se proyecta la nueva fecha: `calculatedExpiry = addDaysISO(openDays, today)`.
4. **Principio rector de inocuidad**: La nueva fecha de vencimiento es el mínimo entre la fecha original y la calculada tras la apertura:
   $$\text{newExpiryDate} = \min(\text{product.expiryDate}, \text{calculatedExpiry})$$
   Bajo ninguna circunstancia abrir un alimento extiende su fecha de aptitud. Si un sachet de leche vencía mañana, abrirlo hoy no le otorga 3 días adicionales.

---

## 6. Manejo Temporal y Hora Local

Un error clásico en aplicaciones web es utilizar cadenas UTC (`new Date().toISOString()`), lo que en husos horarios como el de Argentina (UTC-3) provoca que el día cambie a las 21:00 hs locales en lugar de la medianoche.

FreshTrack resuelve esto de raíz en `client/src/lib/dates.ts`:
- **`toISODate(date)`**: Extrae `getFullYear()`, `getMonth() + 1` y `getDate()` del reloj local del dispositivo, garantizando que el cambio de día ocurra estrictamente a las 00:00:00 locales.
- **`daysUntil(isoDate, today)`**: Descompone las cadenas `YYYY-MM-DD` y crea dos objetos `Date` a la medianoche local (`00:00:00.000`), calculando la diferencia en milisegundos dividida por $86.400.000$ con redondeo exacto.
- **Hook reactivo `useToday()`**: Mantiene un temporizador en el cliente que despierta exactamente en la medianoche local siguiente y escucha el evento `visibilitychange` para refrescar los días al volver de segundo plano.

---

## 7. Parseo Inteligente de Fechas (`parseDateToISO`)

La función `parseDateToISO()` en `dates.ts` admite múltiples formatos numéricos y textuales en español e inglés:
- Fechas extensas: `"18 de septiembre de 2026"`, `"12 de ago del 27"`.
- Formatos mixtos con abreviaturas de mes: `"12-AGO-27"`, `"15 OCT 2026"`, `"12.SEP.26"`.
- Fechas compactadas o pegadas: `"12AGO27"`, `"12AGO2027"`.
- Formatos numéricos: `"18/09/2026"`, `"18-09-26"`, `"18.09.26"`, `"18 09 26"`.
- Formatos de mes y año: `"09/2026"`, `"AGO 2027"`, `"AGO/27"` (por regla bromatológica, se asigna el **último día del mes** correspondiente usando `getLastDayOfMonth()`).
- Filtros de cordura (*sanity checks*): Acepta años únicamente entre 2000 y 2040; rechaza días inválidos (como 31 de febrero).

---

## 8. Casos Borde

- **Años bisiestos**: Al calcular el último día de febrero para fechas tipo `"02/2028"`, `getLastDayOfMonth(2028, 2)` retorna correctamente `29`.
- **Dígitos de dos cifras ambiguos**: Para números menores o iguales a 50 (ej. `"27"`), se proyecta al siglo XXI (`2027`). Los números mayores a 50 se descartan como años inválidos.
- **Persistencia de correcciones**: Las correcciones guardadas en `freshtrack-shelf-corrections-v1` admiten búsqueda aproximada (`norm.includes(key)`), lo que permite que una corrección sobre `"manzana"` aplique también para `"manzana roja deliciosa"`.

---

## 9. Pruebas que Cubren esta Funcionalidad

- `client/src/tests/dates.test.ts`: Validación de `toISODate`, `daysUntil`, formatos relativos y preservación de zonas horarias.
- `client/src/tests/shelfLife.test.ts`: Pruebas del catálogo específico, sinónimos, mínimos conservadores y persistencia de ajustes del usuario.
- `client/src/tests/openProduct.test.ts`: Pruebas rigurosas sobre la función `calculateOpenProduct()`.

---

## Enlaces Relacionados
- [Funcionalidad: Despensa](despensa.md)
- [Funcionalidad: Recetas y Aprovechamiento](recetas.md)
- [Referencia de Módulos lib/](../07-referencia-de-modulos-lib.md)
- [Glosario de Términos](../glosario.md)
