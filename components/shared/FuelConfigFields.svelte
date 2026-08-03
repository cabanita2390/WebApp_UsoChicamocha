<script>
  // Fragmento reutilizable: Combustible + Consumo estándar + Unidad + Capacidad
  // del tanque, conectado de verdad a asset_fuel_config (mismo backend que
  // "Configurar rendimiento del activo"). Se usa desde Inventario (Vehículos,
  // Motos, Maquinaria) para poder cargar/editar esto sin salir del formulario
  // de alta/edición del activo. Opcional: si no se elige combustible, el resto
  // de campos queda deshabilitado y no se envía nada al backend (el padre
  // decide si llama al endpoint según haya o no fuelTypeDefaultId).
  export let fuelTypeDefaultId = "";
  export let consumoEstandar = "";
  export let unidadConsumo = "";
  export let tanqueCapacidadGal = "";
  export let fuelTypes = [];
  export let disabled = false;
  export let idPrefix = "fuelConfig";
  // Cuál de las 2 unidades válidas se sugiere primero al elegir combustible
  // (el usuario puede cambiarla igual, esto solo decide el default): true para
  // formularios de Maquinaria (horómetro), false para Vehículo/Motocicleta (km).
  export let preferPorHora = false;

  // Misma regla que AssetFuelConfigManagement/AssetFuelConfigService: la
  // unidad solo depende de la familia física del combustible (galón vs m³),
  // no del tipo de activo — un vehículo por horómetro o una máquina por km/gal
  // son casos válidos.
  const UNIDADES_POR_MEDIDA = {
    GALON: [
      { value: "KM_POR_GALON", label: "Km/Gl" },
      { value: "GAL_POR_HORA", label: "Gl/Hr" },
    ],
    M3: [
      { value: "KM_POR_M3", label: "Km/M3" },
      { value: "M3_POR_HORA", label: "M3/Hr" },
    ],
  };

  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: unidadMedidaActual = unidadMedidaById[Number(fuelTypeDefaultId)] ?? null;
  $: unidadesDisponibles = UNIDADES_POR_MEDIDA[unidadMedidaActual] ?? [];

  // Al cambiar de combustible (o quitarlo) se resetea la unidad a la primera
  // válida para la nueva familia — evita quedar con una unidad de otra familia
  // física que el backend rechazaría.
  let unidadMedidaAnterior;
  $: if (unidadMedidaActual !== unidadMedidaAnterior) {
    unidadMedidaAnterior = unidadMedidaActual;
    const preferida = preferPorHora
      ? unidadesDisponibles.find((u) => u.value.endsWith("_POR_HORA"))
      : unidadesDisponibles.find((u) => u.value.startsWith("KM_"));
    unidadConsumo = (preferida ?? unidadesDisponibles[0])?.value ?? "";
  }
</script>

<label class="field" for="{idPrefix}FuelType">
  <span class="field-lab">Combustible</span>
  <select id="{idPrefix}FuelType" bind:value={fuelTypeDefaultId} disabled={disabled}>
    <option value="">— Sin configurar —</option>
    {#each fuelTypes as ft}
      <option value={String(ft.id)}>{ft.nombre}</option>
    {/each}
  </select>
</label>
<label class="field" for="{idPrefix}ConsumoEstandar">
  <span class="field-lab">Consumo estándar</span>
  <input
    id="{idPrefix}ConsumoEstandar"
    type="number"
    step="0.0001"
    min="0.0001"
    bind:value={consumoEstandar}
    placeholder="Ej: 42.5"
    disabled={disabled || !fuelTypeDefaultId}
  />
</label>
{#if unidadesDisponibles.length}
  <label class="field" for="{idPrefix}Unidad">
    <span class="field-lab">Unidad</span>
    <select id="{idPrefix}Unidad" bind:value={unidadConsumo} disabled={disabled}>
      {#each unidadesDisponibles as u}
        <option value={u.value}>{u.label}</option>
      {/each}
    </select>
  </label>
{/if}
<label class="field" for="{idPrefix}TanqueCapacidad">
  <span class="field-lab">Capacidad del tanque (Gal)</span>
  <input
    id="{idPrefix}TanqueCapacidad"
    type="number"
    step="0.001"
    min="0"
    bind:value={tanqueCapacidadGal}
    placeholder="Ej: 18.5"
    disabled={disabled}
  />
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
  .field input,
  .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .field input:disabled,
  .field select:disabled {
    background: #ececec;
    color: #888;
  }
</style>
