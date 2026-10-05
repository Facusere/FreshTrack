# Diseño, Tokens y Accesibilidad

Este documento detalla el sistema de diseño de FreshTrack, su paleta de tokens semánticos en Tailwind CSS v4, el soporte para temas claro y oscuro, la tipografía, la adaptabilidad móvil, los estándares de accesibilidad WCAG 2.1 y la retroalimentación sensorial (auditiva y háptica).

---

## 1. Filosofía Estética y Paleta Botánica

FreshTrack implementa una dirección de arte denominada *Botanical Culinary Canvas*, inspirada en ingredientes frescos, tonos orgánicos de huerta y superficies limpias de cocina. En lugar de colores primarios saturados genéricos, utiliza una gama refinada de esmeraldas, tonos ámbar miel, carmesí apagado y blancos tiza con sombras difusas.

---

## 2. Tokens Semánticos de Diseño (`client/src/index.css`)

Con la llegada de Tailwind CSS v4, los tokens se configuran mediante la directiva `@theme inline` y variables CSS conmutables:

### Tokens de Superficie y Contenido
- `--color-surface`: Fondo principal de tarjetas elevadas (`#ffffff` en tema claro, `#112318` en tema oscuro).
- `--color-surface-subtle`: Fondo de soporte para secciones secundarias (`#f8f9f8` / `#0a1710`).
- `--color-surface-muted`: Superficies neutras para campos de entrada y contenedores deshabilitados (`#f1f4f2` / `#162d1f`).
- `--color-content-heading`: Títulos de alto contraste y legibilidad (`#111613` / `#f1fbf4`).
- `--color-content-body`: Texto estándar de párrafos y etiquetas (`#2c3530` / `#d8e8dc`).
- `--color-content-muted`: Texto secundario de fecha, ubicación y badges (`#526057` / `#94aa9a`).

### Semáforo Semántico de Estado Bromatológico

| Estado | Token de Fondo | Token de Texto | Token de Borde / Punto | Significado Funcional |
| :--- | :--- | :--- | :--- | :--- |
| **`ok`** | `--color-status-ok-bg` (`#edf4ef` / `#0d281a`) | `--color-status-ok-text` (`#1a4234` / `#4ade80`) | `--color-status-ok-dot` (`#10b981`) | Alimento en fecha segura (> 3 días restantes). |
| **`soon`** | `--color-status-soon-bg` (`#fdf8ed` / `#2d1f05`) | `--color-status-soon-text` (`#7a4d0c` / `#fbbf24`) | `--color-status-soon-dot` (`#f59e0b`) | Alimento por vencer en breve (0 a 3 días restantes). |
| **`expired`** | `--color-status-expired-bg` (`#fdf2f0` / `#2d0a08`) | `--color-status-expired-text` (`#8e2b20` / `#f87171`) | `--color-status-expired-dot` (`#ef4444`) | Alimento caducado (fecha límite anterior a hoy). |
| **`open`** | `--color-status-open-bg` (`#eff6ff` / `#081c3b`) | `--color-status-open-text` (`#1e40af` / `#60a5fa`) | `--color-status-open-dot` (`#3b82f6`) | Envase abierto; requiere prioridad de consumo en frío. |

---

## 3. Modo Claro y Oscuro (`ThemeContext.tsx`)

El soporte de tema está provisto por `ThemeProvider` en `client/src/contexts/ThemeContext.tsx`:
1. **Detección y Persistencia**: Lee la preferencia del usuario desde `localStorage.getItem("theme")` (por defecto `"light"`).
2. **Aplicación en el DOM**: Agrega o remueve la clase `.dark` sobre el elemento raíz `document.documentElement` (`<html>`).
3. **Variante Tailwind**: `index.css` define `@custom-variant dark (&:where(.dark, .dark *));`, asegurando que todas las clases con prefijo `dark:` reaccionen de inmediato al conmutar el interruptor en la cabecera.

---

## 4. Tipografía y Jerarquía Visual

La aplicación carga dos familias tipográficas desde Google Fonts en `client/index.html`:

