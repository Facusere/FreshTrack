# Estructura del Proyecto

Este documento describe la organización de directorios y archivos que componen el repositorio de FreshTrack, detallando la responsabilidad de cada módulo, los alias de importación configurados y los archivos de configuración del compilador, empaquetador y formateador.

---

## 1. Árbol de Directorios Comentado

A continuación se muestra el árbol de archivos del proyecto (excluyendo dependencias y artefactos de compilación efímeros):

```text
FreshTrack/
├── .env.example                 # Plantilla de variables de entorno (DEEPL_API_KEY)
├── .gitignore                   # Reglas de exclusión de Git (dependencias, dist, logs, etc.)
├── .prettierignore              # Archivos excluidos del formateo automático de Prettier
├── .prettierrc                  # Reglas de estilo de código (comillas dobles, 2 espacios, LF)
├── components.json              # Configuración de shadcn/ui (estilo new-york, alias y CSS)
├── package.json                 # Metadatos del proyecto, scripts, dependencias y engines
├── playwright.config.ts         # Configuración del ejecutor de pruebas E2E de Playwright
├── tsconfig.json                # Configuración principal de TypeScript (strict, paths, ESNext)
├── tsconfig.node.json           # Configuración de TypeScript específica para vite.config.ts
├── vercel.json                  # Reglas de ruteo SPA, encabezados PWA y build para Vercel
├── vite.config.ts               # Configuración de Vite 7, plugins (PWA, Tailwind, Translate)
│
├── api/
│   └── translate.ts             # Handler serverless para Vercel (POST /api/translate)
│
├── client/                      # Raíz del frontend PWA
│   ├── index.html               # Plantilla HTML base, meta tags PWA y enlace a Google Fonts
│   ├── public/                  # Activos estáticos servidos directamente en la raíz web
│   │   ├── icon.svg             # Isotipo vectorial de la aplicación (hoja FreshTrack)
│   │   ├── manifest.json        # Manifiesto de PWA (nombre, colores, iconos, capturas)
│   │   ├── icons/               # Iconos rasterizados de la PWA (192px, 512px, maskable)
│   │   ├── screenshots/         # Capturas de pantalla móvil y escritorio para el instalador PWA
│   │   └── tesseract/           # Binarios y modelos locales offline para OCR en español
│   │                            # (tesseract-core.wasm, worker.min.js, spa.traineddata.gz)
│   └── src/                     # Código fuente de la aplicación React
│       ├── App.tsx              # Componente raíz: ErrorBoundary, ThemeProvider, Toaster, Router
│       ├── main.tsx             # Punto de entrada JS: montaje DOM y registro de Service Worker
│       ├── index.css            # Estilos globales, directivas Tailwind v4 y tokens semánticos
│       │
│       ├── components/          # Componentes visuales y contenedores de la aplicación
│       │   ├── AddProductModal.tsx # Modal de alta manual y edición de alimentos
│       │   ├── BackupModal.tsx  # Modal de exportación (JSON/CSV) y restauración de inventario
│       │   ├── ConsumptionConfirmDialog.tsx # Diálogo de confirmación interactivo de deducciones
│       │   ├── ErrorBoundary.tsx # Captura de excepciones en tiempo de ejecución de React
│       │   ├── NotificationSettingsModal.tsx # Modal de configuración de alertas por categoría
│       │   ├── ProductDetailDialog.tsx # Diálogo de inspección y edición de producto
│       │   ├── ProductOpenConfirmDialog.tsx # Confirmación y recálculo de vida útil al abrir
│       │   ├── RecipeDetailModal.tsx # Diálogo de detalle de receta y deducción de despensa
│       │   ├── ScanModal.tsx    # Modal integral de escaneo (cámara, subida, OCR y códigos)
│       │   ├── ShoppingListModule.tsx # Módulo de lista de compras y sugerencias inteligentes
│       │   │
│       │   ├── home/            # Subsecciones modulares de la página principal (Home)
│       │   │   ├── HeroSection.tsx      # Cabecera interactiva con radar de prioridades y CTAs
│       │   │   ├── index.ts             # Barril de exportación de componentes del Home
│       │   │   ├── MobileBottomNav.tsx  # Barra de navegación inferior persistente para móviles
│       │   │   ├── PantrySection.tsx    # Inventario: lista/calendario, filtros, búsqueda y lotes
│       │   │   ├── ProductRow.tsx       # Fila individual de alimento con semáforo y acciones
│       │   │   ├── RecipesSection.tsx   # Recetario dual ("¿Qué puedo cocinar?" vs "Por vencer")
│       │   │   ├── ReportsSection.tsx   # Gráficos Recharts de desperdicio evitado y tendencias
│       │   │   ├── ShoppingSection.tsx  # Tarjeta de acceso rápido al módulo de compras
│       │   │   ├── StatsSection.tsx     # Indicadores rápidos de resumen (ok, soon, expired)
│       │   │   └── WeekCalendar.tsx     # Vista horizontal de vencimientos para los próximos 7 días
│       │   │
│       │   └── ui/              # Primitivas accesibles basadas en Radix UI (shadcn/ui)
│       │       ├── button.tsx   # Botón polimórfico con variantes y tamaños (CVA)
│       │       ├── card.tsx     # Contenedor de tarjeta visual con encabezado y cuerpo
│       │       ├── dialog.tsx   # Ventana modal accesible con foco atrapado y backdrop
│       │       ├── sonner.tsx   # Contenedor de notificaciones flotantes toast
│       │       └── tooltip.tsx  # Indicador emergente accesible ante hover o foco
│       │
│       ├── contexts/            # Contextos de React para estado compartido
│       │   └── ThemeContext.tsx # Proveedor de tema claro/oscuro con persistencia en localStorage
│       │
│       ├── data/                # Datos estáticos del dominio
│       │   └── localRecipes.json # Catálogo curado de 131 recetas locales con ingredientes
│       │
│       ├── hooks/               # Custom hooks de ciclo de vida y utilidades de hardware
│       │   └── useCameraStream.ts # Hook WebRTC para cámara de escaneo y cambio de facingMode
│       │
│       ├── lib/                 # Lógica de dominio, algoritmos, conversiones y almacenamiento
│       │   ├── backup.ts        # Generación de archivos JSON/CSV y validación de restauración
│       │   ├── barcodeScanner.ts # API nativa BarcodeDetector y cliente Open Food Facts
│       │   ├── categories.ts    # Las 15 categorías canónicas de productos alimenticios
│       │   ├── dateRecognition.ts # Expresiones regulares de fechas y clasificación contextual
│       │   ├── dates.ts         # Manipulación de fechas ISO, zonas horarias locales y formatos
│       │   ├── productHelpers.ts # Funciones auxiliares de cálculo, iconos y semillas demo
│       │   ├── feedback.ts      # Síntesis sonora con Web Audio API y vibración háptica
│       │   ├── impactStats.ts   # Métricas de ahorro (kg, pesos, platos) y constantes de impacto
│       │   ├── ingredientMatching.ts # Tokenización, normalización, sinónimos y descarte FEFO
│       │   ├── inventoryConsumption.ts # Planificación de consumos, deducción y reversión histórica
│       │   ├── localRecipesMatching.ts # Algoritmo de matching puro para localRecipes.json
│       │   ├── notificationRules.ts # Agrupación de alertas, reglas por categoría y resumen
│       │   ├── ocrScanner.ts    # Pipeline de preprocesamiento de imagen y Tesseract local
│       │   ├── pwaAndNotifications.ts # Registro de Service Worker, instalación PWA y avisos push
│       │   ├── quantity.ts      # Parser y conversor de unidades de masa, volumen y conteo
│       │   ├── recipeApi.ts     # Cliente TheMealDB, traducción DeepL y fallbacks locales
│       │   ├── reportsData.ts   # Construcción de series temporales para gráficos Recharts
│       │   ├── shelfLifeCatalog.ts # 66 productos FoodKeeper/ANMAT y mínimos conservadores
│       │   ├── shoppingList.ts  # Lista inteligente de compras y migración a despensa
│       │   ├── storage.ts       # Gestor central de localStorage, validación y migraciones
│       │   └── utils.ts         # Helper `cn()` (clsx + tailwind-merge)
│       │
│       ├── pages/               # Vistas principales de enrutamiento
│       │   ├── Home.tsx         # Página única principal con los 5 módulos integrados
│       │   └── NotFound.tsx     # Vista 404 de respaldo ante rutas desconocidas
│       │
│       ├── tests/               # Pruebas unitarias y de integración (Vitest)
│       │   ├── contrast.test.ts # Auditoría cromática WCAG 2.1 AA/AAA de tokens de diseño
│       │   ├── dateRecognition.test.ts # Reconocimiento y clasificación de fechas OCR
│       │   ├── dates.test.ts    # Lógica de fechas, diferencias en días y migraciones v2/v3
│       │   ├── inventoryConsumption.integration.test.ts # Prueba integral de ciclo de consumo
│       │   ├── inventoryConsumption.test.ts # Deducción, cálculo de remanentes y balances
│       │   ├── localRecipes.test.ts # Matching puro de recetas locales sin llamadas de red
│       │   ├── ocrScanner.test.ts # Parseo de líneas de tickets fiscales y cantidades
│       │   ├── openProduct.test.ts # Recálculo de vida útil al marcar envase como abierto
│       │   ├── recipeApi.test.ts # Integración de búsqueda online, caché y traducciones
│       │   ├── reportsData.test.ts # Agrupación mensual y detección de productos vencidos
│       │   ├── shelfLife.test.ts # Inferencia de vida útil y prioridad de ajustes de usuario
│       │   └── shoppingList.test.ts # Creación, fusión de duplicados y migración de compras
│       │
│       └── types/               # Tipos de datos e interfaces compartidas
│           └── product.ts       # StoredProduct, Product, ProductStatus y función deriveProduct
│
├── e2e/                         # Pruebas de integración en navegador real (Playwright)
│   └── freshtrack.spec.ts       # Escenarios E2E (flujo de receta, accesibilidad axe, mobile)
│
└── server/                      # Backend Node.js mínimo para producción
    ├── index.ts                 # Servidor Express 5 (archivos estáticos, headers PWA, proxy)
    └── translate.ts             # Controlador de llamadas a DeepL con rate limit y caché
```

