# Instalación y Configuración del Entorno

Este documento proporciona las instrucciones paso a paso para clonar, configurar, ejecutar y verificar FreshTrack en un entorno de desarrollo local, incluyendo la matriz de compatibilidad de herramientas, las variables de entorno admitidas y los comandos de prueba.

---

## 1. Requisitos Previos

Para ejecutar y compilar FreshTrack de forma confiable, tu sistema debe contar con las siguientes herramientas mínimas:

| Herramienta | Versión Requerida | Verificación | Notas |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.19.0` | `node -v` | Especificado en `package.json` (`engines.node: ">=20.19.0"`). Se recomiendan ramas LTS activas (v20 o v22). |
| **pnpm** | `>= 9.0.0` (recomendado `10.4.1`) | `pnpm -v` | El repositorio fija `packageManager: "pnpm@10.4.1"`. No se recomienda usar `npm` ni `yarn` debido a overrides específicos (`tailwindcss>nanoid`). |
| **Google Chrome / Chromium** | Navegador moderno | `google-chrome --version` | Requerido si deseás correr la suite completa de pruebas End-to-End con Playwright (`channel: "chrome"`). |

---

## 2. Instalación Paso a Paso

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Facusere/FreshTrack.git
   cd FreshTrack
   ```

2. **Instalar dependencias con pnpm**:
   ```bash
   pnpm install
   ```

   > [!NOTE]
   > Durante la instalación, pnpm resuelve un *override* declarado en `package.json`: `tailwindcss>nanoid: "3.3.7"`. Esto previene advertencias de resolución en entornos empaquetados.

3. **Configurar el archivo de entorno**:
   Copiá la plantilla de variables de entorno hacia un archivo local `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 3. Variables de Entorno

El archivo `.env` se ubica en la raíz del proyecto. El archivo `.env.example` documenta las variables disponibles:

| Variable | Tipo | Obligatoria | Valor por Defecto | Descripción y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| `DEEPL_API_KEY` | `string` | **No** | Vacío (`""`) | Clave de API de DeepL para la traducción automática de recetas provenientes de TheMealDB (de inglés a español rioplatense). Admite claves gratuitas (que terminan en `:fx` y usan `api-free.deepl.com`) y claves de pago (`api.deepl.com`). Si se omite, las recetas online se exhiben con su texto original en inglés y un indicador visual, o se recurre a fallbacks locales. |
| `PORT` | `number` | **No** | `3000` | Puerto TCP en el que escucha el servidor Node.js de producción (`server/index.ts`). Si no se define en variables de sistema, toma `3000`. |
| `FRESHTRACK_URL` | `string` | **No** | `http://127.0.0.1:3000` | URL base consumida por la suite de pruebas E2E de Playwright (`playwright.config.ts`). Permite apuntar los tests contra un despliegue de staging o preview. |

> [!CAUTION]
> **Seguridad**: Nunca comitees tu archivo `.env` ni expongas tu `DEEPL_API_KEY` en repositorios públicos. El archivo `.gitignore` ya excluye `.env` y `.env.*` (salvo `.env.example`).

---

## 4. Scripts de `package.json`

A continuación se detalla la acción precisa ejecutada por cada comando disponible:

| Comando | Script Subyacente | Descripción Técnica |
| :--- | :--- | :--- |
| `pnpm dev` | `vite --host` | Inicia el servidor de desarrollo local de Vite en el puerto `3000` (con enlace a interfaces de red locales `0.0.0.0`). Utiliza el plugin interno `apiTranslatePlugin()` para emular `/api/translate` en caliente. |
| `pnpm build` | `vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist` | Proceso completo de compilación para producción: primero genera el frontend optimizado con Vite en `dist/public`, y luego empaqueta el servidor Node en `dist/index.js` mediante `esbuild`. |
| `pnpm build:client` | `vite build` | Compila exclusivamente el frontend PWA hacia `dist/public`, sin empaquetar el servidor Node.js (útil para validaciones rápidas o hosting puramente estático). |
| `pnpm start` | `node dist/index.js` | Inicia el servidor de producción Express empaquetado en `dist/index.js`. Requiere haber ejecutado previamente `pnpm build`. |
| `pnpm preview` | `vite preview --host` | Levanta un servidor web local estático con Vite para inspeccionar la carpeta de build antes de enviar a producción. |
| `pnpm check` | `tsc --noEmit` | Ejecuta la comprobación estricta de tipos de TypeScript en `client/src`, `server` y `api` sin generar artefactos en disco. |
| `pnpm test` | `vitest run` | Ejecuta en modo único (*single-run*) la suite completa de pruebas unitarias y de integración de lógica de negocio en `client/src/tests/`. |
| `pnpm test:e2e` | `playwright test e2e/freshtrack.spec.ts` | Dispara las pruebas funcionales End-to-End y de accesibilidad con Playwright en Chrome/Chromium. Si el servidor local no está corriendo, Playwright levanta automáticamente `pnpm dev` en el puerto 3000. |
| `pnpm format` | `prettier --write .` | Aplica el formateo de estilo de código según las reglas declaradas en `.prettierrc`. |