1. **Plus Jakarta Sans** (`font-display`, pesos 500, 600, 700, 800): Tipografía geométrica y moderna con gran personalidad, empleada exclusivamente en títulos principales, cabeceras de sección, números de impacto y nombres de recetas.
2. **Inter** (`font-sans`, pesos 400, 500, 600, 700): Tipografía de alta legibilidad en pantallas de cualquier resolución, utilizada para párrafos, tablas, campos de formulario, botones y detalles técnicos.

---

## 5. Diseño Adaptativo y Navegación Móvil

FreshTrack está optimizado bajo el paradigma *mobile-first*:
- **Viewport Estricto**: No genera desplazamiento horizontal en anchos extremos de **320 px** (iPhone SE de primera generación) y **375 px** (validado en la suite de pruebas E2E `freshtrack.spec.ts`).
- **Navegación Móvil Dedicada (`MobileBottomNav.tsx`)**: En pantallas menores a 768 px, la barra de navegación superior se simplifica y se activa una barra fija en la base con área táctil cómoda para el pulgar, destacando el botón central de escaneo flotante con halo de sombra.
- **Micro-interacciones y Animaciones**: Utiliza animaciones sutiles definidas en `@keyframes` (`freshtrack-float`, `freshtrack-pop`, `freshtrack-success`) para retroalimentar la carga de datos sin saturar al usuario.

---

## 6. Accesibilidad (WCAG 2.1 AA)

La calidad de acceso se audita de forma continua:
1. **Auditoría Cromática (`contrast.test.ts`)**: Calcula por software la luminancia relativa y ratio de contraste de cada token de color. Todas las combinaciones de texto y fondo cumplen con el estándar WCAG AA ($> 4.5:1$ en texto normal) y la mayoría supera el estándar AAA ($> 7:1$).
2. **Auditoría de Árbol DOM con Axe-core (`freshtrack.spec.ts`)**: Las pruebas automatizadas analizan la página principal y los modales abiertos (`AddProductModal`, `ScanModal`), exigiendo **cero violaciones serias o críticas**.
3. **Gestión de Foco y Teclado**: Los modales construidos con Radix UI atrapan el foco mientras están abiertos, devuelven el foco al elemento disparador al cerrarse y admiten cierre mediante tecla `Escape`.
4. **Contingencia ante Errores (`ErrorBoundary.tsx`)**: Si un componente React arroja una excepción en tiempo de renderizado, la pantalla no se rompe; se exhibe una interfaz de contención con detalles técnicos y un botón de reinicio.

---

## 7. Retroalimentación Sensorial (`client/src/lib/feedback.ts`)

Para brindar una sensación de aplicación nativa (*app-like*), FreshTrack implementa estímulos auditivos y táctiles:

### Síntesis Web Audio (Chimes Offline)
La función `playChimeSound(type)` genera tonos musicales sintéticos mediante osciladores Web Audio API, funcionando de forma 100% desconectada y sin descargar archivos MP3:
- `"success"` / `"scan"`: Acorde ascendente de tercera mayor ($523.25\text{ Hz } [\text{C5}] \rightarrow 659.25\text{ Hz } [\text{E5}]$) con decaimiento exponencial suave en 350 ms.
- `"pop"`: Salto breve de onda triangular ($440\text{ Hz} \rightarrow 880\text{ Hz}$) de 180 ms para selecciones y conmutadores.
- `"delete"`: Tono descendente de baja frecuencia ($320\text{ Hz} \rightarrow 200\text{ Hz}$) de 250 ms para eliminaciones de alimentos.

### Vibración Háptica
La función `triggerHaptic(pattern)` invoca la API `navigator.vibrate([30, 20, 30])` en dispositivos móviles compatibles, confirmando físicamente al usuario que su acción de escaneo o confirmación fue registrada.

---

## Enlaces Relacionados
- [Componentes de UI](08-componentes-ui.md)
- [PWA y Capacidades Offline](10-pwa-y-offline.md)
- [Suite de Pruebas](11-testing.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
