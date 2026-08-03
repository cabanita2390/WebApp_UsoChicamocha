<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { data } from "../../stores/data.js";

  const dispatch = createEventDispatcher();

  const UNIDAD_VEHICULO = { GALON: "KM_POR_GALON", M3: "KM_POR_M3" };
  const UNIDAD_MAQUINA = { GALON: "GAL_POR_HORA", M3: "M3_POR_HORA" };

  const initialState = {
    // Sin tipo preseleccionado: nada se carga hasta que el usuario elige uno,
    // así el buscador de abajo tampoco precarga contenido innecesario.
    tipoActivo: "",
    activoId: "",
    fuelTypeDefaultId: "",
    consumoEstandar: "",
    tanqueCapacidadGal: "",
  };
  let form = { ...initialState };
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = true;

  // Buscador de activo — reemplaza el "Id del activo" a mano. Un solo input
  // (como el mockup de Tanqueo/la app móvil): vacío con placeholder cuando no
  // hay selección, o con el activo elegido cuando sí la hay. Al enfocarlo se
  // despliega la lista completa (con scroll); escribir filtra en vivo.
  let activoBusqueda = "";
  let activoSeleccionado = null;
  let activoDropdownOpen = false;
  let activoFieldEl;
  let tipoActivoAnterior = form.tipoActivo;
  // Distingue "todavía no llega" de "de verdad no hay resultados" — solo se
  // enciende si tuvimos que pedir la lista (ver onMount, no se repite si ya
  // estaba cargada por otra vista, ej. Inventario).
  let activosCargando = false;

  // Unidad de consumo editable — se auto-sugiere la calculada, pero el usuario
  // puede cambiarla (ej. pasar de GAL_POR_HORA a otra) sin que sea obligatorio.
  let unidadSeleccionada = null;
  let unidadSugeridaAnterior = null;
  // value = lo que el backend espera literalmente (CHECK de la BD +
  // AssetFuelConfigService); label = texto corto para el select. El backend
  // ya no restringe por tipo de activo, solo por la familia física del
  // combustible — un vehículo diésel por horómetro o una máquina por km/gal
  // son casos válidos, así que ambas unidades de esa familia quedan elegibles.
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

  $: fuelTypes = $data.fuelTypes ?? [];
  // GET /vehicle no filtra por tipo — trae motos también, porque viven en la
  // misma tabla vehiculos (confirmado en el backend). GET /moto sí filtra
  // correctamente solo motos, por eso "motos" no necesita este mismo filtro.
  $: vehicles = ($data.vehicles ?? []).filter(
    (v) => (v.tipoVehiculo ?? "").toUpperCase() !== "MOTOCICLETA",
  );
  $: motos = $data.motos ?? [];
  $: machines = $data.machines ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(
    fuelTypes.map((t) => [t.id, t.unidadMedida]),
  );

  $: unidadCalculada = calcularUnidad(
    form.tipoActivo,
    unidadMedidaById[Number(form.fuelTypeDefaultId)],
  );
  // Las 2 unidades válidas para el combustible elegido (no las 4 ni una sola)
  // — el usuario puede elegir cualquiera de las dos, ambas las acepta el backend.
  $: unidadesDisponibles = UNIDADES_POR_MEDIDA[unidadMedidaById[Number(form.fuelTypeDefaultId)]] ?? [];

  // Motocicletas viven en la misma tabla que vehículos en el backend (arco
  // exclusivo vehicle_id/machine_id) — comparten unidad de consumo y endpoint.
  function calcularUnidad(tipoActivo, unidadMedida) {
    if (!tipoActivo || !unidadMedida) return null;
    return tipoActivo === "MAQUINA"
      ? UNIDAD_MAQUINA[unidadMedida]
      : UNIDAD_VEHICULO[unidadMedida];
  }

  $: tipoActivoLabel =
    form.tipoActivo === "MAQUINA"
      ? "Máquina"
      : form.tipoActivo === "MOTOCICLETA"
        ? "Motocicleta"
        : form.tipoActivo === "VEHICULO"
          ? "Vehículo"
          : "";
  $: activosDisponibles =
    form.tipoActivo === "MAQUINA"
      ? machines
      : form.tipoActivo === "MOTOCICLETA"
        ? motos
        : vehicles;
  $: activosFiltrados = activosDisponibles.filter((a) =>
    textoBusquedaActivo(a)
      .toLowerCase()
      .includes(activoBusqueda.trim().toLowerCase()),
  );

  // Al cambiar el tipo de activo se limpia la selección previa (y se cierra el
  // buscador otra vez) — un vehículo elegido no tiene sentido si el usuario
  // pasó a Máquina.
  $: if (form.tipoActivo !== tipoActivoAnterior) {
    tipoActivoAnterior = form.tipoActivo;
    limpiarSeleccionActivo();
  }

  // La sugerencia se vuelve a aplicar SOLO cuando cambia de verdad (tipo o
  // combustible) — comparando contra el valor anterior en vez de reasignar
  // directo, así no se pisa una elección manual del usuario cada vez que
  // cambia cualquier otra cosa del formulario (seleccionar activo, escribir
  // consumo estándar, etc. también invalidan `form` en Svelte).
  $: if (unidadCalculada !== unidadSugeridaAnterior) {
    unidadSugeridaAnterior = unidadCalculada;
    unidadSeleccionada = unidadCalculada;
  }

  // Texto visible: se mantiene simple/limpio (placa — marca, nombre — marca).
  function labelActivo(activo) {
    if (!activo) return "";
    return form.tipoActivo === "MAQUINA"
      ? `${activo.name}${activo.brand ? " — " + activo.brand : ""}`
      : `${activo.placa}${activo.marca ? " — " + activo.marca : ""}`;
  }

  // Texto de búsqueda: incluye campos que no se muestran (modelo, tipo de
  // vehículo, número de identificación) para poder filtrar "por cualquier
  // contenido", sin ensuciar la etiqueta visible con esos mismos campos.
  function textoBusquedaActivo(activo) {
    if (!activo) return "";
    return form.tipoActivo === "MAQUINA"
      ? [activo.name, activo.brand, activo.model, activo.numInterIdentification]
          .filter(Boolean)
          .join(" ")
      : [activo.placa, activo.marca, activo.modelo, activo.tipoVehiculo]
          .filter(Boolean)
          .join(" ");
  }

  // Al enfocar el input siempre se abre con búsqueda en blanco — muestra
  // todos los elementos de una vez, igual que el mockup y el picker móvil.
  function abrirBuscadorActivo() {
    activoDropdownOpen = true;
    activoBusqueda = "";
  }

  function seleccionarActivo(activo) {
    activoSeleccionado = activo;
    form.activoId = String(activo.id);
    activoBusqueda = labelActivo(activo);
    activoDropdownOpen = false;
  }

  function limpiarSeleccionActivo() {
    activoSeleccionado = null;
    form.activoId = "";
    activoBusqueda = "";
    activoDropdownOpen = false;
  }

  // Cierra sin elegir nada: si ya había una selección, el input vuelve a
  // mostrarla (no se queda en blanco solo porque se abrió a mirar).
  function cerrarBuscadorActivo() {
    activoDropdownOpen = false;
    activoBusqueda = activoSeleccionado ? labelActivo(activoSeleccionado) : "";
  }

  // Un click dentro del modal pero fuera del buscador lo cierra sin
  // seleccionar nada (como un select nativo). El overlay ya tiene su propio
  // stopPropagation, así que este chequeo vive aquí, no en window.
  function handleModalContentClick(event) {
    if (
      activoDropdownOpen &&
      activoFieldEl &&
      !activoFieldEl.contains(event.target)
    ) {
      cerrarBuscadorActivo();
    }
  }

  function closeModal() {
    showModal = false;
    dispatch("close");
  }

  onMount(() => {
    data.fetchFuelTypes();
    // Reutiliza lo que ya haya cargado otra vista (ej. Inventario de
    // Vehículos/Máquinas) — solo pide lo que todavía no está en el store, para
    // no generar peticiones ni recargas innecesarias.
    // Ojo: se revisa $data.vehicles (crudo, sin filtrar motos) — "vehicles" ya
    // viene filtrado y podría dar longitud 0 aunque el store sí tenga datos.
    const pendientes = [];
    if (!$data.vehicles?.length) pendientes.push(data.fetchVehicles());
    if (!motos.length) pendientes.push(data.fetchMotos());
    if (!machines.length) pendientes.push(data.fetchMachines());
    if (pendientes.length) {
      activosCargando = true;
      Promise.allSettled(pendientes).finally(() => {
        activosCargando = false;
      });
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.tipoActivo) {
      errorMessage = "Seleccione un tipo de activo.";
      return;
    }
    if (!form.activoId) {
      errorMessage = `Seleccione ${tipoActivoLabel.toLowerCase()} de la lista.`;
      return;
    }
    if (Number(form.consumoEstandar) <= 0) {
      errorMessage = "Consumo estándar debe ser mayor a 0.";
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      const payload = {
        fuelTypeDefaultId: Number(form.fuelTypeDefaultId),
        consumoEstandar: Number(form.consumoEstandar),
        unidadConsumo: unidadSeleccionada,
        tanqueCapacidadGal: form.tanqueCapacidadGal
          ? Number(form.tanqueCapacidadGal)
          : null,
      };
      if (form.tipoActivo === "MAQUINA") {
        await data.updateAssetFuelConfigMachine(Number(form.activoId), payload);
      } else {
        await data.updateAssetFuelConfigVehicle(Number(form.activoId), payload);
      }
      form = { ...initialState };
      limpiarSeleccionActivo();
      closeModal();
    } catch (e) {
      errorMessage = e.message || "Error al guardar la configuración.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      on:click|stopPropagation={handleModalContentClick}
    >
      <div class="modal-header">
        <h3>Configurar Rendimiento Del Activo</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form
        aria-label="Configurar Rendimiento Del Activo"
        class="create-form two-column-grid"
        on:submit={handleSubmit}
      >
        <div class="grid-fields">
          <label class="field" for="tipoActivo">
            <span class="field-lab">Tipo De Activo</span>
            <select
              id="tipoActivo"
              bind:value={form.tipoActivo}
              disabled={isSubmitting}
            >
              <option value="" disabled>Seleccione...</option>
              <option value="VEHICULO">Vehículo</option>
              <option value="MOTOCICLETA">Motocicleta</option>
              <option value="MAQUINA">Máquina</option>
            </select>
          </label>

          {#if form.tipoActivo}
            <div class="field" bind:this={activoFieldEl}>
              <div class="activo-combo">
                <span class="field-lab">{tipoActivoLabel}</span>
                <input
                  type="text"
                  autocomplete="off"
                  aria-label={`Buscar ${tipoActivoLabel.toLowerCase()}`}
                  bind:value={activoBusqueda}
                  on:focus={abrirBuscadorActivo}
                  placeholder="Escribe o haz clic para ver opciones..."
                  disabled={isSubmitting}
                />
                {#if activoDropdownOpen}
                  <ul class="activo-lista">
                    {#if activosCargando}
                      <li class="activo-vacio">Cargando...</li>
                    {:else}
                      {#each activosFiltrados as activo (activo.id)}
                        <li>
                          <button
                            type="button"
                            class="activo-opcion"
                            on:click={() => seleccionarActivo(activo)}
                          >
                            {labelActivo(activo)}
                          </button>
                        </li>
                      {:else}
                        <li class="activo-vacio">Sin resultados</li>
                      {/each}
                    {/if}
                  </ul>
                {/if}
              </div>
            </div>
          {/if}

          <label class="field" for="fuelTypeDefaultId">
            <span class="field-lab">Combustible</span>
            <select
              id="fuelTypeDefaultId"
              bind:value={form.fuelTypeDefaultId}
              required
              disabled={isSubmitting}
            >
              <option value="" disabled>Seleccione...</option>
              {#each fuelTypes as ft}
                <option value={String(ft.id)}>{ft.nombre}</option>
              {/each}
            </select>
          </label>

          <label class="field" for="consumoEstandar">
            <span class="field-lab">Consumo Estándar</span>
            <input
              id="consumoEstandar"
              type="number"
              step="0.0001"
              min="0.0001"
              bind:value={form.consumoEstandar}
              required
              disabled={isSubmitting}
            />
          </label>

          <label class="field" for="unidadConsumo">
            <span class="field-lab">Unidad De Consumo</span>
            <select
              id="unidadConsumo"
              bind:value={unidadSeleccionada}
              disabled={isSubmitting}
            >
              {#each unidadesDisponibles as u}
                <option value={u.value}>{u.label}</option>
              {/each}
            </select>
          </label>

          <label class="field" for="tanqueCapacidadGal">
            <span class="field-lab">Capacidad Del Tanque (gal)</span>
            <input
              id="tanqueCapacidadGal"
              type="number"
              step="0.01"
              bind:value={form.tanqueCapacidadGal}
              disabled={isSubmitting}
            />
          </label>
        </div>
        <div class="create-actions">
          <button
            type="button"
            class="btn-cancel"
            on:click={closeModal}
            disabled={isSubmitting}>Cancelar</button
          >
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

<style>
  .two-column-grid .grid-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px 22px;
  }

  .two-column-grid .grid-fields .field.full {
    grid-column: 1 / -1;
  }
  /* Acciones debajo, fuera del grid */
  .two-column-grid .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 14px;
    margin-top: 30px;
  }
  /* Que no pise estilos heredados */
  .two-column-grid label.field,
  .two-column-grid .field {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .btn-create {
    font-family: inherit;
    padding: 9px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }
  .btn-create:hover {
    background: #256abf;
  }
  .btn-create:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Modal moderno — Combustibles ya no usa el estilo retro en sus formularios,
     siguiendo la propuesta de diseño (ver conversación de rediseño). */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(11, 11, 11, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 24px;
  }
  .modal-content {
    background: #fff;
    padding: 32px;
    border-radius: 20px;
    width: 440px;
    max-width: 100%;
    max-height: 9 0vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family:
      system-ui,
      -apple-system,
      "Segoe UI",
      sans-serif;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0b0b0b;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: #898781;
    cursor: pointer;
  }
  .create-form {
    display: flex;
    flex-direction: row;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
    font-size: 13px;
    width: 100%;
    height: 50px;
  }
  .create-form {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
  }
  .field-half {
    width: 48%;
  }

  .field-lab {
    font-weight: 500;
    font-size: 12px;
    color: #52514e;
  }
  .field input,
  .field select {
    font-family: inherit;
    box-sizing: border-box;
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 12px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .activo-combo {
    position: relative;
  }
  .activo-lista {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 20;
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 160px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(11, 11, 11, 0.12);
  }
  .activo-opcion {
    display: block;
    width: 100%;
    text-align: left;
    font-family: inherit;
    font-size: 13px;
    padding: 9px 14px;
    background: #fff;
    border: none;
    border-bottom: 1px solid rgba(11, 11, 11, 0.06);
    cursor: pointer;
    color: #0b0b0b;
  }
  .activo-opcion:hover {
    background: #f0f0ef;
  }
  li:last-child .activo-opcion {
    border-bottom: none;
  }
  .activo-vacio {
    padding: 9px 14px;
    font-size: 12px;
    color: #898781;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .btn-cancel {
    font-family: inherit;
    background: #f0f0ef;
    color: #52514e;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-cancel:hover {
    background: #e4e4e2;
  }
  .error-message {
    color: #d03b3b;
    font-size: 12px;
    margin: 10px 0 0;
  }
</style>
