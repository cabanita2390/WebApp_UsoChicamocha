<script>
  import { data } from "../../stores/data.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { vehicleManagementColumns } from "../../config/table-definitions.js";
  import { onMount } from 'svelte';
  import { addNotification } from '../../stores/ui.js';

  let isSubmitting = false;
  let errorMessage = "";

  /** Catálogo rápido sin salir de la vista (marca / tipo / área). */
  let quickModal = null; // 'brand' | 'type' | 'area' | null
  let quickName = '';
  let quickError = '';
  let quickSubmitting = false;

  const quickModalTitles = {
    brand: 'Nueva marca',
    type: 'Nuevo tipo de vehículo',
    area: 'Nueva área organizacional',
  };

  function areaLabel(a) {
    return a?.name ?? a?.nombre ?? '';
  }

  function openQuickCatalog(kind) {
    quickModal = kind;
    quickName = '';
    quickError = '';
  }

  function closeQuickCatalog() {
    quickModal = null;
    quickName = '';
    quickError = '';
    quickSubmitting = false;
  }

  async function submitQuickCatalog() {
    const name = quickName.trim();
    if (!name) {
      quickError = 'Escriba un nombre.';
      return;
    }
    quickSubmitting = true;
    quickError = '';
    try {
      if (quickModal === 'brand') {
        const created = await data.createVehicleBrand({ descripcion: name });
        const id = created?.idMarca;
        if (id != null) {
          if (showEditModal && vehicleInEditor) vehicleInEditor.idMarca = id;
          else newVehicle.idMarca = id;
        }
        addNotification({ id: Date.now(), text: 'Marca registrada.' });
      } else if (quickModal === 'type') {
        const created = await data.createCatalogItem('type', { name });
        const id = created?.id;
        if (id != null) {
          if (showEditModal && vehicleInEditor) vehicleInEditor.idTipoVehiculo = id;
          else newVehicle.idTipoVehiculo = id;
        }
        addNotification({ id: Date.now(), text: 'Tipo registrado.' });
      } else if (quickModal === 'area') {
        const created = await data.createCatalogItem('area', { name });
        const label = created?.name ?? created?.nombre ?? name;
        if (showEditModal && vehicleInEditor) vehicleInEditor.belongsTo = label;
        else newVehicle.belongsTo = label;
        addNotification({ id: Date.now(), text: 'Área registrada.' });
      }
      closeQuickCatalog();
    } catch (e) {
      quickError = e.message || 'No se pudo guardar.';
    } finally {
      quickSubmitting = false;
    }
  }

  const initialVehicleState = {
    placa: "",
    idMarca: null,
    idTipoVehiculo: null,
    kilometrajeActual: 0,
    belongsTo: "distrito",
    activo: true
  };
  let newVehicle = { ...initialVehicleState };
  /** Vigencias opcionales al alta (POST admin/documents tras crear el vehículo). */
  let docSoatVencimiento = "";
  let docTecnoVencimiento = "";

  let vehicleInEditor = null;
  let showEditModal = false;
  let vehicleToDelete = null;

  $: vehicles = $data.vehicles;
  $: brands = $data.vehicleBrands;
  $: types = $data.vehicleTypes;
  $: areas = $data.areas;
  $: isLoading = $data.isLoading;

  onMount(async () => {
    try {
      await Promise.all([
        data.fetchVehicles(),
        data.fetchVehicleBrands(),
        data.fetchVehicleTypes(),
        data.fetchAreas()
      ]);
    } catch (e) {
      console.error("Error al cargar datos iniciales:", e);
    }
  });

  async function handleCreateVehicle(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      const created = await data.createVehicle(newVehicle);
      const vid = created?.id;
      let docExtra = "";
      if (vid != null && (docSoatVencimiento || docTecnoVencimiento)) {
        try {
          if (docSoatVencimiento) {
            await data.updateVehicleDocument({
              idVehiculo: vid,
              tipoDocumento: "SOAT",
              fechaVencimiento: docSoatVencimiento,
            });
          }
          if (docTecnoVencimiento) {
            await data.updateVehicleDocument({
              idVehiculo: vid,
              tipoDocumento: "TECNOMECANICA",
              fechaVencimiento: docTecnoVencimiento,
            });
          }
          docExtra = " Documentación (SOAT/Tecno) registrada.";
        } catch (docErr) {
          docExtra =
            " " +
            (docErr.message ||
              "No se pudieron guardar las fechas de documentos (¿rol ADMIN?).");
        }
      }
      newVehicle = { ...initialVehicleState };
      docSoatVencimiento = "";
      docTecnoVencimiento = "";
      addNotification({ id: Date.now(), text: "Vehículo creado con éxito." + docExtra });
    } catch (e) {
      errorMessage = e.message || "Error al crear vehículo.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUpdateVehicle(event) {
    event.preventDefault();
    if (!vehicleInEditor) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.updateVehicle(vehicleInEditor.id, vehicleInEditor);
      closeEditModal();
      addNotification({ id: Date.now(), text: 'Vehículo actualizado con éxito.' });
    } catch (e) {
      errorMessage = e.message || "Error al actualizar vehículo.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteVehicle() {
    if (!vehicleToDelete) return;
    errorMessage = "";
    try {
      await data.deleteVehicle(vehicleToDelete.id);
      vehicleToDelete = null;
      addNotification({ id: Date.now(), text: 'Vehículo eliminado con éxito.' });
    } catch (e) {
      errorMessage = e.message || "Error al eliminar vehículo.";
    }
  }

  function handleAction(event) {
    const { type, data: vehicleData } = event.detail;
    if (type === "edit") {
      openEditModal(vehicleData);
    } else if (type === "delete") {
      vehicleToDelete = vehicleData;
    }
  }

  function openEditModal(vehicle) {
    // Buscamos los IDs correspondientes si el backend devuelve strings en la lista
    // En VehicleResponse el backend devuelve 'marca' y 'tipoVehiculo' como strings
    // Pero para el PUT necesitamos los IDs.
    // Buscaremos en los catálogos por nombre para pre-seleccionar.
    const brandObj = brands.find(b => b.descripcion === vehicle.marca);
    const typeObj = types.find(t => t.name === vehicle.tipoVehiculo);

    vehicleInEditor = { 
      ...vehicle,
      idMarca: brandObj?.idMarca || null,
      idTipoVehiculo: typeObj?.id || null
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    vehicleInEditor = null;
    errorMessage = "";
  }
</script>

{#if isLoading && vehicles.length === 0}
  <div class="vehicle-module">
    <div class="vehicle-loader">
      <Loader />
      <p>Cargando vehículos...</p>
    </div>
  </div>
{:else}
  <div class="vehicle-module">
    <div class="vehicle-module-inner">
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchVehicles()}>
          Refrescar información
        </button>
      </div>

    <div class="vehicle-form-section">
      <div class="vehicle-subpanel-head">Registrar nuevo vehículo</div>
      <form class="create-form" on:submit={handleCreateVehicle}>
        <div class="create-grid">
          <label class="field span-2">
            <span class="field-lab">Placa</span>
            <input type="text" bind:value={newVehicle.placa} placeholder="Ej: ABC123" required disabled={isSubmitting} />
          </label>
          <label class="field span-2">
            <span class="field-lab field-lab-row">
              Marca
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('brand')}>+ Añadir</button>
            </span>
            <select bind:value={newVehicle.idMarca} required disabled={isSubmitting}>
              <option value={null}>Seleccione marca</option>
              {#each brands as brand}
                <option value={brand.idMarca}>{brand.descripcion}</option>
              {/each}
            </select>
          </label>
          <label class="field span-2">
            <span class="field-lab field-lab-row">
              Tipo
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('type')}>+ Añadir</button>
            </span>
            <select bind:value={newVehicle.idTipoVehiculo} required disabled={isSubmitting}>
              <option value={null}>—</option>
              {#each types as type}
                <option value={type.id}>{type.name}</option>
              {/each}
            </select>
          </label>
          <label class="field span-2">
            <span class="field-lab">Km inicial</span>
            <input type="number" bind:value={newVehicle.kilometrajeActual} min="0" required disabled={isSubmitting} />
          </label>
          <label class="field span-2">
            <span class="field-lab field-lab-row">
              Área
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('area')}>+ Añadir</button>
            </span>
            <select bind:value={newVehicle.belongsTo} required disabled={isSubmitting}>
              <option value="">Área</option>
              {#each areas as area}
                <option value={areaLabel(area)}>{areaLabel(area)}</option>
              {/each}
            </select>
          </label>
          <label class="field span-2">
            <span class="field-lab">Estado</span>
            <select bind:value={newVehicle.activo} disabled={isSubmitting}>
              <option value={true}>Activo</option>
              <option value={false}>Inactivo</option>
            </select>
          </label>
          <label class="field span-2">
            <span class="field-lab">SOAT</span>
            <input type="date" bind:value={docSoatVencimiento} disabled={isSubmitting} />
          </label>
          <label class="field span-2">
            <span class="field-lab">Tecnomecánica</span>
            <input type="date" bind:value={docTecnoVencimiento} disabled={isSubmitting} />
          </label>
        </div>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar vehículo"}
          </button>
        </div>
      </form>
      {#if errorMessage}
        <p class="vehicle-catalog-inline-error">{errorMessage}</p>
      {/if}
    </div>

    <div class="vehicle-table-wrap vehicle-table-wrap--inset">
      <DataGrid columns={vehicleManagementColumns} data={vehicles} on:action={handleAction} totalElements={vehicles.length} />
    </div>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Vehículo</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateVehicle}>
        <label>Placa: <input type="text" bind:value={vehicleInEditor.placa} required /></label>
        
        <label>
          <span class="modal-field-head">
            Marca
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('brand')}>+ Añadir</button>
          </span>
          <select bind:value={vehicleInEditor.idMarca} required>
            {#each brands as brand}
              <option value={brand.idMarca}>{brand.descripcion}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="modal-field-head">
            Tipo
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('type')}>+ Añadir</button>
          </span>
          <select bind:value={vehicleInEditor.idTipoVehiculo} required>
            {#each types as type}
              <option value={type.id}>{type.name}</option>
            {/each}
          </select>
        </label>

        <label>Kilometraje Actual: <input type="number" bind:value={vehicleInEditor.kilometrajeActual} required /></label>
        
        <label>
          <span class="modal-field-head">
            Área
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('area')}>+ Añadir</button>
          </span>
          <select bind:value={vehicleInEditor.belongsTo}>
            <option value="">-- Seleccione área --</option>
            {#each areas as area} 
              <option value={areaLabel(area)}>{areaLabel(area)}</option>
            {/each}
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if vehicleToDelete}
  <div class="modal-overlay" on:click={() => vehicleToDelete = null}>
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar Eliminación</h3>
      <p>¿Está seguro que desea eliminar el vehículo con placa <b>{vehicleToDelete.placa}</b>?</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={() => vehicleToDelete = null}>Cancelar</button>
        <button type="button" class="btn-delete" on:click={handleDeleteVehicle}>Sí, Eliminar</button>
      </div>
    </div>
  </div>
{/if}

