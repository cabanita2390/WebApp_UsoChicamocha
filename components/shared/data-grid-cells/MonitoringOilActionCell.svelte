<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell actions-cell-stack">
  <button
    type="button"
    class="mon-action-text mon-action-text--compact"
    title="Registrar cambio de aceite"
    on:click={() => dispatch('action', { type: 'monitoring_register_oil', data: row })}
  >
    Registrar aceite
  </button>
  <button
    type="button"
    class="mon-action-text mon-action-text--compact mon-action-text--hist"
    title="Ver historial de cambios de aceite"
    on:click={() => dispatch('action', { type: 'monitoring_oil_history', data: row })}
  >
    Ver historial
  </button>
</div>
