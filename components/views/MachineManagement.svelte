<script>
  import { data } from "../../stores/data.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import {
    machineColumns,
    curriculumColumns,
  } from "../../config/table-definitions.js";
  import { onDestroy } from 'svelte';
  import { addNotification } from '../../stores/ui.js';

  let isDeleteMachineEnabled = false;
  let deleteMachineTimer;

  let isSubmitting = false;
  let errorMessage = "";
  let isExporting = false;

  const initialMachineState = {
    name: "",
    model: "",
    numEngine: "",
    numInterIdentification: "",
    brand: "",
    soat: "",
    runt: "",
    belongsTo: "distrito",
  };
  let newMachine = { ...initialMachineState };

  let machineInEditor = null;
  let showEditModal = false;
  let machineToDelete = null;
  let showCvModal = false;
  let isCvLoading = false;
  let curriculumData = null;

  $: machines = $data.machines;
  $: isLoading = $data.isLoading;

  $: if (machineToDelete) {
    isDeleteMachineEnabled = false;
    clearTimeout(deleteMachineTimer);
    deleteMachineTimer = setTimeout(() => {
      isDeleteMachineEnabled = true;
    }, 10000);
  }

  onDestroy(() => {
    clearTimeout(deleteMachineTimer);
  });

  async function handleCreateMachine(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.createMachine(newMachine);
      newMachine = { ...initialMachineState };
    } catch (e) {
      errorMessage = e.message || "Error al crear máquina.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUpdateMachine(event) {
    event.preventDefault();
    if (!machineInEditor) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.updateMachine(machineInEditor);
      closeEditModal();
    } catch (e) {
      errorMessage = e.message || "Error al actualizar máquina.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteMachine() {
    if (!machineToDelete || !isDeleteMachineEnabled) return;
    errorMessage = "";
    try {
      await data.deleteMachine(machineToDelete.id);
      machineToDelete = null;
    } catch (e) {
      errorMessage = e.message || "Error al eliminar máquina.";
    }
  }

  async function openCurriculumModal(machine) {
    showCvModal = true;
    isCvLoading = true;
    errorMessage = "";
    try {
      curriculumData = await data.fetchMachineCurriculum(machine.id);
    } catch (e) {
      errorMessage = `Error al cargar la hoja de vida: ${e.message}`;
      // Cerramos el modal si hay un error para mostrar el mensaje principal
      showCvModal = false;
    } finally {
      isCvLoading = false;
    }
  }

  function closeCurriculumModal() {
    showCvModal = false;
    curriculumData = null;
    errorMessage = "";
  }

  function handleAction(event) {
    const { type, data: machineData } = event.detail;
    if (type === "edit") {
      openEditModal(machineData);
    } else if (type === "delete") {
      machineToDelete = machineData;
    } else if (type === "cv") {
      openCurriculumModal(machineData);
    }
  }

  function openEditModal(machine) {
    machineInEditor = { ...machine };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    machineInEditor = null;
    errorMessage = "";
  }

  function closeDeleteMachineModal() {
    machineToDelete = null;
    clearTimeout(deleteMachineTimer);
  }

  async function handleExportCurriculum() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/curriculum/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'curriculum.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification({ id: Date.now(), text: 'Archivo de curriculum descargado con éxito.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar el archivo: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }

</script>

