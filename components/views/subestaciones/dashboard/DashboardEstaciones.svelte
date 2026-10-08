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
      transcurrido = r[0]?.porcentajeMesTranscurrido != null ? Number(r[0].porcentajeMesTranscurrido) : null;
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
      avanceMes: porcentaje(i.cumpleMes ?? 0, i.programadoMes ?? 0),
      atrasadas: Math.max(0, (i.vencidas ?? 0) - (i.ejecutadasVencidas ?? 0)),
      impAnio: porcentaje(i.ejecutadoNoProgramado, i.ejecutadoTotal),
      semaforo: semaforoMes(i.cumpleMes ?? 0, i.programadoMes ?? 0, i.porcentajeMesTranscurrido),
      impMes: porcentaje(i.ejecutadoNoProgramadoMes ?? 0, i.ejecutadoTotalMes ?? 0),
    };
  }

  // Resumen de todas las estaciones (tarjetas de arriba): mismas cuentas sobre la suma.
  const CAMPOS_SUMA = [
    "programado", "cumple", "vencidas", "ejecutadasVencidas", "ejecutadoNoProgramado", "ejecutadoTotal",
    "programadoMes", "cumpleMes", "ejecutadoNoProgramadoMes", "ejecutadoTotalMes",
  ];
  $: total = conCalculos({
    ...Object.fromEntries(CAMPOS_SUMA.map((k) => [k, filas.reduce((t, f) => t + (f[k] ?? 0), 0)])),
    porcentajeMesTranscurrido: transcurrido,
  });
  $: hayMes = mes != null;
  $: if (!hayMes && vista === "mes") vista = "anio";
  $: nombreMes = hayMes ? MESES_LARGOS[mes - 1] : "";
  // Día y días restantes del mes, derivados del % que manda el servidor (nunca la fecha del navegador).
  $: diasMes = hayMes ? new Date(anio, mes, 0).getDate() : 0;
  $: diaMes = hayMes ? Math.round(((transcurrido ?? 0) * diasMes) / 100) : 0;
  $: quedan = Math.max(0, diasMes - diaMes);
  $: pendientesMes = Math.max(0, total.programadoMes - total.cumpleMes);
  $: conCitasMes = filas.filter((f) => f.programadoMes);
  $: atrasadasMes = conCitasMes.filter((f) => f.semaforo && f.semaforo.l !== "Al día" && f.semaforo.l !== "Mes completo");
  // Columnas que se encogen: a 1024 px la tabla cabe completa (Imprevistos incluida).
  $: cols = vista === "mes"
    ? "minmax(140px,1fr) minmax(150px,1.4fr) minmax(150px,auto) 84px minmax(120px,auto)"
    : "minmax(150px,1fr) minmax(200px,1.6fr) 84px minmax(120px,auto)";
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
        <h1 class="sub-title">{vista === "mes" ? `Avance por estación · ${nombreMes} ${anio}` : `Avance por estación ${anio}`}</h1>
        <p class="sub-subtitle">
          {$disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas"} ·
          {#if vista === "mes"}
            va el {Math.round(transcurrido ?? 0)}% del mes; el semáforo compara lo ejecutado con el tiempo que ha pasado
          {:else}
            cuánto se ha hecho en cada estación de las citas del cronograma, sumando sus actividades
          {/if}
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

    <!-- Resumen de todas las estaciones: tarjetas propias de cada vista -->
    <div class="resumen" class:actualizando={recargando} style="--imp-c:{IMPREVISTO.c};--imp-bg:{IMPREVISTO.bg}">
      {#if vista === "mes"}
        <div class="sub-card tarjeta" data-kpi="mes">
          <div class="t-l">Avance de {nombreMes}</div>
          <div class="t-v">{total.cumpleMes} <span class="t-de">de {total.programadoMes} citas</span></div>
          <div class="barra grande" aria-hidden="true">
            <span style="width:{total.avanceMes ?? 0}%;background:{total.semaforo?.color ?? '#3d3c39'}"></span>
            <i class="marca" style="left:{transcurrido ?? 0}%"></i>
          </div>
          {#if total.semaforo}
            <span class="sub-badge" style="color:{total.semaforo.c};background:{total.semaforo.bg}">{total.semaforo.g} {total.semaforo.pct}% · {total.semaforo.l}</span>
          {:else}
            <span class="t-s">Sin citas este mes</span>
          {/if}
        </div>
        <div class="sub-card tarjeta" data-kpi="pendientes">
          <div class="t-l">Por ejecutar</div>
          <div class="t-v" class:tenue={!pendientesMes}>{pendientesMes}</div>
          <div class="t-s">{pendientesMes ? `citas pendientes · quedan ${quedan} días` : "todas las citas del mes hechas"}</div>
        </div>
        <div class="sub-card tarjeta" data-kpi="estaciones">
          <div class="t-l">Estaciones atrasadas</div>
          <div class="t-v" class:tenue={!atrasadasMes.length}>{atrasadasMes.length} <span class="t-de">de {conCitasMes.length}</span></div>
          <div class="t-s">con citas este mes, por detrás del tiempo</div>
        </div>
        <div class="sub-card tarjeta" data-kpi="imprevistos">
          <div class="t-l">Imprevistos de {nombreMes}</div>
          <div class="t-v imp-v" class:tenue={!total.ejecutadoNoProgramadoMes}>{total.ejecutadoNoProgramadoMes}</div>
          <div class="t-s">
            {total.impMes != null ? `${total.impMes}% de ${total.ejecutadoTotalMes} registros del mes` : "sin registros este mes"}
          </div>
        </div>
      {:else}
        <div class="sub-card tarjeta" data-kpi="anio">
          <div class="t-l">Avance {anio}</div>
          <div class="t-v">{total.avanceAnio != null ? `${total.avanceAnio}%` : "—"}</div>
          <div class="barra grande" aria-hidden="true"><span style="width:{total.avanceAnio ?? 0}%"></span></div>
          <div class="t-s">{total.cumple} de {total.programado} citas del año</div>
        </div>
        {#if hayMes}
          <div class="sub-card tarjeta" data-kpi="mes">
            <div class="t-l">{nombreMes} · mes en curso</div>
            <div class="t-v">{total.cumpleMes} <span class="t-de">de {total.programadoMes}</span></div>
            {#if total.semaforo}
              <span class="sub-badge" style="color:{total.semaforo.c};background:{total.semaforo.bg}">{total.semaforo.g} {total.semaforo.pct}% · {total.semaforo.l}</span>
            {:else}
              <span class="t-s">Sin citas este mes</span>
            {/if}
            <div class="t-s">va el {Math.round(transcurrido ?? 0)}% del mes</div>
          </div>
        {/if}
        <div class="sub-card tarjeta" data-kpi="atrasadas">
          <div class="t-l">Atrasadas</div>
          <div class="t-v" class:tenue={!total.atrasadas}>{total.atrasadas}</div>
          <div class="t-s">citas de meses cerrados sin ejecutar</div>
        </div>
        <div class="sub-card tarjeta" data-kpi="imprevistos">
          <div class="t-l">Imprevistos</div>
          <div class="t-v imp-v">{total.ejecutadoNoProgramado}</div>
          <div class="t-s">
            {total.impAnio != null ? `${total.impAnio}% de ${total.ejecutadoTotal} registros` : "sin registros todavía"}{hayMes ? ` · ${total.ejecutadoNoProgramadoMes} este mes` : ""}
          </div>
        </div>
      {/if}
    </div>

    <div class="sub-card tabla" class:actualizando={recargando} style="--imp-c:{IMPREVISTO.c};--imp-bg:{IMPREVISTO.bg}">
      <div class="sub-th" style="grid-template-columns:{cols}">
        <span>Estación</span>
        {#if vista === "mes"}
          <span title="La raya marca cuánto del mes ha pasado">Citas de {nombreMes}</span>
          <span>Estado</span>
          <span class="der">Pendientes</span>
        {:else}
          <span>Avance del año</span>
          <span class="der" title="Citas de meses ya cerrados que no se ejecutaron">Atrasadas</span>
        {/if}
        <span class="der" title="Registros sin cita del cronograma y qué parte son del total de registros">Imprevistos</span>
      </div>
      {#each filas as s (s.estacionId)}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="sub-tr clickable" style="grid-template-columns:{cols}" role="button" tabindex="0"
          title="Ver detalle de estación" on:click={() => detalleEstacionId.set(s.estacionId)}
          on:keydown={(e) => e.key === "Enter" && detalleEstacionId.set(s.estacionId)}>
          <span class="estacion">
            <span class="nombre">
              {s.estacionNombre}
              {#if s.activa === false}<span class="sub-badge neu inactiva" title="Desactivada: se muestra por las citas o registros que tuvo este año">Inactiva</span>{/if}
            </span>
            <span class="tipo">{tipoLabel(s.estacionTipo)}</span>
          </span>

          {#if vista === "mes"}
            {#if s.programadoMes}
              <span class="avance">
                <span class="num cuenta">{s.cumpleMes} <span class="tenue">de {s.programadoMes}</span></span>
                <span class="barra" aria-hidden="true">
                  <span style="width:{s.avanceMes}%;background:{s.semaforo.color}"></span>
                  <i class="marca" style="left:{transcurrido ?? 0}%"></i>
                </span>
              </span>
              <span><span class="sub-badge estado" style="color:{s.semaforo.c};background:{s.semaforo.bg}">{s.semaforo.g} {s.semaforo.pct}% · {s.semaforo.l}</span></span>
              <span class="der num" class:tenue={s.programadoMes === s.cumpleMes}>{s.programadoMes - s.cumpleMes}</span>
            {:else}
              <span class="tenue">Sin citas este mes</span>
              <span></span>
              <span class="der tenue">—</span>
            {/if}
            <span class="der">
              {#if s.ejecutadoNoProgramadoMes}
                <span class="imp">{s.ejecutadoNoProgramadoMes} · {s.impMes}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {:else}
            <span class="avance">
              {#if s.programado}
                <span class="num cuenta">{s.cumple} <span class="tenue">de {s.programado}</span></span>
                <span class="barra" aria-hidden="true"><span style="width:{s.avanceAnio}%"></span></span>
                <span class="num pct">{s.avanceAnio}%</span>
              {:else}
                <span class="tenue">Sin citas en {anio}</span>
              {/if}
            </span>
            <span class="der num" class:tenue={!s.atrasadas}>{s.atrasadas}</span>
            <span class="der">
              {#if s.ejecutadoNoProgramado}
                <span class="imp">{s.ejecutadoNoProgramado} · {s.impAnio}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {/if}
        </div>
      {:else}
        <div class="sub-empty">Sin estaciones activas.</div>
      {/each}
    </div>
    <p class="pie">Click en una estación para ver su detalle. Los imprevistos son registros sin cita del cronograma: no suman al avance.</p>
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
  .actualizando {
    opacity: 0.55;
    pointer-events: none;
  }

  /* Tarjetas resumen */
  .resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
    transition: opacity 0.15s;
  }
  .tarjeta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 16px 20px;
  }
  .t-l {
    font-size: 12px;
    color: #898781;
  }
  .t-v {
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .t-de {
    font-size: 15px;
    font-weight: 500;
    color: #898781;
  }
  .t-s {
    font-size: 12px;
    color: #52514e;
  }
  .imp-v {
    color: var(--imp-c);
  }

  /* Tabla */
  .tabla {
    overflow-x: auto;
    transition: opacity 0.15s;
  }
  .sub-th,
  .sub-tr {
    min-width: 640px;
    column-gap: 16px;
    align-items: center;
  }
  .der {
    text-align: right;
    justify-self: end;
  }
  .estacion {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .nombre {
    font-weight: 600;
  }
  .tipo {
    font-size: 12px;
    color: #898781;
  }
  .avance {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .cuenta {
    min-width: 58px;
  }
  .pct {
    min-width: 40px;
    text-align: right;
    font-weight: 600;
  }
  .estado {
    white-space: nowrap;
  }
  /* Barra de avance: neutra en el año (sensación de progreso, no juicio); en el mes toma el
     color del semáforo y una raya marca cuánto del mes ha pasado. */
  .barra {
    position: relative;
    flex: 1;
    min-width: 80px;
    height: 8px;
    border-radius: 999px;
    background: #ececea;
  }
  .barra > span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: #3d3c39;
  }
  .barra.grande {
    align-self: stretch;
    flex: none;
  }
  .marca {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: #0b0b0b;
    opacity: 0.45;
    border-radius: 1px;
  }
  .imp {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--imp-c);
    background: var(--imp-bg);
    white-space: nowrap;
  }
  .tenue {
    color: #898781;
  }
  .pie {
    margin: 0;
    font-size: 12px;
    color: #898781;
  }
</style>
