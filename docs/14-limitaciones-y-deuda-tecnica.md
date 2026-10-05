# Limitaciones y Deuda Técnica

Este documento registra de forma rigurosa y verificada en el código fuente las limitaciones arquitectónicas, inconsistencias de implementación y deudas técnicas identificadas en FreshTrack. Cada ítem incluye su nivel de severidad asignado, los archivos afectados, la evidencia en el código y la recomendación técnica para su resolución futura.

---

## 1. Resumen de Severidad de Hallazgos

| # | Hallazgo Técnico | Severidad | Componente / Archivo Afectado |
| :---: | :--- | :---: | :--- |
| 1 | Inconsistencia en la clave de persistencia del tema visual | **Media** | `client/src/contexts/ThemeContext.tsx`, `client/src/lib/backup.ts` |
| 2 | Copia de seguridad incompleta (omisión de estadísticas y reglas) | **Media** | `client/src/lib/backup.ts` |
| 3 | Restauración de respaldo sin validación profunda de esquema | **Media** | `client/src/lib/backup.ts`, `client/src/lib/storage.ts` |
| 4 | Estado volátil en memoria del proxy de traducción en serverless | **Media** | `server/translate.ts`, `api/translate.ts` |
| 5 | Escrituras a `localStorage` sin captura de cuota excedida | **Media** | `client/src/lib/impactStats.ts`, `client/src/lib/notificationRules.ts` |
| 6 | Concentración excesiva de lógica en componentes monolíticos | **Media** | `client/src/pages/Home.tsx`, `client/src/components/ScanModal.tsx`, `client/src/components/home/RecipesSection.tsx` |
| 7 | Cobertura reducida en la suite de pruebas End-to-End | **Media** | `e2e/freshtrack.spec.ts` |
| 8 | Envío inválido de cabecera `User-Agent` en fetch del navegador | **Baja** | `client/src/lib/barcodeScanner.ts` |
| 9 | Terminación de líneas mixta en el repositorio (CRLF vs LF) | **Baja** | Todo el repositorio (`.prettierrc`) |
| 10 | Desactualización funcional del archivo `README.md` | **Baja** | `README.md` |
| 11 | Presencia de artefactos de compilación comiteados | **Baja** | `dist/`, `test-results/` |
| 12 | Textos en idioma inglés en la pantalla de error de contingencia | **Baja** | `client/src/components/ErrorBoundary.tsx` |
| 13 | Nombres divergentes en categorías de código de barras | **Baja** | `client/src/lib/barcodeScanner.ts`, `client/src/lib/categories.ts` |
| 14 | Imágenes externas en recetas de fallback locales | **Baja** | `client/src/lib/recipeApi.ts` |
| 15 | Datos locales sin cifrar y sin sincronización multi-dispositivo | **Informativa** | `client/src/lib/storage.ts` |

---

## 2. Detalle de Hallazgos Verificados

### 1. Inconsistencia en la Clave del Tema Visual
- **Severidad**: **Media**
- **Archivos Afectados**: `client/src/contexts/ThemeContext.tsx` (líneas 26 y 41), `client/src/lib/backup.ts` (línea 21).
- **Evidencia en el Código**:
  En `ThemeContext.tsx`, el proveedor lee y escribe bajo la clave `"theme"`:
  ```typescript
  const stored = localStorage.getItem("theme");
  localStorage.setItem("theme", theme);
  ```
  Sin embargo, en `backup.ts` la función `exportBackupJSON` intenta respaldar el tema leyendo la clave inexistente `"freshtrack-theme"`:
  ```typescript
  const theme = typeof localStorage !== "undefined"
    ? localStorage.getItem("freshtrack-theme") || "light"
    : "light";
  ```
- **Impacto**: La exportación del respaldo siempre descarga `theme: "light"`, ignorando si el usuario tenía configurado el tema oscuro.
- **Recomendación**: Unificar la clave a `"freshtrack-theme"` en ambos módulos o leer `"theme"` en `backup.ts`.

---

