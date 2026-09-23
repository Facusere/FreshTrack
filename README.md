# FreshTrack — Menos desperdicio, más tranquilidad

**FreshTrack** es una Progressive Web App (PWA) integral para el control inteligente de vencimientos de alimentos, reducción del desperdicio hogareño y planificación de compras y comidas.

Construida con **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Recharts**, **Tesseract.js** y **Workbox (vite-plugin-pwa)**, FreshTrack funciona 100% en el cliente sin requerir servidores externos para el procesamiento de imágenes o datos personales.

---

## Características Principales

### 1. Escaneo OCR Real en el Navegador (100% Privado y Offline)
- **Procesamiento 100% local y privado**: El motor Tesseract OCR corre íntegramente en tu navegador mediante WebAssembly (`wasm`) y Web Workers locales. Ni tus fotos, ni tus tickets, ni tus datos de compras se envían jamás a ningún servidor externo.
- **Activos locales precacheados**: Los archivos de Tesseract (`worker.min.js`, `tesseract-core.wasm`, `spa.traineddata.gz`, etc.) residen localmente en `/tesseract/` y son precacheados por el Service Worker de Workbox, permitiendo escanear tickets incluso sin conexión a Internet (modo avión).
- **Preprocesamiento en Canvas 2D**: Normalización de imágenes antes del OCR con escala de grises y estiramiento de contraste dinámico basado en percentiles para mejorar la legibilidad de tickets térmicos con baja tinta o sombras.
- **Acceso directo a la cámara**: Uso de `navigator.mediaDevices.getUserMedia` para previsualizar video en vivo, alternar entre cámara frontal y trasera, y capturar fotogramas con encuadre guiado.
- **Tickets de prueba integrados**: Ejemplos precargados (supermercados COTO, etiquetas de vencimiento/elaboración, verdulería/carnicería) para pruebas instantáneas en computadoras sin cámara.
- **Extracción inteligente de productos y fechas**:
  - Detección de fechas candidatas con clasificación contextual (`vencimiento`, `elaboración`, `consumo preferente`).
  - Identificación de alimentos y cantidades contra el catálogo regional de 300 productos.
  - Estimación automática de vida útil basada en producto específico (USDA FoodKeeper / ANMAT) y caídas conservadoras por categoría cuando el ticket no imprime fechas.
  - Tabla de resultados editable para ajustar nombres, cantidades, categorías y fechas antes de ingresar a la despensa.

### 2. PWA (Progressive Web App) y Experiencia Móvil First
- **Instalable en celulares y computadoras**: Configuración con `client/public/manifest.json`, iconos adaptables (`icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`), capturas de pantalla móviles y de escritorio, y soporte `standalone`.
- **Barra de navegación móvil fija (`MobileBottomNav`)**: Diseñada con enfoque mobile-first para pulgares, visible en pantallas menores a 768px:
  - Destinos rápidos con iconos táctiles (`min-h-[44px]`): **Resumen**, **Despensa** (con badge de cantidad), **Compras** (con badge de pendientes).
  - Botón central destacado de **Escanear** con elevación y halo de color para abrir la cámara con un solo toque.
  - Sincronización automática de sección activa mediante `IntersectionObserver` al desplazarse verticalmente.
  - Espaciado de seguridad inferior (`safe-area-inset-bottom`) y padding inferior (`pb-24`) en el contenedor principal para evitar solapamientos.
- **Service Worker con Workbox (`vite-plugin-pwa`)**: Precaché completo de la aplicación y recursos OCR, estrategia `NetworkFirst` para navegación HTML y `CacheFirst` para activos estáticos.
- **Alertas automáticas de vencimiento**:
  - Detección automática al abrir la aplicación de alimentos que vencen en **1 o 2 días** (o en la fecha actual).
  - Emisión de notificaciones web mediante la Notification API y Service Worker.
  - Reglas de agrupación por día y anticipación configurable por categoría (1, 3 o 7 días).

### 3. Catálogo de Vida Útil Específica y Ajustes del Usuario
- **Estimaciones por producto real**: Basadas en guías oficiales de conservación (USDA FoodKeeper y normativas de ANMAT) diferenciando vida útil en estado **cerrado** y **abierto**.
- **Caída conservadora por categoría**: Si el producto no figura en el catálogo de productos conocidos, se aplica el valor mínimo seguro de su categoría con advertencia explícita (*"Estimado por categoría, verificá la fecha del envase"*).
- **Memoria de ajustes del usuario**: Si corregís manualmente la duración de un producto al ingresarlo, FreshTrack recuerda tu preferencia (`freshtrack-shelf-corrections-v1`) y la aplica automáticamente en futuras detecciones con la insignia *"Con tu ajuste anterior"*.

