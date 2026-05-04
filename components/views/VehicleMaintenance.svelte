<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { link } from "svelte-spa-router";
  import { addNotification } from "../../stores/ui.js";

  let allVehicles = [];
  let motorOilBrands = [];
  let selectedVehicle = null;
  let currentDocs = null;
  let activeTab = "oil";
  let isSubmitting = false;
  let searchTerm = "";
  let errorMessage = "";

  let oilForm = {
    oilType: "",
    brandId: null,
    kmAtChange: null,
    intervalKm: 5000,
    airFilterChanged: false,
    quantity: 1.0
  };

  let docForm = {
    tipoDocumento: "SOAT",
    fechaVencimiento: ""
  };

  onMount(async () => {
    await Promise.all([
      data.fetchVehicles(),
      data.fetchOils(),
    ]);
  });

  // Solo aceites de tipo "motor" para vehículos
  $: allVehicles = $data.vehicles;
  $: motorOilBrands = ($data.oils || []).filter(o => o.type === "motor");

  $: filteredVehicles = allVehicles.filter(v =>
    (v.placa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.marca || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function selectVehicle(vehicle) {
    selectedVehicle = vehicle;
    currentDocs = null;
    try {
      currentDocs = await data.getVehicleDocuments(vehicle.id);
    } catch (e) {
      console.error("Error al cargar documentos", e);
    }
  }

  async function handleOilSubmit() {
    if (!selectedVehicle) return;
    errorMessage = "";
    isSubmitting = true;
    try {
      await data.registerVehicleOilChange({
        placa: selectedVehicle.placa,
        oilType: oilForm.oilType,
        brandId: oilForm.brandId,
        kmAtChange: oilForm.kmAtChange,
        intervalKm: oilForm.intervalKm,
        airFilterChanged: oilForm.airFilterChanged,
        quantity: oilForm.quantity,
        dateStamp: new Date().toISOString()
      });
      addNotification({ id: Date.now(), text: "Mantenimiento registrado correctamente." });
      oilForm = { oilType: "", brandId: null, kmAtChange: null, intervalKm: 5000, airFilterChanged: false, quantity: 1.0 };
    } catch (e) {
      errorMessage = "Error al registrar: " + (e.message || JSON.stringify(e));
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDocSubmit() {
    if (!selectedVehicle) return;
    errorMessage = "";
    isSubmitting = true;
    try {
      await data.updateVehicleDocument({
        idVehiculo: selectedVehicle.id,
        tipoDocumento: docForm.tipoDocumento,
        fechaVencimiento: docForm.fechaVencimiento
      });
      addNotification({ id: Date.now(), text: "Documento actualizado correctamente." });
      await selectVehicle(selectedVehicle);
    } catch (e) {
      errorMessage = "Error al actualizar documento: " + (e.message || JSON.stringify(e));
    } finally {
      isSubmitting = false;
    }
  }

  function getStatusColor(estado) {
    if (!estado) return "#808080";
    if (estado === "Vigente" || estado === "OK") return "#006400";
    if (estado === "Vencido" || estado.includes("Cambio")) return "#a00";
    return "#806000";
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner vehicle-module-inner--flush">
  <div class="vehicle-split-row">

    <!-- PANEL IZQUIERDO: Lista de vehículos -->
    <aside class="vehicle-list-panel">
      <div class="vehicle-subpanel-head">Vehículos</div>
      <div class="search-row">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Buscar placa..."
          class="search-input"
        />
      </div>
      <div class="vehicle-list">
        {#each filteredVehicles as v}
          <button
            class="vehicle-item"
            class:selected={selectedVehicle?.id === v.id}
            on:click={() => selectVehicle(v)}
          >
            <span class="item-placa">{v.placa}</span>
            <span class="item-desc">{v.marca} — {v.tipoVehiculo}</span>
          </button>
        {/each}
        {#if filteredVehicles.length === 0}
          <p class="empty-list">Sin resultados.</p>
        {/if}
      </div>
    </aside>

    <!-- PANEL DERECHO: Formularios -->
    <section class="form-panel">
      {#if !selectedVehicle}
        <div class="no-selection">
          <p>← Seleccione un vehículo del panel izquierdo para gestionar su mantenimiento.</p>
        </div>
      {:else}
        <!-- Cabecera con datos del vehículo seleccionado -->
        <div class="vehicle-form-section info-bar">
          <div class="info-row">
            <div class="info-cell">
              <span class="info-label">Placa:</span>
              <strong>{selectedVehicle.placa}</strong>
            </div>
            <div class="info-cell">
              <span class="info-label">Marca:</span>
              <span>{selectedVehicle.marca}</span>
            </div>
            <div class="info-cell">
              <span class="info-label">Km Actual:</span>
              <span>{(selectedVehicle.kilometrajeActual || 0).toLocaleString()}</span>
            </div>
            <div class="info-cell">
              <span class="info-label">SOAT:</span>
              <strong style="color: {getStatusColor(currentDocs?.estadoSoat)}">
                {currentDocs?.estadoSoat || '—'}
              </strong>
            </div>
            <div class="info-cell">
              <span class="info-label">Tecno:</span>
              <strong style="color: {getStatusColor(currentDocs?.estadoTecno)}">
                {currentDocs?.estadoTecno || '—'}
              </strong>
            </div>
          </div>
        </div>

        <!-- Pestañas -->
        <div class="vehicle-tab-bar" role="tablist">
          <button type="button" class="vehicle-tab" class:active={activeTab === 'oil'} on:click={() => { activeTab = 'oil'; errorMessage = ''; }} role="tab" aria-selected={activeTab === 'oil'}>
            Mantenimiento Preventivo (Aceite)
          </button>
          <button type="button" class="vehicle-tab" class:active={activeTab === 'docs'} on:click={() => { activeTab = 'docs'; errorMessage = ''; }} role="tab" aria-selected={activeTab === 'docs'}>
            Documentación Legal
          </button>
        </div>

        <div class="vehicle-form-section maint-form-body">
          {#if activeTab === 'oil'}
            <h3>Registrar Cambio de Aceite — {selectedVehicle.placa}</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Km en el Cambio:</label>
                <input type="number" bind:value={oilForm.kmAtChange} placeholder="Ej: 135000" />
              </div>
              <div class="form-group">
                <label>Tipo / Viscosidad:</label>
                <input type="text" bind:value={oilForm.oilType} placeholder="Ej: 15W-40" />
              </div>
              <div class="form-group">
                <label>
                  Marca de Aceite:
                  <span class="label-hint">
                    (Si no aparece, <a href="/oil-management" use:link>créela aquí</a>)
                  </span>
                </label>
                <select bind:value={oilForm.brandId}>
                  <option value={null}>-- Seleccione marca --</option>
                  {#each motorOilBrands as brand}
                    <option value={brand.id}>{brand.name}</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label>Intervalo (Km):</label>
                <select bind:value={oilForm.intervalKm}>
                  <option value={5000}>5,000 Km</option>
                  <option value={6000}>6,000 Km</option>
                  <option value={8000}>8,000 Km</option>
                  <option value={10000}>10,000 Km</option>
                </select>
              </div>
              <div class="form-group">
                <label>Cantidad (Galones/Litros):</label>
                <input type="number" step="0.1" bind:value={oilForm.quantity} />
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" bind:checked={oilForm.airFilterChanged} />
                  &nbsp;¿Se cambió filtro de aire/combustible?
                </label>
              </div>
            </div>

            {#if errorMessage}
              <p class="vehicle-catalog-inline-error">{errorMessage}</p>
            {/if}

            <div class="form-actions">
              <button class="btn-create" on:click={handleOilSubmit} disabled={isSubmitting || !oilForm.kmAtChange}>
                {isSubmitting ? "Guardando..." : "Registrar Mantenimiento"}
              </button>
            </div>

          {:else}
            <h3>Actualizar Documento Legal — {selectedVehicle.placa}</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Tipo de Documento:</label>
                <select bind:value={docForm.tipoDocumento}>
                  <option value="SOAT">SOAT</option>
                  <option value="TECNOMECANICA">Revisión Tecnomecánica</option>
                  <option value="LICENCIA DE CONDUCCION">Licencia de Conducción</option>
                  <option value="EXTINTOR">Extintor</option>
                </select>
              </div>
              <div class="form-group">
                <label>Fecha de Vencimiento:</label>
                <input type="date" bind:value={docForm.fechaVencimiento} />
              </div>
            </div>

            <p class="info-note">
              Al guardar, el indicador de monitoreo de esta placa se actualizará automáticamente.
            </p>

            {#if errorMessage}
              <p class="vehicle-catalog-inline-error">{errorMessage}</p>
            {/if}

            <div class="form-actions">
              <button class="btn-create" on:click={handleDocSubmit} disabled={isSubmitting || !docForm.fechaVencimiento}>
                {isSubmitting ? "Guardando..." : "Actualizar Vencimiento"}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </section>
  </div>
  </div>
</div>

<style>
  /* ── Panel izquierdo ── */
  .vehicle-list-panel {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border: 2px inset #c0c0c0;
    background: #ffffff;
  }
  .search-row {
    padding: 4px;
    border-bottom: 1px solid #c0c0c0;
    background: #e0e0e0;
  }
  .search-input {
    width: 100%;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    box-sizing: border-box;
  }
  .vehicle-list {
    flex: 1;
    overflow-y: auto;
  }
  .vehicle-item {
    display: flex;
    flex-direction: column;
    width: 100%;
    text-align: left;
    padding: 5px 8px;
    background: none;
    border: none;
    border-bottom: 1px solid #e8e8e8;
    cursor: pointer;
    font-family: inherit;
  }
  .vehicle-item:hover { background: #d4d0c8; }
  .vehicle-item.selected {
    background: #505050;
    color: #fff;
  }
  .item-placa { font-weight: bold; font-size: 12px; }
  .item-desc { font-size: 10px; opacity: 0.75; }
  .empty-list { padding: 8px; color: #808080; font-size: 10px; }

  /* ── Panel derecho ── */
  .form-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: #c0c0c0;
    min-width: 0;
    overflow-y: auto;
  }

  .no-selection {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #808080;
    font-style: italic;
  }

  .maint-form-body {
    padding: 12px 16px;
  }
  .info-bar { padding: 8px 16px; }
  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
  }
  .info-cell { display: flex; gap: 6px; align-items: center; }
  .info-label { color: #404040; font-weight: bold; }

  /* Formulario */
  h3 { margin: 0 0 12px 0; font-size: 12px; }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-group label { font-weight: bold; }
  .form-group input, .form-group select {
    padding: 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .checkbox-group { flex-direction: row; align-items: center; }
  .label-hint { font-weight: normal; font-size: 9px; color: #606060; }
  .label-hint a { color: #303030; text-decoration: underline; }

  .form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
  .btn-create {
    padding: 6px 20px;
    background: #c0c0c0;
    border: 2px outset #ffffff;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
  }
  .btn-create:active { border-style: inset; }
  .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

  .info-note { color: #404040; font-style: italic; font-size: 10px; margin-bottom: 6px; }
</style>
