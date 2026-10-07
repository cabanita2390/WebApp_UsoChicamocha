<script>
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { ejecucionesFiltroInicial, subestacionesActiveTab, detalleEstacionId } from "../../../../stores/subestacionesFilters.js";
  import { MESES, MESES_LARGOS, disciplinaLabel } from "../../../../config/subestaciones.js";
  import { BADGE, RESULTADO, SEGUIMIENTO, estadoCita, mesCerrado, pctBadge, fechaCorta } from "../../../../utils/cronograma.js";
  import { tipoMantenimientoLabel } from "../../../../config/table-definitions/substation.js";
  import Loader from "../../../shared/Loader.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import SubestacionEjecucionDetalleModal from "../../../shared/SubestacionEjecucionDetalleModal.svelte";

  export let actividadId;
  export let anioInicial;
  export let anioActual;

  const dispatch = createEventDispatcher();
  const TAM_PAGINA = 20;

  let anio = anioInicial;
  let hoy = null;
  let actividad = null;
  let resumen = null;
  let porEstacion = [];
  let registros = [];
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
      const [filas, actividades, estaciones, cron, ejec] = await Promise.all([
        substationAdmin.resumenPorActividad(pedido),
        substationAdmin.listarActividades(),
        substationAdmin.listarEstaciones(),
        substationAdmin.obtenerCronograma(pedido),
        substationAdmin.ejecucionesDeActividad(actividadId, pedido, 0, TAM_PAGINA),
      ]);
      if (mia !== secuencia) return;
      actividad = actividades.find((a) => a.id === actividadId) ?? null;
      resumen = filas.find((f) => f.actividadId === actividadId) ?? null;
      hoy = { anioActual: cron.anioActual, mesActual: cron.mesActual };
      porEstacion = agruparPorEstacion(cron.citas, estaciones);
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

  /** Solo lo publicado (lo que ve el móvil), como el Detalle por estación. */
  function agruparPorEstacion(citas, estaciones) {
    const nombres = new Map(estaciones.map((s) => [s.id, s.nombre]));
    const grupos = new Map();
    for (const c of citas) {
      if (c.actividadId !== actividadId || c.estado !== "PUBLICADA") continue;
      if (!grupos.has(c.estacionId)) grupos.set(c.estacionId, []);
      grupos.get(c.estacionId).push(c);
    }
    return [...grupos.entries()]
      .map(([estacionId, cs]) => ({ estacionId, nombre: nombres.get(estacionId) ?? `Estación ${estacionId}`, citas: cs }))
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
    cargar();
  }

  function irAEjecuciones() {
    ejecucionesFiltroInicial.set({ actividadId, fechaInicio: `${anio}-01-01`, fechaFin: `${anio}-12-31` });
    subestacionesActiveTab.set("ejecuciones");
  }

  /** Enlace cruzado: la estación abre su Detalle en la pestaña Dashboard. */
  function verEstacion(id) {
    detalleEstacionId.set(id);
    subestacionesActiveTab.set("dashboard");
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
    actual: { ...BADGE.warn, g: "◐", l: "En curso" },
    pen: { c: "#52514e", bg: "#fff", g: "○", l: "Programada" },
  };

  function estadoMes(c) {
    const e = estadoCita(c, anio, hoy);
    if (e === "pen" && anio === hoy.anioActual && c.mes === hoy.mesActual) return ESTADO.actual;
    return ESTADO[e];
  }

  $: pct = resumen?.porcentajeCumplimiento != null ? Math.round(Number(resumen.porcentajeCumplimiento)) : null;
  $: pc = pct != null ? pctBadge(pct) : { color: "#898781", c: "#52514e", bg: "#f0f0ee", g: "", l: "Sin citas vencidas" };
  $: kpis = resumen
    ? [
        { l: "Citas programadas", v: resumen.programadoAnual, s: `${resumen.vencidas} vencidas a la fecha` },
        { l: "Ejecutadas", v: resumen.ejecutadasVencidas, s: `de ${resumen.vencidas} vencidas` },
        { l: "Registros del año", v: resumen.ejecutadoTotal, s: `${resumen.mantenimiento} mantenimiento · ${resumen.inspeccion} inspección` },
        { l: "Fuera de cronograma", v: resumen.ejecutadoNoProgramado, s: "registros sin cita asociada" },
      ]
    : [];
  $: filasEstacion = hoy
    ? porEstacion.map((g) => {
        // Misma fórmula del backend: solo cuentan los meses cerrados (una cita futura
        // ejecutada antes de tiempo se ve ✓ pero todavía no suma al cumplimiento).
        const vencidas = g.citas.filter((c) => mesCerrado(anio, c.mes, hoy));
        return {
          ...g,
          meses: MESES.map((m, i) => {
            const c = g.citas.find((x) => x.mes === i + 1);
            return {
              m, i, e: c ? estadoMes(c) : null, fecha: c?.fechaEjecucion,
              // Ejecutada en un mes que aún no cierra: se ve ✓ pero todavía no suma al %.
              noCuenta: !!c?.tieneEjecucion && !mesCerrado(anio, c.mes, hoy),
            };
          }),
          ejecutadas: vencidas.filter((c) => c.tieneEjecucion).length,
          vencidas: vencidas.length,
        };
      })
    : [];
