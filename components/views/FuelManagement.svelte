<script>
  import { onMount } from 'svelte';
  import { data as dataStore } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import FuelRegistrationModal from '../shared/FuelRegistrationModal.svelte';
  import FuelAssetHistorialModal from '../shared/FuelAssetHistorialModal.svelte';
  import FuelStationsPanel from './fuel/FuelStationsPanel.svelte';
  import FuelRankingPanel from './fuel/FuelRankingPanel.svelte';
  import FuelAnomaliesPanel from './fuel/FuelAnomaliesPanel.svelte';
  import { auth } from '../../stores/auth.js';
  import { addNotification } from '../../stores/ui.js';
  import { download } from '../../stores/api.js';
  import { fmtCurrency, fmtNum, fmtDate, fmtEfficiency } from '@/lib/fuelFormat.js';

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

  let statsPageSize = 12;
  let statsCurrentPage = 0;

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

  // ── Derivados base ────────────────────────────────────────────────────────────
  $: totalMachineCost  = statsData.reduce((a, m) => a + (m.machineCost  ?? 0), 0);
  $: totalVehicleCost  = statsData.reduce((a, m) => a + (m.vehicleCost  ?? 0), 0);
  $: totalMotoCost     = statsData.reduce((a, m) => a + (m.motoCost     ?? 0), 0);
  $: grandTotalCost    = totalMachineCost + totalVehicleCost + totalMotoCost;
  $: grandTotalGallons = statsData.reduce((a, m) => a + (m.totalGallons ?? 0), 0);
  $: avgMonthlyCost    = statsData.length ? grandTotalCost / statsData.length : 0;
  $: peakMonth         = statsData.reduce((best, m) =>
      (m.totalCost ?? 0) > (best?.totalCost ?? 0) ? m : best, null);
  $: minMonth          = statsData.length > 1
      ? statsData.reduce((min, m) => (m.totalCost ?? 0) < (min?.totalCost ?? Infinity) ? m : min, null)
      : null;
  $: maxMonthCost      = Math.max(...statsData.map(m => m.totalCost    ?? 0), 1);
  $: maxMonthGallons   = Math.max(...statsData.map(m => m.totalGallons ?? 0), 1);
  $: totalAnomalies    = statsData.reduce((a, m) => a + (m.anomalyCount ?? 0), 0);

  // ── Derivados enriquecidos por mes ────────────────────────────────────────────
  $: statsWithDerived = statsData.map((m, i) => ({
    ...m,
    changeVsPrev:        (i > 0 && (statsData[i-1].totalCost ?? 0) > 0)
                           ? ((m.totalCost - statsData[i-1].totalCost) / statsData[i-1].totalCost * 100) : null,
    gallonChangeVsPrev:  (i > 0 && (statsData[i-1].totalGallons ?? 0) > 0)
                           ? ((m.totalGallons - statsData[i-1].totalGallons) / statsData[i-1].totalGallons * 100) : null,
  }));

  $: lastMonthStat      = statsWithDerived.length > 0 ? statsWithDerived[statsWithDerived.length - 1] : null;
  $: costTrendPct       = lastMonthStat?.changeVsPrev ?? null;

  $: statsTotalPages = Math.max(1, Math.ceil(statsWithDerived.length / statsPageSize));
  $: statsPagedData = statsWithDerived.slice(statsCurrentPage * statsPageSize, (statsCurrentPage + 1) * statsPageSize);

  $: statsWithDerived, statsCurrentPage = 0;
  $: projectedNextMonth = statsData.length >= 3
      ? statsData.slice(-3).reduce((a,m) => a + (m.totalCost ?? 0), 0) / 3
      : (statsData.length > 0 ? (statsData[statsData.length-1].totalCost ?? 0) : 0);
  $: projectedVsAvgPct  = avgMonthlyCost > 0 ? ((projectedNextMonth - avgMonthlyCost) / avgMonthlyCost * 100) : 0;

  // Sparklines para los KPI cards
  $: sparkCostPts = (() => {
    const v = statsData.slice(-10).map(m => m.totalCost ?? 0);
    const mx = Math.max(...v, 1);
    return v.map((vv,i) => `${v.length>1?(i/(v.length-1)*60).toFixed(1):'30'},${(18-vv/mx*16).toFixed(1)}`).join(' ');
  })();

  $: sparkCostDots = (() => {
    const v = statsData.slice(-10).map(m => m.totalCost ?? 0);
    const mx = Math.max(...v, 1);
    const avg = v.reduce((a,b)=>a+b,0) / (v.length||1);
    const avgY = (18-avg/mx*16).toFixed(1);
    return { vals: v, max: mx, avgY };
  })();

  $: sparkAnomalyBars = statsData.slice(-10).map(m => m.anomalyCount ?? 0);
  $: sparkAnomalyMax  = Math.max(...sparkAnomalyBars, 1);

  // Línea de promedio en el gráfico de barras
  $: barAvgY = maxMonthCost > 0 ? BAR_PAD.top + CHART_H * (1 - avgMonthlyCost / maxMonthCost) : 0;

  // Últimos meses para el timeline
  $: recentMonths = statsWithDerived.slice(-8);

  // ── Insights automáticos ─────────────────────────────────────────────────────
  $: statsInsights = (() => {
    if (statsData.length === 0) return [];
    const ins = [];
    const totalLoads = statsData.reduce((a,m) => a + m.totalLoads, 0);

    if (costTrendPct !== null && Math.abs(costTrendPct) > 5)
      ins.push({ type: costTrendPct > 0 ? 'warn' : 'good', icon: costTrendPct > 0 ? '↑' : '↓',
        text: `El gasto ${costTrendPct > 0 ? 'aumentó' : 'bajó'} ${Math.abs(costTrendPct).toFixed(1)}% en el último mes` });

    if (grandTotalCost > 0) {
      const dom = [['Maquinaria',totalMachineCost],['Vehículos',totalVehicleCost],['Motos',totalMotoCost]]
        .reduce((mx,f) => f[1] > mx[1] ? f : mx);
      if (dom[1] / grandTotalCost > 0.5)
        ins.push({ type: 'info', icon: '⚡', text: `${dom[0]} concentra el ${((dom[1]/grandTotalCost)*100).toFixed(1)}% del presupuesto de combustible` });
    }

    if (totalAnomalies > 0 && totalLoads > 0)
      ins.push({ type: totalAnomalies > 5 ? 'alert' : 'warn', icon: '⚠',
        text: `${totalAnomalies} anomalía${totalAnomalies>1?'s':''} detectada${totalAnomalies>1?'s':''} (${(totalAnomalies/totalLoads*100).toFixed(1)}% de cargas) — revisar tab Anomalías` });

    if (statsData.length >= 3) {
      const vsAvg = ((projectedNextMonth - avgMonthlyCost) / avgMonthlyCost * 100);
      ins.push({ type: 'proj', icon: '→',
        text: `Proyección próximo mes: ${fmtCurrency(projectedNextMonth)}${Math.abs(vsAvg)>5?` (${vsAvg>0?'+':''}${vsAvg.toFixed(1)}% vs promedio histórico)`:''}` });
    }

    return ins;
  })();

  // ── Constantes SVG ───────────────────────────────────────────────────────────
  $: BAR_W       = statsData.length > 0 ? Math.max(28, Math.floor(680 / statsData.length) - 8) : 40;
  $: CHART_H     = 220;
  $: BAR_PAD     = { top: 24, right: 16, bottom: 44, left: 68 };
  $: BAR_GAP     = 10;
  $: BAR_TOTAL_W = statsData.length * (BAR_W + BAR_GAP) + BAR_PAD.left + BAR_PAD.right;
  $: LINE_H      = 200;
  $: LINE_P      = { top: 20, right: 24, bottom: 50, left: 90 };
  $: LINE_W      = Math.max(500, statsData.length * 90);

  // ── paginación cliente por tab ────────────────────────────────────────────────
  let regPage = 0;    let regPageSize = 20;
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

  // ── paginación ────────────────────────────────────────────────────────────────
  $: regTotalPages = Math.max(1, Math.ceil(latestFuelLogs.length / regPageSize));
  $: regPagedData  = latestFuelLogs.slice(regPage * regPageSize, (regPage + 1) * regPageSize);

  // Resetear página al cambiar datos
  $: latestFuelLogs, regPage = 0;



  // ── modals ───────────────────────────────────────────────────────────────────
  let showCreateModal = false;
  let historialRow = null;
  let historialLogs = [];
  let historialLoading = false;


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
      error = e.message;
      addNotification({
        id: Date.now(),
        text: `Error al subir factura: ${e.message}`
      });
    }
    finally { event.target.value = ''; }
  }

  function invoiceUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    return `${apiBase}/${path}`;
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
  h3 { margin: 0 0 6px 0; font-size: 13px; flex-shrink: 0; }
  .error { color: red; font-weight: bold; margin-bottom: 8px; font-size: 11px; flex-shrink: 0; }
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }

  .fuel-table-wrap {
    overflow: auto;
    border: 2px inset #c0c0c0;
    border-top: none;
    border-top-color: #808080;
    border-left-color: #808080;
    border-right-color: #dfdfdf;
    border-bottom-color: #dfdfdf;
    margin-bottom: 4px;
  }

  /* ── tabla base compartida (ranking / anomalías / facturas) ── */
  .fuel-table { width: 100%; border-collapse: collapse; font-size: 11px; font-family: "MS Sans Serif", "Tahoma", sans-serif; }
  .fuel-table th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 6px 8px; text-align: center; white-space: nowrap; }
  .fuel-table td { border: 1px solid #c0c0c0; border-left: none; padding: 6px 8px; background: #fff; white-space: nowrap; text-align: left; }
  .fuel-table tr:nth-child(even) td { background: #f4f4f4; }
  .fuel-table th.col-sort { cursor: pointer; user-select: none; }
  .fuel-table th.col-sort:hover { background: #a8a8a8; }

  /* ranking — decoraciones específicas */
  .rank-pos { font-weight: bold; text-align: center; font-size: 13px; }
  .rank-1 { color: #b8860b; }
  .rank-2 { color: #707070; }
  .rank-3 { color: #8b4513; }
  .bar-cell { min-width: 120px; }
  .bar-wrap { display: flex; align-items: center; gap: 6px; }
  .bar-bg { flex: 1; height: 10px; background: #ddd; border: 1px inset #bbb; }
  .bar-fill { height: 100%; background: linear-gradient(to right, #5a9fd4, #2a6fa8); }
  .bar-label { font-size: 10px; white-space: nowrap; }

  /* anomalías — tinte naranja solo en filas impares (filas pares ya las cubre nth-child) */
  .fuel-table--anomaly td { background: #fff3e0 !important; }
  .fuel-table--anomaly tr:nth-child(even) td { background: #fff6f0 !important; }
  .badge-warn { display: inline-block; padding: 1px 6px; background: #ffcc00; border: 1px solid #cc9900; font-weight: bold; font-size: 10px; color: #5c3d00; }
  .dismiss-btn { padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0,#d0d0d0); }
  .dismiss-btn:hover { background: linear-gradient(to bottom, #fff,#e0e0e0); }

  .btn-export { color: #1a5c1a; font-weight: bold; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
  /* invoice tab */
  .status-badge {
    display: inline-block; padding: 1px 7px; font-size: 10px; font-weight: bold; border: 1px solid;
  }
  .status-PENDING_REVIEW { background: #fff8d0; color: #7a5c00; border-color: #ccaa00; }
  .status-APPROVED       { background: #d6f5d6; color: #1a5c1a; border-color: #4a9c4a; }
  .status-REJECTED       { background: #fde8e8; color: #8c1a1a; border-color: #cc4444; }
  .inv-action-btn { padding: 4px 10px; font-size: 11px; font-family: inherit; border: 1px outset #b8b8b8; cursor: pointer; background: linear-gradient(to bottom, #f5f5f5 0%, #d8d8d8 100%); border-radius: 3px; transition: all 0.2s ease; }
  .inv-action-btn:hover:not(:disabled) { background: linear-gradient(to bottom, #fff 0%, #e8e8e8 100%); }
  .inv-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .inv-approve { color: #15803d; font-weight: 500; }
  .inv-reject  { color: #b91c1c; font-weight: 500; }
  .inv-upload-label { display: inline-block; padding: 4px 10px; font-size: 11px; font-family: inherit; border: 1px outset #b8b8b8; cursor: pointer; background: linear-gradient(to bottom, #f5f5f5 0%, #d8d8d8 100%); border-radius: 3px; transition: all 0.2s ease; }
  .inv-upload-label:hover { background: linear-gradient(to bottom, #fff 0%, #e8e8e8 100%); }
  .inv-upload-label input[type="file"] { display: none; }
  .inv-photo-link { color: #0050a0; text-decoration: none; font-size: 11px; cursor: pointer; font-weight: 500; padding: 4px 10px; background: linear-gradient(to bottom, #f5f5f5 0%, #d8d8d8 100%); border: 1px outset #b8b8b8; border-radius: 3px; display: inline-block; transition: all 0.2s ease; }
  .inv-photo-link:hover { background: linear-gradient(to bottom, #fff 0%, #e8e8e8 100%); }
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
  .kpi-card { background: linear-gradient(160deg, #efefef 0%, #d6d6d6 100%); border: 1px inset #b0b0b0; padding: 14px 16px; border-left: 4px solid #4a7fc4; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .kpi-label { font-size: 11px; color: #444; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi-value { font-size: 22px; font-weight: bold; color: #1a1a1a; margin: 6px 0 4px; line-height: 1.2; }
  .kpi-sub   { font-size: 11px; color: #555; margin-top: 6px; line-height: 1.4; }
  .chart-section { margin-bottom: 18px; }
  .chart-title { font-size: 12px; font-weight: bold; color: #222; margin-bottom: 10px; border-bottom: 2px solid #4a7fc4; padding-bottom: 6px; }
  .charts-row  { margin-bottom: 12px; }
  .charts-row-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 18px; }
  .chart-box { background: #fff; border: 1px solid #d8d8d8; padding: 14px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  svg.chart { width: 100%; overflow: visible; }
  .axis-label { font-size: 11px; fill: #333; font-weight: 500; }
  .bar-total-label { font-size: 9px; fill: #222; font-weight: bold; }
  .grid-line  { stroke: #f0f0f0; stroke-width: 1; stroke-dasharray: 4,3; }
  .bar-machine { fill: #4a7fc4; }
  .bar-vehicle { fill: #4aaa6a; }
  .bar-moto    { fill: #e08030; }
  .line-total  { fill: none; stroke: #d97706; stroke-width: 2.5; }
  .dot-total   { fill: #d97706; stroke: #fff; stroke-width: 1.5; }
  .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e0e0e0; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-dot  { width: 12px; height: 12px; display: inline-block; border-radius: 2px; border: 1px solid #0004; }
  .donut-wrap  { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .donut-legend { font-size: 10px; width: 100%; }
  .donut-row   { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
  .donut-amount { font-size: 9px; color: #666; margin-left: 6px; }

  /* ── Selector de período de estadísticas ──────────────────────────────── */
  .stats-period-toolbar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 12px 0; margin-bottom: 14px; border-bottom: 1px solid #e0e0e0;
  }
  .stats-period-label { font-size: 12px; font-weight: 600; color: #333; margin-right: 4px; }
  .stats-period-btn {
    padding: 5px 12px; font-size: 11px; font-family: inherit; cursor: pointer; font-weight: 500;
    border: 1px solid #c0c0c0;
    background: #f8f8f8;
    color: #333; border-radius: 3px; transition: all 0.15s ease;
  }
  .stats-period-btn:hover:not(.active) {
    border-color: #4a7fc4; background: #f5f5f5;
  }
  .stats-period-btn.active {
    background: linear-gradient(to bottom, #4a7fc4 0%, #2a5fa4 100%);
    color: #fff; border-color: #1a4fa4; box-shadow: 0 2px 6px rgba(74, 127, 196, 0.2);
  }

  /* ── Paneles de estadísticas ───────────────────────────────────────────── */
  .stats-panel { margin-bottom: 14px; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }
  .stats-panel-header {
    padding: 12px 14px; background: #f5f5f5;
    border-bottom: 1px solid #d8d8d8;
    font-size: 12px; font-weight: 600; color: #222;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .stats-mode-badge {
    font-size: 10px; font-weight: 500; color: #666;
    background: #ffffff; border: 1px solid #d0d0d0; padding: 2px 8px;
    border-radius: 3px;
  }
  .stats-panel-body {
    border: none;
    padding: 14px; background: #ffffff;
  }

  /* ── Insights strip ───────────────────────────────────────────────────── */
  .insights-strip { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
  .insight-chip {
    display:inline-flex; align-items:center; gap:7px;
    padding:8px 14px; font-size:11px; font-family:inherit;
    border-radius:4px; border: 1px solid; line-height:1.4; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .insight-icon { font-size:15px; flex-shrink:0; }
  .insight-good  { background:#f0fdf4; border-color:#86efac; color:#166534; }
  .insight-warn  { background:#fffbeb; border-color:#fcd34d; color:#7c2d12; }
  .insight-alert { background:#fef2f2; border-color:#fca5a5; color:#991b1b; }
  .insight-info  { background:#eff6ff; border-color:#93c5fd; color:#0c2d6b; }
  .insight-proj  { background:#f5f3ff; border-color:#c4b5fd; color:#4c1d95; }

  /* ── Fleet list (barras horizontales) ─────────────────────────────────── */
  .fleet-list { display:flex; flex-direction:column; gap:12px; margin-top:14px; }
  .fleet-row  { display:grid; grid-template-columns:120px 1fr auto; align-items:center; gap:14px; padding:8px 0; border-bottom:1px solid #f0f0f0; }
  .fleet-row:last-child { border-bottom:none; }
  .fleet-row-label { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:bold; color:#222; }
  .fleet-row-bar  { height:14px; background:#e8e8e8; border-radius:6px; overflow:hidden; border:1px solid #d0d0d0; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
  .fleet-row-fill { height:100%; border-radius:6px; transition: width 0.3s ease; }
  .fleet-row-stats { display:flex; gap:14px; align-items:center; font-size:11px; white-space:nowrap; min-width:380px; }
  .fleet-row-cost   { font-weight:bold; color:#111; min-width:100px; font-size:12px; }
  .fleet-row-pct    { color:#666; min-width:45px; font-weight:500; }
  .fleet-row-detail { color:#777; font-size:10px; }

  /* ── KPI cards ─────────────────────────────────────────────────────────── */
  .kpi-row   { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:18px; }
  .kpi-row-6 { grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); }
  .kpi-card  { background:#ffffff; border:1px solid #e0e0e0; border-left:5px solid #999; padding:14px 16px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.05); transition:box-shadow 0.2s ease; }
  .kpi-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.08); }
  .kpi-accent-blue   { border-left-color:#4a7fc4; }
  .kpi-accent-green  { border-left-color:#4aaa6a; }
  .kpi-accent-orange { border-left-color:#e08030; }
  .kpi-accent-red    { border-left-color:#c0392b; }
  .kpi-accent-gray   { border-left-color:#888; }
  .kpi-accent-purple { border-left-color:#7c3aed; }
  .kpi-body  { min-width:0; }
  .kpi-label { font-size:10px; color:#666; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .kpi-value { font-size:24px; font-weight:700; color:#0f172a; margin:4px 0 6px; line-height:1.1; }
  .kpi-sub   { font-size:11px; color:#666; line-height:1.5; font-weight:400; }
  .kpi-spark { display:block; margin-top:8px; opacity:0.75; }

  /* fleet-dot used in fleet-row-label */
  .fleet-dot { width:10px; height:10px; border-radius:2px; flex-shrink:0; }

  /* ── Tabla de estadísticas ─────────────────────────────────────────────── */
  .stats-table-wrap { overflow-x:auto; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  .stats-table { width:100%; border-collapse:collapse; font-size:11px; white-space:nowrap; }
  .stats-table th { background:linear-gradient(to bottom, #c8c8c8, #b8b8b8); padding:8px 10px; border:1px solid #909090; font-weight:bold; color:#222; }
  .stats-table td { padding:7px 10px; border:1px solid #d0d0d0; background:#fff; }
  .stats-table tbody tr:nth-child(even) td { background:#f8f8f8; }
  .stats-table tbody tr:hover td { background:#eef4ff; transition: background-color 0.2s ease; }
  .st-group   { text-align:center; }
  .st-machine { background:#dbeafe !important; color:#1d4ed8; }
  .st-vehicle { background:#dcfce7 !important; color:#15803d; }
  .st-moto    { background:#ffedd5 !important; color:#c2410c; }
  .st-month   { text-align:left; min-width:90px; }
  .st-center  { text-align:center; }
  .st-right   { text-align:right; }
  .st-bold    { font-weight:bold; }
  .st-month-cell { font-weight:bold; white-space:nowrap; }
  .st-peak-row td { background:#fef9c3 !important; }
  .st-peak-badge { display:inline-block; margin-left:6px; padding:2px 7px; background:#d97706; color:#fff; font-size:9px; font-weight:bold; border-radius:3px; vertical-align:middle; text-transform:uppercase; }
  .st-anomaly-badge { display:inline-block; padding:2px 7px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-size:10px; font-weight:bold; border-radius:3px; }
  .st-min-badge { display:inline-block; margin-left:6px; padding:2px 7px; background:#15803d; color:#fff; font-size:9px; font-weight:bold; border-radius:3px; vertical-align:middle; }
  .st-ok { color:#15803d; font-size:11px; }
  .st-total-row td { background:#dcdcdc !important; font-weight:bold; border-top:2px solid #888; }
  /* Color coding por desviación del promedio */
  .st-row-low td  { background:#f0fdf4 !important; }
  .st-row-high td { background:#fff7ed !important; }
  /* Barra mini en celda de costo */
  .st-cost-bar { height:3px; background:#e8e8e8; margin-top:3px; border-radius:2px; overflow:hidden; }
  .st-cost-bar > div { height:100%; border-radius:2px; }
  /* Celda de precio: tamaño compacto */
  .st-price-cell { font-size:10px; white-space:nowrap; }
  /* Indicador de variación */
  .st-change { font-size:11px; font-weight:bold; }
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
        showDeleteButton={isAdmin}
      />
    {/if}

  <!-- ── TAB: RANKING ───────────────────────────────────────────────────────── -->
  {:else if activeTab === 'ranking'}
    <FuelRankingPanel loading={rankingLoading} data={rankingData} />

  <!-- ── TAB: ANOMALÍAS ─────────────────────────────────────────────────────── -->
  {:else if activeTab === 'anomalias'}
    <FuelAnomaliesPanel bind:this={anomaliesPanelRef} on:error={(e) => error = e.detail} />

  <!-- ── TAB: ESTADÍSTICAS ─────────────────────────────────────────────────── -->
  {:else if activeTab === 'estadisticas'}
    <!-- Selector de período propio -->
    <div class="stats-period-toolbar">
      <span class="stats-period-label">Ver período:</span>
      {#each [
        { key: 'historico',  label: 'Histórico completo' },
        { key: 'anio',       label: 'Último año' },
        { key: 'semestre',   label: 'Últimos 6 meses' },
        { key: 'trimestre',  label: 'Último trimestre' },
        { key: 'periodo',    label: 'Rango del filtro' },
      ] as opt}
        <button class="stats-period-btn" class:active={statsMode === opt.key}
          on:click={() => setStatsMode(opt.key)}>
          {opt.label}
        </button>
      {/each}
    </div>

    {#if statsLoading}
      <div class="loader-container"><Loader /><p>Calculando estadísticas...</p></div>
    {:else if statsData.length === 0}
      <div class="empty-msg">
        Sin registros para el período seleccionado.<br>
        <small>Prueba con "Histórico completo" o registra cargas de combustible.</small>
      </div>
    {:else}

      <!-- INSIGHTS — hallazgos automáticos accionables -->
      {#if statsInsights.length > 0}
        <div class="insights-strip">
          {#each statsInsights as ins}
            <div class="insight-chip insight-{ins.type}">
              <span class="insight-icon">{ins.icon}</span>
              <span>{ins.text}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- PANEL 1 — Resumen ejecutivo -->
      <div class="stats-panel">
        <div class="stats-panel-header">
          Resumen — {statsData.length} mes{statsData.length !== 1 ? 'es' : ''} · {statsData.reduce((a,m)=>a+m.totalLoads,0)} cargas
          {#if statsMode==='historico'}<span class="stats-mode-badge">Histórico completo</span>
          {:else if statsMode==='anio'}<span class="stats-mode-badge">Último año</span>
          {:else if statsMode==='semestre'}<span class="stats-mode-badge">Últimos 6 meses</span>
          {:else if statsMode==='trimestre'}<span class="stats-mode-badge">Último trimestre</span>
          {:else if filterFrom||filterTo}<span class="stats-mode-badge">{filterFrom||'…'} → {filterTo||'…'}</span>
          {/if}
        </div>
        <div class="stats-panel-body">

          <!-- KPIs principales -->
          <div class="kpi-row">
            <div class="kpi-card kpi-accent-blue">
              <div class="kpi-label">Gasto total</div>
              <div class="kpi-value">{fmtCurrency(grandTotalCost)}</div>
              <div class="kpi-sub">{fmtNum(grandTotalGallons,1)} Gal · {statsData.reduce((a,m)=>a+m.totalLoads,0)} cargas</div>
              <svg width="100%" height="20" class="kpi-spark" preserveAspectRatio="none" viewBox="0 0 60 20">
                <polyline points={sparkCostPts} fill="none" stroke="#4a7fc4" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="kpi-card kpi-accent-green">
              <div class="kpi-label">Promedio mensual</div>
              <div class="kpi-value">{fmtCurrency(avgMonthlyCost)}</div>
              <div class="kpi-sub">Base para proyecciones y comparativas</div>
            </div>
            <div class="kpi-card {costTrendPct!==null?(costTrendPct>8?'kpi-accent-red':costTrendPct<-8?'kpi-accent-green':'kpi-accent-gray'):'kpi-accent-gray'}">
              <div class="kpi-label">Tendencia (últimas 2 semanas)</div>
              <div class="kpi-value" style="font-size:24px">
                {#if costTrendPct!==null}
                  <span style="color:{costTrendPct>8?'#b91c1c':costTrendPct<-8?'#15803d':costTrendPct>3?'#d97706':'#374151'}">
                    {costTrendPct>0?'↑':'↓'} {Math.abs(costTrendPct).toFixed(1)}%
                  </span>
                {:else}<span style="color:#999">—</span>{/if}
              </div>
              <div class="kpi-sub" style="font-size:10px">{costTrendPct!==null?(costTrendPct>8?'⚠ Gasto elevado':costTrendPct<-8?'✓ Buen control':'Variación normal'):''}</div>
            </div>
            <div class="kpi-card kpi-accent-orange">
              <div class="kpi-label">Proyección próximo mes</div>
              <div class="kpi-value">{fmtCurrency(projectedNextMonth)}</div>
              <div class="kpi-sub">
                vs promedio {#if Math.abs(projectedVsAvgPct)>3}<span style="color:{projectedVsAvgPct>0?'#c0392b':'#15803d'}"> {projectedVsAvgPct>0?'+':''}{projectedVsAvgPct.toFixed(1)}%</span>{:else}similar{/if}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL 2 — Gráfico de gasto mensual -->
      <div class="stats-panel">
        <div class="stats-panel-header">Evolución de gasto por flota</div>
        <div class="stats-panel-body">
          <div class="chart-box">
            <div class="chart-title">Gasto mensual — línea punteada = promedio ({fmtCurrency(avgMonthlyCost)})</div>
              <svg class="chart" viewBox="0 0 {BAR_TOTAL_W} {CHART_H + BAR_PAD.top + BAR_PAD.bottom}">
                {#each [0.25,0.5,0.75,1] as pct}
                  {@const y = BAR_PAD.top+CHART_H*(1-pct)}
                  <line class="grid-line" x1={BAR_PAD.left} x2={BAR_TOTAL_W-BAR_PAD.right} y1={y} y2={y}/>
                  <text class="axis-label" x={BAR_PAD.left-4} y={y+3} text-anchor="end">{fmtCurrency(maxMonthCost*pct)}</text>
                {/each}
                <line x1={BAR_PAD.left} x2={BAR_TOTAL_W-BAR_PAD.right} y1={barAvgY} y2={barAvgY} stroke="#888" stroke-width="1.5" stroke-dasharray="5,3"/>
                <text fill="#888" font-size="9" x={BAR_PAD.left+4} y={barAvgY-3} font-style="italic">Prom. {fmtCurrency(avgMonthlyCost)}</text>
                {#each statsData as month, i}
                  {@const x = BAR_PAD.left+i*(BAR_W+BAR_GAP)}
                  {@const hM = ((month.machineCost??0)/maxMonthCost)*CHART_H}
                  {@const hV = ((month.vehicleCost??0)/maxMonthCost)*CHART_H}
                  {@const hT = ((month.motoCost??0)/maxMonthCost)*CHART_H}
                  {@const totalH = hM+hV+hT}
                  {@const isPeak = month.monthLabel===peakMonth?.monthLabel && month.year===peakMonth?.year}
                  {#if isPeak}<rect x={x-2} y={BAR_PAD.top} width={BAR_W+4} height={CHART_H} fill="#fef9c3" rx="2" opacity="0.7"/>{/if}
                  <rect class="bar-moto"    x={x} y={BAR_PAD.top+CHART_H-hT}     width={BAR_W} height={hT}/>
                  <rect class="bar-vehicle" x={x} y={BAR_PAD.top+CHART_H-hT-hV}  width={BAR_W} height={hV}/>
                  <rect class="bar-machine" x={x} y={BAR_PAD.top+CHART_H-totalH} width={BAR_W} height={hM} rx="2" ry="2"/>
                  {#if totalH>10}
                    <text class="bar-total-label" x={x+BAR_W/2} y={BAR_PAD.top+CHART_H-totalH-4} text-anchor="middle">{fmtCurrency(month.totalCost)}</text>
                  {/if}
                  <text class="axis-label" x={x+BAR_W/2} y={BAR_PAD.top+CHART_H+13} text-anchor="middle">{month.monthLabel.slice(0,3)}</text>
                  <text class="axis-label" x={x+BAR_W/2} y={BAR_PAD.top+CHART_H+24} text-anchor="middle">{month.year}</text>
                {/each}
              </svg>
              <div class="legend">
                <div class="legend-item"><span class="legend-dot" style="background:#4a7fc4"></span>Maquinaria</div>
                <div class="legend-item"><span class="legend-dot" style="background:#4aaa6a"></span>Vehículos</div>
                <div class="legend-item"><span class="legend-dot" style="background:#e08030"></span>Motos</div>
              </div>
            </div>
        </div>
      </div>

      <!-- PANEL 3 — Tabla histórica completa -->
      <div class="stats-panel">
        <div class="stats-panel-header">
          Histórico mensual completo
          <span class="stats-mode-badge">Verde = bajo promedio · Naranja = sobre promedio</span>
        </div>
        <div class="stats-panel-body" style="padding:0">
          <div class="stats-table-wrap">
            <table class="stats-table">
              <thead>
                <tr>
                  <th rowspan="2" class="st-month">Mes</th>
                  <th rowspan="2" class="st-center">Cargas</th>
                  <th rowspan="2" class="st-right">Galones</th>
                  <th rowspan="2" class="st-right">Costo total</th>
                  <th rowspan="2" class="st-center">Var. %</th>
                  <th colspan="2" class="st-group st-machine">Maquinaria</th>
                  <th colspan="2" class="st-group st-vehicle">Vehículos</th>
                  <th colspan="2" class="st-group st-moto">Motos</th>
                  <th rowspan="2" class="st-center">Anom.</th>
                </tr>
                <tr>
                  <th class="st-right st-machine">Gal</th><th class="st-right st-machine">Costo</th>
                  <th class="st-right st-vehicle">Gal</th><th class="st-right st-vehicle">Costo</th>
                  <th class="st-right st-moto">Gal</th><th class="st-right st-moto">Costo</th>
                </tr>
              </thead>
              <tbody>
                {#each statsPagedData as m}
                  {@const isPeak = m.monthLabel===peakMonth?.monthLabel&&m.year===peakMonth?.year}
                  {@const isMin  = minMonth&&m.monthLabel===minMonth.monthLabel&&m.year===minMonth.year}
                  {@const rowCls = isPeak?'st-peak-row':m.totalCost>avgMonthlyCost*1.12?'st-row-high':m.totalCost<avgMonthlyCost*0.88&&m.totalCost>0?'st-row-low':''}
                  <tr class={rowCls}>
                    <td class="st-month-cell">
                      {m.monthLabel} <span style="color:#999;font-size:10px">{m.year}</span>
                      {#if isPeak}<span class="st-peak-badge">pico</span>{/if}
                      {#if isMin}<span class="st-min-badge">mín</span>{/if}
                    </td>
                    <td class="st-center">{m.totalLoads}</td>
                    <td class="st-right">{fmtNum(m.totalGallons,2)}</td>
                    <td class="st-right st-bold">
                      {fmtCurrency(m.totalCost)}
                      <div class="st-cost-bar"><div style="width:{(m.totalCost/maxMonthCost*100).toFixed(1)}%;background:{isPeak?'#ca8a04':'#4a7fc4'}"></div></div>
                    </td>
                    <td class="st-center">
                      {#if m.changeVsPrev!==null}
                        <span class="st-change" style="color:{m.changeVsPrev>8?'#b91c1c':m.changeVsPrev<-8?'#15803d':m.changeVsPrev>3?'#d97706':'#374151'}">
                          {m.changeVsPrev>0?'↑':'↓'} {Math.abs(m.changeVsPrev).toFixed(1)}%
                        </span>
                      {:else}<span style="color:#bbb">—</span>{/if}
                    </td>
                    <td class="st-right">{fmtNum(m.machineGallons,2)}</td>
                    <td class="st-right">{fmtCurrency(m.machineCost)}</td>
                    <td class="st-right">{fmtNum(m.vehicleGallons,2)}</td>
                    <td class="st-right">{fmtCurrency(m.vehicleCost)}</td>
                    <td class="st-right">{fmtNum(m.motoGallons,2)}</td>
                    <td class="st-right">{fmtCurrency(m.motoCost)}</td>
                    <td class="st-center">
                      {#if m.anomalyCount>0}<span class="st-anomaly-badge">⚠ {m.anomalyCount}</span>
                      {:else}<span class="st-ok">✓</span>{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="st-total-row">
                  <td class="st-bold">TOTAL</td>
                  <td class="st-center st-bold">{statsData.reduce((a,m)=>a+m.totalLoads,0)}</td>
                  <td class="st-right st-bold">{fmtNum(grandTotalGallons,2)}</td>
                  <td class="st-right st-bold">{fmtCurrency(grandTotalCost)}</td>
                  <td></td>
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
          {#if statsTotalPages > 1}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#e8e8e8; border-top:1px solid #b8b8b8; font-size:11px">
              <div style="display:flex; gap:4px">
                <button class="btn" style="padding:4px 12px" disabled={statsCurrentPage === 0} on:click={() => statsCurrentPage = 0}>«</button>
                <button class="btn" style="padding:4px 12px" disabled={statsCurrentPage === 0} on:click={() => statsCurrentPage--}>‹</button>
                <span style="padding:0 12px; display:flex; align-items:center; color:#666">Pág {statsCurrentPage + 1} de {statsTotalPages}</span>
                <button class="btn" style="padding:4px 12px" disabled={statsCurrentPage === statsTotalPages - 1} on:click={() => statsCurrentPage++}>›</button>
                <button class="btn" style="padding:4px 12px" disabled={statsCurrentPage === statsTotalPages - 1} on:click={() => statsCurrentPage = statsTotalPages - 1}>»</button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

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

<!-- Asset Historial Modal -->
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
