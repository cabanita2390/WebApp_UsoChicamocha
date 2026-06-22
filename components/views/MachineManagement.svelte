<script>
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import {
    machineColumns,
    curriculumColumns,
    machineInspectionColumns,
  } from "../../config/table-definitions.js";
  import { onDestroy } from 'svelte';
  import { addNotification } from '../../stores/ui.js';
  import { formatMachinePayload } from '@/lib/textFormat.js';
  import { checkExpiringDocuments } from '@/lib/expireNotifications.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

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
    belongsTo: "Distrito",
    fuelTankCapacityGallons: null,
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

  $: if (machines?.length > 0) {
    checkExpiringDocuments($data.vehicles || [], $data.motos || [], machines, addNotification);
  }

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

  function normalizeBelongsTo(value) {
    if (!value) return 'Distrito';
    const trimmed = String(value).trim().toLowerCase();
    if (trimmed === 'asociacion') return 'Asociación';
    if (trimmed === 'asociación') return 'Asociación';
    return 'Distrito';
  }

  async function handleCreateMachine(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.createMachine(formatMachinePayload(newMachine));
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
      await data.updateMachine({ id: machineInEditor.id, ...formatMachinePayload(machineInEditor) });
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

  async function handleAction(event) {
    const { type, data: machineData } = event.detail;
    if (type === "edit") {
      await openEditModal(machineData);
    } else if (type === "delete") {
      machineToDelete = machineData;
    } else if (type === "cv") {
      openCurriculumModal(machineData);
    }
  }

  async function openEditModal(machine) {
    try {
      const fullMachine = await data.getMachineById(machine.id);
      console.log("🔍 fullMachine cargado:", fullMachine);
      machineInEditor = {
        ...fullMachine,
        belongsTo: normalizeBelongsTo(fullMachine.belongsTo),
        fuelTankCapacityGallons: fullMachine.fuelTankCapacityGallons ?? null,
        factoryEfficiencyGalPerHour: fullMachine.factoryEfficiencyGalPerHour ?? null,
        factoryEfficiencyUnit: fullMachine.factoryEfficiencyUnit ?? 'GAL_PER_HOUR',
      };
      console.log("✏️ machineInEditor.belongsTo asignado a:", machineInEditor.belongsTo);
      showEditModal = true;
    } catch (e) {
      errorMessage = 'No se pudo cargar la máquina para editar.';
      addNotification({ id: Date.now(), text: e.message || 'Error al cargar máquina.' });
    }
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

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando máquinas...</p>
      </div>
    {:else}
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchMachines()}>
          Refrescar
        </button>
        <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExportCurriculum} disabled={isExporting}>
          {#if isExporting}<span class="spin">⟳</span>{/if}
          {isExporting ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>
      {#if isAdmin || isSupervisorOperativo}
      <div class="vehicle-form-section">
        <div class="vehicle-subpanel-head">Registrar nueva máquina</div>
      <form class="create-form create-form--compact" on:submit={handleCreateMachine}>
        <div class="create-grid">
          <label class="field">
            <span class="field-lab">Nombre *</span>
            <input type="text" bind:value={newMachine.name} required disabled={isSubmitting} placeholder="Ej: Excavadora CAT" />
          </label>
          <label class="field">
            <span class="field-lab">Marca</span>
            <input type="text" bind:value={newMachine.brand} disabled={isSubmitting} placeholder="Ej: Caterpillar" />
          </label>
          <label class="field">
            <span class="field-lab">Modelo *</span>
            <input type="text" bind:value={newMachine.model} required disabled={isSubmitting} placeholder="Ej: 320D" />
          </label>
          <label class="field">
            <span class="field-lab">Núm. Motor</span>
            <input type="text" bind:value={newMachine.numEngine} disabled={isSubmitting} placeholder="Ej: MOT-00123" />
          </label>
          <label class="field">
            <span class="field-lab">Núm. Identificación</span>
            <input type="text" bind:value={newMachine.numInterIdentification} disabled={isSubmitting} placeholder="Ej: ID-00456" />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={newMachine.belongsTo} disabled={isSubmitting}>
              <option value="Distrito">Distrito</option>
              <option value="Asociación">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab">SOAT — vence</span>
            <input type="date"
              value={newMachine.soat || ''}
              on:change={(e) => newMachine.soat = e.target.value}
              disabled={isSubmitting}
            />
          </label>
          <label class="field">
            <span class="field-lab">Seguro todo riesgo — vence</span>
            <input type="date"
              value={newMachine.runt || ''}
              on:change={(e) => newMachine.runt = e.target.value}
              disabled={isSubmitting}
            />
          </label>
          {#if isAdmin}
          <label class="field">
            <span class="field-lab">Capacidad del tanque (Gal)</span>
            <input type="number" step="0.001" min="0.1" bind:value={newMachine.fuelTankCapacityGallons} placeholder="Ej: 10.5" disabled={isSubmitting} />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center">
              <input type="number" step="0.01" min="0" bind:value={newMachine.factoryEfficiencyGalPerHour} placeholder="Ej: 3.5" disabled={isSubmitting} style="padding:3px 4px;font-size:11px;min-height:26px" />
              <select bind:value={newMachine.factoryEfficiencyUnit} disabled={isSubmitting} style="padding:3px 4px;font-size:11px;min-height:22px">
                <option value="GAL_PER_HOUR">Gal/h</option>
                <option value="M3_PER_HOUR">m³/h (gas)</option>
              </select>
            </div>
          </label>
          {/if}
        </div>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar máquina"}
          </button>
        </div>
      </form>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
      </div>
      {/if}

      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid columns={machineColumns} data={machines} on:action={handleAction} showDeleteButton={isAdmin} />
      </div>
    {/if}
  </div>
</div>

{#if isAdmin || isSupervisorOperativo}
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Máquina</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form on:submit={handleUpdateMachine}>
        <div class="modal-form-grid">
          <label class="field">
            <span class="field-lab">Nombre *</span>
            <input type="text" bind:value={machineInEditor.name} required />
          </label>
          <label class="field">
            <span class="field-lab">Marca</span>
            <input type="text" bind:value={machineInEditor.brand} />
          </label>
          <label class="field">
            <span class="field-lab">Modelo *</span>
            <input type="text" bind:value={machineInEditor.model} required />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={machineInEditor.belongsTo}>
              <option value="Distrito">Distrito</option>
              <option value="Asociación">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Núm. Motor</span>
            <input type="text" bind:value={machineInEditor.numEngine} />
          </label>
          <label class="field">
            <span class="field-lab">Núm. Identificación</span>
            <input type="text" bind:value={machineInEditor.numInterIdentification} />
          </label>
          <label class="field">
            <span class="field-lab">SOAT — vence</span>
            <input type="date"
              value={machineInEditor.soat || ''}
              on:change={(e) => machineInEditor.soat = e.target.value}
            />
          </label>
          <label class="field">
            <span class="field-lab">Seguro todo riesgo — vence</span>
            <input type="date"
              value={machineInEditor.runt || ''}
              on:change={(e) => machineInEditor.runt = e.target.value}
            />
          </label>
          {#if isAdmin}
          <label class="field">
            <span class="field-lab">Capacidad del tanque (Gal)</span>
            <input type="number" step="0.001" min="0.1" bind:value={machineInEditor.fuelTankCapacityGallons} placeholder="Ej: 10.5" />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center">
              <input type="number" step="0.01" min="0" bind:value={machineInEditor.factoryEfficiencyGalPerHour} placeholder="Ej: 3.5" style="padding:3px 4px;font-size:11px;min-height:26px" />
              <select bind:value={machineInEditor.factoryEfficiencyUnit} style="padding:3px 4px;font-size:11px;min-height:22px">
                <option value="GAL_PER_HOUR">Gal/h</option>
                <option value="M3_PER_HOUR">m³/h (gas)</option>
              </select>
            </div>
          </label>
          {/if}
        </div>
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
{/if}

{#if isAdmin}
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
      {:else if curriculumData && curriculumData.inspections}
        {#if curriculumData.inspections.length > 0}
          <div class="table-wrapper modal-table">
            <DataGrid columns={curriculumColumns} data={curriculumData.inspections.flatMap(insp => insp.results)} />
          </div>
        {:else}
          <p>No hay inspecciones preoperacionales para esta máquina.</p>
        {/if}
      {/if}

      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeCurriculumModal}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}
<style>
  /* ── Grid layout compartido (igual que Vehicle/Moto) ─────────────────── */
  .create-form--compact {
    padding: 6px 8px 8px;
  }
  .create-form--compact .create-grid {
    gap: 4px 8px;
  }
  .create-form--compact .field {
    font-size: 10px;
    gap: 1px;
  }
  .create-form--compact .field-lab {
    font-size: 9px;
  }
  .create-form--compact .field-add-btn {
    padding: 0 4px;
    font-size: 9px;
  }
  .create-form--compact .field input,
  .create-form--compact .field select {
    padding: 2px 4px;
    font-size: 10px;
    min-height: 22px;
    line-height: 1.2;
  }
  .create-docs-head {
    margin: 6px 0 2px;
    padding: 2px 0;
    font-size: 10px;
    font-weight: bold;
    color: #202020;
    border-bottom: 1px solid #b0b0b0;
  }
  .create-docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.25rem), 1fr));
    gap: 6px 8px;
    align-items: end;
  }
  .create-docs-grid .field-doc {
    min-width: 0;
  }
  .create-form--compact .create-docs-grid {
    gap: 3px 6px;
    margin-top: 3px;
  }
  .create-form--compact .create-docs-head {
    font-size: 9px;
    margin: 4px 0 1px;
    padding: 1px 0;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.25rem), 1fr));
    gap: 6px 10px;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 11px;
  }
  .field-lab {
    font-weight: bold;
    font-size: 10px;
    color: #303030;
    white-space: nowrap;
  }
  .field-lab-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    white-space: normal;
  }
  .field-add-btn {
    flex-shrink: 0;
    padding: 1px 6px;
    font-size: 10px;
    font-family: inherit;
    cursor: pointer;
    background: linear-gradient(to bottom, #f4f4f4 0%, #d8d8d8 100%);
    border: 1px outset #c0c0c0;
    color: #000;
    transition: background 0.15s;
  }
  .field-add-btn:hover {
    background: linear-gradient(to bottom, #f9f9f9 0%, #e0e0e0 100%);
  }
  .field input,
  .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    min-height: 24px;
  }
  .field select {
    cursor: pointer;
  }
  .modal-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr));
    gap: 8px 10px;
    align-items: end;
    margin-bottom: 12px;
  }
  .modal-form-grid .field { min-width: 0; }
  .modal-form-grid .field input,
  .modal-form-grid .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    min-height: 24px;
  }
  /* ───────────────────────────────────────────────────────────────────── */
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
  .create-form {
    display: block;
    padding: 10px 16px 14px;
  }
  .btn-create {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #a0a0a0;
  }
  .error-message {
    color: red;
    padding: 0 16px 8px;
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
    border: 2px outset #ffffff;
    min-width: 400px;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
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
  .btn-cancel {
    padding: 4px 12px;
    background: #d0d0d0;
    border: 1px outset #fff;
    cursor: pointer;
  }
  .btn-save {
    padding: 4px 12px;
    background: #90ee90;
    border: 1px outset #fff;
    cursor: pointer;
    font-weight: bold;
  }
  .btn-delete {
    padding: 4px 12px;
    background: #ff6b6b;
    color: white;
    border: 1px outset #fff;
    cursor: pointer;
    font-weight: bold;
  }
</style>
