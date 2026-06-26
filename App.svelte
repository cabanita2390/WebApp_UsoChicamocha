<script>
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import Router from "svelte-spa-router";
  import MainLayout from "./components/layouts/MainLayout.svelte";
  import WorkOrderModal from "./components/shared/WorkOrderModal.svelte";
  import Login from "./components/views/Login.svelte";
  import UserManagement from "./components/views/UserManagement.svelte";
  import MachineManagement from "./components/views/MachineManagement.svelte";
  import WorkOrderManagement from "./components/views/WorkOrderManagement.svelte";
  import Consolidado from "./components/views/Consolidado.svelte";
  import Loader from "./components/shared/Loader.svelte";
  import Dashboard from "./components/views/Dashboard.svelte";
  import OilManagement from "./components/views/OilManagement.svelte";
  import { auth } from "./stores/auth.js";
  import {
    ui,
    notificationCount,
    addNotification,
    notificationMessages,
    removeNotification,
  } from "./stores/ui.js";
  import { data } from "./stores/data.js";
  import {
    initializeWebSocketNotifications,
    disconnectFromWebSocket,
    wsNotificationService,
    setWebSocketSoundNeedsActivation,
    soundNeedsActivation,
    activateSound as activateWebSocketSound,
  } from "./composables/useWebSocketNotifications.js";
  import {
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    isAutoRefreshEnabled,
    isAutoRefreshActive,
  } from "./composables/useAutoRefresh.js";
  import ImageCarouselModal from "./components/shared/ImageCarouselModal.svelte";

  // --- ROUTES DEFINITION ---
  const routes = {
    "/": Dashboard,
    "/users": UserManagement,
    "/machines": MachineManagement,
    "/work-orders": WorkOrderManagement,
    "/consolidado": Consolidado,
    "/oil-management": OilManagement,
  };

  function handleActivateSound() {
    console.log(
      "🔊 [AUDIO] Activando sonido WebSocket por click del usuario...",
    );

    activateWebSocketSound();

    // Update the WebSocket sound activation state
    setWebSocketSoundNeedsActivation(false);

    console.log("Contexto de audio WebSocket activado por el usuario.");
  }

  function handleActivateSoundKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      handleActivateSound();
    }
  }

  // WebSocket connection status monitoring is now handled via wsNotificationService store
  $: {
    const wsStatus = $wsNotificationService;
    console.log("🔌 [APP] Estado WebSocket actualizado:", wsStatus);
  }

  // --- LIFECYCLE HOOKS ---
  onMount(async () => {
    console.log("🚀 [APP] Iniciando aplicación...");
    const isAuthenticated = await auth.checkAuth();
    console.log(
      "🚀 [APP] Estado de autenticación:",
      isAuthenticated ? "AUTENTICADO" : "NO AUTENTICADO",
    );

    if (isAuthenticated) {
      console.log(
        "🚀 [APP] Usuario autenticado en onMount - La suscripción iniciará los servicios.",
      );
    } else {
      console.log("🚀 [APP] Usuario no autenticado - mostrando login");
    }
  });

  auth.subscribe((value) => {
    console.log(
      "🚀 [APP] Cambio en estado de auth:",
      value.isAuthenticated ? "AUTENTICADO" : "NO AUTENTICADO",
    );

    if (value.isAuthenticated) {
      console.log("🚀 [APP] Usuario autenticado - Verificando servicios...");

      // Verificar si ya hay conexión para evitar duplicados
      const wsStatus = get(wsNotificationService);
      if (!wsStatus.isConnected && !wsStatus.isReconnecting) {
        console.log("🚀 [APP] Inicializando WebSocket notifications...");
        initializeWebSocketNotifications();
      } else {
        console.log("🚀 [APP] WebSocket ya conectado o conectando.");
      }

      // Verificar auto-refresh
      if (!get(isAutoRefreshActive)) {
        startAutoRefresh();
      }
    } else {
      console.log("🚀 [APP] Usuario desconectado - cerrando streams WebSocket");
      disconnectFromWebSocket();
      stopAutoRefresh();
    }
  });

  onDestroy(() => {
    disconnectFromWebSocket();
    stopAutoRefresh();
  });

  // --- EVENT HANDLERS ---

  async function handleCreateWorkOrder(event) {
    ui.setSaving(true);
    try {
      await data.createWorkOrder(event.detail);
      ui.closeWorkOrderModal();
    } catch (err) {
      console.error("Error creating work order:", err);
      addNotification({
        id: Date.now(),
        text: `Error al crear orden: ${err.message}`,
      });
    } finally {
      ui.setSaving(false);
    }
  }

  function handleCancelWorkOrder() {
    ui.closeWorkOrderModal();
  }

  // Handle route loaded event to fetch data
  function routeLoaded(event) {
    console.log("Route loaded:", event.detail.location);
    const location = event.detail.location;

    // Fetch data based on route and update current view
    if (location === "/" || location === "") {
      ui.setCurrentView("dashboard");
      data.fetchDashboardData();
    } else if (location.includes("/users")) {
      ui.setCurrentView("users");
      data.fetchUsers();
    } else if (location.includes("/machines")) {
      ui.setCurrentView("machines");
      data.fetchMachines();
    } else if (location.includes("/work-orders")) {
      ui.setCurrentView("work-orders");
      data.fetchWorkOrders();
    } else if (location.includes("/consolidado")) {
      ui.setCurrentView("consolidado");
      data.fetchConsolidadoData();
    } else if (location.includes("/oil-management")) {
      ui.setCurrentView("oil-management");
      data.fetchOils();
    }
  }
