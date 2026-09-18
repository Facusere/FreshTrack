# FreshTrack

FreshTrack es un dashboard web para controlar vencimientos de alimentos, reducir desperdicio y planificar el consumo semanal. La aplicación está construida con React 19, Vite, TypeScript, Tailwind CSS y componentes visuales propios sobre el template estático de Manus.

## Funcionalidades

La aplicación permite escanear compras simuladas, agregar productos manualmente y clasificar fechas de elaboración, vencimiento y consumo preferente mediante reglas contextuales. El diccionario regional contiene 300 productos en 15 categorías y diferencia vida útil para envases abiertos y cerrados. Las correcciones del usuario se guardan localmente como reglas de aprendizaje incremental.

El sistema de notificaciones agrupa productos que vencen el mismo día, permite elegir anticipación de 1, 3 o 7 días por categoría y ofrece un resumen semanal. La despensa tiene una vista de calendario de la próxima semana para planificar comidas según el orden de vencimiento.

La sección de recetas consulta TheMealDB usando productos próximos a vencer. Cada sugerencia muestra ingredientes relevantes, permite abrir un modal con los ingredientes completos y el paso a paso, y permite marcar la receta como aprovechada. Al confirmar, los ingredientes asociados se descuentan automáticamente del inventario local. Si la API no responde, se muestran recetas de fallback para conservar la experiencia.

Las sugerencias incluyen filtros rápidos para opciones vegetarianas, sin TACC y de preparación rápida. Estos filtros son heurísticos sobre el título, los ingredientes disponibles y, cuando ya se cargó, el detalle de la receta; deben presentarse como orientación y no como certificación nutricional.

Cada consumo confirmado se conserva en un historial reciente de la sesión. El botón “Deshacer último” restaura exactamente el inventario previo y revierte las métricas de impacto asociadas a esa acción. En la despensa, los productos vencidos, próximos a vencer o con una sola unidad reciben color, borde lateral y una etiqueta de atención para facilitar la priorización.

El panel de impacto registra mensualmente los kilogramos de comida salvada, el dinero recuperado, las comidas posibles y la cantidad de acciones de aprovechamiento. Las métricas se guardan en `localStorage` y se actualizan al confirmar una receta.

## Estructura principal

```text
client/
  src/
    pages/Home.tsx              # Dashboard, modales y flujos interactivos
    lib/dateRecognition.ts      # Clasificación contextual y aprendizaje incremental
    lib/shelfLifeCatalog.ts     # Catálogo regional y sugerencias colaborativas
    lib/notificationRules.ts    # Agrupación, resumen y preferencias de alertas
    lib/recipeApi.ts            # Cliente TheMealDB y fallback local
    lib/impactStats.ts          # Métricas mensuales de impacto
    index.css                   # Tokens visuales y estilos globales
README.md                       # Esta documentación
```

El directorio `server/` pertenece al template y no se modifica para estas funcionalidades frontend.

## Integración con TheMealDB

FreshTrack utiliza el endpoint gratuito de filtro por ingrediente con la clave de prueba pública `1`:

```text
https://www.themealdb.com/api/json/v1/1/filter.php?i=spinach
```

Cuando el usuario abre una receta externa, la aplicación consulta sus detalles con `lookup.php`. La integración normaliza nombres frecuentes de Argentina y Latinoamérica, por ejemplo `espinaca fresca` a `spinach` y `pechuga de pollo` a `chicken_breast`. El acceso a la API se ejecuta desde el navegador y no requiere secretos en el repositorio.

La API gratuita puede tener límites. Por eso `recipeApi.ts` captura errores, soporta cancelación mediante `AbortController` y devuelve tres recetas locales de respaldo.

## Persistencia local

La aplicación no requiere backend para estas funciones. Utiliza las siguientes claves de almacenamiento local:

| Clave | Contenido |
| --- | --- |
| `freshtrack-products` | Inventario agregado y actualizado por el usuario |
| `freshtrack-date-learning` | Correcciones de etiquetas de fechas |
| `freshtrack-shelf-life-suggestions-v1` | Sugerencias colaborativas de vida útil |
| `freshtrack-notification-preferences-v1` | Anticipación y digest semanal |
| `freshtrack-impact-stats-v1` | Impacto acumulado del mes actual |

El descuento de ingredientes busca primero una coincidencia por nombre normalizado. Si el producto tiene una cantidad numérica, reduce una unidad; si tiene una unidad, elimina el producto del inventario. La operación ocurre únicamente después de presionar “Aproveché”.

## Desarrollo local

Instalá las dependencias y ejecutá el servidor de desarrollo:

```bash
pnpm install
pnpm dev
```

Validá tipos y compilación antes de entregar cambios:

```bash
pnpm check
pnpm build
```

Ejecutá la suite de pruebas unitarias y de integración con:

```bash
pnpm test
```

Las pruebas de `client/src/tests/dateRecognition.test.ts` cubren la diferenciación de elaboración, vencimiento y consumo preferente, la proximidad de palabras clave, el aprendizaje incremental y el contexto desconocido. Las pruebas de `client/src/tests/inventoryConsumption.integration.test.ts` verifican el descuento de unidades, la eliminación de productos agotados, el manejo de ingredientes ausentes y la actualización conjunta del impacto mensual. La prueba end-to-end `e2e/freshtrack.spec.ts` simula la apertura de una receta, la carga de sus detalles, la confirmación de “Aproveché”, la notificación visual y la actualización del inventario. Ejecutala con `pnpm test:e2e`.

El proyecto se ejecuta con Vite y está preparado para la previsualización gestionada por Manus.

## Criterios de diseño

La interfaz usa una paleta verde bosque, crema y lima suave para transmitir control y frescura sin convertir el producto en una experiencia infantil. Las acciones principales tienen feedback inmediato mediante toasts. Los modales incluyen cierre visible y contenido con scroll para funcionar en pantallas pequeñas. Las recetas se presentan como recomendaciones y no como garantía nutricional o sanitaria.

## Límites conocidos

TheMealDB entrega recetas internacionales y puede no tener equivalencias exactas para todos los productos regionales. La coincidencia de inventario es heurística y descuenta una unidad por ingrediente reconocido. Las métricas de impacto son personales y locales hasta que se agregue una cuenta sincronizada. Las notificaciones actuales configuran y agrupan alertas dentro de la experiencia web; no envían todavía push notifications ni correos externos.

## Próximas mejoras

Las siguientes extensiones son compatibles con la arquitectura actual: almacenar recetas favoritas, mostrar cantidades y sustituciones regionales, sincronizar inventario con una base de datos, agregar filtros por tiempo o restricciones alimentarias y registrar desperdicio evitado con datos reales en vez de valores iniciales de demostración.

## Referencias

[1]: https://www.themealdb.com/api.php "TheMealDB Free Recipe API"
