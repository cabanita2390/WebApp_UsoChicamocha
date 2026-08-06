<script>
  // Mini gráfico de línea para tendencias mensuales (dataviz skill: línea 2px,
  // extremo redondeado, área al 10% de opacidad como wash, marcador ≥8px en el
  // último punto con su valor directo al lado — una sola serie no necesita leyenda).
  export let label = "";
  export let months = []; // ["2026-02", ...] o etiquetas ya formateadas
  export let values = [];
  export let color = "#2a78d6";
  export let formatValue = (v) => String(v);
  // Segunda serie opcional (ej. "real" vs "proyectado" en Historial de Rendimiento)
  // — cuando se pasa, agrega una segunda línea/área/marcador y una leyenda con los
  // dos nombres (una sola serie sigue sin leyenda, como antes).
  export let values2 = [];
  export let label2 = "";
  export let color2 = "#e67e22";
  export let formatValue2 = formatValue;
  // Timestamps reales (Date o epoch ms), uno por punto de `values` — opcional.
  // Sin esto, los puntos quedan repartidos por ORDEN (índice), como antes: bueno
  // para series ya regulares (ej. la tendencia mensual del Dashboard Financiero,
  // un punto por mes consecutivo). Con esto, la distancia entre puntos en el eje
  // X es proporcional al tiempo real transcurrido — necesario en un historial de
  // frecuencia irregular (ej. Rendimiento por activo: 5 tanqueos en enero y
  // ninguno hasta agosto debe verse como un hueco de 7 meses, no como 2 puntos
  // seguidos). `values2` reutiliza los mismos timestamps que `values` — en los
  // casos reales de este componente (proyectado vs. real) ambas series salen de
  // las mismas filas/fechas 1 a 1.
  export let timestamps = [];

  const WIDTH = 320;
  const HEIGHT = 110;
  const PAD_X = 8;
  const PAD_Y = 14;

  $: tieneSegundaSerie = values2.length > 0;
  $: max = Math.max(...values, ...(tieneSegundaSerie ? values2 : []), 0);
  $: usableW = WIDTH - PAD_X * 2;
  $: usableH = HEIGHT - PAD_Y * 2;
  $: usaTiempoReal = timestamps.length === values.length && values.length > 1;

  function calcularXsPorIndice(serie) {
    return serie.map((_, i) => PAD_X + (serie.length > 1 ? (i / (serie.length - 1)) * usableW : usableW / 2));
  }
  function calcularXsPorTiempo(ts) {
    const nums = ts.map((t) => new Date(t).getTime());
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min;
    return nums.map((t) => PAD_X + (span > 0 ? ((t - min) / span) * usableW : usableW / 2));
  }
  function calcularYs(serie) {
    return serie.map((v) => {
      const ratio = max > 0 ? v / max : 0;
      return PAD_Y + usableH - ratio * usableH;
    });
  }
  function puntosLinea(xs, ys) {
    return xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  }
  function puntosArea(xs, linePoints) {
    return xs.length ? `${xs[0]},${PAD_Y + usableH} ${linePoints} ${xs[xs.length - 1]},${PAD_Y + usableH}` : "";
  }

  $: xs = usaTiempoReal ? calcularXsPorTiempo(timestamps) : calcularXsPorIndice(values);
  $: ys = calcularYs(values);
  $: linePoints = puntosLinea(xs, ys);
  $: areaPoints = puntosArea(xs, linePoints);
  $: lastIndex = values.length - 1;
  // El marcador del último punto se dibuja como <div> con CSS (no <circle> de SVG):
  // preserveAspectRatio="none" escala X e Y con factores distintos, así que un
  // <circle> con relleno queda ovalado en un contenedor mucho más ancho que alto
  // (vector-effect="non-scaling-stroke" arregla el trazo/borde, pero no la forma
  // rellena). Un <div> posicionado en % con border-radius siempre es un círculo real.
  $: markerLeftPct = lastIndex >= 0 ? (xs[lastIndex] / WIDTH) * 100 : 0;
  $: markerTopPct = lastIndex >= 0 ? (ys[lastIndex] / HEIGHT) * 100 : 0;

  // Misma posición X que la primera serie cuando comparten timestamps (caso real
  // de uso: proyectado/real por tanqueo) — si values2 tiene otra longitud, cae a
  // espaciado por índice en vez de desalinear silenciosamente con `xs`.
  $: xs2 = tieneSegundaSerie
    ? (usaTiempoReal && values2.length === values.length ? xs : calcularXsPorIndice(values2))
    : [];
  $: ys2 = tieneSegundaSerie ? calcularYs(values2) : [];
  $: linePoints2 = tieneSegundaSerie ? puntosLinea(xs2, ys2) : "";
  $: areaPoints2 = tieneSegundaSerie ? puntosArea(xs2, linePoints2) : "";
  $: lastIndex2 = values2.length - 1;
  $: markerLeftPct2 = lastIndex2 >= 0 ? (xs2[lastIndex2] / WIDTH) * 100 : 0;
  $: markerTopPct2 = lastIndex2 >= 0 ? (ys2[lastIndex2] / HEIGHT) * 100 : 0;

  // Un historial que va creciendo (ej. Rendimiento por activo, un punto por cada
  // tanqueo nuevo) no puede seguir mostrando una etiqueta por punto — con 50+
  // tanqueos se amontonan hasta ser ilegibles. Se cae a un máximo fijo de
  // índices a etiquetar, siempre incluyendo el primero y el último, espaciados
  // parejo entre los índices disponibles — el resto de los puntos siguen ahí (la
  // línea no se toca), solo no llevan etiqueta. Con pocos puntos (el caso normal
  // de la tendencia mensual del Dashboard Financiero, ≤8) no cambia nada. Cada
  // etiqueta se posiciona de forma absoluta en su propio `xs[i]` (no en una fila
  // flex pareja) porque con `usaTiempoReal` los puntos ya NO están espaciados
  // parejo — un hueco real de meses sin tanquear debe verse como hueco.
  const MAX_LABELS = 8;
  $: indicesEtiquetas = (() => {
    const n = months.length;
    if (n === 0) return [];
    if (n <= MAX_LABELS) return months.map((_, i) => i);
    const paso = (n - 1) / (MAX_LABELS - 1);
    const idxs = new Set();
    for (let i = 0; i < MAX_LABELS; i++) idxs.add(Math.round(i * paso));
    return [...idxs].sort((a, b) => a - b);
  })();

  // ---- Hover: línea guía + tooltip con el valor exacto del punto más cercano ----
  let wrapEl;
  let hoverIndex = null; // null = no hay hover activo

  function indiceMasCercano(svgX) {
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - svgX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    return nearest;
  }

  function handlePointerMove(event) {
    if (!wrapEl || xs.length === 0) return;
    const rect = wrapEl.getBoundingClientRect();
    if (rect.width === 0) return;
    // preserveAspectRatio="none" estira X de forma independiente al ancho real
    // renderizado, así que el mapeo pixel -> coordenada del viewBox es lineal
    // sin importar cuánto mida el contenedor en pantalla.
    const relX = event.clientX - rect.left;
    const svgX = (relX / rect.width) * WIDTH;
    hoverIndex = indiceMasCercano(svgX);
  }
  function handlePointerLeave() {
    hoverIndex = null;
  }

  $: hoverXPct = hoverIndex != null ? (xs[hoverIndex] / WIDTH) * 100 : null;
  $: hoverValue = hoverIndex != null ? values[hoverIndex] : null;
  $: hoverValue2 = tieneSegundaSerie && hoverIndex != null ? values2[hoverIndex] : null;
  $: hoverLabel = hoverIndex != null ? (months[hoverIndex] || "").replace("\n", " ") : null;
