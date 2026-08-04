<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { fuelDateRange } from "../../stores/fuelFilters.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import { createRefuelingColumns } from "../../config/table-definitions.js";

  const ACCENT_BLUE = "#2a78d6";

  let area = "TODAS";
  // Bomba=Vehículos y Almacén=Maquinaria+Motocicletas siempre (regla real de la
  // empresa) — agrupar por tipo de activo es la misma partición que agrupar por
  // lugar, con mejor lectura. Reemplaza el agrupado Bomba/Almacén.
  let tipo = "VEHICULO";

  // Modal "Registrar tanqueo" — mismo form/reglas que tenía el antiguo
  // RefuelingManagement.svelte (ya eliminado, sin uso tras esta fusión; BPMN
  // pág. 1), solo que embebido aquí y con estilo moderno en vez de retro,
  // siguiendo la misma excepción ya aplicada al modal de Configurar consumo.
  const initialForm = {
    tipoElemento: "MAQUINARIA",
    elementoId: "",
    // Coherente con la sugerencia de lugar por tipo de activo (ver el bloque
    // reactivo más abajo): Máquina/Motocicleta sugieren ALMACEN, Vehículo sugiere
    // BOMBA. Editable — no bloquea el caso real distinto.
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
  let form = { ...initialForm };
  let facturaFile = null;
  let isSubmitting = false;
  let errorMessage = "";
  let showModal = false;

  // Buscador de elemento (Máquina/Vehículo/Motocicleta) — mismo patrón que el
  // modal "Configurar rendimiento del activo": un solo input, se despliega la
  // lista completa al enfocarlo, filtra al escribir por cualquier campo. La
  // selección final se muestra como placa/marca (o nombre/marca para
  // máquinas), igual que en AssetFuelConfigManagement.svelte — más legible
  // que el "Tipo #id" que se usaba antes.
  let elementoBusqueda = "";
  let elementoSeleccionado = null;
  let elementoDropdownOpen = false;
  let elementoFieldEl;
  let tipoElementoAnterior = form.tipoElemento;
  let elementosCargando = false;

  // Modal "Editar tanqueo" — edición completa (incluye activo y lugar, a
  // diferencia de la regla original que solo permitía corregir campos "seguros"):
  // mismo patrón de buscador de un solo input que "Registrar tanqueo", pero con
  // su propio juego de variables para no interferir con el modal de creación.
  const emptyEditForm = {
    tipoElemento: "MAQUINARIA",
    elementoId: "",
    lugar: "BOMBA",
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
  let editForm = { ...emptyEditForm };
  let editingId = null;
  let editOriginalUrlFactura = null;
  let editFacturaFile = null;
  let editIsSubmitting = false;
  let editErrorMessage = "";
  let showEditModal = false;
  let editElementoBusqueda = "";
  let editElementoSeleccionado = null;
  let editElementoDropdownOpen = false;
  let editElementoFieldEl;
  let editTipoElementoAnterior = editForm.tipoElemento;
  let refuelingToDelete = null;

  $: editElementoLabel = editForm.tipoElemento === "MAQUINARIA" ? "Máquina" : editForm.tipoElemento === "MOTOCICLETA" ? "Motocicleta" : "Vehículo";
  $: editElementosDisponibles = editForm.tipoElemento === "MAQUINARIA" ? machines : editForm.tipoElemento === "MOTOCICLETA" ? motos : vehicles;
  $: editElementosFiltrados = editElementosDisponibles.filter((e) =>
    textoBusquedaElemento(e, editForm.tipoElemento).toLowerCase().includes(editElementoBusqueda.trim().toLowerCase())
  );
  $: editUnidadCantidad = unidadMedidaById[Number(editForm.fuelTypeId)] === "M3" ? "m³" : "galones";
  // Solo hay factura obligatoria en la edición si el tanqueo no era BOMBA todavía
  // (ALMACEN nunca tiene url_factura real) y no se adjuntó una nueva en el form.

  $: if (editForm.tipoElemento !== editTipoElementoAnterior) {
    editTipoElementoAnterior = editForm.tipoElemento;
    limpiarSeleccionElementoEdit();
    // Misma sugerencia editable que en "Registrar tanqueo" — solo se aplica si el
    // usuario cambia el tipo de elemento a mano; abrir el modal no la dispara
    // (editTipoElementoAnterior ya queda igualado a editForm.tipoElemento en
    // openEditModal, así que el lugar real del tanqueo no se pisa al precargar).
    editForm.lugar = editForm.tipoElemento === "VEHICULO" ? "BOMBA" : "ALMACEN";
  }

  $: isLoading = $data.isLoading;
  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: vehiculosById = Object.fromEntries(($data.vehicles ?? []).map((v) => [v.id, v]));
  $: machinesById = Object.fromEntries(($data.machines ?? []).map((m) => [m.id, m]));
  $: resumenColumns = createRefuelingColumns(fuelTypesById, unidadMedidaById, vehiculosById, machinesById, isAdmin, true);
  // GET /vehicle no filtra por tipo — trae motos también (viven en la misma
  // tabla vehiculos). GET /moto sí filtra correctamente solo motos.
  $: vehicles = ($data.vehicles ?? []).filter((v) => (v.tipoVehiculo ?? "").toUpperCase() !== "MOTOCICLETA");
  $: motos = $data.motos ?? [];
  $: machines = $data.machines ?? [];
  $: elementoLabel = form.tipoElemento === "MAQUINARIA" ? "Máquina" : form.tipoElemento === "MOTOCICLETA" ? "Motocicleta" : "Vehículo";
  $: elementosDisponibles = form.tipoElemento === "MAQUINARIA" ? machines : form.tipoElemento === "MOTOCICLETA" ? motos : vehicles;
  $: elementosFiltrados = elementosDisponibles.filter((e) =>
    textoBusquedaElemento(e, form.tipoElemento).toLowerCase().includes(elementoBusqueda.trim().toLowerCase())
  );
  $: unidadCantidad = unidadMedidaById[Number(form.fuelTypeId)] === "M3" ? "m³" : "galones";
  // Sugerencias del datalist de Origen: valores ya usados en el rango
  // filtrado — "elige o escribe uno nuevo", no una lista cerrada.
  $: origenesConocidos = [...new Set(reporte.map((r) => r.origen).filter(Boolean))];

  $: if (form.tipoElemento !== tipoElementoAnterior) {
    tipoElementoAnterior = form.tipoElemento;
    limpiarSeleccionElemento();
    // Sugerencia de lugar por tipo de activo (motos y máquinas generalmente se
    // tanquean en almacén, vehículos en bomba) — editable, no bloquea al usuario
    // si esta vez sí fue distinto (ver RefuelingReportService: el reporte agrupa
    // por el lugar real, no por este tipo, así que la excepción queda reflejada).
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

  // isAnomaly activa el resaltado de fila que DataGrid ya soporta (mismo patrón
  // que FuelPerformance.svelte) — combina las 4 discrepancias ya calculadas por el
  // backend: financiera, capacidad de tanque excedida (AssetFuelCapacityService),
  // cantidad fuera de rango típico para el tipo de activo (mismo servicio) y precio
  // unitario fuera de rango vs el promedio reciente (FuelPriceAnomalyService).
  $: reporte = ($data.fuelRefuelingReport ?? []).map((row) => ({
    ...row,
    isAnomaly: !!row.discrepanciaValor || !!row.capacidadExcedida
      || !!row.cantidadFueraDeRango || !!row.precioFueraDeRango,
  }));
  // Colapsa a 1 fila por activo = su tanqueo más reciente dentro del rango
  // filtrado (si un activo no tanqueó en el rango, no aparece). La clave usa un
  // prefijo M-/V- porque un machineId y un vehicleId pueden coincidir numéricamente
  // sin ser el mismo activo.
  $: resumenPorActivo = Object.values(
    reporte.reduce((acc, row) => {
      const key = row.machineId != null ? `M-${row.machineId}` : `V-${row.vehicleId}`;
      if (!acc[key] || new Date(row.fechaRegistro) > new Date(acc[key].fechaRegistro)) {
        acc[key] = row;
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  // Paginación 100% client-side: el reporte ya trae todos los activos del rango
  // de una vez (sin paginar en el backend, igual que Rendimiento/Distribución),
  // así que solo hace falta recortar lo que se le pasa al DataGrid.
  let resumenPage = 0;
  let resumenPageSize = 20;
  $: resumenTotalPages = Math.max(1, Math.ceil(resumenPorActivo.length / resumenPageSize));
  $: resumenPageRows = resumenPorActivo.slice(resumenPage * resumenPageSize, (resumenPage + 1) * resumenPageSize);

  function handleResumenPageChange(event) {
    resumenPage = event.detail;
  }

  function handleResumenSizeChange(event) {
    resumenPageSize = event.detail;
    resumenPage = 0;
  }

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    // Reutiliza lo que ya haya cargado otra vista (ej. Inventario) — solo
    // pide lo que todavía no está en el store.
    const pendientes = [];
    if (!$data.vehicles?.length) pendientes.push(data.fetchVehicles());
    if (!motos.length) pendientes.push(data.fetchMotos());
    if (!machines.length) pendientes.push(data.fetchMachines());
    if (pendientes.length) {
      elementosCargando = true;
      Promise.allSettled(pendientes).finally(() => {
        elementosCargando = false;
      });
    }
  });

  function handleFiltrar() {
    resumenPage = 0;
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function seleccionarTipo(nuevoTipo) {
    tipo = nuevoTipo;
    resumenPage = 0;
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function handleResumenAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") openEditModal(row);
    else if (type === "delete") refuelingToDelete = row;
    else if (type === "viewHistory") abrirHistorialActivo(row);
  }

  function abrirHistorialActivo(row) {
    const tipoActivo = row.machineId != null
      ? "MAQUINARIA"
      : motos.some((m) => m.id === row.vehicleId)
        ? "MOTOCICLETA"
        : "VEHICULO";
    const idActivo = row.machineId ?? row.vehicleId;
    push(`/fuel-history/${tipoActivo}/${idActivo}`);
  }

  function abrirBuscadorElementoEdit() {
    editElementoDropdownOpen = true;
    editElementoBusqueda = "";
  }

  function seleccionarElementoEdit(e) {
    editElementoSeleccionado = e;
    editForm.elementoId = String(e.id);
    editElementoBusqueda = labelElementoLista(e, editForm.tipoElemento);
    editElementoDropdownOpen = false;
  }

  function limpiarSeleccionElementoEdit() {
    editElementoSeleccionado = null;
    editForm.elementoId = "";
    editElementoBusqueda = "";
    editElementoDropdownOpen = false;
  }

  function cerrarBuscadorElementoEdit() {
    editElementoDropdownOpen = false;
    editElementoBusqueda = editElementoSeleccionado ? labelElementoLista(editElementoSeleccionado, editForm.tipoElemento) : "";
  }

  function handleEditModalContentClick(event) {
    if (editElementoDropdownOpen && editElementoFieldEl && !editElementoFieldEl.contains(event.target)) {
      cerrarBuscadorElementoEdit();
    }
  }

  function openEditModal(row) {
    editErrorMessage = "";
    editingId = row.id;
    editOriginalUrlFactura = row.urlFactura;
    const tipoElemento = row.machineId != null
      ? "MAQUINARIA"
      : motos.some((m) => m.id === row.vehicleId)
        ? "MOTOCICLETA"
        : "VEHICULO";
    const idActivo = row.machineId ?? row.vehicleId;
    editForm = {
      tipoElemento,
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
    editTipoElementoAnterior = tipoElemento;
    const listaDisponible = tipoElemento === "MAQUINARIA" ? machines : tipoElemento === "MOTOCICLETA" ? motos : vehicles;
    editElementoSeleccionado = listaDisponible.find((e) => e.id === idActivo) ?? null;
    const label = tipoElemento === "MAQUINARIA" ? "Máquina" : tipoElemento === "MOTOCICLETA" ? "Motocicleta" : "Vehículo";
    editElementoBusqueda = editElementoSeleccionado ? labelElementoLista(editElementoSeleccionado, tipoElemento) : `${label} #${idActivo}`;
    editElementoDropdownOpen = false;
    editFacturaFile = null;
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
  }

  function handleEditFacturaChange(event) {
    editFacturaFile = event.target.files?.[0] ?? null;
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editForm.elementoId) {
      editErrorMessage = `Seleccione ${editElementoLabel.toLowerCase()} de la lista.`;
      return;
    }
    editIsSubmitting = true;
    editErrorMessage = "";
    try {
      const fd = new FormData();
      if (editForm.tipoElemento === "MAQUINARIA") {
        fd.append("machineId", editForm.elementoId);
      } else {
        fd.append("vehicleId", editForm.elementoId);
      }
      fd.append("lugar", editForm.lugar);
      fd.append("areaCosto", editForm.areaCosto);
      fd.append("fuelTypeId", editForm.fuelTypeId);
      fd.append("cantidadGalones", editForm.cantidadGalones);
      fd.append("horometroKm", editForm.horometroKm);
      fd.append("esFull", String(editForm.esFull));
      if (editForm.lugar === "BOMBA") {
        fd.append("precioUnitario", editForm.precioUnitario);
        if (editForm.descuento) fd.append("descuento", editForm.descuento);
        fd.append("totalIngresado", editForm.totalIngresado);
        if (editFacturaFile) fd.append("factura", editFacturaFile);
      }
      if (editForm.origen) fd.append("origen", editForm.origen);

      await data.updateRefueling(editingId, fd);
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      showEditModal = false;
      handleFiltrar();
    } catch (e) {
      editErrorMessage = e.message || "Error al actualizar el tanqueo.";
    } finally {
      editIsSubmitting = false;
    }
  }

  async function confirmDeleteRefueling() {
    if (!refuelingToDelete) return;
    try {
      await data.deleteRefueling(refuelingToDelete.id);
      addNotification({ id: Date.now(), text: "Tanqueo eliminado con éxito." });
      refuelingToDelete = null;
      handleFiltrar();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "Error al eliminar el tanqueo." });
    }
  }

  function openModal() {
    form = { ...initialForm };
    facturaFile = null;
    errorMessage = "";
    limpiarSeleccionElemento();
    tipoElementoAnterior = form.tipoElemento;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  function handleFileChange(event) {
    facturaFile = event.target.files?.[0] ?? null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.elementoId) {
      errorMessage = `Seleccione ${elementoLabel.toLowerCase()} de la lista.`;
      return;
    }
    isSubmitting = true;
    errorMessage = "";
    try {
      const fd = new FormData();
      if (form.tipoElemento === "MAQUINARIA") {
        fd.append("machineId", form.elementoId);
      } else {
        fd.append("vehicleId", form.elementoId);
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

      await data.createRefueling(fd);
      form = { ...initialForm };
      facturaFile = null;
      limpiarSeleccionElemento();
      showModal = false;
      handleFiltrar();
    } catch (e) {
      errorMessage = e.message || "Error al registrar el tanqueo.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fuel-dashboard">
    <div class="fuel-filtros">
    <label class="field" for="tdArea">
      <span class="field-lab">Área</span>
      <select id="tdArea" bind:value={area}>
        <option value="TODAS">Todas</option>
        <option value="DISTRITO">Distrito</option>
        <option value="ASOCIACION">Asociación</option>
      </select>
    </label>
    <label class="field" for="tdFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="tdFechaInicio" type="date" bind:value={$fuelDateRange.fechaInicio} />
    </label>
    <label class="field" for="tdFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="tdFechaFin" type="date" bind:value={$fuelDateRange.fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
    <div class="tipo-selector">
      <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "VEHICULO"} on:click={() => seleccionarTipo("VEHICULO")}>
        Estación{tipo === "VEHICULO" ? ` (${resumenPorActivo.length})` : ""}
      </button>
      <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MAQUINARIA_MOTO"} on:click={() => seleccionarTipo("MAQUINARIA_MOTO")}>
        Almacén{tipo === "MAQUINARIA_MOTO" ? ` (${resumenPorActivo.length})` : ""}
      </button>
    </div>
    <button type="button" class="btn-filter btn-registrar" on:click={openModal}>+ Registrar tanqueo</button>
  </div>

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="fuel-chart">
      <div class="dist-group-head">
        <span class="dist-chip" style="background: {ACCENT_BLUE}1a; color: {ACCENT_BLUE}">
          {tipo === "VEHICULO" ? "Estación" : "Almacén"}
        </span>
        <span class="dist-count">{resumenPorActivo.length} activos con tanqueo en el rango</span>
      </div>
      {#if resumenPorActivo.length}
        <DataGrid
          columns={resumenColumns}
          data={resumenPageRows}
          totalElements={resumenPorActivo.length}
          totalPages={resumenTotalPages}
          currentPage={resumenPage}
          pageSize={resumenPageSize}
          on:action={handleResumenAction}
          on:pageChange={handleResumenPageChange}
          on:sizeChange={handleResumenSizeChange}
          showDeleteButton={isAdmin}
          variant="modern"
        />
      {:else}
        <p class="no-data">Sin tanqueos en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click={closeModal}>
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation={handleModalContentClick}>
      <div class="modal-header">
        <h3>Registrar tanqueo</h3>
        <button type="button" class="close-btn" on:click={closeModal}>×</button>
      </div>
      <form aria-label="Registrar tanqueo" class="create-form" on:submit={handleSubmit}>
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
              <span class="field-hint">Lo que realmente pagaste, no un estimado</span>
            </label>
            <label class="field" for="origen">
              <span class="field-lab">Origen</span>
              <input id="origen" list="origenesList" type="text" bind:value={form.origen} placeholder="Elige o escribe uno nuevo" disabled={isSubmitting} />
            </label>
          </div>
          <label class="field field--file" for="factura">
            <span class="field-lab">Factura (opcional)</span>
            <div class="dropzone">
              <input id="factura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleFileChange} disabled={isSubmitting} />
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
          <button type="button" class="btn-cancel" on:click={closeModal} disabled={isSubmitting}>Cancelar</button>
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar tanqueo"}
          </button>
        </div>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="modal-overlay" role="presentation" on:click={closeEditModal}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-label="Editar tanqueo" on:click|stopPropagation={handleEditModalContentClick}>
      <div class="modal-header">
        <h3>Editar tanqueo</h3>
        <button type="button" class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form aria-label="Editar tanqueo" class="create-form" on:submit={handleEditSubmit}>
        <div class="form-row">
          <label class="field" for="editTipoElemento">
            <span class="field-lab">Tipo de elemento</span>
            <select id="editTipoElemento" bind:value={editForm.tipoElemento} disabled={editIsSubmitting}>
              <option value="MAQUINARIA">Maquinaria</option>
              <option value="VEHICULO">Vehículo</option>
              <option value="MOTOCICLETA">Motocicleta</option>
            </select>
          </label>
          <div class="field" bind:this={editElementoFieldEl}>
            <span class="field-lab">{editElementoLabel}</span>
            <div class="activo-combo">
              <input
                type="text"
                autocomplete="off"
                aria-label={`Buscar ${editElementoLabel.toLowerCase()}`}
                bind:value={editElementoBusqueda}
                on:focus={abrirBuscadorElementoEdit}
                placeholder="Escribe o haz clic para ver opciones..."
                disabled={editIsSubmitting}
              />
              {#if editElementoDropdownOpen}
                <ul class="activo-lista">
                  {#if elementosCargando}
                    <li class="activo-vacio">Cargando...</li>
                  {:else}
                    {#each editElementosFiltrados as elemento_ (elemento_.id)}
                      <li>
                        <button type="button" class="activo-opcion" on:click={() => seleccionarElementoEdit(elemento_)}>
                          {labelElementoLista(elemento_, editForm.tipoElemento)}
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
        <div class="form-row">
          <label class="field" for="editLugar">
            <span class="field-lab">Lugar</span>
            <select id="editLugar" bind:value={editForm.lugar} disabled={editIsSubmitting}>
              <option value="BOMBA">Bomba</option>
              <option value="ALMACEN">Almacén</option>
            </select>
          </label>
          <label class="field" for="editAreaCosto">
            <span class="field-lab">Área de costo</span>
            <select id="editAreaCosto" bind:value={editForm.areaCosto} disabled={editIsSubmitting}>
              <option value="DISTRITO">Distrito</option>
              <option value="ASOCIACION">Asociación</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field" for="editFuelTypeId">
            <span class="field-lab">Combustible</span>
            <select id="editFuelTypeId" bind:value={editForm.fuelTypeId} required disabled={editIsSubmitting}>
              <option value="" disabled>Seleccione...</option>
              {#each fuelTypes as ft}
                <option value={String(ft.id)}>{ft.nombre}</option>
              {/each}
            </select>
          </label>
          <label class="field" for="editCantidadGalones">
            <span class="field-lab">Cantidad ({editUnidadCantidad})</span>
            <input id="editCantidadGalones" type="number" step="0.001" bind:value={editForm.cantidadGalones} required disabled={editIsSubmitting} />
          </label>
        </div>
        <div class="form-row form-row--align-center">
          <label class="field" for="editHorometroKm">
            <span class="field-lab">Horómetro/Km</span>
            <input id="editHorometroKm" type="number" step="0.01" bind:value={editForm.horometroKm} required disabled={editIsSubmitting} />
          </label>
          <label class="field field--checkbox" for="editEsFull">
            <input id="editEsFull" type="checkbox" bind:checked={editForm.esFull} disabled={editIsSubmitting} />
            <span class="field-lab">¿Tanque lleno?</span>
          </label>
        </div>
        {#if editForm.lugar === "BOMBA"}
          <div class="form-row">
            <label class="field" for="editPrecioUnitario">
              <span class="field-lab">Precio unitario</span>
              <input id="editPrecioUnitario" type="number" step="0.01" bind:value={editForm.precioUnitario} required disabled={editIsSubmitting} />
            </label>
            <label class="field" for="editDescuento">
              <span class="field-lab">Descuento (opcional)</span>
              <input id="editDescuento" type="number" step="0.01" bind:value={editForm.descuento} disabled={editIsSubmitting} />
            </label>
          </div>
          <div class="form-row">
            <label class="field" for="editTotalIngresado">
              <span class="field-lab">Total pagado (valor real)</span>
              <input id="editTotalIngresado" type="number" step="0.01" bind:value={editForm.totalIngresado} required disabled={editIsSubmitting} />
            </label>
            <label class="field" for="editOrigen">
              <span class="field-lab">Origen</span>
              <input id="editOrigen" type="text" bind:value={editForm.origen} disabled={editIsSubmitting} />
            </label>
          </div>
          <label class="field field--file" for="editFactura">
            <span class="field-lab">Factura{editOriginalUrlFactura ? " (opcional, mantiene la actual si no se adjunta)" : " (opcional)"}</span>
            <div class="dropzone">
              <input id="editFactura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleEditFacturaChange} disabled={editIsSubmitting} />
              <div class="dropzone-content">
                <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" />
                  <path d="M7 8l5-5 5 5" />
                  <path d="M5 21h14" />
                </svg>
                {#if editFacturaFile}
                  <span class="dropzone-title">{editFacturaFile.name}</span>
                  <span class="dropzone-hint">Haz clic para cambiar el archivo</span>
                {:else}
                  <span class="dropzone-title">Arrastra la factura aquí o haz clic</span>
                  <span class="dropzone-hint">PDF, JPG o PNG</span>
                {/if}
              </div>
            </div>
          </label>
        {:else}
          <label class="field" for="editOrigen">
            <span class="field-lab">Origen</span>
            <input id="editOrigen" type="text" bind:value={editForm.origen} disabled={editIsSubmitting} />
          </label>
        {/if}
        <div class="create-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal} disabled={editIsSubmitting}>Cancelar</button>
          <button type="submit" class="btn-create" disabled={editIsSubmitting}>
            {editIsSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
        {#if editErrorMessage}
          <p class="error-message">{editErrorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if refuelingToDelete}
  <div class="modal-overlay" role="presentation" on:click={() => (refuelingToDelete = null)}>
    <div class="modal-content" style="width: 420px;" role="dialog" aria-modal="true" aria-label="Eliminar tanqueo" on:click|stopPropagation>
      <p>¿Está seguro que desea eliminar el tanqueo de <b>{refuelingToDelete.cantidadGalones}</b> del {formatFecha(refuelingToDelete.fechaRegistro)}?</p>
      <div class="create-actions">
        <button type="button" class="btn-cancel" on:click={() => (refuelingToDelete = null)}>Cancelar</button>
        <button type="button" class="btn-create" on:click={confirmDeleteRefueling}>Eliminar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .fuel-dashboard {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .fuel-banner {
    margin: 0;
    font-size: 12px;
    color: var(--ink-muted);
    max-width: 640px;
  }
  .fuel-filtros {
    display: flex;
    gap: 12px;
    align-items: end;
    flex-wrap: wrap;
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
  .field input,
  .field select {
    font-family: inherit;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    background: var(--surface);
    color: var(--ink);
  }
  .btn-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
    white-space: nowrap;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-registrar {
    margin-left: auto;
  }
  .tipo-selector {
    display: flex;
    gap: 8px;
    align-self: center;
  }
  .tipo-pill {
    font-family: inherit;
    background: rgba(42, 120, 214, 0.1);
    color: #2a78d6;
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 12px;
    cursor: pointer;
  }
  .tipo-pill--active {
    background: #2a78d6;
    color: #fff;
    font-weight: 600;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .fuel-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
  }
  .dist-group-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .dist-chip {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5px 12px;
    border-radius: 999px;
  }
  .dist-count {
    font-size: 11px;
    color: var(--ink-muted);
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }

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
    /* Los modales se renderizan como hermanos de .fuel-dashboard, no como
       descendientes suyos — las variables de --surface/--border/etc. definidas
       ahí no llegan aquí por herencia de CSS. Se redeclaran para que
       ".field input"/".field select" (que las usan) no queden sin borde. */
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
