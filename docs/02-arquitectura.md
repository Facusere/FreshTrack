# Arquitectura del Sistema

Este documento describe la arquitectura global de FreshTrack, detallando la interacción entre la aplicación web progresiva (PWA), el Service Worker, los puntos de entrada del servidor (Express y Vercel Serverless), los servicios externos consumidos y el flujo unidireccional de datos de estado en el cliente.

---

## 1. Diagrama General de Componentes

FreshTrack adopta un modelo arquitectónico desacoplado donde el frontend asume casi la totalidad de la lógica de negocio, persistencia e inferencia visual. El backend existe exclusivamente como servidor de archivos estáticos y como un proxy HTTP liviano hacia la API de traducción de DeepL, protegiendo la clave de API y evitando restricciones de CORS.

```mermaid
flowchart TB
    subgraph Browser ["Navegador del Usuario (PWA & Client Runtime)"]
        UI["Interfaz React 19 (Home.tsx, Modales, Secciones)"]
        Store[("localStorage del Navegador\n(freshtrack-*-v3 / v1)")]
        SW["Service Worker (Workbox / CacheStorage)"]
        OCR["Motor Tesseract.js (WASM + Web Workers locales)"]
        BarDet["BarcodeDetector API Nativa"]

        UI <-->|Lectura y Escritura sincrónica| Store
        UI -->|Procesa imágenes / canvas| OCR
        UI -->|Escanea fotogramas / video| BarDet
        UI <-->|Intercepta peticiones de navegación y assets| SW
    end

    subgraph BackendGateway ["Capa de Servidor / Proxy"]
        direction TB
        NodeServer["Servidor Express 5 (server/index.ts)\nSirve dist/public + Proxy /api/translate"]
        VercelFn["Función Serverless Vercel (api/translate.ts)\nHandler HTTP /api/translate"]
    end

    subgraph ExternalServices ["Servicios Externos en la Nube"]
        TheMealDB["TheMealDB API\n(Búsqueda de recetas online)"]
        DeepL["DeepL Translation API\n(Traducción EN -> ES Rioplatense)"]
        OpenFoodFacts["Open Food Facts API v2\n(Metadatos de código de barras)"]
        GoogleFonts["Google Fonts CDN\n(Inter & Plus Jakarta Sans)"]
    end

    UI -->|Peticiones fetch directas| TheMealDB
    UI -->|Consulta código de barras directo| OpenFoodFacts
    UI -->|POST /api/translate| NodeServer
    UI -.->|POST /api/translate en Vercel| VercelFn
    NodeServer -->|POST https://api.deepl.com/v2/translate| DeepL
    VercelFn -->|POST https://api.deepl.com/v2/translate| DeepL
    SW -->|Precachea y cachea runtime| GoogleFonts
```

---

## 2. Flujo de Datos y Separación StoredProduct vs. Product

Una de las decisiones arquitectónicas fundamentales de FreshTrack radica en la estricta separación entre el estado persistido en disco (`StoredProduct`) y el estado proyectado para la presentación (`Product`).

### ¿Por qué existe esta separación?
1. **Invariabilidad temporal**: Si se guardara en `localStorage` el campo `days: 3` (días restantes), al abrir la aplicación dos días después el valor persistido estaría desactualizado y sería falso.
2. **Determinismo por hora local**: La fecha de vencimiento persistida es una cadena ISO fija en formato fecha (`YYYY-MM-DD`, por ejemplo `"2026-10-15"`).
3. **Cálculo dinámico respecto a `today`**: Al iniciar la aplicación o cuando el reloj del dispositivo cruza la medianoche (manejado por el hook `useToday()` en `client/src/lib/dates.ts`), la función `deriveProduct()` toma cada `StoredProduct` y recalcula en memoria:
   - `days`: Cantidad exacta de días calendario entre la medianoche de hoy y la fecha objetivo.
   - `status`: Categoría de semáforo (`"ok"` si `days > 3`, `"soon"` si `0 <= days <= 3`, o `"expired"` si `days < 0`).
   - `expiry`: Cadena textual formateada para el usuario (ej. `"18 sep"` o `"12 ago 27"` si el año difiere del actual).

