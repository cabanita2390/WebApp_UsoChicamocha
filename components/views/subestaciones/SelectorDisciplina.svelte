<script>
  import { createEventDispatcher } from "svelte";
  import { disciplinaFiltro } from "../../../stores/subestacionesFilters.js";
  import { DISCIPLINAS } from "../../../config/subestaciones.js";

  const dispatch = createEventDispatcher();

  function cambiar(e) {
    disciplinaFiltro.set(e.target.value);
    dispatch("change", e.target.value);
  }
</script>

<select class="sel-disc" value={$disciplinaFiltro} on:change={cambiar} aria-label="Disciplina">
  <option value="">Todas las disciplinas</option>
  {#each DISCIPLINAS as d}<option value={d.value}>{d.label}</option>{/each}
</select>

<style>
  .sel-disc {
    height: 36px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
    min-width: 180px;
  }
</style>
