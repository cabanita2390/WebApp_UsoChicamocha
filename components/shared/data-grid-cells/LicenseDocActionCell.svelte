<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="license-doc-cell">
  {#if row.licenseDocumentUrl}
    <button class="btn-action btn-view-images btn-license-doc" on:click={() => dispatch('action', { type: 'view_license_doc', data: row })}>
      Documento
    </button>
  {:else}
    <span class="license-doc-cell__empty">—</span>
  {/if}
</div>
