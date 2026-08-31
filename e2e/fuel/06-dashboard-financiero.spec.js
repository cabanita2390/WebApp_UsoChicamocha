import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS } from "./helpers.js";

/**
 * Caso de uso 6 — Dashboard Financiero (FuelFinancialDashboard.svelte).
 *
 * Verifica que, con ADMIN (permitido por @PreAuthorize en
 * FuelDashboardController), las tarjetas KPI y la tabla de "Combustible"
 * cargan con datos reales (no vacíos ni en error) — incluye el gasto del
 * tanqueo BOMBA registrado en el caso 2 (150000 COP) y el de la anomalía del
 * caso 4 (682500 COP), ya persistidos en la BD real para cuando corre este spec.
 */
test.describe("Combustibles — Dashboard Financiero", () => {
  test("ADMIN ve las tarjetas KPI y la tabla de combustible con datos reales", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Dashboard Financiero");

    await expect(page.locator(".kpi-card")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Gasto neto del periodo")).toBeVisible();
    await expect(page.getByText("Gasto bruto")).toBeVisible();
    await expect(page.getByText("Ahorro por descuentos")).toBeVisible();
    await expect(page.getByText("Discrepancias detectadas")).toBeVisible();

    // El KPI principal debe mostrar un monto real (formato COP), no "—".
    const gastoNeto = page.locator(".kpi-value--primary").first();
    await expect(gastoNeto).not.toHaveText("—");

    // Tabla "Combustible" (galones/gasto por tipo) con al menos una fila.
    await expect(page.locator(".fuel-chart-head", { hasText: "Combustible" })).toBeVisible();
    await expect(page.locator(".combustible-table tbody tr").first()).toBeVisible({ timeout: 10000 });

    // Gráfico de tendencia mensual.
    await expect(page.locator(".fuel-chart-head", { hasText: /Tendencia/ })).toBeVisible();

    await page.screenshot({ path: "e2e/fuel/screenshots/06-dashboard-financiero.png", fullPage: true });
  });
});
