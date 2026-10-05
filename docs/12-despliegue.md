# Despliegue y Operaciones (Deployment)

Este documento describe los dos modos de despliegue admitidos por FreshTrack: la ejecución tradicional basada en contenedores o máquinas virtuales con Node.js y Express, y el despliegue serverless optimizado en la plataforma Vercel, incluyendo las variables de entorno, encabezados HTTP del Service Worker y las consideraciones de estado en memoria.

---

## 1. Modo 1: Servidor Node.js Tradicional (Express)

Este modo es el predeterminado para entornos con Docker, Kubernetes, máquinas virtuales Linux o plataformas PaaS tipo Render, Fly.io, Railway o AWS ECS.

### Proceso de Compilación y Arranque
El script de compilación ejecuta dos etapas encadenadas:
```bash
# 1. Compilar frontend y empaquetar servidor Node
pnpm build

# 2. Iniciar el servidor de producción
pnpm start
```

### Detalle del Comando `pnpm build`
```bash
vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```
1. **`vite build`**: Compila el cliente React 19, procesa Tailwind CSS v4, genera los hashes estáticos de producción y emite el Service Worker con Workbox hacia `dist/public`.
2. **`esbuild server/index.ts ...`**: Empaqueta el archivo TypeScript del servidor en un único archivo JavaScript ESM (`dist/index.js`), manteniendo las dependencias externas (como Express) sin incrustar (`--packages=external`).

### Servidor de Producción (`server/index.ts`)
- Inicia Express 5 en el puerto especificado por `process.env.PORT || 3000`.
- Sirve los archivos estáticos desde `dist/public` con resolución de rutas relativas seguras (`path.resolve(__dirname, "public")` o `dist/public`).
- Inyecta los encabezados obligatorios de PWA para `/sw.js` y `/manifest.json`.
- Responde a `POST /api/translate` invocando `handleTranslateRequest()`.
- Implementa el fallback SPA: cualquier ruta GET no coincidente con un archivo físico devuelve `dist/public/index.html`.

---

## 2. Modo 2: Despliegue Serverless en Vercel

FreshTrack está configurado para desplegarse de manera nativa en Vercel sin necesidad de correr el servidor Node de Express.

### Configuración en `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" },
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Content-Type", "value": "application/javascript" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Mecanismo de Funcionamiento en Vercel
1. **Build**: Vercel detecta el framework Vite y ejecuta `vite build`, depositando los activos estáticos en `dist/public`.
2. **Función Serverless**: El archivo `api/translate.ts` es detectado automáticamente por la infraestructura de Vercel y expuesto como un endpoint serverless bajo la ruta `/api/translate`.
3. **Ruteo y Rewrites**: La regla de reescritura `/((?!api/).*)` asegura que cualquier URL de la aplicación (como `/404` o rutas futuras) sea atendida por el `index.html` del cliente, mientras que las solicitudes dirigidas a `/api/translate` son despachadas a la función serverless.

---

## 3. Encabezados HTTP Críticos del Service Worker

Tanto en Express (`server/index.ts`) como en Vercel (`vercel.json`), la entrega de los archivos de PWA exige encabezados HTTP estrictos para cumplir con las especificaciones del W3C:

| Archivo | Encabezado HTTP | Valor Requerido | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| `/sw.js` | `Service-Worker-Allowed` | `/` | Permite que el Service Worker ubicado en la raíz controle todo el alcance (*scope*) de la aplicación, sin restringirse a subdirectorios. |
| `/sw.js` | `Cache-Control` | `no-cache, no-store, must-revalidate` | Impide que intermediarios o cachés de proxy congelen el script del Service Worker, permitiendo que el navegador detecte actualizaciones de código byte a byte. |
| `/sw.js` | `Content-Type` | `application/javascript` | Tipo MIME estricto requerido por los motores de renderizado para registrar trabajadores web. |
| `/manifest.json` | `Content-Type` | `application/manifest+json` | Tipo MIME canónico para el análisis del manifiesto de instalación PWA. |

---

## 4. Variables de Entorno en Producción

Al configurar el panel de control de tu proveedor de hosting (Vercel, Render, Railway, etc.), debés definir las siguientes variables:

| Variable | ¿Requerida? | Valor de Ejemplo | Descripción |
| :--- | :---: | :--- | :--- |
| `DEEPL_API_KEY` | No | `f63c...:fx` | Clave de API de DeepL para la traducción al español rioplatense de las recetas de TheMealDB. Si no se configura, la aplicación funciona con normalidad pero exhibe recetas online en inglés. |
| `PORT` | No | `3000` | Puerto TCP en el que escucha el servidor Node.js en Express (ignorado en Vercel). |
| `NODE_ENV` | No | `production` | Define el entorno de ejecución de Node.js. |

---

## 5. Consideraciones y Limitaciones en Entornos Serverless

Al optar por el despliegue serverless en Vercel, es importante comprender las siguientes características arquitectónicas del código:

1. **Estado en Memoria no Persistente**:
   - En `server/translate.ts`, el control de tasa (`ipRateLimits`) y la caché de traducción (`translationCache`) residen en estructuras `Map` en la memoria RAM del proceso.
   - En plataformas serverless como Vercel o AWS Lambda, las instancias se crean y destruyen bajo demanda y no comparten memoria entre ejecuciones concurrentes. Como consecuencia, el límite de 30 req/min no se aplica globalmente entre distintas funciones y la caché en memoria se pierde ante inicios en frío (*cold starts*).
   - *Nota de mitigación*: El cliente frontend cuenta con su propia caché persistente en `localStorage` (`freshtrack-recipe-i18n-v1`), por lo que un usuario en su navegador rara vez vuelve a solicitar la misma traducción al servidor.
2. **Ausencia de Rate Limit en `api/translate.ts`**:
   - La función serverless `api/translate.ts` importa `performTranslation` directamente y no invoca `isRateLimited(ip)`, delegando el control de abuso en los mecanismos de protección de borde de la plataforma de hosting.

---

## Enlaces Relacionados
- [Arquitectura del Sistema](02-arquitectura.md)
- [Instalación y Entorno](03-instalacion-y-entorno.md)
- [PWA y Capacidades Offline](10-pwa-y-offline.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
