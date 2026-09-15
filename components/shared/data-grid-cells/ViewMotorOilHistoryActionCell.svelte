<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button class="btn-action btn-view-history" on:click={() => dispatch('action', { type: 'viewMotorOilHistory', data: row })}>
    Ver historial motor
  </button>
</div>
