<script>
  /**
   * Pestaña Órdenes de trabajo (OT-EB): las órdenes que corrigen hallazgos. Por defecto, las
   * pendientes (asignadas o por verificar), con las vencidas resaltadas. Click → detalle.
   */
  import { onDestroy } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { ordenDetalleId, disciplinaFiltro, subestacionesActiveTab } from "../../../../stores/subestacionesFilters.js";
  import { alCambiarOrdenes, alCambiarEjecuciones } from "../../../../stores/subestacionesEventos.js";
  import { disciplinaLabel } from "../../../../config/subestaciones.js";
  import { PRIORIDAD } from "../../../../utils/ordenes.js";
  import Loader from "../../../shared/Loader.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import SubToast from "../SubToast.svelte";
  import SelectorDisciplina from "../SelectorDisciplina.svelte";
  import DataGrid from "../../../shared/DataGrid.svelte";
  import { createOrdenesColumns, ordenesSortParam } from "../../../../config/table-definitions/substation.js";
  import PanelFiltros from "../../../shared/PanelFiltros.svelte";
  import SelectBuscable from "../../../shared/SelectBuscable.svelte";
  import { opcionesEstaciones } from "../../../../utils/opcionesFiltro.js";
  import OrdenDetalle from "./OrdenDetalle.svelte";

  /** Vistas rápidas: qué estados (y si solo las vencidas) trae cada una. */
  const VISTAS = [
    { id: "pendientes", l: "Pendientes", estado: ["ASIGNADA", "POR_VERIFICAR"] },
    { id: "verificar", l: "Por verificar", estado: ["POR_VERIFICAR"] },
    { id: "vencidas", l: "Vencidas", estado: [], vencidas: true },
    { id: "cerradas", l: "Cerradas", estado: ["CERRADA"] },
    { id: "anuladas", l: "Anuladas", estado: ["ANULADA"] },
    { id: "todas", l: "Todas", estado: [] },
  ];
  const columns = createOrdenesColumns();

  let vista = "pendientes";
  let estacionId = "";
  let prioridad = "";
  let pagina = 0;
  let pageSize = 20;
  /** Orden de la tabla (SortingState de TanStack); se aplica en el servidor. Vacío = las más recientes primero. */
  let sorting = [];
  let resultado = null;
  let conteos = {};
  let estaciones = [];
  let cargando = true;
  let error = "";
  let pedido = 0;

  substationAdmin.listarEstaciones().then((r) => (estaciones = r.filter((s) => s.activa))).catch(() => {});

  $: filtros = {
    estado: VISTAS.find((v) => v.id === vista).estado,
    vencidas: VISTAS.find((v) => v.id === vista).vencidas,
    estacionId,
    prioridad,
    disciplina: $disciplinaFiltro,
  };
  $: if (!$ordenDetalleId) cargar(filtros, pagina, sorting, pageSize);

  async function cargar(f = filtros, p = pagina, orden = sorting, tam = pageSize) {
    const sort = ordenesSortParam(orden);
    const mio = ++pedido;
    error = "";
    try {
      const [r, ...cuentas] = await Promise.all([
        substationAdmin.listarOrdenes(f, p, tam, ...(sort ? [sort] : [])),
        // Los números de las vistas rápidas, con los mismos filtros de estación, prioridad y disciplina.
        ...VISTAS.filter((v) => v.id !== "todas").map((v) =>
          substationAdmin.listarOrdenes({ ...f, estado: v.estado, vencidas: v.vencidas }, 0, 1)),
      ]);
      if (mio !== pedido) return;
      resultado = r;
      conteos = Object.fromEntries(VISTAS.filter((v) => v.id !== "todas").map((v, i) => [v.id, cuentas[i].totalElements]));
    } catch (e) {
      if (mio === pedido) error = e.message;
    } finally {
      if (mio === pedido) cargando = false;
    }
  }

  // Una orden cambió (otro supervisor, o el operario la ejecutó desde el móvil): se recarga.
  onDestroy(alCambiarOrdenes(() => !$ordenDetalleId && cargar()));
  onDestroy(alCambiarEjecuciones(() => !$ordenDetalleId && cargar()));
  onDestroy(() => ordenDetalleId.set(null));

  function elegirVista(id) {
    vista = id;
    pagina = 0;
  }

  // Panel "Filtros" (como en Ejecuciones y el Cronograma): se elige en el panel y se aplica con
  // "Aplicar"; cerrar sin aplicar no cambia nada.
  let filtrosAbierto = false;
  let borrador = { estacionId: "", prioridad: "" };

  function abrirFiltros() {
    borrador = { estacionId, prioridad };
    filtrosAbierto = true;
  }

  function aplicarFiltros() {
    ({ estacionId, prioridad } = borrador);
    pagina = 0;
    filtrosAbierto = false;
  }

  function limpiarFiltros() {
    estacionId = "";
    prioridad = "";
    pagina = 0;
  }

  $: etiquetasFiltro = [
    estacionId && {
      l: estaciones.find((e) => String(e.id) === String(estacionId))?.nombre ?? "Estación",
      quitar: () => ((estacionId = ""), (pagina = 0)),
    },
    prioridad && {
      l: `Prioridad ${(PRIORIDAD[prioridad]?.l ?? prioridad).toLowerCase()}`,
      quitar: () => ((prioridad = ""), (pagina = 0)),
    },
  ].filter(Boolean);

  function irAHallazgos() {
    subestacionesActiveTab.set("ejecuciones");
  }

  $: filas = resultado?.content ?? [];
