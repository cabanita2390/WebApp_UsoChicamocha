<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button class="btn-action btn-cv" on:click={() => dispatch('action', { type: 'cv', data: row })}>
    Ver Hoja de Vida
  </button>
</div>
