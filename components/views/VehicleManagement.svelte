<script>
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import DocumentUpdateModal from "../shared/DocumentUpdateModal.svelte";
  import { vehicleManagementColumns, curriculumColumns } from "../../config/table-definitions.js";
  import { onMount } from 'svelte';
  import { addNotification } from '../../stores/ui.js';
  import { formatVehiclePayload } from '@/lib/textFormat.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

  let isSubmitting = false;
  let isExporting = false;
  let errorMessage = "";

  let showCvModal = false;
  let isCvLoading = false;
  let curriculumData = null;

  async function openCurriculumModal(vehicle) {
    showCvModal = true;
    isCvLoading = true;
    curriculumData = null;
    try {
      curriculumData = await data.fetchVehicleCurriculum(vehicle.id);
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

  /** Catálogo rápido sin salir de la vista (marca / tipo / ubicación). */
  let quickModal = null; // 'brand' | 'type' | 'location' | null
  let quickName = '';
  let quickError = '';
  let quickSubmitting = false;

  const quickModalTitles = {
    brand: 'Nueva marca',
    type: 'Nuevo tipo de vehículo',
    location: 'Nueva ubicación',
  };

  function normLower(s) {
    return String(s ?? '').trim().toLowerCase();
  }

  /** Usa id del API si existe; si no, busca por nombre de marca (sin distinguir mayúsculas). */
  function resolveBrandIdFromVehicle(v) {
    if (v?.idMarca != null && v.idMarca !== '') return Number(v.idMarca);
    const name = v?.marca;
    if (name == null || String(name).trim() === '') return null;
    const nl = normLower(name);
    const hit = brands.find((b) => normLower(b.descripcion) === nl);
    return hit?.idMarca != null ? Number(hit.idMarca) : null;
  }

  /** Usa id del API si existe; si no, busca por nombre de tipo. */
  function resolveTipoIdFromVehicle(v) {
    if (v?.idTipoVehiculo != null && v.idTipoVehiculo !== '') return Number(v.idTipoVehiculo);
    const name = v?.tipoVehiculo;
    if (name == null || String(name).trim() === '') return null;
    const nl = normLower(name);
    const hit = types.find((t) => normLower(tipoCatalogName(t)) === nl);
    return hit?.id != null ? Number(hit.id) : null;
  }

  /** Texto mostrado en el control estilo “Examinar…” de documentos. */
  function filePickLabel(fileList) {
    if (!fileList || fileList.length === 0) return 'Ningún archivo';
    return fileList[0].name;
  }

  /** Filas antiguas: a veces se persistió el toString() del principal (UserPrincipal[id=…, username=…]). */
  function formatSubidoPor(val) {
    if (val == null || String(val).trim() === '') return '—';
    const s = String(val).trim();
    if (s.startsWith('UserPrincipal[')) {
      const m = s.match(/username=([^,\]]+)/);
      if (m) return m[1];
    }
    return s;
  }

  function openQuickCatalog(kind) {
    quickModal = kind;
    quickName = '';
    quickError = '';
  }

  function closeQuickCatalog() {
    quickModal = null;
    quickName = '';
    quickError = '';
    quickSubmitting = false;
  }

  async function submitQuickCatalog() {
    const name = quickName.trim();
    if (!name) {
      quickError = 'Escriba un nombre.';
      return;
    }
    quickSubmitting = true;
    quickError = '';
    try {
      if (quickModal === 'brand') {
        const created = await data.createVehicleBrand({ descripcion: name });
        const id = created?.idMarca;
        if (id != null) {
          if (showEditModal && vehicleInEditor) vehicleInEditor.idMarca = id;
          else newVehicle.idMarca = id;
        }
        addNotification({ id: Date.now(), text: 'Marca registrada.' });
      } else if (quickModal === 'type') {
        const created = await data.createCatalogItem('type', { name });
        const id = created?.id;
        if (id != null) {
          if (showEditModal && vehicleInEditor) vehicleInEditor.idTipoVehiculo = id;
          else newVehicle.idTipoVehiculo = id;
        }
        addNotification({ id: Date.now(), text: 'Tipo registrado.' });
      } else if (quickModal === 'location') {
        const created = await data.createCatalogItem('location', { name });
        await data.fetchLocations();
        const id = created?.id;
        if (id != null) {
          if (showEditModal && vehicleInEditor) vehicleInEditor.idUbicacionBase = id;
          else newVehicle.idUbicacionBase = id;
        }
        addNotification({ id: Date.now(), text: 'Ubicación registrada.' });
      }
      closeQuickCatalog();
    } catch (e) {
      quickError = e.message || 'No se pudo guardar.';
    } finally {
      quickSubmitting = false;
    }
  }

  const initialVehicleState = {
    placa: "",
    idMarca: null,
    idTipoVehiculo: null,
    kilometrajeActual: 0,
    belongsTo: "",
    idUbicacionBase: null,
    activo: true,
    fuelTankCapacityGallons: null,
  };
  let newVehicle = { ...initialVehicleState };
  /** Vigencias y archivos al alta. */
  let docSoatVencimiento = "";
  let docTecnoVencimiento = "";
  let docTarjetaPropiedadFile = null;
  let docExtintorMes = "";
  let docSoatFile = null;
  let docTecnoFile = null;
  let docExtintorFile = null;

  async function persistVehicleDocument(vid, tipoDocumento, fechaVencimiento, fileList) {
    if (!fechaVencimiento) return;
    const f = fileList && fileList.length ? fileList[0] : null;
    if (f) {
      await data.uploadVehicleDocumentFile({
        idVehiculo: vid,
        tipoDocumento,
        fechaVencimiento,
        file: f,
      });
    } else {
      await data.updateVehicleDocument({ idVehiculo: vid, tipoDocumento, fechaVencimiento });
    }
  }

  let vehicleInEditor = null;
  let showEditModal = false;
  let vehicleToDelete = null;

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
      if (docVehicleId == null) throw new Error('No se encontró el vehículo.');
      docModalRow = row;
      docModalOpen = true;
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'No se pudo cargar el vehículo.' });
    }
  }

  async function handleDocSubmit(ev) {
    const { tipoDocumento, fechaVencimiento, file } = ev.detail;
    const esTarjeta = tipoDocumento === 'TARJETA DE PROPIEDAD';
    if (!docVehicleId || (!fechaVencimiento && !esTarjeta)) return;
    docModalSubmitting = true;
    try {
      if (file) {
        await data.uploadVehicleDocumentFile({ idVehiculo: docVehicleId, tipoDocumento, fechaVencimiento, file });
      } else {
        await data.updateVehicleDocument({ idVehiculo: docVehicleId, tipoDocumento, fechaVencimiento });
      }
      addNotification({ id: Date.now(), text: 'Documentación actualizada.' });
      resetDocModal();
      await data.fetchVehicles();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al guardar.' });
      docModalSubmitting = false;
    }
  }

  let showDocHistoryModal = false;
  let docHistoryVehicle = null;
  let docHistory = null;
  let docHistoryLoading = false;

  /** Nombre de tipo en catálogo (CatalogDTO usa `name`; otros DTO pueden usar `nombreTipo`). */
  function tipoCatalogName(t) {
    return t?.name ?? t?.nombreTipo ?? '';
  }

  $: vehicleTypesList = Array.isArray($data.vehicleTypes) ? $data.vehicleTypes : [];
  $: rawVehicles = Array.isArray($data.vehicles) ? $data.vehicles : [];
  $: motoTypeIds = new Set(
    vehicleTypesList
      .filter((t) => String(tipoCatalogName(t)).toLowerCase().includes('moto'))
      .map((t) => (t?.id != null && t.id !== '' ? Number(t.id) : NaN))
      .filter((n) => !Number.isNaN(n)),
  );

  function vehicleRowIsMoto(v) {
    const rawId = v?.idTipoVehiculo;
    const tid = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isNaN(tid) && motoTypeIds.has(tid)) return true;
    return String(v?.tipoVehiculo ?? '')
      .toLowerCase()
      .includes('moto');
  }

  $: vehicles = rawVehicles.filter((v) => !vehicleRowIsMoto(v));
  $: brands = Array.isArray($data.vehicleBrands) ? $data.vehicleBrands : [];
  $: types = vehicleTypesList.filter((t) => {
    const tid = t?.id != null && t.id !== '' ? Number(t.id) : NaN;
    if (!Number.isNaN(tid) && motoTypeIds.has(tid)) return false;
    if (String(tipoCatalogName(t)).toLowerCase().includes('moto')) return false;
    return true;
  });
  $: locations = Array.isArray($data.locations) ? $data.locations : [];
  $: isLoading = $data.isLoading;

  function locationLabel(loc) {
    return loc?.name ?? loc?.nombre ?? '';
  }

  onMount(async () => {
    try {
      await Promise.all([
        data.fetchVehicles(),
        data.fetchVehicleBrands(),
        data.fetchVehicleTypes(),
        data.fetchLocations().catch(e => console.warn('No se cargó ubicaciones:', e)),
      ]);
    } catch (e) {
      console.error("Error al cargar datos iniciales:", e);
    }
  });

  async function handleCreateVehicle(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      const created = await data.createVehicle(formatVehiclePayload(newVehicle));
      const vid = created?.id;
      let docExtra = "";
      if (vid != null) {
        try {
          const parts = [];
          if (docSoatVencimiento) {
            await persistVehicleDocument(vid, "SOAT", docSoatVencimiento, docSoatFile);
            parts.push("SOAT");
          }
          if (docTecnoVencimiento) {
            await persistVehicleDocument(vid, "TECNOMECANICA", docTecnoVencimiento, docTecnoFile);
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
          if (docExtintorMes && docExtintorMes.length >= 7) {
            const [y, m] = docExtintorMes.split("-").map(Number);
            const last = new Date(y, m, 0).getDate();
            const fechaExt = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
            await persistVehicleDocument(vid, "EXTINTOR", fechaExt, docExtintorFile);
            parts.push("Extintor");
          }
          if (parts.length) docExtra = " Documentación: " + parts.join(", ") + ".";
        } catch (docErr) {
          docExtra =
            " " +
            (docErr.message ||
              "No se pudieron guardar algunos documentos (¿rol ADMIN?).");
        }
      }
      newVehicle = { ...initialVehicleState };
      docSoatVencimiento = "";
      docTecnoVencimiento = "";
      docTarjetaPropiedadFile = null;
      docExtintorMes = "";
      docSoatFile = null;
      docTecnoFile = null;
      docExtintorFile = null;
      addNotification({ id: Date.now(), text: "Vehículo creado con éxito." + docExtra });
    } catch (e) {
      errorMessage = e.message || "Error al crear vehículo.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUpdateVehicle(event) {
    event.preventDefault();
    if (!vehicleInEditor) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.updateVehicle(vehicleInEditor.id, formatVehiclePayload(vehicleInEditor));
      closeEditModal();
      addNotification({ id: Date.now(), text: 'Vehículo actualizado con éxito.' });
    } catch (e) {
      errorMessage = e.message || "Error al actualizar vehículo.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteVehicle() {
    if (!vehicleToDelete) return;
    errorMessage = "";
    try {
      await data.deleteVehicle(vehicleToDelete.id);
      vehicleToDelete = null;
      addNotification({ id: Date.now(), text: 'Vehículo eliminado con éxito.' });
    } catch (e) {
      errorMessage = e.message || "Error al eliminar vehículo.";
    }
  }

  async function handleAction(event) {
    const { type, data: vehicleData } = event.detail;
    if (type === "edit") {
      await openEditModal(vehicleData);
    } else if (type === "delete") {
      vehicleToDelete = vehicleData;
    } else if (type === "cv") {
      openCurriculumModal(vehicleData);
    } else if (type === "docHistory") {
      openDocHistoryModal(vehicleData);
    } else if (type === "update_docs") {
      openDocModal(vehicleData);
    }
  }

  async function openEditModal(vehicle) {
    try {
      const fullVehicle = await data.getVehicleByPlaca(vehicle.placa);
      console.log("🔍 fullVehicle cargado:", fullVehicle);
      vehicleInEditor = {
        ...fullVehicle,
        idMarca: resolveBrandIdFromVehicle(fullVehicle),
        idTipoVehiculo: resolveTipoIdFromVehicle(fullVehicle),
        idUbicacionBase: (() => {
          const raw = fullVehicle.idUbicacionBase;
          if (raw == null || raw === '') return null;
          const n = Number(raw);
          return Number.isNaN(n) ? null : n;
        })(),
        belongsTo: (fullVehicle.belongsTo && fullVehicle.belongsTo.trim()) ? fullVehicle.belongsTo.trim().toLowerCase() : 'distrito',
        activo: fullVehicle.activo !== false && fullVehicle.activo !== 'false' && fullVehicle.activo !== 0 && fullVehicle.activo !== '0',
        fuelTankCapacityGallons: fullVehicle.fuelTankCapacityGallons ?? null,
        factoryEfficiencyKmPerGallon: fullVehicle.factoryEfficiencyKmPerGallon ?? null,
        factoryEfficiencyUnit: fullVehicle.factoryEfficiencyUnit ?? 'KM_PER_GALLON',
      };
      console.log("✏️ vehicleInEditor.belongsTo asignado a:", vehicleInEditor.belongsTo);
      showEditModal = true;
    } catch (e) {
      errorMessage = 'No se pudo cargar el vehículo para editar.';
      addNotification({ id: Date.now(), text: e.message || 'Error al cargar vehículo.' });
    }
  }

  function closeEditModal() {
    showEditModal = false;
    vehicleInEditor = null;
    errorMessage = "";
  }

  function closeDocHistoryModal() {
    showDocHistoryModal = false;
    docHistoryVehicle = null;
    docHistory = null;
    docHistoryLoading = false;
  }

  async function openDocHistoryModal(vehicle) {
    docHistoryVehicle = vehicle;
    showDocHistoryModal = true;
    docHistoryLoading = true;
    docHistory = null;
    try {
      docHistory = await data.getVehicleDocumentHistory(vehicle.id);
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "No se pudo cargar el historial." });
      showDocHistoryModal = false;
    } finally {
      docHistoryLoading = false;
    }
  }

  async function handleExportVehicles() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/curriculum/export/vehicles`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vehiculos_curriculum.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Archivo de vehículos descargado con éxito.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
</script>

{#if isLoading && vehicles.length === 0}
  <div class="vehicle-module">
    <div class="vehicle-loader">
      <Loader />
      <p>Cargando vehículos...</p>
    </div>
  </div>
{:else}
  <div class="vehicle-module">
    <div class="vehicle-module-inner">
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchVehicles()}>
          Refrescar
        </button>
        <button class="vehicle-btn vehicle-btn--export" on:click={handleExportVehicles} disabled={isExporting}>
          {#if isExporting}<span class="spin">⟳</span>{/if}
          {isExporting ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>

    {#if isAdmin || isSupervisorOperativo}
    <div class="vehicle-form-section">
      <div class="vehicle-subpanel-head">Registrar nuevo vehículo</div>
      <form class="create-form create-form--compact" on:submit={handleCreateVehicle}>
        <div class="create-grid">
          <label class="field">
            <span class="field-lab">Placa</span>
            <input type="text" bind:value={newVehicle.placa} placeholder="Ej: ABC123" required disabled={isSubmitting} />
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Marca
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('brand')}>+ Añadir</button>
            </span>
            <select
              required
              disabled={isSubmitting}
              value={newVehicle.idMarca == null ? '' : String(newVehicle.idMarca)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                newVehicle.idMarca = raw === '' ? null : Number(raw);
              }}
            >
              <option value="">— Seleccione marca —</option>
              {#each brands as brand}
                <option value={String(brand.idMarca)}>{brand.descripcion}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Tipo
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('type')}>+ Añadir</button>
            </span>
            <select
              required
              disabled={isSubmitting}
              value={newVehicle.idTipoVehiculo == null ? '' : String(newVehicle.idTipoVehiculo)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                newVehicle.idTipoVehiculo = raw === '' ? null : Number(raw);
              }}
            >
              <option value="">—</option>
              {#each types as type}
                <option value={String(type.id)}>{type.name}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Km inicial</span>
            <input type="number" bind:value={newVehicle.kilometrajeActual} min="0" required disabled={isSubmitting} />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={newVehicle.belongsTo} required disabled={isSubmitting}>
              <option value="">— Seleccionar —</option>
              <option value="distrito">Distrito</option>
              <option value="asociacion">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Ubicación
              <button type="button" class="field-add-btn" disabled={isSubmitting} on:click={() => openQuickCatalog('location')}>+ Añadir</button>
            </span>
            <select
              disabled={isSubmitting}
              value={newVehicle.idUbicacionBase != null && newVehicle.idUbicacionBase !== '' ? String(newVehicle.idUbicacionBase) : ''}
              on:change={(e) => {
                const v = e.currentTarget.value;
                newVehicle.idUbicacionBase = v === "" ? null : Number(v);
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
              value={newVehicle.activo === true || newVehicle.activo === 'true' || newVehicle.activo === 1 || newVehicle.activo === '1' ? '1' : '0'}
              on:change={(e) => {
                newVehicle.activo = e.currentTarget.value === '1';
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
              bind:value={newVehicle.fuelTankCapacityGallons}
              placeholder="Ej: 18.5"
              disabled={isSubmitting}
            />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 110px;gap:4px;align-items:center">
              <input
                type="number" step="0.01" min="0"
                bind:value={newVehicle.factoryEfficiencyKmPerGallon}
                placeholder="Ej: 42.5"
                disabled={isSubmitting}
               
              />
              <select bind:value={newVehicle.factoryEfficiencyUnit} disabled={isSubmitting} style="width:130px">
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
            <input type="date" bind:value={docSoatVencimiento} disabled={isSubmitting} />
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
            <input type="date" bind:value={docTecnoVencimiento} disabled={isSubmitting} />
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
          <label class="field field-doc">
            <span class="field-lab">Extintor — mes</span>
            <input type="month" bind:value={docExtintorMes} disabled={isSubmitting} />
          </label>
          <label class="field field-doc file-upload-win" class:file-upload-win--disabled={isSubmitting}>
            <span class="field-lab">Archivo extintor</span>
            <div class="file-upload-win__row" class:file-upload-win__row--disabled={isSubmitting}>
              <div class="file-upload-win__inner">
                <span class="file-upload-win__name" class:file-upload-win__name--empty={!docExtintorFile?.length}>{filePickLabel(docExtintorFile)}</span>
                <span class="file-upload-win__btn">Examinar…</span>
              </div>
              <input type="file" class="file-upload-win__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={docExtintorFile} disabled={isSubmitting} />
            </div>
          </label>
        </div>
        <div class="create-actions">
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar vehículo"}
          </button>
        </div>
      </form>
      {#if errorMessage}
        <p class="vehicle-catalog-inline-error">{errorMessage}</p>
      {/if}
    </div>
    {/if}

    <div class="vehicle-table-wrap vehicle-table-wrap--inset">
      <DataGrid columns={vehicleManagementColumns} data={vehicles} on:action={handleAction} totalElements={vehicles.length} showDeleteButton={isAdmin} />
    </div>
    </div>
  </div>
{/if}

{#if isAdmin || isSupervisorOperativo}
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Vehículo</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateVehicle}>
        <div class="modal-form-grid">
          <label class="field">
            <span class="field-lab">Placa</span>
            <input type="text" bind:value={vehicleInEditor.placa} required />
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Marca
              <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('brand')}>+ Añadir</button>
            </span>
            <select
              required
              value={vehicleInEditor.idMarca == null ? '' : String(vehicleInEditor.idMarca)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                vehicleInEditor.idMarca = raw === '' ? null : Number(raw);
              }}
            >
              <option value="">— Seleccione marca —</option>
              {#each brands as brand}
                <option value={String(brand.idMarca)}>{brand.descripcion}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Tipo
              <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('type')}>+ Añadir</button>
            </span>
            <select
              required
              value={vehicleInEditor.idTipoVehiculo == null ? '' : String(vehicleInEditor.idTipoVehiculo)}
              on:change={(e) => {
                const raw = e.currentTarget.value;
                vehicleInEditor.idTipoVehiculo = raw === '' ? null : Number(raw);
              }}
            >
              <option value="">— Seleccione tipo —</option>
              {#each types as type}
                <option value={String(type.id)}>{type.name}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span class="field-lab">Km actual</span>
            <input type="number" bind:value={vehicleInEditor.kilometrajeActual} required />
          </label>
          <label class="field">
            <span class="field-lab">Pertenece a</span>
            <select bind:value={vehicleInEditor.belongsTo}>
              <option value="">— Seleccionar —</option>
              <option value="distrito">Distrito</option>
              <option value="asociacion">Asociación</option>
            </select>
          </label>
          <label class="field">
            <span class="field-lab field-lab-row">
              Ubicación
              <button type="button" class="field-add-btn" on:click={() => openQuickCatalog('location')}>+ Añadir</button>
            </span>
            <select
              value={vehicleInEditor.idUbicacionBase != null && vehicleInEditor.idUbicacionBase !== '' ? String(vehicleInEditor.idUbicacionBase) : ''}
              on:change={(e) => {
                const v = e.currentTarget.value;
                vehicleInEditor.idUbicacionBase = v === "" ? null : Number(v);
              }}
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
              value={vehicleInEditor.activo === true || vehicleInEditor.activo === 'true' || vehicleInEditor.activo === 1 || vehicleInEditor.activo === '1' ? '1' : '0'}
              on:change={(e) => {
                vehicleInEditor.activo = e.currentTarget.value === '1';
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
              bind:value={vehicleInEditor.fuelTankCapacityGallons}
              placeholder="Ej: 18.5"
            />
          </label>
          <label class="field">
            <span class="field-lab">Eficiencia de fábrica</span>
            <div style="display:grid;grid-template-columns:1fr 110px;gap:4px;align-items:center">
              <input
                type="number" step="0.01" min="0"
                bind:value={vehicleInEditor.factoryEfficiencyKmPerGallon}
                placeholder="Ej: 42.5"
               
              />
              <select bind:value={vehicleInEditor.factoryEfficiencyUnit} style="width:130px">
                <option value="KM_PER_GALLON">km/Gal</option>
                <option value="KM_PER_CUBIC_METER">km/m³ (gas)</option>
              </select>
            </div>
          </label>
          {/if}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
{#if vehicleToDelete}
  <div class="modal-overlay" on:click={() => vehicleToDelete = null}>
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar Eliminación</h3>
      <p>¿Está seguro que desea eliminar el vehículo con placa <b>{vehicleToDelete.placa}</b>?</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={() => vehicleToDelete = null}>Cancelar</button>
        <button type="button" class="btn-delete" on:click={handleDeleteVehicle}>Sí, Eliminar</button>
      </div>
    </div>
  </div>
{/if}
{/if}

{#if showDocHistoryModal}
  <div class="modal-overlay" on:click={closeDocHistoryModal}>
    <div class="modal-content modal-doc-history" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Historial de documentación — {docHistoryVehicle?.placa ?? ''}</h3>
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
                  <td class="doc-fecha-registro">{row.subidoEn ? new Date(row.subidoEn).toLocaleString('es-CO', { dateStyle:'short', timeStyle:'short' }) : '—'}</td>
                  <td class="doc-col-por">{formatSubidoPor(row.subidoPor)}</td>
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
        <p class="doc-history-empty">Sin registros de documentos para este vehículo.</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeDocHistoryModal}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}

{#if quickModal}
  <div class="modal-overlay modal-overlay-front" role="presentation" on:click={closeQuickCatalog}>
    <div class="modal-content modal-quick" role="dialog" aria-modal="true" aria-labelledby="quick-cat-title" on:click|stopPropagation>
      <div class="modal-header">
        <h3 id="quick-cat-title">{quickModalTitles[quickModal]}</h3>
        <button type="button" class="close-btn" on:click={closeQuickCatalog}>×</button>
      </div>
      <label class="quick-label">
        Nombre
        <input
          type="text"
          bind:value={quickName}
          maxlength="200"
          disabled={quickSubmitting}
          placeholder={quickModal === 'brand' ? 'Ej: Toyota' : quickModal === 'type' ? 'Ej: Camión' : 'Ej: Logística'}
        />
      </label>
      {#if quickError}
        <p class="vehicle-catalog-inline-error">{quickError}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" disabled={quickSubmitting} on:click={closeQuickCatalog}>Cancelar</button>
        <button type="button" class="btn-save" disabled={quickSubmitting} on:click={submitQuickCatalog}>
          {quickSubmitting ? 'Guardando…' : 'Guardar y usar'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showCvModal}
  <div class="modal-overlay">
    <div class="modal-content large" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Hoja de Vida: {curriculumData?.vehicle?.placa ?? 'Cargando...'}</h3>
        <button class="close-btn" on:click={closeCurriculumModal}>×</button>
      </div>
      {#if isCvLoading}
        <div class="loader-container"><Loader /></div>
      {:else if curriculumData?.results?.length > 0}
        <div class="table-wrapper modal-table">
          <DataGrid columns={curriculumColumns} data={curriculumData.results} />
        </div>
      {:else}
        <p style="padding:16px">No hay registros en la hoja de vida para este vehículo.</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeCurriculumModal}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}

{#if docModalOpen && docModalRow}
  {#key docModalRow.placa}
    <DocumentUpdateModal
      placa={docModalRow.placa}
      soatVencimiento={docModalRow.soat?.fechaVencimiento ?? null}
      tecnoVencimiento={docModalRow.tecno?.fechaVencimiento ?? null}
      isSubmitting={docModalSubmitting}
      on:submit={handleDocSubmit}
      on:cancel={resetDocModal}
    />
  {/key}
{/if}

<style>
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
  .modal-overlay-front {
    z-index: 1100;
  }
  .quick-help {
    margin: 0 0 10px;
    font-size: 10px;
    color: #404040;
  }
  .quick-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: bold;
  }
  .quick-label input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
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
  /* Modales */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
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
    box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
  }
  .modal-content.confirmation,
  .modal-content.modal-quick {
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
  .btn-cancel { background: #d0d0d0; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .btn-save { background: #90ee90; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .btn-delete { background: #ff6b6b; color: white; border: 1px outset #fff; padding: 4px 10px; cursor: pointer; }
  .modal-content.large {
    width: min(1200px, 96vw);
    min-width: min(80%, 600px);
    max-width: 96vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  .table-wrapper { overflow: hidden; }
  .modal-table { flex: 1; min-height: 0; margin-top: 16px; }
  .loader-container { display: flex; justify-content: center; align-items: center; flex: 1; }
  .modal-content.modal-doc-history {
    width: fit-content;
    min-width: min(720px, 96vw);
    max-width: min(96vw, 1200px);
    max-height: min(92vh, 900px);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
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
    max-height: min(72vh, 640px);
    overflow: auto;
    border: 1px solid #a0a0a0;
    background: #fff;
    margin-bottom: 4px;
  }
  .doc-history-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .doc-history-table th,
  .doc-history-table td {
    border: 1px solid #c0c0c0;
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }
  .doc-history-table td.doc-col-por {
    white-space: normal;
    max-width: 12rem;
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
</style>
