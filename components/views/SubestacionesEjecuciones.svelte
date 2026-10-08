<script>
  import { onMount, onDestroy } from "svelte";
  import { data } from "../../stores/data.js";
  import { addNotification } from "../../stores/ui.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import SubestacionEjecucionDetalleModal from "../shared/SubestacionEjecucionDetalleModal.svelte";
  import { createEjecucionesColumns } from "../../config/table-definitions/substation.js";
  import { get } from "svelte/store";
  import { ejecucionesFiltroInicial, disciplinaFiltro } from "../../stores/subestacionesFilters.js";
  import { disciplinaLabel } from "../../config/subestaciones.js";
  import { alCambiarEjecuciones } from "../../stores/subestacionesEventos.js";
  import { IMPREVISTO } from "../../utils/cronograma.js";
  import SelectorDisciplina from "./subestaciones/SelectorDisciplina.svelte";

  /** Imprevistos (sin cita del cronograma): fila en terracota suave para verlos de un vistazo. */
  const claseFila = (r) => (r.esProgramada === false ? "fila-imprevisto" : "");

  const TIPOS_MANTENIMIENTO = [
    { value: "PREVENTIVO", label: "Preventivo" },
    { value: "CORRECTIVO", label: "Correctivo" },
    { value: "PREDICTIVO", label: "Predictivo" },
    { value: "NO_PROGRAMADO", label: "No programado" },
  ];
  // Civil no usa "OTRO" en tipo_actividad (decisión de negocio, ver
  // docs/design/subestaciones-design-brief.md §5.1) — solo estos 3.
  const TIPOS_ACTIVIDAD = [
    { value: "INSPECCION", label: "Inspección" },
    { value: "MANTENIMIENTO", label: "Mantenimiento" },
    { value: "NO_PROGRAMADO", label: "No programado" },
  ];
  const RESULTADOS = [
    { value: "CONFORME", label: "Conforme" },
    { value: "CON_HALLAZGOS", label: "Con hallazgos" },
    { value: "REQUIERE_INTERVENCION", label: "Requiere intervención" },
  ];
  const HALLAZGOS_PRESET = ["CON_HALLAZGOS", "REQUIERE_INTERVENCION"];

  function filtrosVacios() {
    return {
      estacionId: "",
      actividadId: "",
      tipoMantenimiento: "",
      tipoActividad: "",
      resultado: "",
      esProgramada: "",
      fechaInicio: "",
      fechaFin: "",
    };
  }

  let filtros = filtrosVacios();
  // Llegando desde el Cronograma ("Ver ejecuciones de este mes →"): estación + rango del mes.
  // Desde el Detalle por estación también puede venir esProgramada=false (fuera de cronograma).
  const filtroInicial = get(ejecucionesFiltroInicial);
  if (filtroInicial) {
    filtros = {
      ...filtros,
      estacionId: filtroInicial.estacionId ?? "",
      actividadId: filtroInicial.actividadId ?? "",
      esProgramada: filtroInicial.esProgramada != null ? String(filtroInicial.esProgramada) : "",
      fechaInicio: filtroInicial.fechaInicio ?? "",
      fechaFin: filtroInicial.fechaFin ?? "",
    };
    ejecucionesFiltroInicial.set(null);
  }
  let pageSize = 20;

  $: isLoading = $data.isLoading;
  $: estaciones = $data.substationEstaciones ?? [];
  $: actividades = ($data.substationActividades ?? []).filter((a) => !$disciplinaFiltro || a.disciplina === $disciplinaFiltro);
  $: pagina = $data.substationEjecuciones ?? { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 };
  $: columns = createEjecucionesColumns();
  $: soloHallazgosActivo = filtros.resultado === HALLAZGOS_PRESET.join(",");
  // "Solo imprevistos" es el mismo filtro Origen = Imprevisto: el botón y el select quedan sincronizados.
  $: soloImprevistosActivo = filtros.esProgramada === "false";

  function filtrosParaFetch() {
    return {
      estacionId: filtros.estacionId || undefined,
      actividadId: filtros.actividadId || undefined,
      tipoMantenimiento: filtros.tipoMantenimiento || undefined,
      tipoActividad: filtros.tipoActividad || undefined,
      resultado: filtros.resultado ? filtros.resultado.split(",") : undefined,
      esProgramada: filtros.esProgramada === "" ? undefined : filtros.esProgramada === "true",
      fechaInicio: filtros.fechaInicio || undefined,
      fechaFin: filtros.fechaFin || undefined,
      // La disciplina es la misma de las otras pestañas (Dashboard, Resumen, Cronograma).
      disciplina: $disciplinaFiltro || undefined,
    };
  }

  function cambiarDisciplina() {
    // Una actividad de otra disciplina ya no aplica.
    const disc = get(disciplinaFiltro);
    const act = ($data.substationActividades ?? []).find((a) => String(a.id) === String(filtros.actividadId));
    if (act && disc && act.disciplina !== disc) filtros.actividadId = "";
    cargar(0);
  }

  function cargar(page = 0) {
    data.fetchSubstationEjecuciones(page, pageSize, filtrosParaFetch());
  }

  function handleFiltrar() {
    cargar(0);
  }

  function handleLimpiarFiltro() {
    filtros = filtrosVacios();
    cargar(0);
  }

  function toggleSoloHallazgos() {
    filtros = { ...filtros, resultado: soloHallazgosActivo ? "" : HALLAZGOS_PRESET.join(",") };
    cargar(0);
  }

  function toggleSoloImprevistos() {
    filtros = { ...filtros, esProgramada: soloImprevistosActivo ? "" : "false" };
    cargar(0);
  }

  function handlePageChange(event) {
    cargar(event.detail);
  }

  function handleSizeChange(event) {
    pageSize = event.detail;
    cargar(0);
  }

  // ---- Modal de detalle ----
  let detalle = null;
  let detalleLoading = false;
  let mostrarDetalle = false;

  async function abrirDetalle(row) {
    mostrarDetalle = true;
    detalleLoading = true;
    detalle = null;
    try {
      detalle = await data.fetchSubstationEjecucion(row.id);
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "Error al cargar el detalle de la ejecución." });
      mostrarDetalle = false;
    } finally {
      detalleLoading = false;
    }
  }

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === "verDetalle") abrirDetalle(row);
  }

  // Llegó una ejecución del móvil (WebSocket): se recarga la página actual con los mismos filtros.
  onDestroy(alCambiarEjecuciones(() => cargar(pagina.currentPage ?? 0)));

  onMount(() => {
    if (!estaciones.length) data.fetchSubstationEstaciones();
    if (!actividades.length) data.fetchSubstationActividades();
    cargar(0);
  });
