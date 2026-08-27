<script>
  // Gráfico de tendencia respaldado por ECharts (ver dataviz skill: línea 2px,
  // área al 10% de opacidad como wash, marcador ≥8px en el último punto con su
  // valor directo al lado — una sola serie no necesita leyenda). Reemplaza el
  // SVG dibujado a mano: con años de histórico, ECharts da eje de tiempo real,
  // zoom/pan (dataZoom) y ticks legibles sin capar a 8 etiquetas.
  //
  // El ciclo de vida del chart vive en una action (`use:chartAction`), no en
  // onMount/afterUpdate: una action se ejecuta como parte del montaje/parcheo
  // normal del DOM del componente, mientras que onMount/afterUpdate dependen
  // de que el runner de pruebas dispare la cola de callbacks de ciclo de vida
  // de Svelte — @testing-library/svelte 5 sobre Svelte 4 no la dispara, así
  // que un chart inicializado en onMount nunca se monta bajo test.
  import * as echarts from "echarts/core";
  import { LineChart } from "echarts/charts";
  import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from "echarts/components";
  import { CanvasRenderer } from "echarts/renderers";

  echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

  export let label = "";
  export let months = []; // ["2026-02", ...] o etiquetas ya formateadas — usado como categoría X si no hay timestamps, y como respaldo de nombre en el tooltip.
  export let values = [];
  export let color = "#2a78d6";
  export let formatValue = (v) => String(v);
  // Segunda serie opcional (ej. "real" vs "proyectado" en Historial de Rendimiento).
  export let values2 = [];
  export let label2 = "";
  export let color2 = "#e67e22";
  export let formatValue2 = formatValue;
  // Timestamps reales (Date o epoch ms), uno por punto de `values` — opcional.
  // Sin esto, los puntos se reparten por índice en un eje de categorías (bueno
  // para series ya regulares, ej. la tendencia mensual del Dashboard
  // Financiero). Con esto, el eje X es de tiempo real — necesario en un
  // historial de frecuencia irregular (ej. Rendimiento por activo: un hueco de
  // meses sin tanquear debe verse como hueco, no como puntos consecutivos).
  // `values2` reutiliza los mismos timestamps que `values` (mismas filas 1 a 1
  // en los dos usos reales de este componente).
  export let timestamps = [];

  const MES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  $: tieneSegundaSerie = values2.length > 0;
  $: lastIndex = values.length - 1;
  $: lastIndex2 = values2.length - 1;

  function formatEtiquetaEje(ts, rangoMayorAUnAnio) {
    const d = new Date(ts);
    const mes = MES_ABREV[d.getMonth()];
    return rangoMayorAUnAnio ? `${mes}\n${d.getFullYear()}` : `${String(d.getDate()).padStart(2, "0")}\n${mes}`;
  }

  function formatFechaTooltip(ts) {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, "0")}/${MES_ABREV[d.getMonth()]}/${d.getFullYear()}`;
  }

  // Recibe explícitamente todas las props de las que depende (en vez de leer
  // las variables reactivas del closure) para que Svelte pueda detectar
  // correctamente las dependencias de `$: opcion = construirOpcion(...)` más
  // abajo — el análisis de reactividad de Svelte no rastrea qué props se leen
  // *dentro* del cuerpo de una función, solo qué identificadores aparecen en
  // la propia sentencia `$:`.
  function construirOpcion(values, values2, timestamps, months, color, color2, label, label2, formatValue, formatValue2) {
    if (!values.length) return null;

    const tieneSegundaSerie = values2.length > 0;
    const usaTiempoReal = timestamps.length === values.length && values.length > 1;
    const tsNums = usaTiempoReal ? timestamps.map((t) => new Date(t).getTime()) : [];
    const spanMs = tsNums.length ? Math.max(...tsNums) - Math.min(...tsNums) : 0;
    const rangoMayorAUnAnio = spanMs > 366 * 24 * 60 * 60 * 1000;
    // Piso en 0 salvo que haya datos negativos reales (ej. una diferencia o un
    // ahorro que puede quedar en rojo) — así el área sigue leyéndose desde una
    // base estable cuando todo es positivo, sin cortar valores negativos.
    const minEje = Math.min(0, ...values, ...(tieneSegundaSerie ? values2 : []));

    const puntos = (serie) => serie.map((v, i) => [usaTiempoReal ? new Date(timestamps[i]).getTime() : (months[i] ?? i), v]);
    const marcadorUltimoPunto = (serie, fv, colorSerie) => {
      const i = serie.length - 1;
      if (i < 0) return [];
      const x = usaTiempoReal ? new Date(timestamps[i]).getTime() : (months[i] ?? i);
      return [
        {
          value: [x, serie[i]],
          itemStyle: { color: colorSerie, borderColor: "#fff", borderWidth: 2 },
          label: { show: true, formatter: () => fv(serie[i]), position: "right", fontSize: 12, fontWeight: 600, color: "#0b0b0b" },
        },
      ];
    };

    const series = [
      {
        name: label,
        type: "line",
        data: puntos(values),
        color,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.1 },
        emphasis: { focus: "series" },
        markPoint: { symbolSize: 9, data: marcadorUltimoPunto(values, formatValue, color) },
      },
    ];
    if (tieneSegundaSerie) {
      series.push({
        name: label2,
        type: "line",
        data: puntos(values2),
        color: color2,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.1 },
        emphasis: { focus: "series" },
        markPoint: { symbolSize: 9, data: marcadorUltimoPunto(values2, formatValue2, color2) },
      });
    }

    return {
      color: [color, color2],
      grid: { left: 8, right: 16, top: tieneSegundaSerie ? 34 : 14, bottom: 56, containLabel: true },
      legend: tieneSegundaSerie
        ? { top: 0, left: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 12, fontWeight: 600, color: "#52514e" } }
        : undefined,
      xAxis: {
        type: usaTiempoReal ? "time" : "category",
        data: usaTiempoReal ? undefined : (months.length ? months : values.map((_, i) => i)),
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#dedcd6" } },
        axisLabel: {
          color: "#898781",
          fontSize: 10,
          hideOverlap: true,
          formatter: usaTiempoReal ? (value) => formatEtiquetaEje(value, rangoMayorAUnAnio) : undefined,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: minEje,
        axisLabel: { color: "#898781", fontSize: 10, formatter: (v) => formatValue(v) },
        splitLine: { lineStyle: { color: "#eeece7" } },
      },
      dataZoom: [
        { type: "inside" },
        { type: "slider", height: 16, bottom: 6, borderColor: "#dedcd6", fillerColor: "rgba(42,120,214,0.12)" },
      ],
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const p0 = params[0];
          const fecha = usaTiempoReal ? formatFechaTooltip(p0.value[0]) : p0.value[0];
          const filas = params
            .map((p) => {
              const fv = p.seriesIndex === 1 ? formatValue2 : formatValue;
              const prefijo = tieneSegundaSerie ? `${p.marker}${p.seriesName}: ` : p.marker;
              return `<div>${prefijo}${fv(p.value[1])}</div>`;
            })
            .join("");
          return `<div style="font-weight:600;margin-bottom:4px;">${fecha}</div>${filas}`;
        },
      },
      series,
    };
  }

  $: opcion = construirOpcion(values, values2, timestamps, months, color, color2, label, label2, formatValue, formatValue2);

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

<div class="trend-chart">
  {#if !tieneSegundaSerie}
    <div class="trend-head">{label}</div>
  {/if}
  <div class="trend-echarts" class:trend-echarts--hidden={!values.length} use:chartAction={opcion}></div>
  {#if !values.length}
    <p class="no-data">Sin datos suficientes.</p>
  {:else if tieneSegundaSerie && lastIndex >= 0 && lastIndex2 >= 0}
    <div class="trend-latest">
      Último: <strong>{formatValue(values[lastIndex])}</strong> · <strong>{formatValue2(values2[lastIndex2])}</strong>
    </div>
  {:else if lastIndex >= 0}
    <div class="trend-latest">Último mes: <strong>{formatValue(values[lastIndex])}</strong></div>
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
  .trend-echarts {
    width: 100%;
    height: 220px;
  }
  .trend-echarts--hidden {
    display: none;
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
