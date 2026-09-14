<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button
    type="button"
    class="mon-action-text mon-action-text--compact"
    title="Actualizar fechas y archivos de documentación (SOAT, tecnomecánica, tarjeta de propiedad, extintor)"
    on:click={() => dispatch('action', { type: 'monitoring_update_docs', data: row })}
  >
    Actualizar Documentos
  </button>
</div>
