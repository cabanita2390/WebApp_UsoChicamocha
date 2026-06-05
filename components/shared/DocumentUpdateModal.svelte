<script>
  import { createEventDispatcher } from 'svelte';

  export let placa = '';
  export let soatVencimiento = null;
  export let tecnoVencimiento = null;
  export let extintorVencimiento = null;
  export let isSubmitting = false;

  const dispatch = createEventDispatcher();

  let tipoDocumento = 'SOAT';
  let fechaVencimiento = '';
  let error = '';
  let archivo = null;

  function toDateInput(raw) {
    if (!raw) return '';
    if (Array.isArray(raw) && raw.length >= 3)
      return `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    if (typeof raw === 'string') {
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    return '';
  }

  function formatDisplay(raw) {
    if (!raw) return 'Sin fecha registrada';
    const s = toDateInput(raw);
    if (!s) return String(raw);
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('es-CO');
  }

  $: currentRaw =
    tipoDocumento === 'SOAT'
      ? soatVencimiento
      : tipoDocumento === 'TECNOMECANICA'
        ? tecnoVencimiento
        : tipoDocumento === 'EXTINTOR'
          ? extintorVencimiento
          : null;

  $: {
    fechaVencimiento =
      tipoDocumento === 'EXTINTOR' && extintorVencimiento
        ? String(extintorVencimiento).slice(0, 7)
        : tipoDocumento === 'TARJETA DE PROPIEDAD'
          ? ''
          : toDateInput(currentRaw);
  }

  $: tipoLabel =
    tipoDocumento === 'SOAT'
      ? 'SOAT'
      : tipoDocumento === 'TECNOMECANICA'
        ? 'Revisión tecnomecánica'
        : tipoDocumento === 'TARJETA DE PROPIEDAD'
          ? 'Tarjeta de propiedad'
          : 'Extintor';

  function handleSubmit() {
    const esTarjeta = tipoDocumento === 'TARJETA DE PROPIEDAD';
    if (!esTarjeta && !fechaVencimiento) {
      error = 'Seleccione una fecha (o mes para extintor).';
      return;
    }
    if (esTarjeta && (!archivo || !archivo.length)) {
      error = 'Seleccione el archivo de la tarjeta de propiedad.';
      return;
    }
    error = '';
    let fechaApi = fechaVencimiento || null;
    if (tipoDocumento === 'EXTINTOR' && fechaVencimiento && fechaVencimiento.length === 7) {
      const [y, m] = fechaVencimiento.split('-').map(Number);
      const last = new Date(y, m, 0).getDate();
      fechaApi = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    }
    const file = archivo && archivo.length ? archivo[0] : null;
    dispatch('submit', { tipoDocumento, fechaVencimiento: fechaApi, file });
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function onTipoChange() {
    archivo = null;
    error = '';
  }

  function filePickLabel(fileList) {
    if (!fileList || fileList.length === 0) return 'Ningún archivo';
    return fileList[0].name;
  }
</script>

<div class="modal-overlay" role="presentation" on:click={handleCancel}>
  <div class="modal-box" role="dialog" aria-modal="true" on:click|stopPropagation>
    <div class="modal-head">
      <h3>Actualizar documentación — {placa}</h3>
      <button type="button" class="modal-close" on:click={handleCancel}>×</button>
    </div>

    <div class="modal-fields">
      <label>
        Documento
        <select bind:value={tipoDocumento} disabled={isSubmitting} on:change={onTipoChange}>
          <option value="SOAT">SOAT</option>
          <option value="TECNOMECANICA">Revisión tecnomecánica</option>
          <option value="TARJETA DE PROPIEDAD">Tarjeta de propiedad</option>
          <option value="EXTINTOR">Extintor</option>
        </select>
      </label>
      {#if tipoDocumento !== 'TARJETA DE PROPIEDAD'}
        <div class="prev-fecha-block">
          <span class="prev-fecha-label">Vencimiento actual ({tipoLabel})</span>
          <span class="prev-fecha-val">{formatDisplay(currentRaw)}</span>
        </div>
      {/if}
      {#if tipoDocumento === 'EXTINTOR'}
        <label>
          Vigencia (mes)
          <input type="month" bind:value={fechaVencimiento} disabled={isSubmitting} />
        </label>
      {:else if tipoDocumento !== 'TARJETA DE PROPIEDAD'}
        <label>
          Nueva fecha de vencimiento
          <input type="date" bind:value={fechaVencimiento} disabled={isSubmitting} />
        </label>
      {/if}
      <label class="file-upload-win file-upload-win--stack" class:file-upload-win--disabled={isSubmitting}>
        <span class="file-upload-win__label">Archivo (PDF, JPEG, PNG o WebP)</span>
        <div class="file-upload-win__row" class:file-upload-win__row--disabled={isSubmitting}>
          <div class="file-upload-win__inner">
            <span class="file-upload-win__name" class:file-upload-win__name--empty={!archivo?.length}>{filePickLabel(archivo)}</span>
            <span class="file-upload-win__btn">Examinar…</span>
          </div>
          <input
            type="file"
            class="file-upload-win__input"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            bind:files={archivo}
            disabled={isSubmitting}
          />
        </div>
      </label>
    </div>

    {#if error}
      <p class="inline-error">{error}</p>
    {/if}

    <div class="modal-foot">
      <button type="button" class="btn-cancel" disabled={isSubmitting} on:click={handleCancel}>Cancelar</button>
      <button type="button" class="btn-save" disabled={isSubmitting} on:click={handleSubmit}>
        {isSubmitting ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 12px;
  }
  .modal-box {
    background: #e0e0e0;
    border: 2px outset #fff;
    min-width: 320px;
    max-width: 460px;
    width: 100%;
    padding: 14px 16px 16px;
    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.25);
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
  }
  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    border-bottom: 1px solid #808080;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .modal-head h3 {
    margin: 0;
    font-size: 12px;
  }
  .modal-close {
    border: none;
    background: transparent;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .modal-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .modal-fields label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: bold;
  }
  .modal-fields select,
  .modal-fields input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .prev-fecha-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: #f5f5f5;
    border: 1px inset #c0c0c0;
  }
  .prev-fecha-label {
    font-size: 10px;
    font-weight: bold;
    color: #404040;
  }
  .prev-fecha-val {
    font-size: 12px;
  }
  .inline-error {
    color: #a00000;
    font-size: 11px;
    margin: 6px 0 0;
    font-weight: bold;
  }
  .modal-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid #a0a0a0;
  }
  .btn-cancel {
    background: #d0d0d0;
    border: 1px outset #fff;
    padding: 4px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
  }
  .btn-save {
    background: #90ee90;
    border: 1px outset #fff;
    padding: 4px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: bold;
  }
  .btn-save:disabled,
  .btn-cancel:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
