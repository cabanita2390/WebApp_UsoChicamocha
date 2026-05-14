<script>
  import { reportMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { ui, addNotification } from '../../stores/ui.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  /** Refuerzo: una fila por placa (más reciente primero), por si el API devolviera duplicados. */
  function latestPerPlaca(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const sorted = [...rows].sort((a, b) => {
      const ta = a?.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const tb = b?.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return tb - ta;
    });
    const seen = new Set();
    const out = [];
    for (const r of sorted) {
      const raw = r?.placa != null ? String(r.placa).trim() : '';
      const key = raw ? raw.toUpperCase() : `id:${r?.idInspeccion ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }

  $: latest = latestPerPlaca($data.motoInspections);
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;
  $: total = Array.isArray(latest) ? latest.length : 0;

  let isExporting = false;

  async function handleRefresh() {
    await data.fetchMotoInspections();
  }

  async function handleExport() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/moto/inspections/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inspecciones_motos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Inspecciones de motos descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }

  function handleCellContextMenu(event) {
    const { row, columnDef } = event.detail;
    if (columnDef.meta?.isStatus || columnDef.meta?.isDateStatus) {
      ui.openVehicleWorkOrderModal(row, columnDef);
    }
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar</button>
      <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExport} disabled={isExporting}>
        {isExporting ? 'Descargando...' : 'Exportar Excel'}
      </button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando inspecciones de motos...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={reportMotoColumns}
          data={latest}
          fixedLayout={false}
          totalElements={total}
          totalPages={1}
          currentPage={0}
          pageSize={Math.max(total, 1)}
          showPagination={false}
          on:cellContextMenu={handleCellContextMenu}
        />
      </div>
    {/if}
  </div>
</div>
