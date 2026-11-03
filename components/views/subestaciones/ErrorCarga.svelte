<script>
  import { createEventDispatcher } from "svelte";

  /** Qué no se pudo cargar, ej. "el cronograma". */
  export let que = "la información";
  export let mensaje = "";

  const dispatch = createEventDispatcher();
</script>

<div class="sub-card error-carga" role="alert">
  <strong>No se pudo cargar {que}</strong>
  {#if mensaje}<span>{mensaje}</span>{/if}
  <button class="sub-btn" on:click={() => dispatch("reintentar")}>Reintentar</button>
</div>

<style>
  .error-carga {
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
    font-size: 13px;
    color: #52514e;
  }
  .error-carga strong {
    font-size: 15px;
    color: #0b0b0b;
  }
  .error-carga .sub-btn {
    margin-top: 4px;
  }
</style>
