# Limitaciones y Deuda Técnica

Este documento registra de forma rigurosa y verificada en el código fuente las limitaciones arquitectónicas, inconsistencias de implementación y deudas técnicas identificadas en FreshTrack. Cada ítem incluye su nivel de severidad asignado, los archivos afectados, la evidencia en el código y la recomendación técnica para su resolución futura.

---

## 1. Resumen de Severidad y Estado de Hallazgos

| # | Hallazgo Técnico | Severidad | Estado | Componente / Archivo Afectado |
| :---: | :--- | :---: | :---: | :--- |
| 1 | Inconsistencia en la clave de persistencia del tema visual | **Media** | **Resuelto** | `client/src/contexts/ThemeContext.tsx`, `client/src/lib/backup.ts` |
| 2 | Copia de seguridad incompleta (omisión de estadísticas y reglas) | **Media** | **Resuelto** | `client/src/lib/backup.ts` |
| 3 | Restauración de respaldo sin validación profunda de esquema | **Media** | **Resuelto** | `client/src/lib/backup.ts`, `client/src/lib/storage.ts` |
| 4 | Estado volátil en memoria del proxy de traducción en serverless | **Media** | Pendiente | `server/translate.ts`, `api/translate.ts` |
| 5 | Escrituras a `localStorage` sin captura de cuota excedida | **Media** | **Resuelto** | `client/src/lib/impactStats.ts`, `client/src/lib/notificationRules.ts`, `client/src/lib/shoppingList.ts` |
| 6 | Concentración excesiva de lógica en componentes monolíticos | **Media** | **Resuelto** | `client/src/pages/Home.tsx`, `client/src/components/ScanModal.tsx`, `client/src/hooks/useCameraStream.ts` |
| 7 | Cobertura reducida en la suite de pruebas End-to-End | **Media** | Pendiente | `e2e/freshtrack.spec.ts` |
| 8 | Envío inválido de cabecera `User-Agent` en fetch del navegador | **Baja** | **Resuelto** | `client/src/lib/barcodeScanner.ts` |
| 9 | Terminación de líneas mixta en el repositorio (CRLF vs LF) | **Baja** | Pendiente | Todo el repositorio (`.prettierrc`) |
| 10 | Desactualización funcional del archivo `README.md` | **Baja** | **Resuelto** | `README.md` |
| 11 | Presencia de artefactos de compilación comiteados | **Baja** | Pendiente | `dist/`, `test-results/` |
| 12 | Textos en idioma inglés en la pantalla de error de contingencia | **Baja** | **Resuelto** | `client/src/components/ErrorBoundary.tsx` |
| 13 | Nombres divergentes en categorías de código de barras | **Baja** | **Resuelto** | `client/src/lib/barcodeScanner.ts`, `client/src/lib/categories.ts` |
| 14 | Imágenes externas en recetas de fallback locales | **Baja** | Mitigado | `client/src/lib/recipeApi.ts` |
| 15 | Datos locales sin cifrar y sin sincronización multi-dispositivo | **Informativa** | Por diseño | `client/src/lib/storage.ts` |

---

## 2. Detalle de Hallazgos Verificados

### 1. Inconsistencia en la Clave del Tema Visual
- **Severidad**: **Media**
- **Estado**: **RESUELTO**
- **Archivos Afectados**: `client/src/contexts/ThemeContext.tsx`, `client/src/lib/backup.ts`.
- **Resolución**: `ThemeContext.tsx` se unificó bajo la clave `"freshtrack-theme"` manteniendo compatibilidad bidireccional segura con `"theme"`. `backup.ts` exporta e importa coherentemente ambas claves y actualiza en tiempo de ejecución las clases del DOM (`classList.toggle("dark")`).

---

### 2. Copia de Seguridad Parcial (Omisión de Estadísticas y Reglas de Aprendizaje)
- **Severidad**: **Media**
- **Estado**: **RESUELTO**
- **Archivo Afectado**: `client/src/lib/backup.ts`.
- **Resolución**: Se extendió la interfaz `FreshTrackBackup` para empaquetar de forma integral: `impactStats`, `notificationPreferences`, `dateLearningRules`, `shelfLifeCorrections`, `expiredHistory`, `monthlyImpactHistory` y `theme`. En `restoreBackupJSON()`, todas estas entidades son deserializadas y persistidas mediante `saveJSON()`, refrescando los estados activos en `Home.tsx`.

