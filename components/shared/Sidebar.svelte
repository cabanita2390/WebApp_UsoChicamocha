<script>
  import { link } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
</script>

<nav class="sidebar">

  <!-- ── General ── -->
  <div class="section-header"><span>General</span></div>

  <a class="nav-item" href="/" use:link use:active={{ path: "/", className: "active" }} title="Panel principal">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>
    <span class="nav-text">Dashboard</span>
  </a>

  <a class="nav-item" href="/users" use:link use:active={{ path: "/users", className: "active" }} title="Usuarios del sistema">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>
    <span class="nav-text">Usuarios</span>
  </a>

  <!-- ── Maquinaria (pesada / agrícola) ── -->
  <div class="section-header"><span>Maquinaria</span></div>

  <a class="nav-item" href="/machines" use:link use:active={{ path: "/machines", className: "active" }} title="Inventario de máquinas">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M12,2L9.5,4.5L6.4,4L5.5,1L2,3.5L3,6.5L1,7.5L2.5,11L4.5,9.5L5,12.5L1.5,15L4,17.5L6.5,16.5L7.5,19L11,20.5L9.5,22.5L12.5,23L15,20.5L17.6,21L18.5,24L22,21.5L21,18.5L23,17.5L21.5,14L19.5,15.5L19,12.5L22.5,10L20,7.5L17.5,8.5L16.5,6L13,4.5L14.5,2.5L11.5,2H12Z" /></svg>
    <span class="nav-text">Máquinas</span>
  </a>

  <a class="nav-item" href="/work-orders" use:link use:active={{ path: "/work-orders", className: "active" }} title="Órdenes de trabajo de maquinaria">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m0 14h-5v-2h5v2m3-4h-8v-2h8v2m0-4h-8V7h8v2z" /></svg>
    <span class="nav-text">Órdenes</span>
  </a>

  <a class="nav-item" href="/consolidado" use:link use:active={{ path: "/consolidado", className: "active" }} title="Aceite motor e hidráulico por máquina (horómetro). Exportar Excel.">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="nav-icon-consolidado" aria-hidden="true">
      <path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M18 2C18 2 15 6 15 9A3 3 0 0 0 21 9C21 6 18 2 18 2Z" fill="currentColor" />
      <path d="M8 11L12 9L16 11V15L12 17L8 15Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="12" cy="13" r="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
    </svg>
    <span class="nav-text">Consolidado</span>
  </a>

  <!-- ── Catálogo compartido: marcas de aceite (motor + hidráulico) ── -->
  <div class="section-header"><span>Aceites</span></div>

  <a class="nav-item" href="/oil-management" use:link use:active={{ path: "/oil-management", className: "active" }} title="Marcas de aceite del catálogo compartido (motor para vehículos/motos; hidráulico para maquinaria).">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C12 2 7 9 7 13A5 5 0 0 0 17 13C17 9 12 2 12 2Z" fill="currentColor" /></svg>
    <span class="nav-text">Marcas (catálogo)</span>
  </a>

  <!-- ── Vehículos (camionetas / carros, no moto) ── -->
  <div class="section-header"><span>Vehículos</span></div>

  <a class="nav-item" href="/vehicles" use:link use:active={{ path: "/vehicles", className: "active" }} title="Inventario de vehículos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6.01M6.5,16A1.5,1.5 0 1,1 8,14.5A1.5,1.5 0 0,1 6.5,16M17.5,16A1.5,1.5 0 1,1 19,14.5A1.5,1.5 0 0,1 17.5,16M5,11L6.5,6.5H17.5L19,11H5Z" /></svg>
    <span class="nav-text">Inventario</span>
  </a>

  <a class="nav-item" href="/vehicle-monitoring" use:link use:active={{ path: "/vehicle-monitoring", className: "active" }} title="Estado operativo: documentos, aceite y kilometraje (vista tipo planilla).">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M13,7H11V13H17V11H13V7Z" /></svg>
    <span class="nav-text">Monitoreo</span>
  </a>

  <a class="nav-item" href="/vehicle-inspections" use:link use:active={{ path: "/vehicle-inspections", className: "active" }} title="Inspecciones pre-operativas desde campo">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
    <span class="nav-text">Inspecciones</span>
  </a>

  <!-- ── Motocicletas ── -->
  <div class="section-header"><span>Motos</span></div>

  <a class="nav-item" href="/moto-inventory" use:link use:active={{ path: "/moto-inventory", className: "active" }} title="Inventario de motocicletas">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.8,20C17.4,21.2 16.3,22 15,22H9C7.7,22 6.6,21.2 6.2,20H3V18H6.2C6.6,16.8 7.7,16 9,16H15C16.3,16 17.4,16.8 17.8,18H21V20H17.8M7,18C7,18.6 7.4,19 8,19H16C16.6,19 17,18.6 17,18C17,17.4 16.6,17 16,17H8C7.4,17 7,17.4 7,18M18.3,5.3C19.4,6.4 19.4,8.1 18.3,9.2L16.5,11L18.3,12.8C19.4,13.9 19.4,15.6 18.3,16.7C17.2,17.8 15.5,17.8 14.4,16.7L12.6,14.9L10.8,16.7C9.7,17.8 8,17.8 6.9,16.7C5.8,15.6 5.8,13.9 6.9,12.8L8.7,11L6.9,9.2C5.8,8.1 5.8,6.4 6.9,5.3C8,4.2 9.7,4.2 10.8,5.3L12.6,7.1L14.4,5.3C15.5,4.2 17.2,4.2 18.3,5.3M16.2,6.5C15.9,6.2 15.4,6.2 15.1,6.5L12.6,9L10.1,6.5C9.8,6.2 9.3,6.2 9,6.5C8.7,6.8 8.7,7.3 9,7.6L11.5,10.1L9,12.6C8.7,12.9 8.7,13.4 9,13.7C9.3,14 9.8,14 10.1,13.7L12.6,11.2L15.1,13.7C15.4,14 15.9,14 16.2,13.7C16.5,13.4 16.5,12.9 16.2,12.6L13.7,10.1L16.2,7.6C16.5,7.3 16.5,6.8 16.2,6.5Z" /></svg>
    <span class="nav-text">Inventario</span>
  </a>

  <a class="nav-item" href="/moto-monitoring" use:link use:active={{ path: "/moto-monitoring", className: "active" }} title="Estado consolidado: documentación, aceite, último reporte">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M13,7H11V13H17V11H13V7Z" /></svg>
    <span class="nav-text">Monitoreo</span>
  </a>

  <a class="nav-item" href="/moto-inspections" use:link use:active={{ path: "/moto-inspections", className: "active" }} title="Inspecciones de motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
    <span class="nav-text">Inspecciones</span>
  </a>

  <a class="nav-item" href="/moto-maintenance" use:link use:active={{ path: "/moto-maintenance", className: "active" }} title="Historial de mantenimiento en taller (motos)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.7,4.7C0.6,7.1 1,10.1 3,12.1C4.9,14 7.6,14.5 9.9,13.6L19,22.7L22.7,19Z" /></svg>
    <span class="nav-text">Historial taller</span>
  </a>

