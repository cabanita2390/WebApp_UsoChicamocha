<script>
  import { createEventDispatcher } from "svelte";
  import { tipoLabel, frecuenciaLabel, FRECUENCIAS } from "../../../../config/subestaciones.js";
  import { ordenarFilas } from "../../../../utils/ordenTabla.js";
  import ThOrden from "../ThOrden.svelte";
  import PieTabla from "./PieTabla.svelte";
  import { coincideTexto } from "../../../../utils/opcionesFiltro.js";

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

  // Buscador y paginación en el navegador: el catálogo llega completo, pero puede crecer mucho.
  let tam = 20;
  let q = "";
  let pagina = 0;
  $: (q, orden, (pagina = 0));
  $: visibles = filas.filter((it) => coincideTexto([it.nombre], q));
  $: if (pagina > 0 && pagina * tam >= visibles.length) pagina = Math.max(0, Math.ceil(visibles.length / tam) - 1);
  $: pag = visibles.slice(pagina * tam, (pagina + 1) * tam);
</script>

<div class="sub-card scroll-x">
  <div class="sub-table-bar">
    <span class="sub-table-bar-text">{#if q}<strong>{visibles.length}</strong> de {estaciones.length}{:else}<strong>{estaciones.length}</strong>{/if} estaciones · click en una fila para editar</span>
    <div class="sub-table-bar-acciones">
      <input class="sub-buscar-tabla" type="search" bind:value={q} placeholder="Buscar estación…" aria-label="Buscar estación" />
      <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nueva estación</button>
    </div>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <ThOrden campo="nombre" {orden} on:orden={(e) => (orden = e.detail)}>Nombre</ThOrden>
    <ThOrden campo="tipo" {orden} on:orden={(e) => (orden = e.detail)}>Tipo</ThOrden>
    <ThOrden campo="frecuencia" {orden} on:orden={(e) => (orden = e.detail)}>Frecuencia base</ThOrden>
    <ThOrden campo="estado" {orden} on:orden={(e) => (orden = e.detail)}>Estado</ThOrden>
  </div>
  {#each pag as s (s.id)}
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
    <div class="sub-empty">{#if q}Ninguna estación coincide con «{q}».{:else}Sin estaciones registradas.{/if}</div>
  {/each}
  <PieTabla bind:pagina bind:tam total={visibles.length} />
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