### 2. Copia de Seguridad Parcial (Omisión de Estadísticas y Reglas de Aprendizaje)
- **Severidad**: **Media**
- **Archivo Afectado**: `client/src/lib/backup.ts` (líneas 18-35).
- **Evidencia en el Código**:
  `exportBackupJSON()` empaqueta `products`, `consumptionHistory`, `shoppingList`, y ahora también `favoriteRecipes` y `mealPlan`. Sin embargo, continúan excluidos del archivo de respaldo:
  - `freshtrack-impact-stats-v1` (kilogramos, dinero y platos salvados).
  - `freshtrack-expired-history-v1` (registro de descartes pasados para los gráficos de torta).
  - `freshtrack-monthly-impact-history-v1` (series mensuales acumuladas).
  - `freshtrack-shelf-corrections-v1` (ajustes de vida útil personalizados del usuario).
  - `freshtrack-date-learning-v1` (reglas aprendidas de lectura de fechas OCR).
  - `freshtrack-notification-preferences-v1` (reglas de alertas por categoría).
- **Impacto**: Si el usuario traslada su respaldo a otro teléfono o computadora, conserva su despensa, compras, favoritos y menú semanal, pero pierde su historial estadístico y sus calibraciones de OCR y vida útil.
- **Recomendación**: Ampliar la interfaz `FreshTrackBackup` para incluir estos campos opcionales en el archivo JSON.

---

### 3. Restauración de Respaldo: Validación de Productos vs Nuevos Módulos
- **Severidad**: **Media**
- **Archivo Afectado**: `client/src/lib/backup.ts` (líneas 74-125).
- **Evidencia en el Código**:
  La función `restoreBackupJSON()` ahora valida y sanitiza de forma estricta los nuevos campos (`data.favoriteRecipes` como arreglo de strings y `data.mealPlan` con guardas de `isValidPlannedMeal`). No obstante, en la colección principal de `data.products` aún comprueba únicamente que sea un arreglo (`Array.isArray(data.products)`), sin filtrar elemento por elemento con `isValidStoredProduct()`.
- **Impacto**: Si se importa un archivo JSON manipulado externamente, podrían inyectarse alimentos con fechas no ISO o propiedades corruptas en la despensa.
- **Recomendación**: Homogeneizar la validación aplicando `data.products.filter(isValidStoredProduct)` antes de persistir.

---

### 4. Estado Volátil en Memoria en Entornos Serverless
- **Severidad**: **Media**
- **Archivos Afectados**: `server/translate.ts` (líneas 8-9, 129), `api/translate.ts` (líneas 15-45).
- **Evidencia en el Código**:
  En `server/translate.ts`, tanto el límite de tasa (`ipRateLimits`) como la caché de traducción (`translationCache`) se almacenan en instancias de `Map` en la memoria del proceso de Node.js:
  ```typescript
  const ipRateLimits = new Map<string, RateLimitEntry>();
  const translationCache = new Map<string, { translatedText: string; expiresAt: number }>();
  ```
  En Vercel (`api/translate.ts`), las funciones serverless son efímeras y no comparten memoria entre invocaciones concurrentes o tras un inicio en frío (*cold start*). Además, `api/translate.ts` no invoca a `isRateLimited(ip)`.
- **Impacto**: En Vercel, la caché en memoria del servidor se pierde frecuentemente y el límite de 30 req/min por IP no se aplica de manera efectiva.
- **Recomendación**: En arquitecturas serverless de alta escala, delegar el control de tasa y la caché compartida en una base clave-valor externa como Upstash Redis o Vercel KV.

---

### 5. Escrituras a `localStorage` sin Protección de Cuota
- **Severidad**: **Media**
- **Archivos Afectados**: `client/src/lib/impactStats.ts` (línea 26), `client/src/lib/notificationRules.ts` (línea 53).
- **Evidencia en el Código**:
  Mientras que `storage.ts` (`saveJSON`) y `shelfLifeCatalog.ts` (`saveShelfLifeCorrection`) capturan `QuotaExceededError`, en `impactStats.ts` y `notificationRules.ts` se ejecuta `localStorage.setItem()` directamente sin `try/catch`:
  ```typescript
  // impactStats.ts:26
  export function saveImpactStats(stats: ImpactStats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  // notificationRules.ts:53
  export function saveNotificationPreferences(preferences: NotificationPreferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  }
  ```
- **Impacto**: Si la cuota de almacenamiento del navegador está llena, estas funciones lanzan una excepción no capturada de tipo `DOMException` que interrumpe el flujo de la aplicación.
- **Recomendación**: Enrutar todas las escrituras a través del helper seguro `saveJSON()` de `storage.ts`.

