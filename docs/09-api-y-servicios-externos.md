# API y Servicios Externos

Este documento describe el contrato de la API interna de traducción (`/api/translate`) y las integraciones con servicios externos en la nube consumidos por FreshTrack (TheMealDB, DeepL y Open Food Facts), detallando sus endpoints, esquemas de caché, timeouts, comportamiento ante desconexión y ejemplos de invocación con `curl`.

---

## 1. Contrato del Endpoint `/api/translate`

El endpoint `/api/translate` opera como un proxy seguro en el backend para traducir arreglos de texto mediante DeepL sin exponer la clave `DEEPL_API_KEY` en el cliente web ni incurrir en bloqueos de CORS.

### Especificación HTTP
- **Método**: `POST`
- **Ruta**: `/api/translate`
- **Cabeceras de Solicitud**: `Content-Type: application/json`

### Cuerpo de la Solicitud (Request Payload)
```json
{
  "texts": ["Chicken Breast", "Soy Sauce", "Preheat oven to 350 F"],
  "targetLang": "ES"
}
```

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `texts` | `string[]` | **Sí** | Arreglo con las cadenas de texto que se desean traducir. |
| `targetLang` | `string` | No | Código de idioma de destino (por defecto `"ES"`). |

### Respuestas y Códigos de Estado HTTP

#### 200 OK — Traducción Exitosa o Fallback por Clave No Configurada
```json
{
  "translated": true,
  "texts": ["Pechuga de pollo", "Salsa de soja", "Precalentá el horno a 180°C"]
}
```

Si no se configuró `DEEPL_API_KEY` en las variables de entorno del servidor, el endpoint retorna estado `200` con `translated: false` y los textos en su idioma original junto con el campo `reason`:
```json
{
  "translated": false,
  "texts": ["Chicken Breast", "Soy Sauce", "Preheat oven to 350 F"],
  "reason": "missing_api_key"
}
```

#### 400 Bad Request — Carga Útil Inválida
Se emite si el cuerpo no es un objeto JSON o si el campo `texts` no es un arreglo:
```json
{
  "translated": false,
  "texts": [],
  "reason": "invalid_payload",
  "error": "El campo 'texts' debe ser un arreglo de cadenas."
}
```

#### 405 Method Not Allowed — Método no permitido (en entorno Vercel)
Se emite en `api/translate.ts` si se invoca con métodos distintos a `POST` (como `GET`):
```json
{
  "error": "Método no permitido"
}
```

#### 429 Too Many Requests — Límite de Tasa Excedido
Implementado en `server/translate.ts` (`handleTranslateRequest`) para el servidor Express:
```json
{
  "translated": false,
  "texts": [],
  "reason": "rate_limit_exceeded",
  "error": "Límite de solicitudes de traducción excedido. Intentá nuevamente en un minuto."
}
```

### Valores Posibles del Campo `reason`
- `"missing_api_key"`: No se definió la variable `DEEPL_API_KEY` en el entorno.
- `"invalid_payload"`: El campo `texts` no es un arreglo de cadenas.
- `"rate_limit_exceeded"`: La IP del cliente superó el umbral de 30 req/min.
- `"deepl_status_XXX"`: La API de DeepL retornó un código de error HTTP (ej. `deepl_status_403`).
- `"invalid_response"`: La respuesta de DeepL no contenía la cantidad esperada de traducciones.
- `"network_or_timeout"`: La petición hacia DeepL superó el timeout de 8 segundos o falló la conexión.

---

## 2. Servicios Externos Integrados

### TheMealDB API

| Aspecto | Detalle |
| :--- | :--- |
| **Proveedor** | TheMealDB (base comunitaria abierta de recetas) |
| **Endpoints Utilizados** | 1. Filtro por ingrediente: `GET https://www.themealdb.com/api/json/v1/1/filter.php?i={ingrediente}`<br/>2. Detalle de receta: `GET https://www.themealdb.com/api/json/v1/1/lookup.php?i={idMeal}` |
| **Momento de Invocación** | Al ingresar a la pestaña "Aprovechar por vencer" o al pulsar "Buscar más ideas en la red" en el recetario local. |
| **Caché** | En memoria en `searchMemoryCache` con TTL de 30 minutos indexado por la huella de los 3 ingredientes más urgentes. |
| **Timeout** | `AbortController` con límite de **6 segundos**. |
| **Falla y Modo Offline** | Si no hay conexión o se supera el timeout, el cliente no bloquea la interfaz: conmuta de inmediato a las 12 recetas locales predefinidas (`fallbackRecipes`) e informa con un mensaje no intrusivo. |

### DeepL Translation API

| Aspecto | Detalle |
| :--- | :--- |
| **Proveedor** | DeepL SE |
| **Endpoint Utilizado** | `POST https://api-free.deepl.com/v2/translate` (para claves gratuitas que terminan en `:fx`) o `POST https://api.deepl.com/v2/translate` (cuentas Pro). |
| **Momento de Invocación** | Al abrir el detalle de una receta proveniente de TheMealDB que aún no fue traducida. |
| **Caché** | Dos niveles: 1) En el servidor en `translationCache` con TTL de 24 horas; 2) En el cliente en `localStorage` bajo `freshtrack-recipe-i18n-v1`. |
| **Timeout** | `AbortController` con límite de **8 segundos**. |
| **Falla y Modo Offline** | Si la petición falla o no hay conexión, se muestra la receta con su texto original en inglés marcando `isOriginalEnglish: true`. |

### Open Food Facts API v2

| Aspecto | Detalle |
| :--- | :--- |
| **Proveedor** | Open Food Facts (base colaborativa abierta de alimentos) |
| **Endpoint Utilizado** | `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json` |
| **Momento de Invocación** | Al escanear un código de barras EAN/UPC con la cámara o al ingresar el código numérico en el modal de escaneo. |
| **Caché** | No posee caché en memoria; la información se persiste directamente como un nuevo `StoredProduct` si el usuario confirma el escaneo. |
| **Timeout** | Gestionado por el timeout nativo del navegador para peticiones `fetch`. |
| **Falla y Modo Offline** | Si el producto no existe o se opera sin internet, el escáner notifica que no se encontró el código y permite cargar el nombre y categoría a mano. |

---

## 3. Ejemplos de Invocación con `curl`

### Prueba Local de `/api/translate` (Servidor en puerto 3000)
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Chicken Breast", "Olive Oil", "Garlic"], "targetLang": "ES"}'
```

### Respuesta esperada (con `DEEPL_API_KEY` configurada)
```json
{
  "translated": true,
  "texts": ["Pechuga de pollo", "Aceite de oliva", "Ajo"]
}
```

### Prueba directa de filtro de TheMealDB
```bash
curl -s "https://www.themealdb.com/api/json/v1/1/filter.php?i=chicken_breast"
```

### Prueba directa de código de barras en Open Food Facts (ej. Leche 7790742330800)
```bash
curl -s "https://world.openfoodfacts.org/api/v2/product/7790742330800.json"
```

---

## Enlaces Relacionados
- [Arquitectura del Sistema](02-arquitectura.md)
- [Funcionalidad: Recetas y Aprovechamiento](05-funcionalidades/recetas.md)
- [Funcionalidad: Escaneo OCR y Códigos de Barras](05-funcionalidades/escaneo-ocr-y-codigo-de-barras.md)
- [Despliegue y Hosting](12-despliegue.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
