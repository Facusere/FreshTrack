# FreshTrack — Menos desperdicio, más tranquilidad

**FreshTrack** es una Progressive Web App (PWA) integral para el control inteligente de vencimientos de alimentos, reducción del desperdicio hogareño y planificación de compras y comidas.

Construida con **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tesseract.js** y **Service Workers**, FreshTrack funciona completamente en el cliente sin requerir servidores externos para el procesamiento de imágenes o datos personales.

---

## Características Principales

### 1. Escaneo OCR Real en el Navegador
- **Acceso directo a la cámara**: Uso de la API `navigator.mediaDevices.getUserMedia` para previsualizar video en vivo, cambiar entre cámara frontal y trasera, y congelar fotogramas con encuadre guiado.
- **Motor OCR 100% privado en el cliente**: Integración de `tesseract.js` para reconocimiento de texto en español (`spa`) con indicador de progreso en tiempo real.
- **Carga de fotos y archivos**: Soporte para arrastrar o cargar imágenes (`.jpg`, `.jpeg`, `.png`, `.webp`) desde la galería o almacenamiento del dispositivo.
- **Tickets de prueba integrados**: Ejemplos precargados (supermercados COTO, etiquetas de vencimiento/elaboración, verdulería/carnicería) para pruebas instantáneas en computadoras sin cámara.
- **Extracción inteligente de productos y fechas**:
  - Detección de fechas candidatas con clasificación contextual (`vencimiento`, `elaboración`, `consumo preferente`).
  - Identificación de alimentos y cantidades contra el catálogo regional de 300 productos.
  - Estimación automática de vida útil cuando el ticket no imprime fechas por producto.
  - Tabla de resultados editable para ajustar nombres, cantidades, categorías y fechas antes de ingresar a la despensa.

