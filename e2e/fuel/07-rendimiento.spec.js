import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_VEHICLE_PLACA, QA_MACHINE_CODE } from "./helpers.js";

/**
 * Caso de uso 7 — Rendimiento (FuelPerformance.svelte).
 *
 * La tabla de Rendimiento Operativo solo muestra un activo si tiene "línea
 * base y consumo configurado" en el rango filtrado (mensaje real de la propia
 * vista cuando no hay filas). QAT001 y QA-MAQ-001 sí tienen asset_fuel_config
 * (consumo estándar sembrado en el contexto de la tarea), así que deberían
 * aparecer — pero el cálculo de "Ejecutado/Proyectado/Real" depende también de
 * tener un horómetro/km anterior con el que comparar (columna "Último (B)"),
 * que puede no existir todavía para estos activos QA recién creados. Este
 * spec documenta el comportamiento real observado, sea cual sea, en vez de
 * forzar un resultado.
 */
test.describe("Combustibles — Rendimiento", () => {
  test("ADMIN abre Rendimiento y se documenta el estado real para los activos QA", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Rendimiento");

    await expect(page.locator(".fuel-chart-head", { hasText: "Rendimiento Operativo" })).toBeVisible({ timeout: 10000 });

    // Pestaña "Vehículos" para buscar QAT001.
    await page.getByRole("button", { name: /^Vehículos/ }).click();
    await page.waitForTimeout(1000);
    const filaVehiculo = page.locator("tr", { hasText: QA_VEHICLE_PLACA });
    const tieneLineaBaseVehiculo = (await filaVehiculo.count()) > 0;
    await page.screenshot({ path: "e2e/fuel/screenshots/07-rendimiento-vehiculos.png", fullPage: true });

    // Pestaña "Maquinaria" para buscar QA-MAQ-001 (identificacionActivo puede
    // mostrar el num_inter_identification o el nombre — se acepta cualquiera).
    await page.getByRole("button", { name: /^Maquinaria/ }).click();
    await page.waitForTimeout(1000);
    const filaMaquina = page
      .locator("tr", { hasText: QA_MACHINE_CODE })
      .or(page.locator("tr", { hasText: "Qa Maquina 001" }));
    const tieneLineaBaseMaquina = (await filaMaquina.count()) > 0;
    await page.screenshot({ path: "e2e/fuel/screenshots/07-rendimiento-maquinaria.png", fullPage: true });

    // No se afirma un resultado fijo: se deja constancia en el propio test
    // (visible en el reporte de Playwright) de si cada activo QA ya tiene
    // línea base suficiente para aparecer en Rendimiento.
    test.info().annotations.push({
      type: "estado-real-observado",
      description: `QAT001 con línea base en Rendimiento: ${tieneLineaBaseVehiculo}. QA-MAQ-001 con línea base en Rendimiento: ${tieneLineaBaseMaquina}.`,
    });

    // La vista en sí debe cargar sin error (loader desaparece, no hay excepción
    // no controlada) independientemente de si hay filas para estos activos.
    await expect(page.locator(".fuel-loader")).toHaveCount(0);
  });
});
