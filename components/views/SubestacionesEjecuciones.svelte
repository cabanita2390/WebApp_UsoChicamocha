<script>
  import { onMount, onDestroy } from "svelte";
  import { data } from "../../stores/data.js";
  import { substationAdmin } from "../../stores/substationAdmin.js";
  import { addNotification } from "../../stores/ui.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import SubestacionEjecucionDetalleModal from "../shared/SubestacionEjecucionDetalleModal.svelte";
  import { createEjecucionesColumns, ejecucionesSortParams } from "../../config/table-definitions/substation.js";
  import { get } from "svelte/store";
  import { ejecucionesFiltroInicial, disciplinaFiltro } from "../../stores/subestacionesFilters.js";
  import { disciplinaLabel } from "../../config/subestaciones.js";
  import { alCambiarEjecuciones, alCambiarOrdenes } from "../../stores/subestacionesEventos.js";
  import { IMPREVISTO } from "../../utils/cronograma.js";
  import { origenEjecucion, ORDEN } from "../../utils/ordenes.js";
  import SelectorDisciplina from "./subestaciones/SelectorDisciplina.svelte";
  import PanelFiltros from "../shared/PanelFiltros.svelte";
  import SelectBuscable from "../shared/SelectBuscable.svelte";
  import { opcionesActividades, opcionesElementos, opcionesEstaciones } from "../../utils/opcionesFiltro.js";

  /** Imprevistos (sin cita ni orden de trabajo): fila en terracota suave para verlos de un vistazo. */
  const claseFila = (r) => (origenEjecucion(r).tipo === "imprevisto" ? "fila-imprevisto" : "");
  // Hallazgos que nadie atiende todavía (sin orden de trabajo). Los que ya tienen orden se siguen en
  // la pestaña Órdenes de trabajo.
  const SEGUIMIENTO_SIN_ATENDER = "ABIERTO";

  // Sin "No programado": lo que no estaba en el cronograma lo dice el filtro Origen / "Solo imprevistos"
  // (lo calcula el sistema). Los registros viejos con ese valor se siguen viendo con su etiqueta.
  const TIPOS_MANTENIMIENTO = [
    { value: "PREVENTIVO", label: "Preventivo" },
    { value: "CORRECTIVO", label: "Correctivo" },
    { value: "PREDICTIVO", label: "Predictivo" },
  ];
  const TIPOS_ACTIVIDAD = [
    { value: "INSPECCION", label: "Inspección" },
    { value: "MANTENIMIENTO", label: "Mantenimiento" },
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
      elementoId: "",
      tipoMantenimiento: "",
      tipoActividad: "",
      resultado: "",
      // Origen: "" todos, "true" cronograma, "false" imprevisto, "orden" orden de trabajo.
      esProgramada: "",
      seguimiento: "",
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
      elementoId: filtroInicial.elementoId ?? "",
      esProgramada: filtroInicial.esProgramada != null ? String(filtroInicial.esProgramada) : "",
      fechaInicio: filtroInicial.fechaInicio ?? "",
      fechaFin: filtroInicial.fechaFin ?? "",
    };
    ejecucionesFiltroInicial.set(null);
  }
  let pageSize = 20;
  /** Orden de la tabla (SortingState de TanStack); se aplica en el servidor. Por defecto, lo más reciente. */
  let sorting = [{ id: "ej_fecha", desc: true }];

  $: isLoading = $data.isLoading;
  $: estaciones = $data.substationEstaciones ?? [];
  $: actividades = ($data.substationActividades ?? []).filter((a) => !$disciplinaFiltro || a.disciplina === $disciplinaFiltro);
  // Elementos eléctricos (también los desactivados: siguen en visitas viejas). El filtro solo se ofrece en Eléctrico.
  let elementosTodos = [];
  $: elementos = elementosTodos.filter((e) => e.disciplina === "ELECTRICO");
  $: filtroElemento = $disciplinaFiltro === "ELECTRICO";
  $: pagina = $data.substationEjecuciones ?? { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 };
  $: columns = createEjecucionesColumns();
  $: soloHallazgosActivo = filtros.resultado === HALLAZGOS_PRESET.join(",");
  // "Solo imprevistos" es el mismo filtro Origen = Imprevisto: el botón y el select quedan sincronizados.
  $: soloImprevistosActivo = filtros.esProgramada === "false";
  $: sinAtenderActivo = filtros.seguimiento === SEGUIMIENTO_SIN_ATENDER;

  function filtrosParaFetch() {
    return {
      estacionId: filtros.estacionId || undefined,
      actividadId: filtros.actividadId || undefined,
      elementoId: filtroElemento && filtros.elementoId ? filtros.elementoId : undefined,
      tipoMantenimiento: filtros.tipoMantenimiento || undefined,
      tipoActividad: filtros.tipoActividad || undefined,
      resultado: filtros.resultado ? filtros.resultado.split(",") : undefined,
      esProgramada: filtros.esProgramada === "" || filtros.esProgramada === "orden" ? undefined : filtros.esProgramada === "true",
      conOrden: filtros.esProgramada === "orden" ? true : undefined,
      seguimiento: filtros.seguimiento ? filtros.seguimiento.split(",") : undefined,
      fechaInicio: filtros.fechaInicio || undefined,
      fechaFin: filtros.fechaFin || undefined,
      // La disciplina es la misma de las otras pestañas (Dashboard, Resumen, Cronograma).
      disciplina: $disciplinaFiltro || undefined,
      sort: ejecucionesSortParams(sorting),
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

  function handleSortChange(e) {
    sorting = e.detail;
    cargar(0);
  }

  function handleFiltrar() {
    cargar(0);
  }

  function handleLimpiarFiltro() {
    filtros = filtrosVacios();
    cargar(0);
  }

  // Panel "Filtros" (como el del Cronograma Anual): los cambios se aplican con "Aplicar";
  // cerrar sin aplicar deja los filtros como estaban.
  let filtrosAbierto = false;
  let filtrosAntes = null;

  function abrirFiltros() {
    filtrosAntes = { ...filtros };
    filtrosAbierto = true;
  }

  function cerrarFiltros() {
    if (filtrosAntes) filtros = filtrosAntes;
    filtrosAbierto = false;
  }

  function aplicarFiltros() {
    filtrosAntes = null;
    filtrosAbierto = false;
    cargar(0);
  }

  function quitar(campo) {
    return () => {
      filtros = { ...filtros, [campo]: "" };
      cargar(0);
    };
  }

  const fechaCorta = (iso) => (iso ? iso.split("-").reverse().slice(0, 2).join("/") : "");
  const ORIGENES = { true: "Cronograma", orden: "Orden de trabajo" };

  // Lo que está filtrado, como chips que se quitan con un clic. Los atajos (Solo imprevistos,
  // Solo hallazgos, Sin atender) no se repiten aquí: ya se ven encendidos.
  $: etiquetasFiltro = [
    filtros.estacionId && { l: estaciones.find((e) => String(e.id) === String(filtros.estacionId))?.nombre ?? "Estación", quitar: quitar("estacionId") },
    filtros.actividadId && { l: actividades.find((a) => String(a.id) === String(filtros.actividadId))?.nombre ?? "Actividad", quitar: quitar("actividadId") },
    filtroElemento && filtros.elementoId && { l: elementos.find((e) => String(e.id) === String(filtros.elementoId))?.nombre ?? "Elemento", quitar: quitar("elementoId") },
    filtros.resultado && !soloHallazgosActivo && { l: RESULTADOS.find((r) => r.value === filtros.resultado)?.label ?? filtros.resultado, quitar: quitar("resultado") },
    ORIGENES[filtros.esProgramada] && { l: ORIGENES[filtros.esProgramada], quitar: quitar("esProgramada") },
    filtros.tipoMantenimiento && { l: TIPOS_MANTENIMIENTO.find((t) => t.value === filtros.tipoMantenimiento)?.label ?? filtros.tipoMantenimiento, quitar: quitar("tipoMantenimiento") },
    filtros.tipoActividad && { l: TIPOS_ACTIVIDAD.find((t) => t.value === filtros.tipoActividad)?.label ?? filtros.tipoActividad, quitar: quitar("tipoActividad") },
    filtros.fechaInicio && { l: `Desde ${fechaCorta(filtros.fechaInicio)}`, quitar: quitar("fechaInicio") },
    filtros.fechaFin && { l: `Hasta ${fechaCorta(filtros.fechaFin)}`, quitar: quitar("fechaFin") },
  ].filter(Boolean);

  function toggleSoloHallazgos() {
    filtros = { ...filtros, resultado: soloHallazgosActivo ? "" : HALLAZGOS_PRESET.join(",") };
    cargar(0);
  }

  function toggleSinAtender() {
    filtros = { ...filtros, seguimiento: sinAtenderActivo ? "" : SEGUIMIENTO_SIN_ATENDER };
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

  // Llegó una ejecución del móvil o cambió una orden (WebSocket): se recarga la página actual.
  onDestroy(alCambiarEjecuciones(() => cargar(pagina.currentPage ?? 0)));
  onDestroy(alCambiarOrdenes(() => cargar(pagina.currentPage ?? 0)));

  onMount(() => {
    if (!estaciones.length) data.fetchSubstationEstaciones();
    if (!actividades.length) data.fetchSubstationActividades();
    substationAdmin.listarElementos().then((l) => (elementosTodos = l ?? [])).catch(() => {});
    cargar(0);
  });
</script>

<div class="ejecuciones" style="--imp-c:{IMPREVISTO.c};--imp-fila:{IMPREVISTO.fila};--ot-c:{ORDEN.c};--ot-bg:{ORDEN.bg}">
  <div class="cabeza">
    <div>
      <h1 class="titulo">Ejecuciones y hallazgos</h1>
      <p class="subtitulo">
        {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} · todo lo que se registró en las
        estaciones, lo más reciente primero. Las filas en terracota son imprevistos (trabajos sin cita del cronograma).
        "Ver detalle" muestra las fotos y el hallazgo; desde ahí se crea la orden de trabajo para corregirlo.
      </p>
    </div>
    <SelectorDisciplina on:change={cambiarDisciplina} />
  </div>
  <div class="filter-card">
    <div class="chip-row">
      <button type="button" class="btn-filtros" class:activos={etiquetasFiltro.length > 0} on:click={abrirFiltros}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M2 4h12M4.5 8h7M7 12h2"></path>
        </svg>
        Filtros{#if etiquetasFiltro.length}<span class="badge">{etiquetasFiltro.length}</span>{/if}
      </button>
      {#each etiquetasFiltro as f (f.l)}
        <button type="button" class="chip-activo" title="Quitar filtro" on:click={f.quitar}><strong>{f.l}</strong><span class="x">×</span></button>
      {/each}
      {#if etiquetasFiltro.length > 1}
        <button type="button" class="lnk" on:click={handleLimpiarFiltro}>Limpiar todo</button>
      {/if}
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
        <button
          type="button"
          class="chip-preset abiertos"
          class:chip-preset--activo={sinAtenderActivo}
          title="Hallazgos que todavía no tienen orden de trabajo ni se resolvieron"
          on:click={toggleSinAtender}
        >
          <span class="punto" aria-hidden="true"></span>
          Sin atender
        </button>
      </div>
    </div>
  </div>

  {#if filtrosAbierto}
    <PanelFiltros on:aplicar={aplicarFiltros} on:limpiar={() => (filtros = filtrosVacios())} on:close={cerrarFiltros}>
      <div class="panel-campos">
        <label class="filter-chip">
        <span class="chip-lab">Estación</span>
        <SelectBuscable bind:value={filtros.estacionId} opciones={opcionesEstaciones(estaciones)} ariaLabel="Estación" buscarPlaceholder="Buscar estación…" />
      </label>
        <label class="filter-chip">
        <span class="chip-lab">Actividad</span>
        <SelectBuscable bind:value={filtros.actividadId} opciones={opcionesActividades(actividades)} ariaLabel="Actividad" buscarPlaceholder="Buscar actividad…" />
      </label>
      {#if filtroElemento}
          <label class="filter-chip">
          <span class="chip-lab">Elemento</span>
          <SelectBuscable bind:value={filtros.elementoId} opciones={opcionesElementos(elementos)} todas="Todos" ariaLabel="Elemento" buscarPlaceholder="Buscar elemento…" />
        </label>
      {/if}
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
          <option value="orden">Orden de trabajo</option>
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
      </div>
    </PanelFiltros>
  {/if}

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
          manualSorting
          {sorting}
          on:sortChange={handleSortChange}
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
    on:cambio={(e) => ((detalle = e.detail), cargar(pagina.currentPage ?? 0))}
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
  .btn-filtros {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: inherit;
    padding: 8px 16px;
    background: #fff;
    color: var(--ink);
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
  }
  .btn-filtros.activos {
    border: 2px solid #2a78d6;
    padding: 7px 15px;
  }
  .badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #2a78d6;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
  }
  .chip-activo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    padding: 6px 8px 6px 12px;
    border: 1px solid rgba(42, 120, 214, 0.35);
    border-radius: 999px;
    background: #e8f1fb;
    color: #1f5fae;
    font-size: 12.5px;
    cursor: pointer;
  }
  .chip-activo strong {
    font-weight: 600;
  }
  .chip-activo .x {
    font-size: 14px;
    line-height: 1;
  }
  .lnk {
    all: unset;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .panel-campos {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .panel-campos .filter-chip {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 0;
    border: 0;
    border-radius: 0;
    font-size: 13px;
  }
  .panel-campos .chip-lab {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink);
  }
  .panel-campos .filter-chip select,
  .panel-campos .filter-chip input {
    max-width: none;
    font-size: 13px;
    padding: 9px 12px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 10px;
    background: #fff;
  }
  .panel-campos .filter-chip select:focus,
  .panel-campos .filter-chip input:focus {
    outline: 2px solid #2a78d6;
    outline-offset: 1px;
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
  .chip-preset.abiertos {
    border-color: #d03b3b;
    background: #fbeaea;
    color: #a12b2b;
  }
  .chip-preset.abiertos.chip-preset--activo {
    background: #d03b3b;
    color: #fff;
  }
  .punto {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
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
