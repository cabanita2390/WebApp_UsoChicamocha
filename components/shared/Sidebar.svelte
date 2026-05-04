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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10.07,20.7L8.65,19.28L10.09,17.83C9.56,17.46 9.09,17 8.72,16.47L7.27,17.91L5.85,16.5L7.3,15.05C6.96,14.42 6.73,13.72 6.64,13H4.61V11H6.64C6.73,10.28 6.96,9.58 7.3,8.95L5.85,7.5L7.27,6.09L8.72,7.53C9.09,7 9.56,6.54 10.09,6.17L8.65,4.72L10.07,3.3L11.5,4.74C12.13,4.4 12.83,4.17 13.55,4.08V2H15.55V4.08C16.27,4.17 16.97,4.4 17.6,4.74L19.04,3.3L20.46,4.72L19,6.17C19.54,6.54 20,7 20.37,7.53L21.82,6.09L23.24,7.5L21.79,8.95C22.13,9.58 22.36,10.28 22.45,11H24.48V13H22.45C22.36,13.72 22.13,14.42 21.79,15.05L23.24,16.5L21.82,17.91L20.37,16.47C20,17 19.54,17.46 19,17.83L20.46,19.28L19.04,20.7L17.6,19.26C16.97,19.6 16.27,19.83 15.55,19.92V21.92H13.55V19.92C12.83,19.83 12.13,19.6 11.5,19.26L10.07,20.7Z" /></svg>
    <span class="nav-text">Máquinas</span>
  </a>

  <a class="nav-item" href="/work-orders" use:link use:active={{ path: "/work-orders", className: "active" }} title="Órdenes de trabajo de maquinaria">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m0 14h-5v-2h5v2m3-4h-8v-2h8v2m0-4h-8V7h8v2z" /></svg>
    <span class="nav-text">Órdenes</span>
  </a>

  <a class="nav-item" href="/consolidado" use:link use:active={{ path: "/consolidado", className: "active" }} title="Aceite motor e hidráulico por máquina (horómetro). Exportar Excel.">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,10H10V14H14V10M19,10H15V14H19V10M14,15H10V19H14V15M19,15H15V19H19V15M20,1H4C2.89,1 2,1.89 2,3V21C2,22.11 2.89,23 4,23H20C21.11,23 22,22.11 22,21V3C22,1.89 21.11,1 20,1M20,21H4V7H20V21Z" /></svg>
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

  <a class="nav-item" href="/vehicles" use:link use:active={{ path: "/vehicles", className: "active" }} title="Inventario y datos maestros">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6.01M6.5,16A1.5,1.5 0 1,1 8,14.5A1.5,1.5 0 0,1 6.5,16M17.5,16A1.5,1.5 0 1,1 19,14.5A1.5,1.5 0 0,1 17.5,16M5,11L6.5,6.5H17.5L19,11H5Z" /></svg>
    <span class="nav-text">Inventario</span>
  </a>

  <a class="nav-item" href="/vehicle-monitoring" use:link use:active={{ path: "/vehicle-monitoring", className: "active" }} title="Estado operativo: documentos, aceite y kilometraje (vista tipo planilla).">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M13,7H11V13H17V11H13V7Z" /></svg>
    <span class="nav-text">Monitoreo</span>
  </a>

  <a class="nav-item" href="/vehicle-maintenance" use:link use:active={{ path: "/vehicle-maintenance", className: "active" }} title="Cambio de aceite motor y vencimientos SOAT / Tecnomecánica (administración web).">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.7,4.7C0.6,7.1 1,10.1 3,12.1C4.9,14 7.6,14.5 9.9,13.6L19,22.7L22.7,19Z" /></svg>
    <span class="nav-text">Aceite y documentos</span>
  </a>

  <a class="nav-item" href="/vehicle-workshop-history" use:link use:active={{ path: "/vehicle-workshop-history", className: "active" }} title="Historial de mantenimientos en taller (repuestos, tipo de servicio).">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M16,18H8V16H16V18M16,14H8V12H16V14M13,9V3.5L18.5,9H13Z" /></svg>
    <span class="nav-text">Historial taller</span>
  </a>

  <a class="nav-item" href="/vehicle-inspections" use:link use:active={{ path: "/vehicle-inspections", className: "active" }} title="Inspecciones pre-operativas desde campo">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
    <span class="nav-text">Inspecciones</span>
  </a>

  <!-- ── Motocicletas ── -->
  <div class="section-header"><span>Motos</span></div>

  <a class="nav-item" href="/moto-monitoring" use:link use:active={{ path: "/moto-monitoring", className: "active" }} title="Estado consolidado: documentación, aceite, último reporte">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M13.96,12.29L11.21,15.04L9.46,13.29L8.04,14.71L11.21,17.88L15.38,13.71L13.96,12.29M16.5,7V9H7.5V7H16.5Z" /></svg>
    <span class="nav-text">Monitoreo</span>
  </a>

  <a class="nav-item" href="/moto-inspections" use:link use:active={{ path: "/moto-inspections", className: "active" }} title="Inspecciones de motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M17,12L12,17L7,12L8.41,10.59L11,13.17V7H13V13.17L15.59,10.59L17,12Z" /></svg>
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
