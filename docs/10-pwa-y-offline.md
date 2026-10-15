# PWA y Capacidades Fuera de Línea (Offline)

Este documento detalla la arquitectura de Progressive Web App (PWA) de FreshTrack, su manifiesto de aplicación web, las estrategias de almacenamiento en caché gestionadas por Workbox, los mecanismos de instalación y la matriz de disponibilidad funcional sin conexión a internet.

---

## 1. Manifiesto de Aplicación Web (`manifest.json`)

El archivo `client/public/manifest.json` configura la identidad visual y los parámetros de instalación de FreshTrack:

- **Nombre completo**: `"FreshTrack — Menos desperdicio, más tranquilidad"`
- **Nombre corto**: `"FreshTrack"`
- **Descripción**: `"Control inteligente de vencimientos para desperdiciar menos comida en tu hogar."`
- **URL de inicio**: `"/"`
- **Modo de visualización**: `"standalone"` (elimina la barra de navegación del navegador, comportándose como una aplicación nativa).
- **Orientación**: `"portrait"` (bloqueo preferente en vertical para uso ergonómico en smartphones).
- **Colores de interfaz**:
  - `background_color`: `"#f7f5ef"` (lienzo cálido orgánico).
  - `theme_color`: `"#17372b"` (verde esmeralda profundo botánico).

### Matriz de Iconos y Adaptabilidad
El manifiesto declara iconos preparados para distintas densidades de pantalla y formatos de recorte:
- `/icons/icon-192.png` ($192 \times 192$ px, propósito: `any`): Pantallas de inicio estándar en Android.
- `/icons/icon-512.png` ($512 \times 512$ px, propósito: `any`): Pantallas de bienvenida (*splash screens*) de alta resolución.
- `/icons/maskable-512.png` ($512 \times 512$ px, propósito: `maskable`): Diseñado con zona segura (*safe zone*) para recortes circulares o cuadrados adaptativos de Android moderno.
- `/icon.svg` (vectorial SVG, propósito: `any`): Icono escalable nítido para entornos de escritorio.

### Capturas de Pantalla para Tiendas Web
Incluye dos vistas para el diálogo enriquecido de instalación de navegadores Chromium:
- `/screenshots/screenshot-desktop.png` ($1280 \times 800$ px, `form_factor: "wide"`).
- `/screenshots/screenshot-mobile.png` ($390 \times 844$ px, `form_factor: "narrow"`).

---

## 2. Estrategias de Caché con Workbox (`vite.config.ts`)

VitePWA genera automáticamente el Service Worker (`sw.js`) utilizando `strategies: "generateSW"` con actualización inmediata (`registerType: "autoUpdate"`):

```typescript
VitePWA({
  registerType: "autoUpdate",
  strategies: "generateSW",
  includeAssets: ["icon.svg", "icons/*.png", "screenshots/*.png", "tesseract/*"],
  manifest: false, // Se utiliza el manifest.json estático de public/
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,wasm,gz,traineddata}"],
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [ /* Reglas de runtime */ ]
  }
})
```

> [!NOTE]
> El umbral `maximumFileSizeToCacheInBytes` se eleva a **6 MB** para permitir que los binarios compilados de WebAssembly de Tesseract y los diccionarios neuronales comprimidos (`spa.traineddata.gz`) queden precacheados sin ser rechazados por el límite por defecto de Workbox (2 MB).

### Rutas de Caché en Tiempo de Ejecución (Runtime Caching)

| Nombre de Caché | Patrón de URL / Recurso | Estrategia Workbox | TTL / Expiración | Justificación Técnica |
| :--- | :--- | :--- | :--- | :--- |
| `freshtrack-html-cache` | `request.mode === "navigate"` (Documentos HTML) | **`NetworkFirst`** | 7 días (timeout de red: 3 s, máx 10 entradas) | Intenta obtener la última versión de la aplicación; si no hay conexión o la red demora más de 3 segundos, responde con el HTML precacheado. |
| `freshtrack-static-assets` | Scripts JS, estilos CSS, fuentes web, workers y `/assets/` | **`CacheFirst`** | 30 días (máx 100 entradas) | Los archivos estáticos empaquetados por Vite poseen hashes inmutables en su nombre; responder desde caché garantiza arranque instantáneo. |
| `freshtrack-tesseract-offline` | Rutas bajo `/tesseract/` (`.wasm`, `.js`, `.traineddata`) | **`CacheFirst`** | 90 días (máx 20 entradas) | Permite que el motor OCR y el modelo en español permanezcan disponibles durante meses sin requerir descargas adicionales. |

---

## 3. Instalación de la PWA Multiplataforma (`InstallAppModal`)

