# Referencia de Módulos de Dominio (`client/src/lib/`)

Este documento constituye la referencia técnica exhaustiva de los 20 módulos ubicados en `client/src/lib/`. Cada sección detalla el propósito del archivo, sus dependencias internas y externas, si sus funciones son puras o producen efectos colaterales (I/O, `localStorage`, red, Web Audio o manipulación de DOM), y la firma tipada de sus principales exportaciones.

---

## 1. `backup.ts`

- **Propósito**: Gestión integral de exportación y restauración de copias de seguridad de datos en formato JSON y planillas de inventario en CSV.
- **Dependencias**: `./storage`, `@/types/product`.
- **Efectos Colaterales**: Manipulación del DOM (crea elementos `<a>` temporales para disparar descargas) y lectura/escritura en `localStorage`.

### Exportaciones Principales
- `interface FreshTrackBackup`: Estructura del archivo de respaldo JSON (`version`, `exportedAt`, `products`, `consumptionHistory`, `shoppingList`, `theme`).
- `function exportBackupJSON(products: StoredProduct[]): void`: Genera un Data URI JSON y descarga `FreshTrack-Backup-YYYY-MM-DD.json`. *(Efecto: DOM, descarga)*.
- `function exportInventoryCSV(products: Product[]): void`: Exporta los alimentos a CSV con BOM UTF-8 (`\uFEFF`) y CRLF. *(Efecto: DOM, Blob, descarga)*.
- `function restoreBackupJSON(jsonText: string): { success: boolean; message: string; count?: number }`: Valida y restaura productos, compras e historial. *(Efecto: localStorage)*.

---

## 2. `barcodeScanner.ts`

- **Propósito**: Detección de códigos de barras mediante la API nativa del navegador y consulta de metadatos de productos en la base de Open Food Facts.
- **Dependencias**: `./categories`, `./shelfLifeCatalog`, `./dates`, `@/types/product`.
- **Efectos Colaterales**: Peticiones de red HTTP (`fetch` hacia `world.openfoodfacts.org`) y acceso a la cámara mediante `BarcodeDetector`.

### Exportaciones Principales
- `interface ScannedBarcodeProduct`: Metadatos del producto obtenido por código de barras.
- `function isBarcodeDetectorSupported(): boolean`: Determina si `BarcodeDetector` existe en el objeto `window`. *(Pura)*.
- `function detectBarcodeFromImageSource(source: ImageBitmapSource): Promise<string | null>`: Escanea el lienzo con formatos comerciales comunes. *(Asincrónica, lectura de canvas/video)*.
- `function fetchProductByBarcode(barcode: string): Promise<ScannedBarcodeProduct | null>`: Consulta la API v2 de Open Food Facts y normaliza la información. *(Asincrónica, efecto de red)*.

---

## 3. `categories.ts`

- **Propósito**: Definición canónica de las 15 categorías bromatológicas de alimentos empleadas en filtros, ordenamiento por pasillos de supermercado y reglas de conservación.
- **Dependencias**: Ninguna.
- **Efectos Colaterales**: Ninguno (módulo de constantes puras).

### Exportaciones Principales
- `const ALL_CATEGORIES`: Arreglo inmutable (`as const`) con las 15 categorías: "Almacén seco", "Bebidas", "Café, té y desayuno", "Carnes", "Congelados", "Enlatados y conservas", "Fiambres y embutidos", "Frutas frescas", "Lácteos", "Panadería", "Pescados y mariscos", "Refrigerados preparados", "Salsas y aderezos", "Snacks y galletitas", "Verduras frescas".
- `type ProductCategory`: Unión tipada de los elementos de `ALL_CATEGORIES`.

---

## 4. `dateRecognition.ts`

- **Propósito**: Detección morfológica de fechas a partir de cadenas de texto OCR, clasificación semántica por contexto de palabras clave y memoria de aprendizaje de correcciones.
- **Dependencias**: `./dates.js`.
- **Efectos Colaterales**: Lectura y escritura de reglas de aprendizaje en `localStorage` (`freshtrack-date-learning-v1`).

