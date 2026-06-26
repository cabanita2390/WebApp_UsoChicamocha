<script>
  import { createEventDispatcher } from "svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { dashboardColumns } from "../../config/table-definitions.js";
  import { data } from "../../stores/data.js";
  import { addNotification, ui } from "../../stores/ui.js";

  const dispatch = createEventDispatcher();

  $: dashboardInfo = $data.dashboard;
  $: isLoading = $data.isLoading;
  let isExporting = false;

  function handlePageChange(event) {
    const newPage = event.detail;
    data.fetchDashboardData(newPage, dashboardInfo.pageSize);
  }

  function handleSizeChange(event) {
    const newSize = event.detail;
    data.fetchDashboardData(0, newSize);
  }

  function handleCellContextMenu(event) {
    const { row, columnDef } = event.detail;
    if (columnDef.meta?.isStatus || columnDef.meta?.isDateStatus) {
      ui.openWorkOrderModal(row, columnDef);
    }
  }

  async function handleGridAction(event) {
    const { type, data: row } = event.detail;

    if (type === "view_images" && row && row.id) {
      ui.openImageModal();
      ui.setImageModalLoading(true);
      try {
        const urls = await data.fetchInspectionImages(row.id);
        ui.setImageModalUrls(urls);
      } catch (e) {
        console.error("Error fetching images:", e);
        addNotification({ id: Date.now(), text: "Error al cargar imágenes" });
        ui.setImageModalUrls([]);
      } finally {
        ui.setImageModalLoading(false);
      }
    } else {
      // Forward other actions if any
      dispatch("gridaction", event.detail);
    }
  }

  async function handleExportInspections() {
    isExporting = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/inspection/export`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error al descargar el archivo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inspecciones.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification({
        id: Date.now(),
        text: "Archivo de inspecciones descargado con éxito.",
      });
    } catch (e) {
      addNotification({
        id: Date.now(),
        text: `Error al descargar el archivo: ${e.message}`,
      });
    } finally {
      isExporting = false;
    }
  }
</script>

{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando inspecciones...</p>
  </div>
{:else}
  <div class="refresh-container">
    <button class="btn-refresh" on:click={() => data.fetchDashboardData()}>
      Refrescar información
    </button>
    <button
      class="btn-export"
      on:click={handleExportInspections}
      disabled={isExporting}
    >
      {#if isExporting}
        <span class="loading-icon">⟳</span>
      {/if}
      {isExporting ? "Descargando..." : "Exportar Excel"}
    </button>
  </div>
  <div class="grid-wrapper">
    <DataGrid
      columns={dashboardColumns}
      data={dashboardInfo.data}
      totalElements={dashboardInfo.totalElements}
      totalPages={dashboardInfo.totalPages}
      currentPage={dashboardInfo.currentPage}
      pageSize={dashboardInfo.pageSize}
      on:action={handleGridAction}
      on:cellContextMenu={handleCellContextMenu}
      on:pageChange={handlePageChange}
      on:sizeChange={handleSizeChange}
    />
  </div>
{/if}

<style>
  .loader-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .grid-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .refresh-container {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 8px;
  }
  .btn-refresh {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
  }
  .btn-refresh:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
  .btn-export {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #90ee90 0%, #7bc97b 100%);
    border: 1px outset #7bc97b;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .btn-export:hover:not(:disabled) {
    background: linear-gradient(to bottom, #a0ffa0 0%, #8bd98b 100%);
  }
  .btn-export:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .loading-icon {
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
</style>
