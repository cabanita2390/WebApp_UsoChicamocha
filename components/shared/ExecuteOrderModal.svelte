<script>
  import { createEventDispatcher } from "svelte";

  export let workOrder = null;
  export const isSubmitting = false;

  const dispatch = createEventDispatcher();

  let timeSpent = "";
  let description = "";

  let labor = {
    price: workOrder.labor?.price?.toString() || "0",
    sameMecanic: workOrder.labor?.sameMecanic || true,
    contractor: workOrder.labor?.contractor || "",
    observations: workOrder.labor?.observations || "",
  };

  let spareParts = [{ id: 1, ref: "", name: "", quantity: 1, price: "" }];
  let nextSparePartId = 2;

  let isProcessing = false;

  $: isFormValid =
    timeSpent.trim() !== "" &&
    description.trim() !== "" &&
    (labor.sameMecanic || labor.contractor.trim() !== "") &&
    (labor.price === "" || labor.price === null || Number(labor.price) >= 0) &&
    spareParts.every(
      (p) =>
        p.ref.trim() !== "" &&
        p.name.trim() !== "" &&
        p.quantity !== "" &&
        Number(p.quantity) > 0 &&
        p.price !== "" &&
        Number(p.price) >= 0,
    );

  function addSparePart() {
    spareParts = [
      ...spareParts,
      { id: nextSparePartId++, ref: "", name: "", quantity: 1, price: "" },
    ];
  }

  function removeSparePart(id) {
    spareParts = spareParts.filter((part) => part.id !== id);
    if (spareParts.length === 0) {
      addSparePart(); // Siempre debe haber al menos una tarjeta
    }
  }

  function handleSubmit() {
    if (isProcessing) return;
    if (!isFormValid) return; // Evita envío si es inválido

    isProcessing = true;

    const sparePartPayload = {
      ref: spareParts.map((p) => p.ref).join(" - "),
      name: spareParts.map((p) => p.name).join(" - "),
      quantity: spareParts.map((p) => p.quantity).join(" - "),
      price: spareParts.reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    };

    const laborPayload = {
      ...labor,
      price:
        labor.price === "" || labor.price === null ? 0 : Number(labor.price),
    };

    const finalPayload = {
      orderId: workOrder.order.id,
      timeSpent,
      description,
      labor: laborPayload,
      sparePart: sparePartPayload,
    };

    dispatch("execute", finalPayload);
  }

  function onCancel() {
    dispatch("cancel");
  }
  const orderFields = workOrder.order.description.split("|");
  const tipo = orderFields[0]?.trim() || "";
  const sector = orderFields[1]?.trim() || "";
  const estado = orderFields[2]?.trim() || "";
  const descripcionOrden = orderFields[3]?.trim() || "";
  const asignadoA = orderFields[4]?.trim() || "";
</script>