</script>

<div class="ejecuciones" style="--imp-c:{IMPREVISTO.c};--imp-fila:{IMPREVISTO.fila}">
  <div class="cabeza">
    <div>
      <h1 class="titulo">Ejecuciones y hallazgos</h1>
      <p class="subtitulo">
        {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} · todo lo que se registró en las
        estaciones, lo más reciente primero. Las filas en terracota son imprevistos (trabajos sin cita del cronograma).
        "Ver detalle" muestra las fotos y el hallazgo.
      </p>
    </div>
    <SelectorDisciplina on:change={cambiarDisciplina} />
  </div>
  <div class="filter-card">
    <div class="chip-row">
      <label class="filter-chip">
        <span class="chip-lab">Estación</span>
        <select bind:value={filtros.estacionId}>
          <option value="">Todas</option>
          {#each estaciones as e}
            <option value={e.id}>{e.nombre}</option>
          {/each}
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Actividad</span>
        <select bind:value={filtros.actividadId}>
          <option value="">Todas</option>
          {#each actividades as a}
            <option value={a.id}>{disciplinaLabel(a.disciplina)} · {a.nombre}</option>
          {/each}
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Resultado</span>
        <select bind:value={filtros.resultado}>
          <option value="">Todos</option>
          {#each RESULTADOS as r}
            <option value={r.value}>{r.label}</option>
          {/each}
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Origen</span>
        <select bind:value={filtros.esProgramada}>
          <option value="">Todos</option>
          <option value="true">Cronograma</option>
          <option value="false">Imprevisto</option>
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Tipo de mantenimiento</span>
        <select bind:value={filtros.tipoMantenimiento}>
          <option value="">Todos</option>
          {#each TIPOS_MANTENIMIENTO as t}
            <option value={t.value}>{t.label}</option>
          {/each}
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Tipo de actividad</span>
        <select bind:value={filtros.tipoActividad}>
          <option value="">Todos</option>
          {#each TIPOS_ACTIVIDAD as t}
            <option value={t.value}>{t.label}</option>
          {/each}
        </select>
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Desde</span>
        <input type="date" bind:value={filtros.fechaInicio} />
      </label>
      <label class="filter-chip">
        <span class="chip-lab">Hasta</span>
        <input type="date" bind:value={filtros.fechaFin} />
      </label>
      <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
      <button type="button" class="btn-clear" on:click={handleLimpiarFiltro}>Limpiar</button>
      <div class="presets">
        <button
          type="button"
          class="chip-preset imprevistos"
          class:chip-preset--activo={soloImprevistosActivo}
          title="Trabajos registrados sin cita del cronograma"
          on:click={toggleSoloImprevistos}
        >
          <span class="mas" aria-hidden="true">＋</span>
          Solo imprevistos
        </button>
        <button
          type="button"
          class="chip-preset"
          class:chip-preset--activo={soloHallazgosActivo}
          on:click={toggleSoloHallazgos}
        >
          <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a1 1 0 00.87 1.5h18.62a1 1 0 00.87-1.5L13.71 3.86a1 1 0 00-1.72 0z" /></svg>
          Solo hallazgos
        </button>
      </div>
    </div>
  </div>

  {#if isLoading && !pagina.data.length}
    <div class="loader-wrap"><Loader /></div>
  {:else}
    <div class="table-card">
      {#if !pagina.data.length}
        <p class="no-data">Sin ejecuciones para los filtros seleccionados.</p>
      {:else}
        <DataGrid
          {columns}
          data={pagina.data}
          totalElements={pagina.totalElements}
          totalPages={pagina.totalPages}
          currentPage={pagina.currentPage}
          {pageSize}
          on:action={handleGridAction}
          on:pageChange={handlePageChange}
          on:sizeChange={handleSizeChange}
          variant="modern"
          rowClass={claseFila}
        />
      {/if}
    </div>
  {/if}
</div>

{#if mostrarDetalle}
  <SubestacionEjecucionDetalleModal
    ejecucion={detalle}
    isLoading={detalleLoading}
    on:close={() => (mostrarDetalle = false)}
  />
{/if}

<style>
  .ejecuciones :global(tr.fila-imprevisto td) {
    background-color: var(--imp-fila) !important;
  }
  .ejecuciones :global(tr.fila-imprevisto td:first-child) {
    box-shadow: inset 3px 0 0 var(--imp-c);
  }
  .ejecuciones {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .cabeza {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }
  .titulo {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .subtitulo {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--ink-secondary);
    max-width: 820px;
  }
  .filter-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 14px 16px;
  }
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    background: #fff;
    font-size: 12px;
    color: var(--ink);
  }
  .chip-lab {
    color: var(--ink-muted);
    white-space: nowrap;
  }
  .filter-chip select,
  .filter-chip input {
    font-family: inherit;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--ink);
    max-width: 160px;
  }
  .filter-chip select:focus,
  .filter-chip input:focus {
    outline: none;
  }
  .btn-filter {
    font-family: inherit;
    padding: 8px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-clear {
    font-family: inherit;
    padding: 8px 18px;
    background: #fff;
    color: var(--ink-secondary);
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    font-size: 12.5px;
    cursor: pointer;
  }
  .btn-clear:hover {
    background: #f5f6f8;
  }
  .chip-preset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 999px;
    border: 1px solid #f0c34d;
    background: #fff8e1;
    color: #8a5a00;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .presets {
    display: inline-flex;
    gap: 8px;
    margin-left: auto;
  }
  /* Imprevistos: la misma terracota del resto del módulo */
  .chip-preset.imprevistos {
    border-color: var(--imp-c);
    background: var(--imp-fila);
    color: var(--imp-c);
  }
  .chip-preset.imprevistos.chip-preset--activo {
    background: var(--imp-c);
    color: #fff;
  }
  .mas {
    font-size: 13px;
    line-height: 1;
  }
  .chip-preset svg {
    width: 14px;
    height: 14px;
    stroke: #c98500;
    fill: none;
    stroke-width: 2;
  }
  .chip-preset--activo {
    background: #f5c453;
    color: #52340a;
  }
  .loader-wrap {
    display: flex;
    justify-content: center;
    padding: 40px;
  }
  .table-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
    min-width: 0;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
</style>
