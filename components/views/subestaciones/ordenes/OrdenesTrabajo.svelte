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
  import { fechaCorta } from "../../../../utils/cronograma.js";
  import { ORDEN_ESTADO, PRIORIDAD } from "../../../../utils/ordenes.js";
  import Loader from "../../../shared/Loader.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import SubToast from "../SubToast.svelte";
  import SelectorDisciplina from "../SelectorDisciplina.svelte";
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
  const TAM = 20;

  let vista = "pendientes";
  let estacionId = "";
  let prioridad = "";
  let pagina = 0;
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
  $: if (!$ordenDetalleId) cargar(filtros, pagina);

  async function cargar(f = filtros, p = pagina) {
    const mio = ++pedido;
    error = "";
    try {
      const [r, ...cuentas] = await Promise.all([
        substationAdmin.listarOrdenes(f, p, TAM),
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
      <SelectorDisciplina />
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
        <select class="sub-select" bind:value={estacionId} on:change={() => (pagina = 0)} aria-label="Estación">
          <option value="">Todas las estaciones</option>
          {#each estaciones as s (s.id)}<option value={String(s.id)}>{s.nombre}</option>{/each}
        </select>
        <select class="sub-select" bind:value={prioridad} on:change={() => (pagina = 0)} aria-label="Prioridad">
          <option value="">Toda prioridad</option>
          {#each Object.entries(PRIORIDAD) as [k, p]}<option value={k}>Prioridad {p.l.toLowerCase()}</option>{/each}
        </select>
      </div>
    </div>

    {#if cargando}
      <div class="centro"><Loader /></div>
    {:else if error && !resultado}
      <ErrorCarga que="las órdenes de trabajo" mensaje={error} on:reintentar={() => cargar()} />
    {:else}
      <div class="sub-card tabla">
        <div class="sub-th fila">
          <span>Orden</span><span>Estación · hallazgo</span><span>Prioridad</span><span>Asignada a</span><span>Vence</span><span>Estado</span>
        </div>
        {#each filas as o (o.id)}
          {@const est = ORDEN_ESTADO[o.estado] ?? ORDEN_ESTADO.ASIGNADA}
          {@const pr = PRIORIDAD[o.prioridad] ?? PRIORIDAD.MEDIA}
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <div class="sub-tr clickable fila" role="button" tabindex="0" on:click={() => ordenDetalleId.set(o.id)}
            on:keydown={(e) => e.key === "Enter" && ordenDetalleId.set(o.id)}>
            <span class="ot"><strong>{o.consecutivo}</strong><span class="gris">{o.diasAbierta} {o.diasAbierta === 1 ? "día" : "días"}</span></span>
            <span class="que">
              <strong>{o.estacionNombre}</strong>
              <span class="gris trunc" title={o.hallazgoObservaciones}>{o.hallazgoObservaciones}</span>
            </span>
            <span><span class="sub-badge" style="color:{pr.c};background:{pr.bg}">{pr.l}</span></span>
            <span class="trunc" class:gris={o.paraCualquiera}>{o.paraCualquiera ? "Cualquier operario" : o.asignadoANombre}</span>
            <span class:vencida={o.vencida} title={o.vencida ? "Ya pasó la fecha límite" : ""}>{o.vencida ? "⚠ " : ""}{fechaCorta(o.fechaLimite)}</span>
            <span><span class="sub-badge" style="color:{est.c};background:{est.bg}" title={est.ayuda}>{est.g} {est.l}</span></span>
          </div>
        {:else}
          <div class="sub-empty">
            {vista === "pendientes" ? "No hay órdenes pendientes. Los hallazgos sin atender se ven en Ejecuciones y hallazgos." : "Ninguna orden para este filtro."}
          </div>
        {/each}
        {#if resultado && resultado.totalPages > 1}
          <div class="paginas">
            <button class="sub-btn" disabled={pagina === 0} on:click={() => (pagina -= 1)}>← Anterior</button>
            <span class="gris">Página {pagina + 1} de {resultado.totalPages} · {resultado.totalElements} órdenes</span>
            <button class="sub-btn" disabled={pagina + 1 >= resultado.totalPages} on:click={() => (pagina += 1)}>Siguiente →</button>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
  <SubToast />
</div>

<style>
  .barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px 16px;
    flex-wrap: wrap;
  }
  .vistas {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .vistas button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    background: #fff;
    color: #0b0b0b;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .vistas button.on {
    background: #0b0b0b;
    border-color: #0b0b0b;
    color: #fff;
    font-weight: 600;
  }
  .vistas button.alerta:not(.on) {
    border-color: #d03b3b;
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
    gap: 8px;
    flex-wrap: wrap;
  }
  .centro {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .tabla {
    overflow-x: auto;
  }
  .fila {
    grid-template-columns: 120px minmax(220px, 2fr) 90px minmax(130px, 1fr) 100px 140px;
    gap: 12px;
    min-width: 820px;
  }
  .ot,
  .que {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .gris {
    color: #898781;
    font-size: 12px;
  }
  .trunc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vencida {
    color: #d03b3b;
    font-weight: 650;
  }
  .paginas {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    gap: 10px;
  }
</style>
