<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { createAssetFuelConfigColumns } from "../../config/table-definitions.js";

  // La unidad de consumo no se elige a mano — la exige el backend según el tipo de
  // activo (KM_POR_X para vehículo, X_POR_HORA para máquina) y la unidad física del
  // combustible elegido (ver fuel_types.unidad_medida). Calcularla evita que el
  // usuario tenga que conocer el enum exacto y evita rechazos de validación.
  const UNIDAD_VEHICULO = { GALON: "KM_POR_GALON", M3: "KM_POR_M3" };
  const UNIDAD_MAQUINA = { GALON: "GAL_POR_HORA", M3: "M3_POR_HORA" };

  const initialState = {
    tipoActivo: "VEHICULO",
    activoId: "",
    fuelTypeDefaultId: "",
    consumoEstandar: "",
    tanqueCapacidadGal: "",
  };
  let form = { ...initialState };
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = false;

  $: fuelTypes = $data.fuelTypes ?? [];
  $: configs = $data.fuelAssetConfig ?? [];
  $: isLoading = $data.isLoading;
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: columns = createAssetFuelConfigColumns(fuelTypesById);

  $: unidadCalculada = calcularUnidad(form.tipoActivo, unidadMedidaById[Number(form.fuelTypeDefaultId)]);

  function calcularUnidad(tipoActivo, unidadMedida) {
    if (!unidadMedida) return null;
    return tipoActivo === "VEHICULO" ? UNIDAD_VEHICULO[unidadMedida] : UNIDAD_MAQUINA[unidadMedida];
  }

  function openModal() {
    form = { ...initialState };
    errorMessage = "";
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
  });

  async function handleSubmit(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      const payload = {
        fuelTypeDefaultId: Number(form.fuelTypeDefaultId),
        consumoEstandar: Number(form.consumoEstandar),
        unidadConsumo: unidadCalculada,
        tanqueCapacidadGal: form.tanqueCapacidadGal ? Number(form.tanqueCapacidadGal) : null,
      };
      if (form.tipoActivo === "VEHICULO") {
        await data.updateAssetFuelConfigVehicle(Number(form.activoId), payload);
      } else {
        await data.updateAssetFuelConfigMachine(Number(form.activoId), payload);
      }
      form = { ...initialState };
      showModal = false;
    } catch (e) {
      errorMessage = e.message || "Error al guardar la configuración.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fuel-module">
  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
      <p>Cargando configuración...</p>
    </div>
  {:else}
    <div class="fuel-toolbar">
      <p class="fuel-hint">Consumo estándar por vehículo/máquina, usado para proyectar el rendimiento operativo.</p>
      <button type="button" class="btn-create" on:click={openModal}>+ Configurar</button>
    </div>

    <div class="fuel-table-wrap">
      <DataGrid {columns} data={configs} showDeleteButton={false} />
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Configurar rendimiento del activo</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form aria-label="Configurar rendimiento del activo" class="create-form" on:submit={handleSubmit}>
        <div class="create-grid">
          <label class="field" for="tipoActivo">
            <span class="field-lab">Tipo de activo</span>
            <select id="tipoActivo" bind:value={form.tipoActivo} disabled={isSubmitting}>
              <option value="VEHICULO">Vehículo</option>
              <option value="MAQUINA">Máquina</option>
            </select>
          </label>
          <label class="field" for="activoId">
            <span class="field-lab">Id del activo</span>
            <input id="activoId" type="number" bind:value={form.activoId} required disabled={isSubmitting} />
          </label>
          <label class="field" for="fuelTypeDefaultId">
            <span class="field-lab">Combustible</span>
            <select id="fuelTypeDefaultId" bind:value={form.fuelTypeDefaultId} required disabled={isSubmitting}>
              <option value="" disabled>Seleccione...</option>
              {#each fuelTypes as ft}
                <option value={String(ft.id)}>{ft.nombre}</option>
              {/each}
            </select>
          </label>
          <label class="field" for="consumoEstandar">
            <span class="field-lab">Consumo estándar</span>
            <input id="consumoEstandar" type="number" step="0.0001" bind:value={form.consumoEstandar} required disabled={isSubmitting} />
          </label>
          <label class="field" for="tanqueCapacidadGal">
            <span class="field-lab">Capacidad del tanque (gal)</span>
            <input id="tanqueCapacidadGal" type="number" step="0.01" bind:value={form.tanqueCapacidadGal} disabled={isSubmitting} />
          </label>
        </div>
        {#if unidadCalculada}
          <p class="unidad-calculada">Unidad de consumo: <strong>{unidadCalculada}</strong></p>
        {/if}
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar configuración"}
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
  .field-lab {
    font-weight: bold;
    font-size: 10px;
    color: #303030;
  }
  .field input,
  .field select {
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    min-height: 24px;
  }
  .unidad-calculada {
    margin: 8px 8px 0;
    font-size: 11px;
    color: #303030;
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
