import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_VEHICLE_PLACA } from "./helpers.js";

/**
 * Caso de uso 4 — Detección de anomalías en la UI.
 *
 * Umbrales confirmados leyendo
 * back/.../fuel/FuelAnomalyDetectionE2ETest.java:
 * - cantidadFueraDeRango (vehículo no-moto): cantidad > 60 gal.
 * - capacidadExcedida: cruza con asset_fuel_config.tanque_capacidad_gal.
 *   QAT001 (id=31) está configurado con capacidad 60 gal (confirmado por
 *   consulta directa a asset_fuel_config en la BD real) — un tanqueo de 65 gal
 *   dispara AMBAS anomalías a la vez (cantidad > 60 típico Y > 60 configurado).
 *
 * El DataGrid ya soporta el resaltado de fila anómala (isAnomaly -> clase
 * "anomaly-row", ver components/shared/DataGrid.svelte) y la columna
 * "Discrepancia" (config/table-definitions/fuel.js) lista cada motivo con su
 * valor de referencia.
 */
test.describe("Combustibles — Detección de anomalías", () => {
  test("un tanqueo BOMBA de 65 gal para QAT001 (tanque de 60 gal) queda marcado como anomalía en la UI", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");

    await page.locator(".btn-registrar").click();
    await page.locator("#tipoElemento").selectOption("VEHICULO");

    const buscador = page.getByLabel("Buscar vehículo");
    await buscador.click();
    await buscador.fill(QA_VEHICLE_PLACA);
    await page.getByRole("button", { name: new RegExp(QA_VEHICLE_PLACA) }).first().click();

    await page.locator("#fuelTypeId").selectOption({ label: "Gasolina corriente" });
    await page.locator("#cantidadGalones").fill("65");
    await page.locator("#horometroKm").fill("1120");
    await page.locator("#precioUnitario").fill("10500");
    await page.locator("#totalIngresado").fill("682500");
    await page.locator("#origen").fill("Estación QA E2E — anomalía cantidad");

    await page.locator(".btn-create").click();
    await expect(page.locator("#tipoElemento")).toHaveCount(0, { timeout: 10000 });

    // La fila del resumen (pestaña "Estación") debe quedar resaltada como
    // anomalía y el texto de la columna Discrepancia debe listar los 2 motivos.
    const filaAnomalia = page.locator("tr.anomaly-row", { hasText: QA_VEHICLE_PLACA });
    await expect(filaAnomalia).toBeVisible({ timeout: 10000 });
    await expect(filaAnomalia).toContainText("Capacidad excedida");
    await expect(filaAnomalia).toContainText("Cantidad fuera de rango");

    await page.screenshot({ path: "e2e/fuel/screenshots/04-anomalia-cantidad-capacidad.png", fullPage: true });
  });
});
