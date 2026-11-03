<script>
  // Activo visto desde arriba (el frente arriba) con sus llantas numeradas 1..n en el
  // orden en que el operario las mide. Cada llanta se pinta con un tono (ok / warn /
  // bad / neu) para mostrar el resultado de una inspección; sin tono queda neutra.
  import { ejesParaDibujo } from "../../lib/presionLlantas.js";

  /** [{ codigo, etiqueta }] en orden. */
  export let posiciones = [];
  /** { [codigo]: "ok" | "warn" | "bad" | "neu" } */
  export let tonos = {};
  /** Ancho en px; el alto sale de la cantidad de ejes. */
  export let ancho = 150;
  export let moto = false;

  const TW = 16; // llanta
  const TH = 30;
  const EJE = 50; // separación entre ejes
  const TOP = 26;

  $: ejes = ejesParaDibujo(posiciones);
  $: alto = TOP + Math.max(ejes.length, 1) * EJE + 6;
  $: angosto = moto || ejes.every((e) => e.length === 1);
  $: cuerpo = angosto ? { x: 61, w: 28 } : { x: 44, w: 62 };

  function xDe(llanta, eje) {
    const izq = eje.filter((l) => l.lado === "I");
    const der = eje.filter((l) => l.lado === "D");
    if (llanta.lado === "C") return 75 - TW / 2;
    if (llanta.lado === "I") return izq.length > 1 ? [6, 24][izq.indexOf(llanta)] ?? 6 : 22;
    return der.length > 1 ? [110, 128][der.indexOf(llanta)] ?? 128 : 112;
  }

  const COLORES = {
    ok: { fill: "#e8f1e8", stroke: "#006300", text: "#006300" },
    warn: { fill: "#faf1de", stroke: "#8a5b00", text: "#8a5b00" },
    bad: { fill: "#fbeaea", stroke: "#d03b3b", text: "#d03b3b" },
    neu: { fill: "#3a3a38", stroke: "#1f1f1e", text: "#ffffff" },
  };
</script>

<svg
  width={ancho}
  height={(alto * ancho) / 150}
  viewBox="0 0 150 {alto}"
  role="img"
  aria-label="Distribución de {posiciones.length} llantas, vista desde arriba"
>
  <text x="75" y="11" text-anchor="middle" font-size="9" fill="#898781">▲ frente</text>
  <rect
    x={cuerpo.x}
    y={TOP - 8}
    width={cuerpo.w}
    height={alto - TOP + 2}
    rx={angosto ? 12 : 14}
    fill="#f0f0ee"
    stroke="#d6d5d1"
  />
  {#each ejes as eje, i}
    {@const y = TOP + i * EJE + (EJE - TH) / 2}
    {#if !angosto}
      <line x1="22" x2="128" y1={y + TH / 2} y2={y + TH / 2} stroke="#d6d5d1" stroke-width="2" />
    {/if}
    {#each eje as llanta (llanta.codigo)}
      {@const c = COLORES[tonos[llanta.codigo] ?? "neu"] ?? COLORES.neu}
      {@const x = xDe(llanta, eje)}
      <g>
        <title>{llanta.numero}. {llanta.etiqueta}</title>
        <rect {x} {y} width={TW} height={TH} rx="4" fill={c.fill} stroke={c.stroke} stroke-width="1.5" />
        <text x={x + TW / 2} y={y + TH / 2 + 3.5} text-anchor="middle" font-size="10" font-weight="700" fill={c.text}>
          {llanta.numero}
        </text>
      </g>
    {/each}
  {/each}
</svg>

<style>
  svg {
    display: block;
    flex: none;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
</style>
