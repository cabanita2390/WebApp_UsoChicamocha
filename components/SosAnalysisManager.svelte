<script>
  import { onDestroy } from 'svelte';
  import { improvedOilChangeStore } from '../stores/improvedOilChange';
  import { data } from '../stores/data';

  let selectedMachine = null;
  let hoursAtAnalysis = '';
  let nextChangeHours = '';
  let sosReportUrl = '';
  let approvedByMechanic = '';
  let observations = '';

  let $sosAnalyses;
  let $sosPending;
  let $loading;
  let $error;
  let $success;
  let $machines = [];

  const unsubscribeSos = improvedOilChangeStore.sosAnalyses.subscribe(v => {
    $sosAnalyses = v;
  });

  const unsubscribePending = improvedOilChangeStore.sosPending.subscribe(v => {
    $sosPending = v;
  });

  const unsubscribeLoading = improvedOilChangeStore.loading.subscribe(v => {
    $loading = v;
  });

  const unsubscribeError = improvedOilChangeStore.error.subscribe(v => {
    $error = v;
  });

  const unsubscribeSuccess = improvedOilChangeStore.success.subscribe(v => {
    $success = v;
  });

  const unsubscribeMachines = data.subscribe(d => {
    $machines = d.machines || [];
  });

  onDestroy(() => {
    unsubscribeSos();
    unsubscribePending();
    unsubscribeLoading();
    unsubscribeError();
    unsubscribeSuccess();
    unsubscribeMachines();
  });

  async function handleSubmitSos() {
    if (!selectedMachine || !hoursAtAnalysis || !nextChangeHours || !sosReportUrl || !approvedByMechanic) {
      improvedOilChangeStore.error.set('Complete todos los campos requeridos');
      return;
    }

    try {
      await improvedOilChangeStore.createSosAnalysis({
        machineId: selectedMachine.id,
        machineName: selectedMachine.marca || `Máquina ${selectedMachine.id}`,
        oilType: 'SYNTHETIC',
        hoursAtAnalysis: parseInt(hoursAtAnalysis),
        nextChangeHours: parseInt(nextChangeHours),
        sosReportUrl: sosReportUrl,
        approvedByMechanic: approvedByMechanic,
        observations: observations
      });

      // Reset form
      hoursAtAnalysis = '';
      nextChangeHours = '';
      sosReportUrl = '';
      approvedByMechanic = '';
      observations = '';

      setTimeout(() => improvedOilChangeStore.clearMessages(), 3000);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function handleApprove(sosId) {
    try {
      await improvedOilChangeStore.approveSosAnalysis(sosId);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function getExtensionStatus(analysis) {
    if (!analysis.authorizesExtension) {
      return `⚠️ Requiere cambio en ${analysis.nextChangeHours} hrs`;
    }
    return `✅ Extensión autorizada: +${analysis.extendedHours} hrs`;
  }

  function clearMessages() {
    improvedOilChangeStore.clearMessages();
  }
</script>

<div class="sos-manager">
  <div class="section">
    <h3>🔬 Crear Análisis SOS (Scheduled Oil Sampling)</h3>

    {#if $error}
      <div class="alert alert-error">
        {$error}
        <button on:click={clearMessages}>×</button>
      </div>
    {/if}

    {#if $success}
      <div class="alert alert-success">
        {$success}
        <button on:click={clearMessages}>×</button>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmitSos}>
      <div class="form-group">
        <label for="machine">Máquina *</label>
        <select bind:value={selectedMachine} id="machine" required disabled={$loading}>
          <option value={null}>Seleccionar...</option>
          {#each $machines as machine}
            <option value={machine}>
              {machine.marca || `Máquina ${machine.id}`}
            </option>
          {/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="hours">Horas en Análisis *</label>
          <input
            type="number"
            id="hours"
            bind:value={hoursAtAnalysis}
            min="0"
            required
            disabled={$loading}
          />
        </div>

        <div class="form-group">
          <label for="nextHours">Próximo Cambio Recomendado (hrs) *</label>
          <input
            type="number"
            id="nextHours"
            bind:value={nextChangeHours}
            min="0"
            required
            disabled={$loading}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="reportUrl">URL del Reporte SOS *</label>
        <input
          type="url"
          id="reportUrl"
          bind:value={sosReportUrl}
          placeholder="https://..."
          required
          disabled={$loading}
        />
      </div>

      <div class="form-group">
        <label for="mechanic">Mecánico Aprobador *</label>
        <input
          type="text"
          id="mechanic"
          bind:value={approvedByMechanic}
          placeholder="Nombre del mecánico"
          required
          disabled={$loading}
        />
      </div>

      <div class="form-group">
        <label for="observations">Observaciones</label>
        <textarea
          id="observations"
          bind:value={observations}
          rows="3"
          placeholder="Detalles del análisis..."
          disabled={$loading}
        ></textarea>
      </div>

      <button type="submit" disabled={$loading} class="btn btn-primary">
        {$loading ? '⏳ Guardando...' : '💾 Crear Análisis'}
      </button>
    </form>
  </div>

  <!-- Análisis Pendientes -->
  {#if $sosPending && $sosPending.length > 0}
    <div class="section">
      <h3>⏳ Análisis Pendientes de Aprobación</h3>
      <div class="list">
        {#each $sosPending as analysis}
          <div class="item pending">
            <div class="item-header">
              <h4>
                Máquina {analysis.machineId} - {analysis.machineName}
              </h4>
              <span class="badge">PENDIENTE</span>
            </div>

            <div class="item-body">
              <p><strong>Tipo de Aceite:</strong> {analysis.oilType}</p>
              <p><strong>Horas al Análisis:</strong> {analysis.hoursAtAnalysis}</p>
              <p><strong>Próximo Cambio Recomendado:</strong> {analysis.nextChangeHours} hrs</p>
              <p><strong>Aprobado por Mecánico:</strong> {analysis.approvedByMechanic}</p>
              {#if analysis.observations}
                <p><strong>Observaciones:</strong> {analysis.observations}</p>
              {/if}
              <a href={analysis.sosReportUrl} target="_blank" rel="noopener">
                📄 Ver Reporte SOS
              </a>
            </div>

            <div class="item-footer">
              <button
                on:click={() => handleApprove(analysis.id)}
                disabled={$loading}
                class="btn btn-success"
              >
                {$loading ? '⏳' : '✅'} Aprobar
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Análisis Aprobados -->
  {#if $sosAnalyses && $sosAnalyses.filter(a => a.isApproved).length > 0}
    <div class="section">
      <h3>✅ Análisis Aprobados</h3>
      <div class="list">
        {#each $sosAnalyses.filter(a => a.isApproved) as analysis}
          <div class="item approved">
            <div class="item-header">
              <h4>
                Máquina {analysis.machineId} - {analysis.machineName}
              </h4>
              <span class="badge success">{getExtensionStatus(analysis)}</span>
            </div>

            <div class="item-body">
              <p><strong>Tipo de Aceite:</strong> {analysis.oilType}</p>
              <p><strong>Horas al Análisis:</strong> {analysis.hoursAtAnalysis}</p>
              <p><strong>Próximo Cambio:</strong> {analysis.nextChangeHours} hrs</p>
              {#if analysis.authorizesExtension}
                <p class="extension">
                  🔄 Se autoriza extensión de {analysis.extendedHours} horas
                </p>
              {/if}
              <p><strong>Aprobado por:</strong> {analysis.approvedByMechanic}</p>
            </div>

            <div class="item-footer">
              <small>{new Date(analysis.createdAt).toLocaleDateString()}</small>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .sos-manager {
    padding: 20px;
  }

  .section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
  }

  .section h3 {
    margin-top: 0;
    color: #333;
  }

  .alert {
    padding: 12px;
    margin-bottom: 16px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .alert-error {
    background-color: #fee;
    color: #c33;
    border: 1px solid #fcc;
  }

  .alert-success {
    background-color: #efe;
    color: #3c3;
    border: 1px solid #cfc;
  }

  .alert button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  label {
    font-weight: 500;
    margin-bottom: 6px;
    color: #555;
  }

  input,
  select,
  textarea {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .item {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
  }

  .item.pending {
    border-left: 4px solid #fbc02d;
    background: linear-gradient(to right, rgba(251, 192, 45, 0.05), white);
  }

  .item.approved {
    border-left: 4px solid #388e3c;
    background: linear-gradient(to right, rgba(56, 142, 60, 0.05), white);
  }

  .item-header {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.02);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .item-header h4 {
    margin: 0;
    color: #333;
    font-size: 16px;
  }

  .badge {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 12px;
    background: #fbc02d;
    color: white;
  }

  .badge.success {
    background: #388e3c;
  }

  .item-body {
    padding: 16px;
  }

  .item-body p {
    margin: 8px 0;
    color: #666;
    font-size: 14px;
  }

  .item-body a {
    display: inline-block;
    margin-top: 12px;
    color: #0066cc;
    text-decoration: none;
  }

  .item-body a:hover {
    text-decoration: underline;
  }

  .extension {
    padding: 8px;
    background: #e8f5e9;
    border-left: 3px solid #388e3c;
    color: #1b5e20;
    font-weight: 500;
  }

  .item-footer {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.02);
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-footer small {
    color: #999;
  }

  .btn {
    padding: 10px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #0066cc;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0052a3;
  }

  .btn-success {
    background-color: #388e3c;
    color: white;
    padding: 8px 12px;
    font-size: 13px;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #2e7d32;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .item-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>
