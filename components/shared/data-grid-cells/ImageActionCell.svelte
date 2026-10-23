<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button class="btn-action btn-view-images" on:click={() => dispatch('action', { type: 'view_images', data: row })}>
    Ver
  </button>
</div>
