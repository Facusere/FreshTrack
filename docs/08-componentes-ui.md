# Componentes de Interfaz de Usuario

Este documento describe la jerarquía de componentes de FreshTrack a partir de `App.tsx`, detallando las responsabilidades de cada componente en `client/src/components/`, la composición modular de `pages/Home.tsx` y las primitivas accesibles en `components/ui/`.

---

## 1. Jerarquía Global de Componentes

La aplicación organiza sus vistas y contextos de forma jerárquica a partir del punto de entrada `main.tsx`:

```text
main.tsx
└── App.tsx
    ├── ErrorBoundary
    └── ThemeProvider (ThemeContext.tsx)
        └── TooltipProvider
            ├── Toaster (sonner.tsx)
            └── Router (wouter: Switch / Route)
                ├── Route "/" ──> Home.tsx
                │   ├── Navbar de escritorio (Cabecera fija con logo, tema y navegación)
                │   ├── HeroSection.tsx
                │   ├── StatsSection.tsx
                │   ├── PantrySection.tsx
                │   │   ├── ProductRow.tsx (Lista de tarjetas de alimentos)
                │   │   └── WeekCalendar.tsx (Visualización en calendario de 7 días)
                │   ├── RecipesSection.tsx (Tabs "¿Qué puedo cocinar?" y "Por vencer")
                │   ├── ShoppingSection.tsx
                │   │   └── ShoppingListModule.tsx (Gestor de compras y sugerencias)
                │   ├── ReportsSection.tsx (Gráficos Recharts e historial)
                │   ├── MobileBottomNav.tsx (Barra fija inferior móvil con botón central)
                │   │
                │   └── Diálogos y Modales (Montaje condicional)
                │       ├── AddProductModal (Alta manual y edición de alimentos)
                │       ├── ScanModal.tsx (Cámara, OCR, código de barras y revisión)
                │       ├── BackupModal.tsx (Exportación JSON/CSV y restauración)
                │       ├── ConsumptionConfirmDialog.tsx (Confirmación de deducciones)
                │       ├── Diálogo de Detalle de Producto
                │       ├── Diálogo de Detalle de Receta
                │       └── Diálogo de Preferencias de Notificaciones
                │
                └── Route "/404" & comodín ──> NotFound.tsx
```

---

## 2. Composición y Estado en `pages/Home.tsx`

`Home.tsx` opera como la vista principal de la aplicación y concentra el estado raíz del cliente:

### Estados Principales
- `storedProducts: StoredProduct[]`: Fuente de verdad persistida en `freshtrack-products-v3`.
- `products: Product[]`: Arreglo derivado dinámicamente mediante `deriveProduct(item, today)`.
- `shoppingList: ShoppingItem[]`: Estado sincronizado con `freshtrack-shopping-list-v1`.
- `consumptionHistory: ConsumptionRecord[]`: Historial cargado desde `freshtrack-consumption-history-v3`.
- `impactStats: ImpactStats`: Métricas del mes cargadas desde `freshtrack-impact-stats-v1`.
- `pantryView: "list" | "calendar"`: Modo de visualización activo en la despensa.
- `filter`: Filtro de estado (`"all" | "ok" | "soon" | "expired"`).
- `categoryFilter` y `locationFilter`: Filtros por categoría bromatológica y ubicación física.
- `sortBy`: Criterio de ordenamiento (`"expiry-asc" | "expiry-desc" | "name-asc" | "name-desc" | "category"`).
- `search`: Cadena de búsqueda en tiempo real.
- `selectedProductIds: number[]`: Identificadores seleccionados para acciones por lote.
- `activeNav: string`: Sección visible en pantalla detectada por `IntersectionObserver`.

