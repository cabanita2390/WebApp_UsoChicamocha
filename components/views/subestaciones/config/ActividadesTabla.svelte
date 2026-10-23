<script>
  import { createEventDispatcher } from "svelte";
  import { disciplinaLabel } from "../../../../config/subestaciones.js";
  import { ordenarFilas } from "../../../../utils/ordenTabla.js";
  import ThOrden from "../ThOrden.svelte";

  /** ActividadResponse[] (todas las disciplinas, activas e inactivas) */
  export let actividades = [];
  /** Año actual del servidor, para el encabezado "Citas {año}". */
  export let anioActual = null;

  const dispatch = createEventDispatcher();
  // Sin columna Código (P1/D3); con Nombre corto (P2).
  const cols = "minmax(0,1.6fr) 150px 120px 170px 110px 110px";

  // Sin orden elegido se respeta el del servidor.
  let orden = null;
  const VALORES = {
    nombre: (a) => a.nombre,
    corto: (a) => a.nombreCorto || null,
    disciplina: (a) => disciplinaLabel(a.disciplina),
    captura: (a) => (a.capturaMovilHabilitada ? 0 : 1),
    citas: (a) => a.citasPublicadasAnio ?? 0,
    estado: (a) => (a.activa ? 0 : 1),
  };
  $: filas = ordenarFilas(actividades, orden, VALORES, (a) => a.nombre);
</script>

<div class="sub-card scroll-x">
  <div class="sub-table-bar">
    <span class="sub-table-bar-text"><strong>{actividades.length}</strong> actividades</span>
    <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nueva actividad</button>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <ThOrden campo="nombre" {orden} on:orden={(e) => (orden = e.detail)}>Nombre</ThOrden>
    <ThOrden campo="corto" {orden} on:orden={(e) => (orden = e.detail)}>Nombre corto</ThOrden>
    <ThOrden campo="disciplina" {orden} on:orden={(e) => (orden = e.detail)}>Disciplina</ThOrden>
    <ThOrden campo="captura" {orden} on:orden={(e) => (orden = e.detail)}>Captura móvil</ThOrden>
    <ThOrden campo="citas" dirInicial="desc" {orden} on:orden={(e) => (orden = e.detail)}>Citas {anioActual ?? ""}</ThOrden>
    <ThOrden campo="estado" {orden} on:orden={(e) => (orden = e.detail)}>Estado</ThOrden>
  </div>
  {#each filas as a (a.id)}
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
