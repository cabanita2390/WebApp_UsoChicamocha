<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button class="btn-action btn-doc-history" on:click={() => dispatch('action', { type: 'docHistory', data: row })}>
    Historial docs
  </button>
</div>
