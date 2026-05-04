<script>
  import { data } from "../../stores/data.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { motoInventoryColumns } from "../../config/table-definitions.js";
  import { onMount } from "svelte";
  import { addNotification } from "../../stores/ui.js";

  let isSubmitting = false;
  let errorMessage = "";

  let quickModal = null;
  let quickName = "";
  let quickError = "";
  let quickSubmitting = false;

  const quickModalTitles = {
    brand: "Nueva marca",
    area: "Nueva área organizacional",
    location: "Nueva ubicación",
  };

  /** Placeholder del modal rápido según tipo de catálogo. */
  const quickPlaceholder = {
    brand: "Ej: Honda",
    area: "Ej: Asociación, Distrito…",
    location: "Ej: Unidad Pantano, Represa LA COPA…",
  };

  function areaLabel(a) {
    return a?.name ?? a?.nombre ?? "";
  }

  function locationLabel(loc) {
    return loc?.name ?? loc?.nombre ?? "";
  }

  function openQuickCatalog(kind) {
    quickModal = kind;
    quickName = "";
    quickError = "";
  }

  function closeQuickCatalog() {
    quickModal = null;
    quickName = "";
    quickError = "";
    quickSubmitting = false;
  }

  async function submitQuickCatalog() {
    const name = quickName.trim();
    if (!name) {
      quickError = "Escriba un nombre.";
      return;
    }
    quickSubmitting = true;
    quickError = "";
    try {
      if (quickModal === "brand") {
        const created = await data.createVehicleBrand({ descripcion: name });
        const id = created?.idMarca;
        if (id != null) {
          if (showEditModal && motoInEditor) motoInEditor.idMarca = id;
          else newMoto.idMarca = id;
        }
        addNotification({ id: Date.now(), text: "Marca registrada." });
      } else if (quickModal === "area") {
        const created = await data.createCatalogItem("area", { name });
        const label = created?.name ?? created?.nombre ?? name;
        if (showEditModal && motoInEditor) motoInEditor.belongsTo = label;
        else newMoto.belongsTo = label;
        addNotification({ id: Date.now(), text: "Área registrada." });
      } else if (quickModal === "location") {
        const created = await data.createCatalogItem("location", { name });
        await data.fetchLocations();
        const id = created?.id;
        if (id != null) {
          if (showEditModal && motoInEditor) motoInEditor.idUbicacionBase = id;
          else newMoto.idUbicacionBase = id;
        }
        addNotification({ id: Date.now(), text: "Ubicación registrada." });
      }
      closeQuickCatalog();
    } catch (e) {
      quickError = e.message || "No se pudo guardar.";
    } finally {
      quickSubmitting = false;
    }
  }

  const initialMotoState = {
    placa: "",
    idMarca: null,
    kilometrajeActual: 0,
    belongsTo: "",
    idUbicacionBase: null,
    activo: true,
  };
  let newMoto = { ...initialMotoState };
  let docSoatVencimiento = "";
  let docTecnoVencimiento = "";

  let motoInEditor = null;
  let showEditModal = false;
  let motoToDelete = null;

  $: motos = $data.motos;
  $: brands = $data.vehicleBrands;
  $: types = $data.vehicleTypes;
  $: areas = $data.areas;
  $: locations = $data.locations;
  $: isLoading = $data.isLoading;
  $: motoTipoId = (types || []).find((t) => String(t?.name || "").toUpperCase() === "MOTOCICLETA")?.id ?? null;

  onMount(async () => {
    try {
      // Ubicaciones antes que motos: el store enriquece nombres desde el catálogo si el JSON solo trae id.
      await data.fetchLocations().catch((e) =>
        console.warn("No se cargó el catálogo de ubicaciones:", e),
      );
      await Promise.all([
        data.fetchMotos(),
        data.fetchVehicleBrands(),
        data.fetchVehicleTypes(),
        data.fetchAreas(),
      ]);
    } catch (e) {
      console.error("Error al cargar inventario de motos:", e);
    }
  });

  async function handleCreateMoto(event) {
    event.preventDefault();
    if (motoTipoId == null) {
      errorMessage =
        "No se encontró el tipo MOTOCICLETA en el catálogo. Verifique la base de datos (cat_tipos_vehiculo).";
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      const created = await data.createMoto({
        placa: newMoto.placa,
        idMarca: newMoto.idMarca,
        idTipoVehiculo: motoTipoId,
        kilometrajeActual: newMoto.kilometrajeActual,
        belongsTo: newMoto.belongsTo,
        idUbicacionBase: newMoto.idUbicacionBase,
        activo: newMoto.activo,
      });
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
      newMoto = { ...initialMotoState };
      docSoatVencimiento = "";
      docTecnoVencimiento = "";
      addNotification({ id: Date.now(), text: "Motocicleta registrada." + docExtra });
    } catch (e) {
      errorMessage = e.message || "Error al crear motocicleta.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUpdateMoto(event) {
    event.preventDefault();
    if (!motoInEditor || motoTipoId == null) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.updateMoto(motoInEditor.id, {
        placa: motoInEditor.placa,
        idMarca: motoInEditor.idMarca,
        idTipoVehiculo: motoTipoId,
        kilometrajeActual: motoInEditor.kilometrajeActual,
        belongsTo: motoInEditor.belongsTo,
        idUbicacionBase: motoInEditor.idUbicacionBase,
        activo: motoInEditor.activo,
      });
      closeEditModal();
      addNotification({ id: Date.now(), text: "Motocicleta actualizada." });
    } catch (e) {
      errorMessage = e.message || "Error al actualizar motocicleta.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteMoto() {
    if (!motoToDelete) return;
    errorMessage = "";
    try {
      await data.deleteMoto(motoToDelete.id);
      motoToDelete = null;
      addNotification({ id: Date.now(), text: "Motocicleta eliminada." });
    } catch (e) {
      errorMessage = e.message || "Error al eliminar motocicleta.";
    }
  }

  function handleAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") {
      openEditModal(row);
    } else if (type === "delete") {
      motoToDelete = row;
    }
  }

  function openEditModal(moto) {
    const brandObj = brands.find((b) => b.descripcion === moto.marca);
    motoInEditor = {
      ...moto,
      idMarca: brandObj?.idMarca ?? null,
      idUbicacionBase: moto.idUbicacionBase != null ? moto.idUbicacionBase : null,
      activo: moto.activo !== undefined ? moto.activo : true,
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    motoInEditor = null;
    errorMessage = "";
  }
</script>

{#if isLoading && motos.length === 0}
  <div class="vehicle-module">
    <div class="vehicle-loader">
      <Loader />
      <p>Cargando motocicletas...</p>
    </div>
  </div>
{:else}
  <div class="vehicle-module">
    <div class="vehicle-module-inner">
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchMotos()}>
          Refrescar inventario
        </button>
      </div>

      <div class="vehicle-form-section">
        <div class="vehicle-subpanel-head">Registrar nueva motocicleta</div>
        <form class="create-form" on:submit={handleCreateMoto}>
          <div class="create-grid">
            <label class="field span-2">
              <span class="field-lab">Placa</span>
              <input type="text" bind:value={newMoto.placa} placeholder="Ej: ABC12D" required disabled={isSubmitting} />
            </label>
            <label class="field span-2">
              <span class="field-lab field-lab-row">
                Marca
                <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog("brand")}>+ Añadir</button>
              </span>
              <select bind:value={newMoto.idMarca} required disabled={isSubmitting}>
                <option value={null}>—</option>
                {#each brands as brand}
                  <option value={brand.idMarca}>{brand.descripcion}</option>
                {/each}
              </select>
            </label>
            <label class="field span-2">
              <span class="field-lab">Km inicial</span>
              <input type="number" bind:value={newMoto.kilometrajeActual} min="0" required disabled={isSubmitting} />
            </label>
            <label class="field span-2">
              <span class="field-lab field-lab-row">
                Área
                <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog("area")}>+ Añadir</button>
              </span>
              <select bind:value={newMoto.belongsTo} required disabled={isSubmitting} title="Ejemplos de área: Asociación, Distrito, Operaciones…">
                <option value="">Seleccione área</option>
                {#each areas as area}
                  <option value={areaLabel(area)}>{areaLabel(area)}</option>
                {/each}
              </select>
            </label>
            <label class="field span-2">
              <span class="field-lab field-lab-row">
                Ubicación
                <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog("location")}>+ Añadir</button>
              </span>
              <select
                disabled={isSubmitting}
                value={newMoto.idUbicacionBase ?? ""}
                on:change={(e) => {
                  const v = e.currentTarget.value;
                  newMoto.idUbicacionBase = v === "" ? null : Number(v);
                }}
                title="Ej.: Unidad Pantano, Unidad Ayalas, sede, represa…"
              >
                <option value="">Seleccione ubicación</option>
                {#each locations as loc}
                  <option value={String(loc.id)}>{locationLabel(loc)}</option>
                {/each}
              </select>
            </label>
            <label class="field span-2">
              <span class="field-lab">Estado</span>
              <select bind:value={newMoto.activo} disabled={isSubmitting}>
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
            <button type="submit" class="btn-create" disabled={isSubmitting || motoTipoId == null}>
              {isSubmitting ? "Registrando..." : "Registrar motocicleta"}
            </button>
          </div>
        </form>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </div>

      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid columns={motoInventoryColumns} data={motos} on:action={handleAction} totalElements={motos.length} />
      </div>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar motocicleta</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateMoto}>
        <label>Placa: <input type="text" bind:value={motoInEditor.placa} required /></label>

        <label>
          <span class="modal-field-head">
            Marca
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog("brand")}>+ Añadir</button>
          </span>
          <select bind:value={motoInEditor.idMarca} required>
            {#each brands as brand}
              <option value={brand.idMarca}>{brand.descripcion}</option>
            {/each}
          </select>
        </label>

        <label>Kilometraje actual: <input type="number" bind:value={motoInEditor.kilometrajeActual} required /></label>

        <label>
          <span class="modal-field-head">
            Área
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog("area")}>+ Añadir</button>
          </span>
          <select bind:value={motoInEditor.belongsTo} required title="Ej.: Asociación, Distrito — organización">
            <option value="">Seleccione área</option>
            {#each areas as area}
              <option value={areaLabel(area)}>{areaLabel(area)}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="modal-field-head">
            Ubicación
            <button type="button" class="field-add-btn" on:click={() => openQuickCatalog("location")}>+ Añadir</button>
          </span>
          <select
            value={motoInEditor.idUbicacionBase ?? ""}
            on:change={(e) => {
              const v = e.currentTarget.value;
              motoInEditor.idUbicacionBase = v === "" ? null : Number(v);
            }}
            title="Ej.: Unidad Pantano, Unidad Ayalas…"
          >
            <option value="">Seleccione ubicación</option>
            {#each locations as loc}
              <option value={String(loc.id)}>{locationLabel(loc)}</option>
            {/each}
          </select>
        </label>

        <label>
          Estado:
          <select bind:value={motoInEditor.activo}>
            <option value={true}>Activo</option>
            <option value={false}>Inactivo</option>
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting || motoTipoId == null}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if motoToDelete}
  <div class="modal-overlay" on:click={() => (motoToDelete = null)}>
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar eliminación</h3>
      <p>¿Eliminar la motocicleta con placa <b>{motoToDelete.placa}</b>? Se borrará el registro en vehículos.</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={() => (motoToDelete = null)}>Cancelar</button>
        <button type="button" class="btn-delete" on:click={handleDeleteMoto}>Sí, eliminar</button>
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
          placeholder={quickPlaceholder[quickModal] ?? "Ej: …"}
        />
      </label>
      {#if quickError}
        <p class="vehicle-catalog-inline-error">{quickError}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" disabled={quickSubmitting} on:click={closeQuickCatalog}>Cancelar</button>
        <button type="button" class="btn-save" disabled={quickSubmitting} on:click={submitQuickCatalog}>
          {quickSubmitting ? "Guardando…" : "Guardar y usar"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .vehicle-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    font-size: 11px;
  }
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
    min-width: 350px;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
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
  .btn-cancel {
    background: #d0d0d0;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
  .btn-save {
    background: #90ee90;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
  .btn-delete {
    background: #ff6b6b;
    color: white;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
</style>
