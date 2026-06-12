<script>
  import { improvedOilChangeStore } from '../stores/improvedOilChange';
  import { data } from '../stores/data';
  import { onMount, onDestroy } from 'svelte';

  let selectedVehicle = null;
  let selectedRequirement = null;
  let selectedBrand = null;
  let kmAtChange = '';
  let quantity = '';
  let airFilterChanged = false;
  let formSubmitted = false;

  let $oilChangeRequirements;
  let $vehicleRequirements;
  let $loading;
  let $error;
  let $success;

  const unsubscribeRequirements = improvedOilChangeStore.oilChangeRequirements.subscribe(v => {
    $oilChangeRequirements = v;
    $vehicleRequirements = v.filter(r => r.assetType === 'VEHICLE');
  });

  const unsubscribeLoading = improvedOilChangeStore.loading.subscribe(v => {
    $loading = v;
  });

  const unsubscribeError = improvedOilChangeStore.error.subscribe(v => {
    $error = v;
  });

  const unsubscribeSuccess = improvedOilChangeStore.success.subscribe(v => {
    $success = v;
  });

  let $vehicles = [];
  const unsubscribeVehicles = data.subscribe(d => {
    $vehicles = d.vehicles || [];
  });

  let $oils = [];
  const unsubscribeOils = data.subscribe(d => {
    $oils = d.oils || [];
  });

  onMount(async () => {
    improvedOilChangeStore.loadRequirements();
  });

  onDestroy(() => {
    unsubscribeRequirements();
    unsubscribeLoading();
    unsubscribeError();
    unsubscribeSuccess();
    unsubscribeVehicles();
    unsubscribeOils();
  });

  async function handleSubmit() {
    formSubmitted = true;

    if (!selectedVehicle || !selectedRequirement || !selectedBrand || !kmAtChange || !quantity) {
      improvedOilChangeStore.error.set('Complete todos los campos requeridos');
      return;
    }

    try {
      await improvedOilChangeStore.createVehicleOilChange({
        placa: selectedVehicle.placa,
        oilType: selectedRequirement.oilType,
        brandId: selectedBrand.id,
        quantity: parseFloat(quantity),
        kmAtChange: parseInt(kmAtChange),
        airFilterChanged: airFilterChanged,
        requirementId: selectedRequirement.id
      });

      // Reset form
      selectedVehicle = null;
      selectedRequirement = null;
      selectedBrand = null;
      kmAtChange = '';
      quantity = '';
      airFilterChanged = false;
      formSubmitted = false;

      setTimeout(() => improvedOilChangeStore.clearMessages(), 3000);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function clearMessages() {
    improvedOilChangeStore.clearMessages();
  }
</script>

<div class="oil-change-form">
  <h3>📋 Registrar Cambio de Aceite - Vehículos</h3>

  {#if $error}
    <div class="alert alert-error">
      {$error}
      <button on:click={clearMessages}>×</button>
    </div>
  {/if}

  {#if $success}
    <div class="alert alert-success">
      {$success}
      <button on:click={clearMessages}>×</button>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="vehicle">Vehículo *</label>
      <select bind:value={selectedVehicle} id="vehicle" required disabled={$loading}>
        <option value={null}>Seleccionar...</option>
        {#each $vehicles as vehicle}
          <option value={vehicle}>
            {vehicle.placa} - {vehicle.marca} ({vehicle.tipoVehiculo})
          </option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="requirement">Tipo de Aceite *</label>
      <select bind:value={selectedRequirement} id="requirement" required disabled={$loading}>
        <option value={null}>Seleccionar...</option>
        {#each $vehicleRequirements as req}
          <option value={req}>
            {req.oilType} - {req.description} ({req.rangeValue} {req.unit})
          </option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="brand">Marca de Aceite *</label>
      <select bind:value={selectedBrand} id="brand" required disabled={$loading}>
        <option value={null}>Seleccionar...</option>
        {#each $oils as oil}
          <option value={oil}>
            {oil.name}
          </option>
        {/each}
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="km">Kilometraje *</label>
        <input
          type="number"
          id="km"
          bind:value={kmAtChange}
          min="0"
          required
          disabled={$loading}
        />
      </div>

      <div class="form-group">
        <label for="qty">Cantidad (Litros) *</label>
        <input
          type="number"
          id="qty"
          bind:value={quantity}
          min="0"
          step="0.5"
          required
          disabled={$loading}
        />
      </div>
    </div>

    <div class="form-group checkbox">
      <label>
        <input
          type="checkbox"
          bind:checked={airFilterChanged}
          disabled={$loading}
        />
        Filtro de aire cambiado
      </label>
    </div>

    <button type="submit" disabled={$loading} class="btn btn-primary">
      {$loading ? '⏳ Guardando...' : '💾 Registrar Cambio'}
    </button>
  </form>
</div>

<style>
  .oil-change-form {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin-top: 0;
    color: #333;
  }

  .alert {
    padding: 12px;
    margin-bottom: 16px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .alert-error {
    background-color: #fee;
    color: #c33;
    border: 1px solid #fcc;
  }

  .alert-success {
    background-color: #efe;
    color: #3c3;
    border: 1px solid #cfc;
  }

  .alert button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group.checkbox {
    flex-direction: row;
    align-items: center;
  }

  .form-group.checkbox label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  label {
    font-weight: 500;
    margin-bottom: 6px;
    color: #555;
  }

  input,
  select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  input:disabled,
  select:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .btn {
    padding: 12px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #0066cc;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0052a3;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
