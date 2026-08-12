import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_VEHICLE_PLACA } from "./helpers.js";

/**
 * Caso de uso 2 — Tanqueo tipo BOMBA para el vehículo QA (QAT001).
 *
 * Flujo real: TanqueoDistribucion.svelte -> botón "+ Registrar tanqueo" ->
 * RefuelingFormModal.svelte (assetEditable=true, lugar por defecto se
 * autoajusta a BOMBA al elegir tipo Vehículo) -> submit -> data.createRefueling
 * (POST /api/v1/fuel/refueling, multipart) -> el modal se cierra y
 * handleFiltrar() recarga el reporte -> la fila debe aparecer en la tabla.
 */
test.describe("Combustibles — Tanqueo tipo BOMBA (vehículo QAT001)", () => {
  test("ADMIN registra un tanqueo BOMBA para QAT001 y aparece en el resumen de Tanqueo y Distribución", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);

    // Pestaña "Tanqueo y Distribución" es la que carga por defecto (fuelActiveTab).
    await goToFuelTab(page, "Tanqueo y Distribución");

    await page.locator(".btn-registrar").click();
    await expect(page.locator("#tipoElemento")).toBeVisible();

    // Tipo de elemento -> Vehículo (dispara el auto-ajuste de lugar a BOMBA).
    await page.locator("#tipoElemento").selectOption("VEHICULO");
    await expect(page.locator("#lugar")).toHaveValue("BOMBA");

    // Buscador de activo: enfocar despliega la lista completa, escribir filtra.
    const buscador = page.getByLabel("Buscar vehículo");
    await buscador.click();
    await buscador.fill(QA_VEHICLE_PLACA);
    await page.getByRole("button", { name: new RegExp(QA_VEHICLE_PLACA) }).first().click();

    await page.locator("#fuelTypeId").selectOption({ label: "Gasolina corriente" });
    await page.locator("#cantidadGalones").fill("15");
    await page.locator("#horometroKm").fill("1050");
    await page.locator("#precioUnitario").fill("10000");
    await page.locator("#totalIngresado").fill("150000");
    await page.locator("#origen").fill("Estación QA E2E");

    await page.locator(".btn-create").click();

    // El modal se cierra tras un submit exitoso (evento "success").
    await expect(page.locator("#tipoElemento")).toHaveCount(0, { timeout: 10000 });

    // La fila debe aparecer en el resumen (pestaña "Estación" = VEHICULO, activa
    // por defecto) con la cantidad registrada.
    await expect(page.getByText(QA_VEHICLE_PLACA).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("15 gal").first()).toBeVisible();

    await page.screenshot({ path: "e2e/fuel/screenshots/02-tanqueo-bomba-registrado.png", fullPage: true });

    // Verifica el historial completo del activo (botón "Ver historial" de la fila).
    await page.getByRole("button", { name: "Ver historial" }).first().click();
    await page.waitForURL(/\/fuel-history\/VEHICULO\/\d+/);
    // "Historial de tanqueos" matchea 2 elementos (el <h2> genérico de la
    // sección y el título "Historial de tanqueos QAT001" de esta vista) —
    // se acota al heading específico del activo para evitar el strict mode
    // violation de Playwright.
    await expect(page.getByRole("heading", { name: /Historial de tanqueos/ })).toBeVisible();
    await expect(page.getByText("15 gal").first()).toBeVisible();

    await page.screenshot({ path: "e2e/fuel/screenshots/02-tanqueo-bomba-en-historial.png", fullPage: true });
  });
});
