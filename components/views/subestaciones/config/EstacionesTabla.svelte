<script>
  import { createEventDispatcher } from "svelte";
  import { tipoLabel, frecuenciaLabel, FRECUENCIAS } from "../../../../config/subestaciones.js";
  import { ordenarFilas } from "../../../../utils/ordenTabla.js";
  import ThOrden from "../ThOrden.svelte";

  /** EstacionResponse[] (activas e inactivas) */
  export let estaciones = [];

  const dispatch = createEventDispatcher();
  // Sin columna Código (decisión P1/D3).
  const cols = "minmax(0,1.6fr) 150px 150px 120px";

  // Sin orden elegido se respeta el del servidor. Frecuencia: de la más a la menos seguida.
  let orden = null;
  const VALORES = {
    nombre: (s) => s.nombre,
    tipo: (s) => tipoLabel(s.tipo),
    frecuencia: (s) => FRECUENCIAS.findIndex((f) => f.value === s.frecuenciaBase),
    estado: (s) => (s.activa ? 0 : 1),
  };
  $: filas = ordenarFilas(estaciones, orden, VALORES, (s) => s.nombre);
</script>

<div class="sub-card scroll-x">
  <div class="sub-table-bar">
    <span class="sub-table-bar-text"><strong>{estaciones.length}</strong> estaciones · click en una fila para editar</span>
    <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nueva estación</button>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <ThOrden campo="nombre" {orden} on:orden={(e) => (orden = e.detail)}>Nombre</ThOrden>
    <ThOrden campo="tipo" {orden} on:orden={(e) => (orden = e.detail)}>Tipo</ThOrden>
    <ThOrden campo="frecuencia" {orden} on:orden={(e) => (orden = e.detail)}>Frecuencia base</ThOrden>
    <ThOrden campo="estado" {orden} on:orden={(e) => (orden = e.detail)}>Estado</ThOrden>
  </div>
  {#each filas as s (s.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="sub-tr clickable" class:inactiva={!s.activa} style="grid-template-columns:{cols}"
      role="button" tabindex="0" on:click={() => dispatch("editar", s)}
      on:keydown={(e) => e.key === "Enter" && dispatch("editar", s)}>
      <span>{s.nombre}</span>
      <span>{tipoLabel(s.tipo)}</span>
      <span>{frecuenciaLabel(s.frecuenciaBase)}</span>
      <span>
        {#if s.activa}
          <span class="sub-badge ok">✓ Activa</span>
        {:else}
          <span class="sub-badge neu">○ Inactiva</span>
        {/if}
      </span>
    </div>
  {:else}
    <div class="sub-empty">Sin estaciones registradas.</div>
  {/each}
</div>

<style>
  .scroll-x {
    overflow-x: auto;
  }
  .sub-th,
  .sub-tr {
    min-width: 670px;
  }
  .inactiva {
    color: #898781;
  }
</style>