{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando máquinas...</p>
  </div>
{:else}
  <div class="management-container">
    <div class="refresh-container">
      <button class="btn-refresh" on:click={() => data.fetchMachines()}>
        Refrescar información
      </button>
      <button class="btn-export" on:click={handleExportCurriculum} disabled={isExporting}>
        {#if isExporting}
          <span class="loading-icon">⟳</span>
        {/if}
        {isExporting ? 'Descargando...' : 'Exportar Excel'}
      </button>
    </div>
    <div class="form-container">
      <h3>Crear Nueva Máquina</h3>
      <form class="create-form" on:submit={handleCreateMachine}>
        <input
          type="text"
          placeholder="Nombre"
          bind:value={newMachine.name}
          required
          disabled={isSubmitting}
        />
        <input
          type="text"
          placeholder="Marca"
          bind:value={newMachine.brand}
          disabled={isSubmitting}
        />
        <input
          type="text"
          placeholder="Modelo"
          bind:value={newMachine.model}
          required
          disabled={isSubmitting}
        />
        <input
          type="text"
          placeholder="Núm. Motor"
          bind:value={newMachine.numEngine}
          disabled={isSubmitting}
        />
        <input
          type="text"
          placeholder="Núm. Identificación"
          bind:value={newMachine.numInterIdentification}
          disabled={isSubmitting}
        />

        <div class="form-group">
          <label for="belongsTo">Pertenece a:</label>
          <select id="belongsTo" bind:value={newMachine.belongsTo} disabled={isSubmitting}>
            <option value="distrito">Distrito</option>
            <option value="asociacion">Asociación</option>
          </select>
        </div>

        <div class="form-group">
          <label for="newSoat">SOAT:</label>
          <input type="date" id="newSoat" bind:value={newMachine.soat} disabled={isSubmitting} />
        </div>
        <div class="form-group">
          <label for="newRunt">RUNT:</label>
          <input type="date" id="newRunt" bind:value={newMachine.runt} disabled={isSubmitting} />
        </div>
        <button type="submit" class="btn-create" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear"}
        </button>
      </form>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </div>

    <div class="table-wrapper">
      <DataGrid columns={machineColumns} data={machines} on:action={handleAction} />
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Máquina</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateMachine}>
        <label>Nombre: <input type="text" bind:value={machineInEditor.name} required /></label>
        <label>Marca: <input type="text" bind:value={machineInEditor.brand} /></label>
        <label>Modelo: <input type="text" bind:value={machineInEditor.model} required /></label>
        <label>
          Pertenece a:
          <select bind:value={machineInEditor.belongsTo}>
            <option value="distrito">Distrito</option>
            <option value="asociacion">Asociación</option>
          </select>
        </label>
        <label>Núm. Motor: <input type="text" bind:value={machineInEditor.numEngine} /></label>
        <label>Núm. Identificación: <input type="text" bind:value={machineInEditor.numInterIdentification} /></label>
        <label>SOAT: <input type="date" bind:value={machineInEditor.soat} /></label>
        <label>RUNT: <input type="date" bind:value={machineInEditor.runt} /></label>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if machineToDelete}
  <div class="modal-overlay" on:click={closeDeleteMachineModal}>
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar Eliminación</h3>
      <p>
        <b>NO RECOMENDADO</b> <br />
        ¿Está seguro que desea eliminar la máquina "{machineToDelete.name} {machineToDelete.model}"? <br />
        Los registros relacionados no se borran pero no podrá acceder a la hoja de vida
      </p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeDeleteMachineModal}>
          Cancelar
        </button>
        <button
          type="button"
          class="btn-delete"
          on:click={handleDeleteMachine}
          disabled={!isDeleteMachineEnabled}
        >
          {isDeleteMachineEnabled ? "Sí, Eliminar" : "Espere 10 segundos"}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showCvModal}
  <div class="modal-overlay">
    <div class="modal-content large" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Hoja de Vida de: {curriculumData?.machine.name || 'Cargando...'}</h3>
        <button class="close-btn" on:click={closeCurriculumModal}>×</button>
      </div>

      {#if isCvLoading}
        <div class="loader-container">
          <Loader />
        </div>
      {:else if curriculumData && curriculumData.results}
        {#if curriculumData.results.length > 0}
          <div class="table-wrapper modal-table">
            <DataGrid columns={curriculumColumns} data={curriculumData.results} />
          </div>
        {:else}
          <p>No hay registros en la hoja de vida para esta máquina.</p>
        {/if}
      {/if}

      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeCurriculumModal}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}
<style>
 
.modal-content.large {
    min-width: 80%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.modal-table {
    flex: 1;
    min-height: 0;
    margin-top: 16px;
}
  .loader-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
  }
  .management-container {
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    height: 100%;
  }
  .form-container {
    padding: 16px;
    background: #e0e0e0;
    border: 2px outset #c0c0c0;
  }
  h3 {
    margin: 0 0 12px 0;
  }
  .create-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .create-form input,
  .create-form select {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-size: 11px;
    font-family: inherit;
    flex: 1;
    min-width: 150px;
  }
  .btn-create {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
  }
  .refresh-container {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
  .btn-export {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #90ee90 0%, #7bc97b 100%);
    border: 1px outset #7bc97b;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .btn-export:hover:not(:disabled) {
    background: linear-gradient(to bottom, #a0ffa0 0%, #8bd98b 100%);
  }
  .btn-export:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .loading-icon {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .table-wrapper {
    flex: 1;
    overflow-y: auto;
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    min-height: 0;
  }
  .error-message {
    color: red;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: #e0e0e0;
    padding: 20px;
    border: 2px outset #c0c0c0;
    min-width: 400px;
  }
  .modal-content.confirmation {
    text-align: center;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .modal-form input,
  .modal-form select {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  .btn-cancel,
  .btn-save {
    padding: 4px 12px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
  }
  .btn-save {
    font-weight: bold;
  }
</style>
