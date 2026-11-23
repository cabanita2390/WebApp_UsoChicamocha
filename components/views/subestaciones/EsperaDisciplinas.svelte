<script>
  /**
   * Dibuja su contenido cuando ya se leyeron las disciplinas del back. Las pantallas de Estaciones
   * leen nombres y reglas de disciplina de ahí, así que no se muestran con una lista supuesta.
   */
  import { onMount } from "svelte";
  import { cargarDisciplinas, disciplinasListas } from "../../../stores/disciplinas.js";

  let error = "";

  async function cargar() {
    error = "";
    try {
      await cargarDisciplinas();
    } catch (e) {
      error = e?.message || "No se pudieron cargar las disciplinas.";
    }
  }

  onMount(cargar);
</script>

{#if $disciplinasListas}
  <slot />
{:else if error}
  <div class="espera" role="alert">
    <p>{error}</p>
    <button type="button" class="sub-btn" on:click={cargar}>Reintentar</button>
  </div>
{:else}
  <div class="espera" aria-busy="true"><p>Cargando…</p></div>
{/if}

<style>
  .espera {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 16px;
    color: var(--sub-muted, #6b7280);
  }
</style>
