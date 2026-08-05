<script>
  import { createEventDispatcher } from "svelte";
  import { getFileUrl, openDocumentSafely } from "../../stores/api.js";

  // Formulario de tanqueo (Fase 6: extraído de TanqueoDistribucion.svelte, que
  // tenía este mismo formulario duplicado dos veces — una para "Registrar
  // tanqueo" y otra para "Editar tanqueo", con solo el título/botón distintos.
  // Reusado también por FuelHistory.svelte y FuelPerformance.svelte, que tenían
  // cada una su propia copia parcial (mismo formulario, sin buscador de activo
  // porque ahí el activo ya viene fijo por contexto).
  // `initialRow` es lo único que distingue crear/editar: null = crear, objeto
  // de tanqueo = editar (prefill).
  export let initialRow = null;
  // false en Historial de tanqueos / Rendimiento: el activo no es editable ahí
  // (ya viene fijo por ruta o por la fila de origen), así que se oculta el
  // buscador y el FormData usa initialRow.machineId/vehicleId directamente en
  // vez de form.tipoElemento/elementoId.
  export let assetEditable = true;
  // Texto extra para el título en modo edición, ej. "ABC123 — Toyota" en
  // Historial de tanqueos (queda "Editar tanqueo — ABC123 — Toyota").
  export let titleSuffix = "";
  export let fuelTypes = [];
  export let vehicles = [];
  export let motos = [];
  export let machines = [];
  export let origenesConocidos = [];
  export let elementosCargando = false;
  // async (FormData) => Promise<any> — el padre decide si es createRefueling o
  // updateRefueling(id, ...); este componente solo arma el FormData y muestra
  // el error si la promesa rechaza.
  export let onSubmit;

  const dispatch = createEventDispatcher();

  $: isEdit = initialRow != null;

  function tipoElementoDe(row) {
    if (!row) return "MAQUINARIA";
    if (row.machineId != null) return "MAQUINARIA";
    return motos.some((m) => m.id === row.vehicleId) ? "MOTOCICLETA" : "VEHICULO";
  }

  function buildInitialForm(row) {
    if (!row) {
      return {
        tipoElemento: "MAQUINARIA",
        elementoId: "",
        // Coherente con la sugerencia de lugar por tipo de activo (ver el bloque
        // reactivo más abajo): Máquina/Motocicleta sugieren ALMACEN, Vehículo
        // sugiere BOMBA. Editable — no bloquea el caso real distinto.
        lugar: "ALMACEN",
        areaCosto: "DISTRITO",
        fuelTypeId: "",
        cantidadGalones: "",
        horometroKm: "",
        esFull: false,
        precioUnitario: "",
        descuento: "",
        totalIngresado: "",
        origen: "",
      };
    }
    const idActivo = row.machineId ?? row.vehicleId;
    return {
      tipoElemento: tipoElementoDe(row),
      elementoId: String(idActivo),
      lugar: row.lugar,
      areaCosto: row.areaCosto,
      fuelTypeId: String(row.fuelTypeId),
      cantidadGalones: String(row.cantidadGalones),
      horometroKm: String(row.horometroKm),
      esFull: !!row.esFull,
      precioUnitario: row.precioUnitario != null ? String(row.precioUnitario) : "",
      descuento: row.descuento != null ? String(row.descuento) : "",
      totalIngresado: row.totalIngresado != null ? String(row.totalIngresado) : "",
      origen: row.origen ?? "",
    };
  }

  let form = buildInitialForm(initialRow);
  let facturaFile = null;
  let isSubmitting = false;
  let errorMessage = "";

  // Buscador de elemento (Máquina/Vehículo/Motocicleta) — mismo patrón que el
  // modal "Configurar rendimiento del activo": un solo input, se despliega la
  // lista completa al enfocarlo, filtra al escribir por cualquier campo. La
  // selección final se muestra como placa/marca (o nombre/marca para
  // máquinas), igual que en AssetFuelConfigManagement.svelte.
  let elementoBusqueda = "";
  let elementoSeleccionado = null;
  let elementoDropdownOpen = false;
  let elementoFieldEl;
  let tipoElementoAnterior = form.tipoElemento;

  if (assetEditable && initialRow) {
    const idActivo = initialRow.machineId ?? initialRow.vehicleId;
    const listaDisponible = form.tipoElemento === "MAQUINARIA" ? machines : form.tipoElemento === "MOTOCICLETA" ? motos : vehicles;
    elementoSeleccionado = listaDisponible.find((e) => e.id === idActivo) ?? null;
    const label = form.tipoElemento === "MAQUINARIA" ? "Máquina" : form.tipoElemento === "MOTOCICLETA" ? "Motocicleta" : "Vehículo";
    elementoBusqueda = elementoSeleccionado ? labelElementoLista(elementoSeleccionado, form.tipoElemento) : `${label} #${idActivo}`;
  }

  $: elementoLabel = form.tipoElemento === "MAQUINARIA" ? "Máquina" : form.tipoElemento === "MOTOCICLETA" ? "Motocicleta" : "Vehículo";
  $: elementosDisponibles = form.tipoElemento === "MAQUINARIA" ? machines : form.tipoElemento === "MOTOCICLETA" ? motos : vehicles;
  $: elementosFiltrados = elementosDisponibles.filter((e) =>
    textoBusquedaElemento(e, form.tipoElemento).toLowerCase().includes(elementoBusqueda.trim().toLowerCase())
  );
  $: unidadCantidad = unidadMedidaById[Number(form.fuelTypeId)] === "M3" ? "m³" : "galones";
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));

  $: if (form.tipoElemento !== tipoElementoAnterior) {
    tipoElementoAnterior = form.tipoElemento;
    limpiarSeleccionElemento();
    // Sugerencia de lugar por tipo de activo (motos y máquinas generalmente se
    // tanquean en almacén, vehículos en bomba) — editable, no bloquea al
    // usuario si esta vez sí fue distinto. Solo se aplica si el usuario cambia
    // el tipo de elemento a mano; abrir el modal no la dispara porque
    // tipoElementoAnterior ya queda igualado al valor inicial arriba, así que
    // el lugar real del tanqueo (en edición) no se pisa al precargar.
    form.lugar = form.tipoElemento === "VEHICULO" ? "BOMBA" : "ALMACEN";
  }

  function labelElementoLista(e, tipo) {
    if (!e) return "";
    return tipo === "MAQUINARIA"
      ? `${e.name}${e.brand ? " — " + e.brand : ""}`
      : `${e.placa}${e.marca ? " — " + e.marca : ""}`;
  }

  function textoBusquedaElemento(e, tipo) {
    if (!e) return "";
    return tipo === "MAQUINARIA"
      ? [e.name, e.brand, e.model, e.numInterIdentification].filter(Boolean).join(" ")
      : [e.placa, e.marca, e.modelo, e.tipoVehiculo].filter(Boolean).join(" ");
  }

  function abrirBuscadorElemento() {
    elementoDropdownOpen = true;
    elementoBusqueda = "";
  }

  function seleccionarElemento(e) {
    elementoSeleccionado = e;
    form.elementoId = String(e.id);
    elementoBusqueda = labelElementoLista(e, form.tipoElemento);
    elementoDropdownOpen = false;
  }

  function limpiarSeleccionElemento() {
    elementoSeleccionado = null;
    form.elementoId = "";
    elementoBusqueda = "";
    elementoDropdownOpen = false;
  }

  function cerrarBuscadorElemento() {
    elementoDropdownOpen = false;
    elementoBusqueda = elementoSeleccionado ? labelElementoLista(elementoSeleccionado, form.tipoElemento) : "";
  }

  function handleModalContentClick(event) {
    if (elementoDropdownOpen && elementoFieldEl && !elementoFieldEl.contains(event.target)) {
      cerrarBuscadorElemento();
    }
  }

  function handleFacturaChange(event) {
    facturaFile = event.target.files?.[0] ?? null;
  }

  function handleClose() {
    dispatch("close");
  }

  // Escape cierra el modal — antes de esto no había ninguna forma de cerrar
  // por teclado (el overlay solo respondía a click de mouse). El overlay en sí
  // se deja como decorativo (role="presentation"): el "equivalente de teclado"
  // real es este atajo + el botón "Cancelar"/"×", ya accesibles.
  function handleKeydown(event) {
    if (event.key === "Escape") handleClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (assetEditable && !form.elementoId) {
      errorMessage = `Seleccione ${elementoLabel.toLowerCase()} de la lista.`;
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      const fd = new FormData();
      if (assetEditable) {
        if (form.tipoElemento === "MAQUINARIA") {
          fd.append("machineId", form.elementoId);
        } else {
          fd.append("vehicleId", form.elementoId);
        }
      } else if (initialRow.machineId != null) {
        fd.append("machineId", String(initialRow.machineId));
      } else {
        fd.append("vehicleId", String(initialRow.vehicleId));
      }
      fd.append("lugar", form.lugar);
      fd.append("areaCosto", form.areaCosto);
      fd.append("fuelTypeId", form.fuelTypeId);
      fd.append("cantidadGalones", form.cantidadGalones);
      fd.append("horometroKm", form.horometroKm);
      fd.append("esFull", String(form.esFull));
      if (form.lugar === "BOMBA") {
        fd.append("precioUnitario", form.precioUnitario);
        if (form.descuento) fd.append("descuento", form.descuento);
        fd.append("totalIngresado", form.totalIngresado);
        if (facturaFile) fd.append("factura", facturaFile);
      }
      if (form.origen) fd.append("origen", form.origen);

      await onSubmit(fd);
      dispatch("success");
    } catch (e) {
      errorMessage = e.message || `Error al ${isEdit ? "actualizar" : "registrar"} el tanqueo.`;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" role="presentation" on:click={handleClose}>
  <div
    class="modal-content"
    role="dialog"
    aria-modal="true"
    aria-label={isEdit ? "Editar tanqueo" : undefined}
    on:click|stopPropagation={handleModalContentClick}
  >
    <div class="modal-header">
      <h3>{isEdit ? "Editar tanqueo" : "Registrar tanqueo"}{isEdit && titleSuffix ? ` — ${titleSuffix}` : ""}</h3>
      <button type="button" class="close-btn" on:click={handleClose}>×</button>
    </div>
    <form aria-label={isEdit ? "Editar tanqueo" : "Registrar tanqueo"} class="create-form" on:submit={handleSubmit}>
      {#if assetEditable}
        <div class="form-row">
          <label class="field" for="tipoElemento">
            <span class="field-lab">Tipo de elemento</span>
            <select id="tipoElemento" bind:value={form.tipoElemento} disabled={isSubmitting}>
              <option value="MAQUINARIA">Maquinaria</option>
              <option value="VEHICULO">Vehículo</option>
              <option value="MOTOCICLETA">Motocicleta</option>
            </select>
          </label>
          <div class="field" bind:this={elementoFieldEl}>
            <span class="field-lab">{elementoLabel}</span>
            <div class="activo-combo">
              <input
                type="text"
                autocomplete="off"
                aria-label={`Buscar ${elementoLabel.toLowerCase()}`}
                bind:value={elementoBusqueda}
                on:focus={abrirBuscadorElemento}
                placeholder="Escribe o haz clic para ver opciones..."
                disabled={isSubmitting}
              />
              {#if elementoDropdownOpen}
                <ul class="activo-lista">
                  {#if elementosCargando}
                    <li class="activo-vacio">Cargando...</li>
                  {:else}
                    {#each elementosFiltrados as elemento_ (elemento_.id)}
                      <li>
                        <button type="button" class="activo-opcion" on:click={() => seleccionarElemento(elemento_)}>
                          {labelElementoLista(elemento_, form.tipoElemento)}
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
        </div>
      {/if}
      <div class="form-row">
        <label class="field" for="lugar">
          <span class="field-lab">Lugar</span>
          <select id="lugar" bind:value={form.lugar} disabled={isSubmitting}>
            <option value="BOMBA">Bomba</option>
            <option value="ALMACEN">Almacén</option>
          </select>
        </label>
        <label class="field" for="areaCosto">
          <span class="field-lab">Área de costo</span>
          <select id="areaCosto" bind:value={form.areaCosto} disabled={isSubmitting}>
            <option value="DISTRITO">Distrito</option>
            <option value="ASOCIACION">Asociación</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label class="field" for="fuelTypeId">
          <span class="field-lab">Combustible</span>
          <select id="fuelTypeId" bind:value={form.fuelTypeId} required disabled={isSubmitting}>
            <option value="" disabled>Seleccione...</option>
            {#each fuelTypes as ft}
              <option value={String(ft.id)}>{ft.nombre}</option>
            {/each}
          </select>
        </label>
        <label class="field" for="cantidadGalones">
          <span class="field-lab">Cantidad ({unidadCantidad})</span>
          <input id="cantidadGalones" type="number" step="0.001" bind:value={form.cantidadGalones} required disabled={isSubmitting} />
        </label>
      </div>
      <div class="form-row form-row--align-center">
        <label class="field" for="horometroKm">
          <span class="field-lab">Horómetro/Km</span>
          <input id="horometroKm" type="number" step="0.01" bind:value={form.horometroKm} required disabled={isSubmitting} />
        </label>
        <label class="field field--checkbox" for="esFull">
          <input id="esFull" type="checkbox" bind:checked={form.esFull} disabled={isSubmitting} />
          <span class="field-lab">¿Tanque lleno?</span>
        </label>
      </div>
      {#if form.lugar === "BOMBA"}
        <div class="form-row">
          <label class="field" for="precioUnitario">
            <span class="field-lab">Precio unitario</span>
            <input id="precioUnitario" type="number" step="0.01" bind:value={form.precioUnitario} required disabled={isSubmitting} />
          </label>
          <label class="field" for="descuento">
            <span class="field-lab">Descuento (opcional)</span>
            <input id="descuento" type="number" step="0.01" bind:value={form.descuento} disabled={isSubmitting} />
          </label>
        </div>
        <div class="form-row">
          <label class="field" for="totalIngresado">
            <span class="field-lab">Total pagado (valor real)</span>
            <input id="totalIngresado" type="number" step="0.01" bind:value={form.totalIngresado} required disabled={isSubmitting} />
            {#if !isEdit}
              <span class="field-hint">Lo que realmente pagaste, no un estimado</span>
            {/if}
          </label>
          <label class="field" for="origen">
            <span class="field-lab">Origen</span>
            <input id="origen" list="origenesList" type="text" bind:value={form.origen} placeholder="Elige o escribe uno nuevo" disabled={isSubmitting} />
          </label>
        </div>
        <label class="field field--file" for="factura">
          <span class="field-lab">
            Factura{isEdit ? (initialRow?.urlFactura ? " (opcional, mantiene la actual si no se adjunta)" : " (opcional)") : " (opcional)"}
            {#if isEdit && initialRow?.urlFactura}
              <a
                href={getFileUrl(initialRow.urlFactura)}
                target="_blank"
                rel="noopener noreferrer"
                class="factura-actual-link"
                on:click|preventDefault={() => openDocumentSafely(getFileUrl(initialRow.urlFactura))}
              >
                Ver factura actual
              </a>
            {/if}
          </span>
          <div class="dropzone">
            <input id="factura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleFacturaChange} disabled={isSubmitting} />
            <div class="dropzone-content">
              <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v12" />
                <path d="M7 8l5-5 5 5" />
                <path d="M5 21h14" />
              </svg>
              {#if facturaFile}
                <span class="dropzone-title">{facturaFile.name}</span>
                <span class="dropzone-hint">Haz clic para cambiar el archivo</span>
              {:else}
                <span class="dropzone-title">Arrastra la factura aquí o haz clic</span>
                <span class="dropzone-hint">PDF, JPG o PNG</span>
              {/if}
            </div>
          </div>
        </label>
      {:else}
        <label class="field" for="origen">
          <span class="field-lab">Origen</span>
          <input id="origen" list="origenesList" type="text" bind:value={form.origen} placeholder="Elige o escribe uno nuevo" disabled={isSubmitting} />
        </label>
      {/if}
      <datalist id="origenesList">
        {#each origenesConocidos as o}
          <option value={o} />
        {/each}
      </datalist>
      <div class="create-actions">
        <button type="button" class="btn-cancel" on:click={handleClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" class="btn-create" disabled={isSubmitting}>
          {#if isSubmitting}
            {isEdit ? "Guardando..." : "Registrando..."}
          {:else}
            {isEdit ? "Guardar cambios" : "Registrar tanqueo"}
          {/if}
        </button>
      </div>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
  </div>
</div>

<style>
  /* Modal moderno — mismo patrón que AssetFuelConfigManagement.svelte. */
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
    overflow: auto;
  }
  .modal-content {
    --surface: #ffffff;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    background: #fff;
    padding: 32px;
    border-radius: 20px;
    width: 560px;
    max-width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
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
    flex-direction: column;
  }
  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .form-row .field {
    flex: 1;
  }
  .form-row--align-center {
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .factura-actual-link {
    margin-left: 8px;
    font-weight: 600;
    color: #2a78d6;
    text-decoration: none;
  }
  .factura-actual-link:hover {
    text-decoration: underline;
  }
  .field--checkbox {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    margin-top: 18px;
  }
  .field--file {
    margin-bottom: 24px;
  }
  .dropzone {
    position: relative;
    border: 2px dashed rgba(11, 11, 11, 0.15);
    border-radius: 14px;
    background: #fafaf9;
    padding: 26px 16px;
    text-align: center;
    transition: border-color 0.15s, background 0.15s;
  }
  .dropzone:hover {
    border-color: #2a78d6;
    background: #f5f8fd;
  }
  .field--file .dropzone input[type="file"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }
  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  .dropzone-icon {
    width: 22px;
    height: 22px;
    color: #2a78d6;
  }
  .dropzone-title {
    font-size: 12.5px;
    font-weight: 600;
    color: #0b0b0b;
  }
  .dropzone-hint {
    font-size: 10.5px;
    color: #898781;
  }
  .create-form .field input:not([type="checkbox"]):not([type="file"]),
  .create-form .field select {
    border-radius: 12px;
    padding: 10px 14px;
    box-sizing: border-box;
    width: 100%;
    /* --border (rgba(11,11,11,0.08)) fue calibrado para la página gris del
       fondo del reporte — dentro del modal (fondo blanco) queda casi invisible,
       así que aquí se refuerza el contraste. */
    border-color: rgba(11, 11, 11, 0.18);
  }
  .field-hint {
    font-size: 10px;
    color: var(--ink-muted);
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
  .btn-create {
    font-family: inherit;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-create:hover {
    background: #256abf;
  }
  .btn-create:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-message {
    color: #d03b3b;
    font-size: 12px;
    margin: 10px 0 0;
  }
</style>
