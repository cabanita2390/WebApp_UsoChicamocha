import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FuelTrendChart from '../../components/views/FuelTrendChart.svelte';

/**
 * Bug real reportado por el usuario: el gráfico se veía "pegado al centro" sin
 * estirarse a lo ancho, mientras los meses de abajo (flex space-between) sí
 * ocupaban el 100% del contenedor — la línea y los meses quedaban desalineados.
 * Causa: el <svg> tiene viewBox="0 0 320 110" con width:100% pero SIN
 * preserveAspectRatio="none" — el navegador aplica el default (xMidYMid meet),
 * que escala manteniendo la proporción 320:110 y centra el contenido en vez de
 * estirarlo al ancho real del contenedor.
 */
describe('FuelTrendChart', () => {
  it('el <svg> tiene preserveAspectRatio="none" para estirarse al ancho real del contenedor', () => {
    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Consumo mensual (galones)',
        months: ['02/26', '03/26', '04/26'],
        values: [10, 20, 15],
      },
    });

    const svg = container.querySelector('svg.trend-svg');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
  });

  it('la línea tiene vector-effect="non-scaling-stroke" para que el trazo no se deforme con el estirado no uniforme de preserveAspectRatio="none"', () => {
    // Bug real encontrado después del fix anterior: al estirar el SVG con
    // preserveAspectRatio="none" en un contenedor mucho más ancho que alto, los
    // tramos casi verticales de la línea (subidas/bajadas pronunciadas) se veían
    // mucho más gruesos que los tramos planos — el stroke-width se escala junto
    // con la geometría a menos que se marque como "non-scaling-stroke".
    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Consumo mensual (galones)',
        months: ['02/26', '03/26', '04/26'],
        values: [10, 20, 15],
      },
    });

    const polyline = container.querySelector('polyline');
    expect(polyline.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('el punto del último mes es un <div> con CSS, no un <circle> de SVG, para que no quede ovalado por el estirado no uniforme', () => {
    // Otro efecto del mismo preserveAspectRatio="none": un <circle> con relleno
    // queda ovalado en un contenedor mucho más ancho que alto (vector-effect solo
    // corrige el trazo/borde, no la forma rellena). Se reemplazó por un <div>
    // posicionado en % con border-radius, que siempre es un círculo real.
    // values=[5, 20]: el último punto (20) es también el máximo, así el cálculo
    // de posición Y solo depende del padding vertical fijo (más fácil de verificar).
    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Consumo mensual (galones)',
        months: ['02/26', '03/26'],
        values: [5, 20],
      },
    });

    expect(container.querySelector('circle')).toBeNull();
    const marker = container.querySelector('.trend-marker');
    expect(marker).toBeTruthy();
    // WIDTH=320, PAD_X=8 -> último punto en x=312 -> 97.5% desde la izquierda.
    expect(parseFloat(marker.style.left)).toBeCloseTo(97.5, 5);
    // HEIGHT=110, PAD_Y=14, valor máximo -> y=PAD_Y=14 -> 12.727...% desde arriba.
    expect(parseFloat(marker.style.top)).toBeCloseTo((14 / 110) * 100, 5);
  });

  it('muestra "Sin datos suficientes." cuando no hay valores, sin renderizar el svg', () => {
    const { container, getByText } = render(FuelTrendChart, {
      props: { label: 'Consumo mensual (galones)', months: [], values: [] },
    });

    expect(getByText('Sin datos suficientes.')).toBeTruthy();
    expect(container.querySelector('svg.trend-svg')).toBeNull();
  });

  it('con una sola serie no muestra leyenda, solo el título simple', () => {
    const { container, queryByText } = render(FuelTrendChart, {
      props: { label: 'Consumo mensual (galones)', months: ['02/26', '03/26'], values: [10, 20] },
    });

    expect(container.querySelector('.trend-legend')).toBeNull();
    expect(queryByText('Consumo mensual (galones)')).toBeTruthy();
  });

  it('con dos series (values2) dibuja una segunda línea, un segundo marcador y la leyenda con ambos nombres', () => {
    const { container, getByText } = render(FuelTrendChart, {
      props: {
        label: 'Proyectado',
        color: '#2a78d6',
        months: ['T1', 'T2', 'T3'],
        values: [10, 20, 15],
        label2: 'Real',
        color2: '#e67e22',
        values2: [12, 18, 22],
      },
    });

    expect(getByText('Proyectado')).toBeTruthy();
    expect(getByText('Real')).toBeTruthy();
    expect(container.querySelectorAll('polyline').length).toBe(2);
    expect(container.querySelectorAll('.trend-marker').length).toBe(2);
  });

  it('con dos series, el resumen final muestra el último valor de cada una', () => {
    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Proyectado',
        months: ['T1', 'T2'],
        values: [10, 20],
        label2: 'Real',
        values2: [12, 25],
        formatValue: (v) => `${v} gal`,
        formatValue2: (v) => `${v} gal`,
      },
    });

    const resumen = container.querySelector('.trend-latest');
    expect(resumen.textContent).toContain('20 gal');
    expect(resumen.textContent).toContain('25 gal');
  });

  it('con muchos puntos (historial que va creciendo), limita a un máximo de 8 etiquetas visibles en vez de una por punto', () => {
    // 30 puntos: mostrar las 30 etiquetas sería ilegible — debe quedarse en 8,
    // incluyendo siempre la primera y la última.
    const n = 30;
    const months = Array.from({ length: n }, (_, i) => `día-${i}`);
    const values = Array.from({ length: n }, (_, i) => i);

    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months, values },
    });

    // Cada etiqueta visible se posiciona en su propio índice real (no hay spans
    // en blanco reservando espacio) — como máximo 8 en el DOM.
    const etiquetas = [...container.querySelectorAll('.trend-month')];
    expect(etiquetas.length).toBeLessThanOrEqual(8);
    expect(etiquetas[0].textContent).toBe('día-0');
    expect(etiquetas[etiquetas.length - 1].textContent).toBe(`día-${n - 1}`);
  });

  it('con pocos puntos (≤8, el caso normal de la tendencia mensual) muestra todas las etiquetas sin recortar', () => {
    const months = ['02/26', '03/26', '04/26', '05/26'];
    const values = [10, 20, 15, 25];

    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months, values },
    });

    const etiquetas = [...container.querySelectorAll('.trend-month')].map((el) => el.textContent);
    expect(etiquetas).toEqual(months);
  });

  it('sin timestamps, los 3 puntos quedan espaciados por orden (índice), parejo sin importar la fecha real', () => {
    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months: ['a', 'b', 'c'], values: [10, 20, 30] },
    });

    const etiquetaB = [...container.querySelectorAll('.trend-month')].find((el) => el.textContent === 'b');
    // Punto del medio sin timestamps -> justo a la mitad del ancho útil.
    expect(parseFloat(etiquetaB.style.left)).toBeCloseTo(50, 0);
  });

  it('con timestamps, un hueco real de tiempo entre puntos se refleja en la posición X (no queda parejo por índice)', () => {
    // t0 -> t1: 1 día. t1 -> t2: ~100 días. El punto "b" debe quedar pegado a "a"
    // (casi todo el rango ocurre DESPUÉS de b), no a la mitad como sin timestamps.
    const t0 = new Date('2026-01-01T00:00:00').getTime();
    const t1 = new Date('2026-01-02T00:00:00').getTime();
    const t2 = new Date('2026-04-11T00:00:00').getTime();

    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Consumo',
        months: ['a', 'b', 'c'],
        values: [10, 20, 30],
        timestamps: [t0, t1, t2],
      },
    });

    const etiquetaB = [...container.querySelectorAll('.trend-month')].find((el) => el.textContent === 'b');
    expect(parseFloat(etiquetaB.style.left)).toBeLessThan(10);
  });

  it('si values2 no coincide en longitud con timestamps, la segunda serie cae a espaciado por índice en vez de desalinearse', () => {
    const t0 = new Date('2026-01-01').getTime();
    const t1 = new Date('2026-04-11').getTime();

    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Proyectado',
        months: ['a', 'b'],
        values: [10, 20],
        timestamps: [t0, t1],
        label2: 'Real',
        values2: [5, 15, 25], // longitud distinta a `values`/`timestamps`
      },
    });

    // No debe lanzar error ni dejar de dibujar la segunda línea.
    expect(container.querySelectorAll('polyline').length).toBe(2);
  });

  // JSDOM devuelve getBoundingClientRect() en ceros por defecto — se simula un
  // rect plausible (320px de ancho, alineado con WIDTH del componente) para que
  // el mapeo pixel -> coordenada del viewBox dé resultados verificables.
  function mockRect(el, { left = 0, width = 320 } = {}) {
    el.getBoundingClientRect = () => ({ left, width, top: 0, height: 90, right: left + width, bottom: 90, x: left, y: 0, toJSON() {} });
  }

  it('al mover el mouse sobre el gráfico, muestra un tooltip con la etiqueta y el valor del punto más cercano', async () => {
    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months: ['a', 'b', 'c'], values: [10, 20, 30], formatValue: (v) => `${v} gal` },
    });
    const wrap = container.querySelector('.trend-svg-wrap');
    mockRect(wrap);

    expect(container.querySelector('.trend-tooltip')).toBeNull();

    // Los 3 puntos quedan en x=8/160/312 (índice, sin timestamps) — clientX=160
    // cae exacto sobre el punto del medio ('b', valor 20).
    await fireEvent.mouseMove(wrap, { clientX: 160 });

    const tooltip = container.querySelector('.trend-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('b');
    expect(tooltip.textContent).toContain('20 gal');
  });

  it('al sacar el mouse del gráfico, el tooltip y el punto resaltado desaparecen', async () => {
    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months: ['a', 'b', 'c'], values: [10, 20, 30] },
    });
    const wrap = container.querySelector('.trend-svg-wrap');
    mockRect(wrap);

    await fireEvent.mouseMove(wrap, { clientX: 160 });
    expect(container.querySelector('.trend-tooltip')).toBeTruthy();

    await fireEvent.mouseLeave(wrap);
    expect(container.querySelector('.trend-tooltip')).toBeNull();
    expect(container.querySelector('.trend-hover-point')).toBeNull();
  });

  it('con dos series, el tooltip muestra el valor de ambas en el mismo punto', async () => {
    const { container } = render(FuelTrendChart, {
      props: {
        label: 'Proyectado',
        months: ['a', 'b', 'c'],
        values: [10, 20, 30],
        label2: 'Real',
        values2: [12, 18, 33],
        formatValue: (v) => `P:${v}`,
        formatValue2: (v) => `R:${v}`,
      },
    });
    const wrap = container.querySelector('.trend-svg-wrap');
    mockRect(wrap);

    await fireEvent.mouseMove(wrap, { clientX: 160 });

    const tooltip = container.querySelector('.trend-tooltip');
    expect(tooltip.textContent).toContain('P:20');
    expect(tooltip.textContent).toContain('R:18');
    expect(container.querySelectorAll('.trend-hover-point').length).toBe(2);
  });

  it('mover el mouse cerca del punto más a la izquierda resalta el primer punto, no el último', async () => {
    const { container } = render(FuelTrendChart, {
      props: { label: 'Consumo', months: ['a', 'b', 'c'], values: [10, 20, 30] },
    });
    const wrap = container.querySelector('.trend-svg-wrap');
    mockRect(wrap);

    await fireEvent.mouseMove(wrap, { clientX: 10 });

    expect(container.querySelector('.trend-tooltip').textContent).toContain('a');
  });
});
