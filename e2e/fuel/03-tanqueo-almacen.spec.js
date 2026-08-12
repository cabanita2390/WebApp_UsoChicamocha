import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_MACHINE_CODE } from "./helpers.js";

/**
 * Caso de uso 3 — Tanqueo tipo ALMACEN para la máquina QA (QA-MAQ-001).
 *
 * Mismo modal que el caso BOMBA (RefuelingFormModal), pero: tipoElemento
 * "Maquinaria" es el valor por defecto del formulario, con lugar "ALMACEN" ya
 * preseleccionado (no hace falta tocarlo) — y sin los campos exclusivos de
 * BOMBA (precioUnitario/descuento/totalIngresado/factura), que solo se
 * renderizan cuando lugar === "BOMBA".
 */
test.describe("Combustibles — Tanqueo tipo ALMACEN (máquina QA-MAQ-001)", () => {
  test("ADMIN registra un tanqueo ALMACEN para QA-MAQ-001 y aparece en el resumen de Almacén", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");

    await page.locator(".btn-registrar").click();
    await expect(page.locator("#tipoElemento")).toBeVisible();

    // Por defecto tipoElemento="MAQUINARIA" y lugar="ALMACEN" — no se toca el
    // select de tipo para no disparar el reset del buscador de activo.
    await expect(page.locator("#tipoElemento")).toHaveValue("MAQUINARIA");
    await expect(page.locator("#lugar")).toHaveValue("ALMACEN");

    // Los campos exclusivos de BOMBA no deben existir en el DOM con lugar=ALMACEN.
    await expect(page.locator("#precioUnitario")).toHaveCount(0);
    await expect(page.locator("#totalIngresado")).toHaveCount(0);

    const buscador = page.getByLabel("Buscar máquina");
    await buscador.click();
    await buscador.fill(QA_MACHINE_CODE);
    // El botón de resultado muestra labelElementoLista() ("nombre — marca"),
    // no el código QA_MACHINE_CODE con el que se filtra (textoBusquedaElemento
    // sí lo indexa, pero no aparece en el texto visible) — se hace match por
    // el nombre real sembrado ("Qa Maquina 001"), no por el código.
    await page.getByRole("button", { name: /Qa Maquina 001/ }).first().click();

    await page.locator("#fuelTypeId").selectOption({ label: "ACPM / Diésel" });
    await page.locator("#cantidadGalones").fill("80");
    await page.locator("#horometroKm").fill("50");
    await page.locator("#origen").fill("Almacén QA E2E");

    await page.locator(".btn-create").click();
    await expect(page.locator("#tipoElemento")).toHaveCount(0, { timeout: 10000 });

    // El resumen por defecto muestra "Estación" (VEHICULO) — hay que cambiar a
    // la píldora "Almacén" (MAQUINARIA_MOTO) para ver la máquina recién tanqueada.
    await page.getByRole("button", { name: /^Almacén/ }).click();
    await expect(page.getByText(QA_MACHINE_CODE).or(page.getByText("Qa Maquina 001")).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^80(\.\d+)? gal$/).first()).toBeVisible();

    await page.screenshot({ path: "e2e/fuel/screenshots/03-tanqueo-almacen-registrado.png", fullPage: true });
  });
});