FreshTrack provee un diálogo de instalación interactivo con estética de tienda oficial (App Store / Google Play Store) soportando **Android, iOS, Windows y Linux**:

1. **Detección Automática de Sistema Operativo**: Mediante `detectUserPlatform()` en `client/src/lib/pwaAndNotifications.ts`, se detecta si el usuario navega desde `android`, `ios`, `windows`, `linux` o `macos`, preseleccionando automáticamente la pestaña adecuada.
2. **Formato Adaptado para Dispositivos Móviles (Android & iOS)**:
   - **Superpoderes Móviles**: Muestra un bloque visual destacado con las ventajas de la experiencia celular (Cámara & OCR en vivo, 100% Offline para el súper, Notificaciones Push y Modo Pantalla Completa sin barras).
   - **Android (Google Play Experience)**: Disparo nativo de instalación en 1 toque mediante `promptPWAInstall()` cuando el navegador lo soporta, más una guía en 3 pasos para Google Chrome, Brave o Samsung Internet (`⋮` > "Instalar aplicación").
   - **iOS (Apple App Store Experience)**: Dado que Safari en iOS no dispara el evento `beforeinstallprompt`, la aplicación proporciona una guía visual específica con el botón Compartir (`⎋`), "Agregar a pantalla de inicio" (`[+]`) y confirmación "Agregar", explicando el funcionamiento como Web Clip a pantalla completa con gestos nativos de 120Hz y feedback háptico.
3. **Formato de Escritorio (Windows & Linux)**:
   - **Windows**: Instalación como app de ventana independiente sin pestañas del navegador, anclable a la barra de tareas y al Menú Inicio, con atajo desde el ícono `[⊕]` en la barra de direcciones de Edge o Chrome.
   - **Linux**: Integración mediante lanzador `.desktop` en entornos gráficos GNOME, KDE Plasma, XFCE y lanzadores rápidos (Rofi/Wofi), con consumo mínimo de memoria (< 50 MB de RAM).
4. **Compañero Móvil**: Incluye un botón para copiar el enlace directo (`navigator.clipboard.writeText`) para que usuarios navegando desde PC puedan enviarse rápidamente la app a su celular.
5. **Detección de Modo Instalado**: `isStandaloneMode()` evalúa `matchMedia("(display-mode: standalone)").matches`, `navigator.standalone` en iOS y referencias de WebView para confirmar si la app ya está corriendo como aplicación nativa.

---

## 4. Matriz de Disponibilidad: Online vs. Offline

| Funcionalidad | ¿Disponible sin conexión? | Comportamiento en Modo Fuera de Línea |
| :--- | :---: | :--- |
| **Control de Despensa y Vencimientos** | **Sí (100%)** | Todo el inventario, fechas, semáforos y cálculos viven en `localStorage`. |
| **Escaneo OCR de Tickets y Envases** | **Sí (100%)** | Tesseract.js corre localmente mediante WebAssembly con el modelo precacheado. |
| **Recetario "¿Qué puedo cocinar?"** | **Sí (100%)** | Evalúa las 131 recetas locales de `localRecipes.json` en memoria. |
| **Deducción de Inventario y Deshacer** | **Sí (100%)** | La matemática de unidades y los snapshots operan puramente en el cliente. |
| **Lista de Compras y Sugerencias** | **Sí (100%)** | Creación, edición, fusión de duplicados y migración funcionan en disco local. |
| **Reportes y Gráficos Recharts** | **Sí (100%)** | Se calculan a partir del historial local acumulado. |
| **Exportación JSON / CSV y Restauración** | **Sí (100%)** | Los archivos se generan al vuelo con `Blob` y Data URIs en el navegador. |
| **Lectura de Códigos de Barras** | **Parcial** | `BarcodeDetector` detecta los números sin red; sin embargo, resolver el nombre del producto en Open Food Facts requiere conexión. Si no hay red, el usuario escribe el nombre manualmente. |
| **Recetas "Aprovechar por vencer" (TheMealDB)** | **Parcial** | Si no hay conexión o TheMealDB falla, se conmuta automáticamente a las 12 recetas locales de respaldo (`fallbackRecipes`). |
| **Traducción Automática (DeepL)** | **No** | Requiere acceso al servidor `/api/translate`. Si no hay conexión, las recetas se muestran en idioma original o con su traducción ya guardada en caché. |

---

## Enlaces Relacionados
- [Arquitectura del Sistema](02-arquitectura.md)
- [Funcionalidad: Escaneo OCR](05-funcionalidades/escaneo-ocr-y-codigo-de-barras.md)
- [Funcionalidad: Recetas y Aprovechamiento](05-funcionalidades/recetas.md)
- [Despliegue y Hosting](12-despliegue.md)
