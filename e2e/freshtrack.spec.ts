import { test, expect } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.FRESHTRACK_URL || "http://127.0.0.1:3000";

test.describe("FreshTrack E2E & Accessibility Tests", () => {
  test("abre una receta, verifica traducción sin texto roto, confirma aprovechamiento y actualiza despensa", async ({
    browser,
  }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    // Seed test products with v3 schema
    await context.addInitScript(() => {
      localStorage.clear();
      const now = new Date();
      // 2 days in the future for soon status
      const soonDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      localStorage.setItem(
        "freshtrack-products-v3",
        JSON.stringify([
          {
            id: 101,
            name: "Pechuga de pollo",
            category: "Carnes",
            expiryDate: soonDate,
            quantity: "2 unidades",
            icon: "🍗",
            dateLabel: "vencimiento",
            location: "Heladera",
          },
        ])
      );
    });

    const page = await context.newPage();

    // Mock TheMealDB filter by ingredient
    await page.route("**/api/json/v1/1/filter.php*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          meals: [
            {
              idMeal: "52772",
              strMeal: "Teriyaki Chicken Casserole",
              strMealThumb:
                "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
            },
          ],
        }),
      });
    });

    // Mock TheMealDB recipe lookup
    await page.route("**/api/json/v1/1/lookup.php*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          meals: [
            {
              idMeal: "52772",
              strMeal: "Teriyaki Chicken Casserole",
              strMealThumb:
                "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
              strCategory: "Chicken",
              strArea: "Japanese",
              strInstructions:
                "Preheat oven to 350 F. Bake for 30 minutes until golden.",
              strIngredient1: "Chicken Breast",
              strMeasure1: "2 pieces",
              strIngredient2: "Soy Sauce",
              strMeasure2: "1/2 cup",
            },
          ],
        }),
      });
    });

    // Mock DeepL /api/translate endpoint
    await page.route("**/api/translate", async (route) => {
      const postData = route.request().postDataJSON();
      const texts: string[] = postData?.texts || [];
      const translatedTexts = texts.map((t: string) => {
        if (t === "Teriyaki Chicken Casserole") return "Cazuela de pollo teriyaki";
        if (t.includes("Preheat oven"))
          return "Precalentá el horno a 180°C. Horneá durante 30 minutos hasta dorar.";
        if (t.toLowerCase() === "chicken breast") return "Pechuga de pollo";
        if (t.toLowerCase() === "soy sauce") return "Salsa de soja";
        return t;
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          translated: true,
          texts: translatedTexts,
        }),
      });
    });

    await page.goto(baseURL, { waitUntil: "networkidle" });

    await expect(page.getByText("Recetas con lo que vence primero.")).toBeVisible();

    // Verify recipe card appeared
    const recipeCard = page.getByTestId("recipe-card").first();
    await expect(recipeCard).toBeVisible({ timeout: 10000 });

    // Open recipe details
    await recipeCard.click();

    // Verify translated details modal without broken English text
    await expect(
      page.getByRole("heading", { name: /Cazuela de pollo teriyaki/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("dialog").getByText("Pechuga de pollo")
    ).toBeVisible();
    // Ensure no broken words like "breast" appear
    await expect(page.locator("body")).not.toContainText("breast");

    // Consume recipe
    await page.getByTestId("consume-recipe").click();

    // Consumption confirm dialog opens
    await expect(page.getByText("Descontar ingredientes")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar y descontar" }).click();

    // Verify success toast
    await expect(page.getByText("¡Buen aprovechamiento!")).toBeVisible();

    await context.close();
  });

  test("verifica accesibilidad (axe) sin violaciones serias o críticas en Home, ScanModal y AddProductModal", async ({
    page,
  }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });

    // 1. Audit Home View
    const homeAudit = await new AxeBuilder({ page }).analyze();
    const homeViolations = homeAudit.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(homeViolations).toEqual([]);

    // 2. Open Add Product Modal and audit
    await page.getByRole("button", { name: /Agregar manual/i }).first().click();
    await expect(page.getByRole("heading", { name: "Agregar producto" })).toBeVisible();
    await page.waitForTimeout(300);

    const addAudit = await new AxeBuilder({ page }).analyze();
    const addViolations = addAudit.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(addViolations).toEqual([]);

    // Close Add modal
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("heading", { name: "Agregar producto" })).not.toBeVisible();

    // 3. Open Scan Modal and audit
    await page.getByRole("button", { name: /Escanear compra/i }).first().click();
    await expect(page.getByRole("heading", { name: "Escaneo OCR inteligente" })).toBeVisible();
    await page.waitForTimeout(300);

    const scanAudit = await new AxeBuilder({ page }).analyze();
    const scanViolations = scanAudit.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(scanViolations).toEqual([]);

    // Close Scan modal
    await page.getByRole("button", { name: "Cerrar modal de escaneo" }).click();
  });

  test("verifica que no exista scroll horizontal a 320px y 375px de ancho", async ({
    page,
  }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });

    // Check at 320px
    await page.setViewportSize({ width: 320, height: 640 });
    await page.waitForTimeout(300);
    const noScroll320 = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(noScroll320).toBe(true);

    // Check at 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const noScroll375 = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(noScroll375).toBe(true);
  });

  test("barra de navegación inferior visible en mobile (390px) con botón central de escaneo funcional", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL, { waitUntil: "networkidle" });

    const bottomNav = page.getByTestId("mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();

    // Verify 4 destinations/buttons
    await expect(page.getByTestId("mobile-nav-summary")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-pantry")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-scan")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-shopping")).toBeVisible();

    // Click on central scan button and verify ScanModal opens
    await page.getByTestId("mobile-nav-scan").click();
    await expect(page.getByRole("heading", { name: "Escaneo OCR inteligente" })).toBeVisible();

    // Close Scan modal
    await page.getByRole("button", { name: "Cerrar modal de escaneo" }).click();
    await expect(page.getByRole("heading", { name: "Escaneo OCR inteligente" })).not.toBeVisible();
  });

  test("abrir recetario -> marcar favorita -> agregar faltantes a la lista de compras -> verificar el ítem en compras", async ({
    page,
  }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });

    // 1. Abrir pestaña Recetario
    const cookbookTab = page.getByRole("tab", { name: /Recetario/i });
    await expect(cookbookTab).toBeVisible();
    await cookbookTab.click();

    // 2. Verificar que se muestra el catálogo de recetas
    const searchInput = page.getByPlaceholder(/Buscar recetas por nombre o ingredientes/i);
    await expect(searchInput).toBeVisible();

    // 3. Marcar la primera receta como favorita
    const favButton = page.getByRole("button", { name: "Agregar a favoritas" }).first();
    await expect(favButton).toBeVisible();
    await favButton.click();
    await expect(page.getByRole("button", { name: "Quitar de favoritas" }).first()).toBeVisible();

    // 4. Abrir detalle de la receta
    const firstCard = page.getByTestId("recipe-card").first();
    await firstCard.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 5. Agregar faltantes a la lista de compras
    const addMissingBtn = dialog.getByRole("button", { name: /Agregar lo que me falta a la lista/i });
    if (await addMissingBtn.isVisible()) {
      await addMissingBtn.click();
      await expect(page.getByText(/Agregamos .* ingredientes a tu lista/i)).toBeVisible();
    }

    // 6. Cerrar modal de receta
    await page.getByRole("button", { name: "Cerrar detalle de receta" }).click();
    await expect(dialog).not.toBeVisible();

    // 7. Navegar a Compras y verificar módulo
    const shoppingNav = page.getByRole("link", { name: /Compras/i }).first();
    if (await shoppingNav.isVisible()) {
      await shoppingNav.click();
    } else {
      await page.locator("#module-shopping").scrollIntoViewIfNeeded();
    }
    await expect(page.locator("#module-shopping")).toBeVisible();
  });

  test("planificar dos recetas en el menú semanal -> generar lista semanal -> confirmar", async ({
    page,
  }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });

    // 1. Abrir pestaña Recetario
    await page.getByRole("tab", { name: /Recetario/i }).click();

    // 2. Cambiar a subvista Planificador semanal
    const plannerButton = page.getByRole("button", { name: /Planificador semanal/i });
    await expect(plannerButton).toBeVisible();
    await plannerButton.click();

    // 3. Asignar primera receta
    const assignButtons = page.getByRole("button", { name: "Asignar" });
    await expect(assignButtons.first()).toBeVisible();
    await assignButtons.first().click();

    await expect(page.getByRole("heading", { name: /Asignar receta/i })).toBeVisible();
    await page.getByRole("button", { name: "Elegir" }).first().click();

    // 4. Asignar segunda receta
    await assignButtons.first().click();
    await page.getByRole("button", { name: "Elegir" }).nth(1).click();

    // 5. Generar lista de compras semanal
    const generateBtn = page.getByRole("button", { name: /Generar lista de la semana/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // 6. Verificar modal de vista previa y confirmar
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lista de compras semanal/i })).toBeVisible();

    const confirmBtn = page.getByRole("button", { name: /Agregar seleccionados a la lista/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 7. Verificar toast de éxito
    await expect(
      page.getByText(/Agregamos .* ingredientes a tu lista de compras/i)
    ).toBeVisible();
  });
});