### 4. Reportes y Estadísticas de Impacto (Recharts)
- **Desperdicio evitado por mes (Gráfico de barras)**: Visualización histórica y proyectada de kilogramos de alimentos rescatados y dinero recuperado ($ ARS), con doble eje Y independiente y leyendas interactivas.
- **Categorías con más vencimientos (Gráfico de dona)**: Identificación de las categorías donde se concentra el desperdicio para optimizar las decisiones de compra futuras.
- **Top 5 productos que más se vencen**: Ranking con insignias de frecuencia para prevenir pérdidas reiteradas de alimentos.
- **Paleta visual integrada**: Gráficos estilizados con las variables CSS del sistema de diseño (`var(--brand)`, `var(--status-expired-dot)`, `var(--status-soon-dot)`, `var(--chart-1)`, etc.), garantizando contraste accesible y coherencia estética.
- **Estado vacío amigable**: Mensaje tranquilizador cuando aún no hay suficientes datos registrados (*"Todavía no hay suficientes datos, volvé en unas semanas."*).

### 5. Lista de Compras Inteligente y Reposición Automática
- **Sugerencias basadas en el consumo real**: Analiza el historial de recetas preparadas (`consumptionHistory`) para recomendar la reposición de ingredientes consumidos con frecuencia que ya no están en la despensa.
- **Detección de stock bajo y vencidos**: Sugiere reponer automáticamente productos con una sola unidad, etiqueta "queda poco" o que se encuentran vencidos.
- **Migración a la despensa en un clic**: El botón *"Mover comprados a despensa"* traslada todos los ítems marcados al inventario calculando automáticamente su vida útil y fecha de vencimiento según el catálogo.

### 6. Sugerencias de Recetas y Descuento de Ingredientes
- **Aprovechamiento con TheMealDB y traducción DeepL**: Búsqueda dinámica de recetas en base a los ingredientes más urgentes de la despensa.
- **Recetas locales de respaldo**: Fallbacks completos en español rioplatense con lista de ingredientes, medidas y preparación paso a paso.
- **Descuento inteligente del inventario**: Reduce cantidades fraccionarias o enteras y elimina ítems agotados al pulsar *"Aproveché"*.
- **Historial con reversión**: Permite deshacer consumos específicos restaurando exactamente el inventario y métricas previas.

---

## Estructura del Proyecto

```text
FreshTrack/
├── client/
│   ├── index.html                     # Entrada HTML con manifiesto PWA e iconos adaptables
│   ├── public/
│   │   ├── icons/                     # Iconos PNG (192, 512, maskable, apple-touch-icon)
│   │   ├── screenshots/               # Capturas para instalación de PWA en desktop y mobile
│   │   ├── tesseract/                 # Activos offline (workers, wasm y spa.traineddata)
│   │   ├── manifest.json              # Manifiesto PWA (nombre, colores, modo standalone)
│   │   └── icon.svg                   # Icono vectorial de la app
│   └── src/
│       ├── components/
│       │   ├── home/                  # Componentes descompuestos del dashboard
│       │   │   ├── HeroSection.tsx    # Banner principal y tarjeta interactiva de escaneo
│       │   │   ├── StatsSection.tsx   # Tarjetas métricas de estado rápido
│       │   │   ├── PantrySection.tsx  # Listado y calendario semanal con filtros
│       │   │   ├── ProductRow.tsx     # Fila accesible de producto con estado visual
│       │   │   ├── WeekCalendar.tsx   # Calendario horizontal de 7 días
│       │   │   ├── ShoppingSection.tsx# Módulo de lista de compras inteligente
│       │   │   ├── RecipesSection.tsx # Recetas y recorrida sugerida
│       │   │   ├── ReportsSection.tsx # Gráficos Recharts (barras, dona y top 5)
│       │   │   └── MobileBottomNav.tsx# Barra de navegación inferior mobile-first
│       │   ├── ScanModal.tsx          # Modal de escaneo OCR con cámara MediaDevices y carga
│       │   ├── ShoppingListModule.tsx # Módulo de compras y reposición inteligente
│       │   └── ConsumptionConfirmDialog.tsx # Diálogo de confirmación de descuento
│       ├── lib/
│       │   ├── ocrScanner.ts          # Motor OCR local con Tesseract.js y preprocesamiento Canvas
│       │   ├── reportsData.ts         # Cálculos de desperdicio mensual, categorías y top vencidos
│       │   ├── shelfLifeCatalog.ts    # Catálogo de vida útil por producto y fallbacks seguros
│       │   ├── pwaAndNotifications.ts # Registro PWA con Workbox y alertas de vencimiento
│       │   ├── shoppingList.ts        # Algoritmos de sugerencias y migración a despensa
│       │   ├── dateRecognition.ts     # Clasificación contextual de fechas y aprendizaje
│       │   ├── recipeApi.ts           # Integración TheMealDB, traducción y recetas locales
│       │   ├── inventoryConsumption.ts# Algoritmo de deducción y reversión de inventario
│       │   └── impactStats.ts         # Métricas de ahorro y comida rescatada
│       ├── pages/
│       │   └── Home.tsx               # Contenedor principal de la aplicación
│       └── tests/                     # Suite de pruebas unitarias (Vitest)
├── e2e/
│   └── freshtrack.spec.ts             # Pruebas End-to-End con Playwright
├── server/
│   ├── index.ts                       # Servidor Express para producción y API de traducción
│   └── translate.ts                   # Servicio de traducción con caché y soporte DeepL
├── vite.config.ts                     # Configuración de Vite y vite-plugin-pwa
├── package.json
└── README.md
```