### Efectos Principales (`useEffect`)
1. **`IntersectionObserver` de navegación**: Observa las 5 secciones (`#module-summary`, `#module-pantry`, `#module-recipes`, `#module-shopping`, `#module-reports`) con `rootMargin: "-100px 0px -40% 0px"` y actualiza la píldora activa en el menú superior y en la barra inferior móvil.
2. **Carga y migración inicial**: Lee `loadStoredProducts()`, carga el historial de consumos y la lista de compras al montar el componente.
3. **Persistencia reactiva**: Guarda en `localStorage` cada vez que `storedProducts` o `shoppingList` se modifican.
4. **Verificación de avisos diarios**: Invoca `notifyExpiringProducts(products)` para emitir alertas si hay productos a 1 o 2 días de vencer y aún no se notificó en la jornada.

---

## 3. Módulos y Secciones del Home (`components/home/`)

### `HeroSection.tsx`
- **Props**: `onOpenScan`, `onOpenAdd`, `lastScan`, `today`, `catalogSize`, `products`.
- **Responsabilidad**: Presenta la cabecera visual de la aplicación con fondo degradado botánico, el radar con los 3 alimentos más urgentes y los botones de llamada a la acción principales ("Escanear compra" y "Agregar manual").
- **Dependencia de Estado**: Depende de los alimentos con menor cantidad de días restantes (`radarProducts`).

### `StatsSection.tsx`
- **Props**: `okCount`, `soonCount`, `expiredCount`, `totalTracked`, `soonThresholdDays`.
- **Responsabilidad**: Muestra 3 tarjetas métricas con semáforo cromático (verde, ámbar y rojo carmesí), permitiendo al usuario ver de un vistazo cuántos productos están en fecha, por vencer o vencidos.

### `PantrySection.tsx`
- **Props**: `products`, `storedProducts`, `filteredProducts`, contadores, vista lista/calendario, manejadores de filtros, orden y selección por lote.
- **Responsabilidad**: Contenedor principal de la despensa. Renderiza los controles de búsqueda, filtros de ubicación, la barra de acciones masivas (cuando `selectedIds.length > 0`) y la colección de tarjetas `ProductRow` o el calendario `WeekCalendar`.

### `ProductRow.tsx`
- **Props**: `product`, `onEdit`, `onOpenProduct`, `onQuickConsume`, `isSelected`, `onToggleSelect`.
- **Responsabilidad**: Representa la tarjeta individual de cada alimento. Muestra el icono emoji, nombre, categoría, ubicación, cantidad, días restantes relativos y la insignia de envase abierto. Contiene el menú contextual de acciones (abrir envase, congelar, editar, consumir y eliminar).

### `WeekCalendar.tsx`
- **Props**: `products`, `today`, `onSelectProduct`.
- **Responsabilidad**: Distribuye los alimentos que vencen en los próximos 7 días en columnas diarias de lunes a domingo, facilitando la planificación visual inmediata.

### `RecipesSection.tsx`
- **Props**: `recipes`, `visibleRecipes`, `recipesLoading`, `recipesWarning`, `recipesInfo`, `recipesError`, `recipeFilter`, `setRecipeFilter`, `onOpenRecipeDetail`, `onInitiateConsumption`, `pantryProducts`, `onAddMissingToShoppingList`.
- **Responsabilidad**: Administra las dos pestañas de cocina: "¿Qué puedo cocinar?" (cálculo local con `localRecipes.json` en tiers `ready`, `almost`, `more`) y "Aprovechar por vencer" (recetas externas TheMealDB). Incluye los filtros dietéticos y el botón de búsqueda online.

### `ShoppingSection.tsx`
- **Props**: Envoltorio que conecta el estado global con `ShoppingListModule`.
- **Responsabilidad**: Punto de montaje del módulo de compras dentro del flujo vertical de la página.

### `MobileBottomNav.tsx`
- **Props**: `activeSection`, `onNavigate`, `onOpenScan`.
- **Responsabilidad**: Barra de navegación fija en la parte inferior para pantallas menores a 768px. Incluye accesos directos a Resumen, Despensa y Compras, y un botón circular flotante destacado en el centro para abrir el escáner rápidamente con el pulgar.

