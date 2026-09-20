import { test, expect } from "playwright/test";

const baseURL = process.env.FRESHTRACK_URL || "http://127.0.0.1:3000";

test("abre una receta, confirma aprovechamiento y actualiza la despensa", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });

  await expect(page.getByText("Recetas con lo que vence primero.")).toBeVisible();
  await expect(page.getByText("Espinaca al curry de Botswana")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: /Cargar más/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Cargar más/ }).click();
  await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(6);
  await page.getByTestId("recipe-card").first().dispatchEvent("click");

  await expect(page.locator("p").filter({ hasText: /^Ingredientes$/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Paso a paso")).toBeVisible();
  await page.getByTestId("consume-recipe").click();

  await expect(page.getByRole("status")).toContainText("Ingredientes aprovechados");
  await expect(page.getByRole("status")).toContainText("Espinaca fresca");
  await expect(page.getByText("23", { exact: true })).toBeVisible();
  await context.close();
});