---

## Persistencia Local (`localStorage`)

FreshTrack guarda el estado de forma local y privada en el navegador:

| Clave | Descripción |
| :--- | :--- |
| `freshtrack-products-v3` | Inventario actual de alimentos en la despensa |
| `freshtrack-shopping-list-v1` | Lista de compras con ítems pendientes y completados |
| `freshtrack-consumption-history-v3` | Historial de recetas consumidas para cálculo de reposición |
| `freshtrack-shelf-corrections-v1` | Memoria de ajustes personalizados de vida útil del usuario |
| `freshtrack-expired-history-v1` | Registro histórico de productos descartados o vencidos |
| `freshtrack-impact-stats-v1` | Métricas de impacto acumulado del mes |
| `freshtrack-date-learning-v1` | Correcciones aprendidas para clasificación contextual de fechas |
| `freshtrack-notification-preferences-v1` | Preferencias de avisos y anticipación configurable |
| `freshtrack-last-scan-v1` | Metadatos del último escaneo realizado |

---

## Variables de Entorno

Creá un archivo `.env` en la raíz del proyecto para configurar opciones opcionales del servidor:

```env
# Puerto del servidor (por defecto 3000)
PORT=3000

# Clave de API de DeepL para traducción en tiempo real de TheMealDB (Opcional)
# Si no se configura, el servidor utiliza traducciones cacheadas y fallbacks locales en español.
DEEPL_API_KEY=tu_api_key_de_deepl_aqui

# URL base para pruebas E2E con Playwright (por defecto http://127.0.0.1:3000)
FRESHTRACK_URL=http://127.0.0.1:3000
```

---

## Instalación y Desarrollo Local

### Requisitos
- **Node.js**: **20.19+** o **22.12+**
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

3. **Verificar tipado TypeScript sin emitir código**:
   ```bash
   pnpm check
   ```

4. **Ejecutar pruebas unitarias (Vitest)**:
   ```bash
   pnpm test
   ```
   *Ejecuta 115 tests unitarios cubriendo reconocimiento de fechas, deducción de inventario, sugerencias de compras, reportes y motor OCR offline.*

5. **Compilar para producción (Bundle optimizado + PWA precache)**:
   ```bash
   pnpm build
   ```

6. **Ejecutar servidor compilado de producción**:
   ```bash
   pnpm start
   ```

7. **Ejecutar pruebas End-to-End y accesibilidad (Playwright)**:
   ```bash
   pnpm test:e2e
   ```

---

## Despliegue en Vercel

FreshTrack está 100% optimizado para desplegarse en **Vercel** como una Progressive Web App (PWA) de alto rendimiento.

El archivo `vercel.json` incluido en el repositorio gestiona las cabeceras PWA, caché y redirecciones automáticas de SPA:
- **Output Directory**: `dist/public`
- **Build Command**: `vite build`
- **SPA Rewrites**: Redirige todas las rutas a `/index.html`.
- **PWA Headers**: Cabeceras `Service-Worker-Allowed: /` y `Cache-Control: no-cache` para el Service Worker.

---

## Criterios de Diseño y Accesibilidad

- **Copia rioplatense (voseo)**: Todo el texto y mensajes de la interfaz están redactados en español argentino natural (*"Tenés productos que requieren consumo pronto"*, *"Escaneá tu primer ticket"*, *"Aproveché"*).
- **Paleta visual accesible**: Tonos calibrados inspirados en la naturaleza (`#17372b` verde bosque profundo, `#d9e982` lima suave, `#fffdf9` crema cálido) con relaciones de contraste conformes a WCAG AA.
- **Navegación mobile-first**: Barra inferior fija adaptada a pantallas táctiles con objetivos de contacto mínimos de 44x44px.
- **Respaldo offline integral**: Gracias al Service Worker y a los modelos de Tesseract empaquetados localmente, la captura OCR, la despensa y las compras continúan plenamente operativas sin conexión a Internet.
