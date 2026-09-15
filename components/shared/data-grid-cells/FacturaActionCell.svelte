<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="license-doc-cell">
  {#if row.urlFactura}
    <button class="btn-action btn-view-images btn-license-doc" on:click={() => dispatch('action', { type: 'view_factura', data: row })}>
      Factura
    </button>
  {:else}
    <span class="license-doc-cell__empty">—</span>
  {/if}
</div>
