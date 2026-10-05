# Glosario de Términos del Dominio

Este glosario define los conceptos culinarios, bromatológicos, técnicos y algorítmicos utilizados en el código fuente, la documentación técnica y la interfaz de usuario de FreshTrack.

---

## Términos del Dominio y Reglas Culinarias

### FEFO (*First Expired, First Out*)
Principio de gestión logística de inventarios aplicado a alimentos perecederos. Establece que **aquel lote cuya fecha de vencimiento sea más próxima debe consumirse primero**, independientemente de cuándo haya sido comprado o ingresado a la despensa. En FreshTrack, `findBestMatchingItem()` utiliza FEFO como regla de desempate obligatoria al seleccionar ingredientes para una receta.

### Vida Útil (*Shelf Life*)
Período durante el cual un alimento conserva su inocuidad microbiológica, valor nutricional y cualidades organolépticas (sabor, textura y aroma), bajo las condiciones de temperatura y almacenamiento recomendadas (temperatura ambiente para almacén seco, refrigeración a $< 4^\circ\text{C}$ para lácteos y carnes, o congelación a $-18^\circ\text{C}$ para freezer).

### Fecha de Vencimiento vs. Fecha de Consumo Preferente
- **Fecha de Vencimiento / Caducidad**: Límite sanitario a partir del cual el alimento puede constituir un riesgo microbiológico para la salud humana (habitual en carnes, pescados, lácteos pasteurizados y comidas preparadas).
- **Consumo Preferente (*Best Before*)**: Indicación de calidad; superada esta fecha el alimento suele ser inocuo, pero puede perder aroma, textura o crocancia (común en galletitas, pastas secas, enlatados y café).

### Estado de Envase (Cerrado vs. Abierto)
- **Cerrado**: El envase conserva el sellado hermético o atmósfera modificada de fábrica; rige la fecha de vencimiento impresa por el elaborador.
- **Abierto**: El sello de fábrica ha sido roto, exponiendo el alimento al oxígeno y a la flora microbiana ambiental. A partir de este momento rigen los días de apertura en frío (`openDays`), recalculando la caducidad como $\min(\text{fecha original}, \text{hoy} + \text{openDays})$.

### Mínimo Conservador por Categoría
Estrategia de inocuidad preventiva. Cuando un alimento ingresado es desconocido en el catálogo específico pero se conoce su categoría (ej. un postre lácteo artesanal desconocido), el sistema le asigna la menor vida útil registrada en esa categoría (en lácteos: 4 días cerrado y 2 días abierto), protegiendo la salud del usuario.

### Producto Estimado (`estimated: true`)
Alimento cuya fecha de vencimiento no proviene de una impresión tipográfica explícita en el paquete, sino de una deducción algorítmica basada en el catálogo ANMAT/USDA o en la fecha de elaboración detectada más los días estándar de vida útil.

### Corrección del Usuario (`user-correction`)
Preferencia personalizada guardada en `freshtrack-shelf-corrections-v1`. Si el usuario ajusta manualmente cuántos días dura un producto en su casa, el sistema prioriza este valor sobre las tablas estándar para futuras detecciones bajo la leyenda *"Con tu ajuste anterior"*.

### Semáforo de Estado (`ok` | `soon` | `expired`)
Clasificación cromática dinámica asignada a cada alimento en función de sus días restantes calculados respecto a la medianoche local:
- **`ok`**: Más de 3 días restantes (verde esmeralda).
- **`soon`**: Entre 0 y 3 días restantes inclusive (ámbar cálido).
- **`expired`**: Menos de 0 días restantes; la fecha límite ya pasó (rojo carmesí).

### Tiers de Recetas (`ready` | `almost` | `more`)
Niveles de viabilidad de una preparación culinaria evaluada contra la despensa activa:
- **`ready` ("Podés hacer ahora")**: Coincidencia del 100% de los ingredientes necesarios.
- **`almost` ("Te falta poco")**: Coincidencia igual o superior al 80% de los ingredientes.
- **`more` ("Necesitás comprar más")**: Coincidencia inferior al 80%.

### Descuento Inteligente de Inventario
Proceso por el cual, al preparar un plato, el sistema resta las cantidades utilizadas analizando familias de unidades (gramos a kilogramos, tazas a mililitros) y eliminando automáticamente los alimentos que quedan con remanente cero.

### Ruido OCR
Errores comunes de lectura óptica producidos por tipografías borrosas, sombras o impresoras fiscales de matriz de puntos (como confundir el dígito `0` con la letra `O`, o el `1` con la `l` o `I`), corregidos algorítmicamente por la función `cleanOcrDigits()`.

### Fallback Local
Conjunto de datos de contingencia (como las 131 recetas de `localRecipes.json` o las 12 preparaciones de `fallbackRecipes`) empaquetados dentro de la aplicación para responder de inmediato cuando no hay conexión a internet o cuando un servicio externo no responde.

---

## Enlaces Relacionados
- [Visión General](01-vision-general.md)
- [Funcionalidad: Vida Útil y Fechas](05-funcionalidades/vida-util-y-fechas.md)
- [Funcionalidad: Consumo de Ingredientes](05-funcionalidades/consumo-de-ingredientes.md)
- [Funcionalidad: Recetas y Aprovechamiento](05-funcionalidades/recetas.md)
