import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS } from "./helpers.js";

/**
 * Caso de uso 9 — Exportación a Excel.
 *
 * TanqueoDistribucion.svelte -> BotonExcel (claves="tanqueos", con el tipo, el área y las fechas
 * de la pantalla) -> GET /api/v1/reportes/tanqueos, el motor único de reportes. El reporte es de
 * SUPERVISOR_OPERATIVO y ADMIN -> se usa ADMIN. El nombre del archivo lo pone el back.
 */
test.describe("Combustibles — Exportación a Excel", () => {
  test("ADMIN exporta el reporte de Tanqueo y Distribución a Excel", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Excel" }).click();
    const download = await downloadPromise;

    // tanqueos_<desde>_a_<hasta>.xlsx con las fechas del filtro, o tanqueos.xlsx sin ellas.
    expect(download.suggestedFilename()).toMatch(/^tanqueos(_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2})?\.xlsx$/);

    const downloadPath = "e2e/fuel/screenshots/09-tanqueos.xlsx";
    await download.saveAs(downloadPath);

    await page.screenshot({ path: "e2e/fuel/screenshots/09-exportar-excel-completado.png", fullPage: true });
  });
});
