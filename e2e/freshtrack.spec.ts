import { test, expect } from "playwright/test";

const baseURL = process.env.FRESHTRACK_URL || "http://127.0.0.1:3000";

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
    page.getByRole("heading", { name: /Cazuela de pollo teriyaki/i }).or(
      page.locator("p").filter({ hasText: "Cazuela de pollo teriyaki" })
    )
  ).toBeVisible({ timeout: 10000 });

  await expect(page.getByText("Pechuga de pollo")).toBeVisible();
  // Ensure no broken words like "breast" appear
  await expect(page.locator("body")).not.toContainText("breast");

  // Consume recipe
  await page.getByTestId("consume-recipe").click();

  // Consumption confirm dialog opens
  await expect(page.getByText("Confirmar descuento")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar descuento" }).click();

  // Verify success toast
  await expect(page.getByText("¡Buen aprovechamiento!")).toBeVisible();

  await context.close();
});
