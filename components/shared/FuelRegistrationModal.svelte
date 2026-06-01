<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { data as dataStore } from '../../stores/data.js';

  const dispatch = createEventDispatcher();

  let assetType = 'MACHINE';
  let assetId = '';
  let assetPlate = '';
  let fuelDateTime = new Date().toISOString().slice(0, 16); // "yyyy-MM-ddTHH:mm"
  let odometerKm = '';
  let hourMeter = '';
  let quantity = '';
  let quantityUnit = 'GALLONS';
  let pricePerUnit = '';
  let totalCostCalculated = '';
  let totalCostActual = '';
  let fuelType = 'DIESEL';
  let serviceStation = '';
  let isFullTank = false;
  let discountAmount = '';
  let voucherNumber = '';
  let notes = '';

  let saving = false;
  let formError = '';

  // Estaciones de combustible (catálogo del servidor)
  let stations = [];
  onMount(async () => {
    try { stations = await dataStore.fetchFuelStations(); } catch (_) {}
  });

  // GAS_NATURAL siempre usa m³
  $: isGas = fuelType === 'GAS_NATURAL';
  $: { if (isGas) quantityUnit = 'CUBIC_METERS'; else if (quantityUnit === 'CUBIC_METERS') quantityUnit = 'GALLONS'; }
  $: unitLabel = quantityUnit === 'LITERS' ? 'L' : quantityUnit === 'CUBIC_METERS' ? 'm³' : 'Gal';

  $: isMachine = assetType === 'MACHINE';
  $: needsOdometer = assetType === 'VEHICLE' || assetType === 'MOTO';

  $: {
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      totalCostCalculated = (qty * price).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      totalCostCalculated = '';
    }
  }

  $: costMismatch = (() => {
    const calc = parseFloat(quantity) * parseFloat(pricePerUnit);
    const actual = parseFloat(totalCostActual.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(calc) && !isNaN(actual) && calc > 0) {
      return Math.abs(calc - actual) / calc > 0.01;
    }
    return false;
  })();

  async function handleSubmit() {
    formError = '';
    if (!assetId || !quantity || !pricePerUnit || !fuelDateTime) {
      formError = 'ID del activo, cantidad, precio/unidad y fecha son obligatorios.';
      return;
    }
    if (isMachine && !hourMeter) {
      formError = 'El horómetro es obligatorio para maquinaria.';
      return;
    }
    if (needsOdometer && !odometerKm) {
      formError = 'El odómetro (km) es obligatorio para vehículos y motos.';
      return;
    }

    saving = true;
    try {
      await dataStore.createFuelLog({
        assetType,
        assetId: Number(assetId),
        assetPlate: assetPlate || null,
        fuelDateTime: fuelDateTime + ':00', // append seconds → ISO datetime string
        odometerKm: needsOdometer ? Number(odometerKm) : null,
        hourMeter: isMachine ? Number(hourMeter) : null,
        quantity: Number(quantity),
        quantityUnit,
        pricePerUnit: Number(pricePerUnit),
        totalCostActual: totalCostActual ? parseFloat(totalCostActual.replace(/\./g, '').replace(',', '.')) : null,
        fuelType,
        serviceStation: serviceStation || null,
        isFullTank,
        discountAmount: discountAmount ? Number(discountAmount) : null,
        voucherNumber: voucherNumber || null,
        notes: notes || null,
      });
      dispatch('created');
    } catch (err) {
      formError = err.message || 'Error al guardar el registro.';
    } finally {
      saving = false;
    }
  }
</script>