---

## 2. Directorios y Archivos Excluidos de la Documentación

Existen carpetas y archivos en el repositorio que forman parte de la infraestructura de compilación o de paquetes binarios de terceros y no deben ser modificados directamente:

1. `node_modules/`: Dependencias externas instaladas por `pnpm`.
2. `pnpm-lock.yaml`: Árbol de resolución determinística de dependencias congeladas.
3. `dist/`: Directorio generado por `pnpm build`, que contiene el bundle estático para producción (`dist/public`) y el servidor empaquetado (`dist/index.js`).
4. `test-results/` y `playwright-report/`: Artefactos generados temporalmente al ejecutar pruebas E2E con Playwright.
5. `client/public/tesseract/`: Archivos binarios de WebAssembly (`.wasm`), código de glue (`.wasm.js`), trabajadores web (`worker.min.js`) y diccionarios neuronales comprimidos (`spa.traineddata.gz`) necesarios para que Tesseract.js reconozca texto en español de forma 100% desconectada sin hacer peticiones a servidores de terceros.

---

## 3. Configuración de Alias de Importación

Para simplificar las importaciones y evitar rutas relativas frágiles con múltiples `../../`, el proyecto define el alias `@/` que apunta directamente a `client/src`:

### Configuración en `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"]
    }
  }
}
```

### Configuración en `vite.config.ts`
```typescript
resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
  },
}
```

Esto permite importar cualquier componente, utilidad o tipo de forma limpia:
```typescript
import { Product, StoredProduct } from "@/types/product";
import { daysUntil } from "@/lib/dates";
import { Button } from "@/components/ui/button";
```

---

## 4. Configuraciones Base del Proyecto

### `tsconfig.json` y `tsconfig.node.json`
- Define TypeScript en modo estricto (`"strict": true`).
- Activa la detección rigurosa de código muerto y variables sin uso: `"noUnusedLocals": true` y `"noUnusedParameters": true`.
- Utiliza resolución de módulos moderna `"moduleResolution": "bundler"` y `"allowImportingTsExtensions": true`.
- Incluye `client/src/**/*`, `server/**/*` y `api/**/*`, excluyendo `node_modules`, `dist` y `build`.
- `tsconfig.node.json` aplica estas mismas reglas de comprobación de tipos a la configuración de `vite.config.ts`.

### `vite.config.ts`
- Integra el compilador de React (`@vitejs/plugin-react`) y el motor de estilos de Tailwind CSS v4 (`@tailwindcss/vite`).
- Registra `apiTranslatePlugin()`, un middleware de desarrollo que intercepta peticiones a `/api/translate` y las resuelve directamente contra `server/translate.ts` en caliente.
- Configura el plugin `VitePWA` para generar automáticamente el Service Worker mediante Workbox (`strategies: "generateSW"`, `registerType: "autoUpdate"`), precacheando todos los activos visuales y los binarios de Tesseract hasta 6 MB por archivo.
- Fija la raíz del cliente en `client/` y el directorio de salida en `dist/public`.

### `components.json`
Archivo de configuración para la biblioteca de componentes UI (formato shadcn/ui):
- **Estilo**: `new-york`
- **Color base**: `neutral`
- **Variables CSS**: `true`
- **Archivo CSS**: `client/src/index.css`
- **Alias**: Define los mapeos a `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils` y `@/hooks`.

### `vercel.json`
- Define la compilación para Vercel (`framework: "vite"`, `buildCommand: "vite build"`, `outputDirectory: "dist/public"`).
- Establece encabezados HTTP obligatorios para el Service Worker (`/sw.js` con `Service-Worker-Allowed: /` y `Cache-Control: no-cache, no-store, must-revalidate`).
- Aplica una regla de reescritura (*rewrite*) para que todas las rutas SPA que no comiencen con `/api/` sean redirigidas a `/index.html`.

### `.prettierrc`
Reglas de formateo estándar en todo el código fuente:
- Punto y coma obligatorio (`"semi": true`).
- Comillas dobles (`"singleQuote": false`).
- Ancho de línea máximo de 80 caracteres (`"printWidth": 80`).
- Indentación de 2 espacios (`"tabWidth": 2`).
- Final de línea Unix (`"endOfLine": "lf"`).

---

## Enlaces Relacionados
- [Visión General](01-vision-general.md)
- [Arquitectura del Sistema](02-arquitectura.md)
- [Instalación y Entorno](03-instalacion-y-entorno.md)
- [Referencia de Módulos lib/](07-referencia-de-modulos-lib.md)
- [Componentes de UI](08-componentes-ui.md)
