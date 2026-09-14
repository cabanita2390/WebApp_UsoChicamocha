<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<div class="actions-cell">
  <button
    type="button"
    class="mon-action-text mon-action-text--compact"
    title="Corregir el valor del horómetro de la última inspección"
    on:click={() => dispatch('action', { type: 'edit_hourmeter', data: row })}
  >
    Corregir Horómetro
  </button>
</div>
