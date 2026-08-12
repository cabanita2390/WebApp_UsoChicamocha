<script>
  import { createEventDispatcher } from "svelte";
  import { data } from "../../stores/data.js";

  const dispatch = createEventDispatcher();

  let form = { fechaInicio: "", fechaFin: "", monto: "" };
  let isSubmitting = false;
  let errorMessage = "";

  function closeModal() {
    dispatch("close");
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.fechaInicio || !form.fechaFin) {
      errorMessage = "Seleccione fecha inicio y fecha fin.";
      return;
    }
    if (form.fechaFin < form.fechaInicio) {
      errorMessage = "Fecha fin no puede ser anterior a fecha inicio.";
      return;
    }
    if (Number(form.monto) <= 0) {
      errorMessage = "Monto debe ser mayor a 0.";
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.createMonthlyDiscount({
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        monto: Number(form.monto),
      });
      dispatch("saved");
      closeModal();
    } catch (e) {
      errorMessage = e.message || "Error al registrar el descuento.";
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
      <h3>Registrar descuento</h3>
      <button type="button" class="close-btn" on:click={closeModal}>×</button>
    </div>
    <form aria-label="Registrar descuento" class="create-form" on:submit={handleSubmit}>
      <label class="field" for="mdFechaInicio">
        <span class="field-lab">Fecha inicio</span>
        <input id="mdFechaInicio" type="date" bind:value={form.fechaInicio} required disabled={isSubmitting} />
      </label>
      <label class="field" for="mdFechaFin">
        <span class="field-lab">Fecha fin</span>
        <input id="mdFechaFin" type="date" bind:value={form.fechaFin} required disabled={isSubmitting} />
      </label>
      <label class="field" for="mdMonto">
        <span class="field-lab">Monto del descuento</span>
        <input id="mdMonto" type="number" step="0.01" min="0.01" bind:value={form.monto} required disabled={isSubmitting} />
        <span class="field-hint">El total que informó el proveedor para ese periodo, no un estimado</span>
      </label>
      <div class="create-actions">
        <button type="button" class="btn-cancel" on:click={closeModal} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" class="btn-create" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Registrar descuento"}
        </button>
      </div>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
  </div>
</div>

<style>
  /* Modal moderno — mismo patrón que AssetFuelConfigManagement.svelte. */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(11, 11, 11, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 24px;
  }
  .modal-content {
    background: #fff;
    padding: 32px;
    border-radius: 20px;
    width: 380px;
    max-width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0b0b0b;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: #898781;
    cursor: pointer;
  }
  .create-form {
    display: flex;
    flex-direction: column;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: #52514e;
  }
  .field-hint {
    font-size: 10px;
    color: #898781;
  }
  .field input {
    font-family: inherit;
    box-sizing: border-box;
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(11, 11, 11, 0.18);
    border-radius: 12px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
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
  .btn-create {
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
  .btn-create:hover {
    background: #256abf;
  }
  .btn-create:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-message {
    color: #d03b3b;
    font-size: 12px;
    margin: 10px 0 0;
  }
</style>
