<script>
  // Configuración de llantas del activo (asset_llanta_config; en el backend, "perfil").
  // Con configuración, la preoperativa del móvil pide la presión de cada llanta; sin
  // ella no la pide. Las configuraciones se crean en Inventario → Presión de llantas.
  // El padre guarda la asignación aparte del activo (como el consumo estándar de
  // FuelConfigFields), solo si el valor cambió.
  import { formatRango } from "../../lib/presionLlantas.js";

  /** Id del perfil como texto; "" = sin perfil. */
  export let perfilId = "";
  export let profiles = [];
  /** VEHICULO | MOTOCICLETA | MAQUINARIA: solo se ofrecen los perfiles de ese tipo. */
  export let aplicaA = "";
  export let disabled = false;
  export let idPrefix = "tireProfile";

  // Un perfil asignado de otro tipo (p. ej. el vehículo se cambió a moto) sigue
  // apareciendo para que el select no lo pierda en silencio.
  $: opciones = profiles.filter((p) => p.aplicaA === aplicaA || String(p.id) === String(perfilId));
  $: seleccionado = profiles.find((p) => String(p.id) === String(perfilId)) ?? null;
  $: resumen = seleccionado
    ? `${seleccionado.posiciones?.length ?? 0} llantas · ${resumenRango(seleccionado)}`
    : "Sin configuración, la preoperativa no pide la presión de las llantas";

  function resumenRango(perfil) {
    const pos = perfil.posiciones ?? [];
    if (!pos.length) return "sin llantas";
    const min = Math.min(...pos.map((p) => Number(p.psiMin)));
    const max = Math.max(...pos.map((p) => Number(p.psiMax)));
    return formatRango(min, max);
  }
</script>

<label class="field" for="{idPrefix}Select" title={resumen}>
  <span class="field-lab">Presión de llantas</span>
  <select id="{idPrefix}Select" bind:value={perfilId} {disabled}>
    <option value="">— No pedir presión —</option>
    {#each opciones as p (p.id)}
      <option value={String(p.id)}>{p.nombre} · {p.posiciones?.length ?? 0} {p.posiciones?.length === 1 ? "llanta" : "llantas"}</option>
    {/each}
  </select>
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 11px;
  }
  .field-lab {
    font-weight: bold;
    font-size: 10px;
    color: #303030;
    white-space: nowrap;
  }
  .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .field select:disabled {
    background: #ececec;
    color: #888;
  }
</style>
