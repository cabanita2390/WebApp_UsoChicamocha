const { chromium } = require('playwright');

const BASE   = 'http://[::1]:5173';
const OUT    = '/home/david/Documents/sena_Proyectos/Usochicamocha/Proyect/DOCUMENTS/evidencias_2_1';
const PLACA  = 'ABC001'; // placa con historial de aceite en la BD

async function shot(page, name, waitMs = 1500) {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('✓', name);
}

async function closeModal(page) {
  const btn = page.locator('button.btn-cancel, button:has-text("Cancelar"), button:has-text("Cerrar"), button.close-btn').first();
  if (await btn.count() > 0) await btn.click().catch(() => {});
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/home/david/.cache/ms-playwright/chromium-1193/chrome-linux/chrome'
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── 1. Login exitoso ──────────────────────────────────────────────────────
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const inputs = page.locator('input');
  await inputs.nth(0).fill('David');
  await inputs.nth(1).fill('admin123');
  await page.locator('button[type="submit"], button').first().click();
  await shot(page, '01_login_exitoso', 3000);

  // ── 2. Listado de vehículos ───────────────────────────────────────────────
  await page.goto(BASE + '/#/vehicles', { waitUntil: 'networkidle' });
  await shot(page, '02_vehiculos_listado', 2500);

  // ── 3. Formulario "Registrar nuevo vehículo" (siempre visible en la página)
  // El formulario está en la sección .vehicle-form-section, hacer scroll hasta él
  await page.locator('.vehicle-form-section, .vehicle-subpanel-head').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, '03_vehiculos_formulario_crear', 1000);

  // ── 4. Validación placa duplicada ─────────────────────────────────────────
  const placaInput = page.locator('input[placeholder*="Ej:"]').first();
  if (await placaInput.count() > 0) {
    await placaInput.fill(PLACA);
    const submitBtn = page.locator('button:has-text("Registrar vehículo")').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await shot(page, '04_vehiculos_placa_duplicada', 1500);
    }
  }

  // ── 5. Formulario "+ Añadir" catálogo inline (marca, tipo, área, ubicación)
  await page.goto(BASE + '/#/vehicles', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('.vehicle-form-section').first().scrollIntoViewIfNeeded().catch(() => {});
  const addBrandBtn = page.locator('button.field-add-btn').first();
  if (await addBrandBtn.count() > 0) {
    await addBrandBtn.click();
    await shot(page, '05_vehiculos_catalogo_inline', 1500);
    await closeModal(page);
  }

  // ── 6. Modal editar vehículo ──────────────────────────────────────────────
  await page.goto(BASE + '/#/vehicles', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const editBtn = page.locator('button:has-text("Editar"), button[title*="Editar"], td button').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await shot(page, '06_vehiculos_modal_editar', 1500);
    await closeModal(page);
  }

  // ── 7. Listado de motocicletas ────────────────────────────────────────────
  await page.goto(BASE + '/#/moto-inventory', { waitUntil: 'networkidle' });
  await shot(page, '07_motos_listado', 2500);

  // ── 8. Formulario "Registrar nueva motocicleta" ───────────────────────────
  await page.locator('.vehicle-form-section, .vehicle-subpanel-head').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, '08_motos_formulario_crear', 1000);

  // ── 9. Consolidado — tab Vehículos (SOAT/RTM con alertas) ────────────────
  await page.goto(BASE + '/#/consolidado', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const tabVehiculos = page.locator('button:has-text("Vehículos"), [role="tab"]:has-text("Vehículos")').first();
  if (await tabVehiculos.count() > 0) await tabVehiculos.click();
  await shot(page, '09_consolidado_vehiculos_soat_rtm', 2000);

  // ── 10. Modal actualizar documento (DocumentUpdateModal) ─────────────────
  const updateDocBtn = page.locator('button:has-text("Actualizar doc"), button[title*="documento"], button[title*="Documento"]').first();
  if (await updateDocBtn.count() > 0) {
    await updateDocBtn.click();
    await shot(page, '10_modal_actualizar_documento', 1500);
    await closeModal(page);
  }

  // ── 11. Consolidado — tab Motos ───────────────────────────────────────────
  await page.goto(BASE + '/#/consolidado', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const tabMotos = page.locator('button:has-text("Motos"), [role="tab"]:has-text("Motos")').first();
  if (await tabMotos.count() > 0) await tabMotos.click();
  await shot(page, '11_consolidado_motos_soat_rtm', 2000);

  // ── 12. Historial de cambios de aceite (ruta /vehicle-oil-history/:placa) ─
  await page.goto(BASE + `/#/vehicle-oil-history/${PLACA}`, { waitUntil: 'networkidle' });
  await shot(page, '12_historial_aceite_vehiculo', 2500);

  // ── 13. Inventario consolidado — tab Vehículos ────────────────────────────
  await page.goto(BASE + '/#/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const invTabVeh = page.locator('button:has-text("Vehículos"), [role="tab"]:has-text("Vehículos")').first();
  if (await invTabVeh.count() > 0) await invTabVeh.click();
  await shot(page, '13_inventario_tab_vehiculos', 1500);

  // ── 14. Inventario consolidado — tab Motos ────────────────────────────────
  const invTabMoto = page.locator('button:has-text("Motos"), [role="tab"]:has-text("Motos")').first();
  if (await invTabMoto.count() > 0) await invTabMoto.click();
  await shot(page, '14_inventario_tab_motos', 1500);

  // ── 15. Mantenimiento — tab Vehículos ─────────────────────────────────────
  await page.goto(BASE + '/#/maintenance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, '15_mantenimiento_vehiculos', 1500);

  await browser.close();
  console.log('\nListo — capturas guardadas en:', OUT);
})();
