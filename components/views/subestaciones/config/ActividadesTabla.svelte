<script>
  import { createEventDispatcher } from "svelte";
  import { disciplinaLabel } from "../../../../config/subestaciones.js";

  /** ActividadResponse[] (todas las disciplinas, activas e inactivas) */
  export let actividades = [];
  /** Año actual del servidor, para el encabezado "Citas {año}". */
  export let anioActual = null;

  const dispatch = createEventDispatcher();
  // Sin columna Código (P1/D3); con Nombre corto (P2).
  const cols = "minmax(0,1.6fr) 150px 120px 170px 110px 110px";
</script>

<div class="sub-card scroll-x">
  <div class="sub-table-bar">
    <span class="sub-table-bar-text"><strong>{actividades.length}</strong> actividades</span>
    <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nueva actividad</button>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <span>Nombre</span><span>Nombre corto</span><span>Disciplina</span><span>Captura móvil</span>
    <span>Citas {anioActual ?? ""}</span><span>Estado</span>
  </div>
  {#each actividades as a (a.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="sub-tr clickable" class:inactiva={!a.activa} style="grid-template-columns:{cols}"
      role="button" tabindex="0" on:click={() => dispatch("editar", a)}
      on:keydown={(e) => e.key === "Enter" && dispatch("editar", a)}>
      <span class="nombre">{a.nombre}</span>
      <span class="gris">{a.nombreCorto ?? "—"}</span>
      <span class="gris">{disciplinaLabel(a.disciplina)}</span>
      <span class="gris">{a.capturaMovilHabilitada ? "Sí, habilitada" : "No — solo web"}</span>
      <span class="num">{a.citasPublicadasAnio ?? 0}</span>
      <span>
        {#if a.activa}
          <span class="sub-badge ok">✓ Activa</span>
        {:else}
          <span class="sub-badge neu">○ Inactiva</span>
        {/if}
      </span>
    </div>
  {:else}
    <div class="sub-empty">Sin actividades registradas.</div>
  {/each}
</div>

<style>
  .scroll-x {
    overflow-x: auto;
  }
  .sub-th,
  .sub-tr {
    min-width: 860px;
  }
  .nombre {
    padding-right: 12px;
  }
  .gris {
    color: #52514e;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .inactiva,
  .inactiva .gris {
    color: #898781;
  }
</style>
