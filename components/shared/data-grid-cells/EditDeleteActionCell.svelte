<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  export let showDeleteButton = true;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button class="btn-action btn-edit" on:click={() => dispatch('action', { type: 'edit', data: row })}>Editar</button>
  {#if showDeleteButton}
    <button class="btn-action btn-delete" on:click={() => dispatch('action', { type: 'delete', data: row })}>Eliminar</button>
  {/if}
</div>
