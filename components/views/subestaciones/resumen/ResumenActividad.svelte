<script>
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { detalleActividadId } from "../../../../stores/subestacionesFilters.js";
  import { pctBadge } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import DetalleActividad from "./DetalleActividad.svelte";

  // Resumen por actividad (P6): mismo lenguaje del Dashboard — tabla de actividades del año;
  // click en una fila → sus registros en la misma pestaña → modal con fotos.
  let filas = [];
  let anio = null;
  let anioActual = null;
  let cargando = true;
  let recargando = false;
  let errorCarga = "";
  let q = "";
  let orden = "nombre";
  const cols = "minmax(0,2.2fr) 110px 150px 120px 130px 150px";

  // Solo se aplica la respuesta de la última carga (cambios de año seguidos).
  let secuencia = 0;

  async function cargar() {
    const mia = ++secuencia;
    if (filas.length) recargando = true;
    else cargando = true;
    errorCarga = "";
    try {
      const r = await substationAdmin.resumenPorActividad(anio);
      if (mia !== secuencia) return;
      filas = r.map((a) => {
        const pct = a.porcentajeCumplimiento != null ? Math.round(Number(a.porcentajeCumplimiento)) : null;
        return { ...a, pct, pc: pct != null ? pctBadge(pct) : null };
      });
      // Sin año pedido, el servidor responde con el actual.
      if (anio == null) anio = r[0]?.anio ?? new Date().getFullYear();
      if (anioActual == null) anioActual = anio;
    } catch (e) {
      if (mia !== secuencia) return;
      errorCarga = e.message;
    } finally {
      if (mia === secuencia) cargando = recargando = false;
    }
  }
  cargar();

  function cambiarAnio(e) {
    anio = Number(e.target.value);
    cargar();
  }

  function abrir(a) {
    detalleActividadId.set(a.actividadId);
  }

  $: visibles = filas
    .filter((a) => !q || a.actividadNombre.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      orden === "cumplimiento"
        ? // Sin citas vencidas ("—") al final: no hay nada que medir todavía.
          (a.pct ?? 101) - (b.pct ?? 101) || a.actividadNombre.localeCompare(b.actividadNombre)
        : a.actividadNombre.localeCompare(b.actividadNombre),
    );
  $: tot = visibles.reduce(
    (t, a) => ({
      programado: t.programado + a.programadoAnual,
      vencidas: t.vencidas + a.vencidas,
      ejecutadasVencidas: t.ejecutadasVencidas + a.ejecutadasVencidas,
      registros: t.registros + a.ejecutadoTotal,
      fuera: t.fuera + a.ejecutadoNoProgramado,
    }),
    { programado: 0, vencidas: 0, ejecutadasVencidas: 0, registros: 0, fuera: 0 },
  );
  $: totPct = tot.vencidas ? Math.round((tot.ejecutadasVencidas / tot.vencidas) * 100) : null;
  $: totPc = totPct != null ? pctBadge(totPct) : null;
</script>

