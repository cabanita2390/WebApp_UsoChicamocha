<script>
  import { link } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
  import { auth } from "../../stores/auth.js";

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
</script>

<nav class="sidebar">

  <!-- ── General ── -->
  <div class="section-header"><span>General</span></div>

  <a class="nav-item" href="/" use:link use:active={{ path: "/", className: "active" }} title="Panel principal — inspecciones pre-operativas">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>
    <span class="nav-text">Dashboard</span>
  </a>

  {#if isAdmin}
  <a class="nav-item" href="/users" use:link use:active={{ path: "/users", className: "active" }} title="Usuarios del sistema">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>
    <span class="nav-text">Usuarios</span>
  </a>
  {/if}

  <!-- ── Activos ── -->
  <div class="section-header"><span>Activos</span></div>

  <a class="nav-item" href="/inventory" use:link use:active={{ path: "/inventory", className: "active" }} title="Inventario: Maquinaria · Vehículos · Motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z" /></svg>
    <span class="nav-text">Inventario</span>
  </a>

  <a class="nav-item" href="/work-orders" use:link use:active={{ path: "/work-orders", className: "active" }} title="Órdenes de trabajo: Maquinaria · Vehículos · Motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m0 14h-5v-2h5v2m3-4h-8v-2h8v2m0-4h-8V7h8v2z" /></svg>
    <span class="nav-text">Órdenes de Trabajo</span>
  </a>

  <a class="nav-item" href="/consolidado" use:link use:active={{ path: "/consolidado", className: "active" }} title="Consolidado de aceites y estado: Maquinaria · Vehículos · Motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="nav-icon-consolidado" aria-hidden="true">
      <path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M18 2C18 2 15 6 15 9A3 3 0 0 0 21 9C21 6 18 2 18 2Z" fill="currentColor" />
      <path d="M8 11L12 9L16 11V15L12 17L8 15Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="12" cy="13" r="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
    </svg>
    <span class="nav-text">Consolidado</span>
  </a>

  <!-- ── Combustibles ── 
  <div class="section-header"><span>Combustibles</span></div>

  <a class="nav-item" href="/fuel" use:link use:active={{ path: "/fuel", className: "active" }} title="Registro de cargas de combustible — Maquinaria · Vehículos · Motos">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    <span class="nav-text">Combustibles</span>
  </a>
  -->

  <!-- ── Aceites ── -->
  <div class="section-header"><span>Aceites</span></div>

  <a class="nav-item" href="/oil-management" use:link use:active={{ path: "/oil-management", className: "active" }} title="Marcas de aceite del catálogo compartido">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C12 2 7 9 7 13A5 5 0 0 0 17 13C17 9 12 2 12 2Z" fill="currentColor" /></svg>
    <span class="nav-text">Marcas (catálogo)</span>
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