### Exportaciones Principales
- `type DateCandidate`: Candidato de fecha extraído con valor textual, fecha ISO, precisión, etiqueta y score.
- `type DateLearningRule`: Regla persistida que asocia un producto o categoría a una etiqueta preferida.
- `function classifyDateContext(context: string, learning?: DateLearningRule): DateLabel`: Asigna `"vencimiento"`, `"elaboración"` o `"consumo preferente"` según palabras clave circundantes. *(Pura)*.
- `function detectDateCandidates(ocrText: string, learning?: DateLearningRule): DateCandidate[]`: Aplica expresiones regulares multiformato sobre el texto reconocido. *(Pura)*.
- `function loadLearningRules(): DateLearningRule[]`: Carga las reglas aprendidas. *(Efecto: localStorage)*.
- `function saveLearningCorrection(input): DateLearningRule`: Guarda o actualiza una corrección del usuario. *(Efecto: localStorage)*.
- `function getLearningRule(productKey: string, category?: string): DateLearningRule | undefined`: Busca una regla para un producto dado. *(Efecto: localStorage)*.
- `function labelForDisplay(label: DateLabel): string`: Devuelve el texto amigable en español. *(Pura)*.

---

## 5. `dates.ts`

- **Propósito**: Motor matemático de fechas para tiempo local (zona horaria del dispositivo), cálculo de días restantes, semáforos de estado, formateo relativo y parseo tolerante a fallos con corrección de ruido OCR.
- **Dependencias**: `react` (`useEffect`, `useState`).
- **Efectos Colaterales**: `useToday()` suscribe escuchas a eventos del DOM (`visibilitychange`) y temporizadores `setTimeout`. El resto de las funciones son 100% puras.

### Exportaciones Principales
- `const SOON_THRESHOLD_DAYS = 3`: Umbral de días para considerar un alimento "por vencer".
- `function toISODate(date: Date): string`: Genera `YYYY-MM-DD` usando componentes de fecha **locales** (no UTC). *(Pura)*.
- `function todayISO(today?: Date): string`: Retorna la fecha de hoy en formato ISO local. *(Pura)*.
- `function addDaysISO(days: number, today?: Date): string`: Suma o resta días en fecha local. *(Pura)*.
- `function daysUntil(iso: string, today?: Date): number`: Diferencia en días calendario entre dos medianoches locales. *(Pura)*.
- `function statusFromDays(days: number): "ok" | "soon" | "expired"`: Mapea días al semáforo de estado. *(Pura)*.
- `function formatExpiryDisplay(iso: string, today?: Date): string`: Formatea la fecha como `"18 sep"` o `"12 ago 27"` si el año difiere del actual. *(Pura)*.
- `function formatRelativeDays(days: number): string`: Texto relativo ("hoy", "mañana", "en N días", "hace N días"). *(Pura)*.
- `function formatTimeAgo(isoString: string, now?: Date): string`: Texto relativo pasado en rioplatense ("recién", "ayer", etc.). *(Pura)*.
- `function parseDateToISO(text: string, referenceDate?: Date): DateParseResult | null`: Analiza cadenas complejas, meses en texto y formatos compactados (ej. `12AGO27`). *(Pura)*.
- `function parseDateCandidateToISO(text: string): string | null`: Versión reducida que retorna la cadena ISO o `null`. *(Pura)*.
- `function useToday(): Date`: Hook de React que refresca la fecha al cruzar la medianoche y ante cambios de visibilidad de la pestaña. *(Efecto: React Hook / DOM)*.

---

## 6. `feedback.ts`

- **Propósito**: Proveedor de respuesta sensorial mediante síntesis de audio procedural en el navegador (Web Audio API) y pulsos hápticos en dispositivos móviles.
- **Dependencias**: Ninguna.
- **Efectos Colaterales**: Crea y reanuda un `AudioContext` global, emite sonido por el hardware de audio y llama a `navigator.vibrate()`.

### Exportaciones Principales
- `function playChimeSound(type?: "success" | "pop" | "delete" | "scan"): void`: Sintetiza acordes y tonos sinusoidales/triangulares sin requerir archivos de audio externos. *(Efecto: Web Audio API)*.
- `function triggerHaptic(pattern?: number | number[]): void`: Dispara vibración en el teléfono si el navegador lo permite. *(Efecto: Vibration API)*.

---

## 7. `impactStats.ts`

- **Propósito**: Módulo de contabilidad de ahorro y métricas de impacto ambiental y económico por aprovechamiento de alimentos.
- **Dependencias**: Ninguna.
- **Efectos Colaterales**: Lectura y escritura en `localStorage` (`freshtrack-impact-stats-v1`).

