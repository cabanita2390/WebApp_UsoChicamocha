<script>
  // Mini-gráfica de cada tarjeta de Rendimiento (esperado vs. ejecutado, los
  // últimos ~10 tanqueos del activo) — un vistazo rápido para decidir si hay
  // que entrar al historial completo. Mismo motor (ECharts) y ciclo de vida
  // (action, no onMount/afterUpdate — ver FuelTrendChart.svelte para el porqué)
  // que el gráfico grande, pero sin ejes/leyenda/zoom: se renderiza en grilla,
  // potencialmente decenas de tarjetas a la vez, así que se mantiene lo más
  // liviano posible (sin animación, sin dataZoom).
  import * as echarts from "echarts/core";
  import { LineChart } from "echarts/charts";
  import { GridComponent, TooltipComponent } from "echarts/components";
  import { CanvasRenderer } from "echarts/renderers";

  echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

  export let esperado = [];
  export let ejecutado = [];
  export let unidad = "";
  export let colorEsperado = "#2a78d6";
  export let colorEjecutado = "#eb6834";
  export let height = 76;

  const fmt = (n) => new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  function construirOpcion(esperado, ejecutado, colorEsperado, colorEjecutado) {
    if (esperado.length < 2 || ejecutado.length < 2) return null;
    const minEje = Math.min(0, ...esperado, ...ejecutado);

    return {
      animation: false,
      grid: { left: 1, right: 1, top: 4, bottom: 4 },
      xAxis: { type: "category", show: false, boundaryGap: false },
      yAxis: { type: "value", show: false, min: minEje },
      tooltip: {
        trigger: "axis",
        confine: true,
        textStyle: { fontSize: 11 },
        formatter: (params) => {
          const i = params[0].dataIndex;
          return `Esperado: <strong>${fmt(esperado[i])} ${unidad}</strong><br/>Ejecutado: <strong>${fmt(ejecutado[i])} ${unidad}</strong>`;
        },
      },
      series: [
        { type: "line", data: esperado, showSymbol: false, silent: true, lineStyle: { width: 2, color: colorEsperado } },
        {
          type: "line",
          data: ejecutado,
          showSymbol: false,
          lineStyle: { width: 2.2, color: colorEjecutado },
          areaStyle: { opacity: 0.1, color: colorEjecutado },
          itemStyle: { color: colorEjecutado },
        },
      ],
    };
  }

  $: opcion = construirOpcion(esperado, ejecutado, colorEsperado, colorEjecutado);

  function chartAction(node, opcionInicial) {
    let chart = null;

    const aplicar = (nuevaOpcion) => {
      if (!nuevaOpcion) {
        chart?.dispose();
        chart = null;
        return;
      }
      if (!chart) chart = echarts.init(node);
      chart.setOption(nuevaOpcion, true);
    };

    aplicar(opcionInicial);

    return {
      update: aplicar,
      destroy() {
        chart?.dispose();
      },
    };
  }
</script>

<div class="fuel-card-spark" style="height: {height}px;" use:chartAction={opcion}></div>

<style>
  .fuel-card-spark {
    width: 100%;
    margin: 14px 0 6px;
  }
</style>
