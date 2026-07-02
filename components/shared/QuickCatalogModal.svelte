<script>
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let placeholder = 'Ej: …';
  export let value = '';
  export let error = '';
  export let submitting = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }
</script>

{#if open}
  <div class="modal-overlay modal-overlay-front" role="presentation" on:click={close}>
    <div class="modal-content modal-quick" role="dialog" aria-modal="true" aria-labelledby="quick-cat-title" on:click|stopPropagation>
      <div class="modal-header">
        <h3 id="quick-cat-title">{title}</h3>
        <button type="button" class="close-btn" on:click={close}>×</button>
      </div>
      <label class="quick-label">
        Nombre
        <input
          type="text"
          bind:value
          maxlength="200"
          disabled={submitting}
          {placeholder}
        />
      </label>
      {#if error}
        <p class="vehicle-catalog-inline-error">{error}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" disabled={submitting} on:click={close}>Cancelar</button>
        <button type="button" class="btn-save" disabled={submitting} on:click={() => dispatch('submit')}>
          {submitting ? 'Guardando…' : 'Guardar y usar'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-overlay-front {
    z-index: 1100;
  }
  .modal-content {
    background: #e0e0e0;
    padding: 20px;
    border: 2px outset #ffffff;
    width: min(96vw, 760px);
    max-width: 96vw;
    box-sizing: border-box;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
  }
  .modal-content.modal-quick {
    width: auto;
    max-width: min(440px, 96vw);
    min-width: min(280px, 100vw - 16px);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #808080;
    padding-bottom: 5px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .quick-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: bold;
  }
  .quick-label input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-cancel { background: #d0d0d0; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .btn-save { background: #90ee90; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
</style>
