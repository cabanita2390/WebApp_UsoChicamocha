<script>
  /**
   * Actividades más ejecutadas en todas las estaciones (antes solo había el top por estación, en el
   * Detalle). Sale del mismo resumen por actividad de la pestaña "Resumen por actividad".
   */
  import { createEventDispatcher } from "svelte";

  /** ResumenActividadResponse[] del año y la disciplina del Dashboard. */
  export let filas = [];
  export let alcance = "";
  export let tope = 5;

  const dispatch = createEventDispatcher();

  $: ordenadas = filas.filter((f) => f.ejecutadoTotal > 0).sort((a, b) => b.ejecutadoTotal - a.ejecutadoTotal);
  $: visibles = ordenadas.slice(0, tope);
  $: max = Math.max(1, ...visibles.map((f) => f.ejecutadoTotal));
</script>

<div class="sub-card">
  <div class="card-t">Actividades más ejecutadas <span class="normal">· {alcance}</span></div>
  <div class="lista">
    {#each visibles as f (f.actividadId)}
      <div class="item">
        <div class="top">
          <button class="enlace" title="Ver sus registros en Ejecuciones" on:click={() => dispatch("ver", f)}>{f.actividadNombre}</button>
          <span class="cifra">
            <strong>{f.ejecutadoTotal}</strong> {f.ejecutadoTotal === 1 ? "registro" : "registros"}
            · {f.estaciones} {f.estaciones === 1 ? "estación" : "estaciones"}
          </span>
        </div>
        <div class="barra"><div style="width:{(f.ejecutadoTotal / max) * 100}%"></div></div>
      </div>
    {:else}
      <div class="sub-empty">Todavía no hay actividades ejecutadas este año.</div>
    {/each}
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
  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }
  .enlace {
    all: unset;
    cursor: pointer;
    font-weight: 600;
    color: #1f1e1c;
  }
  .enlace:hover {
    color: #5b3fa0;
    text-decoration: underline;
  }
  .cifra {
    color: #52514e;
    white-space: nowrap;
  }
  .barra {
    margin-top: 6px;
    height: 6px;
    border-radius: 3px;
    background: #f0eef5;
    overflow: hidden;
  }
  .barra div {
    height: 100%;
    background: #5b3fa0;
    border-radius: 3px;
  }
</style>
