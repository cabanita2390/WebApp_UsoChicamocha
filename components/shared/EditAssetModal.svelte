<script>
  import { createEventDispatcher } from 'svelte';
  import { locationLabel } from '@/lib/assetUtils.js';

  export let open = false;
  export let title = '';
  export let asset = null;
  export let brands = [];
  export let locations = [];
  export let isAdmin = false;
  export let isSubmitting = false;
  export let errorMessage = '';
  export let submitDisabled = false;
  export let belongsToRequired = false;
  export let locationTitle = null;
  export let capacityPlaceholder = 'Ej: 18.5';
  export let efficiencyPlaceholder = 'Ej: 42.5';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function handleSubmit(event) {
    event.preventDefault();
    dispatch('submit', event);
  }
</script>

{#if open && asset}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="close-btn" on:click={close}>×</button>
      </div>
      <form class="modal-form" on:submit={handleSubmit}>
        <div class="modal-form-grid">
          <label class="field">
            <span class="field-lab">Placa</span>
            <input type="text" bind:value={asset.placa} required />
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Marca
              <button type="button" class="field-add-btn" on:click={() => dispatch('quickcatalog', 'brand')}>+ Añadir</button>
            </span>
            <select
              required
              value={asset.idMarca == null ? '' : String(asset.idMarca)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                asset.idMarca = raw === '' ? null : Number(raw);
              }}
            >
              <option value="">— Seleccione marca —</option>
              {#each brands as brand}
                <option value={String(brand.idMarca)}>{brand.descripcion}</option>
              {/each}
            </select>
          </label>

          <slot name="type-field" />

          <label class="field">
            <span class="field-lab">Km actual</span>
            <input type="number" bind:value={asset.kilometrajeActual} required />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={asset.belongsTo} required={belongsToRequired}>
              <option value="">— Seleccionar —</option>
              <option value="Distrito">Distrito</option>
              <option value="Asociación">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Ubicación
              <button type="button" class="field-add-btn" on:click={() => dispatch('quickcatalog', 'location')}>+ Añadir</button>
            </span>
            <select
              value={asset.idUbicacionBase != null && asset.idUbicacionBase !== '' ? String(asset.idUbicacionBase) : ''}
              on:change={(e) => {
                const v = e.currentTarget.value;
                asset.idUbicacionBase = v === '' ? null : Number(v);
              }}
              title={locationTitle}
            >
              <option value="">Seleccione ubicación</option>
              {#each locations as loc}
                <option value={String(loc.id)}>{locationLabel(loc)}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Estado</span>
            <select
              value={asset.activo === true || asset.activo === 'true' || asset.activo === 1 || asset.activo === '1' ? '1' : '0'}
              on:change={(e) => {
                asset.activo = e.currentTarget.value === '1';
              }}
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>
          {#if isAdmin}
          <label class="field">
            <span class="field-lab">Capacidad del tanque (Gal)</span>
            <input
              type="number" step="0.001" min="0.1"
              bind:value={asset.fuelTankCapacityGallons}
              placeholder={capacityPlaceholder}
            />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center">
              <input
                type="number" step="0.01" min="0"
                bind:value={asset.factoryEfficiencyKmPerGallon}
                placeholder={efficiencyPlaceholder}
                style="padding:3px 4px;font-size:11px;min-height:26px"
              />
              <select bind:value={asset.factoryEfficiencyUnit} style="padding:4px;font-size:12px;min-height:28px">
                <option value="KM_PER_GALLON">km/Gal</option>
                <option value="KM_PER_CUBIC_METER">km/m³ (gas)</option>
              </select>
            </div>
          </label>
          {/if}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={close}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting || submitDisabled}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

<style>
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
    width: min(96vw, 760px);
    max-width: 96vw;
    box-sizing: border-box;
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
  .modal-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr));
    gap: 8px 10px;
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
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-cancel { background: #d0d0d0; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .btn-save { background: #90ee90; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
</style>
