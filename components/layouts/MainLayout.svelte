<script>
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
    import Sidebar from "../shared/Sidebar.svelte";
    import NotificationDropdown from "../shared/NotificationDropdown.svelte";
    import { auth } from "../../stores/auth.js";
    import {
        ui,
        notificationCount,
        notificationMessages,
        removeNotification,
        preventiveAlertCount,
        preventiveAlerts,
        removePreventiveAlert,
        visibleAlertCount,
    } from "../../stores/ui.js";
    import { wsNotificationService } from "../../composables/useWebSocketNotifications.js";
    import { fetchAllAlerts } from "../../composables/useAlerts.js";
    import { location } from "svelte-spa-router";
    import { getPageTitle } from "../../config/page-titles.js";

    export let isAutoRefreshEnabled = true;
    export let isAutoRefreshActive = false;

    const dispatch = createEventDispatcher();
    let showNotifications = false;

    // Sincronizar contador con preventiveAlerts del store (cargado por App.svelte)
    onMount(() => {
        // Suscribirse a cambios en preventiveAlerts para actualizar el contador
        const unsubscribeAlerts = preventiveAlerts.subscribe(alerts => {
            if (alerts && Array.isArray(alerts)) {
                $visibleAlertCount = alerts.length + $notificationMessages.length;
                console.log('✅ Contador sincronizado:', {
                    alerts: alerts.length,
                    notifications: $notificationMessages.length,
                    total: $visibleAlertCount
                });
            }
        });

        // Suscribirse a cambios en notificationMessages también
        const unsubscribeMessages = notificationMessages.subscribe(messages => {
            if ($preventiveAlerts) {
                $visibleAlertCount = $preventiveAlerts.length + (messages?.length || 0);
            }
        });

        return () => {
            unsubscribeAlerts();
            unsubscribeMessages();
        };
    });

    function toggleNotifications() {
        showNotifications = !showNotifications;
    }

    function handleDeleteNotification(event) {
        const notificationId = event.detail;
        removeNotification(notificationId);
    }

    function handleDeleteAlert(event) {
        const alertId = event.detail;
        removePreventiveAlert(alertId);
    }

    function toggleAutoRefresh() {
        dispatch("toggleAutoRefresh");
    }

    function handleContainerClick(e) {
        const notifWrapper = e.target.closest('.notification-wrapper');
        if (!notifWrapper) {
            showNotifications = false;
        }
    }

    $: pageTitle = getPageTitle($location);
</script>

<div class="app-container" on:click={handleContainerClick}>
    <Sidebar />

    <main class="main-content">
        <header class="header">
            <div class="header-left">
                <div class="logo">
                    <img
                        src="/assets/images/usochicamocha-logo.webp"
                        alt="Logo de Usochicamocha"
                        class="logo-image"
                    />
                </div>
            </div>
            <div class="header-center">
                <h2>{pageTitle}</h2>
            </div>
            <div class="header-right">
                <div class="auto-refresh-indicator">
                    <button
                        class="auto-refresh-toggle"
                        on:click={toggleAutoRefresh}
                        title={isAutoRefreshEnabled
                            ? "Deshabilitar auto-refresh"
                            : "Habilitar auto-refresh"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            class:spinning={isAutoRefreshActive}
                        >
                            <path
                                d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"
                                fill={isAutoRefreshEnabled
                                    ? "#4CAF50"
                                    : "#9E9E9E"}
                            />
                        </svg>
                    </button>
                    {#if isAutoRefreshActive}
                        <span class="auto-refresh-text">Refrescando...</span>
                    {/if}
                </div>
                <div class="notification-wrapper">
                    <button
                        class="notification-bell"
                        on:click|stopPropagation={toggleNotifications}
                        title="Notificaciones y Alertas"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                                d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.36,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.63,5.36 6,7.93 6,11V16L4,18V19H20V18L18,16Z"
                            ></path></svg
                        >
                        {#if $visibleAlertCount > 0}
                            <span class="notification-badge"
                                >{$visibleAlertCount}</span
                            >
                        {/if}
                    </button>
                    {#if showNotifications}
                        <NotificationDropdown
                            messages={$notificationMessages}
                            alerts={$preventiveAlerts}
                            isOpen={showNotifications}
                            on:deleteNotification={handleDeleteNotification}
                            on:deleteAlert={handleDeleteAlert}
                        />
                    {/if}
                </div>

                <!-- WebSocket Connection Status -->
                <div
                    class="connection-status-indicator"
                    title="Estado de conexión WebSocket"
                >
                    {#if $wsNotificationService?.isConnected}
                        <div
                            class="connection-status connected"
                            title="Conectado - WebSocket"
                        ></div>
                    {:else}
                        <div
                            class="connection-status disconnected"
                            title="Desconectado"
                        ></div>
                    {/if}
                </div>
                <span class="user-info">Usuario: {$auth.currentUser?.name}</span
                >
                <button class="logout-btn" on:click={auth.logout}
                    >Cerrar Sesión</button
                >
            </div>
        </header>

        <div class="content">
            <slot />
        </div>
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        font-family: "MS Sans Serif", "Tahoma", sans-serif;
        background-color: #c0c0c0;
        font-size: 11px;
        overflow-x: hidden;
    }
    .app-container {
        display: flex;
        height: 100vh;
        background-color: #c0c0c0;
    }
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        transition: margin-left 0.3s ease;
        min-width: 0;
    }
    .header {
        background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
        padding: 8px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px inset #c0c0c0;
        border-top: 1px solid #ffffff;
    }
    .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .auto-refresh-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .auto-refresh-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }

    .auto-refresh-toggle:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

    .auto-refresh-toggle svg {
        width: 20px;
        height: 20px;
        transition: transform 0.3s ease;
    }

    .auto-refresh-toggle svg.spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .auto-refresh-text {
        font-size: 10px;
        color: #4caf50;
        font-weight: bold;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
        100% {
            opacity: 1;
        }
    }
    .header-left,
    .logo {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .logo-image {
        height: 40px;
        width: auto;
    }
    .header-center h2 {
        margin: 0;
        font-size: 14px;
        font-weight: normal;
    }
    .user-info {
        font-weight: bold;
        background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
        padding: 4px 8px;
        border: 1px inset #c0c0c0;
        font-size: 10px;
    }
    .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
        background-color: #c0c0c0;
        min-height: 0;
    }
    .notification-wrapper {
        position: relative;
    }
    .notification-bell {
        position: relative;
        background: none;
        border: none;
        cursor: pointer;
        margin-right: 16px;
        padding: 0;
    }
    .notification-bell svg {
        width: 24px;
        height: 24px;
        fill: #000000;
    }
    .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: red;
        color: white;
        border-radius: 50%;
        min-width: 16px;
        height: 16px;
        padding: 1px;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid white;
    }
    .logout-btn {
        padding: 4px 8px;
        margin-left: 12px;
        background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
        border: 1px outset #c0c0c0;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        color: #000000;
    }
    .logout-btn:hover {
        background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
    }

    /* WebSocket Connection Status Indicator */
    .connection-status-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.2);
    }

    .connection-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.3);
    }

    .connection-status.connected {
        background-color: #4caf50;
        animation: pulse-connected 2s ease-in-out infinite;
    }

    .connection-status.disconnected {
        background-color: #f44336;
        animation: pulse-disconnected 2s ease-in-out infinite;
    }

    @keyframes pulse-connected {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.1);
        }
    }

    @keyframes pulse-disconnected {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(0.9);
        }
    }

    /* Oil Change Alerts Container */
    .oil-alerts-container {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
</style>