### Exportaciones Principales
- `type ImpactStats`: Estructura con `month`, `mealsSaved`, `kgSaved`, `moneySaved` y `actions`.
- `const ESTIMATED_KG_PER_RECIPE = 0.4`: Kilogramos estimados ahorrados por receta.
- `const ESTIMATED_MONEY_PER_RECIPE = 1200`: Pesos argentinos estimados ahorrados por receta.
- `const ESTIMATED_MEALS_PER_RECIPE = 1`: Comidas estimadas por receta.
- `function loadImpactStats(): ImpactStats`: Carga las estadísticas del mes corriente. *(Efecto: localStorage)*.
- `function saveImpactStats(stats: ImpactStats): void`: Persiste las estadísticas. *(Efecto: localStorage)*.
- `function recordImpact(input?): ImpactStats`: Suma incrementos a las métricas del mes. *(Efecto: localStorage)*.
- `function reverseImpact(input): ImpactStats`: Resta valores (para operaciones de *deshacer*). *(Efecto: localStorage)*.
- `function formatMoney(value: number): string`: Formatea importes con puntuación argentina (`$1.200`). *(Pura)*.

---

## 8. `ingredientMatching.ts`

- **Propósito**: Motor de coincidencia lingüística de ingredientes mediante normalización, eliminación de conectores culinarios (*stop words*), singularización y grupos de sinónimos canónicos.
- **Dependencias**: `@/types/product`.
- **Efectos Colaterales**: Ninguno (todas las funciones son puras).

### Exportaciones Principales
- `function normalizeText(value: string): string`: Limpia puntuación, minúsculas y remueve tildes. *(Pura)*.
- `function singularizeWord(word: string): string`: Reduce plurales en español e inglés a su singular. *(Pura)*.
- `function tokenizeIngredient(text: string): string[]`: Tokeniza y filtra palabras irrelevantes. *(Pura)*.
- `function matchIngredientTokens(itemText: string, recipeIngredientText: string): MatchScoreResult`: Calcula puntaje de 0 a 100 por tokens y sinónimos (nunca por subcadenas arbitrarias). *(Pura)*.
- `function findBestMatchingItem<T>(pantryItems: T[], recipeIngredient): T | null`: Encuentra el mejor producto activo en la despensa, descartando vencidos y aplicando FEFO para desempatar. *(Pura)*.
- `function findMatchingPantryItem<T>(ingredientName: string, pantryItems: T[]): T | null`: Envoltorio de conveniencia por nombre simple. *(Pura)*.

---

## 9. `inventoryConsumption.ts`

- **Propósito**: Planificación algorítmica y aplicación atómica de deducciones de ingredientes en el inventario, balance de cantidades remanentes y reconstrucción histórica para *undo*.
- **Dependencias**: `@/types/product`, `./ingredientMatching`, `./quantity`.
- **Efectos Colaterales**: Ninguno directo (opera sobre estructuras en memoria; la persistencia se delega a `storage.ts`).

### Exportaciones Principales
- `type ConsumptionConfidence`: `"exact" | "converted" | "assumed" | "manual"`.
- `type ConsumptionPlan`: Resultado que agrupa las líneas de deducción y los ingredientes faltantes.
- `type ConsumptionRecord`: Registro histórico para auditoría y reversión.
- `function isNonNumericSpice(measure: string): boolean`: Detecta expresiones de condimento como "a gusto" o "pizca". *(Pura)*.
- `function planRecipeConsumption(items: StoredProduct[], recipeIngredients): ConsumptionPlan`: Planifica la deducción comparando unidades y familias. *(Pura)*.
- `function applyConsumptionPlan(stored: StoredProduct[], selectedDeductions): { remaining, applied, depletedItemNames }`: Aplica las restas de cantidad confirmadas por el usuario. *(Pura)*.
- `function undoConsumptionHistory(records, targetRecordId): { rebuiltProducts, rebuiltHistory }`: Reconstruye el inventario restaurando el snapshot previo y re-ejecutando deducciones posteriores. *(Pura)*.

---

## 10. `localRecipesMatching.ts`

- **Propósito**: Motor de recetas locales que compara instantáneamente la despensa con las 131 preparaciones de `localRecipes.json` en el cliente, clasificándolas en *tiers*.
- **Dependencias**: `@/data/localRecipes.json`, `./ingredientMatching`, `@/types/product`, `./dates`, `./recipeApi`.
- **Efectos Colaterales**: Mantiene una pequeña caché en memoria en variables del módulo (`cachedOnlineResults`). `fetchOnlineRecipesForPantry` realiza peticiones de red vía `recipeApi`.

