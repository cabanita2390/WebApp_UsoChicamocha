<script>
  // Stub del modal de detalle para SubestacionesEjecuciones.test.js — ese
  // archivo ya cubre la orquestación (qué fila abre el modal, qué pasa si
  // falla la carga), y el modal real tiene su propia cobertura dedicada en
  // __tests__/shared/SubestacionEjecucionDetalleModal.test.js.
  import { createEventDispatcher } from "svelte";
  export let ejecucion = null;
  export let isLoading = false;
  const dispatch = createEventDispatcher();
</script>

<div data-testid="detalle-modal-stub">
  {#if isLoading}<span data-testid="detalle-loading">cargando</span>{/if}
  {#if ejecucion}<span data-testid="detalle-id">{ejecucion.id}</span>{/if}
  <button type="button" data-testid="detalle-cerrar" on:click={() => dispatch("close")}>cerrar</button>
</div>
