<script>
  import { onMount } from 'svelte';
  import { data as dataStore } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import FuelRegistrationModal from '../shared/FuelRegistrationModal.svelte';
  import FuelStationsPanel from './fuel/FuelStationsPanel.svelte';
  import FuelRankingPanel from './fuel/FuelRankingPanel.svelte';
  import FuelAnomaliesPanel from './fuel/FuelAnomaliesPanel.svelte';
  import FuelRegistrosPanel from './fuel/FuelRegistrosPanel.svelte';
  import FuelEstadisticasPanel from './fuel/FuelEstadisticasPanel.svelte';
  import { auth } from '../../stores/auth.js';
  import { download } from '../../stores/api.js';

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
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

  // ── tabs ─────────────────────────────────────────────────────────────────────
  let activeTab = 'estadisticas'; // 'registros' | 'ranking' | 'anomalias' | 'facturas' | 'estadisticas' | 'estaciones'

  // ── ranking ──────────────────────────────────────────────────────────────────
  let rankingData = [];
  let rankingLoading = false;
  let rankingLoaded = false; // loaded for current filter

  let anomaliesPanelRef;

  // ── estadísticas ─────────────────────────────────────────────────────────────
  let statsData = [];
  let statsLoading = false;
  let statsLoaded  = false;
  // 'historico' | 'anio' | 'semestre' | 'trimestre' | 'periodo'
  let statsMode    = 'historico';

  async function loadStats() {
    if (statsLoading) return;
    statsLoading = true;
    let from = null, to = null;
    if (statsMode === 'periodo') {
      from = filterFrom || null; to = filterTo || null;
    } else if (statsMode === 'anio') {
      to = new Date().toISOString().slice(0, 10);
      const d = new Date(); d.setFullYear(d.getFullYear() - 1); from = d.toISOString().slice(0, 10);
    } else if (statsMode === 'semestre') {
      to = new Date().toISOString().slice(0, 10);
      const d = new Date(); d.setMonth(d.getMonth() - 6); from = d.toISOString().slice(0, 10);
    } else if (statsMode === 'trimestre') {
      to = new Date().toISOString().slice(0, 10);
      const d = new Date(); d.setMonth(d.getMonth() - 3); from = d.toISOString().slice(0, 10);
    }
    // statsMode === 'historico' → from=null, to=null → carga todo
    try {
      statsData  = await dataStore.fetchFuelMonthlyStats(from, to);
      statsLoaded = true;
    } catch (e) { error = e.message; }
    finally { statsLoading = false; }
  }

  async function setStatsMode(mode) {
    statsMode   = mode;
    statsLoaded = false;
    statsData   = [];
    await loadStats();
  }
  $: LINE_H      = 200;
  $: LINE_P      = { top: 20, right: 24, bottom: 50, left: 90 };
  $: LINE_W      = Math.max(500, statsData.length * 90);

  // ── paginación cliente por tab ────────────────────────────────────────────────
  let invPage = 0;    let invPageSize = 20;

  // ── helpers de sorting compartidos (facturas) ─────────────────────────────────
  function sortIcon(activeCol, activeDir, col) {
    if (activeCol !== col) return '';
    return activeDir === 'asc' ? ' ▲' : ' ▼';
  }

  function sortRows(rows, sortCol, sortDir, valFn) {
    if (sortCol == null) return rows;
    return [...rows].sort((a, b) => {
      const va = valFn(a, sortCol), vb = valFn(b, sortCol);
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }


  // ── sorting de facturas ───────────────────────────────────────────────────────
  let invSortCol = null;
  let invSortDir = 'asc';

  function invVal(row, col) {
    switch (col) {
      case 'date':    return row.fuelDateTime ? new Date(row.fuelDateTime).getTime() : 0;
      case 'type':    return (row.assetType ?? '').toLowerCase();
      case 'plate':   return (row.assetPlate ?? '').toLowerCase();
      case 'gallons': return Number(row.quantityGallons ?? 0);
      case 'cost':    return Number(row.totalCostCalculated ?? 0);
      case 'status':  return (row.invoiceStatus ?? '').toLowerCase();
      case 'voucher': return (row.voucherNumber ?? '').toLowerCase();
      default:        return 0;
    }
  }

  function toggleInvSort(col) {
    if (invSortCol === col) {
      if (invSortDir === 'asc') invSortDir = 'desc';
      else { invSortCol = null; invSortDir = 'asc'; }
    } else { invSortCol = col; invSortDir = 'asc'; }
    invPage = 0;
  }

  // ── modals ───────────────────────────────────────────────────────────────────
  let showCreateModal = false;


  // ── export excel ─────────────────────────────────────────────────────────────
  async function handleExportExcel() {
    const params = new URLSearchParams();
    if (filterFrom) params.append('from', filterFrom + 'T00:00:00');
    if (filterTo)   params.append('to',   filterTo   + 'T23:59:59');
    const qs = params.toString() ? `?${params}` : '';
    try {
      await download(`fuel/export${qs}`, 'combustibles.xlsx');
    } catch (e) {
      error = e.message || 'Error al exportar';
    }
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────
  onMount(async () => {
    await Promise.all([
      dataStore.fetchMachines().catch(() => {}),
      dataStore.fetchVehicles().catch(() => {}),
      dataStore.fetchMotos().catch(() => {})
    ]);
    applyFilter();
  });

  // ── funciones ─────────────────────────────────────────────────────────────────
  function formatDateForApi(dateStr) {
    if (!dateStr) return null;
    return `${dateStr}T00:00:00`;
  }

  function formatDateToForApi(dateStr) {
    if (!dateStr) return null;
    return `${dateStr}T23:59:59`;
  }

  async function applyFilter() {
    error = '';
    rankingLoaded = false;
    statsLoaded   = false;
    const from = filterFrom ? formatDateForApi(filterFrom) : null;
    const to   = filterTo ? formatDateToForApi(filterTo) : null;
    try {
      await Promise.all([
        dataStore.fetchFuelLogs(from, to),
        dataStore.fetchFuelDashboard(from, to),
      ]);
      if (activeTab === 'ranking') await loadRanking();
      // El filtro principal fuerza modo 'periodo' en estadísticas
      if (activeTab === 'estadisticas') { statsMode = 'periodo'; await loadStats(); }
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
      const from = filterFrom ? formatDateForApi(filterFrom) : null;
      const to   = filterTo ? formatDateToForApi(filterTo) : null;
      rankingData = await dataStore.fetchFuelRanking(from, to);
      rankingLoaded = true;
    } catch (e) {
      error = e.message;
    } finally {
      rankingLoading = false;
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'ranking'      && !rankingLoaded)   loadRanking();
    if (tab === 'estadisticas' && !statsLoaded)     loadStats();
  }

  async function handleFuelCreated() {
    showCreateModal = false;
    await applyFilter();
    if (activeTab === 'ranking')      { rankingLoaded  = false; await loadRanking(); }
    if (activeTab === 'anomalias')    { await anomaliesPanelRef?.reload(); }
    if (activeTab === 'estadisticas') { statsLoaded     = false; await loadStats(); }
  }

  function invoiceUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    return `${apiBase}/${path}`;
  }
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

  /* toolbar — usa clases estándar del sistema */
  .fuel-filter-bar { display: flex; gap: 12px; align-items: flex-end; flex-shrink: 0; flex-wrap: wrap; padding: 8px 0; border-bottom: 1px solid #d0d0d0; margin-bottom: 8px; }
  .filter-field { display: flex; flex-direction: column; font-size: 11px; }
  .filter-field label { margin-bottom: 2px; font-weight: bold; color: #333; }
  .filter-field input { padding: 3px 6px; border: 1px inset #808080; font-size: 11px; font-family: inherit; }

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
    overflow-x: auto;
    border: 1px inset #c0c0c0;
    border-top: none;
    padding: 10px;
    background: #f5f5f5;
  }

  /* misc */
  .error { color: red; font-weight: bold; margin-bottom: 8px; font-size: 11px; flex-shrink: 0; }
</style>

<div class="fuel-module">

<!-- Toolbar principal — acciones -->
<div class="vehicle-toolbar">
  <button class="vehicle-btn" on:click={() => showCreateModal = true}>+ Registrar Carga</button>
  {#if isAdmin}
    <button class="vehicle-btn vehicle-btn--export" on:click={handleExportExcel}>↓ Exportar Excel</button>
  {/if}
</div>

<!-- Filtro de fecha (secundario) -->
<div class="fuel-filter-bar">
  <div class="filter-field">
    <label for="fuel-from">Desde:</label>
    <input id="fuel-from" type="date" bind:value={filterFrom} />
  </div>
  <div class="filter-field">
    <label for="fuel-to">Hasta:</label>
    <input id="fuel-to" type="date" bind:value={filterTo} />
  </div>
  <button class="vehicle-btn" on:click={applyFilter}>Filtrar</button>
  <button class="vehicle-btn" on:click={clearFilter}>Limpiar</button>
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
  <button class="tab-btn" class:active={activeTab === 'estadisticas'} on:click={() => switchTab('estadisticas')}>
    Estadísticas
  </button>
  <button class="tab-btn" class:active={activeTab === 'registros'} on:click={() => switchTab('registros')}>
    Registros
  </button>
  <button class="tab-btn" class:active={activeTab === 'ranking'} on:click={() => switchTab('ranking')}>
    Ranking
  </button>
  <button class="tab-btn" class:active={activeTab === 'anomalias'} on:click={() => switchTab('anomalias')}>
    Anomalías {#if (dashboard?.anomalyCount ?? 0) > 0}({dashboard.anomalyCount}){/if}
  </button>
  {#if isAdmin || isSupervisorOperativo}
    <button class="tab-btn" class:active={activeTab === 'estaciones'} on:click={() => switchTab('estaciones')}>
      Estaciones
    </button>
  {/if}
</div>

<div class="tab-content">

  <!-- ── TAB: REGISTROS ─────────────────────────────────────────────────────── -->
  {#if activeTab === 'registros'}
    <FuelRegistrosPanel {isLoading} logs={latestFuelLogs} {isAdmin} on:error={(e) => error = e.detail} />

  <!-- ── TAB: RANKING ───────────────────────────────────────────────────────── -->
  {:else if activeTab === 'ranking'}
    <FuelRankingPanel loading={rankingLoading} data={rankingData} />

  <!-- ── TAB: ANOMALÍAS ─────────────────────────────────────────────────────── -->
  {:else if activeTab === 'anomalias'}
    <FuelAnomaliesPanel bind:this={anomaliesPanelRef} on:error={(e) => error = e.detail} />

  <!-- ── TAB: ESTADÍSTICAS ─────────────────────────────────────────────────── -->
  {:else if activeTab === 'estadisticas'}
    <FuelEstadisticasPanel
      loading={statsLoading}
      data={statsData}
      mode={statsMode}
      {filterFrom}
      {filterTo}
      on:periodchange={(e) => setStatsMode(e.detail)}
    />

  {/if}

  <!-- ── TAB: ESTACIONES ───────────────────────────────────────────────────── -->
  {#if activeTab === 'estaciones' && (isAdmin || isSupervisorOperativo)}
    <FuelStationsPanel {isAdmin} on:error={(e) => error = e.detail} />
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

