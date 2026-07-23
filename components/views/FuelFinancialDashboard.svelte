<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import Loader from "../shared/Loader.svelte";
  import FuelTrendChart from "./FuelTrendChart.svelte";

  // Paleta categórica validada (dataviz skill, references/palette.md, slots 1-4)
  // — orden fijo, nunca ciclado por índice de array. #e87ba4/#eda100 quedan bajo
  // 3:1 de contraste contra la superficie: nunca se usan como color de texto,
  // solo como swatch/relleno de barra, siempre con leyenda + valor visible al lado.
  const CATEGORICAL = ["#2a78d6", "#008300", "#e87ba4", "#eda100"];
  const ACCENT_BLUE = "#2a78d6";
  const GOOD_GREEN = "#006300";
  const CRITICAL_RED = "#d03b3b";
  const WARNING_AMBER = "#c98500";
  const TREND_OPTIONS = [2, 3, 6, 12, 24];

  let fechaInicio = "";
  let fechaFin = "";
  let mesesTendencia = 6;
  let mesesCustom = "";

  $: dashboard = $data.fuelDashboard;
  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: galonesPorTipo = [...(dashboard?.galonesPorTipo ?? [])].sort((a, b) => a.fuelTypeId - b.fuelTypeId);
  $: maxGalones = galonesPorTipo.length ? Math.max(...galonesPorTipo.map((g) => Number(g.cantidad) || 0)) : 0;

  $: gastoPorTipo = [...(dashboard?.gastoPorTipo ?? [])].sort((a, b) => a.fuelTypeId - b.fuelTypeId);
  $: maxGastoTipo = gastoPorTipo.length ? Math.max(...gastoPorTipo.map((g) => Number(g.monto) || 0)) : 0;

  // Almacén vs Bomba no son identidades de tipo de combustible — colores propios,
  // distintos de la paleta categórica de tipos, para no confundir ambas leyendas.
  $: origenGasto = dashboard
    ? [
        { id: "almacen", label: "Compras almacén", monto: dashboard.totalComprasAlmacen, color: "#2a78d6" },
        { id: "bomba", label: "Tanqueos bomba", monto: dashboard.totalTanqueosBomba, color: "#eb6834" },
      ]
    : [];
  $: maxOrigenGasto = origenGasto.length ? Math.max(...origenGasto.map((o) => Number(o.monto) || 0)) : 0;

  $: trend = $data.fuelTrend ?? [];
  $: trendMonthLabels = trend.map((t) => formatMesCorto(t.mes));
  $: trendGalones = trend.map((t) => Number(t.galonesTotal) || 0);
  $: trendGastoNeto = trend.map((t) => Number(t.gastoNeto) || 0);

  // Delta vs. periodo anterior (misma duración que el rango filtrado, no "mes
  // anterior" fijo — el backend ya lo resuelve así). up = subir es malo para
  // gasto, bueno para ahorro; el color sigue esa semántica, nunca el texto solo.
  $: deltaGastoBruto = deltaInfo(dashboard?.comparacionAnterior?.deltaGastoBrutoPct, false);
  $: deltaGastoNeto = deltaInfo(dashboard?.comparacionAnterior?.deltaGastoNetoPct, false);
  $: deltaAhorro = deltaInfo(dashboard?.comparacionAnterior?.deltaAhorroPct, true);

  function deltaInfo(pct, subirEsBueno) {
    if (pct == null) return null;
    const numPct = Number(pct);
    const esBueno = numPct === 0 ? null : (numPct > 0) === subirEsBueno;
    const flecha = numPct > 0 ? "↑" : numPct < 0 ? "↓" : "→";
    const color = esBueno === null ? "#898781" : esBueno ? GOOD_GREEN : CRITICAL_RED;
    return { pct: numPct, flecha, color, texto: `${numPct > 0 ? "+" : ""}${numPct}% vs. periodo anterior` };
  }

  // La tendencia termina en la fechaFin filtrada (no siempre "hoy"), así puede
  // mostrar un histórico largo (ej. 24 meses) alineado con lo que el usuario filtró.
  function handleMesesChange(n) {
    mesesTendencia = n;
    mesesCustom = "";
    data.fetchFuelTrend(n, fechaFin || undefined);
  }

  function applyCustomMeses() {
    const n = Number(mesesCustom);
    if (!Number.isInteger(n) || n <= 0) return;
    mesesTendencia = n;
    data.fetchFuelTrend(n, fechaFin || undefined);
  }

  function formatMesCorto(fechaIso) {
    if (!fechaIso) return "";
    const [anio, mes] = fechaIso.split("-");
    const nombres = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return nombres[Number(mes) - 1] ?? fechaIso;
  }

  function colorFor(index) {
    return CATEGORICAL[index % CATEGORICAL.length];
  }

  function formatCOP(value) {
    if (value == null) return "—";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  // El gas natural vehicular se mide en m³, no en galones (fuel_types.unidad_medida).
  // La tendencia mensual sigue sumando todo como un solo total en "gal" — mezclar
  // unidades físicas ahí es un pendiente documentado, no corregido en este cambio.
  function formatCantidad(value, unidad = "gal") {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} ${unidad}`;
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchFuelDashboard(fechaInicio || undefined, fechaFin || undefined);
    data.fetchFuelTrend(mesesTendencia, fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelDashboard(fechaInicio || undefined, fechaFin || undefined);
    data.fetchFuelTrend(mesesTendencia, fechaFin || undefined);
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros">
    <label class="field" for="dashFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="dashFechaInicio" type="date" bind:value={fechaInicio} />
    </label>
    <label class="field" for="dashFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="dashFechaFin" type="date" bind:value={fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
  </div>

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else if dashboard}
    <div class="stat-grid stat-grid--primary">
      <div class="stat-tile" style="--tile-accent: {ACCENT_BLUE}">
        <span class="stat-label">Gasto bruto</span>
        <span class="stat-value">{formatCOP(dashboard.gastoBruto)}</span>
        {#if deltaGastoBruto}
          <span class="stat-delta" style="color: {deltaGastoBruto.color}">{deltaGastoBruto.flecha} {deltaGastoBruto.texto}</span>
        {/if}
      </div>
      <div class="stat-tile" style="--tile-accent: {ACCENT_BLUE}">
        <span class="stat-label">Gasto neto</span>
        <span class="stat-value">{formatCOP(dashboard.gastoNeto)}</span>
        {#if deltaGastoNeto}
          <span class="stat-delta" style="color: {deltaGastoNeto.color}">{deltaGastoNeto.flecha} {deltaGastoNeto.texto}</span>
        {/if}
      </div>
      <div class="stat-tile" style="--tile-accent: {GOOD_GREEN}">
        <span class="stat-label">Ahorro por descuentos</span>
        <span class="stat-value stat-value--good">{formatCOP(dashboard.ahorro)}</span>
        {#if deltaAhorro}
          <span class="stat-delta" style="color: {deltaAhorro.color}">{deltaAhorro.flecha} {deltaAhorro.texto}</span>
        {/if}
      </div>
    </div>

    <div class="stat-grid stat-grid--primary">
      <div class="stat-tile" style="--tile-accent: {dashboard.discrepancias > 0 ? WARNING_AMBER : GOOD_GREEN}">
        <span class="stat-label">Discrepancias detectadas</span>
        <span class="stat-value" class:stat-value--warning={dashboard.discrepancias > 0}>{dashboard.discrepancias}</span>
        <span class="stat-hint">Compras y tanqueos donde lo ingresado no coincide con lo calculado</span>
      </div>
      <div class="stat-tile" style="--tile-accent: {ACCENT_BLUE}">
        <span class="stat-label">Precio promedio por galón comprado</span>
        <span class="stat-value">{dashboard.precioPromedioGalonComprado != null ? formatCOP(dashboard.precioPromedioGalonComprado) : "—"}</span>
      </div>
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head-row">
        <div class="fuel-chart-head">Tendencia — últimos {trend.length || mesesTendencia} meses</div>
        <div class="trend-period-selector">
          {#each TREND_OPTIONS as n}
            <button
              type="button"
              class="trend-period-btn"
              class:trend-period-btn--active={mesesTendencia === n}
              on:click={() => handleMesesChange(n)}
            >
              {n}m
            </button>
          {/each}
          <form class="trend-period-custom" on:submit|preventDefault={applyCustomMeses}>
            <input
              type="number"
              min="1"
              placeholder="otro"
              aria-label="Otro número de meses"
              bind:value={mesesCustom}
            />
            <button type="submit" class="trend-period-btn">Aplicar</button>
          </form>
        </div>
      </div>
      <div class="chart-row chart-row--trend" class:chart-row--stacked={mesesTendencia > 6}>
        <FuelTrendChart
          label="Consumo mensual (galones)"
          months={trendMonthLabels}
          values={trendGalones}
          color={ACCENT_BLUE}
          formatValue={formatCantidad}
        />
        <FuelTrendChart
          label="Gasto neto mensual"
          months={trendMonthLabels}
          values={trendGastoNeto}
          color={GOOD_GREEN}
          formatValue={formatCOP}
        />
      </div>
    </div>

    <div class="chart-row">
      <div class="fuel-chart">
        <div class="fuel-chart-head">Origen del gasto: almacén vs. bomba</div>
        <ul class="chart-legend">
          {#each origenGasto as o}
            <li class="legend-item">
              <span class="legend-swatch" style="background: {o.color}"></span>
              <span class="legend-label">{o.label}</span>
            </li>
          {/each}
        </ul>
        <div class="bar-chart">
          {#each origenGasto as o}
            <div class="bar-row">
              <div class="bar-track">
                <div
                  class="bar-fill"
                  style="width: {maxOrigenGasto > 0 ? (o.monto / maxOrigenGasto) * 100 : 0}%; background: {o.color}"
                ></div>
              </div>
              <span class="bar-value">{formatCOP(o.monto)}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="fuel-chart">
        <div class="fuel-chart-head">Gasto por tipo de combustible</div>
        {#if gastoPorTipo.length}
          <ul class="chart-legend">
            {#each gastoPorTipo as fila, i}
              <li class="legend-item">
                <span class="legend-swatch" style="background: {colorFor(i)}"></span>
                <span class="legend-label">{fuelTypesById[fila.fuelTypeId] ?? `Tipo #${fila.fuelTypeId}`}</span>
              </li>
            {/each}
          </ul>
          <div class="bar-chart">
            {#each gastoPorTipo as fila, i}
              <div class="bar-row">
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    style="width: {maxGastoTipo > 0 ? (fila.monto / maxGastoTipo) * 100 : 0}%; background: {colorFor(i)}"
                  ></div>
                </div>
                <span class="bar-value">{formatCOP(fila.monto)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-data">Sin gasto en el rango seleccionado.</p>
        {/if}
      </div>
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head">Cantidad por tipo de combustible</div>
      {#if galonesPorTipo.length}
        <ul class="chart-legend">
          {#each galonesPorTipo as fila, i}
            <li class="legend-item">
              <span class="legend-swatch" style="background: {colorFor(i)}"></span>
              <span class="legend-label">{fuelTypesById[fila.fuelTypeId] ?? `Tipo #${fila.fuelTypeId}`}</span>
            </li>
          {/each}
        </ul>
        <div class="bar-chart">
          {#each galonesPorTipo as fila, i}
            <div class="bar-row">
              <div class="bar-track">
                <div
                  class="bar-fill"
                  style="width: {maxGalones > 0 ? (fila.cantidad / maxGalones) * 100 : 0}%; background: {colorFor(i)}"
                ></div>
              </div>
              <span class="bar-value">{formatCantidad(fila.cantidad, unidadMedidaById[fila.fuelTypeId] === "M3" ? "m³" : "gal")}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-data">Sin tanqueos en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .fuel-dashboard {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family:
      system-ui,
      -apple-system,
      "Segoe UI",
      sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .fuel-filtros {
    display: flex;
    gap: 12px;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .field input {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    background: var(--surface);
  }
  .field input:focus {
    outline: 2px solid #86b6ef;
    outline-offset: 1px;
  }
  .btn-filter {
    padding: 7px 16px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    height: 32px;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  /* Stat tiles: tarjeta blanca, sombra suave, radio de esquina — jerarquía
     real (etiqueta muted + valor grande) con un punto de acento en vez de
     texto coloreado (el color nunca vive en el texto, ver dataviz skill). */
  .stat-grid {
    display: grid;
    gap: 14px;
  }
  .stat-grid--primary {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .stat-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }
  .stat-label::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tile-accent, #2a78d6);
    flex-shrink: 0;
  }
  .stat-value {
    font-size: 26px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .stat-value--good {
    color: #006300;
  }
  .stat-value--warning {
    color: #c98500;
  }
  .stat-delta {
    font-size: 11px;
    font-weight: 500;
  }
  .stat-hint {
    font-size: 10.5px;
    color: var(--ink-muted);
    line-height: 1.3;
  }

  .fuel-chart-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .fuel-chart-head-row .fuel-chart-head {
    margin-bottom: 0;
  }
  .trend-period-selector {
    display: flex;
    gap: 4px;
  }
  .trend-period-btn {
    padding: 4px 10px;
    font-size: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-secondary);
    border-radius: 6px;
    cursor: pointer;
  }
  .trend-period-btn--active {
    background: #2a78d6;
    color: #fff;
    border-color: #2a78d6;
  }
  .trend-period-custom {
    display: flex;
    gap: 4px;
    margin-left: 4px;
  }
  .trend-period-custom input {
    width: 52px;
    padding: 4px 6px;
    font-size: 11px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
  }
  .trend-period-custom input:focus {
    outline: 2px solid #86b6ef;
    outline-offset: 1px;
  }

  .chart-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  /* Con muchos meses (12/24/otro > 6) cada mini-gráfica necesita más ancho para
     que las etiquetas de mes no queden amontonadas — se apilan verticalmente
     en vez de ir lado a lado. */
  .chart-row--stacked {
    grid-template-columns: 1fr;
  }

  /* Barras horizontales: gruesas 24px máx, extremo redondeado 4px, valor
     directo al final (nunca color en el texto), leyenda siempre presente
     porque son >= 2 series. */
  .fuel-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
  }
  .fuel-chart-head {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    color: var(--ink);
  }
  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    list-style: none;
    margin: 0 0 14px;
    padding: 0;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-secondary);
  }
  .legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .bar-chart {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 1fr 90px;
    align-items: center;
    gap: 10px;
  }
  .bar-track {
    background: #f0efec;
    border-radius: 4px;
    height: 20px;
  }
  .bar-fill {
    height: 100%;
    max-height: 24px;
    border-radius: 4px;
    transition: width 0.2s ease;
  }
  .bar-value {
    font-size: 12px;
    color: var(--ink);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
</style>
