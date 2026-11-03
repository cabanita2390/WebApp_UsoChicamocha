<script>
  // Presión de llantas (backend /api/v1/tire; en el backend cada configuración es un
  // "perfil"). Una configuración dice cuántas llantas tiene un tipo de activo y qué
  // presión deben tener; se asigna a vehículos, motos o máquinas y entonces la
  // preoperativa del móvil pide medirlas. Es solo reporte: fuera de rango no genera
  // órdenes ni notificaciones. Estilo "moderno" (tokens .sub-mod), como Combustibles.
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import Loader from "../shared/Loader.svelte";
  import TireDiagram from "../shared/TireDiagram.svelte";
  import TireProfileEditor from "./llantas/TireProfileEditor.svelte";
  import TireAssignModal from "./llantas/TireAssignModal.svelte";
  import { APLICA_A_OPCIONES, aplicaALabel, aplicaAPlural, contarActivos, esMoto, resumenRangos } from "../../lib/presionLlantas.js";

  $: canEdit = ["ADMIN", "SUPERVISOR_OPERATIVO"].includes($auth?.currentUser?.role);

  let isLoading = true;
  let loadError = "";
  let filtroTipo = "";

  $: profiles = [...(Array.isArray($data.tireProfiles) ? $data.tireProfiles : [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
  $: assignments = Array.isArray($data.tireAssignments) ? $data.tireAssignments : [];
  $: visibles = filtroTipo ? profiles.filter((p) => p.aplicaA === filtroTipo) : profiles;
  $: nombrePerfil = new Map(profiles.map((p) => [p.id, p.nombre]));

  // Activos de cada tipo, con la configuración que tienen hoy (GET /vehicle trae motos también).
  $: perfilPorId = new Map(profiles.map((p) => [p.id, p]));
  $: activosPorTipo = agregarFueraDeInventario(
    {
      VEHICULO: ($data.vehicles ?? []).filter((v) => !esMoto(v)).map((v) => activoVehiculo(v, assignments)),
      MOTOCICLETA: ($data.motos ?? []).map((v) => activoVehiculo(v, assignments)),
      MAQUINARIA: ($data.machines ?? []).map((m) => activoMaquina(m, assignments)),
    },
    assignments,
    perfilPorId,
  );
  $: etiquetaActivo = new Map(Object.values(activosPorTipo).flat().map((a) => [a.key, a.label]));
  $: asignadosPorPerfil = assignments.reduce((acc, a) => {
    const key = a.machineId != null ? `m${a.machineId}` : `v${a.vehicleId}`;
    const fallback = a.machineId != null ? `Máquina #${a.machineId}` : `Vehículo #${a.vehicleId}`;
    (acc[a.perfilId] ??= []).push(etiquetaActivo.get(key) ?? fallback);
    return acc;
  }, {});
  $: sinConfig = Object.fromEntries(
    APLICA_A_OPCIONES.map((o) => [o.value, activosPorTipo[o.value].filter((a) => a.perfilActualId == null).length]),
  );

  // Un activo eliminado (borrado lógico) conserva su asignación y ya no sale en los
  // listados: se agrega aparte para que se vea y se pueda quitar desde "Asignar" (si
  // no, la configuración quedaría en uso para siempre y no se podría eliminar).
  function agregarFueraDeInventario(porTipo, asignaciones, perfiles) {
    const conocidos = new Set(Object.values(porTipo).flat().map((a) => a.key));
    const resultado = { ...porTipo };
    for (const a of asignaciones) {
      const esMaquina = a.machineId != null;
      const id = esMaquina ? a.machineId : a.vehicleId;
      const key = `${esMaquina ? "m" : "v"}${id}`;
      if (conocidos.has(key)) continue;
      const tipo = esMaquina ? "MAQUINARIA" : perfiles.get(a.perfilId)?.aplicaA ?? "VEHICULO";
      resultado[tipo] = [
        ...(resultado[tipo] ?? []),
        {
          key,
          id,
          esMaquina,
          label: `${esMaquina ? "Máquina" : "Vehículo"} #${id}`,
          detalle: "Ya no está en el inventario (eliminado)",
          perfilActualId: a.perfilId,
          perfilActualNombre: null,
        },
      ];
    }
    return resultado;
  }

  function perfilDe(asignaciones, filtro) {
    const a = asignaciones.find(filtro);
    return a ? a.perfilId : null;
  }
  function activoVehiculo(v, asignaciones) {
    const perfilActualId = perfilDe(asignaciones, (a) => a.vehicleId === v.id);
    return {
      key: `v${v.id}`,
      id: v.id,
      esMaquina: false,
      label: v.placa ?? `#${v.id}`,
      detalle: [v.marca, typeof v.tipoVehiculo === "string" ? v.tipoVehiculo : v.tipoVehiculo?.nombreTipo].filter(Boolean).join(" · "),
      perfilActualId,
      perfilActualNombre: null,
    };
  }
  function activoMaquina(m, asignaciones) {
    return {
      key: `m${m.id}`,
      id: m.id,
      esMaquina: true,
      label: m.name ?? `#${m.id}`,
      detalle: [m.model, m.numInterIdentification].filter(Boolean).join(" · "),
      perfilActualId: perfilDe(asignaciones, (a) => a.machineId === m.id),
      perfilActualNombre: null,
    };
  }

  onMount(async () => {
    // Los activos dan nombre a las asignaciones y llenan "Asignar": si fallan, se muestra el id.
    if (!($data.machines ?? []).length) data.fetchMachines().catch(() => {});
    if (!($data.vehicles ?? []).length) data.fetchVehicles().catch(() => {});
    if (!($data.motos ?? []).length) data.fetchMotos().catch(() => {});
    await refresh();
  });

  async function refresh() {
    isLoading = true;
    loadError = "";
    try {
      await Promise.all([data.fetchTireProfiles(), data.fetchTireAssignments()]);
    } catch (e) {
      loadError = e.message || "No se pudieron cargar las configuraciones de llantas.";
    } finally {
      isLoading = false;
    }
  }

  function resumenAsignados(lista) {
    if (lista.length <= 3) return lista.join(", ");
    return `${lista.slice(0, 3).join(", ")} y ${lista.length - 3} más`;
  }

  // ── Crear / editar ──────────────────────────────────────────────────────
  let editor = null; // { perfil | null }
  let guardando = false;
  let errorEditor = "";

  function abrirEditor(perfil = null) {
    editor = { perfil };
    errorEditor = "";
  }

  async function guardarPerfil(event) {
    const payload = event.detail;
    guardando = true;
    errorEditor = "";
    try {
      if (editor.perfil == null) {
        const creado = await data.createTireProfile(payload);
        editor = null;
        addNotification({ id: Date.now(), text: `Configuración "${payload.nombre}" creada. Ahora asígnela a sus ${aplicaAPlural(payload.aplicaA)}.` });
        if (creado?.id != null && canEdit) abrirAsignar(creado);
      } else {
        await data.updateTireProfile(editor.perfil.id, payload);
        // Las asignaciones traen las llantas de la configuración: se refrescan para no mostrar las viejas.
        await data.fetchTireAssignments().catch(() => {});
        editor = null;
        addNotification({ id: Date.now(), text: `Configuración "${payload.nombre}" actualizada.` });
      }
    } catch (e) {
      errorEditor = e.message || "No se pudo guardar la configuración.";
    } finally {
      guardando = false;
    }
  }

  async function eliminarPerfil() {
    const perfil = editor.perfil;
    guardando = true;
    try {
      await data.deleteTireProfile(perfil.id);
      editor = null;
      addNotification({ id: Date.now(), text: `Configuración "${perfil.nombre}" eliminada.` });
    } catch (e) {
      errorEditor = e.message || "No se pudo eliminar la configuración.";
    } finally {
      guardando = false;
    }
  }

  // ── Asignar ─────────────────────────────────────────────────────────────
  let asignando = null; // perfil
  let errorAsignar = "";

  function abrirAsignar(perfil) {
    asignando = perfil;
    errorAsignar = "";
  }

  $: activosAsignar = asignando
    ? activosPorTipo[asignando.aplicaA].map((a) => ({ ...a, perfilActualNombre: nombrePerfil.get(a.perfilActualId) ?? null }))
    : [];

  async function guardarAsignaciones(event) {
    const { asignar, quitar } = event.detail;
    guardando = true;
    errorAsignar = "";
    const fallidos = [];
    for (const [lista, perfilId] of [[asignar, asignando.id], [quitar, null]]) {
      for (const a of lista) {
        try {
          if (a.esMaquina) await data.assignTireProfileMachine(a.id, perfilId);
          else await data.assignTireProfileVehicle(a.id, perfilId);
        } catch (e) {
          fallidos.push(`${a.label}: ${e.message || "error"}`);
        }
      }
    }
    guardando = false;
    if (fallidos.length) {
      errorAsignar = `No se guardaron ${fallidos.length}: ${fallidos.join("; ")}`;
      return;
    }
    addNotification({ id: Date.now(), text: `Asignaciones de "${asignando.nombre}" guardadas.` });
    asignando = null;
  }
</script>

<div class="sub-mod llantas">
  <div class="sub-head">
    <div class="sub-head-text">
      <h2 class="sub-title">Presión de llantas</h2>
      <p class="sub-subtitle">Defina cuántas llantas tiene cada tipo de activo y qué presión deben tener.</p>
    </div>
    <button type="button" class="sub-btn" on:click={refresh}>Refrescar</button>
    {#if canEdit}
      <button type="button" class="sub-btn-primary" on:click={() => abrirEditor()}>+ Nueva configuración</button>
    {/if}
  </div>

  <ol class="sub-card como">
    <li><span class="n">1</span><span><strong>Cree una configuración</strong>: cuántas llantas y qué presión mínima y máxima en PSI.</span></li>
    <li><span class="n">2</span><span><strong>Asígnela</strong> a los vehículos, motos o máquinas que tienen esas llantas.</span></li>
    <li><span class="n">3</span><span><strong>El operario mide</strong> cada llanta en la preoperativa del celular; en Inspecciones verá si quedaron bajas o altas.</span></li>
  </ol>

  {#if isLoading}
    <div class="sub-card estado"><Loader /><p>Cargando configuraciones...</p></div>
  {:else if loadError}
    <div class="sub-card estado"><p class="sub-field-error">{loadError}</p></div>
  {:else}
    <div class="filtros">
      <div class="sub-seg" role="group" aria-label="Filtrar por tipo">
        <button type="button" class:on={filtroTipo === ""} on:click={() => (filtroTipo = "")}>Todas ({profiles.length})</button>
        {#each APLICA_A_OPCIONES as o}
          <button type="button" class:on={filtroTipo === o.value} on:click={() => (filtroTipo = o.value)}>
            {o.value === "MAQUINARIA" ? o.label : aplicaAPlural(o.value).replace(/^./, (c) => c.toUpperCase())} ({profiles.filter((p) => p.aplicaA === o.value).length})
          </button>
        {/each}
      </div>
      {#if filtroTipo && sinConfig[filtroTipo] > 0}
        <span class="sub-field-hint">{contarActivos(sinConfig[filtroTipo], filtroTipo)} todavía sin configuración: no se les pide presión.</span>
      {/if}
    </div>

    {#if visibles.length}
      <div class="grid">
        {#each visibles as perfil (perfil.id)}
          {@const asignados = asignadosPorPerfil[perfil.id] ?? []}
          <article class="sub-card card">
            <div class="card-main">
              <TireDiagram posiciones={perfil.posiciones ?? []} ancho={100} moto={perfil.aplicaA === "MOTOCICLETA"} />
              <div class="card-info">
                <h3>{perfil.nombre}</h3>
                <div class="chips">
                  <span class="sub-badge neu">{aplicaALabel(perfil.aplicaA)}</span>
                  <span class="sub-badge neu">{perfil.posiciones?.length ?? 0} llantas</span>
                </div>
                <dl class="rangos">
                  {#each resumenRangos(perfil) as r}
                    <dt>{r.titulo}</dt><dd>{r.rango}</dd>
                  {/each}
                </dl>
                {#if perfil.descripcion}<p class="nota">{perfil.descripcion}</p>{/if}
              </div>
            </div>
            <div class="card-uso" class:vacio={!asignados.length}>
              {#if asignados.length}
                Se pide en {contarActivos(asignados.length, perfil.aplicaA)}: <strong>{resumenAsignados(asignados)}</strong>
              {:else}
                Aún no está asignada: no se le pide a ningún {aplicaALabel(perfil.aplicaA) === 'Maquinaria' ? 'equipo' : aplicaALabel(perfil.aplicaA).toLowerCase()}.
              {/if}
            </div>
            {#if canEdit}
              <div class="card-actions">
                <button type="button" class="sub-btn" on:click={() => abrirEditor(perfil)}>Editar</button>
                <button type="button" class="sub-btn-primary" on:click={() => abrirAsignar(perfil)}>
                  Asignar {aplicaAPlural(perfil.aplicaA)}
                </button>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="sub-card vacia">
        <TireDiagram posiciones={[{ codigo: "DI" }, { codigo: "DD" }, { codigo: "TI" }, { codigo: "TD" }]} ancho={70} />
        <div>
          <h3>{filtroTipo ? `No hay configuraciones para ${aplicaAPlural(filtroTipo)}` : "Todavía no hay configuraciones de llantas"}</h3>
          <p>Mientras un activo no tenga una configuración, la preoperativa no pide la presión de sus llantas.</p>
          {#if canEdit}
            <button type="button" class="sub-btn-primary" on:click={() => abrirEditor()}>+ Crear la primera</button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}

  {#if editor}
    <TireProfileEditor
      perfil={editor.perfil}
      asignados={editor.perfil ? (asignadosPorPerfil[editor.perfil.id] ?? []).length : 0}
      {guardando}
      error={errorEditor}
      on:close={() => (editor = null)}
      on:save={guardarPerfil}
      on:delete={eliminarPerfil}
    />
  {/if}

  {#if asignando}
    <TireAssignModal
      perfil={asignando}
      activos={activosAsignar}
      {guardando}
      error={errorAsignar}
      on:close={() => (asignando = null)}
      on:save={guardarAsignaciones}
    />
  {/if}
</div>

<style>
  .como {
    list-style: none;
    margin: 0;
    padding: 14px 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    font-size: 13px;
    color: var(--sub-ink-2);
  }
  .como li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    line-height: 1.45;
  }
  .como strong {
    color: var(--sub-ink);
  }
  .n {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--sub-blue-soft);
    color: var(--sub-blue);
    font-size: 12px;
    font-weight: 700;
  }
  .estado {
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--sub-muted);
  }
  .filtros .sub-seg {
    flex-wrap: wrap;
  }
  .filtros {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: 14px;
  }
  .card {
    display: flex;
    flex-direction: column;
  }
  .card-main {
    display: flex;
    gap: 16px;
    padding: 16px 18px 12px;
  }
  .card-info {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 650;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .rangos {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
    font-size: 13px;
  }
  .rangos dt {
    color: var(--sub-muted);
  }
  .rangos dd {
    margin: 0;
    font-weight: 600;
  }
  .nota {
    margin: 0;
    font-size: 12px;
    color: var(--sub-muted);
  }
  .card-uso {
    margin: auto 18px 0;
    padding: 10px 0;
    border-top: 1px solid var(--sub-border);
    font-size: 12.5px;
    color: var(--sub-ink-2);
  }
  .card-uso.vacio {
    color: var(--sub-warn);
  }
  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 18px 14px;
  }
  .card-actions button {
    padding: 7px 16px;
  }
  .vacia {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 28px 32px;
  }
  .vacia p {
    margin: 6px 0 14px;
    font-size: 13px;
    color: var(--sub-ink-2);
  }
  @media (max-width: 760px) {
    .como {
      grid-template-columns: minmax(0, 1fr);
    }
    .llantas {
      padding: 16px;
    }
  }
</style>
