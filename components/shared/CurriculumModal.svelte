<script>
  import { createEventDispatcher } from 'svelte';
  import DataGrid from './DataGrid.svelte';
  import Loader from './Loader.svelte';
  import { curriculumColumns } from '../../config/table-definitions.js';

  export let open = false;
  export let plate = null;
  export let loading = false;
  export let results = [];
  export let emptyMessage = 'No hay registros en la hoja de vida.';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }
</script>

{#if open}
  <div class="modal-overlay">
    <div class="modal-content large" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Hoja de Vida: {plate ?? 'Cargando...'}</h3>
        <button class="close-btn" on:click={close}>×</button>
      </div>
      {#if loading}
        <div class="loader-container"><Loader /></div>
      {:else if results?.length > 0}
        <div class="table-wrapper modal-table">
          <DataGrid columns={curriculumColumns} data={results} />
        </div>
      {:else}
        <p style="padding:16px">{emptyMessage}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={close}>Cerrar</button>
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
  .modal-content {
    background: #e0e0e0;
    padding: 20px;
    border: 2px outset #ffffff;
    box-sizing: border-box;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
  }
  .modal-content.large {
    width: min(1200px, 96vw);
    min-width: min(80%, 600px);
    max-width: 96vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
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
  .table-wrapper { overflow: hidden; }
  .modal-table { flex: 1; min-height: 0; margin-top: 16px; }
  .loader-container { display: flex; justify-content: center; align-items: center; flex: 1; }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-cancel { background: #d0d0d0; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
</style>
