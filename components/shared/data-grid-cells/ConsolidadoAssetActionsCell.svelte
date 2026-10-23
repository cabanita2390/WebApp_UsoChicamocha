<script>
  import { createEventDispatcher } from 'svelte';
  /** Compartido por isConsolidadoVehicleActions e isConsolidadoMotoActions — eran markup idéntico en DataGrid.svelte. */
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell actions-cell-stack">
  <button
    type="button"
    class="mon-action-text mon-action-text--compact"
    title="Corregir el kilometraje actual"
    on:click={() => dispatch('action', { type: 'edit_km', data: row })}
  >
    Corregir Km
  </button>
  <button
    type="button"
    class="mon-action-text mon-action-text--compact mon-action-text--hist"
    title="Ver historial de cambios de aceite"
    on:click={() => dispatch('action', { type: 'monitoring_oil_history', data: row })}
  >
    Ver historial aceite
  </button>
</div>
