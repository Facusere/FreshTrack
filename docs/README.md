# Documentación Técnica de FreshTrack

Bienvenido a la documentación oficial de **FreshTrack**, una Progressive Web App (PWA) desarrollada en React 19, TypeScript y Vite, diseñada para el control inteligente de vencimientos de alimentos, la reducción del desperdicio en el hogar y la planificación ágil de compras y recetas con enfoque *offline-first*.

Esta documentación técnica está redactada en español rioplatense (con voseo, en consonancia con la interfaz de usuario y el repositorio) y cubre desde la arquitectura del sistema hasta los algoritmos de inferencia y la guía de contribución.

---

## Índice General

| Documento | Propósito principal | Audiencia objetivo |
| :--- | :--- | :--- |
| [01-vision-general.md](01-vision-general.md) | Problema que resuelve, propuesta de valor, principios de diseño y alcance actual. | Desarrolladores, Diseñadores, Producto |
| [02-arquitectura.md](02-arquitectura.md) | Arquitectura del cliente, Service Worker, backend mínimo Express/Vercel y flujos de datos. | Desarrolladores, Arquitectos |
| [03-instalacion-y-entorno.md](03-instalacion-y-entorno.md) | Guía paso a paso para clonar, configurar variables de entorno y ejecutar localmente. | Desarrolladores, QA |
| [04-estructura-del-proyecto.md](04-estructura-del-proyecto.md) | Desglose detallado del árbol de directorios, alias de importación y configuraciones base. | Desarrolladores |
| [05-funcionalidades/despensa.md](05-funcionalidades/despensa.md) | Gestión del inventario: altas, edición, filtros, calendario, ubicaciones y acciones por lote. | Desarrolladores, QA |
| [05-funcionalidades/escaneo-ocr-y-codigo-de-barras.md](05-funcionalidades/escaneo-ocr-y-codigo-de-barras.md) | Digitalización de tickets, etiquetas y códigos de barras (Tesseract.js y BarcodeDetector). | Desarrolladores, Especialistas ML/Vision |
| [05-funcionalidades/vida-util-y-fechas.md](05-funcionalidades/vida-util-y-fechas.md) | Catálogo de conservación (ANMAT/USDA), cálculo de envase abierto y fechas relativas. | Desarrolladores, Especialistas de Dominio |
| [05-funcionalidades/recetas.md](05-funcionalidades/recetas.md) | Motor de recetas: recetario local offline y conexión TheMealDB priorizada por vencimiento. | Desarrolladores, Producto |
| [05-funcionalidades/consumo-de-ingredientes.md](05-funcionalidades/consumo-de-ingredientes.md) | Deducción inteligente con FEFO, conversión de medidas culinarias y reversión histórica. | Desarrolladores, QA |
| [05-funcionalidades/lista-de-compras.md](05-funcionalidades/lista-de-compras.md) | Lista inteligente: stock bajo, reposición frecuente, agrupación por pasillos y migración. | Desarrolladores, UX |
| [05-funcionalidades/reportes-e-impacto.md](05-funcionalidades/reportes-e-impacto.md) | Métricas de impacto (kg, dinero, platos), tendencias mensuales y gráficos Recharts. | Desarrolladores, Producto |
| [05-funcionalidades/notificaciones.md](05-funcionalidades/notificaciones.md) | Alertas push/locales, preferencias por categoría (1/3/7 días) y resumen semanal. | Desarrolladores |
| [05-funcionalidades/backup-y-exportacion.md](05-funcionalidades/backup-y-exportacion.md) | Respaldo y restauración en JSON, y exportación de inventario en CSV con BOM UTF-8. | Desarrolladores, Soporte |
| [06-modelo-de-datos-y-almacenamiento.md](06-modelo-de-datos-y-almacenamiento.md) | Claves de `localStorage`, interfaces TypeScript, validación estricta y migraciones v1/v2/v3. | Desarrolladores, Arquitectos |
| [07-referencia-de-modulos-lib.md](07-referencia-de-modulos-lib.md) | Documentación técnica función por función de los 20 módulos dentro de `client/src/lib/`. | Desarrolladores |
| [08-componentes-ui.md](08-componentes-ui.md) | Jerarquía de componentes desde `App.tsx`, modales, secciones del home y primitivas Radix. | Desarrolladores Frontend |
| [09-api-y-servicios-externos.md](09-api-y-servicios-externos.md) | Contrato de `/api/translate`, integración TheMealDB, DeepL y Open Food Facts. | Desarrolladores Backend / Integraciones |
| [10-pwa-y-offline.md](10-pwa-y-offline.md) | Configuración de Workbox, Service Worker, caché de modelos OCR e instalación en móviles. | Desarrolladores Frontend / PWA |
| [11-testing.md](11-testing.md) | Suite de pruebas unitarias con Vitest, pruebas E2E con Playwright y auditoría de accesibilidad. | Desarrolladores, QA |
| [12-despliegue.md](12-despliegue.md) | Despliegue en contenedor/Node.js tradicional y despliegue serverless en Vercel. | DevOps, Desarrolladores |
| [13-diseno-y-accesibilidad.md](13-diseno-y-accesibilidad.md) | Tokens semánticos de Tailwind v4, temas claro/oscuro, contraste WCAG y feedback sensorial. | Diseñadores UI, Desarrolladores |
| [14-limitaciones-y-deuda-tecnica.md](14-limitaciones-y-deuda-tecnica.md) | Registro de inconsistencias, deudas arquitectónicas y limitaciones encontradas en el código. | Mantenedores, Tech Leads |
| [15-guia-de-contribucion.md](15-guia-de-contribucion.md) | Flujo de trabajo, convenciones de tipado estricto, extensión de recetas y checklist para PRs. | Colaboradores |
| [glosario.md](glosario.md) | Términos clave del dominio (FEFO, vida útil, fecha de consumo preferente, etc.). | Todos |

