<script>
  // Mini gráfico de línea para tendencias mensuales (dataviz skill: línea 2px,
  // extremo redondeado, área al 10% de opacidad como wash, marcador ≥8px en el
  // último punto con su valor directo al lado — una sola serie no necesita leyenda).
  export let label = "";
  export let months = []; // ["2026-02", ...] o etiquetas ya formateadas
  export let values = [];
  export let color = "#2a78d6";
  export let formatValue = (v) => String(v);

  const WIDTH = 320;
  const HEIGHT = 110;
  const PAD_X = 8;
  const PAD_Y = 14;

  $: max = values.length ? Math.max(...values, 0) : 0;
  $: usableW = WIDTH - PAD_X * 2;
  $: usableH = HEIGHT - PAD_Y * 2;
  $: xs = values.map((_, i) => PAD_X + (values.length > 1 ? (i / (values.length - 1)) * usableW : usableW / 2));
  $: ys = values.map((v) => {
    const ratio = max > 0 ? v / max : 0;
    return PAD_Y + usableH - ratio * usableH;
  });
  $: linePoints = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  $: areaPoints = xs.length
    ? `${xs[0]},${PAD_Y + usableH} ${linePoints} ${xs[xs.length - 1]},${PAD_Y + usableH}`
    : "";
  $: lastIndex = values.length - 1;
  // El marcador del último punto se dibuja como <div> con CSS (no <circle> de SVG):
  // preserveAspectRatio="none" escala X e Y con factores distintos, así que un
  // <circle> con relleno queda ovalado en un contenedor mucho más ancho que alto
  // (vector-effect="non-scaling-stroke" arregla el trazo/borde, pero no la forma
  // rellena). Un <div> posicionado en % con border-radius siempre es un círculo real.
  $: markerLeftPct = lastIndex >= 0 ? (xs[lastIndex] / WIDTH) * 100 : 0;
  $: markerTopPct = lastIndex >= 0 ? (ys[lastIndex] / HEIGHT) * 100 : 0;
</script>

<div class="trend-chart">
  <div class="trend-head">{label}</div>
  {#if values.length}
    <div class="trend-svg-wrap">
      <svg
        viewBox="0 0 {WIDTH} {HEIGHT}"
        preserveAspectRatio="none"
        class="trend-svg"
        role="img"
        aria-label="{label}: tendencia mensual"
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
      </svg>
      {#if lastIndex >= 0}
        <div
          class="trend-marker"
          style="left: {markerLeftPct}%; top: {markerTopPct}%; background: {color};"
        ></div>
      {/if}
    </div>
    <div class="trend-months">
      {#each months as m}
        <span class="trend-month">{m}</span>
      {/each}
    </div>
    {#if lastIndex >= 0}
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
  .trend-months {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #898781;
    padding: 0 2px;
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
