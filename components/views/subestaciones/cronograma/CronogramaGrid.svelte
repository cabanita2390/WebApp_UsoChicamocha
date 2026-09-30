<script>
  import { createEventDispatcher } from "svelte";
  import { MESES, MESES_LARGOS } from "../../../../config/subestaciones.js";

  export let filas = [];
  export let totalesMes = [];
  export let total = 0;
  export let hoy;
  export let anio;
  /** "Estación" | "Actividad" */
  export let etiquetaFila = "Estación";
  /** true = chips con nombre (Actividades); false = número + barra (Conteo) */
  export let conChips = true;
  /** { h, w } de DENSIDAD */
  export let densidad;
  export let dosColumnas = false;
  export let vacio = "";
  export let tituloFila = "Ver detalle de estación";
  /** Atenúa la grilla mientras se recarga (cambio de año, después de guardar). */
  export let actualizando = false;

  const dispatch = createEventDispatcher();
  const TRIMESTRES = ["1er trimestre", "2do trimestre", "3er trimestre", "4to trimestre"];

  $: cols = `220px repeat(12, minmax(${densidad.w}px, 1fr)) 64px`;
  $: minAncho = `${220 + 12 * densidad.w + 64}px`;
  $: altoCelda = `${densidad.h}px`;
  $: mesActualVisible = anio === hoy.anioActual ? hoy.mesActual : null;

  function teclado(e, fila, celda) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir(e, fila, celda);
    }
  }

  function abrir(e, fila, celda) {
    const r = e.currentTarget.getBoundingClientRect();
    dispatch("celda", { fila, celda, x: r.left, y: r.bottom });
  }
</script>

