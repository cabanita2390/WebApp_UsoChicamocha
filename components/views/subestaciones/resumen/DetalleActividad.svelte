<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { ejecucionesFiltroInicial, subestacionesActiveTab, detalleEstacionId, anioDetalle } from "../../../../stores/subestacionesFilters.js";
  import { alCambiarEjecuciones } from "../../../../stores/subestacionesEventos.js";
  import { MESES, MESES_LARGOS, disciplinaLabel } from "../../../../config/subestaciones.js";
  import { BADGE, IMPREVISTO, RESULTADO, estadoCita, fechaCorta, porcentaje, semaforoMes, aniosParaSelector } from "../../../../utils/cronograma.js";
  import { tipoMantenimientoLabel } from "../../../../config/table-definitions/substation.js";
  import Loader from "../../../shared/Loader.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import SubestacionEjecucionDetalleModal from "../../../shared/SubestacionEjecucionDetalleModal.svelte";

  export let actividadId;
  export let anioInicial;
  export let anioActual;

  const dispatch = createEventDispatcher();
  const TAM_PAGINA = 20;

  // El año que se estaba viendo (también si se llegó desde el detalle de una estación).
  let anio = get(anioDetalle) ?? anioInicial;
  let hoy = null;
  let actividad = null;
  let resumen = null;
  let porEstacion = [];
  let registros = [];
  let imprevistos = [];
  /** Total del año (la lista trae hasta 50; si hay más, se avisa). */
  let totalImprevistos = 0;
  let totalRegistros = 0;
  let pagina = 0;
  let cargando = true;
  let cargandoMas = false;
  let errorCarga = "";

  let detalle = null;
  let detalleCargando = false;
  let mostrarDetalle = false;

  // Solo se aplica la respuesta de la última carga (cambios de año seguidos).
  let secuencia = 0;

  async function cargar() {
    const mia = ++secuencia;
    const pedido = anio;
    cargando = true;
    errorCarga = "";
    try {
      const [filas, actividades, estaciones, cron, ejec, fuera] = await Promise.all([
        substationAdmin.resumenPorActividad(pedido),
        substationAdmin.listarActividades(),
        substationAdmin.listarEstaciones(),
        substationAdmin.obtenerCronograma(pedido),
        substationAdmin.ejecucionesDeActividad(actividadId, pedido, 0, TAM_PAGINA),
        substationAdmin.noProgramadasDeActividad(actividadId, pedido),
      ]);
      if (mia !== secuencia) return;
      actividad = actividades.find((a) => a.id === actividadId) ?? null;
      resumen = filas.find((f) => f.actividadId === actividadId) ?? null;
      hoy = { anioActual: cron.anioActual, mesActual: cron.mesActual };
      imprevistos = fuera?.content ?? [];
      totalImprevistos = fuera?.totalElements ?? imprevistos.length;
      porEstacion = agruparPorEstacion(cron.citas, estaciones, imprevistos);
      registros = ejec?.content ?? [];
      totalRegistros = ejec?.totalElements ?? registros.length;
      pagina = 0;
    } catch (e) {
      if (mia !== secuencia) return;
      // Si ya hay datos en pantalla (cambio de año), se conservan y se avisa.
      if (actividad) flash(e.message, { error: true });
      else errorCarga = e.message;
    } finally {
      if (mia === secuencia) cargando = false;
    }
  }
  cargar();

  // Años con datos para el selector (si no llega, actual y anterior: no bloquea la vista).
  let infoAnios = null;
  Promise.resolve()
    .then(() => substationAdmin.aniosCronograma())
    .then((r) => (infoAnios = r))
    .catch(() => {});
  $: opcionesAnio = aniosParaSelector(infoAnios, anioActual, "consulta", anio);

  // Llegó una ejecución del móvil (WebSocket): se recarga (puede ser de esta actividad).
  onDestroy(alCambiarEjecuciones(() => cargar()));

  /**
   * Solo lo publicado (lo que ve el móvil), como el Detalle por estación. Una estación sin citas
   * de la actividad pero con imprevistos también sale: lo hecho ahí no debe quedar oculto.
   */
  function agruparPorEstacion(citas, estaciones, fuera) {
    const nombres = new Map(estaciones.map((s) => [s.id, s.nombre]));
    const grupos = new Map();
    const grupo = (id) => {
      if (!grupos.has(id)) grupos.set(id, { citas: [], imprevistos: [] });
      return grupos.get(id);
    };
    for (const c of citas) {
      if (c.actividadId === actividadId && c.estado === "PUBLICADA") grupo(c.estacionId).citas.push(c);
    }
    for (const e of fuera) if (e.estacionId != null) grupo(e.estacionId).imprevistos.push(e);
    return [...grupos.entries()]
      .map(([estacionId, g]) => ({ estacionId, nombre: nombres.get(estacionId) ?? `Estación ${estacionId}`, ...g }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async function cargarMas() {
    cargandoMas = true;
    const mia = secuencia;
    try {
      const r = await substationAdmin.ejecucionesDeActividad(actividadId, anio, pagina + 1, TAM_PAGINA);
      if (mia !== secuencia) return;
      // Si alguien registró una ejecución entre página y página, la paginación se corre y
      // puede repetir filas: se agregan solo las que no están.
      const ya = new Set(registros.map((x) => x.id));
      registros = [...registros, ...(r?.content ?? []).filter((x) => !ya.has(x.id))];
      totalRegistros = r?.totalElements ?? totalRegistros;
      pagina += 1;
    } catch (e) {
      flash(e.message, { error: true });
    } finally {
      cargandoMas = false;
    }
  }

  function cambiarAnio(e) {
    anio = Number(e.target.value);
    anioDetalle.set(anio);
    cargar();
  }

  function volver() {
    anioDetalle.set(null);
    dispatch("volver");
  }

  function irAEjecuciones(extra = {}) {
    ejecucionesFiltroInicial.set({ actividadId, fechaInicio: `${anio}-01-01`, fechaFin: `${anio}-12-31`, ...extra });
    subestacionesActiveTab.set("ejecuciones");
  }

  /** Enlace cruzado: la estación abre su Detalle en la pestaña Dashboard. */
  function verEstacion(id) {
    anioDetalle.set(anio); // el detalle de la estación abre en el mismo año
    detalleEstacionId.set(id);
    subestacionesActiveTab.set("dashboard");
  }

  /** Una cita ejecutada abre directamente su registro (con fotos). */
  async function abrirEjecucionDeCita(programacionId) {
    mostrarDetalle = true;
    detalleCargando = true;
    detalle = null;
    try {
      detalle = await substationAdmin.ejecucionDeCita(programacionId);
    } catch (e) {
      flash(e.message, { error: true });
      mostrarDetalle = false;
    } finally {
      detalleCargando = false;
    }
  }

  async function abrirEjecucion(id) {
    mostrarDetalle = true;
    detalleCargando = true;
    detalle = null;
    try {
      detalle = await substationAdmin.obtenerEjecucion(id);
    } catch (e) {
      flash(e.message, { error: true });
      mostrarDetalle = false;
    } finally {
      detalleCargando = false;
    }
  }

  const ESTADO = {
    ok: { ...BADGE.ok, g: "✓", l: "Ejecutada" },
    bad: { ...BADGE.bad, g: "✕", l: "No ejecutada" },
    actual: { ...BADGE.warn, g: "⧗", l: "En curso" },
    pen: { c: "#52514e", bg: "#fff", g: "○", l: "Programada" },
  };

  function estadoMes(c) {
    const e = estadoCita(c, anio, hoy);
    if (e === "pen" && anio === hoy.anioActual && c.mes === hoy.mesActual) return ESTADO.actual;
    return ESTADO[e];
  }

  // Avance del año: neutro, sin semáforo (da sensación de progreso). El semáforo es solo del mes.
  $: avance = resumen ? porcentaje(resumen.cumple ?? 0, resumen.programadoAnual) : null;
  $: atrasadas = resumen ? Math.max(0, resumen.vencidas - resumen.ejecutadasVencidas) : 0;
  $: semaforo = resumen?.mes != null
    ? semaforoMes(resumen.cumpleMes, resumen.programadoMes, resumen.porcentajeMesTranscurrido)
    : null;
  $: impAnio = resumen ? porcentaje(resumen.ejecutadoNoProgramado, resumen.ejecutadoTotal) : null;
  $: kpis = resumen
    ? [
        {
          l: "Avance del año",
          v: `${resumen.cumple ?? 0} de ${resumen.programadoAnual}`,
          s: atrasadas ? `${atrasadas} atrasada${atrasadas === 1 ? "" : "s"} de meses cerrados` : "sin atrasos de meses cerrados",
          c: "#0b0b0b",
        },
        resumen.mes != null
          ? {
              l: `${MESES_LARGOS[resumen.mes - 1]} (mes en curso)`,
              v: `${resumen.cumpleMes} de ${resumen.programadoMes}`,
              s: semaforo ? `${semaforo.g} ${semaforo.pct}% · ${semaforo.l}` : "sin citas este mes",
              c: "#0b0b0b",
              sc: semaforo?.color,
            }
          : {
              l: "Mes en curso",
              v: "—",
              s: hoy && anio !== hoy.anioActual ? `${anio} no es el año actual` : "sin datos del mes",
              c: "#898781",
            },
        {
          l: "Imprevistos",
          v: resumen.ejecutadoNoProgramado,
          s: resumen.ejecutadoNoProgramado
            ? `${impAnio}% de ${resumen.ejecutadoTotal} registros` +
              (resumen.mes != null ? ` · ${resumen.ejecutadoNoProgramadoMes} este mes` : "")
            : "todo lo hecho estaba programado",
          c: resumen.ejecutadoNoProgramado ? IMPREVISTO.c : "#0b0b0b",
        },
        { l: "Registros del año", v: resumen.ejecutadoTotal, s: `${resumen.mantenimiento} mantenimiento · ${resumen.inspeccion} inspección`, c: "#0b0b0b" },
      ]
    : [];
  $: filasEstacion = hoy
    ? porEstacion.map((g) => {
        return {
          ...g,
          meses: MESES.map((m, i) => {
            const c = g.citas.find((x) => x.mes === i + 1);
            // Imprevistos del mes (por la fecha del registro), en terracota junto a lo programado.
            const imp = g.imprevistos.filter((e) => Number(e.fecha?.slice(5, 7)) === i + 1);
            return { m, i, e: c ? estadoMes(c) : null, fecha: c?.fechaEjecucion, citaId: c?.tieneEjecucion ? c.id : null, imp };
          }),
          // Avance de la estación: citas ejecutadas de todas las del año (como el Dashboard).
          ejecutadas: g.citas.filter((c) => c.tieneEjecucion).length,
          programadas: g.citas.length,
        };
      })
    : [];
</script>

<div class="volver-fila">
  <button class="sub-btn volver" on:click={volver}>← Volver al Resumen</button>
  <span class="gris">Detalle por actividad</span>
</div>

{#if cargando && !actividad}
  <div class="cargando"><Loader /></div>
{:else if errorCarga}
  <ErrorCarga que="los registros de la actividad" mensaje={errorCarga} on:reintentar={cargar} />
{:else if actividad}
  <div class="contenido" class:actualizando={cargando}>
    <div class="sub-card scroll-x">
      <div class="cabecera">
        <div>
          <h1 class="nombre">{actividad.nombre}</h1>
          <div class="gris2">
            {disciplinaLabel(actividad.disciplina)} · {resumen?.estaciones
              ? `en ${resumen.estaciones} ${resumen.estaciones === 1 ? "estación" : "estaciones"} del cronograma`
              : "sin citas en el cronograma"}{actividad.capturaMovilHabilitada ? "" : " · Sin captura desde el móvil"}{actividad.activa
              ? ""
              : " · Inactiva"}
          </div>
        </div>
        <div class="derecha">
          <select class="anio" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
            {#each opcionesAnio as y}<option value={String(y)}>{y}</option>{/each}
          </select>
          <div class="pct-box">
            <div class="gris">Avance {anio}</div>
            <div class="pct">{avance != null ? `${avance}%` : "—"}</div>
            {#if avance != null}
              <div class="barra-avance" aria-hidden="true"><span style="width:{avance}%"></span></div>
            {/if}
            <div class="gris">{resumen?.programadoAnual ? `${resumen.cumple ?? 0} de ${resumen.programadoAnual} citas` : "Sin citas"}</div>
          </div>
        </div>
      </div>
      {#if kpis.length}
        <div class="kpis">
          {#each kpis as k}
            <div class="kpi">
              <div class="gris">{k.l}</div>
              <div class="kv" style="color:{k.c}">{k.v}</div>
              <div class="ks" style={k.sc ? `color:${k.sc}` : ""}>{k.s}</div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="sub-empty">La actividad está inactiva: no tiene resumen para {anio}.</div>
      {/if}
    </div>

    <div class="seccion">Año {anio} · Programado vs. ejecutado por estación <span class="leyenda-imp" style="color:{IMPREVISTO.c};background:{IMPREVISTO.bg}">＋ imprevisto</span></div>
    <p class="leyenda">
      ✓ ejecutada · ✕ no se ejecutó (mes ya cerrado) · ⧗ en curso (mes actual) · ○ programada, todavía a tiempo · ＋ imprevisto
      (click para verlo) · Click en una estación para ver su detalle.
    </p>
    <div class="sub-card scroll-x">
      <div class="est est-h">
        <span>Estación</span>
        {#each MESES as m}<span class="mes-h">{m}</span>{/each}
        <span class="der">Avance</span>
      </div>
      {#each filasEstacion as f (f.estacionId)}
        <div class="est">
          <button class="est-n enlace" title="Ver el detalle de {f.nombre}" on:click={() => verEstacion(f.estacionId)}>{f.nombre}</button>
          {#each f.meses as x (x.i)}
            <span class="mes">
              {#if x.e && x.citaId}
                <button class="punto" style="color:{x.e.c};background:{x.e.bg}" on:click={() => abrirEjecucionDeCita(x.citaId)}
                  title="{MESES_LARGOS[x.i]} · {x.e.l}{x.fecha ? ` ${fechaCorta(x.fecha)}` : ''} · ver el registro">{x.e.g}</button>
              {:else if x.e}
                <span class="punto" style="color:{x.e.c};background:{x.e.bg}"
                  title="{MESES_LARGOS[x.i]} · {x.e.l}{x.fecha ? ` ${fechaCorta(x.fecha)}` : ''}">{x.e.g}</span>
              {/if}
              {#each x.imp as e (e.id)}
                <button class="punto imp" style="color:{IMPREVISTO.c};background:{IMPREVISTO.bg}"
                  title="Imprevisto · {fechaCorta(e.fecha)} · no suma al avance" on:click={() => abrirEjecucion(e.id)}>＋</button>
              {/each}
            </span>
          {/each}
          {#if f.programadas}
            <span class="der num">{f.ejecutadas} <span class="gris">de {f.programadas}</span></span>
          {:else}
            <span class="der gris" title="Solo tiene imprevistos de esta actividad">sin citas</span>
          {/if}
        </div>
      {:else}
        <div class="sub-empty">Sin citas publicadas ni imprevistos de esta actividad en {anio}.</div>
      {/each}
    </div>

    <div class="sub-card scroll-x">
      <div class="card-t entre">
        <span><span class="punto-imp" style="background:{IMPREVISTO.c}"></span>Imprevistos · fuera de cronograma
          <span class="normal">· {anio} · {totalImprevistos} {totalImprevistos === 1 ? "registro" : "registros"} · no suman al avance</span></span>
        {#if imprevistos.length}
          <button class="sub-link" on:click={() => irAEjecuciones({ esProgramada: false })}>Ver en Ejecuciones →</button>
        {/if}
      </div>
      {#each imprevistos as e (e.id)}
        {@const rb = RESULTADO[e.resultado] ?? RESULTADO.CONFORME}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="ej" role="button" tabindex="0" on:click={() => abrirEjecucion(e.id)}
          on:keydown={(ev) => ev.key === "Enter" && abrirEjecucion(e.id)}>
          <span class="gris2 num">{fechaCorta(e.fecha)}</span>
          <span>{e.estacionNombre ?? ""}</span>
          <span class="gris2 tipo">{tipoMantenimientoLabel(e.tipoMantenimiento)}</span>
          <span><span class="sub-badge" style="color:{rb.c};background:{rb.bg}">{rb.g} {rb.l}</span></span>
          <span class="gris2 num">{e.evidencias?.length ?? 0} foto(s)</span>
          <span class="gris2">{e.responsable ?? ""}</span>
        </div>
      {:else}
        <div class="sub-empty">Sin imprevistos en {anio}: todo lo hecho de esta actividad estaba programado.</div>
      {/each}
      {#if totalImprevistos > imprevistos.length}
        <div class="mas-aviso">
          Mostrando los {imprevistos.length} más recientes de {totalImprevistos} ·
          <button class="sub-link" on:click={() => irAEjecuciones({ esProgramada: false })}>ver todos en Ejecuciones →</button>
        </div>
      {/if}
    </div>

    <div class="seccion">Registros de {anio}</div>
    <div class="sub-card scroll-x">
      <div class="card-t entre">
        <span>{totalRegistros} {totalRegistros === 1 ? "registro" : "registros"} <span class="normal">· click para ver detalle y fotos</span></span>
        <button class="sub-link" on:click={() => irAEjecuciones()}>Ver todas en Ejecuciones →</button>
      </div>
      {#each registros as e (e.id)}
        {@const rb = RESULTADO[e.resultado] ?? RESULTADO.CONFORME}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="ej" role="button" tabindex="0" on:click={() => abrirEjecucion(e.id)}
          on:keydown={(ev) => ev.key === "Enter" && abrirEjecucion(e.id)}>
          <span class="gris2 num">{fechaCorta(e.fecha)}</span>
          <span>{e.estacionNombre ?? ""}</span>
          <span class="gris2 tipo">
            {tipoMantenimientoLabel(e.tipoMantenimiento)}{#if !e.esProgramada}<span class="fuera" style="color:{IMPREVISTO.c};background:{IMPREVISTO.bg}" title="Registro sin cita del cronograma: no suma al avance">Imprevisto</span>{/if}
          </span>
          <span><span class="sub-badge" style="color:{rb.c};background:{rb.bg}">{rb.g} {rb.l}</span></span>
          <!-- Estado del seguimiento (Abierto/En proceso/Resuelto) oculto: todavía no tiene flujo. -->
          <span class="gris2 num">{e.evidencias?.length ?? 0} foto(s)</span>
          <span class="gris2">{e.responsable ?? ""}</span>
        </div>
      {:else}
        <div class="sub-empty">Sin registros de esta actividad en {anio}.</div>
      {/each}
      {#if registros.length < totalRegistros}
        <div class="mas">
          <button class="sub-btn" disabled={cargandoMas} on:click={cargarMas}>
            {cargandoMas ? "Cargando…" : `Cargar más (${registros.length} de ${totalRegistros})`}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if mostrarDetalle}
  <SubestacionEjecucionDetalleModal ejecucion={detalle} isLoading={detalleCargando} on:close={() => (mostrarDetalle = false)} />
{/if}

<style>
  .contenido {
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: opacity 0.15s;
  }
  .contenido > :global(*) {
    flex-shrink: 0;
  }
  .contenido.actualizando {
    opacity: 0.55;
    pointer-events: none;
  }
  .volver-fila {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .volver {
    padding: 7px 16px;
  }
  .gris {
    font-size: 12px;
    color: #898781;
  }
  .gris2 {
    font-size: 13px;
    color: #52514e;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .scroll-x {
    overflow-x: auto;
  }
  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
    padding: 20px 22px;
  }
  .nombre {
    margin: 2px 0 4px;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }
  .derecha {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .anio {
    height: 34px;
    min-width: 96px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
  }
  .pct-box {
    text-align: right;
  }
  .barra-avance {
    width: 140px;
    height: 6px;
    margin: 4px 0 4px auto;
    border-radius: 999px;
    background: #ececea;
    overflow: hidden;
  }
  .barra-avance span {
    display: block;
    height: 100%;
    background: #3d3c39;
    border-radius: 999px;
  }
  .pct {
    font-size: 30px;
    font-weight: 650;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .kpi {
    padding: 14px 22px;
    border-right: 1px solid rgba(11, 11, 11, 0.06);
  }
  .kv {
    font-size: 22px;
    font-weight: 650;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .ks {
    font-size: 11.5px;
    color: #898781;
  }
  .seccion {
    font-size: 12px;
    font-weight: 600;
    color: #898781;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-top: 6px;
  }
  .card-t {
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 600;
    border-bottom: 1px solid rgba(11, 11, 11, 0.06);
  }
  .card-t.entre {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .card-t .sub-link {
    font-size: 13px;
    font-weight: 400;
  }
  .normal {
    font-weight: 400;
    color: #898781;
  }
  .est {
    display: grid;
    min-width: 820px;
    grid-template-columns: minmax(160px, 1.6fr) repeat(12, minmax(36px, 1fr)) 110px;
    align-items: center;
    padding: 7px 18px;
    font-size: 13px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
  }
  .est-h {
    font-size: 12px;
    font-weight: 600;
    color: #898781;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .est-n {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mes-h,
  .mes {
    text-align: center;
  }
  .punto {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid rgba(11, 11, 11, 0.08);
  }
  .der {
    text-align: right;
  }
  button.punto {
    cursor: pointer;
    padding: 0;
  }
  button.punto.imp {
    margin-left: 2px;
    border-color: transparent;
  }
  .leyenda-imp {
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }
  .punto-imp {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    vertical-align: middle;
  }
  .leyenda {
    margin: -10px 0 0;
    font-size: 12px;
    color: #898781;
  }
  .enlace {
    all: unset;
    cursor: pointer;
    text-align: left;
  }
  .enlace:hover {
    color: #2a78d6;
    text-decoration: underline;
  }
  .enlace:focus-visible {
    outline: 2px solid #2a78d6;
    outline-offset: 2px;
  }
  .est-n.enlace {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ej {
    display: grid;
    min-width: 820px;
    grid-template-columns: 96px minmax(0, 1.2fr) 230px 176px 80px minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    padding: 9px 18px;
    font-size: 13px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
    cursor: pointer;
  }
  .tipo {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .fuera {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 999px;
  }
  .ej:hover {
    background: #fafaf9;
  }
  .mas {
    display: flex;
    justify-content: center;
    padding: 12px;
  }
  .mas-aviso {
    padding: 10px 18px;
    font-size: 12px;
    color: #898781;
  }
</style>
