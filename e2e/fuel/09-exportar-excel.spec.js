import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS } from "./helpers.js";

/**
 * Caso de uso 9 — Exportación a Excel.
 *
 * TanqueoDistribucion.svelte -> handleExportarExcel() -> download()
 * (stores/api.js) -> GET /api/v1/fuel/refueling/reporte/export, que dispara
 * la descarga del archivo .xlsx. RefuelingReportController: @PreAuthorize
 * hasAnyRole('SUPERVISOR_OPERATIVO','ADMIN') -> se usa ADMIN.
 */
test.describe("Combustibles — Exportación a Excel", () => {
  test("ADMIN exporta el reporte de Tanqueo y Distribución a Excel", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Excel" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("tanqueos_export.xlsx");

    const downloadPath = "e2e/fuel/screenshots/09-tanqueos_export.xlsx";
    await download.saveAs(downloadPath);

    await page.screenshot({ path: "e2e/fuel/screenshots/09-exportar-excel-completado.png", fullPage: true });
  });
});