</script>

<svelte:head>
  <title
    >{$notificationCount > 0 ? `(${$notificationCount})` : ""} Dashboard Maquinaria</title
  >
</svelte:head>

{#if $soundNeedsActivation && $auth.isAuthenticated}
  <div
    class="sound-activation-overlay"
    on:click={handleActivateSound}
    on:keydown={handleActivateSoundKey}
    role="button"
    tabindex="0"
  >
    <div class="message-box">
      <h2>Activar Sonido</h2>
      <p>
        Haga clic en cualquier lugar para habilitar las notificaciones de
        sonido.
      </p>
    </div>
  </div>
{/if}

{#if $ui.isSaving}
  <div class="overlay">
    <Loader />
  </div>
{/if}

{#if $auth.isRefreshing}
  <div class="overlay">
    <div class="refresh-indicator">
      <Loader />
      <p>Renovando sesión...</p>
    </div>
  </div>
{/if}

{#if !$auth.isAuthenticated}
  <Login />
{:else}
  <MainLayout
    isAutoRefreshEnabled={$isAutoRefreshEnabled}
    isAutoRefreshActive={$isAutoRefreshActive}
    on:toggleAutoRefresh={toggleAutoRefresh}
  >
    <Router {routes} on:routeLoaded={routeLoaded} />
  </MainLayout>

  {#if $ui.showWorkOrderModal}
    <WorkOrderModal
      rowData={$ui.selectedRowData}
      columnDef={$ui.selectedColumnDef}
      currentUser={$auth.currentUser?.name}
      on:createWorkOrder={handleCreateWorkOrder}
      on:cancel={handleCancelWorkOrder}
    />
  {/if}

  {#if $ui.showImageModal}
    <ImageCarouselModal
      imageUrls={$ui.imageModalUrls}
      isLoading={$ui.isImageModalLoading}
      on:close={ui.closeImageModal}
    />
  {/if}
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  .refresh-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
    font-size: 14px;
  }

  .sound-activation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    cursor: pointer;
    color: white;
  }
  .message-box {
    padding: 24px 48px;
    background: #e0e0e0;
    color: #000;
    border: 2px outset #c0c0c0;
    font-size: 14px;
    text-align: center;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
  }
  .message-box h2 {
    margin: 0 0 12px 0;
  }
</style>
