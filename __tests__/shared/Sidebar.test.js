import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Sidebar from '../../components/shared/Sidebar.svelte';

/**
 * @description Suite de pruebas para el componente Sidebar.
 * El componente no recibe props: la navegación y el estado activo dependen de
 * svelte-spa-router (link/active).
 */

const ADMIN_ITEM_TITLES = [
  'Panel principal — inspecciones pre-operativas',
  'Usuarios del sistema',
  'Inventario: Maquinaria · Vehículos · Motos',
  'Órdenes de trabajo: Maquinaria · Vehículos · Motos',
  'Consolidado de aceites y estado: Maquinaria · Vehículos · Motos',
  'Marcas de aceite del catálogo compartido',
  'Tanqueo, suministro, dashboard financiero, almacén, rendimiento y distribución',
  'Estaciones de Bombeo: dashboard, resumen por actividad, ejecuciones y cronograma anual',
  'Configuración de Estaciones de Bombeo: estaciones, actividades y programación',
];

const CONFIG_TITLE = 'Configuración de Estaciones de Bombeo: estaciones, actividades y programación';

const ADMIN_ITEM_COUNT = ADMIN_ITEM_TITLES.length;

function mockAuth(role) {
  vi.doMock('../../stores/auth.js', () => ({
    auth: {
      subscribe: vi.fn((callback) => {
        callback({ isAuthenticated: true, currentUser: { name: 'Test User', role }, isRefreshing: false });
        return () => {};
      }),
    },
  }));
}

describe('Sidebar', () => {
  describe('con rol ADMIN', () => {
    beforeEach(() => {
      vi.resetModules();
      mockAuth('ADMIN');
    });

    it('renderiza los ítems de navegación visibles del sidebar', async () => {
      const { default: SidebarAdmin } = await import('../../components/shared/Sidebar.svelte');
      const { container } = render(SidebarAdmin);

      for (const title of ADMIN_ITEM_TITLES) {
        expect(screen.getByTitle(title)).toBeTruthy();
      }
      expect(container.querySelectorAll('.nav-item').length).toBe(ADMIN_ITEM_COUNT);
    });

    it('renderiza un ícono SVG por cada ítem visible', async () => {
      const { default: SidebarAdmin } = await import('../../components/shared/Sidebar.svelte');
      const { container } = render(SidebarAdmin);

      expect(container.querySelectorAll('nav svg').length).toBe(ADMIN_ITEM_COUNT);
    });
  });

  describe('con rol SUPERVISOR_OPERATIVO (no admin)', () => {
    beforeEach(() => {
      vi.resetModules();
      mockAuth('SUPERVISOR_OPERATIVO');
    });

    it('oculta el ítem de Usuarios pero mantiene el resto visible', async () => {
      const { default: SidebarNonAdmin } = await import('../../components/shared/Sidebar.svelte');
      const { container } = render(SidebarNonAdmin);

      expect(screen.queryByTitle('Usuarios del sistema')).toBeNull();
      for (const title of ADMIN_ITEM_TITLES.filter((t) => t !== 'Usuarios del sistema' && t !== CONFIG_TITLE)) {
        expect(screen.getByTitle(title)).toBeTruthy();
      }
      // Configuración de Subestaciones: visible pero con candado, sin enlace (mockup §0.2)
      expect(screen.queryByTitle(CONFIG_TITLE)).toBeNull();
      const bloqueado = screen.getByTitle('Requiere rol ADMIN');
      expect(bloqueado.tagName).not.toBe('A');
      expect(bloqueado.textContent).toContain('Solo ADMIN');
      expect(container.querySelectorAll('.nav-item').length).toBe(ADMIN_ITEM_COUNT - 1);
    });
  });

  describe('estructura', () => {
    beforeEach(() => {
      vi.resetModules();
      mockAuth('ADMIN');
    });

    it('tiene la clase .sidebar en el nav raíz', async () => {
      const { default: SidebarAdmin } = await import('../../components/shared/Sidebar.svelte');
      const { container } = render(SidebarAdmin);

      const sidebar = container.querySelector('.sidebar');
      expect(sidebar.classList.contains('sidebar')).toBe(true);
    });
  });
});
