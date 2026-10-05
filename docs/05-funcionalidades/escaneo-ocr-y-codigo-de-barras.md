# Funcionalidad: Escaneo OCR y Código de Barras

Este documento describe la arquitectura, interacción de usuario, algoritmos de visión y lógica de inferencia del módulo de escaneo de FreshTrack, encargado de digitalizar compras a partir de tickets fiscales, envases y códigos de barras de forma 100% desconectada.

---

## 1. Perspectiva del Usuario

El usuario accede al escáner tocando el botón principal "Escanear compra" en la cabecera o el botón central de escaneo en la barra de navegación móvil. El modal (`ScanModal`) ofrece tres modos de escaneo y tres métodos de entrada:

### Modos de Escaneo
1. **Ticket de Supermercado**: Lee tickets fiscales completos de múltiples líneas, aislando nombres de productos y cantidades mientras descarta precios, CUITs, números de terminal y códigos de barras.
2. **Etiqueta de Envase**: Diseñado para enfocar el bloque de texto impreso en el paquete (por ejemplo en la tapa de un yogur o cartón de leche), detectando fechas de elaboración, vencimiento o consumo preferente.
3. **Código de Barras**: Lee códigos EAN-13, EAN-8 y UPC directamente apuntando la cámara o ingresando los números a mano, resolviendo instantáneamente nombre, marca, categoría e imagen mediante la base comunitaria de Open Food Facts.

### Métodos de Entrada
- **Cámara en vivo**: Captura en tiempo real con selector de cámara frontal o trasera (`environment`).
- **Subir archivo**: Permite cargar fotos tomadas previamente desde la galería o explorador de archivos.
- **Tickets de ejemplo predefinidos**: Proporciona 3 comprobantes argentinos realistas (Supermercado COTO, Etiqueta de Yogur, Carnicería y Verdulería) para probar el sistema en entornos sin cámara o en dispositivos de escritorio.

---

## 2. Flujo Completo de Procesamiento

El siguiente diagrama detalla la secuencia de ejecución desde que el usuario aporta la imagen hasta que los alimentos ingresan al inventario:

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant SM as ScanModal.tsx
    participant PP as Preprocesamiento Canvas (ocrScanner.ts)
    participant Tess as Worker Tesseract.js (/tesseract/)
    participant DR as dateRecognition.ts
    participant OFF as Open Food Facts / BarcodeDetector
    participant SLC as shelfLifeCatalog.ts
    participant Home as Home.tsx (Estado)

    alt Modo Código de Barras
        U->>SM: Apunta cámara o tipea código
        SM->>OFF: BarcodeDetector.detect() o fetchProductByBarcode()
        OFF-->>SM: Metadatos (nombre, marca, categoría, imagen)
        SM->>SLC: estimateShelfLife(nombre, "cerrado", categoria)
        SLC-->>SM: Días estimados de vida útil
        SM-->>U: Presenta producto en lista de resultados
    else Modo Ticket o Etiqueta (OCR)
        U->>SM: Captura foto / Sube imagen / Elige ticket ejemplo
        SM->>PP: preprocessImage(imageSource, cropArea)
        Note over PP: Escala de grises (Luma 0.299R + 0.587G + 0.114B)<br/>Estiramiento dinámico de contraste
        PP-->>SM: Canvas optimizado
        SM->>Tess: performBrowserOCR(processedSource)
        Tess-->>SM: Texto plano reconocido + Nivel de confianza
        SM->>DR: detectDateCandidates(rawText)
        Note over DR: Expresiones regulares multiformato<br/>Clasificación por cercanía a palabras clave<br/>(vto, elab, consumir antes)
        DR-->>SM: Fechas detectadas con etiquetas y score
        SM->>SM: parseReceiptAndLabelText(rawText)
        Note over SM: Limpieza de precios, códigos y boilerplate fiscal<br/>Extracción de cantidades y multiplicadores
        SM->>SLC: Inferencia de vida útil si la fecha era de elaboración
        SLC-->>SM: Días proyectados
        SM-->>U: Pantalla de revisión de productos detectados
    end

    U->>SM: Revisa, ajusta cantidades/fechas y confirma
    SM->>Home: onComplete(products)
    Home->>Home: Guarda en freshtrack-products-v3 y actualiza despensa