</script>

<div class="trend-chart">
  {#if tieneSegundaSerie}
    <div class="trend-legend">
      <span class="trend-legend-item"><span class="trend-swatch" style="background: {color};"></span>{label}</span>
      <span class="trend-legend-item"><span class="trend-swatch" style="background: {color2};"></span>{label2}</span>
    </div>
  {:else}
    <div class="trend-head">{label}</div>
  {/if}
  {#if values.length}
    <div
      class="trend-svg-wrap"
      bind:this={wrapEl}
      role="presentation"
      on:mousemove={handlePointerMove}
      on:mouseleave={handlePointerLeave}
    >
      <svg
        viewBox="0 0 {WIDTH} {HEIGHT}"
        preserveAspectRatio="none"
        class="trend-svg"
        role="img"
        aria-label="{label}{tieneSegundaSerie ? ` vs ${label2}` : ''}: tendencia"
      >
        <polygon points={areaPoints} fill={color} opacity="0.1" />
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        {#if tieneSegundaSerie}
          <polygon points={areaPoints2} fill={color2} opacity="0.1" />
          <polyline
            points={linePoints2}
            fill="none"
            stroke={color2}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        {/if}
        {#if hoverIndex != null}
          <line
            class="trend-hover-line"
            x1={xs[hoverIndex]}
            x2={xs[hoverIndex]}
            y1="0"
            y2={HEIGHT}
            vector-effect="non-scaling-stroke"
          />
        {/if}
      </svg>
      {#if lastIndex >= 0}
        <div
          class="trend-marker"
          style="left: {markerLeftPct}%; top: {markerTopPct}%; background: {color};"
        ></div>
      {/if}
      {#if tieneSegundaSerie && lastIndex2 >= 0}
        <div
          class="trend-marker"
          style="left: {markerLeftPct2}%; top: {markerTopPct2}%; background: {color2};"
        ></div>
      {/if}
      {#if hoverIndex != null}
        <div
          class="trend-hover-point"
          style="left: {(xs[hoverIndex] / WIDTH) * 100}%; top: {(ys[hoverIndex] / HEIGHT) * 100}%; background: {color};"
        ></div>
        {#if tieneSegundaSerie && ys2[hoverIndex] != null}
          <div
            class="trend-hover-point"
            style="left: {(xs2[hoverIndex] / WIDTH) * 100}%; top: {(ys2[hoverIndex] / HEIGHT) * 100}%; background: {color2};"
          ></div>
        {/if}
        <div class="trend-tooltip" style="left: {hoverXPct}%;">
          <div class="trend-tooltip-label">{hoverLabel}</div>
          {#if tieneSegundaSerie}
            <div class="trend-tooltip-row"><span class="trend-swatch" style="background: {color};"></span>{formatValue(hoverValue)}</div>
            {#if hoverValue2 != null}
              <div class="trend-tooltip-row"><span class="trend-swatch" style="background: {color2};"></span>{formatValue2(hoverValue2)}</div>
            {/if}
          {:else}
            <div class="trend-tooltip-row">{formatValue(hoverValue)}</div>
          {/if}
        </div>
      {/if}
    </div>
    <div class="trend-months">
      {#each indicesEtiquetas as i (i)}
        <span class="trend-month" style="left: {(xs[i] / WIDTH) * 100}%;">{months[i]}</span>
      {/each}
    </div>
    {#if tieneSegundaSerie}
      {#if lastIndex >= 0 && lastIndex2 >= 0}
        <div class="trend-latest">
          Último: <strong>{formatValue(values[lastIndex])}</strong> · <strong>{formatValue2(values2[lastIndex2])}</strong>
        </div>
      {/if}
    {:else if lastIndex >= 0}
      <div class="trend-latest">Último mes: <strong>{formatValue(values[lastIndex])}</strong></div>
    {/if}
  {:else}
    <p class="no-data">Sin datos suficientes.</p>
  {/if}
</div>

<style>
  .trend-chart {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border, rgba(11, 11, 11, 0.08));
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--page, #f7f7f6);
  }
  .trend-head {
    font-size: 12px;
    font-weight: 600;
    color: #52514e;
  }
  .trend-legend {
    display: flex;
    gap: 14px;
    font-size: 12px;
    font-weight: 600;
    color: #52514e;
  }
  .trend-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .trend-swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .trend-svg-wrap {
    position: relative;
  }
  .trend-svg {
    width: 100%;
    height: 90px;
    display: block;
  }
  .trend-marker {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .trend-hover-line {
    stroke: #898781;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    pointer-events: none;
  }
  .trend-hover-point {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(11, 11, 11, 0.3);
  }
  .trend-tooltip {
    position: absolute;
    top: -8px;
    transform: translate(-50%, -100%);
    background: #0b0b0b;
    color: #ffffff;
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 5;
  }
  .trend-tooltip-label {
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 2px;
  }
  .trend-tooltip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #f0f0ef;
  }
  .trend-tooltip-row .trend-swatch {
    width: 6px;
    height: 6px;
  }
  .trend-months {
    /* Posicionamiento absoluto (no flex parejo): con usaTiempoReal los puntos no
       quedan espaciados por índice, así que cada etiqueta se ubica en su propio
       `left: %` (calculado desde xs[i]) en vez de repartirse pareja con
       space-between — un hueco real de tiempo sin tanquear se ve como hueco. */
    position: relative;
    height: 24px;
    font-size: 10px;
    color: #898781;
  }
  .trend-month {
    /* Las etiquetas adaptativas de Historial de Rendimiento vienen como dos
       líneas separadas por "\n" (ej. día arriba / mes abreviado abajo, o mes
       arriba / año abajo en rangos largos) — pre-line respeta ese salto sin
       afectar a los consumidores de una sola línea (Dashboard Financiero). */
    position: absolute;
    top: 0;
    white-space: pre-line;
    text-align: center;
    line-height: 1.3;
    transform: translateX(-50%);
  }
  .trend-latest {
    font-size: 14px;
    color: #0b0b0b;
  }
  .no-data {
    color: #898781;
    font-size: 12px;
    margin: 0;
  }
</style>
