<script>
  import { createEventDispatcher } from "svelte";
  import { MESES, MESES_LARGOS, disciplinaLabel } from "../../../../config/subestaciones.js";
  import { BADGE, estadoCita, esNueva, seQuita, mesCerrado, fechaCorta } from "../../../../utils/cronograma.js";

  /** { estacionId?, actividadId?, mes, x, y } */
  export let celda;
  /** Citas de la celda (ya filtradas como en la grilla). */
  export let citas = [];
  export let anio;
  export let hoy;
  export let esAdmin = false;
  export let actividadesPorId;
  export let estacionesPorId;
  /** Actividades activas (todas las disciplinas) para "Asignar actividad". */
  export let actividadesAsignables = [];
  export let ocupado = false;

  const dispatch = createEventDispatcher();
  const esPorActividad = celda.actividadId != null;

  let actividadId = "";
  let meses = mesCerrado(anio, celda.mes, hoy) ? [] : [celda.mes];

  $: titulo = esPorActividad
    ? actividadesPorId.get(celda.actividadId)?.nombre
    : estacionesPorId.get(celda.estacionId)?.nombre;
  $: sub = `${MESES_LARGOS[celda.mes - 1]} ${anio} · ${citas.length} ${
    esPorActividad ? (citas.length === 1 ? "estación" : "estaciones") : citas.length === 1 ? "actividad" : "actividades"
  }`;
  $: left = `${Math.max(12, Math.min(celda.x, (typeof window !== "undefined" ? window.innerWidth : 1400) - 392))}px`;
  $: top = `${Math.max(12, Math.min(celda.y + 6, (typeof window !== "undefined" ? window.innerHeight : 900) - 470))}px`;
  $: items = citas.map((c) => {
    const act = actividadesPorId.get(c.actividadId);
    const e = estadoCita(c, anio, hoy);
    const cerrado = mesCerrado(anio, c.mes, hoy);
    return {
      cita: c,
      nombre: esPorActividad ? estacionesPorId.get(c.estacionId)?.nombre : act?.nombre,
      b:
        e === "ok"
          ? { ...BADGE.ok, g: "✓", l: `Ejecutada ${fechaCorta(c.fechaEjecucion).slice(0, 5)}` }
          : e === "bad"
            ? { ...BADGE.bad, g: "✕", l: "No ejecutada" }
            : anio === hoy.anioActual && c.mes === hoy.mesActual
              ? { ...BADGE.warn, g: "⧗", l: "En curso" }
              : { ...BADGE.neu, g: "○", l: "Programada" },
      borrador: esNueva(c) ? "Nueva · borrador" : seQuita(c) ? "Se quitará al publicar" : "",
      soloWeb: act && !act.capturaMovilHabilitada,
      puedeQuitar: esAdmin && !c.tieneEjecucion && !seQuita(c) && !cerrado,
      puedeRestaurar: esAdmin && seQuita(c),
      mesCerrado: !c.tieneEjecucion && cerrado,
    };
  });
  $: puedeAsignar = !!actividadId && meses.length > 0 && !ocupado;

  function toggleMes(m) {
    if (mesCerrado(anio, m, hoy)) return;
    meses = meses.includes(m) ? meses.filter((x) => x !== m) : [...meses, m];
  }

  function onKeydown(e) {
    if (e.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="velo" on:click={() => dispatch("close")}></div>
<div class="panel" style="left:{left};top:{top}" role="dialog" aria-label={titulo}>
  <div class="head">
    <div>
      <div class="t">{titulo}</div>
      <div class="s">{sub}</div>
    </div>
    <button class="x" aria-label="Cerrar" on:click={() => dispatch("close")}>×</button>
  </div>

  <div class="lista">
    {#if !items.length}
      <div class="vacio">Sin actividades este mes.</div>
    {/if}
    {#each items as it (it.cita.id)}
      <div class="item">
        <span class="nombre-col">
          <span class="nombre" class:tachada={seQuita(it.cita)}>{it.nombre}</span>
          {#if it.borrador}<span class="borrador">{it.borrador}</span>{/if}
          {#if it.soloWeb}<span class="soloweb">Solo web · no se captura desde móvil</span>{/if}
        </span>
        <span class="badge" style="color:{it.b.c};background:{it.b.bg}">{it.b.g} {it.b.l}</span>
        <span class="acc">
          {#if it.cita.tieneEjecucion}
            <!-- La cita cumplida lleva a su registro (puede haberse hecho en otro mes, si fue tardía). -->
            <button class="lnk azul" on:click={() => dispatch("verRegistro", it.cita.id)}>Ver registro</button>
          {:else if it.puedeRestaurar}
            <button class="lnk azul" disabled={ocupado} on:click={() => dispatch("restaurar", it.cita)}>Restaurar</button>
          {:else if it.mesCerrado}
            <span class="cerrado" title="No se puede quitar una cita de un mes cerrado">Mes cerrado</span>
          {:else if it.puedeQuitar}
            <button class="lnk rojo" title="Quitar del cronograma" disabled={ocupado}
              on:click={() => dispatch("quitar", it.cita)}>Quitar</button>
          {/if}
        </span>
      </div>
    {/each}
    {#if items.length && !esPorActividad}
      <button class="lnk azul ver" title="Todo lo que se registró en la estación ese mes: citas de este u otros meses e imprevistos"
        on:click={() => dispatch("verEjecuciones")}>Todo lo registrado en {MESES_LARGOS[celda.mes - 1]} →</button>
    {/if}
  </div>

  {#if esAdmin && esPorActividad}
    <div class="pie derecha">
      <button class="primario" on:click={() => dispatch("masivaAqui")}>Asignar a más estaciones…</button>
    </div>
  {:else if esAdmin}
    <div class="pie">
      <div class="lbl">Asignar actividad</div>
      <select class="sel" bind:value={actividadId}>
        <option value="">— Elegir actividad —</option>
        {#each actividadesAsignables as a (a.id)}
          <option value={String(a.id)}>{disciplinaLabel(a.disciplina)} · {a.nombre}</option>
        {/each}
      </select>
      <div class="repetir">Repetir en los meses <span class="gris">(meses cerrados en gris)</span>:</div>
      <div class="meses">
        {#each MESES as l, i}
          {@const m = i + 1}
          {@const cerrado = mesCerrado(anio, m, hoy)}
          {@const on = meses.includes(m)}
          <button class="mes" class:on class:cerrado title={cerrado ? "Mes cerrado" : ""} disabled={cerrado}
            on:click={() => toggleMes(m)}>{l}</button>
        {/each}
      </div>
      <button class="primario asignar" disabled={!puedeAsignar}
        on:click={() => dispatch("asignar", { actividadId: Number(actividadId), meses: [...meses].sort((a, b) => a - b) })}>
        Asignar{meses.length > 1 ? ` en ${meses.length} meses` : ""}
      </button>
    </div>
  {:else}
    <div class="pie bloqueado">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2"></path>
      </svg>
      Asignar o quitar actividades: solo ADMIN
    </div>
  {/if}
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 1040;
  }
  .panel {
    position: fixed;
    width: 380px;
    max-height: 460px;
    overflow: auto;
    z-index: 1041;
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.1);
    border-radius: 10px;
    box-shadow: 0 12px 36px rgba(11, 11, 11, 0.16);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .t {
    font-size: 14px;
    font-weight: 650;
  }
  .s {
    font-size: 12px;
    color: #52514e;
    margin-top: 2px;
  }
  .x {
    all: unset;
    cursor: pointer;
    font-size: 18px;
    color: #898781;
    padding: 0 4px;
  }
  .lista {
    padding: 6px 0;
  }
  .vacio {
    padding: 10px 16px;
    font-size: 13px;
    color: #898781;
  }
  .item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
  }
  .nombre-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nombre {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tachada {
    text-decoration: line-through;
  }
  .borrador {
    font-size: 11px;
    color: #1f5fae;
  }
  .soloweb {
    font-size: 11px;
    color: #8a5b00;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .lnk {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
  }
  .lnk:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .azul {
    color: #2a78d6;
  }
  .rojo {
    color: #d03b3b;
  }
  .ver {
    display: block;
    padding: 6px 16px 4px;
    font-size: 12.5px;
  }
  .cerrado {
    font-size: 11.5px;
    color: #898781;
    white-space: nowrap;
  }
  .pie {
    border-top: 1px solid rgba(11, 11, 11, 0.08);
    padding: 12px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #fbfbfa;
    border-radius: 0 0 10px 10px;
  }
  .derecha {
    flex-direction: row;
    justify-content: flex-end;
  }
  .lbl {
    font-size: 12px;
    font-weight: 600;
  }
  .sel {
    height: 34px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    font-family: inherit;
  }
  .repetir {
    font-size: 11.5px;
    color: #52514e;
  }
  .gris {
    color: #898781;
  }
  .meses {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  }
  .mes {
    border-radius: 6px;
    padding: 4px 0;
    font-size: 11.5px;
    cursor: pointer;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #52514e;
    font-family: inherit;
  }
  .mes.on {
    border-color: #2a78d6;
    background: #2a78d6;
    color: #fff;
  }
  .mes.cerrado {
    border-color: transparent;
    background: #f3f3f1;
    color: #b5b4af;
    cursor: default;
  }
  .primario {
    background: #2a78d6;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .primario:disabled {
    background: #a9c6ea;
    cursor: not-allowed;
  }
  .asignar {
    align-self: flex-end;
  }
  .bloqueado {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    font-size: 12px;
    color: #898781;
    background: #fff;
  }
</style>
