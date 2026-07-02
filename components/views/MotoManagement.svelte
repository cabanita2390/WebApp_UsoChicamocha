<script>
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import DocumentUpdateModal from "../shared/DocumentUpdateModal.svelte";
  import QuickCatalogModal from "../shared/QuickCatalogModal.svelte";
  import CurriculumModal from "../shared/CurriculumModal.svelte";
  import { motoInventoryColumns } from "../../config/table-definitions.js";
  import { onMount, onDestroy } from "svelte";
  import { addNotification } from "../../stores/ui.js";
  import { download } from "../../stores/api.js";
  import { formatMotoVehiclePayload } from "@/lib/textFormat.js";
  import { checkExpiringDocuments } from '@/lib/expireNotifications.js';
  import { normLower, normalizeBelongsTo, formatSubidoPor, filePickLabel, locationLabel, firstOversizedDocError as firstOversizedDocErrorOf } from '@/lib/assetUtils.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

  let isSubmitting = false;
  let isExporting = false;
  let errorMessage = "";

  // Soft-delete recovery
  let softDeletedMotoToRestore = null;
  let showSoftDeletedModal = false;
  let isRestoringMoto = false;

  let showCvModal = false;
  let isCvLoading = false;
  let curriculumData = null;
  let unsubscribeDataCheck = null;

  async function openCurriculumModal(moto) {
    showCvModal = true;
    isCvLoading = true;
    curriculumData = null;
    try {
      curriculumData = await data.fetchVehicleCurriculum(moto.id);
    } catch (e) {
      addNotification({ id: Date.now(), text: 'Error al cargar hoja de vida: ' + (e.message || 'Desconocido') });
      showCvModal = false;
    } finally {
      isCvLoading = false;
    }
  }

  function closeCurriculumModal() {
    showCvModal = false;
    curriculumData = null;
  }

  let quickModal = null;
  let quickName = "";
  let quickError = "";
  let quickSubmitting = false;

  const quickModalTitles = {
    brand: "Nueva marca",
    location: "Nueva ubicación",
  };

  /** Placeholder del modal rápido según tipo de catálogo. */
  const quickPlaceholder = {
    brand: "Ej: Honda",
    location: "Ej: Unidad Pantano, Represa LA COPA…",
  };

  function resolveBrandIdFromMoto(v) {
    if (v?.idMarca != null && v.idMarca !== "") return Number(v.idMarca);
    const name = v?.marca;
    if (name == null || String(name).trim() === "") return null;
    const nl = normLower(name);
    const hit = brands.find((b) => normLower(b.descripcion) === nl);
    return hit?.idMarca != null ? Number(hit.idMarca) : null;
  }

  function openQuickCatalog(kind) {
    quickModal = kind;
    quickName = "";
    quickError = "";
  }

  function closeQuickCatalog() {
    quickModal = null;
    quickName = "";
    quickError = "";
    quickSubmitting = false;
  }

  async function submitQuickCatalog() {
    const name = quickName.trim();
    if (!name) {
      quickError = "Escriba un nombre.";
      return;
    }
    quickSubmitting = true;
    quickError = "";
    try {
      if (quickModal === "brand") {
        const created = await data.createVehicleBrand({ descripcion: name });
        const id = created?.idMarca;
        if (id != null) {
          if (showEditModal && motoInEditor) motoInEditor.idMarca = id;
          else newMoto.idMarca = id;
        }
        addNotification({ id: Date.now(), text: "Marca registrada." });
      } else if (quickModal === "location") {
        const created = await data.createCatalogItem("location", { name });
        await data.fetchLocations();
        const id = created?.id;
        if (id != null) {
          if (showEditModal && motoInEditor) motoInEditor.idUbicacionBase = id;
          else newMoto.idUbicacionBase = id;
        }
        addNotification({ id: Date.now(), text: "Ubicación registrada." });
      }
      closeQuickCatalog();
    } catch (e) {
      quickError = e.message || "No se pudo guardar.";
    } finally {
      quickSubmitting = false;
    }
  }

  const initialMotoState = {
    placa: "",
    idMarca: null,
    kilometrajeActual: 0,
    belongsTo: "",
    idUbicacionBase: null,
    activo: true,
    fuelTankCapacityGallons: null,
  };
  let newMoto = { ...initialMotoState };
  let docSoatVencimiento = "";
  let docTecnoVencimiento = "";
  let docSoatFile = null;
  let docTecnoFile = null;
  let docTarjetaPropiedadFile = null;

  async function persistMotoDocument(vid, tipoDocumento, fechaVencimiento, fileList) {
    if (!fechaVencimiento) return;
    const f = fileList && fileList.length ? fileList[0] : null;
    if (f) {
      await data.uploadVehicleDocumentFile({ idVehiculo: vid, tipoDocumento, fechaVencimiento, file: f });
    } else {
      await data.updateVehicleDocument({ idVehiculo: vid, tipoDocumento, fechaVencimiento });
    }
  }

  let motoInEditor = null;
  let showEditModal = false;
  let motoToDelete = null;

  // ── Modal actualizar documentos ──────────────────────────────────────────────
  let docModalOpen = false;
  let docModalRow = null;
  let docVehicleId = null;
  let docModalSubmitting = false;

  function resetDocModal() {
    docModalOpen = false; docModalRow = null; docVehicleId = null; docModalSubmitting = false;
  }

  async function openDocModal(row) {
    try {
      const v = await data.getVehicleByPlaca(row.placa);
      docVehicleId = v?.id ?? null;
      if (docVehicleId == null) throw new Error('No se encontró la moto.');
      docModalRow = row;
      docModalOpen = true;
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'No se pudo cargar la moto.' });
    }
  }

  async function handleDocSubmit(ev) {
    const { tipoDocumento, fechaVencimiento, file } = ev.detail;
    if (!docVehicleId || !fechaVencimiento) return;
    docModalSubmitting = true;
    try {
      if (file) {
        await data.uploadVehicleDocumentFile({ idVehiculo: docVehicleId, tipoDocumento, fechaVencimiento, file });
      } else {
        await data.updateVehicleDocument({ idVehiculo: docVehicleId, tipoDocumento, fechaVencimiento });
      }
      addNotification({ id: Date.now(), text: 'Documentación actualizada.' });
      resetDocModal();
      await data.fetchMotos();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al guardar.' });
      docModalSubmitting = false;
    }
  }

  let showDocHistoryModal = false;
  let docHistoryMoto = null;
  let docHistory = null;
  let docHistoryLoading = false;

  function closeDocHistoryModal() {
    showDocHistoryModal = false;
    docHistoryMoto = null;
    docHistory = null;
    docHistoryLoading = false;
  }

  async function openDocHistoryModal(moto) {
    docHistoryMoto = moto;
    showDocHistoryModal = true;
    docHistoryLoading = true;
    docHistory = null;
    try {
      docHistory = await data.getVehicleDocumentHistory(moto.id);
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "No se pudo cargar el historial." });
      showDocHistoryModal = false;
    } finally {
      docHistoryLoading = false;
    }
  }

  $: motos = Array.isArray($data.motos) ? $data.motos : [];
  $: brands = Array.isArray($data.vehicleBrands) ? $data.vehicleBrands : [];
  $: types = Array.isArray($data.vehicleTypes) ? $data.vehicleTypes : [];
  $: locations = Array.isArray($data.locations) ? $data.locations : [];
  $: isLoading = $data.isLoading;
  $: motoTipoId =
    (types || []).find((t) => String(t?.name ?? t?.nombreTipo ?? "").toUpperCase() === "MOTOCICLETA")?.id ?? null;

  onMount(async () => {
    try {
      // Marcas y tipos no dependen de ubicaciones → se cargan en paralelo con ellas.
      // Motos SÍ depende de ubicaciones (el store enriquece nombres) → va después.
      await Promise.all([
        data.fetchLocations().catch((e) => console.warn("No se cargó ubicaciones:", e)),
        data.fetchVehicleBrands(),
        data.fetchVehicleTypes(),
      ]);
      await data.fetchMotos();

      // Verificar documentos próximos a vencer
      unsubscribeDataCheck = data.subscribe(d => {
        if (d.motos?.length > 0) {
          checkExpiringDocuments(d.vehicles || [], d.motos, d.machines || [], addNotification);
        }
      });
    } catch (e) {
      console.error("Error al cargar inventario de motos:", e);
    }
  });

  onDestroy(() => {
    if (unsubscribeDataCheck) unsubscribeDataCheck();
  });

  function firstOversizedDocError() {
    return firstOversizedDocErrorOf([docSoatFile, docTecnoFile, docTarjetaPropiedadFile]);
  }

  async function handleCreateMoto(event) {
    event.preventDefault();
    errorMessage = "";
    if (motoTipoId == null) {
      errorMessage =
        "No se encontró el tipo MOTOCICLETA en el catálogo. Verifique la base de datos (cat_tipos_vehiculo).";
      return;
    }
    const docSizeError = firstOversizedDocError();
    if (docSizeError) {
      errorMessage = docSizeError;
      return;
    }
    isSubmitting = true;
    try {
      const created = await data.createMoto(formatMotoVehiclePayload(newMoto, motoTipoId));
      const vid = created?.id;
      let docExtra = "";
      if (vid != null) {
        try {
          const parts = [];
          if (docSoatVencimiento) {
            await persistMotoDocument(vid, "SOAT", docSoatVencimiento, docSoatFile);
            parts.push("SOAT");
          }
          if (docTecnoVencimiento) {
            await persistMotoDocument(vid, "TECNOMECANICA", docTecnoVencimiento, docTecnoFile);
            parts.push("Tecnomecánica");
          }
          if (docTarjetaPropiedadFile && docTarjetaPropiedadFile.length) {
            await data.uploadVehicleDocumentFile({
              idVehiculo: vid,
              tipoDocumento: "TARJETA DE PROPIEDAD",
              fechaVencimiento: null,
              file: docTarjetaPropiedadFile[0],
            });
            parts.push("Tarjeta de propiedad");
          }
          if (parts.length) docExtra = " Documentación: " + parts.join(", ") + ".";
        } catch (docErr) {
          docExtra = " " + (docErr.message || "No se pudieron guardar los documentos (¿rol ADMIN?).");
        }
      }
      newMoto = { ...initialMotoState };
      docSoatVencimiento = "";
      docTecnoVencimiento = "";
      docSoatFile = null;
      docTecnoFile = null;
      docTarjetaPropiedadFile = null;
      await data.fetchMotos();
      addNotification({ id: Date.now(), text: "Motocicleta registrada." + docExtra });
    } catch (e) {
      if (e.status === 409 && e.body?.softDeletedVehicle) {
        softDeletedMotoToRestore = e.body.softDeletedVehicle;
        showSoftDeletedModal = true;
        errorMessage = e.body.error || e.message || "Motocicleta eliminada detectada";
      } else {
        errorMessage = e.message || "Error al crear motocicleta.";
      }
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRestoreMoto() {
    if (!softDeletedMotoToRestore?.id) return;
    isRestoringMoto = true;
    try {
      const restored = await data.restoreMoto(softDeletedMotoToRestore.id);
      showSoftDeletedModal = false;
      softDeletedMotoToRestore = null;
      errorMessage = "";
      newMoto = { ...initialMotoState };
      docSoatVencimiento = "";
      docTecnoVencimiento = "";
      docSoatFile = null;
      docTecnoFile = null;
      docTarjetaPropiedadFile = null;
      data.fetchMotos();
      addNotification({ id: Date.now(), text: "Motocicleta restaurada exitosamente." });
    } catch (e) {
      errorMessage = "Error al restaurar motocicleta: " + (e.message || "desconocido");
    } finally {
      isRestoringMoto = false;
    }
  }

  function handleCreateDifferent() {
    showSoftDeletedModal = false;
    softDeletedMotoToRestore = null;
    errorMessage = "✏️ Por favor, cambia la placa en el formulario de arriba";
  }

  async function handleUpdateMoto(event) {
    event.preventDefault();
    if (!motoInEditor || motoTipoId == null) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.updateMoto(motoInEditor.id, formatMotoVehiclePayload(motoInEditor, motoTipoId));
      await data.fetchMotos();
      closeEditModal();
      addNotification({ id: Date.now(), text: "Motocicleta actualizada." });
    } catch (e) {
      errorMessage = e.message || "Error al actualizar motocicleta.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteMoto() {
    if (!motoToDelete) return;
    errorMessage = "";
    try {
      await data.deleteMoto(motoToDelete.id);
      await data.fetchMotos();
      motoToDelete = null;
      addNotification({ id: Date.now(), text: "Motocicleta eliminada." });
    } catch (e) {
      errorMessage = e.message || "Error al eliminar motocicleta.";
    }
  }

  async function handleAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") {
      await openEditModal(row);
    } else if (type === "delete") {
      motoToDelete = row;
    } else if (type === "cv") {
      openCurriculumModal(row);
    } else if (type === "docHistory") {
      openDocHistoryModal(row);
    } else if (type === "update_docs") {
      openDocModal(row);
    }
  }

  async function openEditModal(moto) {
    try {
      const fullMoto = await data.getMotoByPlaca(moto.placa);
      console.log("🔍 fullMoto cargado:", fullMoto);
      motoInEditor = {
        ...fullMoto,
        idMarca: resolveBrandIdFromMoto(fullMoto),
        idUbicacionBase: (() => {
          const raw = fullMoto.idUbicacionBase;
          if (raw == null || raw === '') return null;
          const n = Number(raw);
          return Number.isNaN(n) ? null : n;
        })(),
        belongsTo: normalizeBelongsTo(fullMoto.belongsTo),
        activo: fullMoto.activo !== false && fullMoto.activo !== 'false' && fullMoto.activo !== 0 && fullMoto.activo !== '0',
        fuelTankCapacityGallons: fullMoto.fuelTankCapacityGallons ?? null,
        factoryEfficiencyKmPerGallon: fullMoto.factoryEfficiencyKmPerGallon ?? null,
        factoryEfficiencyUnit: fullMoto.factoryEfficiencyUnit ?? 'KM_PER_GALLON',
      };
      console.log("✏️ motoInEditor.belongsTo asignado a:", motoInEditor.belongsTo);
      showEditModal = true;
    } catch (e) {
      errorMessage = 'No se pudo cargar la moto para editar.';
      addNotification({ id: Date.now(), text: e.message || 'Error al cargar moto.' });
    }
  }

  function closeEditModal() {
    showEditModal = false;
    motoInEditor = null;
    errorMessage = "";
  }

  async function handleExportMotos() {
    isExporting = true;
    try {
      await download('curriculum/export/motos', 'motos_curriculum.xlsx');
      addNotification({ id: Date.now(), text: 'Archivo de motocicletas descargado con éxito.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
</script>

{#if isLoading && motos.length === 0}
  <div class="vehicle-module">
    <div class="vehicle-loader">
      <Loader />
      <p>Cargando motocicletas...</p>
    </div>
  </div>
{:else}
  <div class="vehicle-module">
    <div class="vehicle-module-inner">
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchMotos()}>
          Refrescar
        </button>
        <button class="vehicle-btn vehicle-btn--export" on:click={handleExportMotos} disabled={isExporting}>
          {#if isExporting}<span class="spin">⟳</span>{/if}
          {isExporting ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>

      {#if isAdmin || isSupervisorOperativo}
      <div class="vehicle-form-section">
        <div class="vehicle-subpanel-head">Registrar nueva motocicleta</div>
        <form class="create-form create-form--compact" on:submit={handleCreateMoto}>
          <div class="create-grid">
            <label class="field">
              <span class="field-lab">Placa</span>
              <input type="text" bind:value={newMoto.placa} placeholder="Ej: ABC12D" required disabled={isSubmitting} />
            </label>
            <label class="field">
              <span class="field-lab field-lab-row">
                Marca
                <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog("brand")}>+ Añadir</button>
              </span>
              <select
                required
                disabled={isSubmitting}
                value={newMoto.idMarca == null ? "" : String(newMoto.idMarca)}
                on:change={(e) => {
                  const raw = e.currentTarget.value;
                  newMoto.idMarca = raw === "" ? null : Number(raw);
                }}
              >
                <option value="">— Seleccione marca —</option>
                {#each brands as brand}
                  <option value={String(brand.idMarca)}>{brand.descripcion}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="field-lab">Km inicial</span>
              <input type="number" bind:value={newMoto.kilometrajeActual} min="0" required disabled={isSubmitting} />
            </label>
            <label class="field">
              <span class="field-lab">Pertenece a</span>
              <select bind:value={newMoto.belongsTo} required disabled={isSubmitting}>
                <option value="">— Seleccionar —</option>
                <option value="Distrito">Distrito</option>
                <option value="Asociación">Asociación</option>
              </select>
            </label>
            <label class="field">
              <span class="field-lab field-lab-row">
                Ubicación
                <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog("location")}>+ Añadir</button>
              </span>
              <select
                disabled={isSubmitting}
                value={newMoto.idUbicacionBase != null && newMoto.idUbicacionBase !== '' ? String(newMoto.idUbicacionBase) : ''}
                on:change={(e) => {
                  const v = e.currentTarget.value;
                  newMoto.idUbicacionBase = v === "" ? null : Number(v);
                }}
                title="Ej.: Unidad Pantano, Unidad Ayalas, sede, represa…"
              >
                <option value="">Seleccione ubicación</option>
                {#each locations as loc}
                  <option value={String(loc.id)}>{locationLabel(loc)}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="field-lab">Estado</span>
              <select
                disabled={isSubmitting}
                value={newMoto.activo === true || newMoto.activo === "true" || newMoto.activo === 1 || newMoto.activo === "1" ? "1" : "0"}
                on:change={(e) => {
                  newMoto.activo = e.currentTarget.value === "1";
                }}
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </label>
            {#if isAdmin}
            <label class="field">
              <span class="field-lab">Capacidad del tanque (Gal)</span>
              <input
                type="number" step="0.001" min="0.1"
                bind:value={newMoto.fuelTankCapacityGallons}
                placeholder="Ej: 2.5"
                disabled={isSubmitting}
              />
            </label>
            <label class="field">
              <span class="field-lab">Eficiencia de fábrica</span>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center">
                <input
                  type="number" step="0.01" min="0"
                  bind:value={newMoto.factoryEfficiencyKmPerGallon}
                  placeholder="Ej: 80.0"
                  disabled={isSubmitting}
                  style="padding:3px 4px;font-size:11px;min-height:26px"
                />
                <select bind:value={newMoto.factoryEfficiencyUnit} disabled={isSubmitting} style="padding:4px;font-size:12px;min-height:28px">
                  <option value="KM_PER_GALLON">km/Gal</option>
                  <option value="KM_PER_CUBIC_METER">km/m³ (gas)</option>
                </select>
              </div>
            </label>
            {/if}
          </div>
          <div class="create-docs-head">Documentación</div>
          <div class="create-docs-grid">
            <label class="field field-doc">
              <span class="field-lab">SOAT — vence</span>
              <input type="date"
                value={docSoatVencimiento}
                on:change={(e) => docSoatVencimiento = e.target.value}
                disabled={isSubmitting}
              />
            </label>
            <label class="field field-doc file-upload-win" class:file-upload-win--disabled={isSubmitting}>
              <span class="field-lab">Archivo SOAT</span>
              <div class="file-upload-win__row" class:file-upload-win__row--disabled={isSubmitting}>
                <div class="file-upload-win__inner">
                  <span class="file-upload-win__name" class:file-upload-win__name--empty={!docSoatFile?.length}>{filePickLabel(docSoatFile)}</span>
                  <span class="file-upload-win__btn">Examinar…</span>
                </div>
                <input type="file" class="file-upload-win__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={docSoatFile} disabled={isSubmitting} />
              </div>
            </label>
            <label class="field field-doc">
              <span class="field-lab">Tecnomecánica — vence</span>
              <input type="date"
                value={docTecnoVencimiento}
                on:change={(e) => docTecnoVencimiento = e.target.value}
                disabled={isSubmitting}
              />
            </label>
            <label class="field field-doc file-upload-win" class:file-upload-win--disabled={isSubmitting}>
              <span class="field-lab">Archivo tecnomecánica</span>
              <div class="file-upload-win__row" class:file-upload-win__row--disabled={isSubmitting}>
                <div class="file-upload-win__inner">
                  <span class="file-upload-win__name" class:file-upload-win__name--empty={!docTecnoFile?.length}>{filePickLabel(docTecnoFile)}</span>
                  <span class="file-upload-win__btn">Examinar…</span>
                </div>
                <input type="file" class="file-upload-win__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={docTecnoFile} disabled={isSubmitting} />
              </div>
            </label>
            <label class="field field-doc file-upload-win" class:file-upload-win--disabled={isSubmitting}>
              <span class="field-lab">Tarjeta de propiedad</span>
              <div class="file-upload-win__row" class:file-upload-win__row--disabled={isSubmitting}>
                <div class="file-upload-win__inner">
                  <span class="file-upload-win__name" class:file-upload-win__name--empty={!docTarjetaPropiedadFile?.length}>{filePickLabel(docTarjetaPropiedadFile)}</span>
                  <span class="file-upload-win__btn">Examinar…</span>
                </div>
                <input type="file" class="file-upload-win__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={docTarjetaPropiedadFile} disabled={isSubmitting} />
              </div>
            </label>
          </div>
          <div class="create-actions">
            <button type="submit" class="btn-create" disabled={isSubmitting || motoTipoId == null}>
              {isSubmitting ? "Registrando..." : "Registrar motocicleta"}
            </button>
          </div>
        </form>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </div>
      {/if}

      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid columns={motoInventoryColumns} data={motos} on:action={handleAction} totalElements={motos.length} showDeleteButton={isAdmin} />
      </div>
    </div>
  </div>
{/if}

{#if isAdmin || isSupervisorOperativo}
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar motocicleta</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateMoto}>
        <div class="modal-form-grid">
          <label class="field">
            <span class="field-lab">Placa</span>
            <input type="text" bind:value={motoInEditor.placa} required />
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Marca
              <button type="button" class="field-add-btn" on:click={() => openQuickCatalog("brand")}>+ Añadir</button>
            </span>
            <select
              required
              value={motoInEditor.idMarca == null ? "" : String(motoInEditor.idMarca)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                motoInEditor.idMarca = raw === "" ? null : Number(raw);
              }}
            >
              <option value="">— Seleccione marca —</option>
              {#each brands as brand}
                <option value={String(brand.idMarca)}>{brand.descripcion}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Km actual</span>
            <input type="number" bind:value={motoInEditor.kilometrajeActual} required />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={motoInEditor.belongsTo} required>
              <option value="">— Seleccionar —</option>
              <option value="Distrito">Distrito</option>
              <option value="Asociación">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Ubicación
              <button type="button" class="field-add-btn" on:click={() => openQuickCatalog("location")}>+ Añadir</button>
            </span>
            <select
              value={motoInEditor.idUbicacionBase != null && motoInEditor.idUbicacionBase !== '' ? String(motoInEditor.idUbicacionBase) : ''}
              on:change={(e) => {
                const v = e.currentTarget.value;
                motoInEditor.idUbicacionBase = v === "" ? null : Number(v);
              }}
              title="Ej.: Unidad Pantano, Unidad Ayalas…"
            >
              <option value="">Seleccione ubicación</option>
              {#each locations as loc}
                <option value={String(loc.id)}>{locationLabel(loc)}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Estado</span>
            <select
              value={motoInEditor.activo === true || motoInEditor.activo === "true" || motoInEditor.activo === 1 || motoInEditor.activo === "1" ? "1" : "0"}
              on:change={(e) => {
                motoInEditor.activo = e.currentTarget.value === "1";
              }}
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>
          {#if isAdmin}
          <label class="field">
            <span class="field-lab">Capacidad del tanque (Gal)</span>
            <input
              type="number" step="0.001" min="0.1"
              bind:value={motoInEditor.fuelTankCapacityGallons}
              placeholder="Ej: 2.5"
            />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center">
              <input
                type="number" step="0.01" min="0"
                bind:value={motoInEditor.factoryEfficiencyKmPerGallon}
                placeholder="Ej: 80.0"
                style="padding:4px;font-size:12px;min-height:28px"
              />
              <select bind:value={motoInEditor.factoryEfficiencyUnit} style="padding:4px;font-size:12px;min-height:28px">
                <option value="KM_PER_GALLON">km/Gal</option>
                <option value="KM_PER_CUBIC_METER">km/m³ (gas)</option>
              </select>
            </div>
          </label>
          {/if}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting || motoTipoId == null}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
        {#if errorMessage}
          <p class="vehicle-catalog-inline-error">{errorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}
{/if}

{#if isAdmin}
{#if motoToDelete}
  <div class="modal-overlay" on:click={() => (motoToDelete = null)}>
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar eliminación</h3>
      <p>¿Eliminar la motocicleta con placa <b>{motoToDelete.placa}</b>? Se borrará el registro en vehículos.</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={() => (motoToDelete = null)}>Cancelar</button>
        <button type="button" class="btn-delete" on:click={handleDeleteMoto}>Sí, eliminar</button>
      </div>
    </div>
  </div>
{/if}
{/if}

{#if showDocHistoryModal}
  <div class="modal-overlay" on:click={closeDocHistoryModal}>
    <div class="modal-content modal-doc-history" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Historial de documentación — {docHistoryMoto?.placa ?? ''}</h3>
        <button class="close-btn" on:click={closeDocHistoryModal}>×</button>
      </div>
      {#if docHistoryLoading}
        <div class="doc-history-loader"><Loader /></div>
      {:else if docHistory && docHistory.length > 0}
        <div class="doc-history-table-wrap">
          <table class="doc-history-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Vence</th>
                <th>Estado doc</th>
                <th>Versión</th>
                <th>Registrado</th>
                <th>Por</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {#each docHistory as row}
                <tr class:doc-row-activa={row.vigente} class:doc-row-reemplazada={!row.vigente}>
                  <td>{row.tipoDocumento}</td>
                  <td>{row.fechaVigencia ?? '—'}</td>
                  <td class="doc-estado-cell"
                      class:doc-estado-vigente={row.estadoCalculado === 'Vigente'}
                      class:doc-estado-vencido={row.estadoCalculado === 'Vencido'}
                      class:doc-estado-proximo={row.estadoCalculado === 'Próximo a Vencer'}>
                    {row.estadoCalculado ?? '—'}
                  </td>
                  <td class="doc-version-cell">
                    {#if row.vigente}
                      <span class="badge-activa">Activa</span>
                    {:else}
                      <span class="badge-reemplazada">Reemplazada</span>
                    {/if}
                  </td>
                  <td class="doc-fecha-registro">{row.subidoEn ? (() => { const d = new Date(row.subidoEn); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); const hours = String(d.getHours()).padStart(2, '0'); const minutes = String(d.getMinutes()).padStart(2, '0'); return `${day}/${month}/${year} ${hours}:${minutes}`; })() : '—'}</td>
                  <td>{formatSubidoPor(row.subidoPor)}</td>
                  <td>
                    {#if row.urlArchivo}
                      <a href={row.urlArchivo} target="_blank" rel="noopener noreferrer">Ver</a>
                    {:else}
                      —
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if docHistory}
        <p class="doc-history-empty">Sin registros de documentos para esta motocicleta.</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeDocHistoryModal}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}

<QuickCatalogModal
  open={!!quickModal}
  title={quickModal ? quickModalTitles[quickModal] : ''}
  placeholder={quickModal ? (quickPlaceholder[quickModal] ?? 'Ej: …') : 'Ej: …'}
  bind:value={quickName}
  error={quickError}
  submitting={quickSubmitting}
  on:close={closeQuickCatalog}
  on:submit={submitQuickCatalog}
/>

{#if docModalOpen && docModalRow}
  {#key docModalRow.placa}
    <DocumentUpdateModal
      placa={docModalRow.placa}
      soatVencimiento={docModalRow.soat?.fechaVencimiento ?? null}
      tecnoVencimiento={docModalRow.tecno?.fechaVencimiento ?? null}
      extintorVencimiento={docModalRow.extintor?.fechaVencimiento ?? null}
      isSubmitting={docModalSubmitting}
      on:submit={handleDocSubmit}
      on:cancel={resetDocModal}
    />
  {/key}
{/if}

{#if showSoftDeletedModal && softDeletedMotoToRestore}
  <div class="modal-overlay" on:click={() => (showSoftDeletedModal = false)}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 style="margin-top: 0; color: #d9534f;">Motocicleta Eliminada</h3>
      <p>{errorMessage}</p>

      <div class="soft-delete-info">
        <p><strong>Placa:</strong> {softDeletedMotoToRestore.placa}</p>
        <p><strong>Marca:</strong> {softDeletedMotoToRestore.marca}</p>
        <p><strong>Tipo:</strong> {softDeletedMotoToRestore.tipoVehiculo}</p>
      </div>

      <p style="margin-top: 12px; font-size: 12px; color: #606060;">¿Qué deseas hacer?</p>

      <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
        <button
          type="button"
          on:click={() => (showSoftDeletedModal = false)}
          disabled={isRestoringMoto}
          style="padding: 6px 12px; background: #f0f0f0; border: 1px solid #c0c0c0; cursor: pointer; border-radius: 3px;"
        >
          Cancelar
        </button>
        <button
          type="button"
          on:click={handleCreateDifferent}
          disabled={isRestoringMoto}
          style="padding: 6px 12px; background: #e8e8e8; border: 1px solid #b0b0b0; cursor: pointer; border-radius: 3px;"
        >
          Crear con otra placa
        </button>
        <button
          type="button"
          on:click={handleRestoreMoto}
          disabled={isRestoringMoto}
          style="padding: 6px 12px; background: #5cb85c; color: white; border: 1px solid #4cae4c; cursor: pointer; border-radius: 3px; font-weight: bold;"
        >
          {isRestoringMoto ? "Restaurando..." : "Restaurar Motocicleta"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .vehicle-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    font-size: 11px;
  }
  .create-form {
    padding: 8px 10px 10px;
  }
  .create-form--compact {
    padding: 6px 8px 8px;
  }
  .create-form--compact .create-grid {
    gap: 4px 8px;
  }
  .create-form--compact .field {
    font-size: 10px;
    gap: 1px;
  }
  .create-form--compact .field-lab {
    font-size: 9px;
  }
  .create-form--compact .field-add-btn {
    padding: 0 4px;
    font-size: 9px;
  }
  .create-form--compact .field input,
  .create-form--compact .field select {
    padding: 2px 4px;
    font-size: 10px;
    min-height: 22px;
    line-height: 1.2;
  }
  .create-docs-head {
    margin: 6px 0 2px;
    padding: 2px 0;
    font-size: 10px;
    font-weight: bold;
    color: #202020;
    border-bottom: 1px solid #b0b0b0;
  }
  .create-docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 11.5rem), 1fr));
    gap: 4px 8px;
    margin-top: 4px;
    align-items: end;
  }
  .create-docs-grid .field-doc {
    min-width: 0;
  }
  .create-form--compact .create-docs-grid {
    gap: 3px 6px;
    margin-top: 3px;
  }
  .create-form--compact .create-docs-head {
    font-size: 9px;
    margin: 4px 0 1px;
    padding: 1px 0;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.25rem), 1fr));
    gap: 6px 10px;
    align-items: end;
  }
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
  .field-lab-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    white-space: normal;
  }
  .field-add-btn {
    flex-shrink: 0;
    padding: 1px 6px;
    font-size: 10px;
    font-family: inherit;
    cursor: pointer;
    background: linear-gradient(to bottom, #f4f4f4 0%, #d8d8d8 100%);
    border: 1px outset #c0c0c0;
  }
  .field-add-btn:hover:not(:disabled) {
    background: linear-gradient(to bottom, #fafafa 0%, #e4e4e4 100%);
  }
  .field-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .modal-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr));
    gap: 8px 10px;
    align-items: end;
  }
  .modal-form-grid .field {
    min-width: 0;
  }
  .modal-form-grid .field input,
  .modal-form-grid .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 4px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    min-height: 24px;
  }
  .quick-help {
    margin: 0 0 10px;
    font-size: 10px;
    color: #404040;
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
    min-height: 24px;
  }
  @media (max-width: 360px) {
    .create-grid {
      grid-template-columns: 1fr;
    }
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #a0a0a0;
  }
  .btn-create {
    padding: 4px 16px;
    background: linear-gradient(to bottom, #e8e8e8 0%, #c0c0c0 100%);
    border: 2px outset #ffffff;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
    font-size: 11px;
  }
  .btn-create:active {
    border-style: inset;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: #e0e0e0;
    padding: 20px;
    border: 2px outset #ffffff;
    width: min(96vw, 760px);
    max-width: 96vw;
    box-sizing: border-box;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
  }
  .modal-content.confirmation {
    width: auto;
    max-width: min(440px, 96vw);
    min-width: min(280px, 100vw - 16px);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #808080;
    padding-bottom: 5px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .modal-form label {
    display: flex;
    flex-direction: column;
    font-size: 11px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-cancel {
    background: #d0d0d0;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
  .btn-save {
    background: #90ee90;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
  .btn-delete {
    background: #ff6b6b;
    color: white;
    border: 1px outset #fff;
    padding: 4px 10px;
    cursor: pointer;
  }
  .modal-content.modal-doc-history {
    width: min(96vw, 620px);
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  .doc-history-loader {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 0;
  }
  .doc-history-table-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid #a0a0a0;
    background: #fff;
    margin-bottom: 4px;
  }
  .doc-history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .doc-history-table th,
  .doc-history-table td {
    border: 1px solid #c0c0c0;
    padding: 6px 8px;
    text-align: left;
    white-space: nowrap;
  }
  .doc-history-table th {
    background: #d8d8d8;
    font-weight: bold;
    position: sticky;
    top: 0;
  }
  .doc-row-activa td { background: #f5fff5; }
  .doc-row-reemplazada td { background: #fafafa; color: #707070; }
  .doc-version-cell { white-space: nowrap; }
  .badge-activa {
    display: inline-block;
    padding: 1px 6px;
    background: #1a7a1a;
    color: #fff;
    font-size: 9px;
    font-weight: bold;
    border-radius: 2px;
  }
  .badge-reemplazada {
    display: inline-block;
    padding: 1px 6px;
    background: #909090;
    color: #fff;
    font-size: 9px;
    border-radius: 2px;
  }
  .doc-estado-cell { font-weight: bold; }
  .doc-estado-vigente { color: #1a7a1a; }
  .doc-estado-vencido { color: #b00000; }
  .doc-estado-proximo { color: #b06000; }
  .doc-fecha-registro { white-space: nowrap; font-size: 10px; }
  .doc-history-empty {
    padding: 16px;
    font-size: 11px;
    color: #606060;
    text-align: center;
  }
  .soft-delete-info {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 10px;
    margin: 10px 0;
    font-size: 12px;
  }
  .soft-delete-info p {
    margin: 4px 0;
  }
</style>

<CurriculumModal
  open={showCvModal}
  plate={curriculumData?.vehicle?.placa}
  loading={isCvLoading}
  results={curriculumData?.results}
  emptyMessage="No hay registros en la hoja de vida para esta motocicleta."
  on:close={closeCurriculumModal}
/>