<div class="sub-mod">
  <!-- El detalle espera la primera carga: de ahí sale el año actual del servidor. -->
  {#if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga && !filas.length}
    <ErrorCarga que="el resumen por actividad" mensaje={errorCarga} on:reintentar={cargar} />
  {:else if $detalleActividadId != null}
    {#key $detalleActividadId}
      <DetalleActividad actividadId={$detalleActividadId} anioInicial={anio} {anioActual}
        on:volver={() => detalleActividadId.set(null)} />
    {/key}
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Resumen por actividad</h1>
        <p class="sub-subtitle">
          Civil · lo publicado a móvil y lo ejecutado en {anio} · click en una actividad para ver sus registros.
        </p>
      </div>
      <div class="controles">
        <input class="ctl buscar" bind:value={q} placeholder="Buscar actividad…" aria-label="Buscar actividad" />
        <div class="sub-seg" role="group" aria-label="Ordenar">
          <button class:on={orden === "nombre"} on:click={() => (orden = "nombre")}>A–Z</button>
          <button class:on={orden === "cumplimiento"} on:click={() => (orden = "cumplimiento")}>Menor cumplimiento</button>
        </div>
        <select class="ctl" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
          {#each [anioActual, anioActual - 1] as y}<option value={String(y)}>{y}</option>{/each}
        </select>
      </div>
    </div>

    <div class="sub-card scroll-x" class:actualizando={recargando}>
      <div class="sub-th" style="grid-template-columns:{cols}">
        <span>Actividad</span>
        <span class="num" title="Citas publicadas a móvil en el año, todas las estaciones">Programadas</span>
        <span class="num" title="Citas de meses cerrados que tienen ejecución">Ejecutadas</span>
        <span class="num" title="Todas las ejecuciones del año de esta actividad">Registros</span>
        <span class="num" title="Ejecuciones sin cita del cronograma">Fuera de cronograma</span>
        <span>Cumplimiento</span>
      </div>
      {#each visibles as a (a.actividadId)}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="sub-tr clickable" style="grid-template-columns:{cols}" role="button" tabindex="0"
          title="Ver registros de la actividad" on:click={() => abrir(a)}
          on:keydown={(e) => e.key === "Enter" && abrir(a)}>
          <span class="nombre" title={a.actividadNombre}>{a.actividadNombre}</span>
          <span class="num">{a.programadoAnual || "—"}</span>
          <span class="num">{a.ejecutadasVencidas} <span class="gris">de {a.vencidas}</span></span>
          <span class="num">{a.ejecutadoTotal}</span>
          <span class="num" class:gris={!a.ejecutadoNoProgramado}>{a.ejecutadoNoProgramado}</span>
          <span>
            {#if a.pc}
              <span class="sub-badge" style="color:{a.pc.c};background:{a.pc.bg}">{a.pc.g} {a.pct}%</span>
            {:else}
              <span class="sub-badge neu" title="Sin citas vencidas">—</span>
            {/if}
          </span>
        </div>
      {:else}
        <div class="sub-empty">
          {q ? `Ninguna actividad coincide con "${q}".` : "Sin actividades activas en la disciplina Civil."}
        </div>
      {/each}
      {#if visibles.length}
        <div class="sub-tr pie" style="grid-template-columns:{cols}">
          <span>Total · {visibles.length} {visibles.length === 1 ? "actividad" : "actividades"}</span>
          <span class="num">{tot.programado}</span>
          <span class="num">{tot.ejecutadasVencidas} <span class="gris">de {tot.vencidas}</span></span>
          <span class="num">{tot.registros}</span>
          <span class="num">{tot.fuera}</span>
          <span>
            {#if totPc}
              <span class="sub-badge" style="color:{totPc.c};background:{totPc.bg}">{totPc.g} {totPct}%</span>
            {:else}
              <span class="sub-badge neu">—</span>
            {/if}
          </span>
        </div>
      {/if}
    </div>
    <p class="nota">
      Cumplimiento = citas ejecutadas ÷ citas de meses ya cerrados (misma fórmula del Dashboard). “—” = todavía no
      hay citas vencidas.
    </p>
  {/if}
  <SubToast />
</div>

<style>
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .controles {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ctl {
    height: 36px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .buscar {
    width: 220px;
  }
  .scroll-x {
    overflow-x: auto;
    transition: opacity 0.15s;
  }
  .actualizando {
    opacity: 0.55;
    pointer-events: none;
  }
  .sub-th,
  .sub-tr {
    min-width: 880px;
    column-gap: 12px;
  }
  .nombre {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .gris {
    color: #898781;
  }
  .pie {
    background: #f7f7f6;
    font-weight: 600;
    border-bottom: 0;
    border-radius: 0 0 10px 10px;
  }
  .nota {
    margin: 0;
    font-size: 12px;
    color: #898781;
  }
</style>
