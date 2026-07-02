<script>
  import { createEventDispatcher } from 'svelte';
  import Loader from './Loader.svelte';
  import { formatSubidoPor } from '@/lib/assetUtils.js';

  export let open = false;
  export let plate = '';
  export let loading = false;
  export let history = null;
  export let emptyMessage = 'Sin registros de documentos.';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function formatFechaRegistro(subidoEn) {
    if (!subidoEn) return '—';
    const d = new Date(subidoEn);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
</script>

{#if open}
  <div class="modal-overlay" on:click={close}>
    <div class="modal-content modal-doc-history" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Historial de documentación — {plate ?? ''}</h3>
        <button class="close-btn" on:click={close}>×</button>
      </div>
      {#if loading}
        <div class="doc-history-loader"><Loader /></div>
      {:else if history && history.length > 0}
        <div class="doc-history-table-wrap">
          <table class="doc-history-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Vence</th>
                <th>Estado doc</th>
                <th>Versión</th>
                <th>Registrado</th>
                <th>Por</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {#each history as row}
                <tr class:doc-row-activa={row.vigente} class:doc-row-reemplazada={!row.vigente}>
                  <td>{row.tipoDocumento}</td>
                  <td>{row.fechaVigencia ?? '—'}</td>
                  <td class="doc-estado-cell"
                      class:doc-estado-vigente={row.estadoCalculado === 'Vigente'}
                      class:doc-estado-vencido={row.estadoCalculado === 'Vencido'}
                      class:doc-estado-proximo={row.estadoCalculado === 'Próximo a Vencer'}>
                    {row.estadoCalculado ?? '—'}
                  </td>
                  <td class="doc-version-cell">
                    {#if row.vigente}
                      <span class="badge-activa">Activa</span>
                    {:else}
                      <span class="badge-reemplazada">Reemplazada</span>
                    {/if}
                  </td>
                  <td class="doc-fecha-registro">{formatFechaRegistro(row.subidoEn)}</td>
                  <td class="doc-col-por">{formatSubidoPor(row.subidoPor)}</td>
                  <td>
                    {#if row.urlArchivo}
                      <a href={row.urlArchivo} target="_blank" rel="noopener noreferrer">Ver</a>
                    {:else}
                      —
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if history}
        <p class="doc-history-empty">{emptyMessage}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={close}>Cerrar</button>
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
    box-sizing: border-box;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
  }
  .modal-content.modal-doc-history {
    width: fit-content;
    min-width: min(720px, 96vw);
    max-width: min(96vw, 1200px);
    max-height: min(92vh, 900px);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
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
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-cancel { background: #d0d0d0; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .doc-history-loader {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 0;
  }
  .doc-history-table-wrap {
    flex: 1;
    min-height: 0;
    max-height: min(72vh, 640px);
    overflow: auto;
    border: 1px solid #a0a0a0;
    background: #fff;
    margin-bottom: 4px;
  }
  .doc-history-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .doc-history-table th,
  .doc-history-table td {
    border: 1px solid #c0c0c0;
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }
  .doc-history-table td.doc-col-por {
    white-space: normal;
    max-width: 12rem;
  }
  .doc-history-table th {
    background: #d8d8d8;
    font-weight: bold;
    position: sticky;
    top: 0;
  }
  .doc-row-activa td { background: #f5fff5; }
  .doc-row-reemplazada td { background: #fafafa; color: #707070; }
  .doc-version-cell { white-space: nowrap; }
  .badge-activa {
    display: inline-block;
    padding: 1px 6px;
    background: #1a7a1a;
    color: #fff;
    font-size: 9px;
    font-weight: bold;
    border-radius: 2px;
  }
  .badge-reemplazada {
    display: inline-block;
    padding: 1px 6px;
    background: #909090;
    color: #fff;
    font-size: 9px;
    border-radius: 2px;
  }
  .doc-estado-cell { font-weight: bold; }
  .doc-estado-vigente { color: #1a7a1a; }
  .doc-estado-vencido { color: #b00000; }
  .doc-estado-proximo { color: #b06000; }
  .doc-fecha-registro { white-space: nowrap; font-size: 10px; }
  .doc-history-empty {
    padding: 16px;
    font-size: 11px;
    color: #606060;
    text-align: center;
  }
</style>
