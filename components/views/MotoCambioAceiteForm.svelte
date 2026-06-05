<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { data as dataStore } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';
  import Loader from '../shared/Loader.svelte';

  let motos = [];
  let selectedMoto = null;
  let oils = [];
  let selectedOil = null;
  let oilType = 'motor';
  let kmAtChange = '';
  let intervalKm = '2500';
  let quantity = '';
  let airFilterChanged = false;
  let isSubmitting = false;
  let error = '';
  let isLoading = true;

  async function loadData() {
    try {
      isLoading = true;
      motos = await dataStore.fetchMotos() || [];
      oils = await dataStore.fetchOils() || [];
    } catch (e) {
      addNotification({ text: 'Error al cargar datos: ' + e.message, type: 'error' });
    } finally {
      isLoading = false;
    }
  }

  async function submitForm() {
    error = '';
    if (!selectedMoto) {
      error = 'Seleccione una motocicleta';
      return;
    }
    if (!selectedOil) {
      error = 'Seleccione una marca de aceite';
      return;
    }
    const km = parseInt(kmAtChange, 10);
    if (!km || km <= 0) {
      error = 'Ingrese un kilometraje válido';
      return;
    }
    const interval = parseInt(intervalKm, 10);
    if (!interval || interval <= 0) {
      error = 'Ingrese un intervalo válido';
      return;
    }

    isSubmitting = true;
    try {
      await dataStore.registerVehicleOilChange({
        placa: selectedMoto.placa,
        dateStamp: new Date().toISOString(),
        oilType,
        brandId: selectedOil.id,
        brandName: selectedOil.name,
        kmAtChange: km,
        intervalKm: interval,
        quantity: quantity ? parseFloat(quantity) : null,
        airFilterChanged: airFilterChanged ? 1 : 0
      });
      addNotification({ text: 'Cambio de aceite registrado exitosamente' });
      push('/');
    } catch (e) {
      error = 'Error al registrar: ' + (e.message || 'Error desconocido');
      addNotification({ text: error, type: 'error' });
    } finally {
      isSubmitting = false;
    }
  }

  function handleGoBack() {
    push('/');
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="container">
  <div class="header">
    <button type="button" class="btn-back" on:click={handleGoBack}>← Volver</button>
    <h2>Registrar Cambio de Aceite — Motocicleta</h2>
  </div>

  {#if isLoading}
    <div class="loader-container">
      <Loader />
    </div>
  {:else}
    <form on:submit|preventDefault={submitForm} class="form-container">
      <div class="form-group">
        <label for="moto-select">Motocicleta (*)</label>
        <select id="moto-select" bind:value={selectedMoto} required>
          <option value={null}>— Seleccionar —</option>
          {#each motos as moto}
            <option value={moto}>{moto.placa}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="oil-brand">Marca de Aceite (*)</label>
        <select id="oil-brand" bind:value={selectedOil} required>
          <option value={null}>— Seleccionar —</option>
          {#each oils as oil}
            <option value={oil}>{oil.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="oil-type">Tipo de Aceite</label>
          <select id="oil-type" bind:value={oilType}>
            <option value="motor">Motor</option>
            <option value="hidraulico">Hidráulico</option>
          </select>
        </div>

        <div class="form-group">
          <label for="km-at-change">Kilometraje Actual (*)</label>
          <input type="number" id="km-at-change" bind:value={kmAtChange} required />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="interval-km">Intervalo Próximo Cambio (km) (*)</label>
          <input type="number" id="interval-km" bind:value={intervalKm} required />
          <small>Típico: 2000-3000 km para motos</small>
        </div>

        <div class="form-group">
          <label for="quantity">Cantidad (L)</label>
          <input type="number" id="quantity" bind:value={quantity} step="0.1" />
        </div>
      </div>

      <div class="form-group checkbox">
        <input type="checkbox" id="air-filter" bind:checked={airFilterChanged} />
        <label for="air-filter">¿Se cambió el filtro de aire?</label>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="form-actions">
        <button type="submit" disabled={isSubmitting} class="btn btn-primary">
          {isSubmitting ? 'Guardando...' : 'Guardar Cambio'}
        </button>
        <button type="button" on:click={handleGoBack} class="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .container {
    padding: 16px;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #a0a0a0;
  }

  .header h2 {
    margin: 0;
    font-size: 13px;
    font-weight: bold;
    flex: 1;
  }

  .btn-back {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #d0d0d0;
    padding: 3px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    white-space: nowrap;
  }

  .btn-back:hover {
    background: linear-gradient(to bottom, #ececec 0%, #d0d0d0 100%);
  }

  .loader-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
  }

  .form-container {
    background: #f5f5f5;
    padding: 16px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 11px;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 6px;
    border: 1px inset #808080;
    background: #fff;
    font-family: inherit;
    font-size: 11px;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: 1px solid #0080ff;
  }

  .form-group small {
    display: block;
    color: #666;
    font-size: 10px;
    margin-top: 2px;
  }

  .form-group.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .form-group.checkbox input {
    width: auto;
    margin: 0;
  }

  .form-group.checkbox label {
    margin: 0;
  }

  .error-message {
    background: #ffcccc;
    border: 1px solid #c00;
    color: #800000;
    padding: 8px;
    margin-bottom: 12px;
    border-radius: 3px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #d0d0d0;
  }

  .btn {
    padding: 6px 16px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    border-radius: 3px;
    font-weight: bold;
  }

  .btn-primary {
    background: linear-gradient(to bottom, #0080ff 0%, #0060cc 100%);
    color: #fff;
    border-color: #004488;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(to bottom, #0099ff 0%, #0077dd 100%);
  }

  .btn-primary:active:not(:disabled) {
    border-style: inset;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border-color: #a0a0a0;
  }

  .btn-secondary:hover {
    background: linear-gradient(to bottom, #ececec 0%, #d0d0d0 100%);
  }
</style>
