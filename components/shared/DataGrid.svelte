<script>
  import { createEventDispatcher } from "svelte";
  import { writable } from "svelte/store";
  import {
    createSvelteTable,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
  } from "@tanstack/svelte-table";

  export let columns = [];
  export let data = [];

  export let totalPages = 0;
  export let currentPage = 0;
  export let pageSize = 20;
  export let totalElements = 0;
  export let fixedLayout = false;

  const dispatch = createEventDispatcher();

  const globalFilter = writable("");
  let sorting = [];

  $: table = createSvelteTable({
    data,
    columns,
    state: {
      get globalFilter() {
        return $globalFilter;
      },
      sorting,
    },
    onGlobalFilterChange: globalFilter.set,
    onSortingChange: (updater) => {
      sorting = typeof updater === "function" ? updater(sorting) : updater;
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleAction(type, rowData) {
    dispatch("action", { type, data: rowData });
  }

  function handleStatusClick(row, columnDef) {
    dispatch("cellContextMenu", { row, columnDef });
  }

  function handlePageChange(newPage) {
    if (newPage >= 0 && newPage < totalPages) {
      dispatch("pageChange", newPage);
    }
  }

  function handleSizeChange(event) {
    dispatch("sizeChange", Number(event.target.value));
  }

  function getStatusClass(value) {
    const status = String(value || "").toLowerCase();
    if (status.includes("óptimo") || status.includes("optimo"))
      return "status-optimo";
    if (status.includes("regular")) return "status-regular";
    if (status.includes("malo")) return "status-malo";
    return "status-unknown";
  }

  function getDateStatusClass(dateString) {
    if (!dateString || typeof dateString !== "string") return "status-unknown";
    const parts = dateString.split("-");
    let expirationDate;
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      expirationDate = new Date(year, month, 0);
    } else {
      expirationDate = new Date(dateString);
    }
    expirationDate.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    if (expirationDate < today) return "status-malo";
    if (expirationDate <= twoMonthsFromNow) return "status-regular";
    return "status-optimo";
  }

  function getConditionalCellClass(cell) {
    const value = String(cell.getContext().getValue() || "").toLowerCase();
    const meta = cell.column.columnDef.meta;

    if (meta?.isOrigin) {
      if (value.includes("inspección")) return "origin-inspeccion";
      if (value.includes("imprevisto")) return "origin-imprevisto";
    }

    if (meta?.isCondition) {
      if (value.includes("malo")) return "condition-malo";
      if (value.includes("regular")) return "condition-regular";
      if (value.includes("óptimo") || value.includes("optimo"))
        return "condition-optimo";
    }
    return "";
  }
</script>

<div class="data-grid-wrapper">
  <div class="controls-container">
    <div class="filter-group">
      <label for="search-input">Filtrar:</label>
      <input
        id="search-input"
        type="text"
        bind:value={$globalFilter}
        placeholder="Buscar en toda la tabla..."
        class="search-input"
      />
    </div>
  </div>

  <div class="table-container">
    <table class="data-grid" class:fixed={fixedLayout}>
      <thead>
        {#each $table.getHeaderGroups() as headerGroup}
          <tr key={headerGroup.id}>
            {#each headerGroup.headers as header}
              <th
                key={header.id}
                colspan={header.colSpan}
                style:width={fixedLayout
                  ? `${header.column.getSize()}px`
                  : "auto"}
                class:sortable={header.column.getCanSort()}
                on:click={header.column.getToggleSortingHandler()}
                class={header.column.columnDef.meta?.cellClass || ""}
              >
                {#if !header.isPlaceholder}
                  {@const content = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  <div class="header-content">
                    {#if typeof content === "string"}
                      {@html content}
                    {:else}
                      <svelte:component this={content} />
                    {/if}
                    <span class="sort-indicator">
                      {{
                        asc: " ▲",
                        desc: " ▼",
                      }[header.column.getIsSorted()] ?? ""}
                    </span>
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>
      <tbody>
        {#each $table.getRowModel().rows as row}
          <tr
            key={row.id}
            class:unexpected-row={row.original.isUnexpected}
            class:pending-row={row.original.order?.status?.toLowerCase() ===
              "pending"}
          >
            {#each row.getVisibleCells() as cell}
              <td
                key={cell.id}
                class:multiline={cell.column.columnDef.meta?.isMultiline}
                class:status-cell={cell.column.columnDef.meta?.isStatus ||
                  cell.column.columnDef.meta?.isDateStatus}
                class={cell.column.columnDef.meta?.cellClass || ""}
              >
                {#if cell.column.columnDef.meta?.isAction}
                  <div class="actions-cell">
                    <button
                      class="btn-action btn-edit"
                      on:click={() => handleAction("edit", row.original)}
                      >Editar</button
                    >
                    <button
                      class="btn-action btn-delete"
                      on:click={() => handleAction("delete", row.original)}
                      >Eliminar</button
                    >
                  </div>
                {:else if cell.column.columnDef.meta?.isExecuteAction}
                  <div class="actions-cell">
                    {#if row.original.order?.status?.toUpperCase() !== "DONE"}
                      <button
                        class="btn-action btn-execute"
                        on:click={() => handleAction("execute", row.original)}
                        >Ejecutar</button
                      >
                    {:else}
                      <span class="status-text executed">EJECUTADA</span>
                    {/if}
                  </div>
                {:else if cell.column.columnDef.meta?.isCvAction}
                  <div class="actions-cell">
                    <button
                      class="btn-action btn-cv"
                      on:click={() => handleAction("cv", row.original)}
                    >
                      Ver Hoja de Vida
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isImageAction}
                  <div class="actions-cell">
                    <button
                      class="btn-action btn-view-images"
                      on:click={() => handleAction("view_images", row.original)}
                    >
                      Ver
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isOrigin || cell.column.columnDef.meta?.isCondition}
                  {@const cellValue = cell.getContext().getValue()}
                  <span class={getConditionalCellClass(cell)}>{cellValue}</span>
                {:else if cell.column.columnDef.meta?.isStatus || cell.column.columnDef.meta?.isDateStatus}
                  {@const cellValue = cell.getContext().getValue()}
                  {@const colorClass = cell.column.columnDef.meta.isDateStatus
                    ? getDateStatusClass(cellValue)
                    : getStatusClass(cellValue)}
                  <button
                    class="status-btn {colorClass}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {cellValue}
                  </button>
                {:else}
                  <svelte:component
                    this={flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  />
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="footer-controls">
    <span class="record-count">
      Mostrando {$table.getRowModel().rows.length} de {totalElements} registros
    </span>
    <div class="pagination-controls">
      <select on:change={handleSizeChange} value={pageSize}>
        {#each [10, 20, 30, 50, 100, 250] as size}
          <option value={size}>Mostrar {size}</option>
        {/each}
      </select>
      <button on:click={() => handlePageChange(0)} disabled={currentPage === 0}>
        « Primero
      </button>
      <button
        on:click={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        ‹ Anterior
      </button>
      <span>
        Página
        <strong>{totalPages > 0 ? currentPage + 1 : 0} de {totalPages}</strong>
      </span>
      <button
        on:click={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        Siguiente ›
      </button>
      <button
        on:click={() => handlePageChange(totalPages - 1)}
        disabled={currentPage >= totalPages - 1}
      >
        Último »
      </button>
    </div>
  </div>
</div>

<style>
  .btn-cv {
    background-color: #c8e6c9;
    font-weight: bold;
  }

  .btn-view-images {
    background-color: #d1c4e9;
  }

  .data-grid-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .controls-container {
    padding: 12px;
    background: #e0e0e0;
    border: 1px solid #808080;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .search-input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-size: 11px;
    font-family: inherit;
    background-color: #ffffff;
  }
  .table-container {
    flex: 1 1 auto;
    overflow: auto;
    border: 2px inset #c0c0c0;
    border-top: none;
    border-top-color: #808080;
    border-left-color: #808080;
    border-right-color: #dfdfdf;
    border-bottom-color: #dfdfdf;
  }
  .data-grid {
    width: 100%;
    border-collapse: collapse;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    table-layout: auto;
  }
  .data-grid.fixed {
    table-layout: fixed;
  }

  .data-grid.fixed th,
  .data-grid.fixed td {
    white-space: normal;
    word-break: break-word;
  }

  .data-grid th,
  .data-grid td {
    border: 1px solid #c0c0c0;
    border-left: none;
    padding: 6px 8px;
    text-align: left;
    background-color: #ffffff;
    white-space: nowrap;
  }

  .data-grid td.multiline {
    white-space: normal;
    word-break: break-word;
  }

  .data-grid td.status-cell {
    padding: 0;
  }

  .data-grid th {
    background: #c0c0c0;
    font-weight: bold;
    border: 1px outset #303030;
    border-left: none;
    text-align: center;
    vertical-align: middle;
  }
  .unexpected-row td {
    background-color: #ffdddd !important;
  }
  .pending-row td {
    background-color: #fffacd !important;
  }

  th.sortable .header-content {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sort-indicator {
    font-size: 8px;
    margin-left: 4px;
  }
  .actions-cell {
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  .btn-action,
  .status-btn {
    padding: 2px 8px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    margin: 0;
    flex: 1;
    font-family: inherit;
  }
  .btn-edit {
    background-color: #f0f0f0;
  }
  .btn-delete {
    background-color: #ffbaba;
  }

  .btn-execute {
    background-color: #add8e6;
    font-weight: bold;
  }
  .btn-cv {
    background-color: #c8e6c9;
    font-weight: bold;
  }
  .status-btn {
    font-weight: bold;
    color: #000;
    width: 100%;
    height: 100%;
    padding: 6px 8px;
    box-sizing: border-box;
    text-align: center;
  }

  .status-text {
    font-weight: bold;
  }

  .executed {
    color: #2e7d32;
    font-size: 10px;
    text-align: center;
    display: block;
    width: 100%;
  }

  .origin-inspeccion,
  .condition-regular {
    color: #e65100;
  }
  .origin-imprevisto,
  .condition-malo {
    color: #b71c1c;
  }
  .condition-optimo {
    color: #2e7d32;
  }

  .status-optimo {
    background-color: #91c483;
  }
  .status-regular {
    background-color: #ffe162;
  }
  .status-malo {
    background-color: #ff6464;
  }
  .status-unknown {
    background-color: #e0e0e0;
  }

  .footer-controls {
    padding: 8px 12px;
    background: #e0e0e0;
    border: 1px solid #808080;
    border-top: 1px solid #c0c0c0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .record-count,
  .pagination-controls {
    font-size: 11px;
  }
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pagination-controls button,
  .pagination-controls select {
    padding: 2px 8px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    background-color: #f0f0f0;
    font-family: inherit;
  }
  .pagination-controls button:disabled {
    cursor: not-allowed;
    color: #808080;
  }

  :global(th.motor-oil-cell),
  :global(td.motor-oil-cell) {
    background-color: #e0f7fa !important;
  }
  :global(th.hydraulic-oil-cell),
  :global(td.hydraulic-oil-cell) {
    background-color: #e8f5e9 !important;
  }
</style>
