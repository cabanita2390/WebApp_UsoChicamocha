import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_MACHINE_CODE } from "./helpers.js";

/**
 * Caso de uso 8 — Reintegro de un tanqueo ALMACEN.
 *
 * Reutiliza el tanqueo ALMACEN de 80 gal registrado en el caso 3 para
 * QA-MAQ-001 (debe correr después: este archivo empieza con "08" así que
 * Playwright con --workers=1 lo ejecuta después del "03"). Reintegra el saldo
 * completo (80 gal) para poder verificar el estado terminal "Reintegrado" del
 * botón (DataGrid: isReintegroAction -> "Reintegrar" mientras quede saldo > 0,
 * "Reintegrado" cuando el saldo llega a 0) y confirma que la cantidad
 * originalmente tanqueada (columna "Cantidad") no se re-valoriza ni cambia.
 *
 * FuelReintegrationController.java: @PreAuthorize("hasAnyRole('SUPERVISOR_OPERATIVO','ADMIN')")
 * -> se usa ADMIN, coherente con canReintegrar en TanqueoDistribucion.svelte.
 */
test.describe("Combustibles — Reintegro de un tanqueo ALMACEN", () => {
  test("ADMIN reintegra el saldo completo de un tanqueo ALMACEN y el historial no re-valoriza la cantidad original", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");
    await page.getByRole("button", { name: /^Almacén/ }).click();

    const filaMaquina = page
      .locator("tr", { hasText: QA_MACHINE_CODE })
      .or(page.locator("tr", { hasText: "Qa Maquina 001" }));
    await expect(filaMaquina.first()).toBeVisible({ timeout: 10000 });

    const cantidadOriginalTexto = await filaMaquina.first().locator("td").filter({ hasText: /gal$/ }).first().textContent();

    await filaMaquina.first().getByRole("button", { name: "Reintegrar" }).click();
    await expect(page.getByRole("dialog", { name: "Reintegrar tanqueo" })).toBeVisible();

    await page.locator("#cantidadReintegrada").fill("80");
    await page.locator("#motivoReintegro").fill("Devolución completa — QA E2E");
    await page.getByRole("button", { name: "Reintegrar" }).last().click();

    // Las notificaciones de esta app viven en el dropdown de la campana
    // (MainLayout.svelte -> NotificationDropdown.svelte), no como un toast
    // flotante sobre la página — hay que abrirlo para verificar el mensaje real.
    await page.locator(".notification-bell").click();
    await expect(page.getByText("Reintegro registrado con éxito.")).toBeVisible({ timeout: 10000 });
    await page.locator(".notification-bell").click();

    // Estado terminal: el botón "Reintegrar" se reemplaza por el texto "Reintegrado".
    await expect(filaMaquina.first().getByText("Reintegrado")).toBeVisible({ timeout: 10000 });
    await expect(filaMaquina.first().getByRole("button", { name: "Reintegrar" })).toHaveCount(0);

    // La cantidad originalmente tanqueada (columna "Cantidad") no cambia por el
    // reintegro — solo se descuenta contra cantidadReintegrada, no re-valoriza
    // ni recalcula la fila del tanqueo.
    const cantidadTrasReintegro = await filaMaquina.first().locator("td").filter({ hasText: /gal$/ }).first().textContent();
    expect(cantidadTrasReintegro?.trim()).toBe(cantidadOriginalTexto?.trim());

    await page.screenshot({ path: "e2e/fuel/screenshots/08-reintegro-completado.png", fullPage: true });
  });
});
