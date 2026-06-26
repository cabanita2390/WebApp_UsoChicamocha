<script>
  import { createEventDispatcher } from 'svelte';

  // --- PROPS ---
  export let rowData = null;
  // CORRECCIÓN: Se simplifica, ahora solo se usa 'columnDef'.
  export let columnDef = null;
  export let currentUser = '';
  
  const dispatch = createEventDispatcher();

  // --- LÓGICA DE FECHA PARA EL EXTINTOR ---
  function getExtintorStatus(dateString) {
    if (!dateString || typeof dateString !== "string") return "N/A";
    const expirationDate = new Date(dateString);
    expirationDate.setUTCHours(12);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    if (expirationDate < today) return "Malo";
    if (expirationDate <= twoMonthsFromNow) return "Regular";
    return "Óptimo";
  }

  // --- DERIVED STATE ---
  let cleanColumnHeader = '';
  $: if (columnDef && columnDef.header) {
    cleanColumnHeader = String(columnDef.header).replace(/<br>/g, ' ');
  } else {
    cleanColumnHeader = 'N/A';
  }

  let machineFullName = '';
  $: if (rowData && rowData.machine) {
    machineFullName = `${rowData.machine.name || ''} ${rowData.machine.brand || ''} ${rowData.machine.numInterIdentification || ''}`.trim();
  } else {
    machineFullName = 'No especificada';
  }

  let currentStatus;
  $: {
    if (!rowData || !columnDef) {
      currentStatus = 'Desconocido';
    } else {
      const accessorKey = columnDef.accessorKey;
      if (accessorKey === 'expirationDateFireExtinguisher') {
          currentStatus = getExtintorStatus(rowData.expirationDateFireExtinguisher);
      } else {
          currentStatus = rowData[accessorKey] ?? 'Desconocido';
      }
    }
  }

  // --- LOCAL STATE ---
  let workOrderForm = {
    asignadoA: '',
    detalles: '',
  };
  let showConfirmation = false;
  
  // --- FUNCTIONS ---
  function getStatusClass(status) {
    switch(status) {
      case 'Óptimo': return 'status-optimo';
      case 'Regular': return 'status-regular';
      case 'Malo': return 'status-malo';
      default: return 'status-unknown';
    }
  }
  
  function handleSubmit(event) {
    event.preventDefault();
    showConfirmation = true;
  }
  
  function confirmCreate() {
    const inspectionType = rowData.isUnexpected ? 'Imprevisto' : 'Inspección';
    const description = [
      inspectionType,
      cleanColumnHeader,
      currentStatus,
      workOrderForm.detalles,
      workOrderForm.asignadoA
    ].join('|');

    dispatch('createWorkOrder', {
      inspectionId: rowData.id,
      description: description,
    });

    showConfirmation = false;
  }
  
  function cancelCreate() {
    showConfirmation = false;
  }

  function onCancel() {
      dispatch('cancel');
  }
</script>

