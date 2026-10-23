<script>
  import { createEventDispatcher } from "svelte";
  import { MESES, MESES_LARGOS } from "../../../../config/subestaciones.js";
  import {
    NOMBRE_W, TOTAL_W, LIMITES, capacidadCelda, altoParaChips, recortarChips,
  } from "../../../../utils/cronograma.js";

  export let filas = [];
  /** Meses que se ven (1..12); el filtro de meses oculta los demás. */
  export let meses = MESES.map((_, i) => i + 1);
  /** Totales del pie por mes (índice 0 = enero). */
  export let totalesMes = [];
  export let total = 0;
  export let hoy;
  export let anio;
  /** "Estación" | "Actividad" */
  export let etiquetaFila = "Estación";
  /** true = chips con nombre (Actividades); false = número + barra (Conteo) */
  export let conChips = true;
  /** Tamaño Normal { h, w } (NORMAL.est / NORMAL.act) */
  export let normal;
  export let dosColumnas = false;
  export let vacio = "";
  /** Ayuda del click en el nombre de la fila; null = el nombre no es clickeable. */
  export let tituloFila = null;
  /** Atenúa la grilla mientras se recarga (cambio de año, después de guardar). */
  export let actualizando = false;
  /** Hay columnas o filas con un tamaño distinto del Normal (para el botón "Tamaño normal"). */
  export let hayAjustes = false;

  const dispatch = createEventDispatcher();
  const TRIMESTRES = ["1er trimestre", "2do trimestre", "3er trimestre", "4to trimestre"];

  // Tamaños que el usuario ajustó arrastrando bordes, como en Excel: cada columna y cada fila por
  // separado. Solo para leer mejor: no se guardan, al volver a entrar todo está en Normal.
  let anchoNombre = null;
  let anchoMes = {};
  let altoFila = {};

  export function restablecer() {
    anchoNombre = null;
    anchoMes = {};
    altoFila = {};
  }

  $: hayAjustes = anchoNombre != null || Object.keys(anchoMes).length > 0 || Object.keys(altoFila).length > 0;
  $: columnas = dosColumnas ? 2 : 1;
  $: nombreW = anchoNombre ?? NOMBRE_W;
  $: cols = `${nombreW}px ${meses.map((m) => (anchoMes[m] != null ? `${anchoMes[m]}px` : `minmax(${normal.w}px, 1fr)`)).join(" ")} ${TOTAL_W}px`;
  $: minAncho = `${nombreW + meses.reduce((a, m) => a + (anchoMes[m] ?? normal.w), 0) + TOTAL_W}px`;
  $: trimestres = TRIMESTRES.map((t, q) => ({ t, n: meses.filter((m) => Math.ceil(m / 3) === q + 1).length })).filter((x) => x.n);
  $: mesActualVisible = anio === hoy.anioActual ? hoy.mesActual : null;
  $: vistas = filas.map((f) => vistaFila(f, altoFila[f.key], meses, conChips, columnas));

  const clamp = (v, [a, b]) => Math.max(a, Math.min(b, Math.round(v)));

  /** Celdas de la fila con los chips que caben en su alto; el resto va en "+N más". */
  function vistaFila(fila, ajustado, meses, conChips, columnas) {
    const h = ajustado ?? normal.h;
    const cap = capacidadCelda(h, columnas);
    const celdas = meses.map((m) => {
      const c = fila.celdas[m - 1];
      const { chips, mas } = recortarChips(c.chips, cap);
      // Si el usuario agrandó la fila y sobra alto, el nombre se lee completo en 2 o 3 líneas.
      let lineas = 1;
      if (ajustado != null && conChips && c.n && !mas) {
        const k = Math.ceil(c.n / columnas);
        lineas = Math.max(1, Math.min(3, Math.floor(((h - 10 - (k - 1) * 3) / k - 2) / 15)));
      }
      return { ...c, chips, mas, lineas };
    });
    return { fila, h, celdas, ajustada: ajustado != null };
  }

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

  // "+N más": la fila crece hasta que se ven todas sus citas.
  function expandir(fila) {
    const n = Math.max(1, ...fila.celdas.filter((c) => meses.includes(c.mes)).map((c) => c.n));
    altoFila = { ...altoFila, [fila.key]: clamp(Math.max(normal.h, altoParaChips(n, columnas)), LIMITES.fila) };
  }

  function contraer(fila) {
    const { [fila.key]: _, ...resto } = altoFila;
    altoFila = resto;
  }

  // ---- Arrastrar bordes ----
  let arrastre = null;
  let burbuja = null;

  function empezar(e, tipo, clave) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    let inicial;
    if (tipo === "nombre") inicial = nombreW;
    else if (tipo === "mes") inicial = e.currentTarget.parentElement.getBoundingClientRect().width;
    else inicial = altoFila[clave] ?? normal.h;
    arrastre = { tipo, clave, x0: e.clientX, y0: e.clientY, inicial };
  }

  function mover(e) {
    if (!arrastre) return;
    // Soltado fuera de la ventana no llega pointerup: sin botón apretado, el arrastre ya terminó.
    if (e.buttons === 0) return soltar();
    const { tipo, clave, x0, y0, inicial } = arrastre;
    let texto;
    if (tipo === "nombre") {
      anchoNombre = clamp(inicial + e.clientX - x0, LIMITES.nombre);
      texto = `Columna ${etiquetaFila} · ${anchoNombre} px`;
    } else if (tipo === "mes") {
      anchoMes = { ...anchoMes, [clave]: clamp(inicial + e.clientX - x0, LIMITES.mes) };
      texto = `${MESES_LARGOS[clave - 1]} · ${anchoMes[clave]} px`;
    } else {
      const h = clamp(inicial + e.clientY - y0, LIMITES.fila);
      altoFila = { ...altoFila, [clave]: h };
      const n = capacidadCelda(h, columnas);
      texto = `${filas.find((f) => f.key === clave)?.nombre ?? ""} · ${h} px · caben ${n} por celda`;
    }
    burbuja = { x: Math.min(e.clientX + 14, window.innerWidth - 260), y: Math.min(e.clientY + 16, window.innerHeight - 40), texto };
  }

  function soltar() {
    arrastre = null;
    burbuja = null;
  }

  // Doble clic en un borde: ajustar esa columna o esa fila a su contenido.
  let lienzo;
  function medir(texto, fuente) {
    if (!lienzo) lienzo = document.createElement("canvas").getContext("2d");
    if (!lienzo) return texto.length * 7;
    lienzo.font = fuente;
    return lienzo.measureText(texto).width;
  }

  function ajustarNombre() {
    const w = Math.max(140, ...filas.map((f) => medir(f.nombre, "500 13px system-ui, sans-serif") + medir(f.pctL, "600 11.5px system-ui, sans-serif") + 42));
    anchoNombre = clamp(w, LIMITES.nombre);
  }

  function ajustarMes(m) {
    const chip = Math.max(0, ...filas.flatMap((f) => f.celdas[m - 1].chips.map((ch) =>
      16 + (ch.g ? 14 : 0) + (ch.dTag ? 10 : 0) + medir(ch.short, "500 11.5px system-ui, sans-serif"))));
    if (!chip) return;
    anchoMes = { ...anchoMes, [m]: clamp((columnas === 2 ? chip * 2 + 3 : chip) + 14, LIMITES.mes) };
  }
