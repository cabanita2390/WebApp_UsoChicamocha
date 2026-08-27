<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { fuelDateRange, resetFuelDateRange } from "../../stores/fuelFilters.js";
  import Loader from "../shared/Loader.svelte";
  import FuelTrendChart from "./FuelTrendChart.svelte";
  import RegisterMonthlyDiscountModal from "../shared/RegisterMonthlyDiscountModal.svelte";

  // Paleta categórica validada (dataviz skill, references/palette.md, slots 1-4)
  // — orden fijo, nunca ciclado por índice de array. #e87ba4/#eda100 quedan bajo
  // 3:1 de contraste contra la superficie: nunca se usan como color de texto,
  // solo como swatch/relleno de barra, siempre con leyenda + valor visible al lado.
  const CATEGORICAL = ["#2a78d6", "#008300", "#e87ba4", "#eda100"];
  const ACCENT_BLUE = "#2a78d6";
  const GOOD_GREEN = "#006300";
  const CRITICAL_RED = "#d03b3b";
  const TREND_OPTIONS = [2, 3, 6, 12, 24];

  let mesesTendencia = 6;
  let mesesCustom = "";
  let mostrarDescuentoModal = false;

  $: canRegisterDiscount = ["ADMIN", "SUPERVISOR_OPERATIVO"].includes($auth?.currentUser?.role);

  $: dashboard = $data.fuelDashboard;
  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: galonesPorTipo = [...(dashboard?.galonesPorTipo ?? [])].sort((a, b) => a.fuelTypeId - b.fuelTypeId);

  $: gastoPorTipo = [...(dashboard?.gastoPorTipo ?? [])].sort((a, b) => a.fuelTypeId - b.fuelTypeId);
  $: galonesBombaPorTipo = dashboard?.galonesBombaPorTipo ?? [];


  $: combustibleRows = (() => {
    const ids = [...new Set([...galonesPorTipo.map((g) => g.fuelTypeId), ...gastoPorTipo.map((g) => g.fuelTypeId)])].sort((a, b) => a - b);
    return ids.map((id, i) => {
      const cantidad = Number(galonesPorTipo.find((g) => g.fuelTypeId === id)?.cantidad) || 0;
      const cantidadBomba = Number(galonesBombaPorTipo.find((g) => g.fuelTypeId === id)?.cantidad) || 0;
      const monto = Number(gastoPorTipo.find((g) => g.fuelTypeId === id)?.monto) || 0;
      const unidad = unidadMedidaById[id] === "M3" ? "m³" : "gal";
      return {
        fuelTypeId: id,
        nombre: fuelTypesById[id] ?? `Tipo #${id}`,
        cantidad,
        monto,
        unidad,
        color: colorFor(i),
        precioUnidadTexto: formatPrecioUnidad(monto, cantidadBomba, unidad),
      };
    });
  })();
  $: maxMontoCombustible = combustibleRows.length ? Math.max(...combustibleRows.map((r) => r.monto)) : 0;

  $: trend = $data.fuelTrend ?? [];
  $: trendMonthLabels = trend.map((t) => formatMesCorto(t.mes));
  $: trendGalones = trend.map((t) => Number(t.galonesTotal) || 0);
  $: trendGastoNeto = trend.map((t) => Number(t.gastoNeto) || 0);
  // t.mes es un LocalDate serializado (backend: "YYYY-MM-DD", día 1 de cada
  // mes) — se usa directo para que el eje X de FuelTrendChart quede proporcional
  // al tiempo real (mismo mecanismo que Historial de Rendimiento) en vez de
  // repartir los puntos por índice. Con meses consecutivos normalmente no se
  // nota, pero si el backend alguna vez devuelve un mes salteado (sin datos ese
  // mes), el hueco real queda reflejado en el gráfico en vez de verse desfasado
  // como si fuera continuo.
  $: trendTimestamps = trend.map((t) => new Date(t.mes).getTime());

  $: proyeccion = $data.fuelBudgetProjection ?? [];

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
    data.fetchFuelTrend(n, $fuelDateRange.fechaFin || undefined);
  }

  function applyCustomMeses() {
    const n = Number(mesesCustom);
    if (!Number.isInteger(n) || n <= 0) return;
    mesesTendencia = n;
    data.fetchFuelTrend(n, $fuelDateRange.fechaFin || undefined);
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
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPrecioUnidad(monto, cantidad, unidad) {
    if (!cantidad) return "—";
    const precio = monto / cantidad;
    const formateado = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(precio);
    return `${formateado}/${unidad}`;
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
    data.fetchFuelDashboard($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    data.fetchFuelTrend(mesesTendencia, $fuelDateRange.fechaFin || undefined);
    data.fetchFuelBudgetProjection($fuelDateRange.fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelDashboard($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    data.fetchFuelTrend(mesesTendencia, $fuelDateRange.fechaFin || undefined);
    data.fetchFuelBudgetProjection($fuelDateRange.fechaFin || undefined);
  }

  function handleLimpiarFiltro() {
    resetFuelDateRange();
    handleFiltrar();
  }

  function handleDescuentoRegistrado() {
    handleFiltrar();
    addNotification({ id: Date.now(), text: "Descuento registrado con éxito." });
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros">
    <label class="field" for="dashFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="dashFechaInicio" type="date" bind:value={$fuelDateRange.fechaInicio} />
    </label>
    <label class="field" for="dashFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="dashFechaFin" type="date" bind:value={$fuelDateRange.fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
    <button type="button" class="btn-clear-filter" on:click={handleLimpiarFiltro}>Limpiar filtro</button>
    {#if canRegisterDiscount}
      <button type="button" class="btn-filter btn-config" on:click={() => (mostrarDescuentoModal = true)}>+ Registrar descuento</button>
    {/if}
  </div>

  {#if mostrarDescuentoModal}
    <RegisterMonthlyDiscountModal
      on:close={() => (mostrarDescuentoModal = false)}
      on:saved={handleDescuentoRegistrado}
    />
  {/if}

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else if dashboard}
    <div class="kpi-card">
      <div class="kpi-section" style="--tile-accent: {ACCENT_BLUE}">
        <span class="kpi-label">Gasto neto del periodo</span>
        <span class="kpi-value kpi-value--primary">{formatCOP(dashboard.gastoNeto)}</span>
        {#if deltaGastoNeto}
          <span class="kpi-pill" style="background: {deltaGastoNeto.color}1a; color: {deltaGastoNeto.color}">{deltaGastoNeto.flecha} {deltaGastoNeto.texto}</span>
        {/if}
      </div>
      <div class="kpi-section">
        <span class="kpi-label">Gasto bruto</span>
        <span class="kpi-value  kpi-value--primary" >{formatCOP(dashboard.gastoBruto)}</span>
        {#if deltaGastoBruto}
          <span class="kpi-delta" style="color: {deltaGastoBruto.color}">{deltaGastoBruto.flecha} {deltaGastoBruto.texto}</span>
        {/if}
      </div>
      <div class="kpi-section">
        <span class="kpi-label">Ahorro por descuentos</span>
        <span class="kpi-value kpi-value--good  kpi-value--primary">{formatCOP(dashboard.ahorro)}</span>
        {#if deltaAhorro}
          <span class="kpi-delta" style="color: {deltaAhorro.color}">{deltaAhorro.flecha} {deltaAhorro.texto}</span>
        {/if}
        {#if dashboard.descuentoMensual > 0}
          <span class="kpi-hint">incluye {formatCOP(dashboard.descuentoMensual)} de descuento mensual registrado</span>
        {/if}
      </div>
      <div class="kpi-section">
        <span class="kpi-label">Discrepancias detectadas</span>
        <span class="kpi-value  kpi-value--primary" class:kpi-value--warning={dashboard.discrepancias > 0}>{dashboard.discrepancias}</span>
        <span class="kpi-hint">Ingresado ≠ calculado</span>
      </div>
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head">Combustible</div>
      {#if combustibleRows.length}
        <table class="combustible-table">
          <thead>
            <tr>
              <th>Combustible</th>
              <th>Precio/unidad</th>
              <th>Cantidad</th>
              <th>Gasto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each combustibleRows as row}
              <tr>
                <td class="td-combustible">
                  <span class="combustible-name">
                    <span class="legend-swatch" style="background: {row.color}"></span>
                    <span>{row.nombre}</span>
                  </span>
                </td>
                <td>{row.precioUnidadTexto}</td>
                <td>{formatCantidad(row.cantidad, row.unidad)}</td>
                <td class="td-gasto">{formatCOP(row.monto)}</td>
                <td class="td-bar">
                  <div class="bar-track">
                    <div
                      class="bar-fill"
                      style="width: {maxMontoCombustible > 0 ? (row.monto / maxMontoCombustible) * 100 : 0}%; background: {row.color}"
                    ></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="no-data">Sin datos en el rango seleccionado.</p>
      {/if}
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
          timestamps={trendTimestamps}
          color={ACCENT_BLUE}
          formatValue={formatCantidad}
        />
        <FuelTrendChart
          label="Gasto neto mensual"
          months={trendMonthLabels}
          values={trendGastoNeto}
          timestamps={trendTimestamps}
          color={GOOD_GREEN}
          formatValue={formatCOP}
        />
      </div>
    </div>

    {#if proyeccion.length > 0}
      <div class="fuel-chart">
        <div class="fuel-chart-head">Proyección presupuestal (estimado)</div>
        <p class="proyeccion-disclaimer">
          Estimación basada en el promedio de los últimos meses con actividad real —
          no es un valor garantizado.
        </p>
        <table class="proyeccion-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Gasto neto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each proyeccion as fila}
              <tr class:proyeccion-fila--proyectada={fila.proyectado}>
                <td>{formatMesCorto(fila.mes)}</td>
                <td class="td-gasto">{formatCOP(fila.gastoNeto)}</td>
                <td>
                  <span class="proyeccion-badge" class:proyeccion-badge--proyectado={fila.proyectado}>
                    {fila.proyectado ? "Proyectado" : "Histórico"}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

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
    /* overflow-y sin overflow-x explícito hace que el navegador calcule
       overflow-x en automático también (spec de CSS) — se fija en "hidden"
       para que esta caja nunca scrollee horizontal con su propia barra nativa
       (mismo ajuste aplicado en FuelPerformanceHistory.svelte). */
    overflow-x: hidden;
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
    font-family: inherit;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    background: var(--surface);
    color: var(--ink);
  }
  .field input:focus {
    outline: 2px solid #86b6ef;
    outline-offset: 1px;
  }
  .btn-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-config {
    background: #52514e;
    margin-left: auto;
  }
  .btn-config:hover {
    background: #3d3c3a;
  }
  .btn-clear-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #fff;
    color: #52514e;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
  }
  .btn-clear-filter:hover {
    background: #f5f6f8;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  /* Tarjeta KPI única con divisores verticales — la sección "Gasto neto"
     (primary) es más ancha y lleva el acento de color + badge de tendencia;
     las otras 3 son planas, sin color por sección (ver mockup de diseño). */
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
    display: flex;
    flex-wrap: wrap;
    overflow: hidden;
    /* .fuel-dashboard es un flex column con scroll propio (overflow-y: auto):
       sin flex-shrink:0, cualquier hijo con overflow != visible (como este,
       para recortar las esquinas redondeadas) calcula su min-height
       automático como 0 en vez de basarse en su contenido, así que en cuanto
       el contenido total de la página no cabe en el viewport, el navegador
       lo comprime a casi 0px en vez de dejar que el contenedor scrollee. */
    flex-shrink: 0;
  }
  .kpi-section {
    flex: 1;
    min-width: 160px;
    padding: 20px 22px;
    border-left: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .kpi-section:first-child {
    border-left: none;
  }
  .kpi-section--primary {
    flex: 1.4;
    min-width: 220px;
    border-left: 4px solid var(--tile-accent, #2a78d6);
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .kpi-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .kpi-value--primary {
    font-size: 34px;
  }
  .kpi-value--good {
    color: #006300;
  }
  .kpi-value--warning {
    color: #c98500;
  }
  .kpi-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .kpi-delta {
    font-size: 11px;
    font-weight: 500;
  }
  .kpi-hint {
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
    font-family: inherit;
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
    font-family: inherit;
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
    flex-shrink: 0;
  }
  .fuel-chart-head {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    color: var(--ink);
  }
  .legend-swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .combustible-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .combustible-table thead tr {
    text-align: left;
    color: var(--ink-secondary);
    border-bottom: 1px solid #eee;
  }
  .combustible-table th {
    padding: 6px 8px;
    font-weight: 600;
  }
  .combustible-table td {
    padding: 10px 8px;
    border-top: 1px solid #f0f0ef;
    color: var(--ink-secondary);
  }
  .combustible-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .td-combustible {
    font-weight: 600;
    color: var(--ink);
  }
  .td-gasto {
    font-weight: 700;
    color: var(--ink);
  }
  .td-bar {
    width: 36%;
  }
  .bar-track {
    background: #eef0f2;
    border-radius: 8px;
    height: 10px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 8px;
    transition: width 0.2s ease;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }

  .proyeccion-disclaimer {
    color: var(--ink-muted);
    font-size: 11.5px;
    margin: -6px 0 12px;
  }
  .proyeccion-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .proyeccion-table thead tr {
    text-align: left;
    color: var(--ink-secondary);
    border-bottom: 1px solid #eee;
  }
  .proyeccion-table th {
    padding: 6px 8px;
    font-weight: 600;
  }
  .proyeccion-table td {
    padding: 10px 8px;
    border-top: 1px solid #f0f0ef;
    color: var(--ink-secondary);
  }
  .proyeccion-fila--proyectada {
    background: rgba(42, 120, 214, 0.05);
  }
  .proyeccion-badge {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--ink-muted);
  }
  .proyeccion-badge--proyectado {
    border: 1px dashed #2a78d6;
    color: #2a78d6;
    background: rgba(42, 120, 214, 0.08);
  }
</style>
