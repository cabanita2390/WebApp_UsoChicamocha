<script>
  // Stub de FuelTrendChart para tests de vistas que lo montan como hijo
  // (jsdom no soporta el <canvas> 2D real que usa ECharts — ver
  // __tests__/views/FuelTrendChart.test.js para la cobertura del componente
  // real). Hace eco de las props que las vistas ya verificaban antes del
  // cambio a ECharts (leyenda de dos series, etiquetas adaptativas del eje).
  export let label = "";
  export let label2 = "";
  export let months = [];
  export let timestamps = [];
  // Props que el stub no necesita renderizar, pero declara para no ensuciar
  // la consola de test con warnings de "unknown prop".
  export let values = [];
  export let values2 = [];
  export let color = "";
  export let color2 = "";
  export let formatValue = () => "";
  export let formatValue2 = () => "";
</script>

<div class="trend-chart-stub">
  {#if label}<div>{label}</div>{/if}
  {#if label2}<div>{label2}</div>{/if}
  {#each months as mes}<span class="trend-month">{mes}</span>{/each}
  <div data-testid="trend-timestamps" style="display:none">{JSON.stringify(timestamps)}</div>
</div>