</nav>

<style>
  .sidebar {
    height: 100%;
    width: 60px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border-right: 2px outset #c0c0c0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 0;
    gap: 0;
    transition: width 0.3s ease;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .sidebar:hover {
    width: 220px;
  }

  .section-header {
    width: 100%;
    padding: 10px 10px 4px 10px;
    font-size: 9px;
    color: #555;
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0,0,0,0.05);
    border-bottom: 1px solid #aaa;
    white-space: nowrap;
    margin-top: 0;
  }
  .sidebar:not(:hover) .section-header {
    justify-content: center;
    font-size: 0;
    height: 2px;
    padding: 4px 0;
  }

  .nav-item {
    width: 100%;
    height: 40px;
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
    border: none;
    border-top: 1px solid #ffffff;
    border-bottom: 1px solid #808080;
    cursor: pointer;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 0 14px;
    gap: 14px;
    text-decoration: none;
    color: inherit;
    box-sizing: border-box;
  }
  .nav-item:hover {
    background: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%);
  }
  .nav-item:active,
  :global(.nav-item.active) {
    background: #c0c0c0;
    border-top-color: #808080;
  }
  .nav-item svg {
    width: 24px;
    height: 24px;
    fill: #000000;
    flex-shrink: 0;
  }

  /* Consolidado: documento + aceite (trazo + gota rellena); anula fill heredado en trazos */
  .nav-item svg.nav-icon-consolidado {
    color: #000000;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .nav-item svg.nav-icon-consolidado path:nth-of-type(2) {
    fill: currentColor;
    stroke: none;
  }
  .nav-item svg.nav-icon-consolidado path:nth-of-type(1),
  .nav-item svg.nav-icon-consolidado path:nth-of-type(3) {
    fill: none;
    stroke: currentColor;
  }
  .nav-item svg.nav-icon-consolidado circle {
    fill: none;
    stroke: currentColor;
  }

  .nav-text {
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    font-weight: bold;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .sidebar:hover .nav-text {
    opacity: 1;
    transition-delay: 0.15s;
  }
</style>
