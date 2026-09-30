<script>
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { ejecucionesFiltroInicial, subestacionesActiveTab } from "../../../../stores/subestacionesFilters.js";
  import { MESES, tipoLabel, frecuenciaLabel } from "../../../../config/subestaciones.js";
  import { BADGE, COLOR, chip, pctBadge, fechaCorta } from "../../../../utils/cronograma.js";
  import { tipoMantenimientoLabel } from "../../../../config/table-definitions/substation.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubestacionEjecucionDetalleModal from "../../../shared/SubestacionEjecucionDetalleModal.svelte";

  export let estacionId;

  const dispatch = createEventDispatcher();

  let anio = null;
  let hoy = null;
  let estacion = null;
  let indicador = null;
  let citas = [];
  let actividadesPorId = new Map();
  let criticas = [];
  let ejecuciones = [];
  let cargando = true;

  // Modal de ejecución (el mismo de la pestaña Ejecuciones, con fotos)
  let detalle = null;
  let detalleCargando = false;
  let mostrarDetalle = false;

  async function cargar() {
    cargando = true;
    try {
      const [indicadores, estaciones, actividades, crit, ult] = await Promise.all([
        substationAdmin.indicadoresPorEstacion(anio),
        substationAdmin.listarEstaciones(),
        substationAdmin.listarActividades(),
        substationAdmin.criticidad(estacionId),
        substationAdmin.ultimasEjecuciones(estacionId),
      ]);
      indicador = indicadores.find((i) => i.estacionId === estacionId) ?? null;
      anio = indicador?.anio ?? anio;
      estacion = estaciones.find((s) => s.id === estacionId) ?? null;
      actividadesPorId = new Map(actividades.map((a) => [a.id, a]));
      criticas = crit.slice(0, 5);
      ejecuciones = ult?.content ?? [];
      const cron = await substationAdmin.obtenerCronograma(anio);
      hoy = { anioActual: cron.anioActual, mesActual: cron.mesActual };
      // Solo lo publicado (lo que ve el móvil), como el mockup.
      citas = cron.citas.filter((c) => c.estacionId === estacionId && c.estado === "PUBLICADA").sort((a, b) => a.mes - b.mes);
    } catch (e) {
      flash(e.message, { error: true });
    } finally {
      cargando = false;
    }
  }
  cargar();

  function cambiarAnio(e) {
    anio = Number(e.target.value);
    cargar();
  }

  function irAEjecuciones(mes) {
    const filtro = { estacionId };
    if (mes) {
      const mm = String(mes).padStart(2, "0");
      filtro.fechaInicio = `${anio}-${mm}-01`;
      filtro.fechaFin = `${anio}-${mm}-${new Date(anio, mes, 0).getDate()}`;
    }
    ejecucionesFiltroInicial.set(filtro);
    subestacionesActiveTab.set("ejecuciones");
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

  const RESULTADO = {
    CONFORME: { ...BADGE.ok, g: "✓", l: "Conforme" },
    CON_HALLAZGOS: { ...BADGE.warn, g: "!", l: "Con hallazgos" },
    REQUIERE_INTERVENCION: { ...BADGE.bad, g: "✕", l: "Requiere intervención" },
  };
  const SEGUIMIENTO = {
    ABIERTO: { ...BADGE.bad, g: "●", l: "Abierto" },
    EN_PROCESO: { ...BADGE.warn, g: "◐", l: "En proceso" },
    RESUELTO: { ...BADGE.ok, g: "✓", l: "Resuelto" },
  };

  $: pct = indicador?.porcentajeCumplimiento != null ? Math.round(Number(indicador.porcentajeCumplimiento)) : null;
  $: pc = pct != null ? pctBadge(pct) : { color: "#898781", c: "#52514e", bg: "#f0f0ee", g: "", l: "Sin citas vencidas" };
  $: abiertos = indicador?.hallazgosAbiertos ?? 0;
  $: kpis = indicador
    ? [
        { l: "Citas programadas", v: indicador.programado, s: `${indicador.vencidas} vencidas a la fecha`, c: "#0b0b0b" },
        { l: "Ejecutadas", v: indicador.ejecutadasVencidas, s: `de ${indicador.vencidas} vencidas`, c: "#0b0b0b" },
        { l: "Con hallazgos", v: indicador.conHallazgos, s: `en ${anio}`, c: "#0b0b0b" },
        {
          l: "Hallazgos abiertos",
          v: abiertos,
          s: abiertos ? "requieren seguimiento" : "todo al día",
          c: abiertos ? "#d03b3b" : "#006300",
        },
      ]
    : [];
  $: celdas = hoy
    ? MESES.map((m, i) => ({
        m,
        actual: anio === hoy.anioActual && i + 1 === hoy.mesActual,
        chips: citas
          .filter((c) => c.mes === i + 1)
          .map((c) => ({ ...chip(c, { anio, hoy, actividad: actividadesPorId.get(c.actividadId), disciplinaFiltrada: true }), mes: c.mes })),
      }))
    : [];
  $: cumplimiento = hoy
    ? citas.map((c) => {
        const cerrado = anio < hoy.anioActual || (anio === hoy.anioActual && c.mes < hoy.mesActual);
        const actual = anio === hoy.anioActual && c.mes === hoy.mesActual;
        return {
          id: c.id,
          mes: MESES[c.mes - 1],
          act: actividadesPorId.get(c.actividadId)?.nombre ?? "",
          b: c.tieneEjecucion
            ? { ...BADGE.ok, g: "✓", l: "Cumple" }
            : cerrado
              ? { ...BADGE.bad, g: "✕", l: "No cumple" }
              : actual
                ? { ...BADGE.warn, g: "◐", l: "En curso" }
                : { ...BADGE.neu, g: "○", l: "Programada" },
        };
      })
    : [];
  $: maxCrit = Math.max(1, ...criticas.map((c) => c.intervenciones));
</script>

<div class="volver-fila">
  <button class="sub-btn volver" on:click={() => dispatch("volver")}>← Volver al Dashboard</button>
  <span class="gris">Detalle por estación</span>
</div>

{#if cargando && !estacion}
  <div class="cargando"><Loader /></div>
{:else if estacion}
  <div class="sub-card scroll-x">
    <div class="cabecera">
      <div>
        <h1 class="nombre">{estacion.nombre}</h1>
        <div class="gris2">{tipoLabel(estacion.tipo)} · Frecuencia base {frecuenciaLabel(estacion.frecuenciaBase)}</div>
      </div>
      <div class="derecha">
        {#if hoy}
          <select class="anio" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
            {#each [hoy.anioActual, hoy.anioActual - 1] as y}<option value={String(y)}>{y}</option>{/each}
          </select>
        {/if}
        <div class="pct-box">
          <div class="gris">Cumplimiento {anio}</div>
          <div class="pct" style="color:{pc.color}">{pct != null ? `${pct}%` : "—"}</div>
          <span class="sub-badge" style="color:{pc.c};background:{pc.bg}">{pc.g} {pc.l}</span>
        </div>
      </div>
    </div>
    <div class="kpis">
      {#each kpis as k}
        <div class="kpi">
          <div class="gris">{k.l}</div>
          <div class="kv" style="color:{k.c}">{k.v}</div>
          <div class="ks">{k.s}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="seccion">Año {anio} · Programado vs. ejecutado</div>
  <div class="sub-card scroll-x">
    <div class="card-t">Cronograma</div>
    <div class="tira">
      {#each celdas as cel}
        <div class="mes-col" class:actual={cel.actual}>
          <span class="mes-l" class:actual={cel.actual}>{cel.m}</span>
          {#each cel.chips as ch (ch.id)}
            <button class="chip" title={ch.title} style="background:{ch.bg};border:{ch.bd}" on:click={() => irAEjecuciones(ch.mes)}>
              <span class="g" style="color:{ch.c}">{ch.g}</span>{ch.short}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <div class="dos">
    <div class="sub-card scroll-x">
      <div class="card-t">Cumplimiento cita por cita</div>
      <div class="lista">
        {#each cumplimiento as r (r.id)}
          <div class="cita">
            <span class="gris">{r.mes}</span><span>{r.act}</span>
            <span class="der"><span class="sub-badge" style="color:{r.b.c};background:{r.b.bg}">{r.b.g} {r.b.l}</span></span>
          </div>
        {:else}
          <div class="sub-empty">Sin citas publicadas en {anio}.</div>
        {/each}
      </div>
    </div>
    <div class="sub-card">
      <div class="card-t">Actividades más críticas <span class="normal">· histórico</span></div>
      <div class="crit">
        {#each criticas as t, i (t.actividadId)}
          <div class="crit-item">
            <div class="crit-top"><span>{t.actividadNombre}</span><strong>{t.intervenciones}</strong></div>
            <div class="barra">
              <div style="width:{(t.intervenciones / maxCrit) * 100}%;background:{i === 0 ? COLOR.bad : i < 2 ? COLOR.warn : '#898781'}"></div>
            </div>
          </div>
        {:else}
          <div class="sub-empty">Sin intervenciones registradas todavía.</div>
        {/each}
      </div>
    </div>
  </div>

  <div class="seccion">Actividad reciente</div>
  <div class="sub-card scroll-x">
    <div class="card-t entre">
      <span>Últimas ejecuciones</span>
      <button class="sub-link" on:click={() => irAEjecuciones(null)}>Ver todas en Ejecuciones →</button>
    </div>
    {#each ejecuciones as e (e.id)}
      {@const rb = RESULTADO[e.resultado] ?? RESULTADO.CONFORME}
      {@const sb = e.seguimiento ? SEGUIMIENTO[e.seguimiento.estado] : null}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="ej" role="button" tabindex="0" on:click={() => abrirEjecucion(e.id)}
        on:keydown={(ev) => ev.key === "Enter" && abrirEjecucion(e.id)}>
        <span class="gris2 num">{fechaCorta(e.fecha)}</span>
        <span>{e.actividadNombre ?? e.descripcionLibre ?? "Registro libre"}</span>
        <span class="gris2">{tipoMantenimientoLabel(e.tipoMantenimiento)}</span>
        <span><span class="sub-badge" style="color:{rb.c};background:{rb.bg}">{rb.g} {rb.l}</span></span>
        <span>{#if sb}<span class="sub-badge" style="color:{sb.c};background:{sb.bg}">{sb.g} {sb.l}</span>{/if}</span>
        <span class="gris2">{e.responsable ?? ""}</span>
      </div>
    {:else}
      <div class="sub-empty">Sin ejecuciones registradas.</div>
    {/each}
  </div>
{/if}

{#if mostrarDetalle}
  <SubestacionEjecucionDetalleModal ejecucion={detalle} isLoading={detalleCargando} on:close={() => (mostrarDetalle = false)} />
{/if}

<style>
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
  }
  .card-t .sub-link {
    font-size: 13px;
    font-weight: 400;
  }
  .normal {
    font-weight: 400;
    color: #898781;
  }
  .tira {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .mes-col {
    padding: 8px 4px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border-right: 1px solid rgba(11, 11, 11, 0.04);
    min-width: 0;
  }
  .mes-col.actual {
    background: rgba(42, 120, 214, 0.05);
  }
  .mes-l {
    font-size: 11.5px;
    font-weight: 600;
    color: #898781;
  }
  .mes-l.actual {
    color: #1f5fae;
  }
  .chip {
    font: 500 11px/16px system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 0 6px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #0b0b0b;
  }
  .g {
    font-weight: 700;
    font-size: 10px;
    margin-right: 3px;
  }
  .dos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 16px;
  }
  .lista {
    max-height: 320px;
    overflow: auto;
  }
  .cita {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) 128px;
    align-items: center;
    padding: 7px 18px;
    font-size: 13px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
  }
  .cita .gris {
    font-size: 13px;
  }
  .der {
    text-align: right;
  }
  .crit {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .crit-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .crit-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }
  .crit-top strong {
    font-variant-numeric: tabular-nums;
  }
  .barra {
    height: 8px;
    background: #f0f0ee;
    border-radius: 999px;
    overflow: hidden;
  }
  .barra div {
    height: 100%;
    border-radius: 999px;
  }
  .ej {
    display: grid;
    min-width: 900px;
    grid-template-columns: 96px minmax(0, 1.5fr) 104px 176px 136px minmax(0, 1fr);
    align-items: center;
    padding: 9px 18px;
    font-size: 13px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
    cursor: pointer;
  }
  .ej:hover {
    background: #fafaf9;
  }
</style>
