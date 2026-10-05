# Funcionalidad: Reportes, Estadísticas e Impacto

Este documento describe el módulo de análisis de datos, métricas de impacto socioeconómico y visualización estadística de FreshTrack, incluyendo las fórmulas de ahorro, proyecciones históricas, gráficos con Recharts y el ranking de desperdicio.

---

## 1. Perspectiva del Usuario

La sección de Reportes transforma el esfuerzo de controlar la despensa en datos motivadores y comprensibles:
- **Resumen de impacto acumulado**: Visualiza en tarjetas destacadas los kilogramos de comida rescatados del tacho, los pesos argentinos ahorrados y las comidas aprovechadas durante el mes en curso.
- **Gráfico de barras de evolución mensual**: Muestra los últimos 4 meses consecutivos, permitiendo alternar entre kilogramos evitados y dinero ahorrado. Si el usuario recién comienza, el sistema genera proyecciones realistas basadas en el ritmo actual (marcadas con un asterisco).
- **Gráfico de torta de categorías críticas**: Identifica qué grupos de alimentos (lácteos, verduras, carnes, etc.) sufren mayor proporción de vencimientos, orientando mejores decisiones al momento de comprar.
- **Top 5 de productos vencidos**: Un listado de los 5 alimentos que más veces caducaron en el hogar.
- **Historial de consumo con reversión**: Detalle cronológico de cada preparación cocinada o alimento aprovechado, con la posibilidad de revertir la acción si se cometió un error.

---

## 2. Métricas y Constantes de Estimación

Cuando el usuario confirma una receta o aprovecha un alimento, la función `recordImpact()` en `client/src/lib/impactStats.ts` actualiza los acumuladores del mes utilizando las siguientes constantes de referencia estándar:

| Constante | Valor | Unidad | Criterio de Cálculo |
| :--- | :---: | :---: | :--- |
| `ESTIMATED_KG_PER_RECIPE` | `0.4` | Kilogramos | Peso promedio de ingredientes rescatados por preparación culinaria estándar de 2 a 4 porciones. |
| `ESTIMATED_MONEY_PER_RECIPE` | `1200` | Pesos Argentinos (ARS) | Valor de reposición de mercado estimado para los ingredientes que habrían terminado descartados. |
| `ESTIMATED_MEALS_PER_RECIPE` | `1` | Comida / Plato | Una comida completa resuelta sin requerir compra o delivery extra. |

Las métricas se guardan en `freshtrack-impact-stats-v1` asociadas al mes actual en formato ISO (`YYYY-MM`, ej. `"2026-10"`). Al cambiar de mes, el contador mensual se reinicia automáticamente manteniendo la coherencia temporal.

---

## 3. Generación de Series Temporales y Proyecciones

La función `buildMonthlyWasteData(impact, today)` en `client/src/lib/reportsData.ts` construye los datos para el gráfico de barras abarcando una ventana de **4 meses consecutivos**:

```mermaid
flowchart TD
    Start([Construcción de Datos Mensuales]) --> Loop[Itera 4 meses: de mes - 3 hasta mes actual]

    Loop --> CheckMonth{¿Es el mes actual?}
    CheckMonth -->|Sí| CurrentMonth[Toma valores reales de impactStats\nisProjection: false\nEtiqueta: 'Mes (Actual)']

    CheckMonth -->|No| CheckStored{¿Hay registro guardado en\nMONTHLY_IMPACT_HISTORY_KEY?}
    CheckStored -->|Sí| StoredMonth[Toma kg y pesos históricos guardados\nisProjection: false\nEtiqueta: 'Mes']

    CheckStored -->|No| ProjectMonth[Calcula Proyección Ponderada\nisProjection: true\nEtiqueta: 'Mes*']

    CurrentMonth --> Collect[Agrega a resultado]
    StoredMonth --> Collect
    ProjectMonth --> Collect
```

