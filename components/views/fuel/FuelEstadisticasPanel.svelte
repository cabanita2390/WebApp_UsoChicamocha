<script>
  import { createEventDispatcher } from 'svelte';
  import Loader from '../../shared/Loader.svelte';
  import { fmtCurrency, fmtNum } from '@/lib/fuelFormat.js';

  export let loading = false;
  export let data = [];
  export let mode = 'historico';
  export let filterFrom = '';
  export let filterTo = '';

  const dispatch = createEventDispatcher();

  let statsPageSize = 12;
  let statsCurrentPage = 0;

  // ── Derivados base ────────────────────────────────────────────────────────────
  $: totalMachineCost  = data.reduce((a, m) => a + (m.machineCost  ?? 0), 0);
  $: totalVehicleCost  = data.reduce((a, m) => a + (m.vehicleCost  ?? 0), 0);
  $: totalMotoCost     = data.reduce((a, m) => a + (m.motoCost     ?? 0), 0);
  $: grandTotalCost    = totalMachineCost + totalVehicleCost + totalMotoCost;
  $: grandTotalGallons = data.reduce((a, m) => a + (m.totalGallons ?? 0), 0);
  $: avgMonthlyCost    = data.length ? grandTotalCost / data.length : 0;
  $: peakMonth         = data.reduce((best, m) =>
      (m.totalCost ?? 0) > (best?.totalCost ?? 0) ? m : best, null);
  $: minMonth          = data.length > 1
      ? data.reduce((min, m) => (m.totalCost ?? 0) < (min?.totalCost ?? Infinity) ? m : min, null)
      : null;
  $: maxMonthCost      = Math.max(...data.map(m => m.totalCost ?? 0), 1);
  $: totalAnomalies    = data.reduce((a, m) => a + (m.anomalyCount ?? 0), 0);

  // ── Derivados enriquecidos por mes ────────────────────────────────────────────
  $: statsWithDerived = data.map((m, i) => ({
    ...m,
    changeVsPrev:        (i > 0 && (data[i-1].totalCost ?? 0) > 0)
                           ? ((m.totalCost - data[i-1].totalCost) / data[i-1].totalCost * 100) : null,
    gallonChangeVsPrev:  (i > 0 && (data[i-1].totalGallons ?? 0) > 0)
                           ? ((m.totalGallons - data[i-1].totalGallons) / data[i-1].totalGallons * 100) : null,
  }));

  $: lastMonthStat = statsWithDerived.length > 0 ? statsWithDerived[statsWithDerived.length - 1] : null;
  $: costTrendPct  = lastMonthStat?.changeVsPrev ?? null;

  $: statsTotalPages = Math.max(1, Math.ceil(statsWithDerived.length / statsPageSize));
  $: statsPagedData = statsWithDerived.slice(statsCurrentPage * statsPageSize, (statsCurrentPage + 1) * statsPageSize);

  $: statsWithDerived, (statsCurrentPage = 0);

  $: projectedNextMonth = data.length >= 3
      ? data.slice(-3).reduce((a,m) => a + (m.totalCost ?? 0), 0) / 3
      : (data.length > 0 ? (data[data.length-1].totalCost ?? 0) : 0);
  $: projectedVsAvgPct  = avgMonthlyCost > 0 ? ((projectedNextMonth - avgMonthlyCost) / avgMonthlyCost * 100) : 0;

  // Sparkline del KPI de gasto total
  $: sparkCostPts = (() => {
    const v = data.slice(-10).map(m => m.totalCost ?? 0);
    const mx = Math.max(...v, 1);
    return v.map((vv,i) => `${v.length>1?(i/(v.length-1)*60).toFixed(1):'30'},${(18-vv/mx*16).toFixed(1)}`).join(' ');
  })();

  // Línea de promedio en el gráfico de barras
  $: barAvgY = maxMonthCost > 0 ? BAR_PAD.top + CHART_H * (1 - avgMonthlyCost / maxMonthCost) : 0;

  // ── Insights automáticos ─────────────────────────────────────────────────────
  $: statsInsights = (() => {
    if (data.length === 0) return [];
    const ins = [];
    const totalLoads = data.reduce((a,m) => a + m.totalLoads, 0);

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

    if (data.length >= 3) {
      const vsAvg = ((projectedNextMonth - avgMonthlyCost) / avgMonthlyCost * 100);
      ins.push({ type: 'proj', icon: '→',
        text: `Proyección próximo mes: ${fmtCurrency(projectedNextMonth)}${Math.abs(vsAvg)>5?` (${vsAvg>0?'+':''}${vsAvg.toFixed(1)}% vs promedio histórico)`:''}` });
    }

    return ins;
  })();

  // ── Constantes SVG ───────────────────────────────────────────────────────────
  $: BAR_W       = data.length > 0 ? Math.max(28, Math.floor(680 / data.length) - 8) : 40;
  const CHART_H  = 220;
  const BAR_PAD  = { top: 24, right: 16, bottom: 44, left: 68 };
  const BAR_GAP  = 10;
  $: BAR_TOTAL_W = data.length * (BAR_W + BAR_GAP) + BAR_PAD.left + BAR_PAD.right;