```

---

## 3. Preprocesamiento Visual de la Imagen

Para garantizar que el motor OCR interprete correctamente números tenues o impresiones por matriz de puntos sobre fondos plásticos, `client/src/lib/ocrScanner.ts` aplica una transformación de dos pasos en un elemento `<canvas>` fuera de pantalla (`preprocessImage` y `applyGrayscaleAndContrast`):

1. **Recorte opcional (`CropArea`)**: Si se delimita un área de interés, se extrae el cuadrante con coordenadas normalizadas.
2. **Conversión a escala de grises**: Transforma cada píxel RGBA aplicando los coeficientes estándar de luminancia perceptiva:
   $$\text{Gray} = 0.299 \cdot R + 0.587 \cdot G + 0.114 \cdot B$$
3. **Estiramiento dinámico de contraste**: Se calculan los valores mínimo ($\text{minLum}$) y máximo ($\text{maxLum}$) de luminancia de la muestra. Si el rango es mayor a 15, se estira linealmente al rango completo 0–255:
   $$\text{Stretched} = \left(\frac{\text{Gray} - \text{minLum}}{\text{maxLum} - \text{minLum}}\right) \cdot 255$$
   Si el contraste original es muy pobre (rango $\le 15$), se aplica una amplificación con factor 1.35 anclada en el punto medio 128.

---

## 4. Tesseract.js 100% Offline

A diferencia de implementaciones habituales que descargan los modelos de lenguajes desde CDNs externas, FreshTrack aloja todos los archivos necesarios localmente en `client/public/tesseract/`:
- `tesseract-core-lstm.wasm.js` y `tesseract-core-lstm.wasm`: Motor central compilado en WebAssembly.
- `worker.min.js`: Trabajador web en segundo plano para no congelar el hilo principal de la interfaz de usuario.
- `spa.traineddata` y `spa.traineddata.gz`: Red neuronal de reconocimiento óptico entrenada específicamente para el idioma español (incluyendo caracteres acentuados y signos de puntuación).

`performBrowserOCR` configura explícitamente estas rutas relativas:
```typescript
const workerOptions = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract/tesseract-core-lstm.wasm.js",
  langPath: "/tesseract",
};
```
El Service Worker de Workbox precachea estos binarios (con una regla de expiración de 90 días en la caché `freshtrack-tesseract-offline`), garantizando funcionamiento autónomo sin acceso a internet.

---

## 5. Limpieza de Tickets y Extracción de Cantidades

La función `extractQuantityFromTicketLine(line)` en `ocrScanner.ts` procesa cada línea del ticket descartando el "ruido fiscal" y extrayendo tanto la cantidad como el nombre limpio del producto:

1. **Filtro de Ruido Fiscal**: Descarta códigos de artículo (`ART 1234`, `PLU 55`), códigos de barras largos (de 8 a 14 dígitos) e importes monetarios (`$1.250`, `x $4.500`, o decimales al final de la línea).
2. **Detección de Packs**: Identifica patrones como `"4X120G"` o `"6x500ml"`, multiplicando las unidades por el tamaño de cada recipiente.
3. **Multiplicadores iniciales**: Reconoce prefijos del tipo `"2 LECHE"` o `"3X YOGUR"`.
4. **Unidades de peso o volumen**: Busca indicadores como `1.500 KG`, `500G`, `1L`, `750ML` o `1 BANDEJA`, normalizándolos con el módulo `quantity.ts`.

---

## 6. Detección, Clasificación y Aprendizaje de Fechas

El módulo `dateRecognition.ts` combina análisis morfológico de fechas con análisis contextual de palabras clave:

### Clasificación Contextual
Las fechas se clasifican en tres tipos según los términos que las rodean en la misma línea:
- **`vencimiento`**: Palabras como *"vto"*, *"vence"*, *"vencimiento"*, *"exp"*, *"validez"*, *"use by"*, *"caducidad"*.
- **`elaboración`**: Palabras como *"elab"*, *"elaboracion"*, *"fabricacion"*, *"fab"*, *"mfg"*, *"envasado"*, *"pack"*.
- **`consumo preferente`**: Expresiones como *"consumir preferentemente antes de"*, *"best before"*, *"best by"*, *"bb"*.

Si una fecha se detecta como de elaboración, FreshTrack **no la toma como fecha de vencimiento**. En su lugar, consulta la vida útil estimada en `shelfLifeCatalog.ts` y calcula el vencimiento proyectado sumando los días estándar a la fecha de elaboración.

### Reparación de Ruido OCR
La función `cleanOcrDigits` en `client/src/lib/dates.ts` repara los errores típicos de lectura óptica en tipografías de impacto o matriz de puntos:
- Letras `O` / `o` $\rightarrow$ Dígito `0`
- Letras `l` / `I` $\rightarrow$ Dígito `1`
- Letra `S` $\rightarrow$ Dígito `5`
- Letra `B` $\rightarrow$ Dígito `8`

### Reglas de Aprendizaje por Corrección del Usuario
Si el usuario corrige habitualmente la clasificación de un producto (por ejemplo, si el sistema creía que cierta fecha era de elaboración pero era de vencimiento), la función `saveLearningCorrection()` guarda la preferencia en la clave de `localStorage` `freshtrack-date-learning-v1`. En futuros escaneos de ese mismo producto, la regla aprendida suma puntaje prioritario.

---

## 7. Escaneo de Códigos de Barras y Open Food Facts

En el modo código de barras:
1. Se verifica el soporte nativo del navegador con `isBarcodeDetectorSupported()` (`"BarcodeDetector" in window`).
2. Si está disponible, `detectBarcodeFromImageSource()` escanea el lienzo buscando simbologías comerciales comunes: `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`, `qr_code`.
3. El código limpio se consulta contra el endpoint público de Open Food Facts:
   `https://world.openfoodfacts.org/api/v2/product/{código}.json`
