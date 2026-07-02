<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from "svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { dashboardColumns } from "../../config/table-definitions.js";
  import { data } from "../../stores/data.js";
  import { addNotification, ui } from "../../stores/ui.js";
  import { download } from "../../stores/api.js";

  const dispatch = createEventDispatcher();

  $: dashboardInfo = $data.dashboard;
  $: isLoading = $data.isLoading;

  onMount(() => {
    if (!$data.dashboard || !$data.dashboard.data || $data.dashboard.data.length === 0) {
      data.fetchDashboardData(0, 20);
    }
  });
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
      await download("inspection/export", "inspecciones.xlsx");
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

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando inspecciones...</p>
      </div>
    {:else}
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchDashboardData()}>
          Refrescar
        </button>
        <button
          type="button"
          class="vehicle-btn vehicle-btn--export"
          on:click={handleExportInspections}
          disabled={isExporting}
        >
          {#if isExporting}<span class="spin">⟳</span>{/if}
          {isExporting ? "Descargando..." : "Exportar Excel"}
        </button>
      </div>
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
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
  </div>
</div>
