<script>
  import { createEventDispatcher } from 'svelte';

  export let messages = [];
  const dispatch = createEventDispatcher();

  function deleteNotification(notificationId) {
    dispatch('delete', notificationId);
  }
</script>

<div class="dropdown-container">
  {#if messages.length === 0}
    <div class="dropdown-item empty">No hay notificaciones</div>
  {:else}
    {#each messages as notification (notification.id)}
      <div class="dropdown-item">
        <span>{notification.text}</span>
        <button class="delete-btn" on:click|stopPropagation={() => deleteNotification(notification.id)} title="Borrar notificación">
          &times;
        </button>
      </div>
    {/each}
  {/if}
</div>

<style>
  .dropdown-container {
    position: absolute;
    top: 50px; 
    right: 10px;
    width: 350px;
    max-height: 400px;
    overflow-y: auto;
    background-color: #f0f0f0;
    border: 1px solid #808080;
    border-top: none;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 200;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
    color: #000;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #c0c0c0;
  }

  .dropdown-item.empty {
    justify-content: center;
    color: #555;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .delete-btn {
    background: none;
    border: 1px solid transparent;
    color: #808080;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    padding: 0 4px;
    line-height: 1;
  }

  .delete-btn:hover {
    color: #000;
    border-color: #000;
  }
</style>
