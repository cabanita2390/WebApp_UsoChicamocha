<script>
  import { createEventDispatcher } from "svelte";
  import { tipoLabel, frecuenciaLabel } from "../../../../config/subestaciones.js";

  /** EstacionResponse[] (activas e inactivas) */
  export let estaciones = [];

  const dispatch = createEventDispatcher();
  // Sin columna Código (decisión P1/D3).
  const cols = "minmax(0,1.6fr) 150px 150px 120px";
</script>

<div class="sub-card scroll-x">
  <div class="sub-table-bar">
    <span class="sub-table-bar-text"><strong>{estaciones.length}</strong> estaciones · click en una fila para editar</span>
    <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nueva estación</button>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <span>Nombre</span><span>Tipo</span><span>Frecuencia base</span><span>Estado</span>
  </div>
  {#each estaciones as s (s.id)}
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
