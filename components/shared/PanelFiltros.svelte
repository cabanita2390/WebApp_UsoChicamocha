<script>
  /**
   * Panel modal "Filtros" (mismo que el del Cronograma Anual): para pantallas con muchos filtros,
   * que así no ocupan media pantalla. El contenido va en el slot; el pie trae Limpiar y Aplicar.
   */
  import { createEventDispatcher, onMount } from "svelte";

  export let titulo = "Filtros";

  const dispatch = createEventDispatcher();
  let panel;

  onMount(() => panel?.focus());

  function onKeydown(e) {
    if (e.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="overlay" on:click|self={() => dispatch("close")}>
  <div class="panel" role="dialog" aria-modal="true" aria-label={titulo} tabindex="-1" bind:this={panel}>
    <div class="cab">
      <button class="x" aria-label="Cerrar" on:click={() => dispatch("close")}>✕</button>
      <span class="t">{titulo}</span>
      <span></span>
    </div>
    <div class="cuerpo">
      <slot />
    </div>
    <div class="pie">
      <button class="limpiar" on:click={() => dispatch("limpiar")}>Limpiar todo</button>
      <button class="aplicar" on:click={() => dispatch("aplicar")}>Aplicar</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .panel {
    width: 640px;
    max-width: 100%;
    max-height: min(860px, calc(100vh - 40px));
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.18);
    outline: none;
    color: #0b0b0b;
  }
  .cab {
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .t {
    text-align: center;
    font-size: 15px;
    font-weight: 650;
  }
  .x {
    all: unset;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 14px;
  }
  .x:hover {
    background: #f0f0ee;
  }
  .x:focus-visible,
  .limpiar:focus-visible,
  .aplicar:focus-visible {
    outline: 2px solid #2a78d6;
    outline-offset: 2px;
  }
  .cuerpo {
    overflow-y: auto;
    padding: 20px 24px;
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .limpiar {
    all: unset;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .aplicar {
    border: 0;
    border-radius: 999px;
    padding: 10px 24px;
    background: #2a78d6;
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .aplicar:hover {
    background: #1f5fae;
  }
</style>