<div class="modal-overlay" on:keydown={(e) => e.key === 'Escape' && onCancel()}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2>Crear Orden de Trabajo</h2>
      <button class="close-btn" on:click={onCancel}>×</button>
    </div>
    
    <div class="modal-body">
      <div class="info-panel">
        <div class="info-panel-header">Panel Informativo</div>
        <div class="info-panel-body">
          <p><strong>Máquina:</strong> {machineFullName}</p>
          <p><strong>Área afectada:</strong> {cleanColumnHeader}</p>
          <p><strong>Estado del área afectada:</strong> <span class="status-badge {getStatusClass(currentStatus)}">{currentStatus}</span></p>
          <p><strong>Asignado por:</strong> {currentUser}</p>
        </div>
      </div>
      
      <form class="work-order-form" on:submit={handleSubmit}>
        <div class="form-group full-width">
          <label for="detalles">Detalles de la Orden de Trabajo:</label>
          <textarea bind:value={workOrderForm.detalles} id="detalles" rows="6" 
                    placeholder="Describa en detalle el trabajo a realizar, los procedimientos y las precauciones necesarias..."></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="asignadoA">Asignar Tarea A:</label>
            <input type="text" bind:value={workOrderForm.asignadoA} id="asignadoA" placeholder="Nombre del técnico o equipo" required />
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
        <p><strong>Máquina:</strong> {machineFullName}</p>
        <p><strong>Componente:</strong> {cleanColumnHeader}</p>
        <p><strong>Estado:</strong> <span class="status-badge {getStatusClass(currentStatus)}">{currentStatus}</span></p>
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
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  }
  
  .modal-content {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px outset #c0c0c0;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(to bottom, #c0c0c0 0%, #a0a0a0 100%);
    border-bottom: 1px inset #c0c0c0;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #000000;
    font-size: 12px;
    font-weight: bold;
  }
  
  .close-btn {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    font-size: 12px;
    cursor: pointer;
    color: #000000;
    padding: 2px 6px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:active {
    border: 1px inset #c0c0c0;
  }
  
  .modal-body {
    padding: 16px;
  }

  .info-panel {
    border: 1px inset #c0c0c0;
    background-color: #f8f8f8;
    margin-bottom: 16px;
  }

  .info-panel-header {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    padding: 6px 10px;
    font-weight: bold;
    border-bottom: 1px solid #a0a0a0;
  }

  .info-panel-body {
    padding: 10px;
  }

  .info-panel-body p {
    margin: 0 0 8px 0;
    font-size: 10px;
  }

  .info-panel-body p:last-child {
    margin-bottom: 0;
  }
  
  .status-badge {
    padding: 2px 6px;
    border: 1px inset #c0c0c0;
    font-size: 9px;
    font-weight: bold;
    border-radius: 2px;
  }
  
  .status-optimo {
    background-color: #90EE90;
    color: #000000;
  }
  
  .status-regular {
    background-color: #FFD700;
    color: #000000;
  }
  
  .status-malo {
    background-color: #FF6B6B;
    color: #000000;
  }
  
  .status-unknown {
    background-color: #D3D3D3;
    color: #000000;
  }
  
  .status-message {
    font-style: italic;
    color: #404040;
  }
  
  .work-order-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .form-row {
    display: flex;
    gap: 12px;
  }
  
  .form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .form-group.full-width {
    width: 100%;
  }
  
  .form-group label {
    margin-bottom: 4px;
    font-weight: bold;
    color: #000000;
    font-size: 10px;
  }
  
  .priority-hint {
    font-size: 9px;
    color: #606060;
    font-style: italic;
    margin-top: 2px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-size: 10px;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    background-color: #ffffff;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: 1px dotted #000000;
  }
  
  .form-group input[readonly] {
    background-color: #f0f0f0;
    color: #404040;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
    border-top: 1px inset #c0c0c0;
  }
  
  .btn-cancel,
  .btn-create {
    padding: 6px 12px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    color: #000000;
  }
  
  .btn-cancel:hover,
  .btn-create:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
  
  .btn-cancel:active,
  .btn-create:active {
    border: 1px inset #c0c0c0;
    background: linear-gradient(to bottom, #c0c0c0 0%, #e0e0e0 100%);
  }
  
  .confirmation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  }
  
  .confirmation-modal {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px outset #c0c0c0;
    padding: 20px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
  }
  
  .confirmation-modal h3 {
    margin: 0 0 12px 0;
    color: #000000;
    font-size: 12px;
    font-weight: bold;
  }
  
  .confirmation-details {
    background-color: #f8f8f8;
    padding: 12px;
    border: 1px inset #c0c0c0;
    margin: 12px 0;
    text-align: left;
  }
  
  .confirmation-details p {
    margin: 4px 0;
    color: #000000;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .confirmation-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
  }
  
  .btn-confirm {
    background: linear-gradient(to bottom, #90EE90 0%, #70CC70 100%);
    color: #000000;
    padding: 6px 12px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
  }
  
  .btn-confirm:hover {
    background: linear-gradient(to bottom, #A0FFA0 0%, #80DD80 100%);
  }
  
  .btn-confirm:active {
    border: 1px inset #c0c0c0;
    background: linear-gradient(to bottom, #70CC70 0%, #90EE90 100%);
  }
</style>