---

## 4. Componentes y Modales Principales (`components/`)

### `ScanModal.tsx`
- **Props**: `onClose: () => void`, `onComplete: (products: StoredProduct[]) => void`, `detectIconFn`.
- **Responsabilidad**: Modal integral de captura y digitalización. Controla el flujo de tres etapas: selección de modo/entrada (`stage: "choose"`), escaneo/cámara/OCR (`stage: "scanning"`) y pantalla de revisión de productos detectados (`stage: "results"`). Administra el stream WebRTC de la cámara y la invocación de Tesseract.js.

### `ShoppingListModule.tsx`
- **Props**: `shoppingList`, `setShoppingList`, `pantryProducts`, `consumptionHistory`, `onAddProductsToPantry`, `detectIconFn`.
- **Responsabilidad**: Gestión de la lista de compras. Permite altas manuales, edición de cantidades en línea, carga automática de alimentos con stock bajo en despensa, sugerencias inteligentes por frecuencia de consumo y migración de artículos comprados hacia la despensa.

### `ConsumptionConfirmDialog.tsx`
- **Props**: `isOpen`, `onClose`, `recipeTitle`, `plan: ConsumptionPlan`, `onConfirm: (selected: SelectedDeduction[]) => void`.
- **Responsabilidad**: Diálogo interactivo previo al consumo de una receta. Permite al usuario revisar qué ingredientes se descontarán automáticamente, desmarcar condimentos o ajustar las cantidades antes de aplicar el cambio al inventario.

### `BackupModal.tsx`
- **Props**: `isOpen`, `onClose`, `products`, `storedProducts`, `onRestoreSuccess`.
- **Responsabilidad**: Interfaz para descargar el archivo JSON de copia de seguridad, exportar el inventario en formato CSV para hojas de cálculo o cargar un archivo `.json` para restaurar los datos.

### `ErrorBoundary.tsx`
- **Props**: `children: ReactNode`.
- **Responsabilidad**: Componente de clase de React que intercepta errores no controlados en el árbol de renderizado, evitando pantallas blancas y ofreciendo una vista de contingencia con el volcado del error y un botón para recargar la aplicación.

---

## 5. Primitivas de Interfaz de Usuario (`components/ui/`)

FreshTrack utiliza componentes estilizados con Tailwind CSS v4 siguiendo la arquitectura de shadcn/ui sobre primitivas de Radix UI:

| Componente UI | Primitiva Subyacente | Responsabilidad y Características |
| :--- | :--- | :--- |
| `button.tsx` | `@radix-ui/react-slot` | Botón polimórfico (`asChild`) con variantes gestionadas mediante `class-variance-authority` (default, destructive, outline, secondary, ghost, link) y tamaños (`sm`, `default`, `lg`, `icon`). |
| `card.tsx` | Elementos semánticos HTML (`div`) | Contenedor de superficie con bordes redondeados y sombras suaves (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`). |
| `dialog.tsx` | `@radix-ui/react-dialog` | Ventana modal con control de foco accesible, backdrop oscuro con desenfoque (`backdrop-blur-sm`), animaciones de entrada y soporte para tecla Escape. |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | Contenedor de ayuda flotante que se despliega ante foco o hover con retraso configurado (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`). |
| `sonner.tsx` | `sonner` | Integrador del sistema de notificaciones emergentes Toast con soporte para temas claro/oscuro e iconos temáticos. |

---

## Enlaces Relacionados
- [Estructura del Proyecto](04-estructura-del-proyecto.md)
- [Funcionalidad: Despensa](05-funcionalidades/despensa.md)
- [Funcionalidad: Escaneo OCR](05-funcionalidades/escaneo-ocr-y-codigo-de-barras.md)
- [Diseño y Accesibilidad](13-diseno-y-accesibilidad.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
