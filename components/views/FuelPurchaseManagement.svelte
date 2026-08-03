<script>
  // Oculto del rediseño de Combustibles (ver comentario en FuelTabbed.svelte):
  // "Suministro de Almacén" no se renderiza desde ninguna ruta, pero el
  // componente y el endpoint de backend siguen intactos por si se retoma.
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import { createFuelPurchaseColumns } from "../../config/table-definitions.js";

  const initialState = {
    areaCosto: "DISTRITO",
    fuelTypeId: "",
    cantidad: "",
    precioUnitario: "",
    descuento: "",
    totalIngresado: "",
  };
  let form = { ...initialState };
  let facturaFile = null;
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = false;

  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  $: isSupervisorOperativo = $auth?.currentUser?.role === "SUPERVISOR_OPERATIVO";
  $: puedeRegistrar = isAdmin || isSupervisorOperativo;

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
  $: purchases = $data.fuelPurchases ?? { data: [] };
  $: isLoading = $data.isLoading;
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: columns = createFuelPurchaseColumns(fuelTypesById, unidadMedidaById);
  // La unidad depende del combustible seleccionado — GNV se mide en m³, no en galones.
  $: unidadCantidad = unidadMedidaById[Number(form.fuelTypeId)] === "M3" ? "m³" : "galones";

  // Preview en vivo: la fuente de verdad la calcula el backend (totalCalculado),
  // esto solo ayuda al usuario a validar lo que va a escribir en "Total ingresado".
  $: totalEstimado = (Number(form.cantidad) || 0) * (Number(form.precioUnitario) || 0) - (Number(form.descuento) || 0);

  function formatCOP(value) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value);
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchFuelPurchases();
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
      fd.append("areaCosto", form.areaCosto);
      fd.append("fuelTypeId", form.fuelTypeId);
      fd.append("cantidad", form.cantidad);
      fd.append("precioUnitario", form.precioUnitario);
      if (form.descuento) fd.append("descuento", form.descuento);
      fd.append("totalIngresado", form.totalIngresado);
      if (facturaFile) fd.append("factura", facturaFile);

      await data.createFuelPurchase(fd);
      form = { ...initialState };
      facturaFile = null;
      showModal = false;
    } catch (e) {
      errorMessage = e.message || "Error al registrar la compra.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fuel-module">
  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
      <p>Cargando compras...</p>
    </div>
  {:else}
    <div class="fuel-toolbar">
      <p class="fuel-hint"></p>
      {#if puedeRegistrar}
        <button type="button" class="btn-create" on:click={openModal}>+ Registrar compra</button>
      {/if}
    </div>

    <div class="fuel-table-wrap">
      <DataGrid {columns} data={purchases.data} showDeleteButton={false} />
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Registrar compra</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form aria-label="Registrar compra" class="create-form" on:submit={handleSubmit}>
        <div class="create-grid">
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
          <label class="field" for="cantidad">
            <span class="field-lab">Cantidad ({unidadCantidad})</span>
            <input id="cantidad" type="number" step="0.001" bind:value={form.cantidad} required disabled={isSubmitting} />
          </label>
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
            <span class="field-hint">Lo que realmente pagaste, no el calculado abajo</span>
          </label>
          <label class="field" for="factura">
            <span class="field-lab">Factura</span>
            <input id="factura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleFileChange} required disabled={isSubmitting} />
          </label>
        </div>
        <p class="total-estimado">Cálculo automático (cantidad × precio − descuento): {formatCOP(totalEstimado)} — compáralo con el total pagado</p>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar compra"}
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
  .field-hint {
    font-size: 9px;
    color: #666;
    font-weight: normal;
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
  .total-estimado {
    margin: 8px 8px 0;
    font-size: 11px;
    font-weight: bold;
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
