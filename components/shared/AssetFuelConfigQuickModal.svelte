<script>
  // Modal contextual "Ajustar estándar" — misma lógica de unidades y mismo payload que
  // AssetFuelConfigManagement.svelte (panel admin masivo), pero SIN el buscador de
  // activo: el activo ya viene fijo (se abre desde el detalle de Rendimiento de ESE
  // activo), así que solo pide combustible/consumo/unidad/capacidad.
  import { createEventDispatcher } from "svelte";
  import { data } from "../../stores/data.js";

  export let tipoElemento = "VEHICULO"; // 'MAQUINARIA' | 'VEHICULO' | 'MOTOCICLETA'
  export let activoId;
  export let activoLabel = "";
  export let fuelTypes = [];
  // Config actual del activo (entrada de $data.fuelAssetConfig que matchea
  // machineId/vehicleId), o null si el activo todavía no tiene una configurada.
  export let currentConfig = null;

  const dispatch = createEventDispatcher();

  const UNIDAD_VEHICULO = { GALON: "KM_POR_GALON", M3: "KM_POR_M3" };
  const UNIDAD_MAQUINA = { GALON: "HORA_POR_GALON", M3: "HORA_POR_M3" };
  const UNIDADES_POR_MEDIDA = {
    GALON: [
      { value: "KM_POR_GALON", label: "Km/Gl" },
      { value: "HORA_POR_GALON", label: "H/Gl" },
    ],
    M3: [
      { value: "KM_POR_M3", label: "Km/M3" },
      { value: "HORA_POR_M3", label: "H/M3" },
    ],
  };

  // MAQUINARIA usa la unidad "por hora"; VEHICULO y MOTOCICLETA (comparten tabla y
  // familia de unidad) usan la unidad "por km" — mismo criterio que
  // AssetFuelConfigManagement (allí "MAQUINA" es el único caso especial).
  $: esMaquina = tipoElemento === "MAQUINARIA";

  let form = {
    fuelTypeDefaultId: currentConfig ? String(currentConfig.fuelTypeDefaultId) : "",
    consumoEstandar: currentConfig ? String(currentConfig.consumoEstandar) : "",
    tanqueCapacidadGal: currentConfig?.tanqueCapacidadGal != null ? String(currentConfig.tanqueCapacidadGal) : "",
  };
  let isSubmitting = false;
  let errorMessage = "";

  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: unidadCalculada = calcularUnidad(unidadMedidaById[Number(form.fuelTypeDefaultId)]);
  $: unidadesDisponibles = UNIDADES_POR_MEDIDA[unidadMedidaById[Number(form.fuelTypeDefaultId)]] ?? [];

  function calcularUnidad(unidadMedida) {
    if (!unidadMedida) return null;
    return esMaquina ? UNIDAD_MAQUINA[unidadMedida] : UNIDAD_VEHICULO[unidadMedida];
  }

  // Se precarga con la unidad ya configurada del activo (si la hay); si el usuario
  // cambia de combustible, se resugiere para ese combustible — mismo patrón que
  // AssetFuelConfigManagement (compara contra el valor anterior para no pisar una
  // elección manual del usuario en cada re-render).
  let unidadSeleccionada = currentConfig?.unidadConsumo ?? null;
  let unidadSugeridaAnterior = unidadSeleccionada;
  $: if (unidadCalculada !== unidadSugeridaAnterior) {
    unidadSugeridaAnterior = unidadCalculada;
    unidadSeleccionada = unidadCalculada;
  }

  function closeModal() {
    dispatch("close");
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.fuelTypeDefaultId) {
      errorMessage = "Seleccione un tipo de combustible.";
      return;
    }
    if (Number(form.consumoEstandar) <= 0) {
      errorMessage = "Consumo estándar debe ser mayor a 0.";
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      const payload = {
        fuelTypeDefaultId: Number(form.fuelTypeDefaultId),
        consumoEstandar: Number(form.consumoEstandar),
        unidadConsumo: unidadSeleccionada,
        tanqueCapacidadGal: form.tanqueCapacidadGal ? Number(form.tanqueCapacidadGal) : null,
      };
      if (esMaquina) {
        await data.updateAssetFuelConfigMachine(Number(activoId), payload);
      } else {
        await data.updateAssetFuelConfigVehicle(Number(activoId), payload);
      }
      dispatch("success");
    } catch (e) {
      errorMessage = e.message || "Error al guardar la configuración.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" role="presentation" on:click={closeModal}>
  <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
    <div class="modal-header">
      <h3>Ajustar consumo estándar</h3>
      <button type="button" class="close-btn" on:click={closeModal}>×</button>
    </div>
    <p class="modal-subtitle">{activoLabel}</p>
    <form aria-label="Ajustar consumo estándar" class="cfg-form" on:submit={handleSubmit}>
      <label class="field" for="qcfgFuelType">
        <span class="field-lab">Combustible</span>
        <select id="qcfgFuelType" bind:value={form.fuelTypeDefaultId} required disabled={isSubmitting}>
          <option value="" disabled>Seleccione...</option>
          {#each fuelTypes as ft}
            <option value={String(ft.id)}>{ft.nombre}</option>
          {/each}
        </select>
      </label>

      <div class="field-row">
        <label class="field" for="qcfgConsumo">
          <span class="field-lab">Consumo estándar</span>
          <input
            id="qcfgConsumo"
            type="number"
            step="0.0001"
            min="0.0001"
            bind:value={form.consumoEstandar}
            required
            disabled={isSubmitting}
          />
        </label>

        <label class="field" for="qcfgUnidad">
          <span class="field-lab">Unidad</span>
          <select id="qcfgUnidad" bind:value={unidadSeleccionada} disabled={isSubmitting}>
            {#each unidadesDisponibles as u}
              <option value={u.value}>{u.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <label class="field" for="qcfgCapacidad">
        <span class="field-lab">Capacidad del tanque (gal, opcional)</span>
        <input
          id="qcfgCapacidad"
          type="number"
          step="0.01"
          placeholder="gal, opcional"
          bind:value={form.tanqueCapacidadGal}
          disabled={isSubmitting}
        />
      </label>

      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}

      <div class="cfg-actions">
        <button type="button" class="btn-cancel" on:click={closeModal} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" class="btn-save" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 24px;
  }
  .modal-content {
    background: #fff;
    border-radius: 20px;
    padding: 30px;
    width: 420px;
    max-width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0b0b0b;
  }
  .modal-subtitle {
    font-size: 12px;
    color: #898781;
    margin: 4px 0 18px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: #898781;
    cursor: pointer;
  }
  .cfg-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .field-row {
    display: flex;
    gap: 12px;
  }
  .field-row .field {
    flex: 1;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 12px;
    color: #52514e;
  }
  .field input,
  .field select {
    font-family: inherit;
    box-sizing: border-box;
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 12px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .cfg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }
  .btn-cancel {
    font-family: inherit;
    background: #f0f0ef;
    color: #52514e;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-cancel:hover {
    background: #e4e4e2;
  }
  .btn-save {
    font-family: inherit;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-save:hover {
    background: #256abf;
  }
  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-message {
    color: #d03b3b;
    font-size: 12px;
    margin: 0;
  }
</style>
