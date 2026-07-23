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
</script>

<div class="trend-chart">
  <div class="trend-head">{label}</div>
  {#if values.length}
    <svg viewBox="0 0 {WIDTH} {HEIGHT}" class="trend-svg" role="img" aria-label="{label}: tendencia mensual">
      <polygon points={areaPoints} fill={color} opacity="0.1" />
      <polyline points={linePoints} fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      {#if lastIndex >= 0}
        <circle cx={xs[lastIndex]} cy={ys[lastIndex]} r="4.5" fill={color} stroke="#ffffff" stroke-width="2" />
      {/if}
    </svg>
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
  }
  .trend-head {
    font-size: 12px;
    font-weight: 600;
    color: #52514e;
  }
  .trend-svg {
    width: 100%;
    height: 90px;
    display: block;
  }
  .trend-months {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #898781;
    padding: 0 2px;
  }
  .trend-latest {
    font-size: 12px;
    color: #0b0b0b;
  }
  .no-data {
    color: #898781;
    font-size: 12px;
    margin: 0;
  }
</style>