---

## Rutas de Lectura Sugeridas

### 1. Desarrollador que recién se incorpora al proyecto
Si vas a sumarte a desarrollar en FreshTrack, seguí este orden para tener el panorama completo sin perderte:
1. [01-vision-general.md](01-vision-general.md) — Entendé qué resuelve la aplicación y por qué se toman decisiones conservadoras.
2. [03-instalacion-y-entorno.md](03-instalacion-y-entorno.md) — Levantá el entorno local con `pnpm dev`.
3. [04-estructura-del-proyecto.md](04-estructura-del-proyecto.md) — Ubicá dónde está cada archivo y módulo.
4. [02-arquitectura.md](02-arquitectura.md) — Comprendé el flujo de datos unidireccional y la separación `StoredProduct` vs `Product`.
5. [06-modelo-de-datos-y-almacenamiento.md](06-modelo-de-datos-y-almacenamiento.md) — Familiarizate con las claves y estructuras de `localStorage`.
6. [07-referencia-de-modulos-lib.md](07-referencia-de-modulos-lib.md) — Consultá las funciones de dominio antes de crear utilidades duplicadas.
7. [14-limitaciones-y-deuda-tecnica.md](14-limitaciones-y-deuda-tecnica.md) — Leé las advertencias técnicas antes de tocar áreas sensibles.

### 2. Mantenedor o Líder Técnico
Si tenés que revisar la salud del código, planificar refactorizaciones o preparar despliegues:
1. [02-arquitectura.md](02-arquitectura.md)
2. [12-despliegue.md](12-despliegue.md)
3. [14-limitaciones-y-deuda-tecnica.md](14-limitaciones-y-deuda-tecnica.md)
4. [11-testing.md](11-testing.md)
5. [15-guia-de-contribucion.md](15-guia-de-contribucion.md)

### 3. Especialista de Producto o Diseñador UX/UI
Si querés entender los flujos de interacción, diseño y cobertura funcional:
1. [01-vision-general.md](01-vision-general.md)
2. [05-funcionalidades/despensa.md](05-funcionalidades/despensa.md) y resto de documentos en [05-funcionalidades/](05-funcionalidades/)
3. [13-diseno-y-accesibilidad.md](13-diseno-y-accesibilidad.md)
4. [glosario.md](glosario.md)

---

## Enlaces Relacionados
- [Visión General](01-vision-general.md)
- [Arquitectura del Sistema](02-arquitectura.md)
- [Glosario de Términos](glosario.md)