<style>
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
  .modal-content { background: #e0e0e0; padding: 20px; border: 2px outset #c0c0c0; width: 520px; max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .modal-header h3 { margin: 0; font-size: 14px; }
  .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-field { display: flex; flex-direction: column; gap: 3px; font-size: 11px; }
  .form-field.full-width { grid-column: 1 / -1; }
  .form-field label { font-weight: bold; }
  .form-field input, .form-field select, .form-field textarea {
    padding: 4px 5px; border: 1px inset #808080; background: #fff;
    font-size: 11px; font-family: inherit;
  }
  .form-field textarea { resize: vertical; min-height: 48px; }
  .quantity-row { display: flex; gap: 4px; }
  .quantity-row input { flex: 1; }
  .quantity-row select { flex: 0 0 90px; }
  .checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-top: 4px; }
  .total-calc { font-size: 11px; padding: 4px 5px; background: #f5f5f5; border: 1px inset #c0c0c0; color: #333; }
  .mismatch { color: #c00; font-weight: bold; font-size: 10px; margin-top: 2px; }
  .section-sep { grid-column: 1 / -1; border-top: 1px solid #b0b0b0; margin-top: 4px; padding-top: 4px; font-size: 10px; color: #666; font-style: italic; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  .btn { padding: 4px 12px; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); border: 1px outset #c0c0c0; cursor: pointer; font-size: 11px; font-family: inherit; }
  .btn:hover { background: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%); }
  .btn:active { border-style: inset; }
  .btn-primary { font-weight: bold; }
  .error { color: red; font-size: 11px; margin-top: 8px; }
</style>

<div class="modal-overlay">
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h3>Registrar Carga de Combustible</h3>
      <button class="close-btn" on:click={() => dispatch('cancel')}>×</button>
    </div>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-grid">

        <div class="form-field">
          <label for="fuel-asset-type">Tipo de Activo:</label>
          <select id="fuel-asset-type" bind:value={assetType}>
            <option value="MACHINE">Maquinaria</option>
            <option value="VEHICLE">Vehículo</option>
            <option value="MOTO">Motocicleta</option>
          </select>
        </div>

        <div class="form-field">
          <label for="fuel-asset-id">ID del Activo:</label>
          <input id="fuel-asset-id" type="number" bind:value={assetId} placeholder="ID en sistema" required />
        </div>

        <div class="form-field">
          <label for="fuel-asset-plate">Placa / Nombre:</label>
          <input id="fuel-asset-plate" type="text" bind:value={assetPlate} placeholder="Para referencia rápida" />
        </div>

        <div class="form-field">
          <label for="fuel-datetime">Fecha y Hora:</label>
          <input id="fuel-datetime" type="datetime-local" bind:value={fuelDateTime} required />
        </div>

        {#if isMachine}
          <div class="form-field">
            <label for="fuel-hour-meter">Horómetro (h):</label>
            <input id="fuel-hour-meter" type="number" step="0.01" bind:value={hourMeter} placeholder="Ej: 1250.50" required />
          </div>
        {/if}

        {#if needsOdometer}
          <div class="form-field">
            <label for="fuel-odometer">Odómetro (km):</label>
            <input id="fuel-odometer" type="number" step="0.01" bind:value={odometerKm} placeholder="Ej: 45320.5" required />
          </div>
        {/if}

        <div class="form-field">
          <label>Cantidad ({unitLabel}):</label>
          <div class="quantity-row">
            <input type="number" step="0.001" bind:value={quantity} placeholder="Ej: 10.000" required />
            <select bind:value={quantityUnit} disabled={isGas}>
              <option value="GALLONS">Galones</option>
              <option value="LITERS">Litros</option>
              {#if isGas}<option value="CUBIC_METERS">m³</option>{/if}
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="fuel-price">Precio por Unidad ($):</label>
          <input id="fuel-price" type="number" step="0.01" bind:value={pricePerUnit} placeholder="Ej: 9850.00" required />
        </div>

        <div class="form-field">
          <label>Total Calculado:</label>
          <div class="total-calc">{totalCostCalculated ? `$ ${totalCostCalculated}` : '—'}</div>
        </div>

        <div class="form-field">
          <label for="fuel-total-actual">Total Facturado ($) <em style="font-weight:normal">(opcional)</em>:</label>
          <input id="fuel-total-actual" type="text" bind:value={totalCostActual} placeholder="Si difiere del calculado" />
          {#if costMismatch}
            <span class="mismatch">⚠ Diferencia &gt;1% con total calculado</span>
          {/if}
        </div>

        <div class="form-field">
          <label for="fuel-type">Tipo de Combustible:</label>
          <select id="fuel-type" bind:value={fuelType}>
            <option value="DIESEL">Diesel</option>
            <option value="ACPM">ACPM</option>
            <option value="GASOLINA_CORRIENTE">Gasolina Corriente</option>
            <option value="GASOLINA_EXTRA">Gasolina Extra</option>
            <option value="GAS_NATURAL">Gas Natural (m³)</option>
          </select>
        </div>

        <div class="form-field">
          <label for="fuel-station">Bomba / Estación:</label>
          <select id="fuel-station" bind:value={serviceStation}>
            <option value="">— Seleccionar —</option>
            {#each stations as s}
              <option value={s.name}>{s.name}</option>
            {/each}
          </select>
          {#if stations.length === 0}
            <span style="font-size:10px;color:#888">Sin estaciones — créalas en la pestaña Estaciones</span>
          {/if}
        </div>

        <div class="section-sep">Campos opcionales</div>

        <div class="form-field">
          <label for="fuel-voucher">N° Comprobante:</label>
          <input id="fuel-voucher" type="text" bind:value={voucherNumber} placeholder="Ej: REC-00123" />
        </div>

        <div class="form-field">
          <label for="fuel-discount">Descuento ($):</label>
          <input id="fuel-discount" type="number" step="0.01" bind:value={discountAmount} placeholder="0.00" />
        </div>

        <div class="form-field full-width">
          <div class="checkbox-row">
            <input id="fuel-full-tank" type="checkbox" bind:checked={isFullTank} />
            <label for="fuel-full-tank">Llenado completo (necesario para calcular eficiencia)</label>
          </div>
        </div>

        <div class="form-field full-width">
          <label for="fuel-notes">Notas:</label>
          <textarea id="fuel-notes" bind:value={notes} placeholder="Observaciones opcionales..."></textarea>
        </div>

      </div>

      {#if formError}
        <div class="error">{formError}</div>
      {/if}

      <div class="modal-actions">
        <button type="button" class="btn" on:click={() => dispatch('cancel')}>Cancelar</button>
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Registro'}
        </button>
      </div>
    </form>
  </div>
</div>
