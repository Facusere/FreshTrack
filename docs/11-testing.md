# Estrategia de Pruebas y Calidad (Testing)

Este documento detalla la suite de pruebas unitarias, de integración, de contraste cromático y funcionales End-to-End (E2E) de FreshTrack, incluyendo la configuración de ejecutores (Vitest y Playwright con Axe-core), la cobertura por archivo y las áreas identificadas sin cobertura automatizada.

---

## 1. Estrategia Global de Pruebas

FreshTrack adopta una pirámide de pruebas centrada en la solidez de la lógica de dominio en el cliente:
1. **Pruebas Unitarias y de Integración en Memoria (Vitest)**: Validan de manera instantánea y aislada los algoritmos de fechas, balances de inventario, inferencia bromatológica, tokenización y contrastes de color, sin requerir navegador real.
2. **Pruebas de Accesibilidad Automatizada (Axe-core)**: Auditan los estándares WCAG 2.1 AA/AAA tanto a nivel de tokens de color como en el DOM renderizado de modales y vistas.
3. **Pruebas End-to-End en Navegador Real (Playwright)**: Verifican flujos de usuario críticos (aprovechamiento de receta traducida, visualización en móviles y navegación) en una instancia real de Chromium/Google Chrome.

---

## 2. Detalle de Pruebas Unitarias (`client/src/tests/`)

La carpeta `client/src/tests/` contiene 17 suites de prueba (162 tests) ejecutadas por Vitest:

