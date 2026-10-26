<script>
  // Mínima / ideal / máxima en PSI de una llanta o de un grupo de llantas.
  /** { psiMin, psiObjetivo, psiMax } como texto. */
  export let rango;
  /** Prefijo para los aria-label ("Todas las llantas", "Delanteras"...). */
  export let nombre = "";
  export let disabled = false;
  export let compacto = false;
</script>

<div class="rango" class:compacto>
  <label class="sub-field">
    {#if !compacto}Mínima{/if}
    <span class="psi">
      <input class="sub-input" type="number" step="0.5" min="0" inputmode="decimal" placeholder="Ej. 28"
        aria-label="{nombre} — presión mínima" bind:value={rango.psiMin} {disabled} />
      <span class="unit">PSI</span>
    </span>
  </label>
  <label class="sub-field">
    {#if !compacto}Ideal <span class="opt">(opcional)</span>{/if}
    <span class="psi">
      <input class="sub-input" type="number" step="0.5" min="0" inputmode="decimal" placeholder="Opcional"
        aria-label="{nombre} — presión ideal" bind:value={rango.psiObjetivo} {disabled} />
      <span class="unit">PSI</span>
    </span>
  </label>
  <label class="sub-field">
    {#if !compacto}Máxima{/if}
    <span class="psi">
      <input class="sub-input" type="number" step="0.5" min="0" inputmode="decimal" placeholder="Ej. 33"
        aria-label="{nombre} — presión máxima" bind:value={rango.psiMax} {disabled} />
      <span class="unit">PSI</span>
    </span>
  </label>
</div>

<style>
  .rango {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .psi {
    position: relative;
    display: block;
  }
  .psi input {
    width: 100%;
    padding-right: 38px;
  }
  .unit {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: var(--sub-muted);
    pointer-events: none;
  }
  .opt {
    color: var(--sub-muted);
  }
  .compacto {
    gap: 6px;
  }
  .compacto .sub-input {
    height: 32px;
  }
</style>