</script>

<div class="sub-mod">
  {#if $ordenDetalleId}
    {#key $ordenDetalleId}
      <OrdenDetalle id={$ordenDetalleId} on:volver={() => ordenDetalleId.set(null)} />
    {/key}
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Órdenes de trabajo</h1>
        <p class="sub-subtitle">
          {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} · correcciones de hallazgos
          asignadas a los operarios. Se crean desde el detalle de un hallazgo en
          <button class="sub-link" on:click={irAHallazgos}>Ejecuciones y hallazgos</button>.
        </p>
      </div>
    </div>

    <div class="barra">
      <div class="vistas" role="tablist" aria-label="Vista">
        {#each VISTAS as v (v.id)}
          <button role="tab" aria-selected={vista === v.id} class:on={vista === v.id} class:alerta={v.id === "vencidas" && conteos.vencidas}
            on:click={() => elegirVista(v.id)}>
            {v.l}{#if conteos[v.id] != null}<span class="n">{conteos[v.id]}</span>{/if}
          </button>
        {/each}
      </div>
      <div class="filtros">
        <!-- La disciplina junto a Filtros: todo lo que filtra la lista queda en un solo lugar. -->
        <SelectorDisciplina />
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
          <button type="button" class="lnk" on:click={limpiarFiltros}>Limpiar todo</button>
        {/if}
      </div>
    </div>

    {#if filtrosAbierto}
      <PanelFiltros on:aplicar={aplicarFiltros} on:limpiar={() => (borrador = { estacionId: "", prioridad: "" })} on:close={() => (filtrosAbierto = false)}>
        <div class="panel-campos">
          <div class="campo">
            <span class="campo-lab">Estación</span>
            <SelectBuscable bind:value={borrador.estacionId} opciones={opcionesEstaciones(estaciones)} ariaLabel="Estación" buscarPlaceholder="Buscar estación…" />
          </div>
          <label class="campo">
            <span class="campo-lab">Prioridad</span>
            <select bind:value={borrador.prioridad}>
              <option value="">Todas</option>
              {#each Object.entries(PRIORIDAD) as [k, p]}<option value={k}>{p.l}</option>{/each}
            </select>
          </label>
        </div>
      </PanelFiltros>
    {/if}

    {#if cargando}
      <div class="centro"><Loader /></div>
    {:else if error && !resultado}
      <ErrorCarga que="las órdenes de trabajo" mensaje={error} on:reintentar={() => cargar()} />
    {:else}
      <div class="table-card">
        {#if !filas.length}
          <p class="no-data">
            {vista === "pendientes" ? "No hay órdenes pendientes. Los hallazgos sin atender se ven en Ejecuciones y hallazgos." : "Ninguna orden para este filtro."}
          </p>
        {:else}
          <DataGrid
            {columns}
            data={filas}
            totalElements={resultado?.totalElements ?? 0}
            totalPages={resultado?.totalPages ?? 0}
            currentPage={pagina}
            {pageSize}
            on:action={(e) => e.detail.type === "verDetalle" && ordenDetalleId.set(e.detail.data.id)}
            on:pageChange={(e) => (pagina = e.detail)}
            on:sizeChange={(e) => ((pageSize = e.detail), (pagina = 0))}
            manualSorting
            {sorting}
            on:sortChange={(e) => ((sorting = e.detail), (pagina = 0))}
            variant="modern"
          />
        {/if}
      </div>
    {/if}
  {/if}
  <SubToast />
</div>

<style>
  .barra {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px 16px;
    flex-wrap: wrap;
  }
  .vistas {
    display: flex;
    flex-wrap: wrap;
    padding: 3px;
    background: #efefed;
    border-radius: 999px;
  }
  .vistas button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: #0b0b0b;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .vistas button.on {
    background: #fff;
    color: #0b0b0b;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(11, 11, 11, 0.1);
  }
  .vistas button.alerta:not(.on) {
    color: #a12b2b;
  }
  .n {
    font-size: 11.5px;
    font-weight: 700;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }
  .filtros {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn-filtros {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: inherit;
    padding: 8px 16px;
    background: #fff;
    color: #0b0b0b;
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
  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .campo-lab {
    font-size: 12.5px;
    font-weight: 600;
  }
  .campo select {
    font: inherit;
    font-size: 13px;
    padding: 9px 12px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 10px;
    background: #fff;
  }
  .campo select:focus {
    outline: 2px solid #2a78d6;
    outline-offset: 1px;
  }
  .table-card {
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    padding: 18px 20px;
    min-width: 0;
  }
  .no-data {
    color: #898781;
    font-size: 12px;
    margin: 0;
  }
  .centro {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
</style>
