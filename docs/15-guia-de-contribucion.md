# Guía de Contribución para Desarrolladores

Este documento establece las directrices de desarrollo, convenciones estilísticas y procedimientos técnicos para incorporar nuevas funcionalidades, alimentos, recetas y reglas de negocio a FreshTrack, asegurando la consistencia y calidad del código fuente.

---

## 1. Convenciones de Código y Estilo

Todo aporte debe adherir estrictamente a los estándares automatizados del repositorio:

- **TypeScript Estricto**: Configurado en `tsconfig.json`. No se admiten variables no utilizadas (`noUnusedLocals: true`, `noUnusedParameters: true`) ni supresiones arbitrarias de tipos (`@ts-ignore` o uso indiscriminado de `any`).
- **Formateo con Prettier**: Fija indentación de 2 espacios, comillas dobles, punto y coma obligatorio y finales de línea `lf`.
  ```bash
  # Formatear automáticamente todo el código
  pnpm format
  ```
- **Localización e Idioma**:
  - Los comentarios en el código, nombres de variables y firmas de funciones se redactan en inglés o español técnico según el archivo.
  - **La interfaz de usuario, mensajes de error, textos de ayuda y notificaciones deben redactarse invariablemente en español rioplatense con voseo** (ej. *"Cargá tus alimentos"*, *"Revisá tu despensa"*, *"Tenés 2 productos por vencer"*).

---

## 2. Guías Paso a Paso para Extender el Sistema

### A. Cómo Agregar un Producto al Catálogo de Vida Útil

Para incorporar un nuevo alimento con duraciones específicas de referencia:
1. Abrí `client/src/lib/shelfLifeCatalog.ts`.
2. Ubicá el arreglo `SPECIFIC_PRODUCTS` en la sección de su categoría bromatológica correspondiente.
3. Agregá una nueva entrada siguiendo la estructura `ShelfLifeEntry`:
   ```typescript
   {
     id: "lacteos-queso-cremoso",
     name: "Queso cremoso",
     category: "Lácteos",
     closedDays: 30,
     openDays: 7,
     aliases: ["queso cuartirolo", "cremoso", "cuartirolo"],
     notes: "ANMAT: 30 días cerrado en frío; consumir dentro de los 7 días de abierto.",
   },
   ```
4. Agregá la prueba unitaria correspondiente en `client/src/tests/shelfLife.test.ts` para verificar que `estimateShelfLife("Queso cremoso", "cerrado")` retorne exactamente los días fijados.

---

### B. Cómo Agregar una Nueva Categoría Bromatológica

Si se requiere crear una nueva categoría de alimentos, deben sincronizarse tres archivos en simultáneo:
1. **Definir la categoría**: En `client/src/lib/categories.ts`, incorporá la cadena al arreglo inmutable `ALL_CATEGORIES`:
   ```typescript
   export const ALL_CATEGORIES = [
     // ... categorías existentes
     "Fermentos y probióticos",
   ] as const;
   ```
2. **Definir los mínimos conservadores**: En `client/src/lib/shelfLifeCatalog.ts`, agregá el registro en `CATEGORY_CONSERVATIVE_MINIMUMS`:
   ```typescript
   export const CATEGORY_CONSERVATIVE_MINIMUMS = {
     // ...
     "Fermentos y probióticos": { closedDays: 14, openDays: 5 },
   };
   ```
3. **Definir la regla de alerta preventiva**: En `client/src/lib/notificationRules.ts`, fijá los días de anticipación de notificación (`1`, `3` o `7` días) en `defaultNotificationPreferences`:
   ```typescript
   categoryLeadDays: {
     // ...
     "Fermentos y probióticos": 3,
   }
   ```

---

### C. Cómo Agregar una Receta al Catálogo Local

Para sumar una preparación al recetario sin conexión:
1. Abrí `client/src/data/localRecipes.json`.
2. Agregá un nuevo objeto JSON al final del arreglo respetando el formato `LocalRecipe`:
   ```json
   {
     "id": "tarta-calabaza-choclo",
     "name": "Tarta de calabaza y choclo",
     "category": "Tartas y empanadas",
     "ingredients": [
       { "name": "calabaza", "quantity": "500 g cocida" },
       { "name": "choclo", "quantity": "1 lata o 2 choclos" },
       { "name": "huevos", "quantity": "2 unidades" },
       { "name": "queso", "quantity": "100 g rallado" },
       { "name": "masa para tarta", "quantity": "1 tapa" }
     ],
     "instructions": [
       "Hacé un puré bien seco con la calabaza cocida.",
       "Mezclá el puré con el choclo desgranado, los huevos batidos y el queso.",
       "Volcá el relleno sobre la masa de tarta en una tartera aceitada.",
       "Horneá a 190°C durante 35 minutos hasta que la masa esté dorada y el ligue firme."
     ],
     "tags": ["vegetariano", "almuerzo", "económico"]
   }
   ```
3. Ejecutá `pnpm test` para certificar que `localRecipes.test.ts` valide el parseo y cálculo de *tiers* del nuevo plato.

---

### D. Cómo Agregar o Modificar una Regla de Notificación

1. Abrí `client/src/lib/notificationRules.ts`.
2. Si deseás modificar el comportamiento de agrupación o agregar un nuevo tipo de resumen, extendé la función `groupNotifications()` o `buildWeeklySummary()`.
3. Para ajustar qué productos califican como accionables, modificá el predicado de filtro:
   ```typescript
   const actionable = items.filter((item) => {
     if (item.status === "expired") return true;
     if (item.state === "abierto" && item.days <= 2) return true;
     const leadDays = preferences.categoryLeadDays[item.category] || 3;
     return item.days <= leadDays;
   });
   ```

---

## 3. Flujo de Trabajo y Ciclo de Vida de un Cambio

1. **Crear una rama temática (*feature branch*)**:
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```
2. **Implementar los cambios respetando la regla de no modificar el contrato de datos sin migración**:
   Si alterás el esquema de `StoredProduct`, debés proveer una función de migración hacia atrás en `client/src/lib/storage.ts`.
3. **Escribir o actualizar pruebas unitarias**:
   Cada nueva regla o función debe acompañarse de su correspondiente test en `client/src/tests/`.

---

## 4. Checklist Obligatorio Previo a un Pull Request (PR)

Antes de solicitar la revisión de tu código o fusionar a la rama principal, verificá que los cuatro comandos de control pasen exitosamente:

```bash
# 1. Comprobación estricta de tipado (cero errores)
pnpm check

# 2. Suite de pruebas unitarias y de integración (todos los tests verdes)
pnpm test

# 3. Suite End-to-End y accesibilidad Axe en navegador
pnpm test:e2e

# 4. Formateo y reglas de estilo Prettier
pnpm format
```

### Lista de Control Final
- [ ] No se comitearon claves de API reales ni secretos en `.env`.
- [ ] No se comitearon artefactos de compilación (`dist/` o `test-results/`).
- [ ] Todos los textos visibles por el usuario están en español rioplatense con voseo.
- [ ] Las fechas se calculan usando hora local y no cadenas UTC directas.
- [ ] Ninguna función en `shelfLifeCatalog.ts` alarga la vida útil al abrir un envase.
- [ ] Las nuevas dependencias se instalaron estrictamente mediante `pnpm`.

---

## Enlaces Relacionados
- [Estructura del Proyecto](04-estructura-del-proyecto.md)
- [Suite de Pruebas](11-testing.md)
- [Limitaciones y Deuda Técnica](14-limitaciones-y-deuda-tecnica.md)
- [Glosario de Términos](glosario.md)
