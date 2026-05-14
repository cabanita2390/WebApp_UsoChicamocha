<script>
  import { createConsolidadoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { addNotification } from '../../stores/ui.js';

  const distritoColumns = createConsolidadoColumns('Distrito');
  const asociacionColumns = createConsolidadoColumns('Asociación');

  $: distritoMachines = $data.consolidated.distrito;
  $: asociacionMachines = $data.consolidated.asociacion;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;
  let isExporting = false;

  async function handleExportConsolidated() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/oil-changes/consolidated/excel`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'consolidado.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Archivo consolidado descargado con éxito.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar el archivo: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={() => data.fetchConsolidadoData()}>
        Refrescar
      </button>
      <button class="vehicle-btn vehicle-btn--export" on:click={handleExportConsolidated} disabled={isExporting}>
        {#if isExporting}<span class="spin">⟳</span>{/if}
        {isExporting ? 'Descargando...' : 'Exportar Excel'}
      </button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando datos del consolidado...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Se encontraron problemas al cargar los datos:</strong></p>
        <p>{errorMessage}</p>
      </div>
    {:else if distritoMachines.length === 0 && asociacionMachines.length === 0}
      <div class="empty-state">
        <p>No hay datos disponibles. Verifique que las máquinas tengan inspecciones y cambios de aceite registrados.</p>
      </div>
    {:else}
      {#if distritoMachines.length > 0}
        <div class="vehicle-table-wrap vehicle-table-wrap--inset">
          <DataGrid columns={distritoColumns} data={distritoMachines} fixedLayout={false} />
        </div>
      {/if}
      {#if asociacionMachines.length > 0}
        <div class="vehicle-table-wrap vehicle-table-wrap--inset">
          <DataGrid columns={asociacionColumns} data={asociacionMachines} fixedLayout={false} />
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .empty-state {
    padding: 14px 16px;
    background: #f5f5f5;
    border: 1px inset #c0c0c0;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    color: #202020;
  }
</style>
