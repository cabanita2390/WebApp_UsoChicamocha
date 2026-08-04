import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
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
});