| Archivo de Prueba | Módulo Bajo Prueba | Escenarios y Aspectos Verificados |
| :--- | :--- | :--- |
| `contrast.test.ts` | `index.css` (Tokens) | Calcula el ratio de contraste matemático relativo (WCAG 2.1) entre colores de superficie y texto. Valida que todos los tokens semánticos (fondos de estado `ok`, `soon`, `expired`, botones y badges) superen el umbral mínimo de 4.5:1 para texto normal y 3:1 para texto grande tanto en tema claro como oscuro. |
| `cookbook.test.ts` | `cookbook.ts` | Evalúa la búsqueda tolerante a acentos/diacríticos (`normalizeSearchText`), búsqueda dentro de nombres de ingredientes, filtros dietarios (vegetariana, sin gluten, rápida) y ordenamientos (A-Z, coincidencia con despensa, favoritos primero). |
| `dateRecognition.test.ts` | `dateRecognition.ts` | Evalúa la detección de expresiones regulares de fechas en texto crudo, la ponderación de palabras clave (*vto*, *elab*, *consumir preferentemente*) y la aplicación de reglas de aprendizaje previo. |
| `dates.test.ts` | `dates.ts` | Verifica que `toISODate()` use la hora local (evitando desfasajes a las 21 hs de Argentina), cálculo de `daysUntil()`, umbral `SOON_THRESHOLD_DAYS`, formateo textual y migración automática de datos desde el esquema `v2` hacia `v3`. |
| `favoriteRecipes.test.ts` | `favoriteRecipes.ts` | Prueba el toggle de favoritos, la persistencia en `freshtrack-favorite-recipes-v1`, la poda de IDs de recetas eliminadas del catálogo y la tolerancia a datos corruptos o cuota de almacenamiento excedida. |
| `inventoryConsumption.test.ts` | `inventoryConsumption.ts` | Valida la planificación de descuentos de ingredientes (`planRecipeConsumption`), asignación de niveles de confianza (`exact`, `converted`, `assumed`, `manual`), preservación de condimentos no numéricos y balance de remanentes. |
| `inventoryConsumption.integration.test.ts` | `inventoryConsumption.ts` y `storage.ts` | Prueba integral del ciclo de vida: consume una receta sobre un inventario real, verifica el descuento en `StoredProduct[]`, audita el snapshot generado y ejecuta la función `undoConsumptionHistory()` para certificar que el inventario se restablece exactamente al estado original. |
| `localRecipes.test.ts` | `localRecipesMatching.ts` | Certifica que el motor de recetas locales opere de forma 100% pura y desconectada sin ningún mock de red. Evalúa la clasificación en *tiers* (`ready` al 100%, `almost` $\ge 80\%$, `more` $< 80\%$) y la activación del estado vacío C6 cuando hay menos de 3 alimentos. |
| `mealPlan.test.ts` | `mealPlan.ts` | Valida el cálculo de semanas de lunes a domingo en calendario local (sin desfase UTC), soporte para cruces de mes/año bisiesto, asignación y reemplazo por turno, poda automática de comidas pasadas (> 30 días) y detección de ingredientes que vencerán antes de cocinar. |
| `ocrScanner.test.ts` | `ocrScanner.ts` | Prueba exhaustiva de `extractQuantityFromTicketLine()` con multiplicadores (`"2 LECHE"`), expresiones de pack (`"4X120G"`), pesos (`"1.500 KG"`), y descarte de ruido fiscal y precios argentinos (`"$1.250"`, `"x $4.500"`). |
| `openProduct.test.ts` | `shelfLifeCatalog.ts` | Verifica la función `calculateOpenProduct()`, asegurando que al abrir un producto se apliquen los días de apertura seguros del catálogo y que bajo ninguna circunstancia se postergue la fecha de caducidad original. |
| `recipeApi.test.ts` | `recipeApi.ts` | Simula llamadas a TheMealDB, validando la priorización de alimentos por vencer, la estimación algorítmica sin gluten (`isGlutenFreeEstimated`), la persistencia de traducciones en `freshtrack-recipe-i18n-v1` y los fallbacks ante desconexión. |
| `reportsData.test.ts` | `reportsData.ts` | Valida la construcción de la ventana de 4 meses de impacto, la proyección ponderada (factores 0.8, 0.6, 0.4 con asterisco `*`), el cálculo porcentual de descartes por categoría y el Top 5 de alimentos vencidos. |
| `shelfLife.test.ts` | `shelfLifeCatalog.ts` | Valida que los 66 productos devuelvan duraciones exactas según ANMAT/USDA, el reconocimiento por sinónimos (ej. *yogurt bebible* o *suprema de pollo*), la asignación de mínimos conservadores a productos desconocidos y la prioridad de ajustes guardados por el usuario (*"Con tu ajuste anterior"*). |
| `shoppingList.test.ts` | `shoppingList.ts` | Prueba la deduplicación de ítems en compras (`areItemsSameProduct`), fusión de motivos múltiples (`["stock_bajo", "receta"]`), consolidación de cantidades de la misma familia, agrupación por pasillos `ALL_CATEGORIES` y migración a despensa. |
| `weeklyShopping.test.ts` | `weeklyShopping.ts` | Certifica el escalado proporcional de porciones, la suma de unidades compatibles (g/kg, ml/l), el balance de despensa sin doble descuento entre recetas, la exclusión de productos vencidos del stock útil y la omisión de especias no numéricas. |
| `backup.test.ts` | `backup.ts` | Verifica la exportación y restauración íntegra de `FreshTrackBackup` incluyendo `favoriteRecipes` y `mealPlan`, con validación de tipos y soporte retrocompatible para archivos de versiones previas. |

---

## 3. Pruebas End-to-End con Playwright (`e2e/freshtrack.spec.ts`)

La suite E2E se ejecuta en un navegador real y valida 6 escenarios integrales:

1. **Flujo Culinario Completo**:
   - Inyecta un producto próximo a vencer en `localStorage` (`freshtrack-products-v3`).
   - Intercepta las llamadas de red a TheMealDB y `/api/translate` con mocks controlados.
   - Abre la aplicación, verifica la tarjeta de receta recomendada, abre el detalle traducido y confirma que no existan palabras en inglés rotas.
   - Presiona "Aprovechar receta", confirma el diálogo de deducción y constata la actualización del inventario y la emisión del Toast de éxito.
