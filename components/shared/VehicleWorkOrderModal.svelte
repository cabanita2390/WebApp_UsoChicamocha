<script>
  import { createEventDispatcher } from 'svelte';

  export let rowData = null;
  export let columnDef = null;
  export let currentUser = '';

  const dispatch = createEventDispatcher();

  let cleanColumnHeader = '';
  $: cleanColumnHeader = columnDef?.header
    ? String(columnDef.header).replace(/<br>/g, ' ')
    : 'N/A';

  let vehicleLabel = '';
  $: vehicleLabel = rowData
    ? [rowData.placa, rowData.marca, rowData.tipoVehiculo].filter(Boolean).join(' — ')
    : 'No especificado';

  let currentStatus = 'Desconocido';
  $: {
    if (!rowData || !columnDef) {
      currentStatus = 'Desconocido';
    } else if (columnDef.accessorKey) {
      currentStatus = rowData[columnDef.accessorKey] ?? 'Desconocido';
    } else if (typeof columnDef.accessorFn === 'function') {
      try { currentStatus = columnDef.accessorFn(rowData) ?? 'Desconocido'; }
      catch { currentStatus = 'Desconocido'; }
    }
  }

  let workOrderForm = { asignadoA: '', detalles: '', orderType: '', maintenanceType: '', maintenanceCategory: '' };
  let showConfirmation = false;

  function getStatusClass(status) {
    const raw = String(status ?? '').trim();
    if (!raw) return 'status-unknown';
    const s = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    if (s.includes(',') && /\bsi\b/.test(s) && /\bno\b/.test(s)) {
      return 'status-regular';
    }
    if (s === 'si' || s === 'sí') return 'status-optimo';
    if (s === 'no') return 'status-malo';
    if (s === 'n/a' || s === 'na') return 'status-unknown';

    if (
      s.includes('optimo') ||
      s.includes('optima') ||
      s.includes('vigente') ||
      s === 'ok' ||
      s.includes('bueno') ||
      s.includes('excelente')
    ) {
      return 'status-optimo';
    }
    if (
      s.includes('regular') ||
      s.includes('proximo') ||
      s.includes('medio')
    ) {
      return 'status-regular';
    }
    if (
      s.includes('malo') ||
      s.includes('vencido') ||
      (s.includes('cambio') && !s.includes('sin cambio'))
    ) {
      return 'status-malo';
    }
    return 'status-unknown';
  }

  function handleSubmit(e) { e.preventDefault(); showConfirmation = true; }
  function cancelCreate() { showConfirmation = false; }

  function confirmCreate() {
    const description = [
      'Inspección',
      cleanColumnHeader,
      currentStatus,
      workOrderForm.detalles,
      workOrderForm.asignadoA,
    ].join('|');

    dispatch('createVehicleOrder', {
      vehicleInspectionId: rowData.idInspeccion,
      description,
      orderType: workOrderForm.orderType || null,
      maintenanceType: workOrderForm.maintenanceType || null,
      maintenanceCategory: workOrderForm.maintenanceCategory || null,
    });
    showConfirmation = false;
  }

  function onCancel() { dispatch('cancel'); }
</script>

<div class="modal-overlay" on:keydown={(e) => e.key === 'Escape' && onCancel()}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2>Crear Orden de Trabajo — Vehículo</h2>
      <button class="close-btn" on:click={onCancel}>×</button>
    </div>

    <div class="modal-body">
      <div class="info-panel">
        <div class="info-panel-header">Panel Informativo</div>
        <div class="info-panel-body">
          <p><strong>Vehículo:</strong> {vehicleLabel}</p>
          <p><strong>Área afectada:</strong> {cleanColumnHeader}</p>
          <p><strong>Estado del área afectada:</strong>
            <span class="status-badge {getStatusClass(currentStatus)}">{currentStatus}</span>
          </p>
          <p><strong>Asignado por:</strong> {currentUser}</p>
        </div>
      </div>

      <form class="work-order-form" on:submit={handleSubmit}>
        <div class="form-row">
          <div class="form-group">
            <label for="maintenanceType">Especialidad Técnica (opcional):</label>
            <select bind:value={workOrderForm.maintenanceType} id="maintenanceType">
              <option value="">— Sin especificar —</option>
              <option value="MECANICO">Mecánico</option>
              <option value="ELECTRICO">Eléctrico</option>
              <option value="ESTRUCTURAL">Estructural</option>
            </select>
          </div>
          <div class="form-group">
            <label for="maintenanceCategory">Tipo de Mantenimiento (opcional):</label>
            <select bind:value={workOrderForm.maintenanceCategory} id="maintenanceCategory">
              <option value="">— Sin especificar —</option>
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
            </select>
          </div>
        </div>
        <div class="form-group full-width">
          <label for="detalles">Detalles de la Orden de Trabajo:</label>
          <textarea
            bind:value={workOrderForm.detalles}
            id="detalles"
            rows="6"
            placeholder="Describa en detalle el trabajo a realizar..."
          ></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="asignadoA">Asignar Tarea A:</label>
            <input
              type="text"
              bind:value={workOrderForm.asignadoA}
              id="asignadoA"
              placeholder="Nombre del técnico o equipo"
              required
            />
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" on:click={onCancel}>Cancelar</button>
      <button class="btn-create" on:click={handleSubmit}>Crear Orden de Trabajo</button>
    </div>
  </div>