### Exportaciones Principales
- `type LocalRecipe`: Interfaz de receta del catálogo local.
- `type RecipeMatchResult`: Coincidencia que incluye porcentaje, ingredientes faltantes y `tier` (`"ready" | "almost" | "more"`).
- `const LOCAL_RECIPES`: Catálogo tipado de las 131 recetas de `localRecipes.json`.
- `function matchRecipeAgainstPantry(recipe, pantry, today?): RecipeMatchResult`: Evalúa una receta individual. *(Pura)*.
- `function calculateLocalRecipeMatches(pantry, recipes?, today?): GroupedRecipeMatches | null`: Procesa la despensa y agrupa en los 3 tiers; retorna `null` si hay menos de 3 productos (estado C6). *(Pura)*.
- `function fetchOnlineRecipesForPantry(pantry, signal?): Promise<LocalRecipe[]>`: Consulta TheMealDB y transforma los resultados al formato `LocalRecipe`. *(Asincrónica, efecto de red)*.

---

## 11. `notificationRules.ts`

- **Propósito**: Reglas de negocio para la emisión de avisos preventivos, configuración de días de anticipación por categoría bromatológica y armado del resumen semanal.
- **Dependencias**: `./dates`, `@/types/product`.
- **Efectos Colaterales**: Lectura y escritura de preferencias en `localStorage` (`freshtrack-notification-preferences-v1`).

### Exportaciones Principales
- `type AlertLeadDays`: `1 | 3 | 7`.
- `type NotificationPreferences`: Preferencias de alertas del usuario.
- `const defaultNotificationPreferences`: Valores predeterminados (alertas activas, resumen los domingos, días según perecibilidad).
- `function loadNotificationPreferences(): NotificationPreferences`: Carga preferencias guardadas. *(Efecto: localStorage)*.
- `function saveNotificationPreferences(preferences): void`: Persiste las preferencias. *(Efecto: localStorage)*.
- `function groupNotifications(items, preferences?, today?): NotificationGroup[]`: Agrupa productos que vencen el mismo día en un único aviso consolidado. *(Pura)*.
- `function buildWeeklySummary(items, preferences?, today?)`: Genera el texto del informe semanal. *(Pura)*.
- `function getCategoryLeadDays(category, preferences?): AlertLeadDays`: Retorna la anticipación configurada para una categoría. *(Pura)*.

---

## 12. `ocrScanner.ts`

- **Propósito**: Pipeline de visión artificial con Tesseract.js local, preprocesamiento gráfico en canvas (recorte, escala de grises y contraste) y analizador morfológico de tickets fiscales argentinos.
- **Dependencias**: `tesseract.js`, `./dateRecognition`, `./shelfLifeCatalog`, `./dates`, `./quantity`.
- **Efectos Colaterales**: Crea elementos `<canvas>`, manipula mapas de píxeles (`ImageData`), levanta trabajadores web (`Tesseract.Worker`) y lee tickets de ejemplo.

### Exportaciones Principales
- `type ScannedProductResult`: Producto detectado por el escáner con categoría, fecha ISO y nivel de confianza.
- `function extractQuantityFromTicketLine(line: string): { quantity: string; cleanName: string }`: Aísla multiplicadores, packs y pesos descartando precios y ruido fiscal. *(Pura)*.
- `function parseReceiptAndLabelText(rawText: string, detectIconFn, today?): ScannedProductResult[]`: Extrae productos y fechas candidatas del texto crudo. *(Pura)*.
- `function applyGrayscaleAndContrast(imageData, contrastFactor?): ImageData`: Transforma píxeles aplicando luma y estiramiento de contraste dinámico. *(Manipulación de buffer)*.
- `function preprocessImage(imageSource, cropArea?): Promise<HTMLCanvasElement>`: Renderiza la imagen procesada en canvas. *(Asincrónica, efecto en DOM)*.
- `function performBrowserOCR(imageSource, onProgress?, cropArea?): Promise<{ text; confidence }>`: Ejecuta Tesseract 7 contra los modelos locales en `/tesseract/`. *(Asincrónica, Web Workers)*.
- `const SAMPLE_TICKETS`: Comprobantes argentinos precargados para pruebas sin cámara.

---

## 13. `pwaAndNotifications.ts`

