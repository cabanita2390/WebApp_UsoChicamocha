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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

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

<div class="consolidado-container">
  <div class="refresh-container">
    <button class="btn-refresh" on:click={() => data.fetchConsolidadoData()}>
      Refrescar información
    </button>
    <button class="btn-export" on:click={handleExportConsolidated} disabled={isExporting}>
      {#if isExporting}
        <span class="loading-icon">⟳</span>
      {/if}
      {isExporting ? 'Descargando...' : 'Exportar Excel'}
    </button>
  </div>
  {#if isLoading}
    <div class="loader-container">
      <Loader />
      <p>Cargando datos del consolidado...</p>
    </div>
  {:else if errorMessage}
    <div class="error-panel">
      <p><strong>Se encontraron problemas al cargar los datos:</strong></p>
      <p>{errorMessage}</p>
    </div>
  {:else}
    {#if distritoMachines.length > 0}
      <div class="table-group">
        <DataGrid columns={distritoColumns} data={distritoMachines} fixedLayout={false} />
      </div>
    {/if}
    
    {#if asociacionMachines.length > 0}
      <div class="table-group">
        <DataGrid columns={asociacionColumns} data={asociacionMachines} fixedLayout={false} />
      </div>
    {/if}
  {/if}
</div>

<style>
  .consolidado-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .loader-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 200px;
    gap: 16px;
  }
  .table-group {
    flex: 1;
    min-height: 0;
  }
  .error-panel {
    padding: 16px;
    background-color: #ffdddd;
    border: 1px solid #ff0000;
    color: #8b0000;
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
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

