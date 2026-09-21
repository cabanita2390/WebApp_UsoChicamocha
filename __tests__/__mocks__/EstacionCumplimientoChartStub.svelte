<script>
  // Stub de EstacionCumplimientoChart para vistas que lo montan como hijo —
  // jsdom no soporta el <canvas> 2D real que usa ECharts (ver
  // __tests__/views/EstacionCumplimientoChart.test.js para la cobertura del
  // componente real). Mismo espíritu que FuelTrendChartStub.svelte.
  export let estaciones = [];
</script>

<div class="cumplimiento-chart-stub" data-testid="cumplimiento-chart-stub">
  {#each estaciones as e}
    <span class="chart-bar">{e.estacionNombre}: {e.porcentajeCumplimiento}%</span>
  {/each}
</div>
