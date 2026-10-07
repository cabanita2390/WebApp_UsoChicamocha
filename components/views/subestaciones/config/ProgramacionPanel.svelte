<script>
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";

  /** Año actual del servidor. */
  export let anioActual;
  /** Citas publicadas del año actual (estaciones activas). */
  export let citasOrigen = 0;
  /** Citas que ya tiene el año siguiente (borrador o publicadas). */
  export let citasDestino = 0;
  export let estacionesInactivas = 0;

  const dispatch = createEventDispatcher();
  let copiando = false;

  $: destino = anioActual + 1;
  $: copiado = citasDestino > 0;

  async function copiar() {
    copiando = true;
    try {
      const r = await substationAdmin.copiarAnio(anioActual, destino);
      flash(`${r.creadas} citas copiadas a ${destino} como borrador · nada llega a móvil hasta publicar`);
      dispatch("copiado", destino);
    } catch (e) {
      flash(e.message, { error: true });
    } finally {
      copiando = false;
    }
  }
</script>

<div class="sub-card preparar">
  <div>
    <div class="t">Preparar cronograma {destino}</div>
    <p class="p">
      Copia las {citasOrigen} citas de {anioActual} a {destino} en un paso y después ajuste solo las excepciones,
      en lugar de cargarlas una por una.
    </p>
    <div class="fila">
      <span class="pill">Origen <strong>{anioActual}</strong> · {citasOrigen} citas</span>
      <span class="flecha">→</span>
      <span class="pill">Destino <strong>{destino}</strong> · {citasDestino} citas</span>
      <!-- Siempre marcado: el backend nunca copia estaciones inactivas. -->
      <label class="omitir" title="Las estaciones inactivas nunca se copian"><input type="checkbox" checked on:click|preventDefault />Omitir estaciones inactivas ({estacionesInactivas})</label>
    </div>
  </div>
  {#if copiado}
    <span class="sub-badge ok listo">✓ Copiadas — revise excepciones</span>
  {:else}
    <button class="sub-btn-primary" disabled={copiando || citasOrigen === 0} on:click={copiar}>Copiar a {destino}</button>
  {/if}
</div>

<div class="sub-card abrir">
  <div class="abrir-text">
    <div class="t">Las citas del año se editan en el Cronograma Anual</div>
    <p class="p2">
      Asignar, quitar, asignación masiva y publicación a móvil viven en un solo lugar, para que no haya dos versiones
      del cronograma.
    </p>
  </div>
  <button class="sub-btn" on:click={() => dispatch("abrirCronograma", anioActual)}>Abrir Cronograma Anual →</button>
</div>

<style>
  .preparar {
    padding: 18px 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    align-items: center;
  }
  .t {
    font-size: 15px;
    font-weight: 650;
  }
  .p {
    margin: 6px 0 12px;
    font-size: 13px;
    color: #52514e;
    max-width: 640px;
    text-wrap: pretty;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;
  }
  .pill {
    padding: 6px 12px;
    border-radius: 8px;
    background: #f7f7f6;
    border: 1px solid rgba(11, 11, 11, 0.08);
  }
  .flecha {
    color: #898781;
  }
  .omitir {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #52514e;
  }
  .listo {
    padding: 6px 12px;
    font-size: 13px;
  }
  .abrir {
    padding: 18px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .abrir-text {
    flex: 1 1 320px;
    min-width: 0;
  }
  .p2 {
    margin: 6px 0 0;
    font-size: 13px;
    color: #52514e;
    text-wrap: pretty;
  }
</style>
