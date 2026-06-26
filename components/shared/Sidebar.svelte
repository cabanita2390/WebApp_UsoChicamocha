<script>
  import { link, location } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
</script>

<nav class="sidebar">
  <!-- Botón de Dashboard -->
  <a
    class="nav-item"
    href="/"
    use:link
    use:active={{ path: "/", className: "active" }}
    title="Dashboard"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
    </svg>
    <span class="nav-text">Dashboard</span>
  </a>

  <!-- Botón de Usuarios -->
  <a
    class="nav-item"
    href="/users"
    use:link
    use:active={{ path: "/users", className: "active" }}
    title="Gestionar Usuarios"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
      />
    </svg>
    <span class="nav-text">Usuarios</span>
  </a>

  <!-- Botón de Máquinas -->
  <a
    class="nav-item"
    href="/machines"
    use:link
    use:active={{ path: "/machines", className: "active" }}
    title="Gestionar Máquinas"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M12,2L9.5,4.5L6.4,4L5.5,1L2,3.5L3,6.5L1,7.5L2.5,11L4.5,9.5L5,12.5L1.5,15L4,17.5L6.5,16.5L7.5,19L11,20.5L9.5,22.5L12.5,23L15,20.5L17.6,21L18.5,24L22,21.5L21,18.5L23,17.5L21.5,14L19.5,15.5L19,12.5L22.5,10L20,7.5L17.5,8.5L16.5,6L13,4.5L14.5,2.5L11.5,2H12Z"
      />
    </svg>
    <span class="nav-text">Máquinas</span>
  </a>

  <!-- Botón de Órdenes de Trabajo -->
  <a
    class="nav-item"
    href="/work-orders"
    use:link
    use:active={{ path: "/work-orders", className: "active" }}
    title="Órdenes de Trabajo"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m0 14h-5v-2h5v2m3-4h-8v-2h8v2m0-4h-8V7h8v2z"
      />
    </svg>
    <span class="nav-text">Órdenes</span>
  </a>

  <!-- Botón de Consolidado -->
  <a
    class="nav-item"
    href="/consolidado"
    use:link
    use:active={{ path: "/consolidado", className: "active" }}
    title="Consolidado"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M18 2C18 2 15 6 15 9A3 3 0 0 0 21 9C21 6 18 2 18 2Z"
        fill="currentColor"
      />
      <path
        d="M8 11L12 9L16 11V15L12 17L8 15Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="1.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
    </svg>
    <span class="nav-text">Consolidado</span>
  </a>

  <a
    class="nav-item"
    href="/oil-management"
    use:link
    use:active={{ path: "/oil-management", className: "active" }}
    title="Gestión de Aceites"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12 2C12 2 7 9 7 13A5 5 0 0 0 17 13C17 9 12 2 12 2Z"
        fill="currentColor"
      />
    </svg>
    <span class="nav-text">Aceites</span>
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
    overflow: hidden;
  }
  .sidebar:hover {
    width: 200px;
  }
  .nav-item {
    width: 100%;
    height: 42px;
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
    border: none;
    border-top: 1px solid #ffffff;
    border-bottom: 1px solid #808080;
    cursor: pointer;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 0 18px;
    gap: 20px;
    text-decoration: none;
    color: inherit;
    box-sizing: border-box; /* Ensure padding doesn't affect width */
  }
  .nav-item:first-child {
    border-top: none;
    margin-top: 16px;
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
