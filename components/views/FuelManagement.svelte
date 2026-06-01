<script>
  import { onMount } from 'svelte';
  import { data as dataStore } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import FuelRegistrationModal from '../shared/FuelRegistrationModal.svelte';
  import FuelAssetHistorialModal from '../shared/FuelAssetHistorialModal.svelte';
  import { auth } from '../../stores/auth.js';

  // ── store state ──────────────────────────────────────────────────────────────
  let fuelLogs = [];
  let dashboard = null;
  let isLoading = false;
  let error = '';

  $: fuelLogs = $dataStore.fuelLogs || [];
  $: dashboard = $dataStore.fuelDashboard;
  $: isLoading = $dataStore.isLoading;

  // Un registro por activo: el más reciente. Los demás están en el historial.
  $: latestFuelLogs = (() => {
    const map = new Map();
    for (const log of fuelLogs) {
      const key = `${log.assetType}-${log.assetId}`;
      const prev = map.get(key);
      if (!prev || new Date(log.fuelDateTime) > new Date(prev.fuelDateTime)) {
        map.set(key, log);
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.fuelDateTime) - new Date(a.fuelDateTime)
    );
  })();

  // ── filtros ──────────────────────────────────────────────────────────────────
  let filterFrom = '';
  let filterTo = '';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';

  // ── tabs ─────────────────────────────────────────────────────────────────────
  let activeTab = 'registros'; // 'registros' | 'ranking' | 'anomalias' | 'facturas' | 'estadisticas' | 'estaciones'

  // ── ranking ──────────────────────────────────────────────────────────────────
  let rankingData = [];
  let rankingLoading = false;
  let rankingLoaded = false; // loaded for current filter

  // ── anomalías ────────────────────────────────────────────────────────────────
  let anomaliesData = [];
  let anomaliesLoading = false;
  let anomaliesLoaded = false;

  // ── estadísticas ─────────────────────────────────────────────────────────────
  let statsData = [];
  let statsLoading = false;
  let statsLoaded = false;

  async function loadStats() {
    if (statsLoading) return;
    statsLoading = true;
    try {
      statsData = await dataStore.fetchFuelMonthlyStats(filterFrom || null, filterTo || null);
      statsLoaded = true;
    } catch (e) {
      error = e.message;
    } finally {
      statsLoading = false;
    }
  }

  // Derivados para los gráficos
  $: totalMachineCost  = statsData.reduce((a, m) => a + (m.machineCost  ?? 0), 0);
  $: totalVehicleCost  = statsData.reduce((a, m) => a + (m.vehicleCost  ?? 0), 0);
  $: totalMotoCost     = statsData.reduce((a, m) => a + (m.motoCost     ?? 0), 0);
  $: grandTotalCost    = totalMachineCost + totalVehicleCost + totalMotoCost;
  $: grandTotalGallons = statsData.reduce((a, m) => a + (m.totalGallons ?? 0), 0);
  $: avgMonthlyCost    = statsData.length ? grandTotalCost / statsData.length : 0;
  $: peakMonth         = statsData.reduce((best, m) =>
      (m.totalCost ?? 0) > (best?.totalCost ?? 0) ? m : best, null);
  $: maxMonthCost      = Math.max(...statsData.map(m => m.totalCost ?? 0), 1);
  $: maxMonthGallons   = Math.max(...statsData.map(m => m.totalGallons ?? 0), 1);
  $: totalAnomalies    = statsData.reduce((a, m) => a + (m.anomalyCount ?? 0), 0);

  // constantes de layout para los gráficos SVG
  $: BAR_W       = statsData.length > 0 ? Math.max(32, Math.floor(680 / statsData.length) - 8) : 40;
  $: CHART_H     = 220;
  $: BAR_PAD     = { top: 24, right: 16, bottom: 44, left: 68 };
  $: BAR_GAP     = 10;
  $: BAR_TOTAL_W = statsData.length * (BAR_W + BAR_GAP) + BAR_PAD.left + BAR_PAD.right;
  $: LINE_H      = 170;
  $: LINE_P      = { top: 20, right: 24, bottom: 40, left: 68 };
  $: LINE_W      = Math.max(500, statsData.length * 90);

  // ── paginación cliente por tab ────────────────────────────────────────────────
  let regPage = 0;    let regPageSize = 20;
  let rankPage = 0;   let rankPageSize = 20;
  let anomPage = 0;   let anomPageSize = 20;
  let invPage = 0;    let invPageSize = 20;

  $: regTotalPages  = Math.max(1, Math.ceil(latestFuelLogs.length / regPageSize));
  $: rankTotalPages = Math.max(1, Math.ceil(rankingData.length   / rankPageSize));
  $: anomTotalPages = Math.max(1, Math.ceil(anomaliesData.length / anomPageSize));

  $: regPagedData  = latestFuelLogs.slice(regPage  * regPageSize,  (regPage  + 1) * regPageSize);
  $: rankPagedData = rankingData.slice(rankPage * rankPageSize, (rankPage + 1) * rankPageSize);
  $: anomPagedData = anomaliesData.slice(anomPage * anomPageSize, (anomPage + 1) * anomPageSize);

  // Resetear página al cambiar datos o filtros
  $: latestFuelLogs, regPage  = 0;
  $: rankingData,    rankPage = 0;
  $: anomaliesData,  anomPage = 0;

  // ── facturas ─────────────────────────────────────────────────────────────────
  let invoiceFilter = 'ALL'; // 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  let invoiceActionLoading = null; // id del registro en proceso
  $: invoiceRows = fuelLogs.filter(r =>
    invoiceFilter === 'ALL' ? true : r.invoiceStatus === invoiceFilter
  );
  $: invTotalPages = Math.max(1, Math.ceil(invoiceRows.length / invPageSize));
  $: invPagedData  = invoiceRows.slice(invPage * invPageSize, (invPage + 1) * invPageSize);
  $: invoiceRows, invPage = 0;

  async function handleInvoiceAction(id, status) {
    invoiceActionLoading = id;
    try {
      await dataStore.updateFuelInvoiceStatus(id, status);
    } catch (e) { error = e.message; }
    finally { invoiceActionLoading = null; }
  }

  async function handleInvoiceUpload(id, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    invoiceActionLoading = id;
    try {
      await dataStore.uploadFuelInvoice(id, file);
    } catch (e) { error = e.message; }
    finally { invoiceActionLoading = null; event.target.value = ''; }
  }

  function invoiceUrl(path) {
    if (!path) return null;
    // si ya es URL absoluta la devuelve tal cual, si es ruta local agrega base
    if (path.startsWith('http')) return path;
    const base = window.location.origin;
    return `${base}/${path}`;
  }

  // ── modals ───────────────────────────────────────────────────────────────────
  let showCreateModal = false;
  let historialRow = null;
  let historialLogs = [];
  let historialLoading = false;

  // ── anomaly dismiss ──────────────────────────────────────────────────────────
  let dismissRow = null;
  let dismissReason = '';
  let dismissCost = '';
  let dismissLoading = false;

  async function handleDismissAnomaly() {
    dismissLoading = true;
    try {
      await dataStore.dismissFuelAnomaly(
        dismissRow.id,
        dismissReason || null,
        dismissCost ? Number(dismissCost) : null
      );
      anomaliesLoaded = false;
      await loadAnomalies();
      dismissRow = null; dismissReason = ''; dismissCost = '';
    } catch (e) { error = e.message; }
    finally { dismissLoading = false; }
  }

  // ── estaciones ───────────────────────────────────────────────────────────────
  let stationsData = [];
  let stationsLoading = false;
  let stationsLoaded = false;
  let stationNewName = '';
  let stationEditId = null;
  let stationEditName = '';
  let stationActionLoading = null;

  async function loadStations() {
    if (stationsLoading) return;
    stationsLoading = true;
    try {
      stationsData = await dataStore.fetchFuelStations();
      stationsLoaded = true;
    } catch (e) { error = e.message; }
    finally { stationsLoading = false; }
  }

  async function handleCreateStation() {
    if (!stationNewName.trim()) return;
    stationActionLoading = 'new';
    try {
      await dataStore.createFuelStation(stationNewName.trim());
      stationNewName = '';
      await loadStations();
    } catch (e) { error = e.message; }
    finally { stationActionLoading = null; }
  }

  async function handleUpdateStation(id) {
    if (!stationEditName.trim()) return;
    stationActionLoading = id;
    try {
      await dataStore.updateFuelStation(id, stationEditName.trim());
      stationEditId = null; stationEditName = '';
      await loadStations();
    } catch (e) { error = e.message; }
    finally { stationActionLoading = null; }
  }

  async function handleDeleteStation(id) {
    stationActionLoading = id;
    try {
      await dataStore.deleteFuelStation(id);
      await loadStations();
    } catch (e) { error = e.message; }
    finally { stationActionLoading = null; }
  }

  // ── export excel ─────────────────────────────────────────────────────────────
  async function handleExportExcel() {
    const { api } = await import('../../stores/api.js');
    let base; api.subscribe(v => { base = v; })();
    const params = new URLSearchParams();
    if (filterFrom) params.append('from', filterFrom + 'T00:00:00');
    if (filterTo)   params.append('to',   filterTo   + 'T23:59:59');
    const qs = params.toString() ? `?${params}` : '';
    const { auth } = await import('../../stores/auth.js');
    let token; auth.subscribe(s => { token = s?.token; })();
    const res = await fetch(`${base}fuel/export${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { error = 'Error al exportar'; return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'combustibles.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────
  onMount(() => applyFilter());

  // ── funciones ─────────────────────────────────────────────────────────────────
  async function applyFilter() {
    error = '';
    rankingLoaded = false;
    statsLoaded   = false;
    const from = filterFrom || null;
    const to   = filterTo   || null;
    try {
      await Promise.all([
        dataStore.fetchFuelLogs(from, to),
        dataStore.fetchFuelDashboard(from, to),
      ]);
      // si el tab activo es ranking, recargarlo también
      if (activeTab === 'ranking') await loadRanking();
    } catch (err) {
      error = err.message;
    }
  }

  async function clearFilter() {
    filterFrom = '';
    filterTo = '';
    await applyFilter();
  }

  async function loadRanking() {
    if (rankingLoading) return;
    rankingLoading = true;
    try {
      rankingData = await dataStore.fetchFuelRanking(filterFrom || null, filterTo || null);
      rankingLoaded = true;
    } catch (e) {
      error = e.message;
    } finally {
      rankingLoading = false;
    }
  }

  async function loadAnomalies() {
    if (anomaliesLoading) return;
    anomaliesLoading = true;
    try {
      anomaliesData = await dataStore.fetchFuelAnomalies();
      anomaliesLoaded = true;
    } catch (e) {
      error = e.message;
    } finally {
      anomaliesLoading = false;
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'ranking'      && !rankingLoaded)   loadRanking();
    if (tab === 'anomalias'    && !anomaliesLoaded)  loadAnomalies();
    if (tab === 'estadisticas' && !statsLoaded)     loadStats();
    if (tab === 'estaciones'   && !stationsLoaded)  loadStations();
  }

  async function handleFuelCreated() {
    showCreateModal = false;
    await applyFilter();
    if (activeTab === 'ranking')      { rankingLoaded  = false; await loadRanking(); }
    if (activeTab === 'anomalias')    { anomaliesLoaded = false; await loadAnomalies(); }
    if (activeTab === 'estadisticas') { statsLoaded     = false; await loadStats(); }
  }

  async function openHistorial(row) {
    historialRow = row;
    historialLogs = [];
    historialLoading = true;
    try {
      historialLogs = await dataStore.fetchFuelHistoryByAsset(row.assetType, row.assetId);
    } catch (e) {
      error = e.message;
    } finally {
      historialLoading = false;
    }
  }

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === 'fuel_historial') openHistorial(row);
  }

  // ── helpers de formato ────────────────────────────────────────────────────────
  function fmtCurrency(v) {
    if (v == null) return '—';
    return `$${Number(v).toLocaleString('es-CO')}`;
  }
  function fmtNum(v, d = 2) {
    if (v == null) return '—';
    return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtDate(v) {
    if (!v) return '—';
    return new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
  function fmtEfficiency(r) {
    if (!r.efficiencyValue) return '—';
    const unit = r.efficiencyUnit === 'KM_PER_GALLON' ? 'km/Gal'
               : r.efficiencyUnit === 'GALLON_PER_HOUR' ? 'Gal/h'
               : r.efficiencyUnit === 'KM_PER_LITER' ? 'km/L' : 'L/h';
    return `${fmtNum(r.efficiencyValue, 2)} ${unit}`;
  }

  // ── columnas tabla registros ──────────────────────────────────────────────────
  const columns = [
    { header: 'Fecha', accessorFn: r => r.fuelDateTime ? new Date(r.fuelDateTime).toLocaleDateString('es-CO') : '—' },
    { header: 'Tipo Activo', accessorKey: 'assetType' },
    { header: 'Placa / Nombre', accessorKey: 'assetPlate' },
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
    { header: 'Llenado Completo', accessorFn: r => r.isFullTank ? 'Sí' : 'No' },
    { header: 'Estado Factura', accessorKey: 'invoiceStatus' },
    { header: 'Estación', accessorKey: 'serviceStation' },
    { header: 'Registrado por', accessorKey: 'registeredBy' },
    { header: 'Historial', id: 'fuel_historial', accessorFn: () => '', meta: { isFuelHistorial: true } },
  ];
</script>

<style>
  /* contenedor raíz — ocupa todo el espacio disponible */
  .fuel-module {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* toolbar */
  .toolbar { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 6px; flex-shrink: 0; }
  .filter-field { display: flex; flex-direction: column; font-size: 11px; }
  .filter-field label { margin-bottom: 2px; font-weight: bold; }
  .filter-field input { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; }
  .btn { padding: 4px 12px; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); border: 1px outset #c0c0c0; cursor: pointer; font-size: 11px; font-family: inherit; }
  .btn:hover { background: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%); }
  .btn:active { border-style: inset; }
  .btn-primary { font-weight: bold; }

  /* summary */
  .summary-bar { display: flex; gap: 24px; padding: 8px 12px; background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%); border: 1px inset #c0c0c0; margin-bottom: 6px; flex-wrap: wrap; flex-shrink: 0; }
  .summary-item { display: flex; flex-direction: column; font-size: 11px; }
  .summary-item span:first-child { font-weight: bold; color: #555; font-size: 10px; }
  .summary-item span:last-child { font-size: 13px; }

  /* tabs */
  .tab-bar { display: flex; gap: 0; margin-bottom: 0; border-bottom: 2px solid #808080; flex-shrink: 0; }
  .tab-btn {
    padding: 5px 16px; font-size: 11px; font-family: inherit; cursor: pointer;
    border: 1px outset #c0c0c0; border-bottom: none;
    background: linear-gradient(to bottom, #d8d8d8 0%, #c0c0c0 100%);
    color: #333; margin-right: 2px; position: relative; top: 2px;
  }
  .tab-btn.active {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e8e8e8 100%);
    font-weight: bold; color: #000; border-bottom: 2px solid #e8e8e8;
    z-index: 1;
  }
  .tab-btn:hover:not(.active) { background: linear-gradient(to bottom, #e4e4e4 0%, #cccccc 100%); }

  /* tab-content ocupa el resto de altura y hace scroll internamente */
  .tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    border: 1px inset #c0c0c0;
    border-top: none;
    padding: 10px;
    background: #f5f5f5;
  }

  /* misc */
  h3 { margin: 0 0 6px 0; font-size: 13px; flex-shrink: 0; }
  .error { color: red; font-weight: bold; margin-bottom: 8px; font-size: 11px; flex-shrink: 0; }
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }

  /* ranking table */
  .rank-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .rank-table th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 5px 10px; text-align: center; white-space: nowrap; }
  .rank-table td { border: 1px solid #c0c0c0; border-left: none; padding: 5px 10px; background: #fff; white-space: nowrap; }
  .rank-table tr:nth-child(even) td { background: #f4f4f4; }
  .rank-pos { font-weight: bold; text-align: center; font-size: 13px; }
  .rank-1 { color: #b8860b; }
  .rank-2 { color: #707070; }
  .rank-3 { color: #8b4513; }
  .bar-cell { min-width: 120px; }
  .bar-wrap { display: flex; align-items: center; gap: 6px; }
  .bar-bg { flex: 1; height: 10px; background: #ddd; border: 1px inset #bbb; }
  .bar-fill { height: 100%; background: linear-gradient(to right, #5a9fd4, #2a6fa8); }
  .bar-label { font-size: 10px; white-space: nowrap; }

  /* anomaly table */
  .ano-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .ano-table th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 5px 10px; text-align: center; white-space: nowrap; }
  .ano-table td { border: 1px solid #c0c0c0; border-left: none; padding: 5px 10px; background: #fff; white-space: nowrap; }
  .ano-table tr:nth-child(even) td { background: #fff6f0; }
  .ano-table tr td { background: #fff3e0; }
  .badge-warn { display: inline-block; padding: 1px 6px; background: #ffcc00; border: 1px solid #cc9900; font-weight: bold; font-size: 10px; color: #5c3d00; }
  .dismiss-btn { padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0,#d0d0d0); }
  .dismiss-btn:hover { background: linear-gradient(to bottom, #fff,#e0e0e0); }

  /* dismiss dialog */
  .dismiss-panel { background: #fff8e0; border: 1px solid #c8a800; padding: 10px; margin-bottom: 8px; font-size: 11px; }
  .dismiss-panel h4 { margin: 0 0 8px 0; font-size: 12px; }
  .dismiss-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
  .dismiss-field { display: flex; flex-direction: column; gap: 3px; }
  .dismiss-field label { font-weight: bold; font-size: 10px; }
  .dismiss-field input { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; }

  /* stations tab */
  .stations-header { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
  .stations-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .stations-table th { background: #c0c0c0; border: 1px outset #303030; padding: 5px 10px; text-align: left; }
  .stations-table td { border: 1px solid #c0c0c0; padding: 5px 10px; background: #fff; }
  .stations-table tr:nth-child(even) td { background: #f4f4f4; }
  .station-action-btn { padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0,#d0d0d0); }
  .station-del-btn { color: #8c1a1a; }
  .station-edit-input { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; width: 200px; }
  .btn-export { color: #1a5c1a; font-weight: bold; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
  .tab-section-title { font-size: 11px; font-weight: bold; color: #444; margin-bottom: 8px; }

  /* invoice tab */
  .inv-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 11px; }
  .inv-toolbar label { font-weight: bold; }
  .inv-toolbar select { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; }
  .inv-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .inv-table th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 5px 10px; text-align: center; white-space: nowrap; }
  .inv-table td { border: 1px solid #c0c0c0; border-left: none; padding: 5px 8px; background: #fff; white-space: nowrap; }
  .inv-table tr:nth-child(even) td { background: #f4f4f4; }
  .status-badge {
    display: inline-block; padding: 1px 7px; font-size: 10px; font-weight: bold; border: 1px solid;
  }
  .status-PENDING_REVIEW { background: #fff8d0; color: #7a5c00; border-color: #ccaa00; }
  .status-APPROVED       { background: #d6f5d6; color: #1a5c1a; border-color: #4a9c4a; }
  .status-REJECTED       { background: #fde8e8; color: #8c1a1a; border-color: #cc4444; }
  .inv-action-btn { padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); }
  .inv-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .inv-approve { color: #1a5c1a; }
  .inv-reject  { color: #8c1a1a; }
  .inv-upload-label { display: inline-block; padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); }
  .inv-upload-label:hover { background: linear-gradient(to bottom, #fff 0%, #e0e0e0 100%); }
  .inv-upload-label input[type="file"] { display: none; }
  .inv-photo-link { color: #0050a0; text-decoration: underline; font-size: 10px; cursor: pointer; }
  .mismatch-warn { color: #c05000; font-size: 10px; font-weight: bold; }

  /* paginación compartida (ranking, anomalías, facturas) */
  .tbl-footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 2px; border-top: 1px solid #c8c8c8; margin-top: 2px;
    flex-wrap: wrap; gap: 6px;
  }
  .record-count { font-size: 11px; color: #555; }
  .pagination-controls {
    display: flex; align-items: center; gap: 8px; font-size: 11px;
  }
  .pagination-controls button,
  .pagination-controls select {
    padding: 2px 8px; border: 1px outset #c0c0c0; cursor: pointer;
    font-size: 10px; background-color: #f0f0f0; font-family: inherit;
  }
  .pagination-controls button:disabled { cursor: not-allowed; color: #808080; }

  /* estadísticas */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
  .kpi-card { background: linear-gradient(160deg, #efefef 0%, #d6d6d6 100%); border: 1px inset #b0b0b0; padding: 10px 14px; border-left: 3px solid #4a7fc4; }
  .kpi-label { font-size: 10px; color: #555; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-value { font-size: 17px; font-weight: bold; color: #1a1a1a; margin-top: 3px; }
  .kpi-sub   { font-size: 10px; color: #666; margin-top: 2px; }
  .chart-section { margin-bottom: 18px; }
  .chart-title { font-size: 11px; font-weight: bold; color: #333; margin-bottom: 6px; border-bottom: 1px solid #c0c0c0; padding-bottom: 3px; }
  .charts-row  { margin-bottom: 12px; }
  .charts-row-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 18px; }
  .chart-box { background: #fff; border: 1px inset #c0c0c0; padding: 12px; }
  svg.chart { width: 100%; overflow: visible; }
  .axis-label { font-size: 9px; fill: #666; }
  .bar-total-label { font-size: 8px; fill: #333; font-weight: bold; }
  .grid-line  { stroke: #e8e8e8; stroke-width: 1; stroke-dasharray: 3,3; }
  .bar-machine { fill: #4a7fc4; }
  .bar-vehicle { fill: #4aaa6a; }
  .bar-moto    { fill: #e08030; }
  .line-total  { fill: none; stroke: #5a4fa0; stroke-width: 2.5; }
  .dot-total   { fill: #5a4fa0; stroke: #fff; stroke-width: 1.5; }
  .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10px; margin-top: 8px; }
  .legend-item { display: flex; align-items: center; gap: 4px; }
  .legend-dot  { width: 10px; height: 10px; display: inline-block; border-radius: 2px; border: 1px solid #0004; }
  .donut-wrap  { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .donut-legend { font-size: 10px; width: 100%; }
  .donut-row   { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
  .donut-amount { font-size: 9px; color: #666; margin-left: 6px; }

  /* ── Estadísticas rediseñadas ──────────────────────────────────────────── */
  .stats-section-header {
    display: flex; align-items: flex-start; gap: 10px;
    margin: 18px 0 10px 0; padding-bottom: 8px;
    border-bottom: 2px solid #c0c0c0;
  }
  .stats-section-icon { font-size: 20px; line-height: 1; }
  .stats-section-title { font-size: 13px; font-weight: bold; color: #222; }
  .stats-section-sub   { font-size: 10px; color: #666; margin-top: 2px; }

  /* KPI row con icono */
  .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px; }
  .kpi-card { display: flex; align-items: flex-start; gap: 10px; background: linear-gradient(160deg,#f0f0f0,#dcdcdc); border: 1px inset #b0b0b0; padding: 10px 12px; }
  .kpi-accent-blue   { border-left: 3px solid #4a7fc4; }
  .kpi-accent-green  { border-left: 3px solid #4aaa6a; }
  .kpi-accent-orange { border-left: 3px solid #e08030; }
  .kpi-accent-red    { border-left: 3px solid #c0392b; }
  .kpi-accent-gray   { border-left: 3px solid #999; }
  .kpi-icon-badge {
    flex-shrink: 0; width: 30px; height: 30px; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: bold;
  }
  .kpi-body { flex: 1; min-width: 0; }
  .kpi-label { font-size: 10px; color: #555; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-value { font-size: 17px; font-weight: bold; color: #1a1a1a; margin-top: 3px; }
  .kpi-sub   { font-size: 10px; color: #666; margin-top: 2px; }

  /* Fleet breakdown cards */
  .fleet-breakdown { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 6px; }
  .fleet-card { background: #fff; border: 1px inset #c0c0c0; padding: 10px 12px; }
  .fleet-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .fleet-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .fleet-name { flex: 1; font-size: 11px; font-weight: bold; color: #333; }
  .fleet-pct { font-size: 13px; font-weight: bold; color: #444; }
  .fleet-value { font-size: 15px; font-weight: bold; color: #111; margin-bottom: 6px; }
  .fleet-bar-track { height: 8px; background: #e0e0e0; border-radius: 4px; margin-bottom: 5px; border: 1px inset #ccc; }
  .fleet-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .fleet-sub { font-size: 10px; color: #666; }

  /* Tabla de estadísticas mensuales */
  .stats-table-wrap { overflow-x: auto; margin-bottom: 10px; }
  .stats-table { width: 100%; border-collapse: collapse; font-size: 11px; white-space: nowrap; }
  .stats-table th { background: #b8b8b8; padding: 5px 8px; border: 1px solid #909090; font-weight: bold; }
  .stats-table td { padding: 5px 8px; border: 1px solid #d0d0d0; background: #fff; }
  .stats-table tbody tr:nth-child(even) td { background: #f6f6f6; }
  .stats-table tbody tr:hover td { background: #eef4ff; }
  .st-group   { text-align: center; }
  .st-machine { background: #dbeafe !important; color: #1d4ed8; }
  .st-vehicle { background: #dcfce7 !important; color: #15803d; }
  .st-moto    { background: #ffedd5 !important; color: #c2410c; }
  .st-month   { text-align: left; min-width: 90px; }
  .st-center  { text-align: center; }
  .st-right   { text-align: right; }
  .st-bold    { font-weight: bold; }
  .st-month-cell { font-weight: bold; white-space: nowrap; }
  .st-peak-row td { background: #fef9c3 !important; }
  .st-peak-badge {
    display: inline-block; margin-left: 5px; padding: 0px 5px;
    background: #ca8a04; color: #fff; font-size: 9px; font-weight: bold; border-radius: 3px;
    vertical-align: middle; text-transform: uppercase;
  }
  .st-anomaly-badge {
    display: inline-block; padding: 1px 5px;
    background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;
    font-size: 10px; font-weight: bold;
  }
  .st-ok { color: #15803d; font-size: 11px; }
  .st-total-row td { background: #dcdcdc !important; font-weight: bold; border-top: 2px solid #888; }
</style>

<div class="fuel-module">

<h3>Módulo de Combustibles</h3>

<!-- Toolbar -->
<div class="toolbar">
  <div class="filter-field">
    <label for="fuel-from">Desde:</label>
    <input id="fuel-from" type="date" bind:value={filterFrom} />
  </div>
  <div class="filter-field">
    <label for="fuel-to">Hasta:</label>
    <input id="fuel-to" type="date" bind:value={filterTo} />
  </div>
  <button class="btn" on:click={applyFilter}>Filtrar</button>
  <button class="btn" on:click={clearFilter}>Limpiar</button>
  <button class="btn btn-primary" on:click={() => showCreateModal = true}>+ Registrar Carga</button>
  {#if isAdmin}
    <button class="btn btn-export" on:click={handleExportExcel}>↓ Exportar Excel</button>
  {/if}
</div>

{#if error}
  <div class="error">{error}</div>
{/if}

<!-- Summary bar (siempre visible) -->
{#if dashboard}
  <div class="summary-bar">
    <div class="summary-item">
      <span>Registros</span>
      <span>{dashboard.totalRecords ?? fuelLogs.length}</span>
    </div>
    <div class="summary-item">
      <span>Total galones</span>
      <span>{dashboard.totalQuantityGallons?.toFixed(2) ?? '—'} Gal</span>
    </div>
    <div class="summary-item">
      <span>Total costo</span>
      <span>$ {dashboard.totalCost?.toLocaleString('es-CO') ?? '—'}</span>
    </div>
    <div class="summary-item">
      <span>Maquinaria</span>
      <span>{dashboard.machineCount ?? '—'} cargas</span>
    </div>
    <div class="summary-item">
      <span>Vehículos</span>
      <span>{dashboard.vehicleCount ?? '—'} cargas</span>
    </div>
    <div class="summary-item">
      <span>Motos</span>
      <span>{dashboard.motoCount ?? '—'} cargas</span>
    </div>
    {#if (dashboard.anomalyCount ?? 0) > 0}
      <div class="summary-item">
        <span>Anomalías</span>
        <span style="color:#c00; font-weight:bold;">⚠ {dashboard.anomalyCount}</span>
      </div>
    {/if}
  </div>
{/if}

<!-- Tabs -->
<div class="tab-bar">
  <button class="tab-btn" class:active={activeTab === 'registros'} on:click={() => switchTab('registros')}>
    Registros ({latestFuelLogs.length} activos)
  </button>
  <button class="tab-btn" class:active={activeTab === 'ranking'} on:click={() => switchTab('ranking')}>
    Ranking
  </button>
  <button class="tab-btn" class:active={activeTab === 'anomalias'} on:click={() => switchTab('anomalias')}>
    Anomalías {#if (dashboard?.anomalyCount ?? 0) > 0}({dashboard.anomalyCount}){/if}
  </button>
  <button class="tab-btn" class:active={activeTab === 'estadisticas'} on:click={() => switchTab('estadisticas')}>
    Estadísticas
  </button>
  <button class="tab-btn" class:active={activeTab === 'facturas'} on:click={() => switchTab('facturas')}>
    Facturas {#if fuelLogs.filter(r => r.invoiceStatus === 'PENDING_REVIEW').length > 0}
      ({fuelLogs.filter(r => r.invoiceStatus === 'PENDING_REVIEW').length} pendientes)
    {/if}
  </button>
  {#if isAdmin}
    <button class="tab-btn" class:active={activeTab === 'estaciones'} on:click={() => switchTab('estaciones')}>
      Estaciones
    </button>
  {/if}
</div>

<div class="tab-content">

  <!-- ── TAB: REGISTROS ─────────────────────────────────────────────────────── -->
  {#if activeTab === 'registros'}
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
        totalElements={latestFuelLogs.length}
        on:action={handleGridAction}
        on:pageChange={e => { regPage = e.detail; }}
        on:sizeChange={e => { regPageSize = e.detail; regPage = 0; }}
      />
    {/if}

  <!-- ── TAB: RANKING ───────────────────────────────────────────────────────── -->
  {:else if activeTab === 'ranking'}
    {#if rankingLoading}
      <div class="loader-container"><Loader /><p>Cargando ranking...</p></div>
    {:else if rankingData.length === 0}
      <div class="empty-msg">Sin datos de ranking para el período seleccionado.</div>
    {:else}
      {@const maxGallons = Math.max(...rankingData.map(r => r.quantityGallons ?? 0))}
      <p class="tab-section-title">
        Ranking de eficiencia — del menos eficiente al más eficiente ({rankingData.length} activos)
        {#if filterFrom || filterTo} · {filterFrom || '…'} → {filterTo || '…'}{/if}
      </p>
      <table class="rank-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tipo</th>
            <th>Placa / Nombre</th>
            <th>Galones totales</th>
            <th>Consumo relativo</th>
            <th>Costo total</th>
            <th title="Eficiencia según el fabricante">Efic. Fábrica</th>
            <th title="Eficiencia calculada en base a los registros de combustible">Efic. Estimada</th>
            <th>Últ. carga</th>
          </tr>
        </thead>
        <tbody>
          {#each rankPagedData as row, i}
            {@const globalIndex = rankPage * rankPageSize + i}
            {@const pct = maxGallons > 0 ? ((row.quantityGallons ?? 0) / maxGallons) * 100 : 0}
            {@const factoryUnit = row.factoryEfficiencyUnit === 'KM_PER_GALLON' ? 'km/Gal'
              : row.factoryEfficiencyUnit === 'KM_PER_CUBIC_METER' ? 'km/m³'
              : row.factoryEfficiencyUnit === 'GAL_PER_HOUR' ? 'Gal/h'
              : row.factoryEfficiencyUnit === 'M3_PER_HOUR' ? 'm³/h'
              : ''}
            {@const factoryLabel = row.factoryEfficiency != null ? `${fmtNum(row.factoryEfficiency, 2)} ${factoryUnit}` : '—'}
            {@const estimatedLabel = fmtEfficiency(row)}
            {@const belowFactory = row.factoryEfficiency != null && row.efficiencyValue != null
              && row.factoryEfficiencyUnit === 'KM_PER_GALLON'
              && Number(row.efficiencyValue) < Number(row.factoryEfficiency)}
            <tr>
              <td class="rank-pos {globalIndex === 0 ? 'rank-1' : globalIndex === 1 ? 'rank-2' : globalIndex === 2 ? 'rank-3' : ''}">
                {globalIndex + 1}
              </td>
              <td>{row.assetType ?? '—'}</td>
              <td>{row.assetPlate ?? `ID ${row.assetId}`}</td>
              <td style="text-align:right">{fmtNum(row.quantityGallons, 3)} Gal</td>
              <td class="bar-cell">
                <div class="bar-wrap">
                  <div class="bar-bg">
                    <div class="bar-fill" style="width:{pct.toFixed(1)}%"></div>
                  </div>
                  <span class="bar-label">{pct.toFixed(0)}%</span>
                </div>
              </td>
              <td style="text-align:right">{fmtCurrency(row.totalCostCalculated)}</td>
              <td style="text-align:right; color:#555">{factoryLabel}</td>
              <td style="text-align:right; font-weight:bold; color:{belowFactory ? '#c00' : estimatedLabel === '—' ? '#999' : '#1a5c1a'}">
                {estimatedLabel}{#if belowFactory} ↓{/if}
              </td>
              <td>{fmtDate(row.fuelDateTime)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="tbl-footer">
        <span class="record-count">
          Mostrando {rankPagedData.length} de {rankingData.length} registros
        </span>
        <div class="pagination-controls">
          <select value={rankPageSize} on:change={e => { rankPageSize = +e.target.value; rankPage = 0; }}>
            {#each [10, 20, 50] as s}<option value={s}>Mostrar {s}</option>{/each}
          </select>
          <button on:click={() => rankPage = 0}               disabled={rankPage === 0}>« Primero</button>
          <button on:click={() => rankPage -= 1}              disabled={rankPage === 0}>‹ Anterior</button>
          <span>Página <strong>{rankPage + 1} de {rankTotalPages}</strong></span>
          <button on:click={() => rankPage += 1}              disabled={rankPage >= rankTotalPages - 1}>Siguiente ›</button>
          <button on:click={() => rankPage = rankTotalPages - 1} disabled={rankPage >= rankTotalPages - 1}>Último »</button>
        </div>
      </div>
    {/if}

  <!-- ── TAB: ANOMALÍAS ─────────────────────────────────────────────────────── -->
  {:else if activeTab === 'anomalias'}
    {#if anomaliesLoading}
      <div class="loader-container"><Loader /><p>Cargando anomalías...</p></div>
    {:else if anomaliesData.length === 0}
      <div class="empty-msg">✓ No hay registros marcados como anómalos.</div>
    {:else}
      <p class="tab-section-title">
        {anomaliesData.length} registro{anomaliesData.length !== 1 ? 's' : ''} con consumo anómalo detectados
      </p>
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

      <table class="ano-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Placa / Nombre</th>
            <th>Combustible</th>
            <th>Galones</th>
            <th>Total</th>
            <th>Eficiencia</th>
            <th>Odómetro km</th>
            <th>Horómetro h</th>
            <th>Estación</th>
            <th>Registrado por</th>
            <th>Recibo</th>
            {#if isAdmin}<th>Acciones</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each anomPagedData as row}
            <tr>
              <td>{fmtDate(row.fuelDateTime)}</td>
              <td>{row.assetType ?? '—'}</td>
              <td>{row.assetPlate ?? `ID ${row.assetId}`}</td>
              <td>{row.fuelType ?? '—'}</td>
              <td style="text-align:right">{fmtNum(row.quantityGallons, 3)} Gal</td>
              <td style="text-align:right">
                {fmtCurrency(row.totalCostCalculated)}
                {#if row.totalCostMismatch}
                  <span style="color:#c00;font-size:10px"> ⚠ declarado: {fmtCurrency(row.totalCostActual)}</span>
                {/if}
              </td>
              <td><span class="badge-warn">⚠ {fmtEfficiency(row)}</span></td>
              <td>{row.odometerKm ?? '—'}</td>
              <td>{row.hourMeter ?? '—'}</td>
              <td>{row.serviceStation ?? '—'}</td>
              <td>{row.registeredBy ?? '—'}</td>
              <td>
                {#if row.invoicePhotoUrl}
                  <a href={row.invoicePhotoUrl.startsWith('http') ? row.invoicePhotoUrl : `${window.location.origin}/${row.invoicePhotoUrl}`}
                     target="_blank" rel="noopener noreferrer"
                     class="inv-photo-link">Ver recibo</a>
                {:else}
                  <span style="color:#999;font-size:10px">Sin recibo</span>
                {/if}
              </td>
              {#if isAdmin}
                <td>
                  <button class="dismiss-btn"
                    on:click={() => { dismissRow = row; dismissReason = ''; dismissCost = ''; }}>
                    Quitar anomalía
                  </button>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="tbl-footer">
        <span class="record-count">
          Mostrando {anomPagedData.length} de {anomaliesData.length} registros
        </span>
        <div class="pagination-controls">
          <select value={anomPageSize} on:change={e => { anomPageSize = +e.target.value; anomPage = 0; }}>
            {#each [10, 20, 50] as s}<option value={s}>Mostrar {s}</option>{/each}
          </select>
          <button on:click={() => anomPage = 0}               disabled={anomPage === 0}>« Primero</button>
          <button on:click={() => anomPage -= 1}              disabled={anomPage === 0}>‹ Anterior</button>
          <span>Página <strong>{anomPage + 1} de {anomTotalPages}</strong></span>
          <button on:click={() => anomPage += 1}              disabled={anomPage >= anomTotalPages - 1}>Siguiente ›</button>
          <button on:click={() => anomPage = anomTotalPages - 1} disabled={anomPage >= anomTotalPages - 1}>Último »</button>
        </div>
      </div>
    {/if}

  <!-- ── TAB: ESTADÍSTICAS ─────────────────────────────────────────────────── -->
  {:else if activeTab === 'estadisticas'}
    {#if statsLoading}
      <div class="loader-container"><Loader /><p>Calculando estadísticas...</p></div>
    {:else if statsData.length === 0}
      <div class="empty-msg">
        Sin datos para el período seleccionado.<br>
        <small>Registra cargas de combustible para ver estadísticas.</small>
      </div>
    {:else}

      <!-- ── Sección 1: Resumen general ──────────────────────────────────── -->
      <div class="stats-section-header">
        <span class="stats-section-icon">📊</span>
        <div>
          <div class="stats-section-title">Resumen del período</div>
          <div class="stats-section-sub">
            {statsData.length} mes{statsData.length !== 1 ? 'es' : ''} analizados
            {#if filterFrom || filterTo}· {filterFrom || '…'} → {filterTo || '…'}{/if}
          </div>
        </div>
      </div>

      <!-- Fila 1: totales generales -->
      <div class="kpi-row">
        <div class="kpi-card kpi-accent-blue">
          <div class="kpi-icon-badge" style="background:#dbeafe;color:#1d4ed8">$</div>
          <div class="kpi-body">
            <div class="kpi-label">Gasto total del período</div>
            <div class="kpi-value">{fmtCurrency(grandTotalCost)}</div>
            <div class="kpi-sub">{fmtNum(grandTotalGallons, 1)} galones consumidos</div>
          </div>
        </div>
        <div class="kpi-card kpi-accent-green">
          <div class="kpi-icon-badge" style="background:#dcfce7;color:#15803d">≈</div>
          <div class="kpi-body">
            <div class="kpi-label">Promedio mensual</div>
            <div class="kpi-value">{fmtCurrency(avgMonthlyCost)}</div>
            <div class="kpi-sub">{fmtNum(grandTotalGallons / (statsData.length || 1), 1)} Gal / mes</div>
          </div>
        </div>
        <div class="kpi-card kpi-accent-orange">
          <div class="kpi-icon-badge" style="background:#ffedd5;color:#c2410c">▲</div>
          <div class="kpi-body">
            <div class="kpi-label">Mes de mayor gasto</div>
            <div class="kpi-value" style="font-size:15px">{peakMonth?.monthLabel ?? '—'}</div>
            <div class="kpi-sub">{fmtCurrency(peakMonth?.totalCost)} · {peakMonth?.totalLoads ?? 0} cargas</div>
          </div>
        </div>
        <div class="kpi-card {totalAnomalies > 0 ? 'kpi-accent-red' : 'kpi-accent-gray'}">
          <div class="kpi-icon-badge" style="background:{totalAnomalies > 0 ? '#fee2e2' : '#f3f4f6'};color:{totalAnomalies > 0 ? '#b91c1c' : '#6b7280'}">⚠</div>
          <div class="kpi-body">
            <div class="kpi-label">Anomalías detectadas</div>
            <div class="kpi-value" style="color:{totalAnomalies > 0 ? '#b91c1c' : '#374151'}">{totalAnomalies}</div>
            <div class="kpi-sub">{totalAnomalies > 0 ? 'Requieren revisión' : 'Sin irregularidades'}</div>
          </div>
        </div>
      </div>

      <!-- Fila 2: desglose por flota -->
      <div class="fleet-breakdown">
        <div class="fleet-card">
          <div class="fleet-header">
            <span class="fleet-dot" style="background:#4a7fc4"></span>
            <span class="fleet-name">Maquinaria pesada</span>
            <span class="fleet-pct">{grandTotalCost > 0 ? ((totalMachineCost/grandTotalCost)*100).toFixed(1) : 0}%</span>
          </div>
          <div class="fleet-value">{fmtCurrency(totalMachineCost)}</div>
          <div class="fleet-bar-track">
            <div class="fleet-bar-fill" style="width:{grandTotalCost > 0 ? ((totalMachineCost/grandTotalCost)*100).toFixed(1) : 0}%;background:#4a7fc4"></div>
          </div>
          <div class="fleet-sub">{fmtNum(statsData.reduce((a,m)=>a+(m.machineGallons??0),0),1)} Gal · {statsData.reduce((a,m)=>a+m.machineLoads,0)} cargas</div>
        </div>
        <div class="fleet-card">
          <div class="fleet-header">
            <span class="fleet-dot" style="background:#4aaa6a"></span>
            <span class="fleet-name">Vehículos</span>
            <span class="fleet-pct">{grandTotalCost > 0 ? ((totalVehicleCost/grandTotalCost)*100).toFixed(1) : 0}%</span>
          </div>
          <div class="fleet-value">{fmtCurrency(totalVehicleCost)}</div>
          <div class="fleet-bar-track">
            <div class="fleet-bar-fill" style="width:{grandTotalCost > 0 ? ((totalVehicleCost/grandTotalCost)*100).toFixed(1) : 0}%;background:#4aaa6a"></div>
          </div>
          <div class="fleet-sub">{fmtNum(statsData.reduce((a,m)=>a+(m.vehicleGallons??0),0),1)} Gal · {statsData.reduce((a,m)=>a+m.vehicleLoads,0)} cargas</div>
        </div>
        <div class="fleet-card">
          <div class="fleet-header">
            <span class="fleet-dot" style="background:#e08030"></span>
            <span class="fleet-name">Motocicletas</span>
            <span class="fleet-pct">{grandTotalCost > 0 ? ((totalMotoCost/grandTotalCost)*100).toFixed(1) : 0}%</span>
          </div>
          <div class="fleet-value">{fmtCurrency(totalMotoCost)}</div>
          <div class="fleet-bar-track">
            <div class="fleet-bar-fill" style="width:{grandTotalCost > 0 ? ((totalMotoCost/grandTotalCost)*100).toFixed(1) : 0}%;background:#e08030"></div>
          </div>
          <div class="fleet-sub">{fmtNum(statsData.reduce((a,m)=>a+(m.motoGallons??0),0),1)} Gal · {statsData.reduce((a,m)=>a+m.motoLoads,0)} cargas</div>
        </div>
      </div>

      <!-- ── Sección 2: Gráfico de barras ────────────────────────────────── -->
      <div class="stats-section-header">
        <span class="stats-section-icon">📅</span>
        <div>
          <div class="stats-section-title">Gasto mensual por tipo de flota</div>
          <div class="stats-section-sub">Cada barra muestra cuánto gastó cada tipo de activo en el mes</div>
        </div>
      </div>
      <div class="chart-box" style="margin-bottom:14px">
        <svg class="chart" viewBox="0 0 {BAR_TOTAL_W} {CHART_H + BAR_PAD.top + BAR_PAD.bottom}">
          {#each [0.25, 0.5, 0.75, 1] as pct}
            {@const y = BAR_PAD.top + CHART_H * (1 - pct)}
            <line class="grid-line" x1={BAR_PAD.left} x2={BAR_TOTAL_W - BAR_PAD.right} y1={y} y2={y} />
            <text class="axis-label" x={BAR_PAD.left - 4} y={y + 3} text-anchor="end">
              {fmtCurrency(maxMonthCost * pct)}
            </text>
          {/each}
          {#each statsData as month, i}
            {@const x        = BAR_PAD.left + i * (BAR_W + BAR_GAP)}
            {@const hMachine = ((month.machineCost ?? 0) / maxMonthCost) * CHART_H}
            {@const hVehicle = ((month.vehicleCost ?? 0) / maxMonthCost) * CHART_H}
            {@const hMoto    = ((month.motoCost    ?? 0) / maxMonthCost) * CHART_H}
            {@const totalH   = hMachine + hVehicle + hMoto}
            {@const isPeak   = month.monthLabel === peakMonth?.monthLabel && month.year === peakMonth?.year}
            {#if isPeak}
              <rect x={x - 2} y={BAR_PAD.top} width={BAR_W + 4} height={CHART_H}
                fill="#fef9c3" rx="2" opacity="0.6"/>
            {/if}
            <rect class="bar-moto"    x={x} y={BAR_PAD.top + CHART_H - hMoto}              width={BAR_W} height={hMoto}    rx="0" />
            <rect class="bar-vehicle" x={x} y={BAR_PAD.top + CHART_H - hMoto - hVehicle}    width={BAR_W} height={hVehicle} rx="0" />
            <rect class="bar-machine" x={x} y={BAR_PAD.top + CHART_H - totalH}              width={BAR_W} height={hMachine} rx="3" ry="3" />
            {#if totalH > 8}
              <text class="bar-total-label" x={x + BAR_W / 2} y={BAR_PAD.top + CHART_H - totalH - 4} text-anchor="middle">
                {fmtCurrency(month.totalCost)}
              </text>
            {/if}
            <text class="axis-label" x={x + BAR_W / 2} y={BAR_PAD.top + CHART_H + 14} text-anchor="middle">{month.monthLabel.slice(0, 3)}</text>
            <text class="axis-label" x={x + BAR_W / 2} y={BAR_PAD.top + CHART_H + 25} text-anchor="middle">{month.year}</text>
          {/each}
        </svg>
        <div class="legend">
          <div class="legend-item"><span class="legend-dot" style="background:#4a7fc4"></span>Maquinaria</div>
          <div class="legend-item"><span class="legend-dot" style="background:#4aaa6a"></span>Vehículos</div>
          <div class="legend-item"><span class="legend-dot" style="background:#e08030"></span>Motos</div>
          <div class="legend-item"><span style="display:inline-block;width:10px;height:10px;background:#fef9c3;border:1px solid #ca8a04"></span>Mes pico</div>
        </div>
      </div>

      <!-- ── Sección 3: Tendencia + Distribución ─────────────────────────── -->
      <div class="stats-section-header">
        <span class="stats-section-icon">📈</span>
        <div>
          <div class="stats-section-title">Tendencia de consumo y distribución</div>
          <div class="stats-section-sub">Evolución de galones mes a mes y proporción del gasto por flota</div>
        </div>
      </div>
      <div class="charts-row-2" style="margin-bottom:14px">
        <div class="chart-box">
          <div class="chart-title">Galones consumidos por mes</div>
          <svg class="chart" viewBox="0 0 {LINE_W} {LINE_H + LINE_P.top + LINE_P.bottom}">
            {#each [0.25, 0.5, 0.75, 1] as pct}
              {@const y = LINE_P.top + LINE_H * (1 - pct)}
              <line class="grid-line" x1={LINE_P.left} x2={LINE_W - LINE_P.right} y1={y} y2={y} />
              <text class="axis-label" x={LINE_P.left - 4} y={y + 3} text-anchor="end">
                {fmtNum(maxMonthGallons * pct, 0)} Gal
              </text>
            {/each}
            {#if statsData.length > 1}
              {@const step  = (LINE_W - LINE_P.left - LINE_P.right) / (statsData.length - 1)}
              {@const pts   = statsData.map((m, i) => `${LINE_P.left + i * step},${LINE_P.top + LINE_H * (1 - (m.totalGallons ?? 0) / maxMonthGallons)}`).join(' ')}
              {@const baseY = LINE_P.top + LINE_H}
              <polygon points="{LINE_P.left},{baseY} {pts} {LINE_P.left + (statsData.length - 1) * step},{baseY}"
                fill="#5a4fa0" opacity="0.12" />
              <polyline class="line-total" points={pts} />
              {#each statsData as month, i}
                {@const x = LINE_P.left + i * step}
                {@const y = LINE_P.top + LINE_H * (1 - (month.totalGallons ?? 0) / maxMonthGallons)}
                <circle class="dot-total" cx={x} cy={y} r="4" />
                <text class="axis-label" x={x} y={LINE_P.top + LINE_H + 14} text-anchor="middle">{month.monthLabel.slice(0,3)}</text>
                <text class="axis-label" x={x} y={LINE_P.top + LINE_H + 25} text-anchor="middle">{month.year}</text>
              {/each}
            {:else}
              {@const m = statsData[0]}
              <circle class="dot-total" cx={LINE_W / 2} cy={LINE_P.top + LINE_H * 0.4} r="5" />
              <text class="axis-label" x={LINE_W / 2} y={LINE_P.top + LINE_H + 14} text-anchor="middle">{m.monthLabel}</text>
            {/if}
          </svg>
        </div>
        <div class="chart-box">
          <div class="chart-title">¿Dónde va el presupuesto de combustible?</div>
          <div class="donut-wrap">
            {#if grandTotalCost > 0}
              {@const R = 78}
              {@const CX = 110} {@const CY = 100}
              {@const CIRC = 2 * Math.PI * R}
              {@const pMachine = totalMachineCost / grandTotalCost}
              {@const pVehicle = totalVehicleCost / grandTotalCost}
              {@const pMoto    = totalMotoCost    / grandTotalCost}
              {@const dMachine = pMachine * CIRC}
              {@const dVehicle = pVehicle * CIRC}
              {@const dMoto    = pMoto    * CIRC}
              <svg viewBox="0 0 220 200" style="width:100%;max-width:220px">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4a7fc4" stroke-width="32"
                  stroke-dasharray="{dMachine} {CIRC}" stroke-dashoffset={0}
                  transform="rotate(-90 {CX} {CY})" />
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4aaa6a" stroke-width="32"
                  stroke-dasharray="{dVehicle} {CIRC}" stroke-dashoffset={-(dMachine)}
                  transform="rotate(-90 {CX} {CY})" />
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e08030" stroke-width="32"
                  stroke-dasharray="{dMoto} {CIRC}" stroke-dashoffset={-(dMachine + dVehicle)}
                  transform="rotate(-90 {CX} {CY})" />
                <circle cx={CX} cy={CY} r={R - 16} fill="#f5f5f5" />
                <text x={CX} y={CY - 8}  text-anchor="middle" font-size="10" fill="#666">Total</text>
                <text x={CX} y={CY + 8}  text-anchor="middle" font-size="9"  fill="#222" font-weight="bold">{fmtCurrency(grandTotalCost)}</text>
              </svg>
            {/if}
            <div class="donut-legend">
              {#each [['#4a7fc4','Maquinaria',totalMachineCost],['#4aaa6a','Vehículos',totalVehicleCost],['#e08030','Motos',totalMotoCost]] as [color, label, cost]}
                <div class="donut-row">
                  <span>
                    <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:{color};margin-right:4px;vertical-align:middle"></span>
                    {label}
                  </span>
                  <span>
                    <b>{grandTotalCost > 0 ? ((cost/grandTotalCost)*100).toFixed(1) : 0}%</b>
                    <span class="donut-amount">{fmtCurrency(cost)}</span>
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sección 4: Tabla detallada ──────────────────────────────────── -->
      <div class="stats-section-header">
        <span class="stats-section-icon">📋</span>
        <div>
          <div class="stats-section-title">Detalle mensual</div>
          <div class="stats-section-sub">Galones y costos desglosados por tipo de activo — el mes resaltado es el de mayor gasto</div>
        </div>
      </div>
      <div class="stats-table-wrap">
        <table class="stats-table">
          <thead>
            <tr>
              <th rowspan="2" class="st-month">Mes</th>
              <th rowspan="2" class="st-center">Cargas</th>
              <th rowspan="2" class="st-right">Galones</th>
              <th rowspan="2" class="st-right">Costo total</th>
              <th colspan="2" class="st-group st-machine">Maquinaria</th>
              <th colspan="2" class="st-group st-vehicle">Vehículos</th>
              <th colspan="2" class="st-group st-moto">Motos</th>
              <th rowspan="2" class="st-center">Anomalías</th>
            </tr>
            <tr>
              <th class="st-right st-machine">Gal</th><th class="st-right st-machine">Costo</th>
              <th class="st-right st-vehicle">Gal</th><th class="st-right st-vehicle">Costo</th>
              <th class="st-right st-moto">Gal</th><th class="st-right st-moto">Costo</th>
            </tr>
          </thead>
          <tbody>
            {#each statsData as m}
              {@const isPeak = m.monthLabel === peakMonth?.monthLabel && m.year === peakMonth?.year}
              <tr class:st-peak-row={isPeak}>
                <td class="st-month-cell">
                  {m.monthLabel}
                  {#if isPeak}<span class="st-peak-badge">pico</span>{/if}
                </td>
                <td class="st-center">{m.totalLoads}</td>
                <td class="st-right">{fmtNum(m.totalGallons, 2)}</td>
                <td class="st-right st-bold">{fmtCurrency(m.totalCost)}</td>
                <td class="st-right">{fmtNum(m.machineGallons, 2)}</td>
                <td class="st-right">{fmtCurrency(m.machineCost)}</td>
                <td class="st-right">{fmtNum(m.vehicleGallons, 2)}</td>
                <td class="st-right">{fmtCurrency(m.vehicleCost)}</td>
                <td class="st-right">{fmtNum(m.motoGallons, 2)}</td>
                <td class="st-right">{fmtCurrency(m.motoCost)}</td>
                <td class="st-center">
                  {#if m.anomalyCount > 0}
                    <span class="st-anomaly-badge">⚠ {m.anomalyCount}</span>
                  {:else}
                    <span class="st-ok">✓</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="st-total-row">
              <td class="st-bold">TOTAL</td>
              <td class="st-center st-bold">{statsData.reduce((a,m)=>a+m.totalLoads,0)}</td>
              <td class="st-right st-bold">{fmtNum(grandTotalGallons, 2)}</td>
              <td class="st-right st-bold">{fmtCurrency(grandTotalCost)}</td>
              <td class="st-right">{fmtNum(statsData.reduce((a,m)=>a+(m.machineGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalMachineCost)}</td>
              <td class="st-right">{fmtNum(statsData.reduce((a,m)=>a+(m.vehicleGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalVehicleCost)}</td>
              <td class="st-right">{fmtNum(statsData.reduce((a,m)=>a+(m.motoGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalMotoCost)}</td>
              <td class="st-center st-bold">{statsData.reduce((a,m)=>a+m.anomalyCount,0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    {/if}

  <!-- ── TAB: FACTURAS ─────────────────────────────────────────────────────── -->
  {:else if activeTab === 'facturas'}
    <div class="inv-toolbar">
      <label for="inv-filter">Filtrar por estado:</label>
      <select id="inv-filter" bind:value={invoiceFilter}>
        <option value="ALL">Todos ({fuelLogs.length})</option>
        <option value="PENDING_REVIEW">Pendiente revisión ({fuelLogs.filter(r => r.invoiceStatus === 'PENDING_REVIEW').length})</option>
        <option value="APPROVED">Aprobadas ({fuelLogs.filter(r => r.invoiceStatus === 'APPROVED').length})</option>
        <option value="REJECTED">Rechazadas ({fuelLogs.filter(r => r.invoiceStatus === 'REJECTED').length})</option>
      </select>
      <span style="color:#666; font-size:10px; margin-left:8px;">
        {invoiceRows.length} registro{invoiceRows.length !== 1 ? 's' : ''}
      </span>
    </div>

    {#if invoiceRows.length === 0}
      <div class="empty-msg">No hay registros para el filtro seleccionado.</div>
    {:else}
      <table class="inv-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Placa / Nombre</th>
            <th>Galones</th>
            <th>Total calculado</th>
            <th>Discrepancia</th>
            <th>Voucher</th>
            <th>Estado factura</th>
            <th>Factura (foto)</th>
            {#if isAdmin}<th>Acciones</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each invPagedData as row}
            <tr style={row.totalCostMismatch ? 'background:#fff8e0;' : ''}>
              <td>{fmtDate(row.fuelDateTime)}</td>
              <td>{row.assetType ?? '—'}</td>
              <td>{row.assetPlate ?? `ID ${row.assetId}`}</td>
              <td style="text-align:right">{fmtNum(row.quantityGallons, 3)} Gal</td>
              <td style="text-align:right">{fmtCurrency(row.totalCostCalculated)}</td>
              <td>
                {#if row.totalCostMismatch}
                  <span class="mismatch-warn" title="El total declarado difiere del calculado qty×precio">
                    ⚠ declarado: {fmtCurrency(row.totalCostActual)}
                  </span>
                {:else}
                  <span style="color:#4a7a4a; font-size:10px;">✓ ok</span>
                {/if}
              </td>
              <td>{row.voucherNumber ?? '—'}</td>
              <td>
                <span class="status-badge status-{row.invoiceStatus ?? 'PENDING_REVIEW'}">
                  {#if row.invoiceStatus === 'APPROVED'}Aprobada
                  {:else if row.invoiceStatus === 'REJECTED'}Rechazada
                  {:else}Pendiente{/if}
                </span>
              </td>
              <td>
                {#if row.invoicePhotoUrl}
                  <a
                    class="inv-photo-link"
                    href={invoiceUrl(row.invoicePhotoUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >Ver factura</a>
                  &nbsp;
                  <label class="inv-upload-label" title="Reemplazar imagen">
                    ↑
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={invoiceActionLoading === row.id}
                      on:change={e => handleInvoiceUpload(row.id, e)}
                    />
                  </label>
                {:else}
                  <label class="inv-upload-label" title="Subir factura">
                    {invoiceActionLoading === row.id ? '...' : '↑ Subir'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={invoiceActionLoading === row.id}
                      on:change={e => handleInvoiceUpload(row.id, e)}
                    />
                  </label>
                {/if}
              </td>
              {#if isAdmin}
                <td style="white-space:nowrap">
                  <button
                    class="inv-action-btn inv-approve"
                    disabled={row.invoiceStatus === 'APPROVED' || invoiceActionLoading === row.id}
                    on:click={() => handleInvoiceAction(row.id, 'APPROVED')}
                  >✓ Aprobar</button>
                  &nbsp;
                  <button
                    class="inv-action-btn inv-reject"
                    disabled={row.invoiceStatus === 'REJECTED' || invoiceActionLoading === row.id}
                    on:click={() => handleInvoiceAction(row.id, 'REJECTED')}
                  >✗ Rechazar</button>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="tbl-footer">
        <span class="record-count">
          Mostrando {invPagedData.length} de {invoiceRows.length} registros
        </span>
        <div class="pagination-controls">
          <select value={invPageSize} on:change={e => { invPageSize = +e.target.value; invPage = 0; }}>
            {#each [10, 20, 50] as s}<option value={s}>Mostrar {s}</option>{/each}
          </select>
          <button on:click={() => invPage = 0}               disabled={invPage === 0}>« Primero</button>
          <button on:click={() => invPage -= 1}              disabled={invPage === 0}>‹ Anterior</button>
          <span>Página <strong>{invPage + 1} de {invTotalPages}</strong></span>
          <button on:click={() => invPage += 1}              disabled={invPage >= invTotalPages - 1}>Siguiente ›</button>
          <button on:click={() => invPage = invTotalPages - 1} disabled={invPage >= invTotalPages - 1}>Último »</button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- ── TAB: ESTACIONES ───────────────────────────────────────────────────── -->
  {#if activeTab === 'estaciones' && isAdmin}
    {#if stationsLoading}
      <div class="loader-container"><Loader /><p>Cargando estaciones...</p></div>
    {:else}
      <div class="stations-header">
        <input
          type="text"
          bind:value={stationNewName}
          placeholder="Nombre de la nueva estación"
          style="padding:3px 6px;border:1px inset #808080;font-size:11px;font-family:inherit;width:220px"
          on:keydown={e => e.key === 'Enter' && handleCreateStation()}
        />
        <button class="btn btn-primary"
          disabled={!stationNewName.trim() || stationActionLoading === 'new'}
          on:click={handleCreateStation}>
          {stationActionLoading === 'new' ? '...' : '+ Agregar'}
        </button>
      </div>

      {#if stationsData.length === 0}
        <div class="empty-msg">No hay estaciones registradas. Agrega la primera arriba.</div>
      {:else}
        <table class="stations-table">
          <thead>
            <tr><th>#</th><th>Nombre</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {#each stationsData as s, i}
              <tr>
                <td style="width:40px;text-align:center">{i + 1}</td>
                <td>
                  {#if stationEditId === s.id}
                    <input class="station-edit-input" type="text" bind:value={stationEditName}
                      on:keydown={e => e.key === 'Enter' && handleUpdateStation(s.id)} />
                  {:else}
                    {s.name}
                  {/if}
                </td>
                <td style="white-space:nowrap">
                  {#if stationEditId === s.id}
                    <button class="station-action-btn"
                      disabled={stationActionLoading === s.id}
                      on:click={() => handleUpdateStation(s.id)}>
                      {stationActionLoading === s.id ? '...' : '✓ Guardar'}
                    </button>
                    &nbsp;
                    <button class="station-action-btn" on:click={() => { stationEditId = null; stationEditName = ''; }}>
                      Cancelar
                    </button>
                  {:else}
                    <button class="station-action-btn"
                      on:click={() => { stationEditId = s.id; stationEditName = s.name; }}>
                      Editar
                    </button>
                    &nbsp;
                    <button class="station-action-btn station-del-btn"
                      disabled={stationActionLoading === s.id}
                      on:click={() => handleDeleteStation(s.id)}>
                      {stationActionLoading === s.id ? '...' : '✕ Eliminar'}
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/if}
  {/if}

</div><!-- /.tab-content -->
</div><!-- /.fuel-module -->

<!-- Registration Modal -->
{#if showCreateModal}
  <FuelRegistrationModal
    on:created={handleFuelCreated}
    on:cancel={() => showCreateModal = false}
  />
{/if}

<!-- Asset Historial Modal -->
{#if historialRow}
  <FuelAssetHistorialModal
    assetType={historialRow.assetType}
    assetPlate={historialRow.assetPlate}
    logs={historialLogs}
    loading={historialLoading}
    on:close={() => { historialRow = null; historialLogs = []; }}
  />
{/if}
