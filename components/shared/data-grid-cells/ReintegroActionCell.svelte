<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
  $: hasSaldoPendiente = Number(row.cantidadGalones) - Number(row.cantidadReintegrada ?? 0) > 0.0001;
</script>

<div class="license-doc-cell">
  {#if hasSaldoPendiente}
    <button class="btn-action btn-view-images btn-license-doc" on:click={() => dispatch('action', { type: 'reintegro', data: row })}>
      Reintegrar
    </button>
  {:else}
    <span class="license-doc-cell__empty">Reintegrado</span>
  {/if}
</div>