### 2. PWA (Progressive Web App) y Notificaciones Push
- **Instalable en celulares y computadoras**: Configuración con [`client/public/manifest.json`](file:///c:/Users/Facundo/Downloads/FreshTrack/client/public/manifest.json), iconos adaptables (`icon.svg`) y soporte `standalone`.
- **Botón de instalación directa**: Detección del evento `beforeinstallprompt` con acceso visible en cabecera y barra lateral.
- **Service Worker (`sw.js`)**: Caché estático y dinámico para funcionamiento sin conexión, gestión de eventos de red y control del ciclo de vida de la aplicación.
- **Alertas automáticas de vencimiento**:
  - Detección automática al abrir la aplicación de alimentos que vencen en **1 o 2 días** (o en la fecha actual).
  - Emisión de notificaciones web y push mediante la Notification API y Service Worker.
  - Botón de prueba inmediata de alertas y gestión interactiva de permisos del navegador.
  - Reglas de agrupación por día y anticipación configurable por categoría (1, 3 o 7 días).

### 3. Lista de Compras Inteligente y Reposición Automática
- **Sugerencias basadas en el consumo real**: Analiza el historial de recetas preparadas (`consumptionHistory`) para recomendar la reposición de ingredientes consumidos con frecuencia que ya no están en la despensa.
- **Detección de stock bajo y vencidos**: Sugiere reponer automáticamente productos con una sola unidad, etiqueta "queda poco" o que se encuentran vencidos.
- **Gestión interactiva**: Formulario rápido para añadir productos manuales, selector de categorías y filtros por pendientes y comprados.
- **Migración a la despensa en un clic**: El botón *"Mover comprados a despensa"* traslada todos los ítems marcados al inventario calculando automáticamente su vida útil y fecha de vencimiento según la categoría.

### 4. Filtros Avanzados y Ordenamiento en Despensa
- **Ordenamiento multidimensional (`sortBy`)**:
  - *Vencimiento más próximo* (predeterminado).
  - *Vencimiento más lejano*.
  - *Nombre (A → Z)*.
  - *Nombre (Z → A)*.
  - *Categoría*.
- **Filtro por Categoría (`categoryFilter`)**: Selector desplegable con las 15 categorías del catálogo (*Lácteos*, *Carnes*, *Verduras frescas*, etc.) combinable con la búsqueda por texto y los filtros por estado (*Todos*, *Por vencer*, *Vencidos*).
- **Restablecimiento rápido**: Botón para reiniciar filtros y volver al orden original con un clic.
- **Vista de Calendario semanal**: Visualización horizontal de los productos distribuidos por día de vencimiento para la próxima semana.

### 5. Sugerencias de Recetas y Descuento de Ingredientes
- **Aprovechamiento con TheMealDB**: Búsqueda dinámica de recetas en base a los ingredientes más urgentes de la despensa.
- **12 Recetas locales de respaldo**: Fallbacks completos en español con lista de ingredientes, medidas y preparación paso a paso.
- **Descuento inteligente del inventario**: Reduce cantidades fraccionarias o enteras y elimina ítems agotados al pulsar *"Aproveché"*.
- **Historial con reversión**: Permite deshacer consumos específicos restaurando exactamente el inventario y métricas previas.
- **Panel de impacto mensual**: Registro de kilogramos de comida salvada, dinero recuperado y comidas aprovechadas.

---

## Estructura del Proyecto

```text
FreshTrack/
├── client/
│   ├── index.html                     # Entrada HTML con manifiesto PWA e iconos
│   ├── public/
│   │   ├── manifest.json              # Manifiesto PWA (nombre, colores, modo standalone)
│   │   ├── sw.js                      # Service Worker (caché offline y notificaciones push)
│   │   └── icon.svg                   # Icono vectorial de la app (any maskable)
│   └── src/
│       ├── components/
│       │   ├── ScanModal.tsx          # Modal de escaneo OCR con cámara MediaDevices y carga
│       │   └── ShoppingListModule.tsx # Módulo de lista de compras y reposición inteligente
│       ├── lib/
│       │   ├── ocrScanner.ts          # Motor OCR con Tesseract.js y parsing de tickets
│       │   ├── pwaAndNotifications.ts # Registro de Service Worker, PWA y alertas de vencimiento
│       │   ├── shoppingList.ts        # Algoritmos de sugerencias y migración a inventario
│       │   ├── dateRecognition.ts     # Clasificación contextual de fechas y aprendizaje
│       │   ├── shelfLifeCatalog.ts    # Catálogo de 300 alimentos en 15 categorías
│       │   ├── notificationRules.ts   # Reglas de agrupación y digest semanal
│       │   ├── recipeApi.ts           # Integración TheMealDB y 12 recetas de respaldo
│       │   ├── inventoryConsumption.ts# Algoritmo de deducción de ingredientes
│       │   └── impactStats.ts         # Estadísticas de ahorro y comida rescatada
│       ├── pages/
│       │   └── Home.tsx               # Dashboard principal, estado reactivo y vistas
│       ├── tests/
│       │   ├── ocrScanner.test.ts
│       │   ├── shoppingList.test.ts
│       │   ├── dateRecognition.test.ts
│       │   └── inventoryConsumption.integration.test.ts
│       ├── index.css                  # Variables de diseño y estilos globales
│       └── main.tsx                   # Punto de montaje e inicialización de PWA
├── e2e/
│   └── freshtrack.spec.ts             # Pruebas End-to-End con Playwright
├── package.json
└── README.md
```

---

## Persistencia Local (`localStorage`)

FreshTrack guarda el estado de forma local y privada en el navegador:

| Clave | Descripción |
| :--- | :--- |
| `freshtrack-products-v2` | Inventario actual de alimentos en la despensa |
| `freshtrack-shopping-list-v1` | Lista de compras con ítems pendientes y completados |
| `freshtrack-consumption-history-v1` | Historial de recetas consumidas para cálculo de reposición |
| `freshtrack-last-notification-date` | Control de emisión diaria de alertas para evitar avisos repetidos |
| `freshtrack-notification-preferences-v1` | Configuración de alertas agrupadas y anticipación |
| `freshtrack-date-learning-v1` | Correcciones aprendidas para clasificación de fechas |
| `freshtrack-shelf-life-suggestions-v1` | Sugerencias comunitarias de vida útil |
| `freshtrack-impact-stats-v1` | Métricas de impacto acumulado del mes |

---

## Instalación y Desarrollo Local

### Requisitos
- **Node.js**: v18 o superior
- **pnpm**: v9 o v10

### Pasos

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Iniciar servidor de desarrollo**:
   ```bash
   pnpm dev
   ```
   La aplicación se abrirá por defecto en `http://localhost:3000`.

3. **Verificar tipado TypeScript**:
   ```bash
   pnpm check
   ```

4. **Ejecutar pruebas unitarias e integradas (Vitest)**:
   ```bash
   pnpm test
   ```
   *Ejecuta 17 tests unitarios cubriendo reconocimiento de fechas, deducción de inventario, sugerencias de compras y parsing OCR.*

5. **Compilar para producción**:
   ```bash
   pnpm build
   ```

6. **Ejecutar pruebas End-to-End (Playwright)**:
   ```bash
   pnpm test:e2e
   ```

---

## Criterios de Diseño y Accesibilidad

- **Paleta visual**: Tonos inspirados en la naturaleza (`#17372b` verde bosque profundo, `#d9e982` lima suave, `#fffdf9` crema cálido) para transmitir orden y calma.
- **Feedback interactivo**: Confirmaciones táctiles con toasts de Sonner en cada acción (escaneo, compras, correcciones).
- **Diseño responsive**: Barra lateral colapsable en menú inferior para celulares y tablets, optimizado para gestos táctiles.
- **Respaldo offline**: Gracias al Service Worker y al almacenamiento local, las funciones principales continúan operativas sin conexión a Internet.
