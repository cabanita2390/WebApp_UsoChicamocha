---
layout: home

hero:
  name: "Maquinaria Dashboard"
  text: "Documentación del panel administrativo"
  tagline: Distrito de Riego Usochicamocha — Svelte 4 + Vite
  actions:
    - theme: brand
      text: Empezar por Core
      link: /documentacion_core
    - theme: alt
      text: Ver vistas
      link: /documentacion_vistas
    - theme: alt
      text: Testing
      link: /documentacion_tests

features:
  - title: Stores y configuración
    details: Estado global (auth, data, api, ui), composables de WebSocket/auto-refresh, y configuración de tablas y títulos de página.
    link: /documentacion_core
  - title: Vistas
    details: Qué hace cada pantalla del dashboard — login, inventario, inspecciones, órdenes de trabajo, combustible y más.
    link: /documentacion_vistas
  - title: Componentes compartidos
    details: DataGrid, modales, selectores y demás piezas reutilizadas entre varias vistas.
    link: /documentacion_shared
  - title: Tiempo real
    details: Cómo funcionan hoy las notificaciones — WebSocket + STOMP sobre SockJS.
    link: /documentacion_websocket_final
  - title: Testing
    details: Qué cubre cada suite — Vitest para unitarios/componentes, Playwright para E2E.
    link: /documentacion_tests
  - title: Archivo histórico
    details: Migraciones ya completadas, fixes puntuales y planes de features pasadas — contexto, no referencia viva.
    link: /documentacion_websocket_migration
---
