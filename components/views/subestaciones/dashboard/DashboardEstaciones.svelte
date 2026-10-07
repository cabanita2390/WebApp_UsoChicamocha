<script>
  import { onDestroy } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { detalleEstacionId, disciplinaFiltro } from "../../../../stores/subestacionesFilters.js";
  import { alCambiarEjecuciones } from "../../../../stores/subestacionesEventos.js";
  import { tipoLabel, disciplinaLabel, MESES_LARGOS } from "../../../../config/subestaciones.js";
  import { IMPREVISTO, porcentaje, semaforoMes } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import DetalleEstacion from "./DetalleEstacion.svelte";
  import SelectorDisciplina from "../SelectorDisciplina.svelte";

  let filas = [];
  let anio = null;
  let mes = null;
  let transcurrido = null;
  let cargando = true;
  let errorCarga = "";
  /** "anio": avance del año (sin semáforo) · "mes": mes en curso (con semáforo contra el tiempo). */
  let vista = "anio";
  // Sin códigos de estación (P1/D3).
  const colsAnio = "minmax(0,2fr) 130px minmax(190px,1.4fr) 100px 170px";
  const colsMes = "minmax(0,2fr) 130px minmax(240px,1.6fr) 170px";

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
      mes = r[0]?.mes ?? null;
      transcurrido = r[0]?.porcentajeMesTranscurrido ?? null;
      filas = r.map(conCalculos);
    } catch (e) {
      if (mia === secuencia) errorCarga = e.message;
    } finally {
      if (mia === secuencia) cargando = recargando = false;
    }
  }
  cargar();

  // Llegó una ejecución del móvil (WebSocket): se recarga sin que el usuario refresque.
  onDestroy(alCambiarEjecuciones(() => $detalleEstacionId == null && cargar()));

  function conCalculos(i) {
    return {
      ...i,
      avanceAnio: porcentaje(i.cumple, i.programado),
      atrasadas: Math.max(0, (i.vencidas ?? 0) - (i.ejecutadasVencidas ?? 0)),
      impAnio: porcentaje(i.ejecutadoNoProgramado, i.ejecutadoTotal),
      semaforo: semaforoMes(i.cumpleMes ?? 0, i.programadoMes ?? 0, i.porcentajeMesTranscurrido),
      impMes: porcentaje(i.ejecutadoNoProgramadoMes ?? 0, i.ejecutadoTotalMes ?? 0),
    };
  }

  // Fila "Total": las mismas cuentas sobre la suma de todas las estaciones.
  $: total = filas.length
    ? conCalculos(
        filas.reduce(
          (t, f) => {
            for (const k of Object.keys(t)) t[k] += f[k] ?? 0;
            return t;
          },
          {
            programado: 0, cumple: 0, vencidas: 0, ejecutadasVencidas: 0, ejecutadoNoProgramado: 0, ejecutadoTotal: 0,
            programadoMes: 0, cumpleMes: 0, ejecutadoNoProgramadoMes: 0, ejecutadoTotalMes: 0,
          },
        ),
      )
    : null;
  $: totalSemaforo = total ? semaforoMes(total.cumpleMes, total.programadoMes, transcurrido) : null;
  $: hayMes = mes != null;
  $: if (!hayMes && vista === "mes") vista = "anio";
  $: cols = vista === "mes" ? colsMes : colsAnio;
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
        <h1 class="sub-title">
          {vista === "mes" ? `Avance de ${MESES_LARGOS[mes - 1]} ${anio}` : `Avance ${anio}`}
        </h1>
        <p class="sub-subtitle">
          {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} ·
          {#if vista === "mes"}
            va el {Math.round(Number(transcurrido ?? 0))}% del mes; el semáforo compara lo ejecutado con el tiempo
            que ha pasado
          {:else}
            citas ejecutadas de las programadas en el año
          {/if}
          · click en una estación para ver su detalle.
        </p>
      </div>
      <div class="controles">
        {#if hayMes}
          <div class="sub-seg" role="group" aria-label="Periodo">
            <button class:on={vista === "anio"} on:click={() => (vista = "anio")}>Año</button>
            <button class:on={vista === "mes"} on:click={() => (vista = "mes")}>Mes en curso</button>
          </div>
        {/if}
        <SelectorDisciplina on:change={cargar} />
      </div>
    </div>
    <div class="sub-card scroll-x" class:actualizando={recargando} style="--imp-c:{IMPREVISTO.c};--imp-bg:{IMPREVISTO.bg}">
      <div class="sub-th" style="grid-template-columns:{cols}">
        <span>Estación</span><span>Tipo</span>
        {#if vista === "mes"}
          <span>Citas del mes</span>
        {:else}
          <span>Avance del año</span>
          <span title="Citas de meses ya cerrados que no se ejecutaron">Atrasadas</span>
        {/if}
        <span title="Registros sin cita del cronograma, y qué parte son del total de registros">Imprevistos</span>
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
          {#if vista === "mes"}
            <span class="avance">
              <span class="num">{s.cumpleMes ?? 0} <span class="tenue">de {s.programadoMes ?? 0}</span></span>
              {#if s.semaforo}
                <span class="sub-badge" style="color:{s.semaforo.c};background:{s.semaforo.bg}">{s.semaforo.g} {s.semaforo.pct}% · {s.semaforo.l}</span>
              {:else}
                <span class="tenue">Sin citas este mes</span>
              {/if}
            </span>
            <span>
              {#if s.ejecutadoNoProgramadoMes}
                <span class="imp">{s.ejecutadoNoProgramadoMes} · {s.impMes}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {:else}
            <span class="avance">
              <span class="num">{s.cumple} <span class="tenue">de {s.programado}</span></span>
              {#if s.avanceAnio != null}
                <span class="barra" aria-hidden="true"><span style="width:{s.avanceAnio}%"></span></span>
                <span class="num pct">{s.avanceAnio}%</span>
              {:else}<span class="tenue">Sin citas</span>{/if}
            </span>
            <span class:tenue={!s.atrasadas}>{s.atrasadas}</span>
            <span>
              {#if s.ejecutadoNoProgramado}
                <span class="imp">{s.ejecutadoNoProgramado} · {s.impAnio}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {/if}
        </div>
      {:else}
        <div class="sub-empty">Sin estaciones activas.</div>
      {/each}
      {#if total && filas.length > 1}
        <div class="sub-tr total" style="grid-template-columns:{cols}">
          <span>Total · {filas.length} estaciones</span>
          <span></span>
          {#if vista === "mes"}
            <span class="avance">
              <span class="num">{total.cumpleMes} <span class="tenue">de {total.programadoMes}</span></span>
              {#if totalSemaforo}
                <span class="sub-badge" style="color:{totalSemaforo.c};background:{totalSemaforo.bg}">{totalSemaforo.g} {totalSemaforo.pct}% · {totalSemaforo.l}</span>
              {/if}
            </span>
            <span>{#if total.ejecutadoNoProgramadoMes}<span class="imp">{total.ejecutadoNoProgramadoMes} · {total.impMes}% del total</span>{:else}<span class="tenue">—</span>{/if}</span>
          {:else}
            <span class="avance">
              <span class="num">{total.cumple} <span class="tenue">de {total.programado}</span></span>
              {#if total.avanceAnio != null}
                <span class="barra" aria-hidden="true"><span style="width:{total.avanceAnio}%"></span></span>
                <span class="num pct">{total.avanceAnio}%</span>
              {/if}
            </span>
            <span class:tenue={!total.atrasadas}>{total.atrasadas}</span>
            <span>{#if total.ejecutadoNoProgramado}<span class="imp">{total.ejecutadoNoProgramado} · {total.impAnio}% del total</span>{:else}<span class="tenue">—</span>{/if}</span>
          {/if}
        </div>
      {/if}
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
  .controles {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
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
  .total {
    font-weight: 600;
    background: #fafaf8;
  }
  .avance {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .pct {
    min-width: 36px;
    color: #52514e;
  }
  /* Avance del año: barra neutra, da sensación de progreso sin juzgar (no es semáforo). */
  .barra {
    flex: 1;
    max-width: 120px;
    height: 6px;
    border-radius: 999px;
    background: #ececea;
    overflow: hidden;
  }
  .barra span {
    display: block;
    height: 100%;
    background: #3d3c39;
    border-radius: 999px;
  }
  .imp {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--imp-c);
    background: var(--imp-bg);
    white-space: nowrap;
  }
  .tenue {
    color: #898781;
  }
  .gris {
    color: #52514e;
  }
</style>
