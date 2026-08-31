<script>
  import { onMount } from "svelte";
  import { push, pop } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { download } from "../../stores/api.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import RefuelingFormModal from "../shared/RefuelingFormModal.svelte";
  import AssetFuelConfigQuickModal from "../shared/AssetFuelConfigQuickModal.svelte";
  import FuelTrendChart from "./FuelTrendChart.svelte";
  import { createFuelPerformanceColumns } from "../../config/table-definitions.js";

  const ACCENT_BLUE = "#2a78d6";
  // Rango "todo el histórico": el backend de Rendimiento asume el mes actual si
  // las fechas vienen vacías (útil para el reporte normal, no para un historial
  // completo por activo), así que acá se fuerza un rango amplio explícito. Esto
  // siempre trae TODO — el selector de abajo (RANGOS) es un filtro 100%
  // client-side sobre lo ya cargado, sin pedir de nuevo al backend por cada click.
  const FECHA_INICIO_HISTORICO = "2000-01-01";

  const TIPO_LABEL = { MAQUINARIA: "Maquinaria", VEHICULO: "Vehículos", MOTOCICLETA: "Motocicletas" };

  // Selector de rango estilo "gráfico de acciones" (1M/3M/6M/1A/Todo) — a
  // diferencia de un stock, un activo no tanquea varias veces al día, así que no
  // tienen sentido presets tipo "1D"/"5D"; el nivel más fino útil acá es "1M".
  const RANGOS = [
    { key: "1M", label: "1M", dias: 30 },
    { key: "3M", label: "3M", dias: 90 },
    { key: "6M", label: "6M", dias: 180 },
    { key: "1A", label: "1A", dias: 365 },
    { key: "TODO", label: "Todo", dias: null },
  ];
  let rangoSeleccionado = "1M";
  let histQ = "";

  export let params = {};

  $: tipoElemento = (params.tipoElemento || "MAQUINARIA").toUpperCase();
  $: activoId = Number(params.id);

  $: isLoading = $data.isLoading;
  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: fuelAssetConfig = $data.fuelAssetConfig ?? [];
  $: unidadPorVehicleId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.vehicleId != null).map((c) => [c.vehicleId, unidadMedidaById[c.fuelTypeDefaultId]])
  );
  $: unidadPorMachineId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.machineId != null).map((c) => [c.machineId, unidadMedidaById[c.fuelTypeDefaultId]])
  );
  function unidadDe(row) {
    const unidad = row.machineId != null ? unidadPorMachineId[row.machineId] : unidadPorVehicleId[row.vehicleId];
    return unidad === "M3" ? "m³" : "gal";
  }

  // Unidad de RENDIMIENTO del consumo estándar (KM_POR_GALON, HORA_POR_GALON, ...) — distinta
  // de unidadPorVehicleId/MachineId de arriba, que es la unidad física del
  // combustible (gal/m³), no la de la columna "Consumo estándar".
  $: unidadConsumoPorVehicleId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.vehicleId != null).map((c) => [c.vehicleId, c.unidadConsumo])
  );
  $: unidadConsumoPorMachineId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.machineId != null).map((c) => [c.machineId, c.unidadConsumo])
  );
  function unidadConsumoDe(row) {
    return row.machineId != null ? unidadConsumoPorMachineId[row.machineId] : unidadConsumoPorVehicleId[row.vehicleId];
  }

  // Tamaño de tanque configurado del activo — no viene en el reporte de
  // rendimiento (es dato de configuración, no del tanqueo), se une acá igual que
  // unidadLabel/unidadConsumo.
  $: tanqueCapacidadPorVehicleId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.vehicleId != null).map((c) => [c.vehicleId, c.tanqueCapacidadGal])
  );
  $: tanqueCapacidadPorMachineId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.machineId != null).map((c) => [c.machineId, c.tanqueCapacidadGal])
  );
  function tanqueCapacidadDe(row) {
    return row.machineId != null ? tanqueCapacidadPorMachineId[row.machineId] : tanqueCapacidadPorVehicleId[row.vehicleId];
  }

  // Config actual del activo abierto (precarga del modal "Ajustar estándar").
  $: currentConfig =
    fuelAssetConfig.find((c) => (tipoElemento === "MAQUINARIA" ? c.machineId === activoId : c.vehicleId === activoId)) ?? null;

  $: columns = createFuelPerformanceColumns(fuelTypesById, isAdmin, false, tipoElemento === "MAQUINARIA");

  // Clave de store separada de la lista (fuelPerformance) a propósito — ver
  // fetchFuelPerformanceHistory: evita el parpadeo de pintar primero con las
  // filas del rango angosto que había dejado la lista.
  $: rowsPorTipo = $data.fuelPerformanceHistory ?? { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] };
  $: filas = (rowsPorTipo[tipoElemento] ?? [])
    .filter((r) => (tipoElemento === "MAQUINARIA" ? r.machineId === activoId : r.vehicleId === activoId))
    .map((row) => ({
      ...row,
      isAnomaly: row.alerta,
      unidadLabel: unidadDe(row),
      unidadConsumo: unidadConsumoDe(row),
      tanqueCapacidadGal: tanqueCapacidadDe(row),
    }))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  $: activoLabel = filas[0]?.identificacionActivo
    ?? (tipoElemento === "MAQUINARIA" ? `Máquina #${activoId}` : `Vehículo #${activoId}`);

  // ---- Anterior / Siguiente: cicla entre los activos del mismo tipo, orden
  // alfabético estable (no depende del filtro/búsqueda que tenía la lista al
  // hacer clic, ni del orden de llegada del backend).
  $: activosMismoTipo = Object.values(
    (rowsPorTipo[tipoElemento] ?? []).reduce((acc, r) => {
      const id = tipoElemento === "MAQUINARIA" ? r.machineId : r.vehicleId;
      if (id != null && !acc[id]) acc[id] = { id, nombre: r.identificacionActivo ?? `#${id}` };
      return acc;
    }, {})
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  $: indiceActual = activosMismoTipo.findIndex((a) => a.id === activoId);

  function irAAdyacente(offset) {
    if (activosMismoTipo.length === 0 || indiceActual === -1) return;
    const i = (indiceActual + offset + activosMismoTipo.length) % activosMismoTipo.length;
    histQ = "";
    push(`/fuel-performance-history/${tipoElemento}/${activosMismoTipo[i].id}`);
  }

  // Filtro client-side por el rango elegido (filas ya viene ordenada desc por
  // fecha) — "Todo" no filtra nada, es el estado por defecto.
  $: rangoDias = RANGOS.find((r) => r.key === rangoSeleccionado)?.dias ?? null;
  $: limiteInferior = rangoDias != null ? new Date(Date.now() - rangoDias * 24 * 60 * 60 * 1000) : null;
  $: filasVisibles = limiteInferior ? filas.filter((f) => new Date(f.fechaRegistro) >= limiteInferior) : filas;

  // Filtro adicional por texto de fecha sobre la tabla (no afecta los KPIs ni los
  // totales del periodo, que siguen reflejando todo el rango elegido arriba —
  // mismo criterio que el mockup: el buscador solo acota qué filas se listan).
  $: histQLower = histQ.trim().toLowerCase();
  $: filasTabla = histQLower ? filasVisibles.filter((r) => formatFecha(r.fechaRegistro).toLowerCase().includes(histQLower)) : filasVisibles;

  // Paginación 100% client-side (el historial completo del activo ya está
  // cargado de una vez, sin paginar en el backend) — el activo solo va a
  // acumular más tanqueos con el tiempo, así que no se puede renderizar todo el
  // historial sin recortar. Mismo patrón que TanqueoDistribucion.svelte
  // (resumenPageRows): se recorta lo que se le pasa al DataGrid, no lo que se
  // pide al backend.
  let histPage = 0;
  let histPageSize = 20;
  // Cualquier cambio que altere qué filas caen en filasTabla (rango elegido o
  // filtro de fecha) vuelve a la página 1 — si no, se podría quedar "atascado"
  // en una página que ya no existe para el nuevo filtro.
  $: {
    rangoSeleccionado;
    histQ;
    histPage = 0;
  }
  $: histTotalPages = Math.max(1, Math.ceil(filasTabla.length / histPageSize));
  $: filasPagina = filasTabla.slice(histPage * histPageSize, (histPage + 1) * histPageSize);

  function handleHistPageChange(event) {
    histPage = event.detail;
  }
  function handleHistSizeChange(event) {
    histPageSize = event.detail;
    histPage = 0;
  }

  $: totalAlertas = filasVisibles.filter((f) => f.alerta).length;
  $: ultimaFecha = filasVisibles[0]?.fechaRegistro ?? null;

  // ---- Modelo de rendimiento (mismo que la tabla, ver createFuelPerformanceColumns) ----
  // H (esperado) = galones tanqueados × consumo estándar. D (ejecutado) ya viene
  // calculado del backend. La eficiencia del periodo se agrega como
  // total-ejecutado / total-esperado (no como promedio simple de porcentajes por
  // fila) para que un tanqueo grande pese más que uno chico, igual que si fuera
  // un solo tanqueo consolidado.
  function esperadoDeFila(row) {
    return (Number(row.galonesReal) || 0) * (Number(row.consumoEstandar) || 0);
  }
  $: totalEsperado = filasVisibles.reduce((acc, r) => acc + esperadoDeFila(r), 0);
  $: totalEjecutado = filasVisibles.reduce((acc, r) => acc + (Number(r.ejecutado) || 0), 0);
  $: totalDiferencia = totalEjecutado - totalEsperado;
  $: eficienciaProm = totalEsperado > 0 ? (totalEjecutado / totalEsperado) * 100 : null;

  const fmt2 = (n) => new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  const fmtDif = (n, unidad) => `${n >= 0 ? "+" : "−"}${fmt2(Math.abs(n))} ${unidad}`;

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  const MES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  // Etiqueta de dos líneas que se adapta al rango total de fechas del activo —
  // este historial solo va a crecer (empieza en "el mes en curso" pero con el
  // tiempo puede llegar a 12 meses, varios años), así que el nivel de detalle
  // tiene que bajar a medida que el rango crece, o las etiquetas se vuelven
  // ilegibles o dejan de tener sentido (mostrar el día exacto ya no importa
  // tanto si se están comparando años completos):
  //  - rango ≤ ~1 año: día arriba, mes abreviado abajo (ej. "05" / "ago") — el
  //    día sigue siendo el dato útil dentro de un mismo año.
  //  - rango > ~1 año: mes abreviado arriba, año abajo (ej. "ago" / "2026") —
  //    con varios años de por medio, el año es el dato que más falta y el día
  //    exacto deja de aportar a esa escala.
  function formatEtiquetaAdaptativa(fechaIso, rangoMayorAUnAnio) {
    const d = new Date(fechaIso);
    const mes = MES_ABREV[d.getMonth()];
    return rangoMayorAUnAnio
      ? `${mes}\n${d.getFullYear()}`
      : `${String(d.getDate()).padStart(2, "0")}\n${mes}`;
  }

  // El gráfico se lee de izquierda (más viejo) a derecha (más nuevo) — orden
  // contrario al de la tabla, que muestra lo más reciente arriba. Usa
  // filasVisibles (respeta el selector de rango 1M/3M/6M/1A/Todo).
  $: filasCronologicas = [...filasVisibles].reverse();
  // Unidad de EJECUCIÓN (h/km), no la física del combustible (gal/m³) — el
  // gráfico ahora compara horas/km esperados vs. ejecutados, no galones.
  $: unidadEje = tipoElemento === "MAQUINARIA" ? "h" : "km";
  $: labelEjec = tipoElemento === "MAQUINARIA" ? "Horas" : "Km";
  $: rangoMayorAUnAnio = filasCronologicas.length > 1 &&
    (new Date(filasCronologicas[filasCronologicas.length - 1].fechaRegistro) - new Date(filasCronologicas[0].fechaRegistro)) > 366 * 24 * 60 * 60 * 1000;
  $: chartMonths = filasCronologicas.map((f) => formatEtiquetaAdaptativa(f.fechaRegistro, rangoMayorAUnAnio));
  $: chartTimestamps = filasCronologicas.map((f) => f.fechaRegistro);
  $: chartEsperado = filasCronologicas.map((f) => esperadoDeFila(f));
  $: chartEjecutado = filasCronologicas.map((f) => Number(f.ejecutado) || 0);

  function loadHistory() {
    data.fetchFuelPerformanceHistory(FECHA_INICIO_HISTORICO, new Date().toISOString().slice(0, 10));
  }

  // Exporta TODO el histórico del activo (no el rango 1M/3M/6M/1A/Todo elegido
  // arriba) — la separación por hoja/mes ya da el desglose temporal, así que
  // acotar además por el pill del selector solo recortaría meses del archivo sin
  // aportar nada.
  let isExportingExcel = false;
  async function handleExportarExcel() {
    isExportingExcel = true;
    try {
      const params = new URLSearchParams({ tipo: tipoElemento, activoId: String(activoId) });
      const nombreArchivo = `rendimiento_${activoLabel.replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
      await download(`fuel/rendimiento/export?${params.toString()}`, nombreArchivo);
    } catch (err) {
      addNotification({ id: Date.now(), text: `No se pudo exportar el historial: ${err.message}` });
    } finally {
      isExportingExcel = false;
    }
  }

  let _lastKey = "";
  $: if (`${tipoElemento}:${activoId}` !== _lastKey) {
    _lastKey = `${tipoElemento}:${activoId}`;
    histPage = 0;
    loadHistory();
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
  });

  // ---- Editar un tanqueo desde el historial ----
  // Pide el tanqueo puntual por id (fetchRefuelingRecordById) en vez de todo el
  // reporte del tipo de activo — antes esto traía TODO el historial de
  // Vehículos o de Maquinaria+Motos (sin límite de fecha) solo para sacar un
  // registro, y encima usaba el loading GLOBAL ($data.isLoading), que tapa toda
  // la pantalla (ver {#if isLoading} más abajo) mientras esa consulta pesada
  // resolvía — al usuario le parecía que la pantalla completa "se quedaba
  // cargando" en vez de ver el modal. editModalLoading es un loading propio del
  // modal, no comparte el flag de la página.
  let editingRow = null;
  let showEditModal = false;
  let editModalLoading = false;

  async function openEditModal(row) {
    editModalLoading = true;
    try {
      editingRow = await data.fetchRefuelingRecordById(row.refuelingId);
      showEditModal = true;
    } catch (err) {
      addNotification({ id: Date.now(), text: "No se pudo cargar el tanqueo para editar. Intenta de nuevo." });
    } finally {
      editModalLoading = false;
    }
  }

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") openEditModal(row);
  }

  // ---- Ajustar consumo estándar del activo ----
  let showCfgModal = false;
</script>

<div class="perf-history">
  <div class="ph-breadcrumb">
    <button type="button" class="ph-breadcrumb-link" on:click={() => pop()}>Rendimiento</button>
    <span>/</span>
    <span>{TIPO_LABEL[tipoElemento] ?? tipoElemento}</span>
    <span>/</span>
    <span class="ph-breadcrumb-current">{activoLabel}</span>
  </div>

  <div class="ph-toolbar">
    <button type="button" class="btn-cancel" on:click={() => pop()}>← Volver</button>
    <h2 class="ph-title">
      Historial de rendimiento
      <span class="ph-badge" style="background: {ACCENT_BLUE}1a; color: {ACCENT_BLUE}">{activoLabel}</span>
    </h2>
    <div class="ph-actions">
      <button type="button" class="btn-secondary" on:click={() => (showCfgModal = true)}>Ajustar estándar</button>
      <button type="button" class="btn-secondary" on:click={() => irAAdyacente(-1)} disabled={activosMismoTipo.length < 2}>‹ Anterior</button>
      <button type="button" class="btn-secondary" on:click={() => irAAdyacente(1)} disabled={activosMismoTipo.length < 2}>Siguiente ›</button>
      <button type="button" class="btn-export" on:click={handleExportarExcel} disabled={isExportingExcel || filas.length === 0}>
        {isExportingExcel ? "Descargando..." : "Exportar Excel"}
      </button>
      <button type="button" class="btn-filter" on:click={loadHistory} disabled={isLoading}>
        {isLoading ? "Cargando..." : "Refrescar"}
      </button>
    </div>
  </div>

  {#if !isLoading && filas.length > 0}
    <div class="ph-rangos">
      {#each RANGOS as r}
        <button
          type="button"
          class="rango-pill"
          class:rango-pill--active={rangoSeleccionado === r.key}
          on:click={() => (rangoSeleccionado = r.key)}
        >
          {r.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if !isLoading}
    <div class="ph-summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{filasVisibles.length}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último tanqueo</span>
        <span class="summary-value">{formatFecha(ultimaFecha)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Eficiencia promedio</span>
        <span class="summary-value">{eficienciaProm != null ? `${fmt2(eficienciaProm)}%` : "—"}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Con alerta</span>
        <span class="summary-value">{totalAlertas} / {filasVisibles.length}</span>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="ph-loader">
      <Loader />
    </div>
  {:else if filas.length === 0}
    <p class="no-data">Sin historial de rendimiento para este activo (falta línea base o consumo estándar configurado).</p>
  {:else if filasVisibles.length === 0}
    <p class="no-data">Sin tanqueos en el rango seleccionado ({RANGOS.find((r) => r.key === rangoSeleccionado)?.label}). Prueba con "Todo".</p>
  {:else}
    <div class="ph-chart">
      <FuelTrendChart
        label="{labelEjec} esperadas por el combustible (H)"
        color="#2a78d6"
        label2="{labelEjec} ejecutadas (D = C−B)"
        color2="#e67e22"
        months={chartMonths}
        values={chartEsperado}
        values2={chartEjecutado}
        timestamps={chartTimestamps}
        formatValue={(v) => `${fmt2(v)} ${unidadEje}`}
        formatValue2={(v) => `${fmt2(v)} ${unidadEje}`}
      />
    </div>

    <div class="ph-table">
      <div class="ph-table-head">
        <div class="ph-table-title">
          Historial detallado
          {#if editModalLoading}<span class="ph-table-title-loading">— cargando tanqueo…</span>{/if}
        </div>
        <input type="text" bind:value={histQ} placeholder="Filtrar por fecha..." class="ph-table-search" />
      </div>
      {#if filasTabla.length}
        <DataGrid
          {columns}
          data={filasPagina}
          totalElements={filasTabla.length}
          totalPages={histTotalPages}
          currentPage={histPage}
          pageSize={histPageSize}
          showDeleteButton={false}
          variant="modern"
          on:action={handleGridAction}
          on:pageChange={handleHistPageChange}
          on:sizeChange={handleHistSizeChange}
        />
      {:else}
        <p class="no-data">Sin registros para ese filtro.</p>
      {/if}
      <div class="ph-totales">
        <span class="ph-totales-label">Total del periodo</span>
        <span>{labelEjec} esperadas: <strong>{fmt2(totalEsperado)} {unidadEje}</strong></span>
        <span>{labelEjec} ejecutadas: <strong>{fmt2(totalEjecutado)} {unidadEje}</strong></span>
        <span>Diferencia: <strong>{fmtDif(totalDiferencia, unidadEje)}</strong></span>
        <span>Eficiencia: <strong>{eficienciaProm != null ? `${fmt2(eficienciaProm)}%` : "—"}</strong></span>
      </div>
    </div>
  {/if}
</div>

{#if showEditModal}
  <RefuelingFormModal
    initialRow={editingRow}
    assetEditable={false}
    titleSuffix={activoLabel}
    {fuelTypes}
    onSubmit={(fd) => data.updateRefueling(editingRow.id, fd)}
    on:success={() => {
      showEditModal = false;
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      loadHistory();
    }}
    on:close={() => (showEditModal = false)}
  />
{/if}

{#if showCfgModal}
  <AssetFuelConfigQuickModal
    {tipoElemento}
    {activoId}
    {activoLabel}
    {fuelTypes}
    {currentConfig}
    on:success={() => {
      showCfgModal = false;
      addNotification({ id: Date.now(), text: "Consumo estándar actualizado." });
      data.fetchAssetFuelConfig();
      loadHistory();
    }}
    on:close={() => (showCfgModal = false)}
  />
{/if}

<style>
  .perf-history {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
       --row-border: rgba(11, 11, 11, 0.453);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    /* Sin esto, `overflow-y: auto` sin un overflow-x explícito hace que el
       navegador calcule overflow-x en automático también (regla del spec de
       CSS) — con una tabla ancha adentro (14 columnas en Historial de
       Rendimiento), esta caja terminaba siendo la que scrollea horizontal,
       con la scrollbar nativa del SO (gruesa, con flechas) en vez de la
       delgada que ya tiene .table-container del DataGrid. El scroll horizontal
       real debe quedar contenido ahí adentro, no acá. */
    overflow-x: hidden;
  }
  .ph-breadcrumb {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--ink-muted);
    margin-bottom: -8px;
  }
  .ph-breadcrumb-link {
    font-family: inherit;
    background: none;
    border: none;
    padding: 0;
    color: #2a78d6;
    font-weight: 600;
    font-size: 11px;
    cursor: pointer;
  }
  .ph-breadcrumb-current {
    color: var(--ink-secondary);
    font-weight: 600;
  }
  .ph-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .ph-title {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ph-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .ph-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ph-rangos {
    display: flex;
    gap: 6px;
  }
  .rango-pill {
    font-family: inherit;
    background: rgba(42, 120, 214, 0.1);
    color: #2a78d6;
    border: none;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .rango-pill:hover {
    background: rgba(42, 120, 214, 0.18);
  }
  .rango-pill--active {
    background: #2a78d6;
    color: #fff;
  }
  .ph-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    min-width: 150px;
  }
  .summary-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-muted);
  }
  .summary-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }
  .ph-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .ph-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 12px 14px;
  }
  .ph-table {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
    /* Deja que .table-container (adentro del DataGrid) sea quien realmente
       recorta/scrollea la tabla ancha — sin min-width:0 acá, este div (hijo de
       un flex column) no se encoge por debajo del ancho intrínseco de su
       contenido y el overflow se escapa hacia .perf-history. */
    min-width: 0;
  }
  .ph-table-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .ph-table-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
  }
  .ph-table-title-loading {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-muted);
    margin-left: 6px;
  }
  .ph-table-search {
    font-family: inherit;
    font-size: 12px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    min-width: 200px;
    background: var(--surface);
    color: var(--ink);
  }
  .ph-totales {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: baseline;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 2px solid #e4e5e7;
    font-size: 12px;
    color: var(--ink-secondary);
  }
  .ph-totales-label {
    font-weight: 700;
    color: var(--ink);
  }
  /*
   * Las filas viven dentro de DataGrid.svelte (otro componente). Cambiar --border
   * arriba NO las afecta: allí el separador está fijado como #f0f0ef. Estos
   * :global() apuntan al tbody del grid hijo; !important gana sobre el estilo
   * scoped del DataGrid cuando la especificidad empata.
   */
  .ph-table :global(.data-grid-wrapper.modern .data-grid tbody tr td) {
    border-bottom: 1px solid var(--row-border) !important;
  }
  .ph-table :global(.data-grid-wrapper.modern .data-grid thead th) {
    border-bottom: 1px solid var(--row-border) !important;
  }
  .ph-table :global(.data-grid-wrapper.modern .data-grid tbody tr:nth-child(even) td) {
    background-color: #f3f4f6;
  }
  .ph-table :global(.data-grid-wrapper.modern .data-grid tbody tr:hover td) {
    background-color: #eef4fc;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
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
    white-space: nowrap;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-filter:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-export {
    font-family: inherit;
    padding: 9px 20px;
    background: #2e7d32;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
    white-space: nowrap;
  }
  .btn-export:hover {
    background: #256428;
  }
  .btn-export:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-secondary {
    font-family: inherit;
    background: #fff;
    color: #52514e;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 999px;
    padding: 9px 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    height: 34px;
    white-space: nowrap;
  }
  .btn-secondary:hover {
    background: #f5f6f8;
  }
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-cancel {
    font-family: inherit;
    background: #f0f0ef;
    color: #52514e;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-cancel:hover {
    background: #e4e4e2;
  }
</style>