<div class="marco" class:actualizando>
  <div style="min-width:{minAncho}">
    <div class="cabecera">
      <div class="grid trimestres" style="grid-template-columns:{cols}">
        <div class="fija blanco"></div>
        {#each TRIMESTRES as t}<div class="trim">{t}</div>{/each}
        <div></div>
      </div>
      <div class="grid" style="grid-template-columns:{cols}">
        <div class="fija blanco etiqueta">{etiquetaFila}</div>
        {#each MESES as l, i}
          <div class="mes-h" class:actual={mesActualVisible === i + 1} class:trim-borde={i % 3 === 0}>{l}</div>
        {/each}
        <div class="total-h">Total</div>
      </div>
    </div>

    {#each filas as fila (fila.key)}
      <div class="grid fila" class:alterna={fila.alterna} style="grid-template-columns:{cols}">
        <button class="fija nombre-fila" class:alterna={fila.alterna} style="height:{altoCelda}" title={tituloFila}
          on:click={() => dispatch("fila", fila)}>
          <span class="nombre-col">
            <span class="nombre">{fila.nombre}</span>
            <span class="sub">{fila.sub}</span>
          </span>
          <span class="pct" style="color:{fila.badge.color}" title={fila.badge.l}>{fila.badge.g} {fila.pctL}</span>
        </button>
        {#each fila.celdas as c (c.mes)}
          <div class="celda" role="button" tabindex="0"
            aria-label="{fila.nombre} · {MESES_LARGOS[c.mes - 1]} · {c.n} {c.n === 1 ? 'cita' : 'citas'}"
            class:trim-borde={c.trimestre} class:actual={c.actual} class:cambios={c.hayCambios}
            class:sel={c.seleccionada} class:dos={dosColumnas} style="height:{altoCelda}"
            on:click={(e) => abrir(e, fila, c)} on:keydown={(e) => teclado(e, fila, c)}>
            {#if conChips && c.n > 0}
              {#each c.chips as ch (ch.id)}
                <span class="chip" class:tachada={ch.tachada} title={ch.title}
                  style="background:{ch.bg};border:{ch.bd}">
                  <span class="g" style="color:{ch.c}">{ch.g}</span>{#if ch.dTag}<span class="dtag">{ch.dTag}</span>{/if}<span class="corto">{ch.short}</span>
                </span>
              {/each}
              {#if c.mas}<span class="mas">+{c.mas} más</span>{/if}
            {:else if c.n > 0}
              <div class="conteo">
                <span class="n">{c.n}</span>
                <span class="barra">
                  <span style="width:{c.wOk}%;background:#006300"></span>
                  <span style="width:{c.wBad}%;background:#d03b3b"></span>
                  <span style="width:{c.wPen}%;background:#c8c7c2"></span>
                </span>
              </div>
            {/if}
            {#if c.mostrarMas}<span class="plus">+</span>{/if}
          </div>
        {/each}
        <div class="total">{fila.total}</div>
      </div>
    {/each}

    {#if !filas.length}
      <div class="vacio">{vacio}</div>
    {/if}

    <div class="grid pie" style="grid-template-columns:{cols}">
      <div class="fija pie-fija">Citas por mes</div>
      {#each totalesMes as t, i}<div class="pie-mes" class:trim-borde={i % 3 === 0}>{t}</div>{/each}
      <div class="pie-total">{total}</div>
    </div>
  </div>
</div>

<style>
  .marco {
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    overflow: auto;
    /* Ocupa el alto que queda en la pantalla (un solo scroll, el de la grilla); con
       menos de 420 px disponibles la página hace scroll. */
    flex: 1 0 420px;
    transition: opacity 0.15s;
  }
  .marco.actualizando {
    opacity: 0.55;
    pointer-events: none;
  }
  .grid {
    display: grid;
  }
  .cabecera {
    position: sticky;
    top: 0;
    z-index: 3;
    background: #fff;
    border-bottom: 1px solid rgba(11, 11, 11, 0.12);
  }
  .fija {
    position: sticky;
    left: 0;
    border-right: 1px solid rgba(11, 11, 11, 0.08);
  }
  .blanco {
    background: #fff;
  }
  .trimestres {
    font-size: 11px;
    font-weight: 600;
    color: #898781;
  }
  .trim {
    grid-column: span 3;
    padding: 8px 8px 2px;
    border-left: 1px solid rgba(11, 11, 11, 0.1);
  }
  .etiqueta {
    padding: 4px 14px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #898781;
  }
  .mes-h {
    padding: 4px 8px 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: #52514e;
    background: #fff;
    border-left: 1px solid transparent;
  }
  .mes-h.actual {
    color: #1f5fae;
    background: rgba(42, 120, 214, 0.08);
  }
  .trim-borde {
    border-left: 1px solid rgba(11, 11, 11, 0.1) !important;
  }
  .total-h {
    padding: 4px 12px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #898781;
    text-align: right;
  }
  .fila {
    border-bottom: 1px solid rgba(11, 11, 11, 0.06);
    background: #fff;
  }
  .fila.alterna {
    background: #fcfcfb;
  }
  .nombre-fila {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    z-index: 2;
    background: #fff;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-right: 1px solid rgba(11, 11, 11, 0.08);
  }
  .nombre-fila.alterna {
    background: #fcfcfb;
  }
  .nombre-fila:hover {
    color: #2a78d6;
  }
  .nombre-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nombre {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sub {
    font: 500 10.5px ui-monospace, Menlo, monospace;
    color: #898781;
  }
  .pct {
    font-size: 11.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .celda {
    padding: 5px 6px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-content: center;
    gap: 3px;
    cursor: pointer;
    min-width: 0;
    border-left: 1px solid rgba(11, 11, 11, 0.04);
    background: transparent;
  }
  .celda.dos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .celda.actual {
    background: rgba(42, 120, 214, 0.045);
  }
  .celda.cambios {
    background: #f1f6fd;
    box-shadow: inset 0 0 0 1.5px rgba(42, 120, 214, 0.55);
  }
  .celda.sel {
    background: #e8f1fb;
    box-shadow: inset 0 0 0 2px #2a78d6;
  }
  .celda:hover {
    background: #f1f5fb;
  }
  .celda:focus-visible {
    outline: 2px solid #2a78d6;
    outline-offset: -2px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    font: 500 11.5px/17px system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 0 6px;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    color: #0b0b0b;
    min-width: 0;
  }
  .chip.tachada {
    text-decoration: line-through;
    opacity: 0.5;
  }
  .g {
    font-weight: 700;
    font-size: 10px;
    flex: none;
  }
  .dtag {
    font: 600 9.5px ui-monospace, Menlo, monospace;
    color: #898781;
    flex: none;
  }
  .corto {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mas {
    font: 600 11px/15px system-ui, sans-serif;
    padding: 0 6px;
    color: #2a78d6;
    white-space: nowrap;
  }
  .conteo {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .n {
    font-size: 14px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .barra {
    display: flex;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: #e3e3e0;
  }
  .plus {
    grid-column: 1 / -1;
    text-align: center;
    font-size: 16px;
    color: #9fb9dc;
  }
  .total {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .vacio {
    position: sticky;
    left: 0;
    width: min(100%, 900px);
    padding: 40px 24px;
    text-align: center;
    font-size: 13px;
    color: #898781;
  }
  .pie {
    position: sticky;
    bottom: 0;
    z-index: 3;
    background: #f7f7f6;
    border-top: 1px solid rgba(11, 11, 11, 0.12);
  }
  .pie-fija {
    background: #f7f7f6;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #52514e;
  }
  .pie-mes {
    padding: 10px 8px;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    border-left: 1px solid transparent;
  }
  .pie-total {
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