- **Propósito**: Orquestación del ciclo de vida de la PWA (instalación en pantalla de inicio, modo standalone), registro de Service Worker y despacho de avisos push locales.
- **Dependencias**: `virtual:pwa-register`, `./dates`.
- **Efectos Colaterales**: Escucha eventos de ventana (`beforeinstallprompt`, `appinstalled`), registra el Service Worker y despacha avisos con la Notification API.

### Exportaciones Principales
- `function setupPWAInstallListeners(): void`: Inicializa los escuchas para capturar el prompt de instalación nativo. *(Efecto: window events)*.
- `function subscribeToInstallPrompt(callback): () => void`: Permite a los componentes suscribirse al estado de disponibilidad del botón de instalación. *(Efecto: suscripción)*.
- `function promptPWAInstall(): Promise<boolean>`: Dispara el diálogo nativo de instalación de la PWA. *(Asincrónica, interacción de sistema)*.
- `function isStandaloneMode(): boolean`: Determina si la app se ejecuta como ventana instalada independiente. *(Lectura de matchMedia)*.
- `function registerServiceWorker(): any`: Registra el Service Worker generado por VitePWA con auto-actualización inmediata. *(Efecto de navegador)*.
- `function requestNotificationPermission(): Promise<NotificationPermission | "unsupported">`: Solicita permiso de notificaciones al usuario. *(Asincrónica)*.
- `function notifyExpiringProducts(products, force?, today?): Promise<{ sent; message? }>`: Emite una notificación agrupada aplicando el límite de una diaria. *(Asincrónica, Service Worker / localStorage)*.
- `function clearNotificationDailyLimit(): void`: Remueve la restricción diaria para facilitar pruebas. *(Efecto: localStorage)*.

---

## 14. `quantity.ts`

- **Propósito**: Analizador y conversor de unidades físicas y culinarias (masa, volumen, conteo y empaques), soporte de fracciones numéricas/Unicode y detección unificada de stock bajo.
- **Dependencias**: Ninguna.
- **Efectos Colaterales**: Ninguno (todas las funciones son puras).

### Exportaciones Principales
- `type QuantityFamily`: `"mass" | "volume" | "count" | "pack"`.
- `type Quantity`: Objeto estructurado `{ amount: number; unit: string; family: QuantityFamily }`.
- `function parseQuantity(text: string): Quantity | null`: Convierte cadenas como `"1 1/2 kg"`, `"500 cc"`, `"2 docenas"` o `"1 pote"` en un objeto `Quantity`. *(Pura)*.
- `function convertQuantity(q: Quantity, targetUnit: string): Quantity | null`: Convierte entre unidades de la misma familia (ej. g a kg, o tazas a litros). *(Pura)*.
- `function formatQuantity(q: Quantity): string`: Formatea la cantidad en lenguaje rioplatense natural con concordancia de plurales (ej. `"1 litro"`, `"2 litros"`, `"750 g"`). *(Pura)*.
- `function isQuantityLow(quantityOrText: Quantity | string): boolean`: Determina si un alimento tiene stock bajo ($\le 1$ unidad, $< 100$ g, $< 100$ ml o texto "queda poco"). *(Pura)*.

---

## 15. `recipeApi.ts`

- **Propósito**: Cliente para la búsqueda de recetas en TheMealDB priorizadas por fecha de vencimiento, integración con el endpoint de traducción `/api/translate` y recetas de respaldo locales.
- **Dependencias**: `./ingredientMatching.js`.
- **Efectos Colaterales**: Peticiones de red HTTP (`fetch` hacia TheMealDB y `/api/translate`), caché en memoria y persistencia en `localStorage` (`freshtrack-recipe-i18n-v1`).

### Exportaciones Principales
- `type RecipeSuggestion`: Modelo unificado de receta (local o externa).
- `const fallbackRecipes`: 12 preparaciones de respaldo completas en español.
- `function isGlutenFreeEstimated(ingredients): boolean`: Estimación algorítmica de ausencia de gluten por ingredientes. *(Pura)*.
- `function getRecipeFallbackImage(title: string, category?: string): string`: Genera un SVG en base64 cuando no hay imagen disponible. *(Pura)*.
- `function filterFallbackRecipes(pantryProducts): RecipeSuggestion[]`: Filtra las recetas de respaldo según los ingredientes de la despensa. *(Pura)*.
- `function searchRecipesByExpiring(products, signal?): Promise<RecipeSearchResult>`: Busca en TheMealDB usando los 3 ingredientes más próximos a vencer. *(Asincrónica, efecto de red y caché)*.
- `function translateRecipe(recipe: RecipeSuggestion): Promise<RecipeSuggestion>`: Traduce los campos de la receta vía `/api/translate` con persistencia en `localStorage`. *(Asincrónica, red y localStorage)*.
- `function getRecipeDetails(recipe, signal?): Promise<RecipeSuggestion>`: Obtiene el detalle completo, instrucciones e ingredientes traducidos. *(Asincrónica, red)*.