</script>

<svelte:window on:pointermove={mover} on:pointerup={soltar} on:pointercancel={soltar} />

<div class="marco" class:actualizando class:arrastrando={arrastre} class:fila-arr={arrastre?.tipo === "fila"} style="--cols:{cols}">
  <div style="min-width:{minAncho}">
    <div class="cabecera">
      <div class="grid trimestres">
        <div class="fija blanco"></div>
        {#each trimestres as { t, n }}<div class="trim" style="grid-column:span {n}">{n < 3 ? t.replace(" trimestre", " trim.") : t}</div>{/each}
        <div></div>
      </div>
      <div class="grid">
        <div class="fija blanco etiqueta">
          {etiquetaFila}
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <span class="asa-col" class:activa={arrastre?.tipo === "nombre"} title="Arrastre para ensanchar · doble clic: ajustar al nombre más largo"
            on:pointerdown={(e) => empezar(e, "nombre")} on:dblclick={ajustarNombre}></span>
        </div>
        {#each meses as m (m)}
          <div class="mes-h" class:actual={mesActualVisible === m} class:trim-borde={(m - 1) % 3 === 0}>
            {MESES[m - 1]}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="asa-col" class:activa={arrastre?.tipo === "mes" && arrastre.clave === m}
              title="Arrastre para cambiar el ancho de {MESES_LARGOS[m - 1]} · doble clic: ajustar al contenido"
              on:pointerdown={(e) => empezar(e, "mes", m)} on:dblclick={() => ajustarMes(m)}></span>
          </div>
        {/each}
        <div class="total-h">Total</div>
      </div>
    </div>

    {#each vistas as { fila, h, celdas, ajustada } (fila.key)}
      <div class="grid fila" class:alterna={fila.alterna} class:ajustada>
        <div class="fija nombre-fila" class:alterna={fila.alterna} style="height:{h}px">
          <svelte:element this={tituloFila ? "button" : "span"} class="nombre-col" class:nombre-btn={tituloFila}
            title={tituloFila} on:click={() => tituloFila && dispatch("fila", fila)} role={tituloFila ? "button" : undefined}>
            <span class="nombre" title={fila.nombre}>{fila.nombre}</span>
            <span class="sub">{fila.sub}</span>
          </svelte:element>
          {#if ajustada}
            <button class="contraer" title="Volver esta fila al tamaño normal" on:click={() => contraer(fila)}>▴ Contraer</button>
          {/if}
          <span class="pct" style="color:{fila.badge.color}" title={fila.badge.l}>{fila.badge.g} {fila.pctL}</span>
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <span class="asa-fila" class:activa={arrastre?.tipo === "fila" && arrastre.clave === fila.key}
            title="Arrastre para cambiar el alto de esta fila · doble clic: ajustar al contenido"
            on:pointerdown={(e) => empezar(e, "fila", fila.key)} on:dblclick={() => expandir(fila)}></span>
        </div>
        {#each celdas as c (c.mes)}
          <div class="celda" role="button" tabindex="0"
            aria-label="{fila.nombre} · {MESES_LARGOS[c.mes - 1]} · {c.n} {c.n === 1 ? 'cita' : 'citas'}"
            class:trim-borde={c.trimestre} class:actual={c.actual} class:cambios={c.hayCambios}
            class:sel={c.seleccionada} class:dos={dosColumnas} style="height:{h}px"
            on:click={(e) => abrir(e, fila, c)} on:keydown={(e) => teclado(e, fila, c)}>
            {#if conChips && c.n > 0}
              {#each c.chips as ch (ch.id)}
                <span class="chip" class:tachada={ch.tachada} class:multi={c.lineas > 1} title={ch.title}
                  style="background:{ch.bg};border:{ch.bd}">
                  <span class="g" style="color:{ch.c}">{ch.g}</span>{#if ch.dTag}<span class="dtag">{ch.dTag}</span>{/if}<span
                    class="corto" style={c.lineas > 1 ? `-webkit-line-clamp:${c.lineas}` : ""}>{ch.short}</span>
                </span>
              {/each}
              {#if c.mas}
                <button class="mas" title="Ver toda la fila" on:click|stopPropagation={() => expandir(fila)}
                  on:keydown={(e) => e.stopPropagation()}>+{c.mas} más</button>
              {/if}
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

    <div class="grid pie">
      <div class="fija pie-fija">Citas por mes</div>
      {#each meses as m (m)}<div class="pie-mes" class:trim-borde={(m - 1) % 3 === 0}>{totalesMes[m - 1] ?? 0}</div>{/each}
      <div class="pie-total">{total}</div>
    </div>
  </div>
</div>

{#if burbuja}
  <div class="burbuja" style="left:{burbuja.x}px;top:{burbuja.y}px">{burbuja.texto}</div>
{/if}

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
    grid-template-columns: var(--cols);
  }
  .arrastrando,
  .arrastrando * {
    user-select: none;
    cursor: col-resize !important;
  }
  .fila-arr,
  .fila-arr * {
    cursor: row-resize !important;
  }
  .asa-col {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 5;
    touch-action: none;
  }
  .asa-fila {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -5px;
    height: 10px;
    cursor: row-resize;
    z-index: 5;
    touch-action: none;
  }
  .asa-col::after,
  .asa-fila::after {
    content: "";
    position: absolute;
    background: transparent;
    transition: background 0.1s;
  }
  .asa-col::after {
    left: 4px;
    top: 0;
    bottom: 0;
    width: 2px;
  }
  .asa-fila::after {
    left: 0;
    right: 0;
    top: 4px;
    height: 2px;
  }
  .asa-col:hover::after,
  .asa-col.activa::after,
  .asa-fila:hover::after,
  .asa-fila.activa::after {
    background: #2a78d6;
  }
  .burbuja {
    position: fixed;
    z-index: 60;
    pointer-events: none;
    font: 600 11.5px/1.35 ui-monospace, Menlo, monospace;
    background: #0b0b0b;
    color: #fff;
    padding: 5px 8px;
    border-radius: 6px;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
    position: relative;
    white-space: nowrap;
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
  .fila.ajustada,
  .fila.ajustada .nombre-fila {
    background: #f6f9fe;
  }
  .nombre-fila {
    z-index: 2;
    background: #fff;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-right: 1px solid rgba(11, 11, 11, 0.08);
    min-width: 0;
  }
  .nombre-fila.alterna {
    background: #fcfcfb;
  }
  .nombre-col {
    all: unset;
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .nombre-btn {
    cursor: pointer;
  }
  .nombre-btn:hover {
    color: #2a78d6;
  }
  .nombre-btn:focus-visible {
    outline: 2px solid #2a78d6;
    outline-offset: 2px;
  }
  .contraer {
    all: unset;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    color: #1f5fae;
    white-space: nowrap;
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
  .chip.multi {
    white-space: normal;
    align-items: flex-start;
    padding: 2px 6px;
    line-height: 15px;
  }
  .chip.multi .corto {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
  .mas {
    all: unset;
    cursor: pointer;
    justify-self: start;
    font: 600 11px/15px system-ui, sans-serif;
    padding: 0 6px;
    border-radius: 4px;
    color: #2a78d6;
    white-space: nowrap;
  }
  .mas:hover {
    background: #e8f1fb;
  }
  .mas:focus-visible {
    outline: 2px solid #2a78d6;
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