---

## 5. Puertos y Servicios de Red

- **Puerto por defecto en desarrollo y producción**: `3000` (configurable mediante `process.env.PORT` en producción o en `server.port` en `vite.config.ts`).
- **Comportamiento si el puerto 3000 está ocupado**: `vite.config.ts` establece `strictPort: false`. Si el puerto 3000 está en uso por otro proceso, Vite intentará vincularse al siguiente puerto libre disponible (ej. 3001).

---

## 6. Ejecución de Pruebas

### Pruebas Unitarias (Vitest)
Para correr las pruebas unitarias y de contraste cromático:
```bash
# Ejecución simple
pnpm test

# Ejecución en modo observador interactivo (watch mode)
pnpm vitest
```

### Pruebas End-to-End (Playwright)
Para correr las pruebas de integración en el navegador real:
```bash
# Ejecutar todas las pruebas E2E en modo headless
pnpm test:e2e

# Ejecutar con interfaz gráfica interactiva de Playwright
pnpm playwright test --ui
```

---

## 7. Comparativa con el `README.md` Existente

Al contrastar la configuración real del repositorio contra el archivo `README.md` original, se observan las siguientes diferencias y omisiones que deben tenerse en cuenta:

1. **Requisitos de pnpm**: El `README.md` indica `pnpm >= 9.0.0`, mientras que `package.json` declara un hash estricto de `pnpm@10.4.1`. Aunque versiones recientes de pnpm 9 funcionan, usar pnpm 10 asegura paridad idéntica de resolución con `pnpm-lock.yaml`.
2. **Scripts no documentados en README**: El comando `pnpm build:client` existe en `package.json` pero no estaba listado en la tabla de comandos del README original.
3. **Módulos no documentados en README**: El README original omitía la mención del módulo de datos estáticos `client/src/data/` (que aloja las 131 recetas de `localRecipes.json`), el módulo completo de Lista de Compras inteligente, las estadísticas de Reportes y el sistema de Respaldo/Restauración.

---

## 8. Problemas Comunes y Soluciones

### Error: `Cannot find module './server/translate.js'` al usar traducción en dev
- **Causa**: TypeScript resuelve rutas con extensión `.js` en módulos ESM (`allowImportingTsExtensions: true` en `tsconfig.json`).
- **Solución**: Asegurate de ejecutar `pnpm dev` desde la raíz del proyecto. El plugin `apiTranslatePlugin` en `vite.config.ts` se encarga de resolver la importación dinámica en tiempo de ejecución.

### Error en Playwright: `Executable doesn't exist at ...`
- **Causa**: Los binarios de navegador de Playwright no se instalaron en la máquina local.
- **Solución**: Ejecutá `pnpm playwright install chromium` o asegurate de tener Google Chrome instalado en el sistema operativo (Playwright está configurado para usar `channel: "chrome"`).

### Bloqueo de audio al emitir alertas sonoras (chimes)
- **Causa**: Las políticas de *Autoplay* de los navegadores modernos restringen la creación de `AudioContext` antes del primer clic o interacción del usuario con el DOM.
- **Solución**: En `client/src/lib/feedback.ts` la función `playChimeSound()` captura este error de forma silenciosa sin romper el flujo de la aplicación.

---

## Enlaces Relacionados
- [Estructura del Proyecto](04-estructura-del-proyecto.md)
- [Suite de Pruebas](11-testing.md)
- [Despliegue y Hosting](12-despliegue.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