---

## 16. `reportsData.ts`

- **Propósito**: Construcción de series temporales y agregaciones analíticas para los gráficos de Recharts (desperdicio mensual evitado, pérdidas por categoría y ranking de vencidos).
- **Dependencias**: `./impactStats`, `@/types/product`, `./inventoryConsumption`, `./storage`.
- **Efectos Colaterales**: Lectura y escritura en `localStorage` (`freshtrack-expired-history-v1` y `freshtrack-monthly-impact-history-v1`).

### Exportaciones Principales
- `function loadExpiredHistory(): HistoricalExpiredItem[]`: Carga los registros de productos vencidos. *(Efecto: localStorage)*.
- `function recordExpiredItem(name: string, category: string): void`: Añade un descarte al histórico. *(Efecto: localStorage)*.
- `function buildMonthlyWasteData(impact: ImpactStats, today?): MonthlyImpactPoint[]`: Construye la serie de 4 meses con datos reales o proyecciones ponderadas. *(Pura)*.
- `function buildCategoryWasteData(products: Product[], history?): CategoryWastePoint[]`: Calcula los porcentajes de descarte por categoría para el gráfico de torta. *(Pura)*.
- `function buildTopExpiredProducts(products: Product[], history?): TopExpiredProduct[]`: Genera el ranking de los 5 alimentos que más veces caducaron. *(Pura)*.
- `function hasSufficientReportsData(impact, products, consumptionHistory): boolean`: Valida si existe información suficiente para dibujar los gráficos. *(Pura)*.

---

## 17. `shelfLifeCatalog.ts`

- **Propósito**: Catálogo bromatológico regional (66 alimentos), cálculo de mínimos conservadores por categoría, persistencia de ajustes personalizados y recálculo por apertura de envase.
- **Dependencias**: `./dates`, `@/types/product`.
- **Efectos Colaterales**: Lectura y escritura de correcciones del usuario en `localStorage` (`freshtrack-shelf-corrections-v1`).

### Exportaciones Principales
- `const SPECIFIC_PRODUCTS`: Catálogo base de 66 productos con duraciones cerrado y abierto.
- `const CATEGORY_CONSERVATIVE_MINIMUMS`: Mínimos inocuos por categoría.
- `function getCatalogSize(): number`: Cantidad de productos en el catálogo (66). *(Pura)*.
- `function getCategoryConservativeMinimum(category: string)`: Devuelve la menor duración registrada en la categoría. *(Pura)*.
- `function saveShelfLifeCorrection(productName, closedDays, openDays?)`: Persiste un ajuste personalizado del usuario. *(Efecto: localStorage)*.
- `function estimateShelfLife(productName, state?, category?, freshCondition?): ShelfLifeEstimate | undefined`: Evalúa el producto siguiendo el árbol de decisión inocuo. *(Pura salvo lectura de correcciones)*.
- `function calculateOpenProduct(product: StoredProduct, today?): OpenProductResult`: Recalcula el vencimiento tras la apertura asegurando no extender nunca la fecha. *(Pura)*.

---

## 18. `shoppingList.ts`

- **Propósito**: Gestión de la lista de compras, sugerencias de reposición inteligente por frecuencia y stock bajo, consolidación sin duplicados y migración de artículos comprados hacia la despensa.
- **Dependencias**: `./shelfLifeCatalog`, `./dates`, `./quantity`, `./ingredientMatching`, `./categories`, `@/types/product`.
- **Efectos Colaterales**: Lectura y escritura en `localStorage` (`freshtrack-shopping-list-v1`).