</script>

<div class="volver-fila">
  <button class="sub-btn volver" on:click={() => dispatch("volver")}>← Volver al Resumen</button>
  <span class="gris">Registros por actividad</span>
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
            {disciplinaLabel(actividad.disciplina)} · {actividad.capturaMovilHabilitada
              ? "Captura desde el móvil habilitada"
              : "Sin captura desde el móvil"}{actividad.activa ? "" : " · Inactiva"}
          </div>
        </div>
        <div class="derecha">
          <select class="anio" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
            {#each [anioActual, anioActual - 1] as y}<option value={String(y)}>{y}</option>{/each}
          </select>
          <div class="pct-box">
            <div class="gris">Cumplimiento {anio}</div>
            <div class="pct" style="color:{pc.color}">{pct != null ? `${pct}%` : "—"}</div>
            <span class="sub-badge" style="color:{pc.c};background:{pc.bg}">{pc.g} {pc.l}</span>
          </div>
        </div>
      </div>
      {#if kpis.length}
        <div class="kpis">
          {#each kpis as k}
            <div class="kpi">
              <div class="gris">{k.l}</div>
              <div class="kv">{k.v}</div>
              <div class="ks">{k.s}</div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="sub-empty">La actividad está inactiva: no tiene resumen para {anio}.</div>
      {/if}
    </div>

    <div class="seccion">Año {anio} · Por estación</div>
    <div class="sub-card scroll-x">
      <div class="est est-h">
        <span>Estación</span>
        {#each MESES as m}<span class="mes-h">{m}</span>{/each}
        <span class="der">Ejecutadas</span>
      </div>
      {#each filasEstacion as f (f.estacionId)}
        <div class="est">
          <button class="est-n enlace" title="Ver el detalle de {f.nombre}" on:click={() => verEstacion(f.estacionId)}>{f.nombre}</button>
          {#each f.meses as x (x.i)}
            <span class="mes">
              {#if x.e}
                <span class="punto" style="color:{x.e.c};background:{x.e.bg}"
                  title="{MESES_LARGOS[x.i]} · {x.e.l}{x.fecha ? ` ${fechaCorta(x.fecha)}` : ''}{x.noCuenta ? ' · aún no suma al %' : ''}">{x.e.g}</span>
              {/if}
            </span>
          {/each}
          <span class="der num">{f.ejecutadas} <span class="gris">de {f.vencidas}</span></span>
        </div>
      {:else}
        <div class="sub-empty">Sin citas publicadas de esta actividad en {anio}.</div>
      {/each}
    </div>
    <p class="leyenda">
      ✓ ejecutada · ✕ no ejecutada · ◐ mes en curso · ○ programada — “Ejecutadas” y el % solo cuentan meses
      ya cerrados; una cita hecha por adelantado se ve ✓ pero suma cuando su mes termine.
    </p>

    <div class="seccion">Registros de {anio}</div>
    <div class="sub-card scroll-x">
      <div class="card-t entre">
        <span>{totalRegistros} {totalRegistros === 1 ? "registro" : "registros"} <span class="normal">· click para ver detalle y fotos</span></span>
        <button class="sub-link" on:click={irAEjecuciones}>Ver en Ejecuciones y Hallazgos →</button>
      </div>
      {#each registros as e (e.id)}
        {@const rb = RESULTADO[e.resultado] ?? RESULTADO.CONFORME}
        {@const sb = e.seguimiento ? SEGUIMIENTO[e.seguimiento.estado] : null}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="ej" role="button" tabindex="0" on:click={() => abrirEjecucion(e.id)}
          on:keydown={(ev) => ev.key === "Enter" && abrirEjecucion(e.id)}>
          <span class="gris2 num">{fechaCorta(e.fecha)}</span>
          <span>{e.estacionNombre ?? ""}</span>
          <span class="gris2 tipo">
            {tipoMantenimientoLabel(e.tipoMantenimiento)}{#if !e.esProgramada}<span class="fuera" title="Registro sin cita del cronograma">Fuera de cronograma</span>{/if}
          </span>
          <span><span class="sub-badge" style="color:{rb.c};background:{rb.bg}">{rb.g} {rb.l}</span></span>
          <span>{#if sb}<span class="sub-badge" style="color:{sb.c};background:{sb.bg}">{sb.g} {sb.l}</span>{/if}</span>
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
  .leyenda {
    margin: -8px 0 0;
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
    min-width: 1020px;
    grid-template-columns: 96px minmax(0, 1.2fr) 230px 176px 136px 80px minmax(0, 1fr);
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
    background: #f0f0ee;
    color: #52514e;
  }
  .ej:hover {
    background: #fafaf9;
  }
  .mas {
    display: flex;
    justify-content: center;
    padding: 12px;
  }
</style>
