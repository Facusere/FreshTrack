# FreshTrack

FreshTrack es una Progressive Web App (PWA) de alto rendimiento para el control inteligente de vencimientos de alimentos, reducción del desperdicio hogareño y planificación ágil de compras y recetas. Funciona con enfoque *offline-first*, permitiendo escanear tickets y etiquetas de vencimiento con OCR local en el navegador, identificar códigos de barras con Open Food Facts, gestionar el inventario con reglas FEFO y monitorear estadísticas de impacto económico y ecológico.

---

## Características Principales

- **Digitalización Inteligente**:
  - **Escaneo OCR Offline**: Reconocimiento de tickets de compra y etiquetas de vencimiento en el navegador mediante Tesseract.js (WebAssembly) sin enviar imágenes a servidores externos.
  - **Lector de Códigos de Barras**: Integración nativa con `BarcodeDetector` y fallback manual con consulta a Open Food Facts.
  - **Inferencia Automática de Conservación**: Estimación de vida útil para productos abiertos y cerrados basada en recomendaciones de ANMAT y USDA para más de 70 patrones de alimentos.
- **Gestión Visual de Despensa**:
  - Semáforo intuitivo de estados (*En fecha*, *Por vencer*, *Vencido*).
  - Vistas duales: Lista filtrable por pasillo/ubicación y Calendario semanal de vencimientos.
  - Gestión por lotes (marcar abiertos, mover ubicación, consumir o descartar).
- **Recetario y Planificador Semanal**:
  - 131 recetas regionales argentinas precargadas (`localRecipes.json`) que funcionan 100% offline.
  - Algoritmo de coincidencia inteligente según lo que tenés en la despensa ("Podés hacer ahora", "Te falta poco", "Necesitás comprar más").
  - Deducción automática de ingredientes con conversión de medidas y confirmación paso a paso.
  - Planificador semanal de comidas (almuerzo y cena) con cálculo de lista de compras combinada.
- **Lista de Compras Inteligente**:
  - Reposición automática por stock bajo, productos vencidos y faltantes de recetas.
  - Agrupación por pasillos de supermercado y migración directa de comprados a la despensa.
- **Reportes e Impacto**:
  - Gráficos interactivos con Recharts (kilogramos salvados, dinero ahorrado, platos aprovechados).
  - Gráficos de torta por categorías y tendencias mensuales.
- **Respaldo y Portabilidad Total**:
  - Exportación e importación completa en formato JSON (despensa, historial, recetas favoritas, planificador, compras, estadísticas y ajustes) con validación estricta de esquema.
  - Exportación de planilla CSV con BOM UTF-8 compatible con Microsoft Excel y Google Sheets.

---

## Stack Tecnológico

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Radix UI, Lucide Icons, Recharts, Sonner.
- **PWA & Offline OCR**: Workbox (`vite-plugin-pwa`), Tesseract.js (WebAssembly y Web Workers locales con modelos en español).
- **Backend / API**: Node.js, Express (servidor de producción y proxy opcional de traducción con DeepL), endpoints serverless para Vercel.
- **Testing**: Vitest (pruebas unitarias), Playwright (pruebas E2E y auditoría de accesibilidad con Axe).

---

## Requisitos

- **Node.js**: `>= 20.19.0`
- **pnpm**: `>= 9.0.0`

---

## Instalación y Ejecución

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Facusere/FreshTrack.git
   cd FreshTrack
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Variables de entorno (opcional):
   Creá un archivo `.env` en la raíz tomando como base `.env.example`:
   ```bash
   cp .env.example .env
   ```
   | Variable | Descripción | Obligatoria |
   | :--- | :--- | :--- |
   | `DEEPL_API_KEY` | Clave de API de DeepL para traducción automática de recetas remotas de TheMealDB. Si no se define, se emplean las 131 recetas locales en español o fallbacks. | No |

---

## Scripts Disponibles

| Comando | Acción |
| :--- | :--- |
| `pnpm dev` | Inicia el servidor de desarrollo local con Vite (por defecto en `http://localhost:3000`). |
| `pnpm build` | Compila el cliente con Vite y empaqueta el servidor con esbuild hacia `dist/`. |
| `pnpm build:client` | Compila exclusivamente el bundle estático del frontend PWA. |
| `pnpm start` | Inicia el servidor de producción con Node.js (`dist/index.js`). |
| `pnpm check` | Valida el tipado estricto de TypeScript (`tsc --noEmit`). |
| `pnpm test` | Ejecuta la suite de pruebas unitarias con Vitest. |
| `pnpm test:e2e` | Ejecuta las pruebas End-to-End y de accesibilidad con Playwright. |
| `pnpm format` | Formatea el código fuente con Prettier según las reglas de estilo. |

---

## Estructura del Proyecto

```text
FreshTrack/
├── api/
│   └── translate.ts             # Función serverless de traducción para Vercel
├── client/
│   ├── index.html               # Punto de entrada HTML y configuración PWA
│   ├── public/                  # Activos estáticos (iconos, manifiesto, modelos OCR locales)
│   └── src/
│       ├── components/          # Componentes de interfaz (AddProduct, Scan, Backup, etc.)
│       │   ├── home/            # Subsecciones modulares de la página principal (Home)
│       │   └── ui/              # Primitivas accesibles basadas en Radix UI
│       ├── contexts/            # Contextos React (ThemeContext con persistencia)
│       ├── data/                # Catálogo curado offline (131 recetas locales argentinas)
│       ├── hooks/               # Custom hooks reutilizables (useCameraStream)
│       ├── lib/                 # Lógica de dominio, algoritmos, fechas, vida útil y storage
│       ├── pages/               # Vistas principales (Home, NotFound)
│       ├── tests/               # Pruebas unitarias de dominio, integración y accesibilidad
│       └── types/               # Tipos TypeScript centralizados
├── docs/                        # Documentación técnica completa (15 guías detalladas)
├── e2e/
│   └── freshtrack.spec.ts       # Pruebas End-to-End con Playwright
├── server/
│   ├── index.ts                 # Servidor Express para producción local/Docker
│   └── translate.ts             # Servicio de traducción con DeepL y rate limiting
├── package.json
└── README.md
```

---

## Documentación Técnica Detallada

Para consultar la arquitectura interna, flujos de datos, algoritmos de inferencia y guías de desarrollo, revisá el directorio [`docs/`](docs/README.md):

- [Visión General](docs/01-vision-general.md)
- [Arquitectura del Sistema](docs/02-arquitectura.md)
- [Estructura del Proyecto](docs/04-estructura-del-proyecto.md)
- [Funcionalidades de Despensa y Escaneo](docs/05-funcionalidades/despensa.md)
- [Modelo de Datos y Almacenamiento](docs/06-modelo-de-datos-y-almacenamiento.md)
- [Referencia de Módulos `lib/`](docs/07-referencia-de-modulos-lib.md)
- [Componentes de UI](docs/08-componentes-ui.md)
- [Diseño y Accesibilidad WCAG](docs/13-diseno-y-accesibilidad.md)
- [Limitaciones y Deuda Técnica](docs/14-limitaciones-y-deuda-tecnica.md)
