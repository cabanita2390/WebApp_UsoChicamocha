<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
  $: isDone = row?.order?.status === 'Completada' || row?.order?.status === 'Done';
</script>

<div class="actions-cell">
  {#if !isDone}
    <button class="btn-action btn-execute" on:click={() => dispatch('action', { type: 'execute', data: row })}>Ejecutar</button>
  {:else}
    <span class="status-text executed">EJECUTADA</span>
  {/if}
</div>
