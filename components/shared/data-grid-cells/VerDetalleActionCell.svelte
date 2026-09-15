<script>
  import { createEventDispatcher } from 'svelte';
  export let row;
  const dispatch = createEventDispatcher();
</script>

<button type="button" class="btn-ver-detalle" on:click={() => dispatch('action', { type: 'verDetalle', data: row })}>
  Ver detalle
</button>

<style>
  /* Estilo "moderno" propio (no el retro compartido .btn-action) — esta celda
     solo la usa el reporte de Ejecuciones de Subestaciones, que es 100%
     moderno (variant="modern"), sin formularios retro debajo. */
  .btn-ver-detalle {
    font-family: inherit;
    padding: 6px 14px;
    border: 1px solid rgba(42, 120, 214, 0.3);
    border-radius: 999px;
    background: #eef4fc;
    color: #2a78d6;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .btn-ver-detalle:hover {
    background: #e0edfb;
  }
</style>
