<script>
  /**
   * Elegir el periodo de una descarga a Excel (inspecciones, órdenes, hojas de vida). Atajos para lo
   * más común y un rango a la medida; "Todo el historial" descarga como antes, sin fechas.
   * Al confirmar emite `descargar` con { desde, hasta } en formato aaaa-mm-dd (o vacío = todo).
   */
  import { createEventDispatcher } from "svelte";
  import { PRESETS_PERIODO, rangoDePreset } from "../../utils/periodoExcel.js";

  export let abierto = false;
  /** Qué se descarga, para el título ("Inspecciones de vehículos"). */
  export let titulo = "Descargar Excel";
  export let descargando = false;

  const dispatch = createEventDispatcher();

  let preset = "anio";
  let desde = "";
  let hasta = "";

  $: if (abierto && preset !== "rango") ({ desde, hasta } = rangoDePreset(preset));
  $: invalido = preset === "rango" && desde && hasta && hasta < desde;

  function cerrar() {
    abierto = false;
  }

  function descargar() {
    if (invalido || descargando) return;
    dispatch("descargar", preset === "todo" ? {} : { desde: desde || undefined, hasta: hasta || undefined });
  }

  function onKeydown(e) {
    if (abierto && e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if abierto}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="pe-overlay" on:click|self={cerrar}>
    <div class="pe-modal" role="dialog" aria-modal="true" aria-label={titulo}>
      <div class="pe-head">
        <span class="pe-title">{titulo}</span>
        <button class="pe-x" aria-label="Cerrar" on:click={cerrar}>×</button>
      </div>
      <div class="pe-body">
        <span class="pe-label" id="pe-periodo">Periodo</span>
        <div class="pe-presets" role="radiogroup" aria-labelledby="pe-periodo">
          {#each PRESETS_PERIODO as p}
            <button type="button" role="radio" aria-checked={preset === p.value} class:on={preset === p.value}
              on:click={() => (preset = p.value)}>{p.label}</button>
          {/each}
        </div>
        {#if preset !== "todo"}
          <div class="pe-fechas">
            <label>Desde
              <input type="date" bind:value={desde} disabled={preset !== "rango"} />
            </label>
            <label>Hasta
              <input type="date" bind:value={hasta} disabled={preset !== "rango"} />
            </label>
          </div>
        {/if}
        {#if invalido}<div class="pe-error" role="alert">La fecha final es anterior a la inicial.</div>{/if}
        <p class="pe-nota">El archivo trae una portada con el periodo, las cifras principales y un índice de las hojas.</p>
      </div>
      <div class="pe-foot">
        <button class="pe-btn" on:click={cerrar}>Cancelar</button>
        <button class="pe-btn primario" disabled={invalido || descargando} on:click={descargar}>
          {descargando ? "Generando…" : "Descargar"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .pe-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.32);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1100;
  }
  .pe-modal {
    width: 520px;
    max-width: 100%;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.18);
    font-family: inherit;
  }
  .pe-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .pe-title {
    font-size: 16px;
    font-weight: 650;
  }
  .pe-x {
    all: unset;
    cursor: pointer;
    font-size: 20px;
    color: #898781;
    padding: 2px 6px;
  }
  .pe-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .pe-label {
    font-size: 13px;
    font-weight: 600;
    color: #3f3e3b;
  }
  .pe-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pe-presets button {
    border: 1.5px solid #e6e1ee;
    background: #fff;
    border-radius: 999px;
    padding: 6px 12px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .pe-presets button.on {
    border-color: #5b3fa0;
    background: #f7f3fc;
    color: #5b3fa0;
    font-weight: 600;
  }
  .pe-fechas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .pe-fechas label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #52514e;
  }
  .pe-fechas input {
    padding: 8px 10px;
    border: 1px solid #dcd7e4;
    border-radius: 8px;
    font: inherit;
  }
  .pe-fechas input:disabled {
    background: #f6f5f3;
    color: #6b6a66;
  }
  .pe-error {
    color: #b02a2a;
    font-size: 12.5px;
  }
  .pe-nota {
    margin: 0;
    font-size: 12px;
    color: #898781;
  }
  .pe-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .pe-btn {
    border: 1px solid #dcd7e4;
    background: #fff;
    border-radius: 999px;
    padding: 8px 16px;
    font: inherit;
    font-size: 13.5px;
    cursor: pointer;
  }
  .pe-btn.primario {
    background: #2a78d6;
    border-color: #2a78d6;
    color: #fff;
    font-weight: 600;
  }
  .pe-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