---

### 6. Concentración de Lógica en Archivos de Gran Tamaño
- **Severidad**: **Media**
- **Archivos Afectados**:
  - `client/src/pages/Home.tsx` (1.908 líneas).
  - `client/src/components/ScanModal.tsx` (881 líneas).
  - `client/src/components/home/RecipesSection.tsx` (663 líneas).
- **Evidencia en el Código**:
  `Home.tsx` concentra la inicialización de más de 15 estados de React, la definición inline de modales completos (`AddProductModal`), efectos de `IntersectionObserver`, lógica de PWA, filtros combinados y handlers de consumo. `ScanModal.tsx` mezcla manejo de WebRTC/cámara, procesamiento en canvas, Tesseract.js, llamadas a Open Food Facts y edición de tablas de resultados.
- **Impacto**: Incrementa la complejidad cognitiva para nuevos desarrolladores y dificulta la reutilización de subcomponentes.
- **Recomendación**: Extraer `AddProductModal` a su propio archivo en `components/`, desacoplar la lógica de cámara en un hook personalizado `useCameraStream()`, y mover la gestión de filtros del Home a un reductor o custom hook (`usePantryFilters`).

---

### 7. Cobertura Reducida en la Suite End-to-End
- **Severidad**: **Media**
- **Archivo Afectado**: `e2e/freshtrack.spec.ts` (230 líneas).
- **Evidencia en el Código**:
  La suite de Playwright contiene únicamente 4 pruebas: 1) flujo de receta traducida y consumo; 2) accesibilidad Axe en 3 modales; 3) scroll horizontal a 320/375px; 4) navegación móvil a 390px.
- **Impacto**: Carecen de cobertura E2E el flujo de escaneo OCR con tickets de ejemplo, la lectura de códigos de barras, la exportación y restauración de backups, la persistencia de cambios en la lista de compras y la conmutación al modo oscuro.
- **Recomendación**: Incorporar pruebas E2E adicionales que cubran el ciclo de compras y la exportación de planillas CSV.

---

### 8. Envío Inválido de Cabecera `User-Agent` en Fetch del Navegador
- **Severidad**: **Baja**
- **Archivo Afectado**: `client/src/lib/barcodeScanner.ts` (línea 135).
- **Evidencia en el Código**:
  ```typescript
  const res = await fetch(url, {
    headers: { "User-Agent": "FreshTrackApp/1.0 (https://freshtrack.app)" }
  });
  ```
- **Impacto**: Según la especificación oficial de la W3C/WHATWG para la Fetch API, `User-Agent` es un *forbidden header name* cuando la llamada se origina desde un navegador web. Los motores de renderizado descartan o bloquean silenciosamente este encabezado emitiendo una advertencia en la consola de depuración.
- **Recomendación**: Remover el header en el cliente o canalizar las peticiones a Open Food Facts a través de un proxy en el servidor Node.js si se requiere auditoría estricta de User-Agent.

---

### 9. Terminación de Líneas Mixta en el Repositorio (CRLF vs LF)
- **Severidad**: **Baja**
- **Archivos Afectados**: Todo el proyecto (26 archivos con terminación LF y 37 con CRLF).
- **Evidencia en el Código**:
  El archivo `.prettierrc` exige `"endOfLine": "lf"`, pero múltiples archivos TypeScript y JSON en `client/src` y `server` conservan retornos de carro Windows (`\r\n`).
- **Impacto**: Genera diffs ruidosos en sistemas de control de versiones Git al colaborar entre entornos mixtos (Windows y Linux/macOS).
- **Recomendación**: Ejecutar `pnpm format` o configurar un archivo `.gitattributes` en la raíz con `* text=auto eol=lf`.

---

### 10. Desactualización del Archivo `README.md`
- **Severidad**: **Baja**
- **Archivo Afectado**: `README.md`.
- **Evidencia en el Código**:
  El `README.md` raíz no documenta el directorio `client/src/data/` (que aloja las 131 recetas de `localRecipes.json`), omite la existencia del script `pnpm build:client` y no describe las funcionalidades de lista de compras inteligente, reportes con Recharts, respaldo/restauración ni lectura de códigos de barras.
