<script>
  import { createEventDispatcher } from 'svelte';
  import { data as dataStore } from '../../../stores/data.js';
  import { addNotification } from '../../../stores/ui.js';
  import DataGrid from '../../shared/DataGrid.svelte';
  import Loader from '../../shared/Loader.svelte';
  import FuelAssetHistorialModal from '../../shared/FuelAssetHistorialModal.svelte';
  import { fmtEfficiency } from '@/lib/fuelFormat.js';

  export let isLoading = false;
  export let logs = [];
  export let isAdmin = false;

  const dispatch = createEventDispatcher();

  let regPage = 0;
  let regPageSize = 20;

  $: logs, (regPage = 0);
  $: regTotalPages = Math.max(1, Math.ceil(logs.length / regPageSize));
  $: regPagedData  = logs.slice(regPage * regPageSize, (regPage + 1) * regPageSize);

  let historialRow = null;
  let historialLogs = [];
  let historialLoading = false;

  async function openHistorial(row) {
    historialRow = row;
    historialLogs = [];
    historialLoading = true;
    try {
      historialLogs = await dataStore.fetchFuelHistoryByAsset(row.assetType, row.assetId);
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      historialLoading = false;
    }
  }

  async function handleInvoiceUpload(id, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await dataStore.uploadFuelInvoice(id, file);
      addNotification({
        id: Date.now(),
        text: `Factura "${file.name}" subida exitosamente.`
      });
    } catch (e) {
      dispatch('error', e.message);
      addNotification({
        id: Date.now(),
        text: `Error al subir factura: ${e.message}`
      });
    } finally {
      event.target.value = '';
    }
  }

  function handleGridAction(event) {
    const { type, data: row, extraData: eventData } = event.detail;
    if (type === 'fuel_historial') openHistorial(row);
    if (type === 'fuel_invoice_upload' && eventData) {
      handleInvoiceUpload(row.id, eventData);
    }
  }

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

  // ── columnas tabla registros ──────────────────────────────────────────────────
  const columns = [
    { header: 'Fecha', accessorFn: r => {
      if (!r.fuelDateTime) return '—';
      const d = new Date(r.fuelDateTime);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }},
    { header: 'Tipo Activo', accessorKey: 'assetType' },
    { header: 'Placa / Nombre', accessorFn: getAssetLabel, size: 200 },
    { header: 'Tipo Combustible', accessorKey: 'fuelType' },
    { header: 'Cantidad', accessorFn: r => r.quantity != null ? `${r.quantity} ${r.quantityUnit ?? ''}` : '—' },
    { header: 'Galones', accessorFn: r => r.quantityGallons != null ? Number(r.quantityGallons).toFixed(3) : '—' },
    { header: 'Precio/Unidad', accessorFn: r => r.pricePerUnit != null ? `$${Number(r.pricePerUnit).toLocaleString('es-CO')}` : '—' },
    { header: 'Total', accessorFn: r => {
        const val = r.totalCostCalculated != null ? `$${Number(r.totalCostCalculated).toLocaleString('es-CO')}` : '—';
        return r.totalCostMismatch ? `⚠ ${val}` : val;
      }
    },
    { header: 'Odómetro Km', accessorKey: 'odometerKm' },
    { header: 'Horómetro h', accessorKey: 'hourMeter' },
    { header: 'Eficiencia', accessorFn: fmtEfficiency },
    { header: 'Anomalía', accessorFn: r => r.isAnomaly ? '⚠ Sí' : 'No' },
    { header: 'Estación', accessorKey: 'serviceStation' },
    { header: 'Registrado por', accessorKey: 'registeredBy' },
    { header: 'Historial', id: 'fuel_historial', accessorFn: () => '', meta: { isFuelHistorial: true } },
  ];
</script>

{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando registros...</p>
  </div>
{:else}
  <DataGrid
    {columns}
    data={regPagedData}
    totalPages={regTotalPages}
    currentPage={regPage}
    pageSize={regPageSize}
    totalElements={logs.length}
    on:action={handleGridAction}
    on:pageChange={e => { regPage = e.detail; }}
    on:sizeChange={e => { regPageSize = e.detail; regPage = 0; }}
    showDeleteButton={isAdmin}
  />
{/if}

{#if historialRow}
  <FuelAssetHistorialModal
    assetType={historialRow.assetType}
    assetPlate={historialRow.assetPlate}
    logs={historialLogs}
    loading={historialLoading}
    onInvoiceUpload={handleInvoiceUpload}
    on:close={() => { historialRow = null; historialLogs = []; }}
  />
{/if}

<style>
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }
</style>