### Factores de Ponderación para Proyecciones
Cuando no existen registros históricos reales en `freshtrack-monthly-impact-history-v1` (por ejemplo, en usuarios recién instalados), el sistema proyecta los meses anteriores a partir de la actividad del mes en curso:
- **1 mes atrás ($i=1$)**: $80\%$ de la actividad actual ($\text{factor} = 0.8$).
- **2 meses atrás ($i=2$)**: $60\%$ de la actividad actual ($\text{factor} = 0.6$).
- **3 meses atrás ($i=3$)**: $40\%$ de la actividad actual ($\text{factor} = 0.4$).

Los meses proyectados se indican con un asterisco en la etiqueta (ej. `"Jul*"`), comunicando con honestidad al usuario que se trata de una estimación previa a su uso formal.

---

## 4. Distribución por Categorías y Top de Vencidos

### Categorías con Mayor Desperdicio (`buildCategoryWasteData`)
Calcula la proporción de pérdidas combinando dos fuentes de datos:
1. **Productos actualmente vencidos** en la despensa activa (`status === "expired"` o `days <= 0`).
2. **Histórico acumulado** de productos vencidos guardados en `freshtrack-expired-history-v1` (`loadExpiredHistory()`).

Suma los conteos por categoría, calcula el porcentaje sobre el total de descartes y ordena los resultados de mayor a menor para alimentar el gráfico de torta de Recharts.

### Top 5 Productos Frecuentemente Vencidos (`buildTopExpiredProducts`)
Agrupa los descartes por nombre normalizado (en minúsculas), capitaliza la primera letra, extrae el emoji del alimento y genera una tabla con los 5 productos más recurrentes.

---

## 5. Implementación Visual con Recharts

En `client/src/components/home/ReportsSection.tsx`, las visualizaciones se construyen con la biblioteca Recharts:
- **Gráfico de Barras (`ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`)**: Permite conmutar la serie activa entre "Kg evitados" y "Pesos ahorrados", con barras animadas y tooltips personalizados con formato de moneda local (`$1.200` con `formatMoney()`).
- **Gráfico de Torta (`PieChart`, `Pie`, `Cell`, `Legend`)**: Asigna una paleta categórica de alto contraste (`PIE_COLORS`: Esmeralda, Ámbar, Rosa, Celeste, Violeta, Turquesa, Magenta, Índigo), asegurando legibilidad tanto en tema claro como oscuro.

---

## 6. Casos Borde

- **Datos insuficientes (`hasSufficientReportsData`)**: Si el usuario no ha realizado acciones, no tiene productos vencidos ni historial de consumo, la sección muestra un estado vacío alentador con el mensaje *"Tu impacto comenzará a verse acá"*, evitando mostrar gráficos vacíos o con ceros desprolijos.
- **Valores monetarios grandes**: `formatMoney(value)` utiliza `toLocaleString("es-AR")` para separar miles con puntos (ej. `$14.500`), asegurando formato natural en Argentina.
- **Reversión de impacto (`reverseImpact`)**: Si el usuario deshace un consumo, las métricas no caen en valores negativos; se aplica `Math.max(0, ...)` en kilogramos, pesos y acciones.

---

## 7. Pruebas que Cubren esta Funcionalidad

- `client/src/tests/reportsData.test.ts`: Pruebas de construcción de series mensuales, proyección cuando falta historial, cálculo de porcentajes por categoría y armado del Top 5 de vencidos.
- `client/src/tests/contrast.test.ts`: Validación de contraste de accesibilidad en los tokens de colores utilizados por las tarjetas y gráficos.

---

## Enlaces Relacionados
- [Funcionalidad: Consumo de Ingredientes](consumo-de-ingredientes.md)
- [Funcionalidad: Despensa](despensa.md)
- [Modelo de Datos y Almacenamiento](../06-modelo-de-datos-y-almacenamiento.md)
- [Referencia de Módulos lib/](../07-referencia-de-modulos-lib.md)
