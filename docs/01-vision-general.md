# Visión General de FreshTrack

FreshTrack es una Progressive Web App (PWA) orientada al control inteligente de fechas de vencimiento de alimentos en el hogar, diseñada para reducir drásticamente el desperdicio hogareño y asistir en la planificación cotidiana de compras y comidas sin requerir registro previo ni conexión constante a internet.

---

## 1. El Problema que Resuelve

El desperdicio de alimentos a nivel doméstico no suele deberse a falta de interés o desidia, sino a una suma de fricciones operativas cotidianas:
1. **Pérdida de visibilidad**: Los productos perecederos (lácteos, fiambres, carnes y verduras) quedan olvidados en el fondo de la heladera o la alacena hasta que ya no son aptos para el consumo.
2. **Carga mental en el registro**: La mayoría de las aplicaciones existentes exigen escribir manualmente cada producto, seleccionar fechas en calendarios engorrosos o crear cuentas de usuario con contraseñas.
3. **Incertidumbre tras la apertura del envase**: La fecha impresa en el paquete deja de ser válida en el momento en que se abre el sello de fábrica (por ejemplo, un sachet de leche o una salsa pasteurizada dura pocos días en frío tras abrirse), pero el consumidor no sabe con certeza cuánto tiempo tiene para consumirlo.
4. **Desconexión entre inventario y cocina**: Saber qué alimentos están por vencer no alcanza si no se dispone de ideas rápidas para combinarlos en una preparación concreta antes de que se echen a perder.

FreshTrack aborda este conjunto de problemas mediante una solución liviana, local y sin barreras de entrada.

---

## 2. Propuesta de Valor

FreshTrack combina visión artificial y procesamiento de lenguaje natural en el navegador con un recetario inteligente y reglas estrictas de inocuidad alimentaria:

- **Digitalización instantánea**: Permite cargar compras completas escaneando el ticket fiscal con OCR local en español o fotografiando la etiqueta de vencimiento en el envase, además de lectura de códigos de barras (EAN/UPC).
- **Estimación inocua y conservadora**: Si el envase no explicita la fecha o el producto es fresco (frutas, verduras, panificados), el sistema estima la vida útil aplicando los valores más conservadores de las tablas técnicas de ANMAT (Argentina) y el FoodKeeper de la USDA.
- **Cocina de rescate de alimentos**: Recomienda preparaciones priorizando estrictamente los ingredientes más próximos a caducar, descontando automáticamente las cantidades utilizadas mediante lógica FEFO (*First Expired, First Out*).
- **Cierre de circuito con compras**: Cuando un alimento se agota o su stock queda bajo, pasa de forma inteligente a la lista de compras agrupado por pasillo de supermercado.

---

## 3. Público Objetivo

- **Hogares y familias** que buscan optimizar su presupuesto mensual de supermercado y minimizar la comida que termina en la basura.
- **Personas que viven solas** y frecuentemente compran paquetes que no llegan a consumir completos antes de su caducidad.
- **Usuarios conscientes del impacto ambiental** que desean medir su reducción de huella en kilogramos de comida salvados y dinero recuperado.
- **Entornos con conectividad intermitente** (como cocinas, despensas o sótanos sin señal celular fluida) que requieren una herramienta que responda sin demoras ni pantallas de carga bloqueantes.

---

## 4. Principios de Diseño y Filosofía Técnica

### Offline-first Radical
La aplicación no depende de un servidor central para almacenar información ni para ejecutar visión por computadora. Los pesos del motor Tesseract.js, las fuentes tipográficas y los 131 registros del recetario local residen en el caché del navegador gestionado por Workbox. El usuario puede instalar la PWA y usarla plenamente en modo avión.

### Privacidad y Soberanía de Datos
No existen cuentas de usuario, inicio de sesión, rastreadores ni sincronización obligatoria en la nube. La totalidad de los alimentos, las estadísticas de ahorro y las notas de compra viven en el `localStorage` del dispositivo. El usuario puede generar y resguardar en cualquier momento copias de seguridad en formato JSON o planillas CSV.

### Estimación Inocua y Conservadora
La inocuidad alimentaria prima sobre cualquier otra consideración. Si un alimento es desconocido en el catálogo específico pero se reconoce su categoría, FreshTrack asigna automáticamente la menor vida útil registrada en esa categoría. Nunca se alargan fechas de caducidad tras la apertura de un envase: si el envase cerrado vencía mañana, abrirlo no prolonga artificialmente su duración.

### Cero Carga Cognitiva en la Carga
El usuario puede ingresar productos de cuatro formas distintas: escaneando un ticket de supermercado, fotografiando la etiqueta del envase, leyendo el código de barras con la cámara o tipeando manualmente con autocompletado en un modal rápido.

---

## 5. Alcance Actual del Sistema

### Incluido y Verificado en el Código
- **Despensa integral**: Visualización en lista y calendario semanal, filtros por estado (`ok`, `soon`, `expired`), ubicación física (Heladera, Freezer, Alacena, Cajón de verduras) y estado de envase (Cerrado / Abierto).
- **Escaneo OCR y Código de Barras**: Detección de fechas de elaboración, vencimiento y consumo preferente mediante Tesseract 7 local; soporte para BarcodeDetector nativo y consulta a Open Food Facts.
- **Recetario Dual**: Pestaña "¿Qué puedo cocinar?" basada en 131 recetas locales (`localRecipes.json`) evaluadas contra la despensa en memoria, y pestaña "Aprovechar por vencer" conectada a TheMealDB mediante proxy opcional con DeepL.
- **Consumo con Deducción Inteligente**: Planificación de consumo con conversión de unidades (masa, volumen, conteo, envases) y confirmación interactiva con reversión histórica (*undo*).
- **Lista de Compras Automatizada**: Sugerencias automáticas por reposición frecuente, stock bajo y faltantes de recetas, con migración de compras a la despensa en un toque.
- **Reportes de Impacto**: Gráficos de barra y torta interactivos (Recharts) que computan kilogramos evitados, pesos ahorrados ($1.200 por receta estándar) y productos frecuentemente vencidos.
- **Notificaciones Preventivas**: Alertas basadas en Web Notifications API / Service Worker con umbrales configurables (1, 3 o 7 días por categoría) y resumen semanal los domingos o lunes.

### No Comprendido en el Alcance Actual
- Sincronización multi-dispositivo en tiempo real (requiere backend con base de datos, ausente por diseño).
- Cuentas de usuario o control de acceso multi-usuario.
- Aplicación móvil nativa en tiendas App Store / Google Play (opera como PWA web instalable).

---

## Enlaces Relacionados
- [Arquitectura del Sistema](02-arquitectura.md)
- [Funcionalidad: Despensa](05-funcionalidades/despensa.md)
- [Funcionalidad: Vida Útil y Fechas](05-funcionalidades/vida-util-y-fechas.md)
- [Glosario de Términos](glosario.md)
