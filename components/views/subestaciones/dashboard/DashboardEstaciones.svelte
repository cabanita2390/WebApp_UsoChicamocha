<script>
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { detalleEstacionId, disciplinaFiltro } from "../../../../stores/subestacionesFilters.js";
  import { tipoLabel, disciplinaLabel } from "../../../../config/subestaciones.js";
  import { pctBadge } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import DetalleEstacion from "./DetalleEstacion.svelte";
  import SelectorDisciplina from "../SelectorDisciplina.svelte";

  let filas = [];
  let anio = null;
  let cargando = true;
  let errorCarga = "";
  // Sin códigos de estación (P1/D3).
  const cols = "minmax(0,2fr) 140px 110px 110px 130px 150px";

  // Solo se aplica la respuesta de la última carga (cambios de disciplina seguidos).
  let secuencia = 0;
  let recargando = false;

  async function cargar() {
    const mia = ++secuencia;
    if (filas.length) recargando = true;
    else cargando = true;
    errorCarga = "";
    try {
      const r = await substationAdmin.indicadoresPorEstacion(undefined, $disciplinaFiltro);
      if (mia !== secuencia) return;
      anio = r[0]?.anio ?? new Date().getFullYear();
      filas = r.map((i) => {
        const pct = i.porcentajeCumplimiento != null ? Math.round(Number(i.porcentajeCumplimiento)) : null;
        return { ...i, pct, pc: pct != null ? pctBadge(pct) : null };
      });
    } catch (e) {
      if (mia === secuencia) errorCarga = e.message;
    } finally {
      if (mia === secuencia) cargando = recargando = false;
    }
  }
  cargar();
</script>

<div class="sub-mod">
  {#if $detalleEstacionId != null}
    {#key $detalleEstacionId}
      <DetalleEstacion estacionId={$detalleEstacionId} on:volver={() => detalleEstacionId.set(null)} />
    {/key}
  {:else if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga}
    <ErrorCarga que="el dashboard" mensaje={errorCarga} on:reintentar={cargar} />
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Cumplimiento {anio}</h1>
        <p class="sub-subtitle">
          {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} · ejecutadas ÷ citas de
          meses cerrados y ya ejecutadas · click en una estación para ver su detalle.
        </p>
      </div>
      <SelectorDisciplina on:change={cargar} />
    </div>
    <div class="sub-card scroll-x" class:actualizando={recargando}>
      <div class="sub-th" style="grid-template-columns:{cols}">
        <span>Estación</span><span>Tipo</span><span>Programadas</span><span>Ejecutadas</span>
        <span title="Registros del año sin cita del cronograma (no suman al %)">No programadas</span><span>Cumplimiento</span>
      </div>
      {#each filas as s (s.estacionId)}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="sub-tr clickable" style="grid-template-columns:{cols}" role="button" tabindex="0"
          title="Ver detalle de estación" on:click={() => detalleEstacionId.set(s.estacionId)}
          on:keydown={(e) => e.key === "Enter" && detalleEstacionId.set(s.estacionId)}>
          <span>
            {s.estacionNombre}
            {#if s.activa === false}<span class="sub-badge neu inactiva" title="Desactivada: se muestra por las citas o registros que tuvo este año">Inactiva</span>{/if}
          </span>
          <span class="gris">{tipoLabel(s.estacionTipo)}</span>
          <span>{s.programado}</span>
          <span>{s.ejecutadasVencidas} <span class="tenue">de {s.vencidas}</span></span>
          <span class:tenue={!s.ejecutadoNoProgramado}>{s.ejecutadoNoProgramado ?? 0}</span>
          <span>
            {#if s.pc}
              <span class="sub-badge" style="color:{s.pc.c};background:{s.pc.bg}">{s.pc.g} {s.pct}%</span>
            {:else}
              <span class="sub-badge neu" title="Sin citas vencidas">—</span>
            {/if}
          </span>
        </div>
      {:else}
        <div class="sub-empty">Sin estaciones activas.</div>
      {/each}
    </div>
  {/if}
  <SubToast />
</div>

<style>
  .inactiva {
    margin-left: 6px;
  }
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
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
    min-width: 820px;
  }
  .tenue {
    color: #898781;
  }
  .gris {
    color: #52514e;
  }
</style>
