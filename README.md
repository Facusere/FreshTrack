# FreshTrack

FreshTrack es una Progressive Web App (PWA) para el control inteligente de vencimientos de alimentos, reducción del desperdicio hogareño y planificación de compras y recetas. Permite escanear tickets y etiquetas de vencimiento con OCR offline en el navegador, gestionar el inventario y monitorear estadísticas de ahorro.

## Stack Tecnológico

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Radix UI, Recharts.
- **PWA & Offline OCR**: Workbox (`vite-plugin-pwa`), Tesseract.js (WebAssembly y Web Workers locales).
- **Backend / API**: Node.js, Express (servidor de producción y proxy opcional de traducción con DeepL).
- **Testing**: Vitest (pruebas unitarias), Playwright (pruebas E2E y accesibilidad con Axe).

## Requisitos

- **Node.js**: `>= 20.19.0`
- **pnpm**: `>= 9.0.0`

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Facusere/FreshTrack.git
   cd FreshTrack
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

## Variables de Entorno

Creá un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`:

| Variable | Descripción | Obligatoria |
| :--- | :--- | :--- |
| `DEEPL_API_KEY` | Clave de API de DeepL para traducción automática de recetas de TheMealDB (inglés a español rioplatense). Si no se define, se muestran recetas con textos en idioma original o fallbacks locales. | No |

## Scripts Disponibles

| Comando | Acción |
| :--- | :--- |
| `pnpm dev` | Inicia el servidor de desarrollo local con Vite (por defecto en `http://localhost:3000`). |
| `pnpm build` | Compila el cliente con Vite y empaqueta el servidor con esbuild hacia `dist/`. |
| `pnpm start` | Inicia el servidor de producción con Node.js (`dist/index.js`). |
| `pnpm check` | Valida el tipado TypeScript en todo el proyecto (`tsc --noEmit`). |
| `pnpm test` | Ejecuta las pruebas unitarias con Vitest. |
| `pnpm test:e2e` | Ejecuta las pruebas End-to-End y de accesibilidad con Playwright. |
| `pnpm format` | Formatea el código con Prettier. |

## Estructura del Proyecto

```text
FreshTrack/
├── api/
│   └── translate.ts             # Función serverless de traducción para Vercel
├── client/
│   ├── index.html               # Punto de entrada HTML y configuración PWA
│   ├── public/                  # Activos estáticos (iconos, capturas, modelos offline Tesseract)
│   └── src/
│       ├── components/          # Componentes de UI (dashboard, modales, primitivas Radix)
│       ├── contexts/            # Contextos de React (ThemeContext)
│       ├── lib/                 # Lógica de dominio (OCR, fechas, vida útil, compras, impacto)
│       ├── pages/               # Vistas de la aplicación (Home, NotFound)
│       ├── tests/               # Pruebas unitarias de frontend
│       └── types/               # Definiciones de tipos TypeScript
├── e2e/
│   └── freshtrack.spec.ts       # Pruebas End-to-End con Playwright
├── server/
│   ├── index.ts                 # Servidor Express para producción
│   └── translate.ts             # Servicio de traducción e integración DeepL
├── package.json
└── README.md
```
