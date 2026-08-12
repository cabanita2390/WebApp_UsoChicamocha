import { test, expect } from "@playwright/test";
import { loginAndGoToFuel, goToFuelTab, QA_USERS, QA_VEHICLE_PLACA } from "./helpers.js";

/**
 * Caso de uso 5 — Editar y eliminar un tanqueo ya registrado.
 *
 * back/.../fuel/web/RefuelingRecordController.java:
 *   PUT  /api/v1/fuel/refueling/{id}  @PreAuthorize("hasRole('ADMIN')")
 *   DELETE /api/v1/fuel/refueling/{id} @PreAuthorize("hasRole('ADMIN')")
 * -> confirmado: solo ADMIN. El frontend además solo pinta la columna
 * "Acciones" (Editar/Eliminar) cuando showActions=isAdmin (createRefuelingColumns).
 *
 * Este spec registra su propio tanqueo desechable (lugar ALMACEN, sin factura,
 * para no interferir con los tanqueos BOMBA de los casos 2/4) y lo edita +
 * elimina en el mismo flujo, para no depender de filas creadas por otros specs.
 */
test.describe("Combustibles — Editar y eliminar un tanqueo (ADMIN)", () => {
  test("ADMIN edita la cantidad de un tanqueo y luego lo elimina (soft-delete) desde el resumen", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);
    await goToFuelTab(page, "Tanqueo y Distribución");

    // 1) Crear un tanqueo desechable para editar/eliminar.
    await page.locator(".btn-registrar").click();
    await page.locator("#tipoElemento").selectOption("VEHICULO");
    const buscador = page.getByLabel("Buscar vehículo");
    await buscador.click();
    await buscador.fill(QA_VEHICLE_PLACA);
    await page.getByRole("button", { name: new RegExp(QA_VEHICLE_PLACA) }).first().click();
    await page.locator("#lugar").selectOption("ALMACEN");
    await page.locator("#fuelTypeId").selectOption({ label: "Gasolina corriente" });
    await page.locator("#cantidadGalones").fill("10");
    await page.locator("#horometroKm").fill("1150");
    await page.locator("#origen").fill("QA E2E — editar y eliminar");
    await page.locator(".btn-create").click();
    await expect(page.locator("#tipoElemento")).toHaveCount(0, { timeout: 10000 });

    // El reporte agrupa por `lugar` real (tipo=VEHICULO -> lugar=BOMBA,
    // tipo=MAQUINARIA_MOTO -> lugar=ALMACEN), no por tipo de activo — como este
    // tanqueo desechable usa lugar=ALMACEN, aparece en la píldora "Almacén"
    // aunque el activo sea un vehículo, no en la píldora "Vehículos" (activa
    // por defecto, que solo trae BOMBA y seguiría mostrando el tanqueo BOMBA
    // más reciente de los casos 2/4).
    await page.getByRole("button", { name: /^Almacén/ }).click();

    // El resumen colapsa a 1 fila por activo = su tanqueo más reciente dentro
    // de esa píldora, así que esta fila desechable (la más nueva) es la que
    // queda visible para QAT001.
    const filaQat001 = page.locator("tr", { hasText: QA_VEHICLE_PLACA });
    await expect(filaQat001).toBeVisible({ timeout: 10000 });
    // toContainText con un regex anclado (^...$) exige que TODO el texto del
    // elemento sea "10 gal" — pero un <tr> concatena todas sus celdas
    // (fecha+placa+lugar+...), así que nunca puede matchear ahí. Se acota a la
    // celda puntual, mismo patrón que usan los specs 02/03 con getByText.
    await expect(filaQat001.getByText(/^10(\.\d+)? gal$/)).toBeVisible();

    // 2) Editar: cambiar la cantidad de 10 a 12 galones.
    await filaQat001.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("dialog", { name: "Editar tanqueo" })).toBeVisible();
    await page.locator("#cantidadGalones").fill("12");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.locator("#cantidadGalones")).toHaveCount(0, { timeout: 10000 });

    await expect(filaQat001.getByText(/^12(\.\d+)? gal$/)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/fuel/screenshots/05-tanqueo-editado.png", fullPage: true });

    // 3) Eliminar: confirmar en el modal de borrado.
    await filaQat001.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByRole("dialog", { name: "Eliminar tanqueo" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar" }).last().click();

    // Tras el soft-delete, este tanqueo puntual (12 gal) deja de aparecer en la
    // fila de QAT001 — no se afirma que la fila entera desaparezca porque puede
    // quedar otro tanqueo ALMACEN suyo (de una corrida QA anterior) como nuevo
    // "más reciente" dentro del rango filtrado.
    await expect(filaQat001.getByText(/^12(\.\d+)? gal$/)).toHaveCount(0, { timeout: 10000 });

    // Las notificaciones de esta app viven en el dropdown de la campana
    // (MainLayout.svelte -> NotificationDropdown.svelte), no como un toast
    // flotante sobre la página — hay que abrirlo para verificar el mensaje real.
    await page.locator(".notification-bell").click();
    await expect(page.getByText("Tanqueo eliminado con éxito.")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/fuel/screenshots/05-tanqueo-eliminado.png", fullPage: true });
  });
});