```mermaid
flowchart LR
    subgraph Persistencia ["Persistencia Local (storage.ts)"]
        RawV3[("freshtrack-products-v3")]
        Load["loadStoredProducts()"]
        Valid["isValidStoredProduct()"]
        RawV3 --> Load --> Valid
    end

    subgraph EstadoRaiz ["Estado Raíz (Home.tsx)"]
        StoredState["storedProducts: StoredProduct[]"]
        TodayHook["useToday() (React Hook reactivo a medianoche)"]
        Derive["deriveProduct(stored, today)"]
        ProductsState["products: Product[] (Derivado reactivo)"]

        Valid --> StoredState
        StoredState --> Derive
        TodayHook --> Derive
        Derive --> ProductsState
    end

    subgraph ComponentesConsumidores ["Componentes de Vista"]
        Pantry["PantrySection.tsx\n(Lista, Calendario, Filtros)"]
        Hero["HeroSection.tsx\n(Radar de prioridades)"]
        Recipes["RecipesSection.tsx\n(Cálculo de recetas y faltantes)"]
        Shopping["ShoppingSection.tsx\n(Detección de stock bajo)"]
        Reports["ReportsSection.tsx\n(Métricas y gráficos Recharts)"]

        ProductsState --> Pantry
        ProductsState --> Hero
        ProductsState --> Recipes
        ProductsState --> Shopping
        ProductsState --> Reports
    end
```

### Tabla Comparativa de Modelos

| Propiedad | `StoredProduct` (`client/src/types/product.ts`) | `Product` (`client/src/types/product.ts`) |
| :--- | :--- | :--- |
| `id` | `number` (identificador único numérico) | `number` |
| `name` | `string` (ej. "Leche entera") | `string` |
| `category` | `ProductCategory \| string` | `ProductCategory \| string` |
| `expiryDate` | `string` (formato ISO `YYYY-MM-DD`) | `string` (formato ISO `YYYY-MM-DD`) |
| `quantity` | `string` (ej. "1 litro", "500 g") | `string` |
| `icon` | `string` (emoji representativo) | `string` |
| `location` | `string?` ("Heladera", "Alacena", etc.) | `string?` |
| `state` | `"cerrado" \| "abierto"` | `"cerrado" \| "abierto"` |
| `openedAt` | `string?` (ISO `YYYY-MM-DD`) | `string?` |
| `days` | **No existe** (evita desfasajes en disco) | `number` (diferencia de días calculada al vuelo) |
| `status` | **No existe** | `"ok" \| "soon" \| "expired"` |
| `expiry` | **No existe** | `string` (representación amigable ej. "15 oct") |

---

## 3. Grafo de Dependencias entre Módulos de `lib/`

La carpeta `client/src/lib/` concentra la lógica pura del negocio culinario, visión artificial, conversiones de unidades y gestión del almacenamiento. A continuación se presenta el mapa completo de dependencias entre sus módulos:

```mermaid
graph TD
    dates["dates.ts\n(toISODate, daysUntil, statusFromDays, parseDateToISO)"]
    categories["categories.ts\n(ALL_CATEGORIES)"]
    quantity["quantity.ts\n(parseQuantity, formatQuantity, convertQuantity, isQuantityLow)"]
    storage["storage.ts\n(loadStoredProducts, saveStoredProducts, loadJSON, saveJSON)"]
    productTypes["@/types/product\n(StoredProduct, Product, deriveProduct)"]

    shelfLife["shelfLifeCatalog.ts\n(estimateShelfLife, calculateOpenProduct)"]
    dateRec["dateRecognition.ts\n(detectDateCandidates, classifyDateContext)"]
    ocr["ocrScanner.ts\n(performBrowserOCR, extractQuantityFromTicketLine)"]
    barcode["barcodeScanner.ts\n(fetchProductByBarcode, detectBarcodeFromImageSource)"]

    ingMatch["ingredientMatching.ts\n(matchIngredientTokens, findBestMatchingItem)"]
    invCons["inventoryConsumption.ts\n(planRecipeConsumption, applyConsumptionPlan)"]
    localRec["localRecipesMatching.ts\n(calculateLocalRecipeMatches, fetchOnlineRecipesForPantry)"]
    recipeApi["recipeApi.ts\n(searchRecipesByExpiring, translateRecipe, getRecipeDetails)"]
    shopping["shoppingList.ts\n(addOrMergeShoppingItem, generateSmartSuggestions)"]
    reports["reportsData.ts\n(buildMonthlyWasteData, buildCategoryWasteData)"]
    impact["impactStats.ts\n(loadImpactStats, recordImpact, reverseImpact)"]
    notifRules["notificationRules.ts\n(groupNotifications, buildWeeklySummary)"]
    pwaNotif["pwaAndNotifications.ts\n(registerServiceWorker, notifyExpiringProducts)"]
    backup["backup.ts\n(exportBackupJSON, exportInventoryCSV, restoreBackupJSON)"]
    feedback["feedback.ts\n(playChimeSound, triggerHaptic)"]
    utils["utils.ts\n(cn)"]

    %% Dependencias principales
    productTypes --> dates
    productTypes --> categories
    productTypes --> dateRec

    shelfLife --> dates
    shelfLife --> productTypes

    dateRec --> dates

    ocr --> dateRec
    ocr --> shelfLife
    ocr --> dates
    ocr --> quantity

    barcode --> categories
    barcode --> shelfLife
    barcode --> dates
    barcode --> productTypes

    ingMatch --> productTypes

    invCons --> productTypes
    invCons --> ingMatch
    invCons --> quantity

    localRec --> ingMatch
    localRec --> productTypes
    localRec --> dates
    localRec --> recipeApi

    recipeApi --> ingMatch

    shopping --> shelfLife
    shopping --> dates
    shopping --> quantity
    shopping --> ingMatch
    shopping --> categories
    shopping --> productTypes

    reports --> impact
    reports --> productTypes
    reports --> invCons
    reports --> storage

    notifRules --> dates
    notifRules --> productTypes

    pwaNotif --> dates

    backup --> storage
    backup --> productTypes
```