4. Se extrae el nombre comercial en español, la marca, la categoría y la imagen de miniatura.
5. Se asigna una vida útil inicial calculada por `estimateShelfLife()`, un emoji representativo y una ubicación sugerida.

---

## 8. Casos Borde y Limitaciones Técnicas

- **Cámara no disponible o bloqueada por permisos**: `ScanModal` captura el error y conmuta automáticamente a la pestaña de subida de archivos o tickets de ejemplo, informando al usuario en lenguaje claro.
- **Fallas en Tesseract por timeout**: Si el worker no responde en 15 segundos (por ejemplo en dispositivos extremadamente lentos), la promesa lanza un error legible: `"No se pudo inicializar el escáner"`.
- **Encabezado `User-Agent` en navegador**: En `barcodeScanner.ts`, la llamada a Open Food Facts intenta enviar `{ headers: { "User-Agent": "..." } }`. Como se detalla en el documento de deuda técnica, los navegadores modernos ignoran o bloquean este encabezado por razones de seguridad.

---

## 9. Pruebas que Cubren esta Funcionalidad

- `client/src/tests/ocrScanner.test.ts`: Validación de `extractQuantityFromTicketLine()` con multiplicadores, packs y líneas de tickets fiscales argentinos reales.
- `client/src/tests/dateRecognition.test.ts`: Pruebas de detección de candidatos, clasificación entre vencimiento y elaboración, y aplicación de reglas de aprendizaje.
- `e2e/freshtrack.spec.ts`: Auditoría de accesibilidad Axe sobre `ScanModal` abierto y verificación de apertura desde la barra de navegación inferior móvil.

---

## Enlaces Relacionados
- [Funcionalidad: Despensa](despensa.md)
- [Funcionalidad: Vida Útil y Fechas](vida-util-y-fechas.md)
- [API y Servicios Externos](../09-api-y-servicios-externos.md)
- [PWA y Estrategias Offline](../10-pwa-y-offline.md)
- [Limitaciones y Deuda Técnica](../14-limitaciones-y-deuda-tecnica.md)
