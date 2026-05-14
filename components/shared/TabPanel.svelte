<script>
  import { createEventDispatcher } from 'svelte';

  /** @type {{ id: string; label: string }[]} */
  export let tabs = [];
  export let activeTab = '';

  const dispatch = createEventDispatcher();

  function switchTab(id) {
    activeTab = id;
    dispatch('tabChange', id);
  }
</script>

<div class="tab-panel">
  <div class="tab-bar" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.id}
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => switchTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content" role="tabpanel">
    <slot {activeTab} />
  </div>
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    padding: 4px 8px 0 8px;
    background: linear-gradient(to bottom, #d0d0d0 0%, #c0c0c0 100%);
    border-bottom: 2px inset #c0c0c0;
    flex-shrink: 0;
  }

  .tab-btn {
    padding: 4px 14px 5px;
    background: linear-gradient(to bottom, #d8d8d8 0%, #c0c0c0 100%);
    border: 1px solid #888;
    border-bottom: none;
    cursor: pointer;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
    font-weight: bold;
    color: #404040;
    position: relative;
    bottom: -1px;
    outline: none;
  }

  .tab-btn:hover:not(.active) {
    background: linear-gradient(to bottom, #ececec 0%, #d4d4d4 100%);
    color: #000;
  }

  .tab-btn.active {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e8e8e8 100%);
    border-color: #808080;
    border-bottom: 2px solid #e8e8e8;
    color: #000;
    z-index: 1;
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #e8e8e8;
  }
</style>
