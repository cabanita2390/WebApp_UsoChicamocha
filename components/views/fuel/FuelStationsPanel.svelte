<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { data as dataStore } from '../../../stores/data.js';
  import Loader from '../../shared/Loader.svelte';

  export let isAdmin = false;

  const dispatch = createEventDispatcher();

  let stationsData = [];
  let stationsLoading = false;
  let stationNewName = '';
  let stationEditId = null;
  let stationEditName = '';
  let stationActionLoading = null;

  async function loadStations() {
    if (stationsLoading) return;
    stationsLoading = true;
    try {
      stationsData = await dataStore.fetchFuelStations();
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      stationsLoading = false;
    }
  }

  async function handleCreateStation() {
    if (!stationNewName.trim()) return;
    stationActionLoading = 'new';
    try {
      await dataStore.createFuelStation(stationNewName.trim());
      stationNewName = '';
      await loadStations();
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      stationActionLoading = null;
    }
  }

  async function handleUpdateStation(id) {
    if (!stationEditName.trim()) return;
    stationActionLoading = id;
    try {
      await dataStore.updateFuelStation(id, stationEditName.trim());
      stationEditId = null;
      stationEditName = '';
      await loadStations();
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      stationActionLoading = null;
    }
  }

  async function handleDeleteStation(id) {
    stationActionLoading = id;
    try {
      await dataStore.deleteFuelStation(id);
      await loadStations();
    } catch (e) {
      dispatch('error', e.message);
    } finally {
      stationActionLoading = null;
    }
  }

  onMount(loadStations);
</script>

{#if stationsLoading && stationsData.length === 0}
  <div class="loader-container"><Loader /><p>Cargando estaciones...</p></div>
{:else}
  <div class="stations-header">
    <input
      type="text"
      bind:value={stationNewName}
      placeholder="Nombre de la nueva estación"
      style="padding:3px 6px;border:1px inset #808080;font-size:11px;font-family:inherit;width:220px"
      on:keydown={e => e.key === 'Enter' && handleCreateStation()}
    />
    <button class="btn btn-primary"
      disabled={!stationNewName.trim() || stationActionLoading === 'new'}
      on:click={handleCreateStation}>
      {stationActionLoading === 'new' ? '...' : '+ Agregar'}
    </button>
  </div>

  {#if stationsData.length === 0}
    <div class="empty-msg">No hay estaciones registradas. Agrega la primera arriba.</div>
  {:else}
    <table class="stations-table">
      <thead>
        <tr><th>#</th><th>Nombre</th><th>Acciones</th></tr>
      </thead>
      <tbody>
        {#each stationsData as s, i}
          <tr>
            <td style="width:40px;text-align:center">{i + 1}</td>
            <td>
              {#if stationEditId === s.id}
                <input class="station-edit-input" type="text" bind:value={stationEditName}
                  on:keydown={e => e.key === 'Enter' && handleUpdateStation(s.id)} />
              {:else}
                {s.name}
              {/if}
            </td>
            <td style="white-space:nowrap">
              {#if stationEditId === s.id}
                <button class="station-action-btn"
                  disabled={stationActionLoading === s.id}
                  on:click={() => handleUpdateStation(s.id)}>
                  {stationActionLoading === s.id ? '...' : '✓ Guardar'}
                </button>
                &nbsp;
                <button class="station-action-btn" on:click={() => { stationEditId = null; stationEditName = ''; }}>
                  Cancelar
                </button>
              {:else}
                <button class="station-action-btn"
                  on:click={() => { stationEditId = s.id; stationEditName = s.name; }}>
                  Editar
                </button>
                {#if isAdmin}
                &nbsp;
                <button class="station-action-btn station-del-btn"
                  disabled={stationActionLoading === s.id}
                  on:click={() => handleDeleteStation(s.id)}>
                  {stationActionLoading === s.id ? '...' : '✕ Eliminar'}
                </button>
                {/if}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/if}

<style>
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }
  .stations-header { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
  .stations-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .stations-table th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 5px 10px; text-align: center; }
  .stations-table td { border: 1px solid #c0c0c0; border-left: none; padding: 5px 10px; background: #fff; }
  .stations-table tr:nth-child(even) td { background: #f4f4f4; }
  .station-action-btn { padding: 2px 8px; font-size: 10px; font-family: inherit; border: 1px outset #c0c0c0; cursor: pointer; background: linear-gradient(to bottom, #f0f0f0,#d0d0d0); }
  .station-del-btn { color: #8c1a1a; }
  .station-edit-input { padding: 3px 5px; border: 1px inset #808080; font-size: 11px; font-family: inherit; width: 200px; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
</style>