</script>

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
    <button class="stats-period-btn" class:active={mode === opt.key}
      on:click={() => dispatch('periodchange', opt.key)}>
      {opt.label}
    </button>
  {/each}
</div>

{#if loading}
  <div class="loader-container"><Loader /><p>Calculando estadísticas...</p></div>
{:else if data.length === 0}
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
      Resumen — {data.length} mes{data.length !== 1 ? 'es' : ''} · {data.reduce((a,m)=>a+m.totalLoads,0)} cargas
      {#if mode==='historico'}<span class="stats-mode-badge">Histórico completo</span>
      {:else if mode==='anio'}<span class="stats-mode-badge">Último año</span>
      {:else if mode==='semestre'}<span class="stats-mode-badge">Últimos 6 meses</span>
      {:else if mode==='trimestre'}<span class="stats-mode-badge">Último trimestre</span>
      {:else if filterFrom||filterTo}<span class="stats-mode-badge">{filterFrom||'…'} → {filterTo||'…'}</span>
      {/if}
    </div>
    <div class="stats-panel-body">

      <!-- KPIs principales -->
      <div class="kpi-row">
        <div class="kpi-card kpi-accent-blue">
          <div class="kpi-label">Gasto total</div>
          <div class="kpi-value">{fmtCurrency(grandTotalCost)}</div>
          <div class="kpi-sub">{fmtNum(grandTotalGallons,1)} Gal · {data.reduce((a,m)=>a+m.totalLoads,0)} cargas</div>
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
            {#each data as month, i}
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
              <td class="st-center st-bold">{data.reduce((a,m)=>a+m.totalLoads,0)}</td>
              <td class="st-right st-bold">{fmtNum(grandTotalGallons,2)}</td>
              <td class="st-right st-bold">{fmtCurrency(grandTotalCost)}</td>
              <td></td>
              <td class="st-right">{fmtNum(data.reduce((a,m)=>a+(m.machineGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalMachineCost)}</td>
              <td class="st-right">{fmtNum(data.reduce((a,m)=>a+(m.vehicleGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalVehicleCost)}</td>
              <td class="st-right">{fmtNum(data.reduce((a,m)=>a+(m.motoGallons??0),0),2)}</td>
              <td class="st-right">{fmtCurrency(totalMotoCost)}</td>
              <td class="st-center st-bold">{data.reduce((a,m)=>a+m.anomalyCount,0)}</td>
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

<style>
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }

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

  /* ── KPI cards ─────────────────────────────────────────────────────────── */
  .kpi-row   { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:18px; }
  .kpi-card  { background:#ffffff; border:1px solid #e0e0e0; border-left:5px solid #999; padding:14px 16px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.05); transition:box-shadow 0.2s ease; }
  .kpi-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.08); }
  .kpi-accent-blue   { border-left-color:#4a7fc4; }
  .kpi-accent-green  { border-left-color:#4aaa6a; }
  .kpi-accent-orange { border-left-color:#e08030; }
  .kpi-accent-red    { border-left-color:#c0392b; }
  .kpi-accent-gray   { border-left-color:#888; }
  .kpi-label { font-size:10px; color:#666; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .kpi-value { font-size:24px; font-weight:700; color:#0f172a; margin:4px 0 6px; line-height:1.1; }
  .kpi-sub   { font-size:11px; color:#666; line-height:1.5; font-weight:400; }
  .kpi-spark { display:block; margin-top:8px; opacity:0.75; }

  /* ── Gráfico de barras ─────────────────────────────────────────────────── */
  .chart-box { background: #fff; border: 1px solid #d8d8d8; padding: 14px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  .chart-title { font-size: 12px; font-weight: bold; color: #222; margin-bottom: 10px; border-bottom: 2px solid #4a7fc4; padding-bottom: 6px; }
  .axis-label { font-size: 11px; fill: #333; font-weight: 500; }
  .bar-total-label { font-size: 9px; fill: #222; font-weight: bold; }
  .grid-line  { stroke: #f0f0f0; stroke-width: 1; stroke-dasharray: 4,3; }
  .bar-machine { fill: #4a7fc4; }
  .bar-vehicle { fill: #4aaa6a; }
  .bar-moto    { fill: #e08030; }
  .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e0e0e0; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-dot  { width: 12px; height: 12px; display: inline-block; border-radius: 2px; border: 1px solid #0004; }

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
  .st-row-low td  { background:#f0fdf4 !important; }
  .st-row-high td { background:#fff7ed !important; }
  .st-cost-bar { height:3px; background:#e8e8e8; margin-top:3px; border-radius:2px; overflow:hidden; }
  .st-cost-bar > div { height:100%; border-radius:2px; }
  .st-change { font-size:11px; font-weight:bold; }
</style>
