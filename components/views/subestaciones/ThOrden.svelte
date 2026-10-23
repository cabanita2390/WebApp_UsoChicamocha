<script>
  import { createEventDispatcher } from "svelte";
  import { alternarOrden } from "../../../utils/ordenTabla.js";

  /** Columna que ordena este encabezado. */
  export let campo;
  /** Orden actual de la tabla: { campo, dir } o null. */
  export let orden = null;
  /** Dirección del primer clic: "desc" en columnas donde interesa ver primero lo más alto. */
  export let dirInicial = "asc";
  export let der = false;
  export let title = "";

  const dispatch = createEventDispatcher();
  $: activo = orden?.campo === campo;
</script>

<button type="button" class="th-orden" class:der class:activo {title}
  on:click={() => dispatch("orden", alternarOrden(orden, campo, dirInicial))}>
  <span class="txt"><slot /></span>
  <span class="flecha" aria-hidden="true">{activo ? (orden.dir === "asc" ? "▲" : "▼") : "↕"}</span>
</button>

<style>
  .th-orden {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .th-orden.der {
    justify-content: flex-end;
    justify-self: end;
    text-align: right;
  }
  .th-orden:hover,
  .th-orden.activo {
    color: var(--sub-ink, #1f1e1c);
  }
  .th-orden:focus-visible {
    outline: 2px solid var(--sub-ink, #1f1e1c);
    outline-offset: 2px;
    border-radius: 2px;
  }
  .txt {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .flecha {
    font-size: 9px;
    opacity: 0.45;
  }
  .activo .flecha {
    opacity: 1;
  }
</style>