<div class="modal-overlay">
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2>Ejecutar Orden de Trabajo</h2>
      <button class="close-btn" on:click={onCancel}>×</button>
    </div>

    <div class="modal-body">
      <!-- Panel de Información de la Orden Original -->
      <div class="info-panel">
        <div class="info-panel-header">Detalles de la Orden Original</div>
        <div class="info-panel-body">
          <p>
            <strong>Máquina:</strong>
            {workOrder.machine?.name} - {workOrder.machine?.model}
          </p>
          <p><strong>Tipo:</strong> {tipo}</p>
          <p><strong>Sector:</strong> {sector}</p>
          <p>
            <strong>Estado:</strong>
            <span style="font-weight:bold">{estado}</span>
          </p>
          <p><strong>Descripción orden:</strong> {descripcionOrden}</p>
          <p><strong>Asignado a:</strong> {asignadoA}</p>
        </div>
      </div>

      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-section">
          <label>Tiempo Empleado (ej. 2 horas, 30 mins):</label>
          <input type="text" bind:value={timeSpent} required />

          <label>Descripción / Detalles del Trabajo Realizado:</label>
          <textarea bind:value={description} rows="4" required></textarea>
        </div>

        <fieldset class="form-section">
          <legend>Mano de Obra</legend>
          <div class="form-grid">
            <label
              >Contratista: <input
                type="text"
                bind:value={labor.contractor}
                disabled={labor.sameMecanic}
              /></label
            >
            <label
              >Precio: <input
                type="number"
                min="0"
                bind:value={labor.price}
              /></label
            >
          </div>
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={labor.sameMecanic}
              on:change={() => {
                if (labor.sameMecanic) labor.contractor = "";
              }}
            />
            El arreglo fue realizado por el mismo mecánico que reportó
          </label>
          <label>Observaciones de Mano de Obra:</label>
          <textarea bind:value={labor.observations} rows="2"></textarea>
        </fieldset>

        <fieldset class="form-section">
          <legend>Partes y Repuestos</legend>
          {#each spareParts as part (part.id)}
            <div class="spare-part-card">
              <div class="card-header">
                <span>Repuesto</span>
                {#if spareParts.length > 1}
                  <button
                    type="button"
                    class="btn-remove"
                    on:click={() => removeSparePart(part.id)}>&times;</button
                  >
                {/if}
              </div>
              <div class="form-grid">
                <label
                  >Referencia: <input
                    type="text"
                    bind:value={part.ref}
                    required
                  /></label
                >
                <label
                  >Nombre: <input
                    type="text"
                    bind:value={part.name}
                    required
                  /></label
                >
                <label
                  >Cantidad: <input
                    type="number"
                    min="1"
                    bind:value={part.quantity}
                    required
                  /></label
                >
                <label
                  >Precio total: <input
                    type="number"
                    min="0"
                    bind:value={part.price}
                    required
                  /></label
                >
              </div>
            </div>
          {/each}
          <button type="button" class="btn-add" on:click={addSparePart}
            >+ Agregar Repuesto</button
          >
        </fieldset>
      </form>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" on:click={onCancel}>Cancelar</button>
      <button
        class="btn-create"
        on:click={handleSubmit}
        disabled={!isFormValid || isProcessing}
      >
        {isProcessing ? "Procesando..." : "Ejecutar y Completar Orden"}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    /* Estilos del modal base */
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  }
  .modal-content {
    background: #e0e0e0;
    border: 2px outset #c0c0c0;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #c0c0c0;
    border-bottom: 1px solid #808080;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 12px;
  }
  .close-btn {
    background: none;
    border: 1px outset #c0c0c0;
    font-size: 14px;
    cursor: pointer;
  }
  .modal-body {
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
  }
  .info-panel {
    border: 1px inset #c0c0c0;
  }
  .info-panel-header {
    padding: 6px 10px;
    font-weight: bold;
    background: #d0d0d0;
  }
  .info-panel-body {
    padding: 10px;
    background: #f8f8f8;
  }
  .info-panel p {
    margin: 0 0 4px;
  }
  .form-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .form-section legend {
    font-weight: bold;
    margin-bottom: 8px;
  }
  .form-section fieldset {
    border: 1px inset #c0c0c0;
    padding: 12px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  input,
  textarea,
  select {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    background-color: #ffffff;
    font-family: inherit;
    font-size: 11px;
  }
  .checkbox-label {
    flex-direction: row;
    align-items: center;
  }
  .spare-part-card {
    border: 1px solid #a0a0a0;
    padding: 10px;
    margin-bottom: 10px;
    background: #f0f0f0;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: bold;
  }
  .btn-remove,
  .btn-add {
    padding: 2px 8px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
    background-color: #f0f0f0;
  }
  .btn-add {
    width: 100%;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #808080;
    background: #d0d0d0;
  }
  .btn-cancel,
  .btn-create {
    padding: 6px 12px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
    font-weight: bold;
  }
</style>