- **Impacto**: Documentación desfasada para desarrolladores externos que se acercan al repositorio por primera vez.
- **Recomendación**: Actualizar el `README.md` principal vinculándolo a la carpeta `docs/`.

---

### 11. Artefactos de Compilación Comiteados en el Repositorio
- **Severidad**: **Baja**
- **Directorios Afectados**: `dist/`, `test-results/`.
- **Evidencia en el Código**:
  Tanto `dist/` como `test-results/` están declarados dentro de `.gitignore`, pero se encuentran físicamente presentes en el árbol del proyecto entregado.
- **Impacto**: Incrementa innecesariamente el peso del repositorio con binarios y reportes efímeros.
- **Recomendación**: Ejecutar `git rm -r --cached dist test-results` y limpiar el árbol de trabajo.

---

### 12. Textos en Idioma Inglés en `ErrorBoundary.tsx`
- **Severidad**: **Baja**
- **Archivo Afectado**: `client/src/components/ErrorBoundary.tsx` (líneas 34 y 51).
- **Evidencia en el Código**:
  El componente de contingencia exhibe títulos y botones en inglés:
  ```tsx
  <h2 className="text-xl mb-4">An unexpected error occurred.</h2>
  ...
  <button ...>Reload Page</button>
  ```
- **Impacto**: Ruptura de coherencia de localización en una aplicación íntegramente diseñada en español rioplatense.
- **Recomendación**: Traducir los textos a *"Ocurrió un error inesperado"* y *"Recargar la página"*.

---

### 13. Nombres Divergentes en Categorías de Código de Barras
- **Severidad**: **Baja**
- **Archivos Afectados**: `client/src/lib/barcodeScanner.ts` (líneas 54-82), `client/src/lib/categories.ts`.
- **Evidencia en el Código**:
  `barcodeScanner.ts` mapea etiquetas de Open Food Facts hacia cadenas como `"Carnes y fiambres"`, `"Frutas"`, `"Verduras"` y `"Panadería y pastas"`, mientras que la lista canónica en `categories.ts` define `"Carnes"`, `"Fiambres y embutidos"`, `"Frutas frescas"`, `"Verduras frescas"` y `"Panadería"`.
- **Impacto**: Si un producto escaneado ingresa con `"Carnes y fiambres"`, no coincide de forma exacta con los botones de filtrado estándar de `ALL_CATEGORIES` en la despensa, requiriendo normalizaciones adicionales.
- **Recomendación**: Alinear los retornos de `mapOpenFoodFactsCategory()` estrictamente con el tipo `ProductCategory`.

---

### 14. Imágenes Externas en Recetas de Fallback Locales
- **Severidad**: **Baja**
- **Archivo Afectado**: `client/src/lib/recipeApi.ts` (líneas 147-346).
- **Evidencia en el Código**:
  Las 12 preparaciones de respaldo en `fallbackRecipes` poseen URLs fijas hacia imágenes alojadas en TheMealDB (ej. `https://www.themealdb.com/images/media/meals/...`).
- **Impacto**: Si el usuario abre la aplicación completamente fuera de línea, esas imágenes remotas no se cargarán (aunque el sistema atenúa esto mediante `getRecipeFallbackImage()`, que genera un SVG alternativo).
- **Recomendación**: Reemplazar las URLs remotas por llamadas a `getRecipeFallbackImage()` en la inicialización estática.

---

### 15. Datos Locales sin Cifrar y sin Sincronización Multi-Dispositivo
- **Severidad**: **Informativa / Arquitectura**
- **Archivo Afectado**: `client/src/lib/storage.ts`.
- **Detalle Técnico**:
  La aplicación almacena el inventario en texto plano en `localStorage`. Esta decisión responde al principio de diseño de privacidad local y ausencia de base de datos centralizada, pero implica que no existe sincronización automática entre diferentes teléfonos o navegadores de un mismo hogar, dependiendo exclusivamente de las copias de seguridad manuales en JSON.

---

## Enlaces Relacionados
- [Arquitectura del Sistema](02-arquitectura.md)
- [Modelo de Datos y Almacenamiento](06-modelo-de-datos-y-almacenamiento.md)
- [Suite de Pruebas](11-testing.md)
- [Guía de Contribución](15-guia-de-contribucion.md)