---

### 3. Restauración de Respaldo: Validación de Productos vs Nuevos Módulos
- **Severidad**: **Media**
- **Estado**: **RESUELTO**
- **Archivo Afectado**: `client/src/lib/backup.ts`, `client/src/lib/storage.ts`.
- **Resolución**: `restoreBackupJSON()` ahora aplica `data.products.filter(isValidStoredProduct)`, validando formato ISO, existencia real de la fecha en el calendario y campos mínimos requeridos. Si se detectan productos malformados, se filtran e informa al usuario la cantidad exacta de elementos recuperados y descartados.

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
- **Estado**: **RESUELTO**
- **Archivos Afectados**: `client/src/lib/impactStats.ts`, `client/src/lib/notificationRules.ts`, `client/src/lib/shoppingList.ts`, `client/src/lib/dateRecognition.ts`, `client/src/lib/shelfLifeCatalog.ts`.
- **Resolución**: Todos los módulos de persistencia fueron migrados a `loadJSON` y `saveJSON` de `storage.ts`, los cuales capturan de forma segura `QuotaExceededError` y fallos de parseo sin interrumpir el flujo del usuario.

---

### 6. Concentración de Lógica en Archivos de Gran Tamaño
- **Severidad**: **Media**
- **Estado**: **RESUELTO**
- **Archivos Afectados**: `client/src/pages/Home.tsx`, `client/src/components/ScanModal.tsx`, `client/src/hooks/useCameraStream.ts`, `client/src/lib/productHelpers.ts`.
- **Resolución**:
  - `Home.tsx`: Se redujo de 1.908 a 1.120 líneas (~42% de reducción) mediante la extracción de 5 diálogos y modales independientes (`AddProductModal`, `NotificationSettingsModal`, `ProductDetailDialog`, `ProductOpenConfirmDialog`, `RecipeDetailModal`) y las funciones de inferencia/semillas a `productHelpers.ts`.
  - `ScanModal.tsx`: Se desacopló toda la administración de WebRTC, tracks de video y alternancia de cámara frontal/trasera en el hook reutilizable `useCameraStream`.

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
- **Estado**: **RESUELTO**
- **Archivo Afectado**: `client/src/lib/barcodeScanner.ts`.
- **Resolución**: Se eliminó la cabecera prohibida `User-Agent` en la llamada `fetch()` del navegador a la API de Open Food Facts, evitando advertencias y bloqueos en motores modernos de renderizado.

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
- **Estado**: **RESUELTO**
- **Archivo Afectado**: `README.md`.
- **Resolución**: Se actualizó por completo el `README.md` de la raíz documentando las 131 recetas offline en `data/localRecipes.json`, el hook `useCameraStream`, el script `build:client`, la lista de compras inteligente, el planificador semanal, los reportes con Recharts y los enlaces a la carpeta `docs/`.

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
- **Estado**: **RESUELTO**
- **Archivo Afectado**: `client/src/components/ErrorBoundary.tsx`.
- **Resolución**: Se tradujo la pantalla de contingencia íntegramente al español rioplatense (*"Ocurrió un error inesperado"*, *"Recargar la aplicación"*), aplicando tokens semánticos de diseño (`bg-surface`, `text-content`, `border-line`) y un panel colapsable para la traza técnica de depuración.

---

### 13. Nombres Divergentes en Categorías de Código de Barras
- **Severidad**: **Baja**
- **Estado**: **RESUELTO**
- **Archivos Afectados**: `client/src/lib/barcodeScanner.ts`, `client/src/lib/categories.ts`.
- **Resolución**: Se alinearon los mapeos de `mapOpenFoodFactsCategory()` para devolver exclusivamente categorías pertenecientes al arreglo canónico `ALL_CATEGORIES` (`"Carnes"`, `"Fiambres y embutidos"`, `"Frutas frescas"`, `"Verduras frescas"`, `"Panadería"`).

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
