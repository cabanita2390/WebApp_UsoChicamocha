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
  import { getFileUrl } from "../../stores/api";

  export let columns = [];
  export let data = [];

  export let totalPages = 0;
  export let currentPage = 0;
  export let pageSize = 20;
  export let totalElements = 0;
  export let fixedLayout = false;
  /** Si es false, se oculta el pie de paginación (listas cargadas de una vez). */
  export let showPagination = true;
  /** Controla si se muestran los botones de eliminación en las acciones */
  export let showDeleteButton = true;

  const dispatch = createEventDispatcher();

  const globalFilter = writable("");
  let sorting = [];

  /** Evita fallos de TanStack / Svelte si el padre pasa un objeto o undefined. */
  $: tableData = Array.isArray(data) ? data : [];

  $: table = createSvelteTable({
    data: tableData,
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

  /** Semáforo textual: Bueno/Vigente/SÍ, Regular/Próximo a vencer, Malo/Vencido/NO, mixtos (advertencia). */
  function getStatusClass(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "status-unknown";
    const status = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (status.includes(",") && /\bsi\b/.test(status) && /\bno\b/.test(status)) {
      return "status-regular";
    }
    if (status === "si" || status === "sí") return "status-optimo";
    if (status === "no") return "status-malo";
    if (status === "n/a" || status === "na") return "status-unknown";

    if (
      status.includes("optimo") ||
      status.includes("optima") ||
      status.includes("vigente") ||
      status === "ok" ||
      status.includes("bueno") ||
      status.includes("excelente")
    ) {
      return "status-optimo";
    }
    if (
      status.includes("regular") ||
      status.includes("proximo") ||
      status.includes("medio")
    ) {
      return "status-regular";
    }
    if (
      status.includes("malo") ||
      status.includes("vencido") ||
      (status.includes("cambio") && !status.includes("sin cambio"))
    ) {
      return "status-malo";
    }
    return "status-unknown";
  }

  /** LocalDate / ISO desde API → "yyyy-mm-dd" para clases de fecha. */
  function normalizeDateForClass(v) {
    if (v == null || v === "") return null;
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v.length >= 3) {
      const y = v[0];
      const mo = v[1];
      const d = v[2];
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return String(v);
  }

  function formatMonitoringDateCell(v) {
    const s = normalizeDateForClass(v);
    if (!s) return "N/A";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(v);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /** Misma regla que el backend de documentos: >30 verde, 0–30 amarillo, <0 rojo. */
  function getDocDaysRemainingClass(days) {
    if (days == null || days === "") return "status-unknown";
    const n = Number(days);
    if (Number.isNaN(n)) return "status-unknown";
    if (n > 30) return "status-optimo";
    if (n >= 0) return "status-regular";
    return "status-malo";
  }

  /** Misma lógica que aceite vehículo en backend: &gt;500 verde, 0–500 amarillo, &lt;0 rojo. */
  function getOilKmParaCambioClass(km) {
    if (km == null || km === "") return "status-unknown";
    const n = Number(km);
    if (Number.isNaN(n)) return "status-unknown";
    if (n > 500) return "status-optimo";
    if (n >= 0) return "status-regular";
    return "status-malo";
  }

  /** Motos: alineado con MotoMonitoringService — “OK” si km restantes &gt; max(100, intervalo/5). */
  function getMotoOilKmParaCambioClass(kmRemaining, row) {
    if (kmRemaining == null || kmRemaining === "") return "status-unknown";
    const n = Number(kmRemaining);
    if (Number.isNaN(n)) return "status-unknown";
    const oil = row?.oil;
    let interval = 3000;
    if (oil?.kmProximoCambio != null && oil?.kmCambio != null) {
      interval = Math.max(1, Number(oil.kmProximoCambio) - Number(oil.kmCambio));
    }
    const umbralProximo = Math.max(100, Math.floor(interval / 5));
    if (n > umbralProximo) return "status-optimo";
    if (n >= 0) return "status-regular";
    return "status-malo";
  }

  /** Días sin reporte: ≤7 verde, ≤14 amarillo, &gt;14 rojo. */
  function getReportLagClass(d) {
    if (d == null || d === "") return "status-unknown";
    const n = Number(d);
    if (Number.isNaN(n)) return "status-unknown";
    if (n <= 7) return "status-optimo";
    if (n <= 14) return "status-regular";
    return "status-malo";
  }

  /**
   * Semáforo para fechas de vencimiento (p. ej. SOAT):
   * Verde: > 60 días | Amarillo: 2-60 días | Rojo: ≤ 2 días (incluyendo vencido)
   * Soporta formatos: yyyy-mm-dd, dd/mm/yyyy
   */
  function getDateStatusClass(dateString) {
    if (!dateString || typeof dateString !== 'string') return 'status-unknown';

    let expirationDate;

    // Intenta parsear formato dd/mm/yyyy (colombiano)
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        expirationDate = new Date(year, month - 1, day);
      } else {
        return 'status-unknown';
      }
    } else {
      // Intenta parsear formato yyyy-mm-dd (ISO)
      const parts = dateString.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        expirationDate = new Date(year, month, 0);
      } else if (parts.length === 3) {
        expirationDate = new Date(dateString);
      } else {
        return 'status-unknown';
      }
    }

    if (isNaN(expirationDate.getTime())) return 'status-unknown';

    expirationDate.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysRemaining = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 60) return 'status-optimo';
    if (daysRemaining >= 2) return 'status-regular';
    return 'status-malo';
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
                class:multiline-hdr={header.column.columnDef.meta?.isMultilineHeader}
                on:click={header.column.getToggleSortingHandler()}
                class={header.column.columnDef.meta?.cellClass || ""}
              >
                {#if !header.isPlaceholder}
                  {@const content = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  <div
                    class="header-content"
                    class:multiline-header={header.column.columnDef.meta?.isMultilineHeader}
                  >
                    {#if typeof content === "string"}
                      {#if header.column.columnDef.meta?.isMultilineHeader}
                        <span class="header-text-pre">{content}</span>
                      {:else}
                        {@html content}
                      {/if}
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
            class:anomaly-row={row.original.isAnomaly}
            class:pending-row={row.original.order?.status?.toLowerCase() ===
              "pending"}
          >
            {#each row.getVisibleCells() as cell}
              <td
                key={cell.id}
                class:multiline={cell.column.columnDef.meta?.isMultiline}
                class:status-cell={cell.column.columnDef.meta?.isStatus ||
                  cell.column.columnDef.meta?.isDateStatus ||
                  cell.column.columnDef.meta?.isPlainMonitoringDate}
                class:td-actions={cell.column.columnDef.meta?.isAction ||
                  cell.column.columnDef.meta?.isExecuteAction ||
                  cell.column.columnDef.meta?.isCvAction ||
                  cell.column.columnDef.meta?.isImageAction ||
                  cell.column.columnDef.meta?.isMonitoringDocsAction ||
                  cell.column.columnDef.meta?.isMonitoringOilAction ||
                  cell.column.columnDef.meta?.isConsolidadoVehicleActions ||
                  cell.column.columnDef.meta?.isConsolidadoMotoActions ||
                  cell.column.columnDef.meta?.isConsolidadoMaqActions ||
                  cell.column.columnDef.meta?.isDocHistoryAction ||
                  cell.column.columnDef.meta?.isFuelHistorial ||
                  cell.column.columnDef.meta?.isFuelInvoice ||
                  cell.column.columnDef.meta?.isLicenseDocAction ||
                  cell.column.columnDef.meta?.isAnomDismissAction}
                class={cell.column.columnDef.meta?.cellClass || ""}
              >
                {#if cell.column.columnDef.meta?.isAction}
                  <div class="actions-cell">
                    <button
                      class="btn-action btn-edit"
                      on:click={() => handleAction("edit", row.original)}
                      >Editar</button
                    >
                    {#if showDeleteButton}
                      <button
                        class="btn-action btn-delete"
                        on:click={() => handleAction("delete", row.original)}
                        >Eliminar</button
                      >
                    {/if}
                  </div>
                {:else if cell.column.columnDef.meta?.isExecuteAction}
                  <div class="actions-cell">
                    {#if row.original.order?.status !== "Completada" && row.original.order?.status !== "Done"}
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
                {:else if cell.column.columnDef.meta?.isDocHistoryAction}
                  <div class="actions-cell">
                    <button
                      class="btn-action btn-doc-history"
                      on:click={() => handleAction("docHistory", row.original)}
                    >
                      Historial docs
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isLicenseDocAction}
                  <div class="license-doc-cell">
                    {#if row.original.licenseDocumentUrl}
                      <button
                        class="btn-action btn-view-images btn-license-doc"
                        on:click={() => handleAction("view_license_doc", row.original)}
                      >
                        Documento
                      </button>
                    {:else}
                      <span class="license-doc-cell__empty">—</span>
                    {/if}
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
                {:else if cell.column.columnDef.meta?.isConsolidadoVehicleActions}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact mon-action-text--hist"
                      title="Ver historial de cambios de aceite"
                      on:click={() => handleAction("monitoring_oil_history", row.original)}
                    >
                      Ver historial aceite
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isUpdateDocsAction}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact"
                      title="Actualizar fechas y archivos de documentación"
                      on:click={() => handleAction("update_docs", row.original)}
                    >
                      Actualizar Docs
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isConsolidadoMotoActions}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact mon-action-text--hist"
                      title="Ver historial de cambios de aceite"
                      on:click={() => handleAction("monitoring_oil_history", row.original)}
                    >
                      Ver historial aceite
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isConsolidadoMaqActions}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact"
                      title="Corregir el valor del horómetro de la última inspección"
                      on:click={() => handleAction("edit_hourmeter", row.original)}
                    >
                      Corregir Horómetro
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isFuelInvoice}
                  <div class="actions-cell">
                    {#if row.original.invoicePhotoUrl}
                      <a
                        href={getFileUrl(row.original.invoicePhotoUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn-action mon-action-text mon-action-text--compact"
                        title="Ver factura"
                      >
                        👁 Ver
                      </a>
                    {:else}
                      <label class="btn-action mon-action-text mon-action-text--compact" title="Subir factura">
                        ⬆ Subir
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style="display:none"
                          on:change={e => handleAction("fuel_invoice_upload", row.original, e)}
                        />
                      </label>
                    {/if}
                  </div>
                {:else if cell.column.columnDef.meta?.isFuelHistorial}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="btn-action mon-action-text mon-action-text--compact mon-action-text--hist"
                      on:click={() => handleAction("fuel_historial", row.original)}
                    >
                      Ver historial
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isMonitoringDocsAction}
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact"
                      title="Actualizar fechas y archivos de documentación (SOAT, tecnomecánica, tarjeta de propiedad, extintor)"
                      on:click={() => handleAction("monitoring_update_docs", row.original)}
                    >
                      Actualizar Documentos
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isMonitoringOilAction}
                  <div class="actions-cell actions-cell-stack">
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact"
                      title="Registrar cambio de aceite"
                      on:click={() => handleAction("monitoring_register_oil", row.original)}
                    >
                      Registrar aceite
                    </button>
                    <button
                      type="button"
                      class="mon-action-text mon-action-text--compact mon-action-text--hist"
                      title="Ver historial de cambios de aceite"
                      on:click={() => handleAction("monitoring_oil_history", row.original)}
                    >
                      Ver historial
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isPlainMonitoringDate}
                  {@const raw = cell.getContext().getValue()}
                  <span class="mon-plain-date">{formatMonitoringDateCell(raw)}</span>
                {:else if cell.column.columnDef.meta?.isDateStatus}
                  {@const raw = cell.getContext().getValue()}
                  {@const norm = normalizeDateForClass(raw)}
                  {@const colorClass = getDateStatusClass(norm)}
                  <button
                    type="button"
                    class="status-btn {colorClass}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {formatMonitoringDateCell(raw)}
                  </button>
                {:else if cell.column.columnDef.meta?.isDocDaysRemaining}
                  {@const v = cell.getContext().getValue()}
                  <button
                    type="button"
                    class="status-btn {getDocDaysRemainingClass(v)}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {v == null || v === "" ? "N/A" : new Intl.NumberFormat("es-CO").format(Number(v))}
                  </button>
                {:else if cell.column.columnDef.meta?.isMotoOilKmSemaforo}
                  {@const v = cell.getContext().getValue()}
                  <button
                    type="button"
                    class="status-btn {getMotoOilKmParaCambioClass(v, row.original)}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {v == null || v === "" ? "N/A" : new Intl.NumberFormat("es-CO").format(Number(v))}
                  </button>
                {:else if cell.column.columnDef.meta?.isOilKmSemaforo}
                  {@const v = cell.getContext().getValue()}
                  <button
                    type="button"
                    class="status-btn {getOilKmParaCambioClass(v)}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {v == null || v === "" ? "N/A" : new Intl.NumberFormat("es-CO").format(Number(v))}
                  </button>
                {:else if cell.column.columnDef.meta?.isReportLagSemaforo}
                  {@const v = cell.getContext().getValue()}
                  <button
                    type="button"
                    class="status-btn {getReportLagClass(v)}"
                    on:click={() =>
                      handleStatusClick(row.original, cell.column.columnDef)}
                  >
                    {v ?? "N/A"}
                  </button>
                {:else if cell.column.columnDef.meta?.isOrigin || cell.column.columnDef.meta?.isCondition}
                  {@const cellValue = cell.getContext().getValue()}
                  <span class={getConditionalCellClass(cell)}>{cellValue}</span>
                {:else if cell.column.columnDef.meta?.isOrderStatus}
                  {@const raw = String(cell.getContext().getValue() ?? '')}
                  {@const lower = raw.toLowerCase()}
                  <span class="order-status {(lower === 'done' || lower === 'completada') ? 'order-status--done' : lower === 'pending' ? 'order-status--pending' : ''}">
                    {(lower === 'done' || lower === 'completada') ? 'Completada' : lower === 'pending' ? 'Pendiente' : raw}
                  </span>
                {:else if cell.column.columnDef.meta?.isAnomalyEfficiency}
                  {@const label = cell.row.original._effLabel ?? '—'}
                  <span class="badge-warn">⚠ {label}</span>
                {:else if cell.column.columnDef.meta?.isAnomalyCost}
                  {@const r = cell.row.original}
                  <div>
                    <span>{r._costLabel ?? '—'}</span>
                    {#if r.totalCostMismatch}
                      <div style="color:#c00;font-size:10px">⚠ declarado: {r._costMismatchLabel ?? ''}</div>
                    {/if}
                  </div>
                {:else if cell.column.columnDef.meta?.isInvoicePhotoLink}
                  {@const url = cell.row.original.invoicePhotoUrl}
                  {#if url}
                    <a href={getFileUrl(url)}
                       target="_blank" rel="noopener noreferrer" class="inv-photo-link">👁 Ver</a>
                  {:else}
                    <label class="btn-action mon-action-text mon-action-text--compact" title="Subir recibo">
                      ⬆ Subir
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style="display:none"
                        on:change={e => handleAction("fuel_invoice_upload", row.original, e)}
                      />
                    </label>
                  {/if}
                {:else if cell.column.columnDef.meta?.isAnomDismissAction}
                  <div class="actions-cell">
                    <button class="btn-action dismiss-btn"
                      on:click={() => handleAction('dismiss_anomaly', row.original)}>
                      Quitar anomalía
                    </button>
                  </div>
                {:else if cell.column.columnDef.meta?.isRankPosition}
                  {@const pos = cell.row.index + 1}
                  <strong style="font-size:13px;color:{pos===1?'#b8860b':pos===2?'#707070':pos===3?'#8b4513':'inherit'}">{pos}</strong>
                {:else if cell.column.columnDef.meta?.isRankBar}
                  {@const pct = Number(cell.getContext().getValue() ?? 0)}
                  <div style="display:flex;align-items:center;gap:6px;min-width:120px">
                    <div style="flex:1;height:10px;background:#ddd;border:1px inset #bbb">
                      <div style="height:100%;width:{pct.toFixed(1)}%;background:linear-gradient(to right,#5a9fd4,#2a6fa8)"></div>
                    </div>
                    <span style="font-size:10px;white-space:nowrap">{pct.toFixed(0)}%</span>
                  </div>
                {:else if cell.column.columnDef.meta?.isEfficiencyRank}
                  {@const r = cell.row.original}
                  {@const isConsumption = ['GALLON_PER_HOUR','GAL_PER_HOUR','M3_PER_HOUR','L_PER_HOUR'].includes(r.factoryEfficiencyUnit)}
                  {@const below = r.factoryEfficiency != null && r.efficiencyValue != null && (isConsumption ? +r.efficiencyValue > +r.factoryEfficiency : +r.efficiencyValue < +r.factoryEfficiency)}
                  {@const dev = (r.factoryEfficiency != null && r.efficiencyValue != null && +r.factoryEfficiency !== 0) ? (isConsumption ? (+r.efficiencyValue - +r.factoryEfficiency) / +r.factoryEfficiency * 100 : (+r.factoryEfficiency - +r.efficiencyValue) / +r.factoryEfficiency * 100) : null}
                  {@const label = cell.getContext().getValue() ?? '—'}
                  <div style="text-align:right">
                    <span style="font-weight:bold;color:{below?'#c00':label==='—'?'#999':'#1a5c1a'}">{label}{below?' ↓':''}</span>
                    {#if dev !== null}
                      <div style="font-size:10px;color:{dev>0?'#c00':'#1a5c1a'}">{dev>0?'+':''}{dev.toFixed(1)}% vs fábrica</div>
                    {/if}
                  </div>
                {:else if cell.column.columnDef.meta?.isStatus || cell.column.columnDef.meta?.isBadge}
                  {@const cellValue = cell.getContext().getValue()}
                  {@const colorClass = getStatusClass(cellValue)}
                  <button
                    type="button"
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
    {#if showPagination}
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
    {/if}
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
  .license-doc-cell {
    display: flex;
    justify-content: center;
    padding: 0 2px;
  }
  .license-doc-cell__empty {
    font-size: 10px;
    color: #888;
  }

  /** Varias acciones de monitoreo/consolidado en una sola fila (lateral), para no alargar la altura de la fila. */
  .actions-cell-stack {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .actions-cell-stack .mon-action-text {
    flex: 0 0 auto;
  }

  .td-actions {
    width: 1px;
    white-space: nowrap;
  }
  /**
   * Acciones de monitoreo: texto neutro (sin colores de semáforo) para no confundir con celdas de estado.
   */
  .mon-action-text {
    display: inline-block;
    width: auto;
    max-width: 100%;
    padding: 2px 8px;
    margin: 0;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 10px;
    font-weight: normal;
    line-height: 1.2;
    text-align: center;
    color: #101010;
    background: linear-gradient(to bottom, #f4f4f4 0%, #d8d8d8 100%);
    border: 1px solid #808080;
    border-radius: 0;
    cursor: pointer;
  }
  .mon-action-text--compact {
    padding: 1px 6px;
    font-size: 10px;
    white-space: nowrap;
  }
  .mon-action-text--hist {
    background: linear-gradient(to bottom, #d8eaff 0%, #b8d4f8 100%);
    color: #1a3a6e;
    border-color: #6a90c0;
  }
  .mon-action-text--hist:hover {
    background: linear-gradient(to bottom, #e8f2ff 0%, #c8deff 100%);
  }
  .mon-action-text:hover {
    background: linear-gradient(to bottom, #fafafa 0%, #e4e4e4 100%);
    border-color: #606060;
  }
  .mon-action-text:active {
    border-style: inset;
  }

  /** Fecha informativa (p. ej. último cambio aceite): sin semáforo rojo/amarillo de vencimiento. */
  .mon-plain-date {
    display: block;
    padding: 6px 6px;
    text-align: center;
    font-size: 10px;
    font-weight: normal;
    color: #101010;
    background: #f5f5f5;
    border: 1px solid #d0d0d0;
    box-sizing: border-box;
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
  .data-grid tr:nth-child(even) td {
    background-color: #f4f4f4;
  }
  .unexpected-row td {
    background-color: #ffdddd !important;
  }
  .anomaly-row td {
    background-color: #fff0d0 !important;
    border-left: 3px solid #e8a000 !important;
  }
  .pending-row td {
    background-color: #fffacd !important;
  }

  th.sortable:hover {
    background: #a8a8a8;
  }
  th.sortable .header-content {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  th.sortable .header-content.multiline-header {
    display: block;
    text-align: center;
  }
  .header-text-pre {
    white-space: pre-line;
    display: block;
    text-align: center;
    font-weight: bold;
    line-height: 1.25;
  }
  .data-grid th.multiline-hdr {
    white-space: normal;
    vertical-align: middle;
    min-width: 8rem;
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
    flex: 0 0 auto;
    white-space: nowrap;
    font-family: inherit;
  }
  .btn-edit {
    background-color: #f0f0f0;
  }
  .btn-delete {
    background-color: #ffbaba;
  }
  .dismiss-btn {
    background: linear-gradient(to bottom, #f0f0f0, #d0d0d0);
  }
  .dismiss-btn:hover {
    background: linear-gradient(to bottom, #fff, #e0e0e0);
  }
  .badge-warn {
    display: inline-block; padding: 1px 6px; background: #ffcc00;
    border: 1px solid #cc9900; font-weight: bold; font-size: 10px; color: #5c3d00;
  }
  .inv-photo-link { color: #0050a0; text-decoration: underline; font-size: 10px; cursor: pointer; }

  .btn-execute {
    background-color: #add8e6;
    font-weight: bold;
  }
  .btn-cv {
    background-color: #c8e6c9;
    font-weight: bold;
  }
  .btn-doc-history {
    background-color: #d1c4e9;
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

  .order-status {
    display: inline-block;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: bold;
    border: 1px solid #c0c0c0;
    background: #e8e8e8;
    color: #404040;
  }
  .order-status--done {
    background: #c8f0c8;
    color: #1b5e20;
    border-color: #7bc97b;
  }
  .order-status--pending {
    background: #fff3cd;
    color: #7c5600;
    border-color: #e0b000;
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
  :global(th.soat-cell),
  :global(td.soat-cell) {
    background-color: #fff8e1 !important;
  }
  :global(th.tecno-cell),
  :global(td.tecno-cell) {
    background-color: #f3e5f5 !important;
  }
</style>
