import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Maquinaria Dashboard',
  description: 'Documentación del panel administrativo — Distrito de Riego Usochicamocha',
  lang: 'es',

  // Puerto fijo y distinto al de la app (vite dev usa el 5173 por default) —
  // así se pueden correr ambos servidores al mismo tiempo sin que choquen.
  vite: {
    server: {
      port: 5174,
      strictPort: true,
    },
  },

  themeConfig: {
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Guía', link: '/documentacion_core' },
      { text: 'Tests', link: '/documentacion_tests' },
    ],

    sidebar: [
      {
        text: 'Guía del proyecto',
        items: [
          { text: 'Core (stores, config, App.svelte)', link: '/documentacion_core' },
          { text: 'Vistas', link: '/documentacion_vistas' },
          { text: 'Componentes compartidos', link: '/documentacion_shared' },
        ],
      },
      {
        text: 'Tiempo real',
        items: [
          { text: 'WebSocket — implementación actual', link: '/documentacion_websocket_final' },
        ],
      },
      {
        text: 'Testing',
        items: [
          { text: 'Resumen general', link: '/documentacion_tests' },
          { text: 'Tests — Core', link: '/documentacion_tests_core' },
          { text: 'Tests — Componentes compartidos', link: '/documentacion_tests_shared' },
          { text: 'Tests — Vistas', link: '/documentacion_tests_vistas' },
        ],
      },
      {
        text: 'Archivo (histórico)',
        collapsed: true,
        items: [
          { text: 'Migración SSE → WebSocket', link: '/documentacion_websocket_migration' },
          { text: 'Fixes de notificaciones', link: '/documentacion_notificaciones_refactor' },
          { text: 'Design brief — Combustibles', link: '/design/combustibles-design-brief' },
          { text: 'Plan — Combustibles fase 4 (frontend)', link: '/superpowers/plans/2026-07-22-combustibles-fase-4-frontend' },
          { text: 'Plan — Combustibles fase 5 (rediseño)', link: '/superpowers/plans/2026-07-28-combustibles-fase-5-rediseno' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cabanita2390/WebApp_UsoChicamocha' },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: 'En esta página',
    },

    docFooter: {
      prev: 'Anterior',
      next: 'Siguiente',
    },

    returnToTopLabel: 'Volver arriba',
    lastUpdated: {
      text: 'Actualizado el',
    },
  },
})