{#if quickModal}
  <div class="modal-overlay modal-overlay-front" role="presentation" on:click={closeQuickCatalog}>
    <div class="modal-content modal-quick" role="dialog" aria-modal="true" aria-labelledby="quick-cat-title" on:click|stopPropagation>
      <div class="modal-header">
        <h3 id="quick-cat-title">{quickModalTitles[quickModal]}</h3>
        <button type="button" class="close-btn" on:click={closeQuickCatalog}>×</button>
      </div>
      <label class="quick-label">
        Nombre
        <input
          type="text"
          bind:value={quickName}
          maxlength="200"
          disabled={quickSubmitting}
          placeholder={quickModal === 'brand' ? 'Ej: Toyota' : quickModal === 'type' ? 'Ej: Camión' : 'Ej: Logística'}
        />
      </label>
      {#if quickError}
        <p class="vehicle-catalog-inline-error">{quickError}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" disabled={quickSubmitting} on:click={closeQuickCatalog}>Cancelar</button>
        <button type="button" class="btn-save" disabled={quickSubmitting} on:click={submitQuickCatalog}>
          {quickSubmitting ? 'Guardando…' : 'Guardar y usar'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .create-form {
    padding: 8px 10px 10px;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
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
  }
  .field-add-btn:hover:not(:disabled) {
    background: linear-gradient(to bottom, #fafafa 0%, #e4e4e4 100%);
  }
  .field-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .modal-field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: bold;
  }
  .modal-overlay-front {
    z-index: 1100;
  }
  .modal-quick {
    min-width: 320px;
    max-width: 90vw;
  }
  .quick-help {
    margin: 0 0 10px;
    font-size: 10px;
    color: #404040;
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
  .field input,
  .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .field.span-2 {
    grid-column: span 2;
  }
  @media (max-width: 900px) {
    .create-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .field.span-2 {
      grid-column: span 1;
    }
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #a0a0a0;
  }
  .btn-create {
    padding: 4px 16px;
    background: linear-gradient(to bottom, #e8e8e8 0%, #c0c0c0 100%);
    border: 2px outset #ffffff;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
    font-size: 11px;
  }
  .btn-create:active {
    border-style: inset;
  }
  /* Modales */
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
    min-width: 350px;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
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
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .modal-form label {
    display: flex;
    flex-direction: column;
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
  .btn-delete { background: #ff6b6b; color: white; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
</style>
