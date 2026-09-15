<script>
  // Barras horizontales de % de cumplimiento por estación, coloreadas por el
  // mismo semáforo que ya usa el Excel del ingeniero (>55% verde, 36-55%
  // amarillo, <35% rojo — ver semaforoCumplimientoColor en
  // config/table-definitions/substation.js). Mismo patrón de ciclo de vida que
  // FuelTrendChart.svelte (use:chartAction, no onMount/afterUpdate — ver ese
  // archivo para el porqué).
  import * as echarts from "echarts/core";
  import { BarChart } from "echarts/charts";
  import { GridComponent, TooltipComponent } from "echarts/components";
  import { CanvasRenderer } from "echarts/renderers";
  import { semaforoCumplimientoColor } from "../../config/table-definitions/substation.js";

  echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

  /** @type {{ estacionNombre: string, porcentajeCumplimiento: number|string }[]} */
  export let estaciones = [];

  const COLOR_HEX = { green: "#1b5e20", yellow: "#e65100", red: "#c62828" };

  // Peor a mejor cumplimiento primero (mismo orden que la tabla de abajo) — con
  // yAxis.inverse la primera fila del arreglo queda arriba del todo.
  $: ordenadas = [...estaciones].sort(
    (a, b) => (Number(a.porcentajeCumplimiento) || 0) - (Number(b.porcentajeCumplimiento) || 0),
  );

  function construirOpcion(lista) {
    if (!lista.length) return null;
    const nombres = lista.map((e) => e.estacionNombre);
    const valores = lista.map((e) => Number(e.porcentajeCumplimiento) || 0);
    const colores = valores.map((v) => COLOR_HEX[semaforoCumplimientoColor(v)]);
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", show: false, max: 100 },
      yAxis: {
        type: "category",
        data: nombres,
        inverse: true,
        axisLine: { lineStyle: { color: "#dedcd6" } },
        axisLabel: { color: "#52514e", fontSize: 11.5 },
        axisTick: { show: false },
      },
      tooltip: { trigger: "item", formatter: (p) => `${p.name}: <strong>${p.value}%</strong>` },
      series: [
        {
          type: "bar",
          data: valores.map((v, i) => ({ value: v, itemStyle: { color: colores[i], borderRadius: [0, 4, 4, 0] } })),
          barWidth: 14,
          label: {
            show: true,
            position: "right",
            formatter: (p) => `${p.value}%`,
            fontSize: 11.5,
            fontWeight: 700,
            color: "#0b0b0b",
          },
        },
      ],
    };
  }

  $: opcion = construirOpcion(ordenadas);
  $: alturaPx = Math.max(120, ordenadas.length * 28);

  function chartAction(node, opcionInicial) {
    let chart = null;
    let resizeObserver = null;

    const aplicar = (nuevaOpcion) => {
      if (!nuevaOpcion) {
        chart?.dispose();
        chart = null;
        return;
      }
      if (!chart) {
        chart = echarts.init(node);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => chart?.resize());
          resizeObserver.observe(node);
        }
      }
      chart.setOption(nuevaOpcion, true);
    };

    aplicar(opcionInicial);

    return {
      update: aplicar,
      destroy() {
        resizeObserver?.disconnect();
        chart?.dispose();
      },
    };
  }
</script>

{#if !ordenadas.length}
  <p class="no-data">Sin estaciones para mostrar.</p>
{:else}
  <div class="chart-wrap" style="height: {alturaPx}px" use:chartAction={opcion}></div>
{/if}

<style>
  .chart-wrap {
    width: 100%;
  }
  .no-data {
    color: #898781;
    font-size: 12px;
    margin: 0;
  }
</style>
