<script>
  import { createEventDispatcher } from "svelte";
  import { disciplinaLabel } from "../../../../config/subestaciones.js";
  import { ordenarFilas } from "../../../../utils/ordenTabla.js";
  import ThOrden from "../ThOrden.svelte";
  import PieTabla from "./PieTabla.svelte";
  import { coincideTexto } from "../../../../utils/opcionesFiltro.js";
  import IconoConjunto from "./IconoConjunto.svelte";

  /** ItemCatalogoResponse[]: conjuntos o elementos (todas las disciplinas, activos e inactivos). */
  export let items = [];
  /** { singular: "conjunto", plural: "conjuntos", ayuda: "…" } */
  export let textos;
  /** Conjuntos: el ícono que ve el operario en el móvil, junto al nombre. */
  export let conIcono = false;

  const dispatch = createEventDispatcher();
  const cols = "minmax(0,1.6fr) 160px 120px";

  let orden = null;
  const VALORES = {
    nombre: (x) => x.nombre,
    disciplina: (x) => disciplinaLabel(x.disciplina),
    estado: (x) => (x.activa ? 0 : 1),
  };
  $: filas = ordenarFilas(items, orden, VALORES, (x) => x.nombre);

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
    <span class="sub-table-bar-text">{#if q}<strong>{visibles.length}</strong> de {items.length}{:else}<strong>{items.length}</strong>{/if} {textos.plural} · {textos.ayuda}</span>
    <div class="sub-table-bar-acciones">
      <input class="sub-buscar-tabla" type="search" bind:value={q} placeholder={`Buscar ${textos.singular}…`} aria-label={`Buscar ${textos.singular}`} />
      <button class="sub-btn-primary" on:click={() => dispatch("nueva")}>+ Nuevo {textos.singular}</button>
    </div>
  </div>
  <div class="sub-th" style="grid-template-columns:{cols}">
    <ThOrden campo="nombre" {orden} on:orden={(e) => (orden = e.detail)}>Nombre</ThOrden>
    <ThOrden campo="disciplina" {orden} on:orden={(e) => (orden = e.detail)}>Disciplina</ThOrden>
    <ThOrden campo="estado" {orden} on:orden={(e) => (orden = e.detail)}>Estado</ThOrden>
  </div>
  {#each pag as x (x.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="sub-tr clickable" class:inactiva={!x.activa} style="grid-template-columns:{cols}"
      role="button" tabindex="0" on:click={() => dispatch("editar", x)}
      on:keydown={(e) => e.key === "Enter" && dispatch("editar", x)}>
      <span class="nombre">
        {#if conIcono}<span class="icono"><IconoConjunto codigo={x.icono} size={18} /></span>{/if}
        {x.nombre}
      </span>
      <span class="gris">{disciplinaLabel(x.disciplina)}</span>
      <span>
        {#if x.activa}
          <span class="sub-badge ok">✓ Activo</span>
        {:else}
          <span class="sub-badge neu">○ Inactivo</span>
        {/if}
      </span>
    </div>
  {:else}
    <div class="sub-empty">{#if q}{`Ningún ${textos.singular} coincide con «${q}».`}{:else}Sin {textos.plural} registrados.{/if}</div>
  {/each}
  <PieTabla bind:pagina bind:tam total={visibles.length} />
</div>

<style>
  .scroll-x {
    overflow-x: auto;
  }
  .sub-th,
  .sub-tr {
    min-width: 520px;
  }
  .nombre {
    padding-right: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .icono {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #fdf3d8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .inactiva .icono {
    opacity: 0.5;
  }
  .gris {
    color: #52514e;
  }
  .inactiva,
  .inactiva .gris {
    color: #898781;
  }
</style>