### Exportaciones Principales
- `function loadShoppingList(): ShoppingItem[]`: Carga los ítems de compra. *(Efecto: localStorage)*.
- `function saveShoppingList(items: ShoppingItem[]): void`: Guarda los ítems de compra. *(Efecto: localStorage)*.
- `function areItemsSameProduct(name1: string, name2: string): boolean`: Determina si dos nombres representan el mismo alimento ($\ge 75\%$ similitud de tokens). *(Pura)*.
- `function addOrMergeShoppingItem(currentList, newItem): ShoppingItem[]`: Añade un ítem o consolida motivos y cantidades si ya existía. *(Pura)*.
- `function addLowStockToShoppingList(currentList, pantry): ShoppingItem[]`: Añade los alimentos con stock bajo de la despensa. *(Pura)*.
- `function addRecipeMissingToShoppingList(currentList, recipeTitle, missing): ShoppingItem[]`: Añade los faltantes de una receta. *(Pura)*.
- `function getItemReasonBadges(item: ShoppingItem): string[]`: Genera los textos de las insignias de motivo. *(Pura)*.
- `function groupShoppingItemsByCategory(items): CategoryShoppingGroup[]`: Agrupa respetando el orden de pasillos `ALL_CATEGORIES`. *(Pura)*.
- `function updateShoppingItemQuantity(currentList, id, rawQuantity)`: Modifica la cantidad validando con `parseQuantity`. *(Pura)*.
- `function adjustShoppingItemQuantityStep(currentList, id, delta)`: Incrementa o decrementa cantidades según la familia. *(Pura)*.
- `function generateSmartSuggestions(pantry, history, currentList): ShoppingItem[]`: Deduce sugerencias de compra a partir de consumos frecuentes y alimentos agotados o vencidos. *(Pura)*.
- `function migratePurchasedItemsToPantry(currentShoppingList, detectIconFn, today?)`: Transfiere artículos tildados a la despensa proyectando sus fechas de vencimiento. *(Pura)*.

---

## 19. `storage.ts`

- **Propósito**: Módulo central de acceso a Web Storage con validación de esquemas, migraciones de versiones y control de excepciones de cuota de almacenamiento.
- **Dependencias**: `./dates`, `@/types/product`.
- **Efectos Colaterales**: Lectura, escritura y remoción directa sobre `window.localStorage`.

### Exportaciones Principales
- `const PRODUCTS_STORAGE_KEY = "freshtrack-products-v3"`.
- `function loadJSON<T>(key: string, fallback: T): T`: Lectura segura envuelta en `try/catch`. *(Efecto: localStorage)*.
- `function saveJSON<T>(key: string, value: T): boolean`: Escritura segura con captura de `QuotaExceededError`. *(Efecto: localStorage)*.
- `function isValidStoredProduct(item: any): item is StoredProduct`: Guardia de tipos en runtime que valida IDs, nombres, categorías y fechas ISO reales de calendario. *(Pura)*.
- `function loadStoredProducts(today?: Date): StoredProduct[] | null`: Carga productos v3 o ejecuta la migración automática desde v2. *(Efecto: localStorage)*.
- `function saveStoredProducts(products: StoredProduct[]): boolean`: Filtra con `isValidStoredProduct` y persiste en v3. *(Efecto: localStorage)*.
- `function loadConsumptionHistory<T>(fallback?: T[]): T[]`: Carga el historial de consumos limpiando claves legadas. *(Efecto: localStorage)*.
- `function saveConsumptionHistory<T>(records: T[]): boolean`: Guarda el historial de consumos. *(Efecto: localStorage)*.
- `function loadLastScan(): LastScanInfo | null` y `saveLastScan(info)`: Gestiona la información del último escaneo. *(Efecto: localStorage)*.

---

## 20. `utils.ts`

- **Propósito**: Helper de utilidad para la combinación y deduplicación atómica de clases CSS de Tailwind.
- **Dependencias**: `clsx`, `tailwind-merge`.
- **Efectos Colaterales**: Ninguno (función pura).

### Exportaciones Principales
- `function cn(...inputs: ClassValue[]): string`: Concatena condicionalmente nombres de clases CSS con `clsx` y resuelve colisiones de especificidad de Tailwind con `twMerge`. *(Pura)*.

---

## Enlaces Relacionados
- [Arquitectura del Sistema](../02-arquitectura.md)
- [Modelo de Datos y Almacenamiento](../06-modelo-de-datos-y-almacenamiento.md)
- [Componentes de UI](../08-componentes-ui.md)
- [Limitaciones y Deuda Técnica](../14-limitaciones-y-deuda-tecnica.md)