</div>

{#if showConfirmation}
  <div class="confirmation-overlay" on:click={cancelCreate}>
    <div class="confirmation-modal" on:click|stopPropagation>
      <h3>Confirmar Creación</h3>
      <p>¿Está seguro que desea crear esta orden de trabajo?</p>
      <div class="confirmation-details">
        <p><strong>Vehículo:</strong> {vehicleLabel}</p>
        <p><strong>Componente:</strong> {cleanColumnHeader}</p>
        <p><strong>Estado:</strong>
          <span class="status-badge {getStatusClass(currentStatus)}">{currentStatus}</span>
        </p>
        <p><strong>Asignado a:</strong> {workOrderForm.asignadoA}</p>
      </div>
      <div class="confirmation-buttons">
        <button class="btn-cancel" on:click={cancelCreate}>Cancelar</button>
        <button class="btn-confirm" on:click={confirmCreate}>Aceptar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex; justify-content: center; align-items: center; z-index: 2000;
  }
  .modal-content {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px outset #c0c0c0; width: 90%; max-width: 700px;
    max-height: 90vh; overflow-y: auto;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif; font-size: 11px;
  }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px;
    background: linear-gradient(to bottom, #c0c0c0 0%, #a0a0a0 100%);
    border-bottom: 1px inset #c0c0c0;
  }
  .modal-header h2 { margin: 0; color: #000; font-size: 12px; font-weight: bold; }
  .close-btn {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0; font-size: 12px; cursor: pointer;
    color: #000; padding: 2px 6px; width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
  }
  .close-btn:active { border: 1px inset #c0c0c0; }
  .modal-body { padding: 16px; }
  .info-panel { border: 1px inset #c0c0c0; background-color: #f8f8f8; margin-bottom: 16px; }
  .info-panel-header {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    padding: 6px 10px; font-weight: bold; border-bottom: 1px solid #a0a0a0;
  }
  .info-panel-body { padding: 10px; }
  .info-panel-body p { margin: 0 0 8px 0; font-size: 10px; }
  .info-panel-body p:last-child { margin-bottom: 0; }
  .status-badge {
    padding: 2px 6px; border: 1px inset #c0c0c0; font-size: 9px;
    font-weight: bold; border-radius: 2px;
  }
  .status-optimo { background-color: #90EE90; color: #000; }
  .status-regular { background-color: #FFD700; color: #000; }
  .status-malo { background-color: #FF6B6B; color: #000; }
  .status-unknown { background-color: #D3D3D3; color: #000; }
  .work-order-form { display: flex; flex-direction: column; gap: 12px; }
  .form-row { display: flex; gap: 12px; }
  .form-group { flex: 1; display: flex; flex-direction: column; }
  .form-group.full-width { width: 100%; }
  .form-group label { margin-bottom: 4px; font-weight: bold; color: #000; font-size: 10px; }
  .form-group input, .form-group select, .form-group textarea {
    padding: 4px 6px; border: 1px inset #c0c0c0; font-size: 10px;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif; background-color: #fff;
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: 1px dotted #000; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
    border-top: 1px inset #c0c0c0;
  }
  .btn-cancel, .btn-create {
    padding: 6px 12px; border: 1px outset #c0c0c0; cursor: pointer;
    font-size: 10px; font-weight: bold;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%); color: #000;
  }
  .btn-cancel:active, .btn-create:active { border: 1px inset #c0c0c0; }
  .confirmation-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.7);
    display: flex; justify-content: center; align-items: center; z-index: 3000;
  }
  .confirmation-modal {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px outset #c0c0c0; padding: 20px; max-width: 400px; width: 90%;
    text-align: center; font-family: 'MS Sans Serif', 'Tahoma', sans-serif; font-size: 11px;
  }
  .confirmation-modal h3 { margin: 0 0 12px; color: #000; font-size: 12px; font-weight: bold; }
  .confirmation-details {
    background-color: #f8f8f8; padding: 12px; border: 1px inset #c0c0c0;
    margin: 12px 0; text-align: left;
  }
  .confirmation-details p { margin: 4px 0; color: #000; font-size: 10px; }
  .confirmation-buttons { display: flex; justify-content: center; gap: 12px; margin-top: 16px; }
  .btn-confirm {
    background: linear-gradient(to bottom, #90EE90 0%, #70CC70 100%); color: #000;
    padding: 6px 12px; border: 1px outset #c0c0c0; cursor: pointer;
    font-size: 10px; font-weight: bold; font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
  }
  .btn-confirm:active { border: 1px inset #c0c0c0; }
</style>
