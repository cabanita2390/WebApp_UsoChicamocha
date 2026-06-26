<script>
  import { data as dataStore } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  let oilHydraulic = [], oilMotor = [];
  $: {
    const oils = $dataStore.oils || [];
    oilHydraulic = oils.filter(o => o.type && o.type.trim().toLowerCase() === 'hidraulico');
    oilMotor = oils.filter(o => o.type && o.type.trim().toLowerCase() === 'motor');
  }

  let isLoading = $dataStore.isLoading;
  $: isLoading = $dataStore.isLoading;

  let formError = '', modalError = '';
  $: serverError = $dataStore.error || '';

  let newOilName = '', newOilType = 'hidraulico';
  let showEditModal = false, showDeleteModal = false;
  let selectedOil = null, editedName = '';

  async function createNewOil() {
    formError = '';
    if (!newOilName.trim()) {
      formError = 'El campo Nombre / Marca no puede estar vacío.';
      return;
    }
    try {
      await dataStore.createOil({ name: newOilName, type: newOilType });
      newOilName = '';
    } catch (err) {}
  }

  async function confirmEdit() {
    modalError = '';
    if (!editedName.trim()) {
      modalError = 'El nombre no puede estar vacío.';
      return;
    }
    try {
      await dataStore.updateOil(selectedOil.id, { ...selectedOil, name: editedName });
      closeModals();
    } catch (err) {}
  }

  async function confirmDelete() {
    try {
      await dataStore.deleteOil(selectedOil.id);
      closeModals();
    } catch (err) {}
  }

  function closeModals() {
    showEditModal = false;
    showDeleteModal = false;
    selectedOil = null;
  }

  
  function handleGridAction(event) {
    const { type, data } = event.detail;
    if (type === 'edit') {
      selectedOil = data;
      editedName = data.name;
      modalError = '';
      showEditModal = true;
    } else if (type === 'delete') {
      selectedOil = data;
      showDeleteModal = true;
    }
  }

  const columns = [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Tipo', accessorKey: 'type' },
    { header: 'Acciones', id: 'actions', meta: { isAction: true } }
  ];
</script>

<style>
  .form-container { padding: 12px; border: 1px inset #c0c0c0; background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%); margin-bottom: 2rem; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: end; }
  .form-field { display: flex; flex-direction: column; }
  .form-field label { margin-bottom: 4px; font-weight: bold; }
  .form-field input, .form-field select { padding: 4px; border: 1px inset #808080; background-color: #ffffff; font-family: inherit; font-size: 11px; }
  .form-actions { display: flex; gap: 8px; margin-top: 12px; }
  .btn { padding: 4px 12px; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); border: 1px outset #c0c0c0; cursor: pointer; font-size: 11px; font-family: inherit; }
  .btn:hover { background: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%); }
  .btn:active { border-style: inset; }
  .error { color: red; margin-top: 1rem; font-weight: bold; }
  .table-title { margin-top: 2rem; margin-bottom: 0.5rem; font-size: 14px; }
  .loader-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 200px;
    gap: 16px;
  }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
  .modal-content { background: #e0e0e0; padding: 20px; border: 2px outset #c0c0c0; min-width: 400px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .modal-header h3 { margin: 0; }
  .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
  .modal-form { display: flex; flex-direction: column; gap: 12px; }
  .modal-form label { display: flex; flex-direction: column; gap: 4px; }
  .modal-form input { padding: 4px 6px; border: 1px inset #c0c0c0; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
  .btn-cancel, .btn-save, .btn-delete-confirm { padding: 4px 12px; border: 1px outset #c0c0c0; cursor: pointer; }
  .btn-save { font-weight: bold; }
  .btn-delete-confirm { background-color: #ffbaba; }
  .modal-content.confirmation { text-align: center; }
  .refresh-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .btn-refresh {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
  }
  .btn-refresh:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
  .tables-container {
    display: flex;
    gap: 2rem;
  }
  .table-section {
    flex: 1;
  }
</style>

<!-- Refresh Button -->
<div class="refresh-container">
  <button class="btn-refresh" on:click={() => dataStore.fetchOils()}>
    Refrescar información
  </button>
</div>

<!-- Formulario para Crear -->
<div class="form-container">
  <h3>Nuevo Registro de Aceite</h3>
  <div class="form-grid">
    <div class="form-field">
      <label for="new-name">Nombre / Marca:</label>
      <input id="new-name" bind:value={newOilName} placeholder="Ej: Mobil, Shell..." />
    </div>
    <div class="form-field">
      <label for="new-type">Tipo:</label>
      <select id="new-type" bind:value={newOilType}>
        <option value="hidraulico">Hidráulico</option>
        <option value="motor">Motor</option>
      </select>
    </div>
  </div>
  <div class="form-actions">
    <button class="btn" on:click={createNewOil}>Crear</button>
  </div>
  {#if formError}
    <div class="error">{formError}</div>
  {/if}
</div>

{#if serverError && !formError && !modalError}
  <div class="error">Error del servidor: {serverError}</div>
{/if}

<!-- Tablas de Datos -->
{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando aceites...</p>
  </div>
{:else}
  <div class="tables-container">
    <div class="table-section">
      <h3 class="table-title">Aceites Hidráulicos</h3>
      <DataGrid {columns} data={oilHydraulic} on:action={handleGridAction} />
    </div>
    <div class="table-section">
      <h3 class="table-title">Aceites de Motor</h3>
      <DataGrid {columns} data={oilMotor} on:action={handleGridAction} />
    </div>
  </div>
{/if}


<!-- Modal para Editar -->
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Aceite</h3>
        <button class="close-btn" on:click={closeModals}>×</button>
      </div>
      <form class="modal-form" on:submit|preventDefault={confirmEdit}>
        <label>
          Nombre / Marca:
          <input type="text" bind:value={editedName} required />
        </label>
        {#if modalError}
          <p class="error">{modalError}</p>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeModals}>Cancelar</button>
          <button type="submit" class="btn-save">Guardar Cambios</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal para Eliminar -->
{#if showDeleteModal}
  <div class="modal-overlay">
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar Eliminación</h3>
      <p>¿Está seguro que desea eliminar el registro "<strong>{selectedOil?.name}</strong>"?</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeModals}>Cancelar</button>
        <button type="button" class="btn-delete-confirm" on:click={confirmDelete}>Sí, Eliminar</button>
      </div>
    </div>
  </div>
{/if}
