<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { data as dataStore } from '../../../stores/data.js';
  import { auth } from '../../../stores/auth.js';
  import DataGrid from '../../shared/DataGrid.svelte';
  import Loader from '../../shared/Loader.svelte';
  import { fmtCurrency, fmtNum, fmtDate, fmtEfficiency } from '@/lib/fuelFormat.js';

  const dispatch = createEventDispatcher();

  let anomaliesData = [];
  let anomaliesLoading = false;

  let dismissRow = null;
  let dismissReason = '';
  let dismissCost = '';
  let dismissLoading = false;

  function getAssetLabel(r) {
    if (r.assetType === 'MACHINE') {
      const machine = $dataStore.machines?.find(m => m.id === r.assetId);
      if (machine) {
        const parts = [machine.name, machine.model, r.assetPlate].filter(p => p && p.trim());
        return parts.join(' · ');
      }
    } else if (r.assetType === 'VEHICLE') {
      const vehicle = $dataStore.vehicles?.find(v => v.id === r.assetId);
      if (vehicle) {
        const parts = [r.assetPlate, vehicle.marca].filter(p => p && p.trim());
        return parts.join(' — ');
      }
    } else if (r.assetType === 'MOTO') {
      const moto = $dataStore.motos?.find(m => m.id === r.assetId);
      if (moto) {
        const parts = [r.assetPlate, moto.marca].filter(p => p && p.trim());
        return parts.join(' — ');
      }
    }
    return r.assetPlate || `ID ${r.assetId}`;
  }

  async function loadAnomalies() {
    if (anomaliesLoading) return;
    anomaliesLoading = true;
    try {
      anomaliesData = await dataStore.fetchFuelAnomalies();
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      anomaliesLoading = false;
    }
  }

  export function reload() {
    return loadAnomalies();
  }

  async function handleDismissAnomaly() {
    dismissLoading = true;
    try {
      await dataStore.dismissFuelAnomaly(
        dismissRow.id,
        dismissReason || null,
        dismissCost ? Number(dismissCost) : null
      );
      await loadAnomalies();
      dismissRow = null; dismissReason = ''; dismissCost = '';
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      dismissLoading = false;
    }
  }

  $: anomaliesEnriched = anomaliesData.map(r => ({
    ...r,
    _effLabel:          fmtEfficiency(r),
    _costLabel:         fmtCurrency(r.totalCostCalculated),
    _costMismatchLabel: fmtCurrency(r.totalCostActual),
    _gallonsLabel:      `${fmtNum(r.quantityGallons, 3)} Gal`,
    _dateLabel:         fmtDate(r.fuelDateTime),
  }));

  $: anomalyColumns = [
    { id: 'date',     header: 'Fecha',           accessorFn: r => r.fuelDateTime ? new Date(r.fuelDateTime).getTime() : 0,
                                                  cell: info => info.row.original._dateLabel,   size: 120 },
    { accessorKey: 'assetType',  header: 'Tipo',             size: 80  },
    { id: 'plate', header: 'Placa / Nombre', accessorFn: getAssetLabel, size: 200 },
    { accessorKey: 'fuelType',   header: 'Combustible',      size: 130 },
    { id: 'gallons',  header: 'Galones',          accessorFn: r => Number(r.quantityGallons ?? 0),
                                                  cell: info => info.row.original._gallonsLabel, size: 90 },
    { id: 'cost',     header: 'Total',            accessorFn: r => Number(r.totalCostCalculated ?? 0),
                                                  size: 120, meta: { isAnomalyCost: true } },
    { id: 'eff',      header: 'Eficiencia',       accessorFn: r => Number(r.efficiencyValue ?? -Infinity),
                                                  size: 110, meta: { isAnomalyEfficiency: true } },
    { accessorKey: 'odometerKm',  header: 'Odómetro km',   size: 100 },
    { accessorKey: 'hourMeter',   header: 'Horómetro h',    size: 100 },
    { accessorKey: 'serviceStation', header: 'Estación',    size: 90  },
    { accessorKey: 'registeredBy',   header: 'Registrado por', size: 100 },
    { id: 'receipt',  header: 'Recibo',           enableSorting: false, size: 80,
                                                  meta: { isInvoicePhotoLink: true } },
    ...($auth?.currentUser?.role === 'ADMIN'
      ? [{ id: 'dismiss', header: 'Acciones', enableSorting: false, size: 130,
           meta: { isAnomDismissAction: true } }]
      : []),
  ];

  onMount(loadAnomalies);
</script>

{#if anomaliesLoading && anomaliesData.length === 0}
  <div class="loader-container"><Loader /><p>Cargando anomalías...</p></div>
{:else if anomaliesData.length === 0}
  <div class="empty-msg">✓ No hay registros marcados como anómalos.</div>
{:else}
  <div class="fuel-toolbar">
    <span class="fuel-toolbar-label">
      {anomaliesData.length} registro{anomaliesData.length !== 1 ? 's' : ''} con consumo anómalo detectados
    </span>
  </div>
  <!-- Panel de dismiss activo -->
  {#if dismissRow}
    <div class="dismiss-panel">
      <h4>Descartar anomalía — {dismissRow.assetPlate ?? `ID ${dismissRow.assetId}`} · {fmtDate(dismissRow.fuelDateTime)}</h4>
      <div class="dismiss-row">
        <div class="dismiss-field" style="flex:2">
          <label>Razón (opcional):</label>
          <input type="text" bind:value={dismissReason} placeholder="Ej: Error de digitación corregido" />
        </div>
        <div class="dismiss-field" style="flex:1">
          <label>Costo real corregido ($):</label>
          <input type="number" step="0.01" bind:value={dismissCost} placeholder="Dejar vacío si no cambia" />
        </div>
        <button class="btn btn-primary" disabled={dismissLoading} on:click={handleDismissAnomaly}>
          {dismissLoading ? '...' : '✓ Confirmar'}
        </button>
        <button class="btn" on:click={() => { dismissRow = null; dismissReason = ''; dismissCost = ''; }}>
          Cancelar
        </button>
      </div>
    </div>
  {/if}

  <DataGrid
    columns={anomalyColumns}
    data={anomaliesEnriched}
    totalElements={anomaliesEnriched.length}
    totalPages={Math.max(1, Math.ceil(anomaliesEnriched.length / 20))}
    currentPage={0}
    pageSize={20}
    showPagination={true}
    on:action={e => {
      if (e.detail.type === 'dismiss_anomaly') {
        dismissRow = e.detail.data; dismissReason = ''; dismissCost = '';
      }
    }}
  />
{/if}

<style>
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
  .fuel-toolbar {
    padding: 12px;
    background: #e0e0e0;
    border: 1px solid #808080;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
    font-size: 11px;
  }
  .fuel-toolbar-label { font-weight: bold; color: #333; }
  .dismiss-panel { background: #fff8e0; border: 1px solid #c8a800; padding: 10px; margin-bottom: 8px; font-size: 11px; }
  .dismiss-panel h4 { margin: 0 0 8px 0; font-size: 12px; }
  .dismiss-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
  .dismiss-field { display: flex; flex-direction: column; gap: 3px; }
  .dismiss-field label { font-weight: bold; font-size: 10px; }
  .dismiss-field input { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; }
</style>
