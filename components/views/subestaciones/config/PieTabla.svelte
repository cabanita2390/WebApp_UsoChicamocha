<script>
  /**
   * Paginación de las tablas de Configuración (listas cargadas de una vez), con la cantidad por
   * página a elección. No se muestra si todo cabe en la página más chica.
   */
  export let pagina = 0;
  export let total = 0;
  export let tam = 20;

  const TAMANOS = [10, 20, 50, 100];

  $: paginas = Math.max(1, Math.ceil(total / tam));
  $: desde = total ? pagina * tam + 1 : 0;
  $: hasta = Math.min(total, (pagina + 1) * tam);
</script>

{#if total > TAMANOS[0]}
  <div class="sub-pie-tabla">
    <span class="gris">Mostrando {desde}–{hasta} de {total}</span>
    <div class="botones">
      <select class="tam" bind:value={tam} on:change={() => (pagina = 0)} aria-label="Filas por página">
        {#each TAMANOS as n}<option value={n}>Mostrar {n}</option>{/each}
      </select>
      <button class="sub-btn chico" disabled={pagina === 0} on:click={() => (pagina = pagina - 1)}>‹ Anterior</button>
      <span>Página <strong>{pagina + 1} de {paginas}</strong></span>
      <button class="sub-btn chico" disabled={pagina >= paginas - 1} on:click={() => (pagina = pagina + 1)}>Siguiente ›</button>
    </div>
  </div>
{/if}

<style>
  .sub-pie-tabla {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 16px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
    font-size: 13px;
  }
  .gris {
    color: #898781;
  }
  .botones {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tam {
    height: 32px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 999px;
    font: inherit;
    font-size: 12.5px;
    background: #fff;
    cursor: pointer;
  }
  .botones .chico {
    padding: 6px 14px;
    font-size: 12.5px;
  }
  .botones .chico:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
