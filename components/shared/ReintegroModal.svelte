<script>
  import { createEventDispatcher } from "svelte";

  // Reintegrar galones/m³ ya no usados de un tanqueo (Fase 6) — mismo patrón que
  // RefuelingFormModal.svelte: props in, onSubmit async inyectado por el padre
  // (data.createFuelReintegration), eventos success/close.
  export let row; // tanqueo a reintegrar: { id, cantidadGalones, cantidadReintegrada, fechaRegistro }
  export let onSubmit; // async ({ refuelingId, cantidadReintegrada }) => Promise

  const dispatch = createEventDispatcher();

  $: saldoDisponible = Number(row.cantidadGalones) - Number(row.cantidadReintegrada ?? 0);

  let cantidad = "";
  let motivo = "";
  let isSubmitting = false;
  let errorMessage = "";

  function handleClose() {
    dispatch("close");
  }

  function handleKeydown(event) {
    if (event.key === "Escape") handleClose();
  }

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const valor = Number(cantidad);
    if (!valor || valor <= 0) {
      errorMessage = "Ingrese una cantidad mayor a 0.";
      return;
    }
    // Mismo criterio que valida el backend (FuelReintegrationService.registrar) —
    // se replica acá para dar el error sin esperar el viaje al servidor.
    if (valor > saldoDisponible + 0.0001) {
      errorMessage = "La cantidad no puede superar el saldo disponible.";
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      await onSubmit({ refuelingId: row.id, cantidadReintegrada: valor, motivo: motivo.trim() || null });
      dispatch("success");
    } catch (e) {
      errorMessage = e.message || "Error al registrar el reintegro.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" role="presentation" on:click={handleClose}>
  <div class="modal-content" role="dialog" aria-modal="true" aria-label="Reintegrar tanqueo" on:click|stopPropagation>
    <div class="modal-header">
      <h3>Reintegrar tanqueo</h3>
      <button type="button" class="close-btn" on:click={handleClose}>×</button>
    </div>
    <div class="reintegro-info">
      <div class="reintegro-info-row">
        <span>Fecha</span>
        <b>{formatFecha(row.fechaRegistro)}</b>
      </div>
      <div class="reintegro-info-row">
        <span>Cantidad tanqueada</span>
        <b>{row.cantidadGalones}</b>
      </div>
      <div class="reintegro-info-row">
        <span>Ya reintegrado</span>
        <b>{row.cantidadReintegrada ?? 0}</b>
      </div>
      <div class="reintegro-info-row">
        <span>Saldo disponible</span>
        <b>{saldoDisponible}</b>
      </div>
    </div>
    <form aria-label="Reintegrar tanqueo" class="create-form" on:submit={handleSubmit}>
      <label class="field" for="cantidadReintegrada">
        <span class="field-lab">Cantidad a reintegrar</span>
        <input
          id="cantidadReintegrada"
          type="number"
          step="0.001"
          min="0.001"
          max={saldoDisponible}
          bind:value={cantidad}
          required
          disabled={isSubmitting}
        />
      </label>
      <label class="field" for="motivoReintegro">
        <span class="field-lab">Motivo (opcional)</span>
        <textarea
          id="motivoReintegro"
          rows="2"
          placeholder="Ej. sobró combustible, se canceló el turno..."
          bind:value={motivo}
          disabled={isSubmitting}
        ></textarea>
      </label>
      <div class="create-actions">
        <button type="button" class="btn-cancel" on:click={handleClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" class="btn-create" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Reintegrar"}
        </button>
      </div>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
  </div>
</div>

<style>
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
    overflow: auto;
  }
  .modal-content {
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    background: #fff;
    padding: 32px;
    border-radius: 20px;
    width: 420px;
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
  .reintegro-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: #f7f7f6;
    border-radius: 12px;
    margin-bottom: 18px;
  }
  .reintegro-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--ink-secondary);
  }
  .reintegro-info-row b {
    color: var(--ink);
  }
  .create-form {
    display: flex;
    flex-direction: column;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    margin-bottom: 18px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .field input,
  .field textarea {
    font-family: inherit;
    padding: 10px 14px;
    border: 1px solid rgba(11, 11, 11, 0.18);
    border-radius: 12px;
    font-size: 12px;
    box-sizing: border-box;
    width: 100%;
  }
  .field textarea {
    resize: vertical;
    min-height: 44px;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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