2. **Auditoría de Accesibilidad Axe-core**:
   - Ejecuta `new AxeBuilder({ page }).analyze()` sobre la vista principal (`Home`).
   - Abre el modal de alta manual (`AddProductModal`) y audita el árbol de accesibilidad.
   - Abre el modal de escaneo (`ScanModal`) y audita el árbol de accesibilidad.
   - Exige cero violaciones con impacto `"serious"` o `"critical"` (`expect(violations).toEqual([])`).
3. **Ausencia de Desbordamiento Horizontal (Scroll Horizontal)**:
   - Configura la ventana en anchos móviles mínimos de 320 px y 375 px.
   - Certifica mediante JavaScript que `document.documentElement.scrollWidth <= window.innerWidth`.
4. **Navegación Móvil y Botón Central de Escaneo**:
   - Configura el viewport en 390 px (ancho típico de smartphone).
   - Constata la visibilidad de la barra inferior fija (`[data-testid="mobile-bottom-nav"]`).
   - Pulsa el botón central de escaneo flotante y valida que abra de inmediato `ScanModal`.
5. **Explorador de Recetario, Favoritos y Compras**:
   - Conmuta a la solapa "Recetario" del módulo de recetas.
   - Marca una receta como favorita verificando el atributo `aria-pressed="true"`.
   - Abre el detalle, envía los ingredientes faltantes a la lista de compras y valida la notificación interactiva.
   - Navega al módulo de compras y constata la inserción del producto con su motivo culinario.
6. **Planificador Semanal y Generación de Lista Semanal**:
   - Abre el planificador semanal de 7 días.
   - Asigna dos recetas en diferentes turnos (almuerzo y cena).
   - Presiona "Generar lista semanal", previsualiza los ingredientes consolidados en el diálogo modal y confirma la adición.

---

## 4. Configuración de Playwright (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.FRESHTRACK_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

- **Canal de Navegador**: Fija `channel: "chrome"` para ejecutar sobre Google Chrome del sistema operativo.
- **Servidor Web Automático**: Si no hay un servidor corriendo en el puerto 3000, Playwright ejecuta automáticamente `pnpm dev` y espera hasta 120 segundos a que esté listo. Si ya existe un servidor activo, lo reutiliza (`reuseExistingServer: true`).

---

## 5. Cómo Ejecutar los Comandos de Prueba

```bash
# 1. Comprobación estricta de tipos de TypeScript (sin emitir archivos)
pnpm check

# 2. Correr todas las pruebas unitarias de Vitest
pnpm test

# 3. Correr Vitest en modo interactivo/observador
pnpm vitest

# 4. Correr la suite E2E de Playwright
pnpm test:e2e

# 5. Correr Playwright con interfaz gráfica
pnpm playwright test --ui
```

---

## 6. Áreas sin Cobertura Automatizada (Gaps Identificados)

Al auditar la cobertura contra las funcionalidades reales, se identifican las siguientes áreas sin pruebas automatizadas directas (registradas en la deuda técnica):
1. **Flujo de Escaneo OCR real**: No hay pruebas que procesen una imagen binaria real contra Tesseract.js en el entorno de pruebas (debido al costo de inicializar WebAssembly en Node/Vitest).
2. **Escaneo de Código de Barras y Open Food Facts**: No existen pruebas que simulen la detección por cámara ni el fallback ante respuestas no encontradas de Open Food Facts.
3. **Exportación e Importación de Copias de Seguridad (Backup)**: `exportBackupJSON`, `exportInventoryCSV` y `restoreBackupJSON` carecen de pruebas unitarias dedicadas en `client/src/tests/`.
4. **Módulo de Compras en E2E**: El flujo completo de marcar ítems en compras y pulsar *"Pasar a la despensa"* no está cubierto en `freshtrack.spec.ts`.
5. **Reacción a la Medianoche**: El temporizador de medianoche del hook `useToday()` no posee pruebas de avance de tiempo virtualizado (*fake timers*).

---

## Enlaces Relacionados
- [Instalación y Entorno](03-instalacion-y-entorno.md)
- [Diseño y Accesibilidad](13-diseno-y-accesibilidad.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
- [Guía de Contribución](15-guia-de-contribucion.md)
