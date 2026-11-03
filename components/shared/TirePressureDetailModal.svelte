<script>
  // Detalle de las presiones de una inspección (presionesLlantas del reporte): el
  // activo visto desde arriba con cada llanta coloreada, y la lista con lo medido.
  // Cada lectura trae el rango con que se evaluó al inspeccionar, así que no cambia
  // si después se edita la configuración. Solo informativo: no ofrece crear orden.
  import { createEventDispatcher } from "svelte";
  import TireDiagram from "./TireDiagram.svelte";
  import { estadoPresion, formatPsi, formatRango } from "../../lib/presionLlantas.js";

  /** Fila del reporte de inspección (vehículo, moto o máquina). */
  export let inspection = null;
  export let title = "Presión de llantas";

  const dispatch = createEventDispatcher();

  $: lecturas = [...(inspection?.presionesLlantas ?? [])].sort(
    (a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER),
  );
  $: posiciones = lecturas.map((l) => ({ codigo: l.codigoPosicion, etiqueta: l.etiquetaPosicion || l.codigoPosicion }));
  $: tonos = Object.fromEntries(lecturas.map((l) => [l.codigoPosicion, estadoPresion(l.resultado)?.tono ?? "neu"]));
  $: bajas = lecturas.filter((l) => l.resultado === "BAJA").length;
  $: altas = lecturas.filter((l) => l.resultado === "ALTA").length;
  $: aviso = avisoDe(bajas, altas, lecturas.length);

  function avisoDe(nBajas, nAltas, total) {
    if (!total) return null;
    const partes = [];
    if (nBajas) partes.push(`${nBajas} ${nBajas === 1 ? "llanta baja" : "llantas bajas"}`);
    if (nAltas) partes.push(`${nAltas} ${nAltas === 1 ? "llanta alta" : "llantas altas"}`);
    if (!partes.length) return { tono: "ok", texto: `Las ${total} llantas están en el rango.` };
    return { tono: nBajas ? "bad" : "warn", texto: `${partes.join(" y ")}: el operario debe calibrarlas.` };
  }

  function close() {
    dispatch("close");
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && inspection) close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if inspection}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="tp-overlay" on:click|self={close}>
    <div class="tp-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div class="tp-head">
        <span class="tp-title">{title}</span>
        <button type="button" class="tp-x" aria-label="Cerrar" on:click={close}>×</button>
      </div>
      <div class="tp-body">
        {#if aviso}
          <div class="tp-aviso {aviso.tono}">{aviso.texto}</div>
        {/if}
        {#if lecturas.length}
          <div class="tp-grid">
            <div class="tp-dibujo">
              <TireDiagram {posiciones} {tonos} ancho={150} moto={lecturas.length === 2} />
            </div>
            <ul class="tp-lista">
              {#each lecturas as l, i (l.codigoPosicion)}
                {@const est = estadoPresion(l.resultado)}
                <li class="tp-row">
                  <span class="tp-num {est?.tono ?? 'neu'}">{i + 1}</span>
                  <span class="tp-nombre">
                    {l.etiquetaPosicion || l.codigoPosicion}
                    <small>Rango {formatRango(l.psiMin, l.psiMax)}</small>
                  </span>
                  <strong class="tp-medido">{formatPsi(l.psiMedido)}</strong>
                  <span class="tp-badge {est?.tono ?? 'neu'}">{est?.label ?? "—"}</span>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <p class="tp-vacio">Esta inspección no registró presiones de llantas.</p>
        {/if}
        <p class="tp-nota">Solo es un reporte: la presión no genera órdenes de trabajo; calibrar es tarea del operario.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .tp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.32);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1050;
    padding: 20px;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
  }
  .tp-modal {
    width: 620px;
    max-width: 100%;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.18);
  }
  .tp-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 22px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .tp-title {
    font-size: 16px;
    font-weight: 650;
  }
  .tp-x {
    all: unset;
    cursor: pointer;
    font-size: 20px;
    color: #898781;
    padding: 2px 6px;
  }
  .tp-body {
    padding: 16px 22px 18px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tp-aviso {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
  }
  .tp-grid {
    display: grid;
    grid-template-columns: 172px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .tp-dibujo {
    display: flex;
    justify-content: center;
    padding: 10px;
    border-radius: 10px;
    background: #fafaf9;
    border: 1px solid rgba(11, 11, 11, 0.08);
  }
  .tp-lista {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tp-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto 64px;
    gap: 10px;
    align-items: center;
    padding: 8px 0;
    font-size: 13px;
  }
  .tp-row + .tp-row {
    border-top: 1px solid rgba(11, 11, 11, 0.05);
  }
  .tp-nombre {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .tp-nombre small {
    font-size: 11.5px;
    color: #898781;
  }
  .tp-medido {
    font-size: 14px;
    white-space: nowrap;
  }
  .tp-num {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .tp-badge {
    justify-self: end;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
  .ok { color: #006300; background: #e8f1e8; }
  .warn { color: #8a5b00; background: #faf1de; }
  .bad { color: #d03b3b; background: #fbeaea; }
  .neu { color: #52514e; background: #f0f0ee; }
  .tp-vacio,
  .tp-nota {
    margin: 0;
    font-size: 12.5px;
    color: #898781;
  }
  @media (max-width: 560px) {
    .tp-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
