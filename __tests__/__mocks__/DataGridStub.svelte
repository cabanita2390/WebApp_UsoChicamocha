<script>
  // Stub de DataGrid para tests de vistas de Subestaciones — jsdom no necesita
  // el motor real de @tanstack/svelte-table para verificar que la vista arma
  // los filtros/paginación correctos; solo hace falta poder disparar los
  // mismos eventos (`action`, `pageChange`, `sizeChange`) que el DataGrid real.
  // Mismo espíritu que FuelTrendChartStub.svelte (stub de librería pesada, no
  // de lógica propia del proyecto).
  import { createEventDispatcher } from "svelte";

  export let data = [];
  export let currentPage = 0;
  // Props que el stub recibe (mismo contrato que el DataGrid real, ver
  // config/table-definitions/substation.js y las vistas que lo montan) pero
  // no necesita leer para reaccionar — solo declaradas para que Svelte no
  // las trate como "unknown prop" al pasarlas desde la vista bajo test.
  export let columns = [];
  export let totalElements = 0;
  export let totalPages = 0;
  export let pageSize = 20;
  export let showPagination = true;
  export let variant = "classic";
  export let manualSorting = false;
  export let sorting = [];

  const dispatch = createEventDispatcher();
</script>

<div class="datagrid-stub" data-testid="datagrid-stub">
  <div data-testid="grid-row-count">{data.length}</div>
  {#each data as row, i (i)}
    <button type="button" data-testid="ver-detalle-{row.id ?? i}" on:click={() => dispatch("action", { type: "verDetalle", data: row })}>
      Ver detalle {row.id ?? i}
    </button>
  {/each}
  <button type="button" data-testid="stub-page-change" on:click={() => dispatch("pageChange", currentPage + 1)}>
    Página siguiente
  </button>
  <button type="button" data-testid="stub-sort-estacion" on:click={() => dispatch("sortChange", [{ id: "ej_estacion", desc: false }])}>
    Ordenar por estación
  </button>
  <div data-testid="stub-sorting">{JSON.stringify(sorting)}</div>
  <button type="button" data-testid="stub-size-change" on:click={() => dispatch("sizeChange", 50)}>
    Cambiar tamaño
  </button>
</div>
