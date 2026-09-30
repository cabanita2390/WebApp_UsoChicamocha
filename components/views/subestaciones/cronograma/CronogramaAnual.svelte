<script>
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { auth } from "../../../../stores/auth.js";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import {
    cronogramaAnioInicial,
    pantallaAmpliada,
    subestacionesActiveTab,
    ejecucionesFiltroInicial,
    detalleEstacionId,
    disciplinaFiltro,
  } from "../../../../stores/subestacionesFilters.js";
  import { DISCIPLINAS, MESES, disciplinaLabel } from "../../../../config/subestaciones.js";
  import {
    DENSIDAD,
    filtrarCitas,
    filasPorEstacion,
    filasPorActividad,
    totalesPorMes,
    estadoCita,
    fechaHora,
  } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import CronogramaGrid from "./CronogramaGrid.svelte";
  import CeldaPanel from "./CeldaPanel.svelte";
  import AsignacionMasiva from "./AsignacionMasiva.svelte";
  import PublicarModal from "./PublicarModal.svelte";

  $: esAdmin = $auth?.currentUser?.role === "ADMIN";

  // "Hoy" lo manda el servidor en cada GET /cronograma; hasta entonces, el del navegador.
  const ahora = new Date();
  let hoy = { anioActual: ahora.getFullYear(), mesActual: ahora.getMonth() + 1 };
  let anio = get(cronogramaAnioInicial) ?? hoy.anioActual;
  const anioPedido = get(cronogramaAnioInicial);
  cronogramaAnioInicial.set(null);

  let cron = null;
  let estaciones = [];
  let actividades = [];
  let cargando = true;
  let recargando = false;
  let errorCarga = "";
  let ocupado = false;
  let confirmarDescarte = false;
  let citasOrigenCopia = 0;

  // Filtros y vista (mockup §6.1–6.2)
  let por = "est";
  let vista = "act";
  // Misma disciplina que Dashboard y Resumen ("" = todas).
  let disciplina = get(disciplinaFiltro);
  let actividadId = "";
  let q = "";
  let densidad = "normal";
  let soloVencidas = false;
  let soloCambios = false;
  let modoEdicion = false;

  let celda = null;
  let masiva = null;
  let publicarAbierto = false;

  // Cada carga lleva un número: si el usuario cambia de año dos veces seguidas, solo se aplica
  // la respuesta de la última petición (una respuesta lenta del año anterior no pisa la nueva).
  let secuencia = 0;

  async function cargarCronograma() {
    const mia = ++secuencia;
    const pedido = anio;
    const r = await substationAdmin.obtenerCronograma(pedido);
    let origenCopia = citasOrigenCopia;
    if (!r.citas.length) {
      const origen = await substationAdmin.obtenerCronograma(pedido - 1);
      origenCopia = origen.citas.filter((c) => c.estado === "PUBLICADA").length;
    }
    if (mia !== secuencia) return;
    cron = r;
    citasOrigenCopia = origenCopia;
    hoy = { anioActual: r.anioActual, mesActual: r.mesActual };
  }

  async function inicio() {
    cargando = true;
    errorCarga = "";
    try {
      [estaciones, actividades] = await Promise.all([
        substationAdmin.listarEstaciones(),
        substationAdmin.listarActividades(),
      ]);
      await cargarCronograma();
      if (anioPedido == null && anio !== hoy.anioActual) {
        anio = hoy.anioActual;
        await cargarCronograma();
      }
    } catch (e) {
      errorCarga = e.message;
    } finally {
      cargando = false;
    }
  }
  inicio();

  async function recargar() {
    recargando = true;
    const mia = secuencia + 1;
    try {
      await cargarCronograma();
    } catch (e) {
      if (mia === secuencia) flash(e.message, { error: true });
    } finally {
      if (mia === secuencia) recargando = false;
    }
  }

  async function cambiarAnio(e) {
    anio = Number(e.target.value);
    celda = null;
    confirmarDescarte = false;
    soloCambios = false;
    await recargar();
  }

  onDestroy(() => pantallaAmpliada.set(false));

  // Escape sale de la vista ampliada (si no hay un panel o modal abierto, que se cierran primero).
  function onKeydown(e) {
    if (e.key === "Escape" && $pantallaAmpliada && !celda && !masiva && !publicarAbierto) {
      pantallaAmpliada.set(false);
    }
  }

  // ---- Datos derivados (mockup: renderVals) ----
  $: actividadesPorId = new Map(actividades.map((a) => [a.id, a]));
  $: estacionesPorId = new Map(estaciones.map((s) => [s.id, s]));
  $: estacionesActivas = estaciones.filter((s) => s.activa);
  $: estacionesVisibles = estacionesActivas.filter((s) => !q || s.nombre.toLowerCase().includes(q.toLowerCase()));
  $: actividadesAsignables = actividades.filter((a) => a.activa);
  $: citas = cron?.citas ?? [];
  $: borrador = cron?.borrador ?? { altas: 0, bajas: 0 };
  $: nCambios = borrador.altas + borrador.bajas;
  $: verSoloCambios = soloCambios && nCambios > 0;
  $: filtrosCitas = {
    anio,
    hoy,
    disciplina,
    actividadId: actividadId ? Number(actividadId) : null,
    soloVencidas,
    soloCambios: verSoloCambios,
  };
  $: visibles = filtrarCitas(citas, filtrosCitas);
  $: soloConCitas = soloVencidas || verSoloCambios;
  $: filas =
    por === "est"
      ? filasPorEstacion({
          estaciones: estacionesVisibles,
          citas: visibles,
          actividadesPorId,
          anio,
          hoy,
          densidad,
          disciplinaFiltrada: !!disciplina,
          celdaSeleccionada: celda,
          modoEdicion,
          soloConCitas,
        })
      : filasPorActividad({
          actividades: actividades.filter(
            (a) => verSoloCambios || ((!disciplina || a.disciplina === disciplina) && (!actividadId || a.id === Number(actividadId))),
          ),
          estacionesVisibles,
          citas: visibles,
          estacionesPorId,
          anio,
          hoy,
          densidad,
          celdaSeleccionada: celda,
          modoEdicion,
          soloConCitas: soloConCitas || !modoEdicion,
          disciplinaLabel,
        });
  $: totales = totalesPorMes(visibles, estacionesVisibles);
  // Citas de las estaciones que se ven (respeta la búsqueda): cabecera y total de la grilla.
  $: totalVisible = totales.reduce((a, n) => a + n, 0);
  $: vencidasN = citas.filter(
    (c) =>
      (!disciplina || c.disciplina === disciplina) &&
      estadoCita(c, anio, hoy) === "bad" &&
      estacionesVisibles.some((s) => s.id === c.estacionId),
  ).length;
  $: opcionesActividad = actividades.filter((a) => !disciplina || a.disciplina === disciplina);
  $: resumen =
    `${estacionesVisibles.length} estaciones · ${totalVisible} citas en ${anio}` +
    (disciplina ? ` · ${disciplinaLabel(disciplina)}` : " · todas las disciplinas");
  $: anioVacio = !cargando && cron && citas.length === 0;
  $: ultima = cron?.ultimaPublicacion;
  $: mensajeVacio = verSoloCambios
    ? "No hay cambios en borrador para mostrar."
    : soloVencidas
      ? "Sin citas vencidas pendientes para este filtro."
      : "Sin citas para el filtro seleccionado.";
  $: dens = DENSIDAD[por][densidad];

  // ---- Acciones ----
  async function ejecutar(accion, mensaje) {
    ocupado = true;
    try {
      const r = await accion();
      await recargar();
      if (mensaje) flash(typeof mensaje === "function" ? mensaje(r) : mensaje);
      return r;
    } catch (e) {
      flash(e.message, { error: true });
      return null;
    } finally {
      ocupado = false;
    }
  }

  function abrirCelda(e) {
    const { fila, celda: c, x, y } = e.detail;
    celda = por === "est" ? { estacionId: fila.id, mes: c.mes, x, y } : { actividadId: fila.id, mes: c.mes, x, y };
  }

  $: citasCelda = celda
    ? visibles.filter((c) =>
        celda.actividadId != null
          ? c.actividadId === celda.actividadId && c.mes === celda.mes && estacionesVisibles.some((s) => s.id === c.estacionId)
          : c.estacionId === celda.estacionId && c.mes === celda.mes,
      )
    : [];

  function quitar(e) {
    ejecutar(() => substationAdmin.quitar(e.detail.id), "Cambio guardado en borrador");
  }

  function restaurar(e) {
    ejecutar(() => substationAdmin.restaurar(e.detail.id));
  }

  async function asignarEnCelda(e) {
    const { actividadId: act, meses } = e.detail;
    const estacionId = celda.estacionId;
    const existentes = new Set(citas.filter((c) => c.actividadId === act && c.estacionId === estacionId).map((c) => c.mes));
    const nuevos = meses.filter((m) => !existentes.has(m));
    const r = await ejecutar(() => substationAdmin.asignar({ anio, actividadId: act, estacionIds: [estacionId], meses }));
    if (!r) return;
    celda = null;
    flash(
      r.creadas
        ? `${actividadesPorId.get(act)?.nombre} → ${estacionesPorId.get(estacionId)?.nombre} · ${nuevos
            .map((m) => MESES[m - 1])
            .join(", ")} (borrador)`
        : "Ya estaba asignada en esos meses",
    );
  }

  function verEjecuciones() {
    const { estacionId, mes } = celda;
    const mm = String(mes).padStart(2, "0");
    const ultimo = new Date(anio, mes, 0).getDate();
    ejecucionesFiltroInicial.set({ estacionId, fechaInicio: `${anio}-${mm}-01`, fechaFin: `${anio}-${mm}-${ultimo}` });
    celda = null;
    pantallaAmpliada.set(false);
    subestacionesActiveTab.set("ejecuciones");
  }

  function masivaAqui() {
    const act = actividadesPorId.get(celda.actividadId);
    masiva = {
      disciplina: act?.disciplina,
      actividadId: act?.id,
      estacionIds: citasCelda.map((c) => c.estacionId),
      meses: [celda.mes],
    };
    celda = null;
  }

  function abrirMasiva() {
    celda = null;
    masiva = { disciplina: disciplina || "CIVIL" };
  }

  async function asignado(e) {
    const { resultado, actividad } = e.detail;
    masiva = null;
    await recargar();
    soloCambios = true;
    flash(`${actividad.nombre} · ${resultado.creadas} citas en borrador — mostrando solo los cambios`);
  }

  function abrirFila(e) {
    const fila = e.detail;
    if (por === "act") {
      actividadId = String(fila.id);
      por = "est";
      return;
    }
    // Detalle por estación: vive dentro de la pestaña Dashboard (P4).
    detalleEstacionId.set(fila.id);
    pantallaAmpliada.set(false);
    subestacionesActiveTab.set("dashboard");
  }

  // Descartar es la única acción que no se puede deshacer: pide confirmación en dos pasos.
  async function descartar() {
    await ejecutar(
      () => substationAdmin.descartarBorrador(anio),
      (r) =>
        r?.conservadasConEjecucion
          ? `Borrador descartado · ${r.conservadasConEjecucion} cita(s) se conservan porque ya tienen ejecución registrada`
          : "Borrador descartado",
    );
    confirmarDescarte = false;
  }

  async function publicado(e) {
    publicarAbierto = false;
    await recargar();
    const r = e.detail;
    flash(
      r.noAplicadas?.length
        ? `Publicado · ${r.noAplicadas.length} cita(s) no se quitaron porque ya tienen ejecución`
        : "Publicado · la app móvil ya muestra el cronograma actualizado",
    );
  }

  async function deshacer() {
    const r = await ejecutar(
      () => substationAdmin.deshacerPublicacion(anio),
      "Publicación revertida · móvil vuelve a la versión anterior · los cambios quedan en borrador",
    );
    if (r) soloCambios = true;
  }

  async function copiarAnio() {
    const origen = anio - 1;
    const r = await ejecutar(
      () => substationAdmin.copiarAnio(origen, anio),
      (res) => `${res.creadas} citas copiadas a ${anio} como borrador · nada llega a móvil hasta publicar`,
    );
    if (r) soloCambios = false;
  }

  function cambiarDisciplina(e) {
    disciplina = e.target.value;
    disciplinaFiltro.set(disciplina);
    actividadId = "";
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div class="sub-mod">
  {#if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga && !cron}
    <ErrorCarga que="el cronograma" mensaje={errorCarga} on:reintentar={inicio} />
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Cronograma Anual</h1>
        <p class="sub-subtitle">{resumen} · click en una celda para ver o asignar actividades.</p>
      </div>
      <div class="herramientas">
        <span class="lbl">Filas</span>
        <div class="sub-seg chico">
          <button class:on={por === "est"} on:click={() => ((por = "est"), (celda = null))}>Estaciones</button>
          <button class:on={por === "act"} on:click={() => ((por = "act"), (celda = null))}>Actividades</button>
        </div>
        <div class="sub-seg chico">
          <button class:on={vista === "act"} on:click={() => (vista = "act")}>Actividades</button>
          <button class:on={vista === "count"} on:click={() => (vista = "count")}>Conteo</button>
        </div>
        <select class="ctl disc" value={disciplina} on:change={cambiarDisciplina} aria-label="Disciplina">
          <option value="">Todas las disciplinas</option>
          {#each DISCIPLINAS as d}<option value={d.value}>{d.label}</option>{/each}
        </select>
        <select class="ctl act" bind:value={actividadId} aria-label="Actividad">
          <option value="">Todas las actividades</option>
          {#each opcionesActividad as a (a.id)}
            <option value={String(a.id)}>{disciplina ? "" : `${disciplinaLabel(a.disciplina)} · `}{a.nombre}</option>
          {/each}
        </select>
        <select class="ctl anio" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
          {#each [hoy.anioActual, hoy.anioActual + 1] as y}<option value={String(y)}>{y}</option>{/each}
        </select>
        <input class="ctl buscar" bind:value={q} placeholder="Buscar estación…" />
        <button class="sub-btn chico-btn" on:click={() => pantallaAmpliada.update((v) => !v)}>
          {$pantallaAmpliada ? "⤡ Salir de vista ampliada" : "⤢ Ampliar"}
        </button>
        {#if esAdmin}
          <button class="sub-btn-primary" on:click={abrirMasiva}>Asignación masiva</button>
          <button class="modo" class:on={modoEdicion} on:click={() => (modoEdicion = !modoEdicion)}>
            {modoEdicion ? "✓ Modo asignación" : "+ Asignar actividades"}
          </button>
        {:else}
          <span class="sub-locked" title="Requiere rol ADMIN">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2"></path>
            </svg>Asignar · solo ADMIN
          </span>
        {/if}
      </div>
    </div>

    <div class="leyenda">
      <span class="ley"><span class="cuadro" style="background:#006300"></span>✓ Ejecutada</span>
      <span class="ley"><span class="cuadro" style="background:#d03b3b"></span>✕ No ejecutada</span>
      <span class="ley"><span class="cuadro" style="background:#fff;border:1px solid rgba(11,11,11,0.25)"></span>○ Programada</span>
      <span class="ley"><span class="cuadro" style="background:#dbe9fb;border:1.5px solid #2a78d6"></span>+ Nueva (borrador)</span>
      <span class="sep"></span><span class="gris">Pase el cursor sobre una actividad para ver su nombre completo.</span>
      <button class="vencidas" class:on={soloVencidas} on:click={() => (soloVencidas = !soloVencidas)}>
        {soloVencidas ? "✓" : "✕"} Solo pendientes vencidas · {vencidasN}
      </button>
      <div class="densidad">
        <span>Actividades por celda</span>
        <div class="sub-seg mini">
          {#each [["compacta", "Compacta · 2"], ["normal", "Normal · 3"], ["amplia", "Amplia · 5"]] as [id, l]}
            <button class:on={densidad === id} on:click={() => (densidad = id)}>{l}</button>
          {/each}
        </div>
      </div>
    </div>

    {#if nCambios > 0}
      <div class="borrador">
        <span class="tag">BORRADOR</span>
        <span class="borrador-txt">
          <strong>{nCambios} {nCambios === 1 ? "cambio" : "cambios"} sin publicar</strong>
          <span class="gris2">(+{borrador.altas} nuevas · −{borrador.bajas} quitadas).
            {#if ultima}Los técnicos siguen viendo la versión publicada el {fechaHora(ultima.publicadoEn)}.{:else}Los técnicos todavía no ven nada de {anio}.{/if}</span>
        </span>
        <div class="borrador-btns">
          <button class="solo" on:click={() => (soloCambios = !soloCambios)}>
            {verSoloCambios ? "Mostrar todo el cronograma" : "Ver solo los cambios"}
          </button>
          {#if esAdmin && confirmarDescarte}
            <span class="confirmar-txt">¿Descartar {nCambios} {nCambios === 1 ? "cambio" : "cambios"}? No se puede deshacer.</span>
            <button class="sub-btn chico-btn" disabled={ocupado} on:click={() => (confirmarDescarte = false)}>Cancelar</button>
            <button class="peligro" disabled={ocupado} on:click={descartar}>Sí, descartar</button>
          {:else if esAdmin}
            <button class="sub-btn chico-btn" disabled={ocupado} on:click={() => (confirmarDescarte = true)}>Descartar</button>
            <button class="sub-btn-primary" on:click={() => (publicarAbierto = true)}>Revisar y publicar a móvil</button>
          {/if}
        </div>
      </div>
    {:else if ultima}
      <div class="publicado">
        <span class="punto"></span>
        <span>Publicado a móvil · {fechaHora(ultima.publicadoEn)} · sin cambios pendientes</span>
        {#if cron.puedeDeshacer && esAdmin}
          <button class="deshacer" disabled={ocupado} on:click={deshacer}>↶ Deshacer última publicación</button>
        {/if}
      </div>
    {/if}

    {#if anioVacio}
      <div class="sub-card vacio-anio">
        <div class="va-t">{anio} todavía no tiene cronograma</div>
        <div class="va-p">
          Copie el año actual como punto de partida y ajuste solo las excepciones. Todo queda en <strong>borrador</strong>:
          los técnicos no ven nada hasta que publique, y puede descartarlo completo.
        </div>
        {#if esAdmin}
          <div class="va-btns">
            <button class="sub-btn-primary" disabled={ocupado || citasOrigenCopia === 0} on:click={copiarAnio}>
              Copiar {anio - 1} como borrador · {citasOrigenCopia} citas
            </button>
            <button class="sub-btn" on:click={abrirMasiva}>Empezar desde cero</button>
          </div>
        {/if}
      </div>
    {/if}

    <CronogramaGrid
      {filas}
      totalesMes={totales}
      total={totalVisible}
      {hoy}
      {anio}
      etiquetaFila={por === "act" ? "Actividad" : "Estación"}
      tituloFila={por === "act" ? "Ver esta actividad por estación" : "Ver detalle de estación"}
      conChips={vista === "act"}
      densidad={dens}
      dosColumnas={por === "act"}
      actualizando={recargando || ocupado}
      vacio={mensajeVacio}
      on:celda={abrirCelda}
      on:fila={abrirFila}
    />

    {#if celda}
      {#key celda}
        <CeldaPanel
          {celda}
          citas={citasCelda}
          {anio}
          {hoy}
          {esAdmin}
          {ocupado}
          {actividadesPorId}
          {estacionesPorId}
          {actividadesAsignables}
          on:close={() => (celda = null)}
          on:quitar={quitar}
          on:restaurar={restaurar}
          on:asignar={asignarEnCelda}
          on:verEjecuciones={verEjecuciones}
          on:masivaAqui={masivaAqui}
        />
      {/key}
    {/if}

    {#if masiva}
      <AsignacionMasiva
        {anio}
        {hoy}
        actividades={actividadesAsignables}
        estaciones={estacionesActivas}
        citasVigentes={citas}
        inicial={masiva}
        on:close={() => (masiva = null)}
        on:asignado={asignado}
      />
    {/if}

    {#if publicarAbierto}
      <PublicarModal {anio} anioActual={hoy.anioActual} on:close={() => (publicarAbierto = false)} on:publicado={publicado} />
    {/if}
  {/if}
  <SubToast />
</div>

<style>
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .herramientas {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .lbl {
    font-size: 12px;
    color: #52514e;
    white-space: nowrap;
  }
  .sub-seg.chico :global(button) {
    padding: 6px 14px;
    font-size: 12.5px;
  }
  .sub-seg.mini :global(button) {
    padding: 4px 11px;
    font-size: 12px;
  }
  .ctl {
    height: 34px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .disc {
    min-width: 130px;
  }
  .act {
    min-width: 190px;
    max-width: 260px;
  }
  .anio {
    min-width: 90px;
    font-weight: 600;
  }
  .buscar {
    width: 200px;
    padding: 0 12px;
  }
  .chico-btn {
    padding: 8px 16px;
  }
  .sub-btn-primary {
    padding: 9px 18px;
  }
  .modo {
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #0b0b0b;
  }
  .modo.on {
    border-color: #2a78d6;
    background: #e8f1fb;
    color: #1f5fae;
  }
  .leyenda {
    display: flex;
    gap: 8px 18px;
    flex-wrap: wrap;
    align-items: center;
    font-size: 12px;
    color: #52514e;
  }
  .ley {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .cuadro {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .sep {
    width: 1px;
    height: 14px;
    background: rgba(11, 11, 11, 0.12);
  }
  .gris {
    color: #898781;
  }
  .vencidas {
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #0b0b0b;
    font-weight: 600;
  }
  .vencidas.on {
    border-color: #d03b3b;
    background: #fbeaea;
    color: #d03b3b;
  }
  .densidad {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .borrador {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: 10px;
    background: #f1f6fd;
    border: 1px dashed #2a78d6;
  }
  .tag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 999px;
    background: #2a78d6;
    color: #fff;
  }
  .borrador-txt {
    font-size: 13px;
    flex: 1 1 280px;
    min-width: 0;
    text-wrap: pretty;
  }
  .gris2 {
    color: #52514e;
  }
  .borrador-btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .solo {
    background: #fff;
    color: #1f5fae;
    border: 1px solid #2a78d6;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .confirmar-txt {
    font-size: 13px;
    color: #d03b3b;
    font-weight: 600;
    align-self: center;
  }
  .peligro {
    background: #d03b3b;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .publicado {
    font-size: 12px;
    color: #52514e;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .punto {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #006300;
  }
  .deshacer {
    all: unset;
    cursor: pointer;
    color: #d03b3b;
    font-weight: 600;
    margin-left: 8px;
    white-space: nowrap;
  }
  .vacio-anio {
    padding: 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .va-t {
    font-size: 16px;
    font-weight: 650;
  }
  .va-p {
    font-size: 13px;
    color: #52514e;
    max-width: 520px;
    text-wrap: pretty;
  }
  .va-btns {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
