import { test, expect } from "@playwright/test";
import { loginWeb, loginAndGoToFuel, fillLoginForm, goToFuelTab, QA_USERS, PASSWORD } from "./helpers.js";

/**
 * Caso de uso 1 — Login y permisos por rol.
 *
 * Referencia de permisos usada para las aserciones (leída directamente del
 * código, no asumida):
 * - Los roles del sistema son 3 (ADMIN, SUPERVISOR_OPERATIVO, OPERARIO).
 *   stores/auth.js: `allowedRoles = ['ADMIN', 'SUPERVISOR_OPERATIVO']`
 *   — OPERARIO tiene acceso denegado a la web SIEMPRE (mensaje "Acceso denegado.
 *   Usa la app móvil 📱"), sin importar sus permisos de API.
 * - back/.../fuel/web/FuelDashboardController.java, FuelPerformanceController.java:
 *   @PreAuthorize("hasAnyRole('SUPERVISOR_OPERATIVO','ADMIN')") en Dashboard
 *   Financiero y Rendimiento.
 * - back/.../fuel/web/RefuelingRecordController.java: POST/GET tanqueo abierto a
 *   OPERARIO/SUPERVISOR_OPERATIVO/ADMIN; PUT/DELETE solo ADMIN
 *   (@PreAuthorize("hasRole('ADMIN')")) -> el botón "Eliminar" y la columna
 *   "Acciones" (Editar) del DataGrid solo deberían aparecer para ADMIN
 *   (createRefuelingColumns: showActions = isAdmin).
 */
test.describe("Combustibles — Login y permisos por rol", () => {
  test("ADMIN inicia sesión y ve las 3 pestañas + acciones de administrador", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.admin.username);

    await expect(page.getByRole("tab", { name: "Dashboard Financiero" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Rendimiento" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tanqueo y Distribución" })).toBeVisible();

    // Corregido: la pestaña activa por defecto es "Dashboard Financiero"
    // (stores/fuelFilters.js: `fuelActiveTab = writable('dashboard')`), no
    // "Tanqueo y Distribución" como se asumió originalmente. Se navega
    // explícitamente antes de verificar los botones de esa pestaña.
    await goToFuelTab(page, "Tanqueo y Distribución");
    await expect(page.locator(".btn-registrar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar Excel" })).toBeVisible();

    await page.screenshot({ path: "e2e/fuel/screenshots/01-admin-tanqueo-distribucion.png", fullPage: true });
  });

  test("SUPERVISOR_OPERATIVO inicia sesión y ve las 3 pestañas pero sin columna de Acciones (Editar/Eliminar)", async ({ page }) => {
    await loginAndGoToFuel(page, QA_USERS.supervisor.username);

    await expect(page.getByRole("tab", { name: "Dashboard Financiero" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Rendimiento" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tanqueo y Distribución" })).toBeVisible();

    // Puede registrar tanqueos (RefuelingRecordController POST permite
    // SUPERVISOR_OPERATIVO) pero no debe ver botones Editar/Eliminar
    // (createRefuelingColumns: showActions = isAdmin -> columna completa omitida).
    // Corregido: la pestaña activa por defecto es "Dashboard Financiero", no
    // "Tanqueo y Distribución" (ver fix en el test de ADMIN de este archivo).
    await goToFuelTab(page, "Tanqueo y Distribución");
    await expect(page.locator(".btn-registrar")).toBeVisible();
    await expect(page.locator(".btn-edit")).toHaveCount(0);
    await expect(page.locator(".btn-delete")).toHaveCount(0);

    // Dashboard Financiero y Rendimiento están permitidos por @PreAuthorize
    // para SUPERVISOR_OPERATIVO -> deben cargar con contenido real, no vacíos.
    await goToFuelTab(page, "Dashboard Financiero");
    await expect(page.locator(".kpi-card")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/fuel/screenshots/01-supervisor-dashboard-financiero.png", fullPage: true });
  });

  test("OPERARIO no puede iniciar sesión en la web (acceso denegado explícito, no llega al panel)", async ({ page }) => {
    await fillLoginForm(page, QA_USERS.operario.username);

    // stores/auth.js: allowedRoles no incluye OPERARIO -> login.success=false,
    // error = 'Acceso denegado. Usa la app móvil 📱', el formulario de login
    // sigue visible (nunca se llega a .app-container).
    await expect(page.locator(".error-message")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".error-message")).toContainText("Acceso denegado");
    await expect(page.locator(".login-form")).toBeVisible();
    await expect(page.locator(".app-container")).toHaveCount(0);

    await page.screenshot({ path: "e2e/fuel/screenshots/01-operario-acceso-denegado.png", fullPage: true });
  });
});