---

## 4. Roles y Responsabilidades por Capa

### Capa de Presentación (`client/src/components/` y `client/src/pages/`)
- `pages/Home.tsx` actúa como controlador principal y orquestador del estado en memoria (`products`, `storedProducts`, `shoppingList`, `impactStats`, etc.).
- Utiliza subcomponentes modulares dentro de `components/home/` (`PantrySection`, `RecipesSection`, `ReportsSection`, `ShoppingSection`, `HeroSection`, `StatsSection`, `MobileBottomNav`) a los que alimenta mediante props fuertemente tipadas y callbacks.
- Las primitivas accesibles en `components/ui/` (`dialog.tsx`, `tooltip.tsx`, `button.tsx`, `card.tsx`, `sonner.tsx`) proporcionan la base WAI-ARIA mediante Radix UI.

### Capa de Lógica de Dominio (`client/src/lib/`)
- Contiene funciones puras para matemáticas de fechas, reglas bromatológicas de vida útil, singularización y sinónimos de ingredientes, y balances de masas y volúmenes.
- Aísla completamente el cálculo matemático del renderizado visual de React, permitiendo una cobertura de pruebas unitarias rápida y determinística.

### Capa de Almacenamiento Local (`client/src/lib/storage.ts`)
- Encapsula el acceso a la Web Storage API (`localStorage`).
- Implementa salvaguardas de migración hacia atrás (`v1` y `v2` a `v3`), validación de esquemas en tiempo de ejecución (`isValidStoredProduct`) y protección ante cuota de disco excedida.

### Capa de Servidor y Gateway (`server/` y `api/`)
- **Desarrollo**: Vite ejecuta el plugin interno `apiTranslatePlugin()` definido en `vite.config.ts`, permitiendo depurar la traducción de recetas localmente sin compilar el servidor.
- **Producción tradicional (Node.js)**: `server/index.ts` ejecuta Express 5, sirve los archivos estáticos optimizados de `dist/public`, inyecta encabezados HTTP específicos para Service Worker (`Service-Worker-Allowed: /`) y responde a `/api/translate` aplicando control de tasa por IP y caché en memoria de 24 horas.
- **Producción serverless (Vercel)**: La función `api/translate.ts` atiende las peticiones POST de `/api/translate` bajo demanda, mientras que `vercel.json` se encarga del ruteo estático hacia `dist/public`.

---

## Enlaces Relacionados
- [Visión General](01-vision-general.md)
- [Modelo de Datos y Almacenamiento](06-modelo-de-datos-y-almacenamiento.md)
- [Referencia de Módulos lib/](07-referencia-de-modulos-lib.md)
- [Jerarquía de Componentes UI](08-componentes-ui.md)
- [Despliegue y Hosting](12-despliegue.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
