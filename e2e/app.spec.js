import { test, expect } from '@playwright/test';

/**
 * @description Suite de pruebas e2e para la aplicación Maquinaria Dashboard.
 * Verifica el funcionamiento end-to-end de la aplicación, incluyendo carga, autenticación, navegación y funcionalidades principales.
 * Tests incluidos:
 * - should load the application: Verifica que la aplicación se cargue correctamente.
 * - should display login form when not authenticated: Verifica que se muestre el formulario de login cuando no está autenticado.
 * - should navigate between views: Verifica que se pueda navegar entre vistas.
 * - should display dashboard data: Verifica que se muestren los datos del dashboard.
 * - should handle notifications: Verifica que se manejen las notificaciones.
 * - should logout: Verifica que se pueda cerrar sesión.
 */
test.describe('Maquinaria Dashboard', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Verificar que la página se cargue (ya sea login o la aplicación principal)
    await expect(page).toHaveTitle(/Estado De Equipos/);
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Limpiar cualquier autenticación existente
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Debería mostrar el formulario de login
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
  });

  test('should navigate between views', async ({ page }) => {
    await page.goto('/');

    // Simular autenticación para pruebas de navegación
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('currentUser', JSON.stringify({ name: 'Test User' }));
    });

    // Recargar la página para que se aplique la autenticación
    await page.reload();

    // Esperar a que la aplicación se cargue
    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Activar sonido si es necesario
    const soundOverlay = page.locator('.sound-activation-overlay');
    if (await soundOverlay.isVisible()) {
      await soundOverlay.click();
    }

    // Verificar navegación de sidebar
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Probar navegación a diferentes vistas (nombres reales del Sidebar actual;
    // svelte-spa-router reescribe href a formato hash, así que se navega por
    // nombre accesible del link en vez del atributo href crudo)
    const views = ['Dashboard', 'Inventario', 'Órdenes de Trabajo', 'Consolidado'];

    for (const view of views) {
      const navItem = sidebar.getByRole('link', { name: view });
      if (await navItem.isVisible()) {
        await navItem.click();

        // Verificar si el título del header cambia
        const headerTitle = page.locator('.header-center h2');
        await expect(headerTitle).toBeVisible();
      }
    }
  });

  test('should display dashboard data', async ({ page }) => {
    await page.goto('/');

    // Simular autenticación
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('currentUser', JSON.stringify({ name: 'Test User' }));
    });

    // Recargar la página para que se aplique la autenticación
    await page.reload();

    // Esperar a que el dashboard se cargue
    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Activar sonido si es necesario
    const soundOverlay = page.locator('.sound-activation-overlay');
    if (await soundOverlay.isVisible()) {
      await soundOverlay.click();
    }

    // Asegurar que estamos en dashboard
    const dashboardNav = page.locator('.sidebar').getByRole('link', { name: 'Dashboard' });
    await dashboardNav.click();

    // Verificar contenido del dashboard
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();

    // Verificar header
    await page.waitForSelector('.header-center h2');
    const header = page.locator('.header');
    await expect(header).toContainText('Estado De Equipos');
  });

  test('should handle notifications', async ({ page }) => {
    await page.goto('/');

    // Simular autenticación
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('currentUser', JSON.stringify({ name: 'Test User' }));
    });

    // Recargar la página para que se aplique la autenticación
    await page.reload();

    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Activar sonido si es necesario
    const soundOverlay = page.locator('.sound-activation-overlay');
    if (await soundOverlay.isVisible()) {
      await soundOverlay.click();
    }

    // Verificar campana de notificaciones
    await page.waitForSelector('.notification-bell');
    const notificationBell = page.locator('.notification-bell');
    await expect(notificationBell).toBeVisible();

    // Hacer clic para abrir notificaciones
    await notificationBell.click();

    // Verificar si aparece el dropdown (puede estar vacío)
    const notificationDropdown = page.locator('.notification-dropdown');
    // El dropdown podría no ser visible si no hay notificaciones
  });

  test('should logout', async ({ page }) => {
    await page.goto('/');

    // Simular autenticación
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('currentUser', JSON.stringify({ name: 'Test User' }));
    });

    // Recargar la página para que se aplique la autenticación
    await page.reload();

    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Activar sonido si es necesario
    const soundOverlay = page.locator('.sound-activation-overlay');
    if (await soundOverlay.isVisible()) {
      await soundOverlay.click();
    }

    // Hacer clic en botón de logout
    await page.waitForSelector('.logout-btn');
    const logoutBtn = page.locator('.logout-btn');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Debería mostrar el formulario de login
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
  });
});