<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { createRefuelingColumns } from "../../config/table-definitions.js";

  const initialState = {
    tipoElemento: "MAQUINARIA",
    elementoId: "",
    lugar: "BOMBA",
    areaCosto: "DISTRITO",
    fuelTypeId: "",
    cantidadGalones: "",
    horometroKm: "",
    esFull: false,
    precioUnitario: "",
    descuento: "",
    totalIngresado: "",
    origen: "",
  };
  let form = { ...initialState };
  let facturaFile = null;
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = false;

  function openModal() {
    form = { ...initialState };
    facturaFile = null;
    errorMessage = "";
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  $: fuelTypes = $data.fuelTypes ?? [];
  $: refueling = $data.fuelRefueling ?? { data: [] };
  $: isLoading = $data.isLoading;
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: columns = createRefuelingColumns(fuelTypesById, unidadMedidaById);
  $: elementoLabel = form.tipoElemento === "MAQUINARIA" ? "Máquina (ID)" : "Vehículo (ID)";
  // La unidad depende del combustible seleccionado — GNV se mide en m³, no en galones.
  $: unidadCantidad = unidadMedidaById[Number(form.fuelTypeId)] === "M3" ? "m³" : "galones";

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchRefueling();
  });

  function handleFileChange(event) {
    facturaFile = event.target.files?.[0] ?? null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      const fd = new FormData();
      if (form.tipoElemento === "MAQUINARIA") {
        fd.append("machineId", form.elementoId);
      } else {
        fd.append("vehicleId", form.elementoId);
      }
      fd.append("lugar", form.lugar);
      fd.append("areaCosto", form.areaCosto);
      fd.append("fuelTypeId", form.fuelTypeId);
      fd.append("cantidadGalones", form.cantidadGalones);
      fd.append("horometroKm", form.horometroKm);
      fd.append("esFull", String(form.esFull));
      if (form.lugar === "BOMBA") {
        fd.append("precioUnitario", form.precioUnitario);
        if (form.descuento) fd.append("descuento", form.descuento);
        fd.append("totalIngresado", form.totalIngresado);
        if (facturaFile) fd.append("factura", facturaFile);
      }
      if (form.origen) fd.append("origen", form.origen);

      await data.createRefueling(fd);
      form = { ...initialState };
      facturaFile = null;
      showModal = false;
    } catch (e) {
      errorMessage = e.message || "Error al registrar el tanqueo.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fuel-module">
  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
      <p>Cargando tanqueos...</p>
    </div>
  {:else}
    <div class="fuel-toolbar">
      <p class="fuel-hint"></p>
      <button type="button" class="btn-create" on:click={openModal}>+ Registrar tanqueo</button>
    </div>

    <div class="fuel-table-wrap">
      <DataGrid {columns} data={refueling.data} showDeleteButton={false} />
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Registrar tanqueo</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form aria-label="Registrar tanqueo" class="create-form" on:submit={handleSubmit}>
        <div class="create-grid">
          <label class="field" for="tipoElemento">
            <span class="field-lab">Tipo de elemento</span>
            <select id="tipoElemento" bind:value={form.tipoElemento} disabled={isSubmitting}>
              <option value="MAQUINARIA">Maquinaria</option>
              <option value="VEHICULO">Vehículo</option>
              <option value="MOTOCICLETA">Motocicleta</option>
            </select>
          </label>
          <label class="field" for="elementoId">
            <span class="field-lab">{elementoLabel}</span>
            <input id="elementoId" type="number" bind:value={form.elementoId} required disabled={isSubmitting} />
          </label>
          <label class="field" for="lugar">
            <span class="field-lab">Lugar</span>
            <select id="lugar" bind:value={form.lugar} disabled={isSubmitting}>
              <option value="BOMBA">Bomba</option>
              <option value="ALMACEN">Almacén</option>
            </select>
          </label>
          <label class="field" for="areaCosto">
            <span class="field-lab">Área de costo</span>
            <select id="areaCosto" bind:value={form.areaCosto} disabled={isSubmitting}>
              <option value="DISTRITO">Distrito</option>
              <option value="ASOCIACION">Asociación</option>
            </select>
          </label>
          <label class="field" for="fuelTypeId">
            <span class="field-lab">Combustible</span>
            <select id="fuelTypeId" bind:value={form.fuelTypeId} required disabled={isSubmitting}>
              <option value="" disabled>Seleccione...</option>
              {#each fuelTypes as ft}
                <option value={String(ft.id)}>{ft.nombre}</option>
              {/each}
            </select>
          </label>
          <label class="field" for="cantidadGalones">
            <span class="field-lab">Cantidad ({unidadCantidad})</span>
            <input id="cantidadGalones" type="number" step="0.001" bind:value={form.cantidadGalones} required disabled={isSubmitting} />
          </label>
          <label class="field" for="horometroKm">
            <span class="field-lab">Horómetro/Km</span>
            <input id="horometroKm" type="number" step="0.01" bind:value={form.horometroKm} required disabled={isSubmitting} />
          </label>
          <label class="field field--checkbox" for="esFull">
            <span class="field-lab">¿Tanque lleno?</span>
            <input id="esFull" type="checkbox" bind:checked={form.esFull} disabled={isSubmitting} />
          </label>
          {#if form.lugar === "BOMBA"}
            <label class="field" for="precioUnitario">
              <span class="field-lab">Precio unitario</span>
              <input id="precioUnitario" type="number" step="0.01" bind:value={form.precioUnitario} required disabled={isSubmitting} />
            </label>
            <label class="field" for="descuento">
              <span class="field-lab">Descuento</span>
              <input id="descuento" type="number" step="0.01" bind:value={form.descuento} disabled={isSubmitting} />
            </label>
            <label class="field" for="totalIngresado">
              <span class="field-lab">Total pagado (valor real)</span>
              <input id="totalIngresado" type="number" step="0.01" bind:value={form.totalIngresado} required disabled={isSubmitting} />
              <span class="field-hint">Lo que realmente pagaste, no un estimado</span>
            </label>
            <label class="field" for="factura">
              <span class="field-lab">Factura</span>
              <input id="factura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleFileChange} disabled={isSubmitting} />
            </label>
          {/if}
          <label class="field" for="origen">
            <span class="field-lab">Origen</span>
            <input id="origen" type="text" bind:value={form.origen} placeholder="Ej: Estación Norte" disabled={isSubmitting} />
          </label>
        </div>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar tanqueo"}
          </button>
        </div>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

<style>
  .fuel-module {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .fuel-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
  }
  .fuel-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px;
  }
  .fuel-hint {
    margin: 0;
    font-size: 11px;
    color: #666;
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
    padding: 16px;
    border: 2px outset #ffffff;
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.25rem), 1fr));
    gap: 6px 10px;
    align-items: end;
    padding: 0 8px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 11px;
  }
  .field--checkbox {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }
  .field-lab {
    font-weight: bold;
    font-size: 10px;
    color: #303030;
  }
  .field-hint {
    font-size: 9px;
    color: #666;
    font-weight: normal;
  }
  .field input,
  .field select {
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    min-height: 24px;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    padding: 8px;
  }
  .btn-create {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
  }
  .error-message {
    color: red;
    padding: 0 8px 8px;
  }
  .fuel-table-wrap {
    flex: 1;
    min-height: 0;
  }
</style>
