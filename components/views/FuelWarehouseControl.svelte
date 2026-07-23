<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import Loader from "../shared/Loader.svelte";

  const ACCENT_BLUE = "#2a78d6";
  const GOOD_GREEN = "#006300";
  const CRITICAL_RED = "#d03b3b";

  let fechaInicio = "";
  let fechaFin = "";

  let reintegroForm = { refuelingId: "", cantidadReintegrada: "" };
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = false;

  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  $: isSupervisorOperativo = $auth?.currentUser?.role === "SUPERVISOR_OPERATIVO";
  $: puedeRegistrarReintegro = isAdmin || isSupervisorOperativo;

  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));

  $: balance = $data.fuelWarehouseBalance ?? [];
  // Saldos NUNCA se suman entre áreas de costo — DISTRITO y ASOCIACION son
  // inventarios independientes, mezclarlos daría una cifra sin sentido operativo.
  $: saldosPorArea = agruparPorArea(balance);

  $: movements = $data.fuelWarehouseMovements;
  $: conciliacion = movements?.conciliacion ?? [];
  $: conciliacionPorArea = agruparPorArea(conciliacion);
  $: historialCompras = movements?.historialCompras ?? [];

  function agruparPorArea(saldos) {
    const areas = { DISTRITO: [], ASOCIACION: [] };
    for (const s of saldos) {
      if (areas[s.areaCosto]) areas[s.areaCosto].push(s);
    }
    return areas;
  }

  function unidad(fuelTypeId) {
    return unidadMedidaById[fuelTypeId] === "M3" ? "m³" : "gal";
  }

  function formatCantidad(value, fuelTypeId) {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} ${unidad(fuelTypeId)}`;
  }

  function formatSigned(value, fuelTypeId, sign) {
    if (value == null) return "—";
    return `${sign}${formatCantidad(value, fuelTypeId)}`;
  }

  function formatCOP(value) {
    if (value == null) return "—";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 2 }).format(value);
  }

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchFuelWarehouseBalance();
    data.fetchFuelWarehouseMovements(fechaInicio || undefined, fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelWarehouseMovements(fechaInicio || undefined, fechaFin || undefined);
  }

  function openModal() {
    reintegroForm = { refuelingId: "", cantidadReintegrada: "" };
    errorMessage = "";
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function handleSubmitReintegro(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.createFuelReintegration({
        refuelingId: Number(reintegroForm.refuelingId),
        cantidadReintegrada: Number(reintegroForm.cantidadReintegrada),
      });
      showModal = false;
      data.fetchFuelWarehouseBalance();
      data.fetchFuelWarehouseMovements(fechaInicio || undefined, fechaFin || undefined);
    } catch (e) {
      errorMessage = e.message || "Error al registrar el reintegro.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros">
    <label class="field" for="almFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="almFechaInicio" type="date" bind:value={fechaInicio} />
    </label>
    <label class="field" for="almFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="almFechaFin" type="date" bind:value={fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
    {#if puedeRegistrarReintegro}
      <button type="button" class="btn-filter btn-reintegro" on:click={openModal}>Registrar reintegro</button>
    {/if}
  </div>

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="chart-row">
      {#each Object.entries(saldosPorArea) as [area, saldos]}
        <div class="fuel-chart">
          <div class="fuel-chart-head">{area}</div>
          {#if saldos.length}
            <div class="stat-grid stat-grid--primary">
              {#each saldos as s}
                <div class="stat-tile" style="--tile-accent: {ACCENT_BLUE}">
                  <span class="stat-label">{fuelTypesById[s.fuelTypeId] ?? `Tipo #${s.fuelTypeId}`}</span>
                  <span class="stat-value">{formatCantidad(s.cantidadDisponible, s.fuelTypeId)}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="no-data">Sin saldo registrado.</p>
          {/if}
        </div>
      {/each}
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head">Conciliación del periodo</div>
      {#if conciliacion.length}
        <div class="chart-row">
          {#each Object.entries(conciliacionPorArea) as [area, filas]}
            {#if filas.length}
              <div class="conc-area">
                <div class="conc-area-head">{area}</div>
                <div class="conciliacion-table">
                  <div class="conciliacion-row conciliacion-row--head conciliacion-row--5col">
                    <span>Combustible</span>
                    <span>Saldo inicial</span>
                    <span>Entradas</span>
                    <span>Salidas</span>
                    <span>Saldo final</span>
                  </div>
                  {#each [...filas].sort((a, b) => a.fuelTypeId - b.fuelTypeId) as fila}
                    <div class="conciliacion-row conciliacion-row--5col">
                      <span>{fuelTypesById[fila.fuelTypeId] ?? `Tipo #${fila.fuelTypeId}`}</span>
                      <span>{formatCantidad(fila.saldoInicial, fila.fuelTypeId)}</span>
                      <span style="color: {GOOD_GREEN}">{formatSigned(fila.entradas, fila.fuelTypeId, "+")}</span>
                      <span style="color: {CRITICAL_RED}">{formatSigned(fila.salidas, fila.fuelTypeId, "−")}</span>
                      <span class="conciliacion-final">{formatCantidad(fila.saldoFinal, fila.fuelTypeId)}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <p class="no-data">Sin movimientos en el rango seleccionado.</p>
      {/if}
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head">Historial de compras del periodo</div>
      {#if historialCompras.length}
        <div class="conciliacion-table">
          <div class="conciliacion-row conciliacion-row--head">
            <span>Fecha</span>
            <span>Área</span>
            <span>Combustible</span>
            <span>Cantidad</span>
            <span>Total</span>
          </div>
          {#each historialCompras as compra}
            <div class="conciliacion-row">
              <span>{formatFecha(compra.fechaCompra)}</span>
              <span>{compra.areaCosto}</span>
              <span>{fuelTypesById[compra.fuelTypeId] ?? `Tipo #${compra.fuelTypeId}`}</span>
              <span>{formatCantidad(compra.cantidad, compra.fuelTypeId)}</span>
              <span>{formatCOP(compra.totalCalculado)}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-data">Sin compras en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Registrar reintegro</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form aria-label="Registrar reintegro" class="create-form" on:submit={handleSubmitReintegro}>
        <div class="create-grid">
          <label class="field-retro" for="refuelingId">
            <span class="field-lab-retro">Id del tanqueo</span>
            <input id="refuelingId" type="number" bind:value={reintegroForm.refuelingId} required disabled={isSubmitting} />
            <span class="field-hint">Busca el id en el historial de Tanqueo</span>
          </label>
          <label class="field-retro" for="cantidadReintegrada">
            <span class="field-lab-retro">Cantidad reintegrada</span>
            <input id="cantidadReintegrada" type="number" step="0.001" bind:value={reintegroForm.cantidadReintegrada} required disabled={isSubmitting} />
          </label>
        </div>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar reintegro"}
          </button>
        </div>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

<style>
  .fuel-dashboard {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .fuel-filtros {
    display: flex;
    gap: 12px;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .field input {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    background: var(--surface);
  }
  .btn-filter {
    padding: 7px 16px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    height: 32px;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-reintegro {
    background: #006300;
    margin-left: auto;
  }
  .btn-reintegro:hover {
    background: #004d00;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .stat-grid {
    display: grid;
    gap: 14px;
  }
  .stat-grid--primary {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  .stat-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }
  .stat-label::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tile-accent, #2a78d6);
    flex-shrink: 0;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .chart-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  .fuel-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
  }
  .fuel-chart-head {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    color: var(--ink);
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
  .conciliacion-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    overflow-x: auto;
  }
  .conciliacion-row {
    display: grid;
    grid-template-columns: repeat(6, minmax(90px, 1fr));
    gap: 10px;
    padding: 8px 6px;
    border-bottom: 1px solid var(--border);
    color: var(--ink);
  }
  .conciliacion-row--head {
    font-weight: 600;
    color: var(--ink-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Conciliación: agrupada por área (como Saldos) para no repetir esa columna en
     cada fila, orden estable por tipo de combustible, tabla real (no texto en
     línea) para que los números queden alineados y sean fáciles de comparar. */
  .conc-area {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
  }
  .conc-area-head {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--ink-secondary);
    margin-bottom: 10px;
  }
  .conciliacion-row--5col {
    grid-template-columns: 1.3fr repeat(4, minmax(70px, 1fr));
    font-variant-numeric: tabular-nums;
  }
  .conciliacion-final {
    font-weight: 600;
    color: var(--ink);
  }

  /* Modal de reintegro: retro, igual a Tanqueo/Suministro (formularios de registro). */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: #e0e0e0;
    padding: 16px;
    border: 2px outset #ffffff;
    min-width: 320px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.25rem), 1fr));
    gap: 6px 10px;
    align-items: end;
    padding: 0 8px;
  }
  .field-retro {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 11px;
  }
  .field-lab-retro {
    font-weight: bold;
    font-size: 10px;
    color: #303030;
  }
  .field-hint {
    font-size: 9px;
    color: #666;
    font-weight: normal;
  }
  .field-retro input {
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    min-height: 24px;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    padding: 8px;
  }
  .btn-create {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
  }
  .error-message {
    color: red;
    padding: 0 8px 8px;
  }
</style>
