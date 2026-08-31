// Helpers compartidos para los specs E2E del módulo de Combustibles (evidencia
// formal #9, pruebas end-to-end de la plataforma completa). Login REAL contra el
// backend real (no localStorage mock-token como app.spec.js) porque estos specs
// validan el flujo completo UI -> API -> Postgres, no solo el render de la UI.

export const PASSWORD = "QaFuel#2026";

export const QA_USERS = {
  admin: { username: "qa.admin", role: "ADMIN" },
  supervisor: { username: "qa.supervisor", role: "SUPERVISOR_OPERATIVO" },
  almacen: { username: "qa.almacen", role: "ALMACEN" },
  operario: { username: "qa.operario", role: "OPERARIO" },
};

// Activos QA ya sembrados en la BD real (ver contexto de la tarea).
export const QA_VEHICLE_PLACA = "QAT001";
export const QA_MACHINE_CODE = "QA-MAQ-001";

/** Llena el formulario de login real (selectores confirmados en Login.svelte) y envía. */
export async function fillLoginForm(page, username, password = PASSWORD) {
  await page.goto("/");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator(".login-btn").click();
}

/**
 * Login real + espera a que cargue el layout autenticado (mismo patrón que
 * app.spec.js: esperar `.app-container` y despachar el overlay de sonido si
 * aparece). Solo válido para roles con acceso web (ADMIN/SUPERVISOR_OPERATIVO/
 * ALMACEN) — OPERARIO nunca llega a este estado (ver stores/auth.js allowedRoles).
 */
export async function loginWeb(page, username, password = PASSWORD) {
  await fillLoginForm(page, username, password);
  await page.waitForSelector(".app-container", { timeout: 15000 });
  const soundOverlay = page.locator(".sound-activation-overlay");
  if (await soundOverlay.isVisible().catch(() => false)) {
    await soundOverlay.click();
  }
}

/** Login + navega a /fuel (click en el link "Combustibles" del sidebar) y espera el TabPanel. */
export async function loginAndGoToFuel(page, username, password = PASSWORD) {
  await loginWeb(page, username, password);
  await page.locator(".sidebar").getByRole("link", { name: "Combustibles" }).click();
  await page.waitForURL("**/fuel");
  await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
}

/** Click en una pestaña del TabPanel de Combustibles (role="tab", texto visible). */
export async function goToFuelTab(page, label) {
  await page.getByRole("tab", { name: label }).click();
}
