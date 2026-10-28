<script>
  import { createEventDispatcher } from "svelte";

  /** ElementoIntervenidoResponse[]: { elementoId, nombre, intervenciones, estaciones }, de más a menos. */
  export let filas = [];
  /** Texto gris junto al título, p. ej. "2026 · todas las estaciones". */
  export let alcance = "";
  /** Cuántos mostrar; el resto se resume en una línea. */
  export let tope = 8;
  /** Mostrar "en N estaciones" (no tiene sentido dentro del detalle de una estación). */
  export let conEstaciones = true;

  const dispatch = createEventDispatcher();

  $: visibles = filas.slice(0, tope);
  $: resto = filas.length - visibles.length;
  $: max = Math.max(1, ...visibles.map((f) => f.intervenciones));
</script>

<div class="sub-card">
  <div class="card-t">Elementos más intervenidos <span class="normal">· {alcance}</span></div>
  <div class="lista">
    {#each visibles as f (f.elementoId)}
      <div class="item">
        <div class="top">
          <button class="enlace" title="Ver las visitas que marcaron este elemento" on:click={() => dispatch("ver", f)}>{f.nombre}</button>
          <span class="cifra">
            <strong>{f.intervenciones}</strong>
            {f.intervenciones === 1 ? "visita" : "visitas"}{conEstaciones ? ` · ${f.estaciones} ${f.estaciones === 1 ? "estación" : "estaciones"}` : ""}
          </span>
        </div>
        <div class="barra"><div style="width:{(f.intervenciones / max) * 100}%"></div></div>
      </div>
    {:else}
      <div class="sub-empty">Todavía no hay visitas eléctricas que marquen elementos.</div>
    {/each}
    {#if resto > 0}
      <div class="resto">y {resto} {resto === 1 ? "elemento más" : "elementos más"} con menos visitas</div>
    {/if}
  </div>
</div>

<style>
  .card-t {
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 600;
    border-bottom: 1px solid rgba(11, 11, 11, 0.06);
  }
  .normal {
    font-weight: 400;
    color: #898781;
  }
  .lista {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }
  .cifra {
    color: #52514e;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .cifra strong {
    color: #0b0b0b;
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .enlace:hover {
    color: #2a78d6;
    text-decoration: underline;
  }
  .enlace:focus-visible {
    outline: 2px solid #2a78d6;
    outline-offset: 2px;
  }
  .barra {
    height: 8px;
    background: #f0f0ee;
    border-radius: 999px;
    overflow: hidden;
  }
  .barra div {
    height: 100%;
    border-radius: 999px;
    background: var(--sub-avance);
  }
  .resto {
    font-size: 12px;
    color: #898781;
  }
</style>
