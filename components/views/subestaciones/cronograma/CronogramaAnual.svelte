<script>
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { auth } from "../../../../stores/auth.js";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import {
    cronogramaAnioInicial,
    cronogramaSoloAtrasadas,
    pantallaAmpliada,
    subestacionesActiveTab,
    ejecucionesFiltroInicial,
    disciplinaFiltro,
  } from "../../../../stores/subestacionesFilters.js";
  import { MESES, disciplinaLabel, tipoLabel } from "../../../../config/subestaciones.js";
  import {
    NORMAL,
    ESTADOS_CITA,
    estadoVisible,
    filtrosVacios,
    filtrosActivos,
    filtrarCitas,
    filasPorEstacion,
    filasPorActividad,
    totalesPorMes,
    fechaHora,
    aniosParaSelector,
    mesCerrado,
  } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import CronogramaGrid from "./CronogramaGrid.svelte";
  import CeldaPanel from "./CeldaPanel.svelte";
  import AsignacionMasiva from "./AsignacionMasiva.svelte";
  import PublicarModal from "./PublicarModal.svelte";
  import FiltrosCronograma from "./FiltrosCronograma.svelte";
  import SubestacionEjecucionDetalleModal from "../../../shared/SubestacionEjecucionDetalleModal.svelte";

  $: esAdmin = $auth?.currentUser?.role === "ADMIN";
  // Un año pasado se consulta, no se edita (el backend tampoco deja programarlo).
  $: soloLectura = anio < hoy.anioActual;
  $: editable = esAdmin && !soloLectura;
  $: if (soloLectura && modoEdicion) modoEdicion = false;

  // Años del selector: los que tienen datos + el actual y el siguiente (en 2027 ofrece 2028).
  let infoAnios = null;
  $: opcionesAnio = aniosParaSelector(infoAnios, hoy.anioActual, "cronograma", anio);

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

  // Filtros y vista. Todos los filtros viven en un solo panel ("Filtros"); nada se guarda:
  // al volver a entrar, el Cronograma abre sin filtros y en tamaño Normal.
  let por = "est";
  let vista = "act";
  // Misma disciplina que Dashboard y Resumen; desde la tarjeta "Atrasadas" se llega con
  // el estado "No ejecutada" ya puesto.
  const disciplinaInicial = get(disciplinaFiltro);
  let filtros = {
    ...filtrosVacios(),
    disciplinas: disciplinaInicial ? [disciplinaInicial] : [],
    estados: get(cronogramaSoloAtrasadas) ? ["bad"] : [],
  };
  cronogramaSoloAtrasadas.set(false);
  let filtrosAbierto = false;
  // Grilla: "Tamaño normal" deshace los anchos y altos que el usuario arrastró.
  let grilla;
  let hayAjustes = false;

  // Registro de una cita cumplida (panel de celda → "Ver registro")
  let registro = null;
  let registroCargando = false;
  let mostrarRegistro = false;
  async function verRegistro(e) {
    celda = null; // el panel se cierra: si no, su velo queda encima del registro y no se puede cerrar
    mostrarRegistro = true;
    registroCargando = true;
    registro = null;
    try {
      registro = await substationAdmin.ejecucionDeCita(e.detail);
    } catch (err) {
      flash(err.message, { error: true });
      mostrarRegistro = false;
    } finally {
      registroCargando = false;
    }
  }
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
      // Si no llega, el selector ofrece lo de siempre (actual y siguiente): no bloquea la grilla.
      Promise.resolve()
        .then(() => substationAdmin.aniosCronograma())
        .then((r) => (infoAnios = r))
        .catch(() => {});
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
    if (e.key === "Escape" && $pantallaAmpliada && !celda && !masiva && !publicarAbierto && !filtrosAbierto) {
      pantallaAmpliada.set(false);
    }
  }

  // ---- Datos derivados (mockup: renderVals) ----
  $: actividadesPorId = new Map(actividades.map((a) => [a.id, a]));
  $: estacionesPorId = new Map(estaciones.map((s) => [s.id, s]));
  $: estacionesActivas = estaciones.filter((s) => s.activa);
  $: estacionesVisibles = estacionesActivas.filter(
    (s) => (!filtros.tipos.length || filtros.tipos.includes(s.tipo)) && (!filtros.estacionIds.length || filtros.estacionIds.includes(s.id)),
  );
  $: actividadesAsignables = actividades.filter((a) => a.activa);
  $: citas = cron?.citas ?? [];
  $: citasActivas = citas.filter((c) => estacionesPorId.get(c.estacionId)?.activa);
  $: borrador = cron?.borrador ?? { altas: 0, bajas: 0 };
  $: nCambios = borrador.altas + borrador.bajas;
  $: verSoloCambios = soloCambios && nCambios > 0;
  $: visibles = filtrarCitas(citas, { anio, hoy, filtros, soloCambios: verSoloCambios, estacionesPorId });
  // Con estado o actividad elegidos, las filas sin citas sobran.
  $: soloConCitas = filtros.estados.length > 0 || filtros.actividadIds.length > 0 || verSoloCambios;
  $: unaDisciplina = filtros.disciplinas.length === 1 ? filtros.disciplinas[0] : "";
  // Los meses que no se eligieron se ocultan: los que quedan ganan espacio.
  $: mesesVisibles = filtros.meses.length && !verSoloCambios ? [...filtros.meses].sort((a, b) => a - b) : MESES.map((_, i) => i + 1);
  $: filas =
    por === "est"
      ? filasPorEstacion({
          estaciones: estacionesVisibles,
          citas: visibles,
          actividadesPorId,
          anio,
          hoy,
          disciplinaFiltrada: !!unaDisciplina,
          celdaSeleccionada: celda,
          modoEdicion,
          soloConCitas,
        })
      : filasPorActividad({
          actividades: actividades.filter(
            (a) =>
              verSoloCambios ||
              ((!filtros.disciplinas.length || filtros.disciplinas.includes(a.disciplina)) &&
                (!filtros.actividadIds.length || filtros.actividadIds.includes(a.id))),
          ),
          estacionesVisibles,
          citas: visibles,
          estacionesPorId,
          anio,
          hoy,
          celdaSeleccionada: celda,
          modoEdicion,
          soloConCitas: soloConCitas || !modoEdicion,
          disciplinaLabel,
        });
  $: totales = totalesPorMes(visibles, estacionesVisibles);
  // Citas de las estaciones que se ven (respeta la búsqueda): cabecera y total de la grilla.
  $: totalVisible = totales.reduce((a, n) => a + n, 0);
  // Leyenda: también es el resumen de lo que se ve (cuántas citas hay de cada estado).
  $: idsVisibles = new Set(estacionesVisibles.map((s) => s.id));
  $: porEstado = visibles.reduce((acc, c) => {
    if (idsVisibles.has(c.estacionId)) acc[estadoVisible(c, anio, hoy)] = (acc[estadoVisible(c, anio, hoy)] ?? 0) + 1;
    return acc;
  }, {});
  $: leyenda = ESTADOS_CITA.filter((e) => e.value !== "new" || porEstado.new).sort(
    (a, b) => ["ok", "bad", "cur", "pen", "new"].indexOf(a.value) - ["ok", "bad", "cur", "pen", "new"].indexOf(b.value),
  );
  $: resumen =
    `${estacionesVisibles.length} estaciones · ${totalVisible} citas en ${anio}` +
    (filtros.disciplinas.length ? ` · ${filtros.disciplinas.map(disciplinaLabel).join(", ")}` : " · todas las disciplinas");
  $: nFiltros = filtrosActivos(filtros) + (vista === "count" ? 1 : 0);
  // Chips de los filtros puestos, cada uno con su ×.
  $: etiquetasFiltro = [
    ...filtros.disciplinas.map((d) => ({ l: disciplinaLabel(d), quitar: () => quitarValor("disciplinas", d) })),
    ...filtros.estados.map((e) => ({ l: ESTADOS_CITA.find((x) => x.value === e)?.l, quitar: () => quitarValor("estados", e) })),
    ...filtros.tipos.map((t) => ({ l: tipoLabel(t), quitar: () => quitarValor("tipos", t) })),
    ...(filtros.estacionIds.length
      ? [{ l: filtros.estacionIds.length === 1 ? estacionesPorId.get(filtros.estacionIds[0])?.nombre : `${filtros.estacionIds.length} estaciones`, quitar: () => quitarTodo("estacionIds") }]
      : []),
    ...(filtros.actividadIds.length
      ? [{ l: filtros.actividadIds.length === 1 ? actividadesPorId.get(filtros.actividadIds[0])?.nombre : `${filtros.actividadIds.length} actividades`, quitar: () => quitarTodo("actividadIds") }]
      : []),
    ...(filtros.meses.length
      ? [{ l: filtros.meses.length <= 3 ? [...filtros.meses].sort((a, b) => a - b).map((m) => MESES[m - 1]).join(", ") : `${filtros.meses.length} meses`, quitar: () => quitarTodo("meses") }]
      : []),
    ...(vista === "count" ? [{ l: "Celdas: solo cantidad", quitar: () => (vista = "act") }] : []),
  ];
  $: anioVacio = !cargando && cron && citas.length === 0;
  $: ultima = cron?.ultimaPublicacion;
  $: mensajeVacio = verSoloCambios
    ? "No hay cambios en borrador para mostrar."
    : "Ninguna cita coincide con los filtros.";

  // ---- Acciones ----
  async function ejecutar(accion, mensaje) {
    // Un doble clic llega antes de que los botones se pinten deshabilitados.
    if (ocupado) return null;
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

  // Celda de una estación: varias actividades para esa estación y ese mes.
  function masivaEstacionAqui() {
    masiva = {
      modo: "estacion",
      disciplina: unaDisciplina || null,
      estacionIds: [celda.estacionId],
      meses: mesCerrado(anio, celda.mes, hoy) ? [] : [celda.mes],
    };
    celda = null;
  }

  // Abre en el modo de la grilla: filas por estación → "Por estación"; por actividad → "Por actividad".
  function abrirMasiva() {
    celda = null;
    masiva = { modo: por === "est" ? "estacion" : "actividad", disciplina: unaDisciplina || null };
  }

  async function asignado(e) {
    const { resultado, actividad, actividades } = e.detail;
    masiva = null;
    await recargar();
    soloCambios = true;
    const que = actividad ? actividad.nombre : `${actividades.length} actividades`;
    const n = resultado.creadas;
    flash(`${que} · ${n} ${n === 1 ? "cita" : "citas"} en borrador — mostrando solo los cambios`);
  }

  // Solo en filas por actividad: filtra la grilla por esa actividad. El nombre de una estación no
  // lleva a ningún lado (su detalle ya está en el Dashboard; repetirlo aquí era redundante).
  function abrirFila(e) {
    filtros = { ...filtros, actividadIds: [e.detail.id] };
    por = "est";
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

  // La disciplina se comparte con Dashboard y Resumen solo cuando hay una sola elegida.
  function aplicarFiltros(e) {
    filtros = e.detail.filtros;
    vista = e.detail.vista;
    filtrosAbierto = false;
    soloCambios = false;
    celda = null;
    disciplinaFiltro.set(unaDisciplinaDe(filtros));
  }
  const unaDisciplinaDe = (f) => (f.disciplinas.length === 1 ? f.disciplinas[0] : "");

  function quitarValor(campo, v) {
    filtros = { ...filtros, [campo]: filtros[campo].filter((x) => x !== v) };
    if (campo === "disciplinas") disciplinaFiltro.set(unaDisciplinaDe(filtros));
  }
  function quitarTodo(campo) {
    filtros = { ...filtros, [campo]: [] };
  }
  function limpiarFiltros() {
    filtros = filtrosVacios();
    vista = "act";
    soloCambios = false;
    disciplinaFiltro.set("");
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div class="sub-mod" class:ampliada={$pantallaAmpliada}>
  {#if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga && !cron}
    <ErrorCarga que="el cronograma" mensaje={errorCarga} on:reintentar={inicio} />
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Cronograma Anual{#if $pantallaAmpliada} <span class="anio-t">{anio}</span>{/if}</h1>
        {#if !$pantallaAmpliada}
          <p class="sub-subtitle">{resumen} · click en una celda para ver o asignar actividades.</p>
        {/if}
      </div>
    </div>

    <div class="herramientas">
      <select class="ctl anio" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
        {#each opcionesAnio as y}<option value={String(y)}>{y}{y < hoy.anioActual ? " · consulta" : ""}</option>{/each}
      </select>
      <div class="sub-seg chico" role="group" aria-label="Filas">
        <button class:on={por === "est"} on:click={() => ((por = "est"), (celda = null))}>Por estación</button>
        <button class:on={por === "act"} on:click={() => ((por = "act"), (celda = null))}>Por actividad</button>
      </div>
      <button class="sub-btn chico-btn filtros-btn" class:activos={nFiltros > 0} on:click={() => ((filtrosAbierto = true), (celda = null))}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M2 4h12M4.5 8h7M7 12h2"></path>
        </svg>
        Filtros{#if nFiltros}<span class="badge">{nFiltros}</span>{/if}
      </button>
      <button class="sub-btn chico-btn" on:click={() => pantallaAmpliada.update((v) => !v)}>
        {$pantallaAmpliada ? "⤡ Salir de vista ampliada" : "⤢ Ampliar"}
      </button>
      {#if $pantallaAmpliada && nCambios > 0}
        <span class="tag-borrador" title="Cambios sin publicar a móvil">BORRADOR · {nCambios} {nCambios === 1 ? "cambio" : "cambios"}</span>
      {/if}
      <span class="espacio"></span>
      {#if editable && !$pantallaAmpliada}
        <button class="modo" class:on={modoEdicion} on:click={() => (modoEdicion = !modoEdicion)}>
          {modoEdicion ? "✓ Modo asignación" : "+ Asignar actividades"}
        </button>
        <button class="sub-btn-primary" on:click={abrirMasiva}>Asignación masiva</button>
      {:else if !editable && !$pantallaAmpliada}
        <span class="sub-locked" title="Requiere rol ADMIN">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2"></path>
          </svg>Asignar · solo ADMIN
        </span>
      {/if}
    </div>

    <div class="estado-fila">
      {#if etiquetasFiltro.length}
        <div class="activos">
          {#each etiquetasFiltro as f}
            <button class="chip-filtro" title="Quitar filtro" on:click={f.quitar}><strong>{f.l}</strong><span class="x">×</span></button>
          {/each}
          {#if etiquetasFiltro.length > 1}<button class="lnk" on:click={limpiarFiltros}>Limpiar todo</button>{/if}
        </div>
      {/if}
      <div class="leyenda">
        {#each leyenda as e (e.value)}
          <span class="ley" title={e.ayuda}>
            <span class="cuadro" style="background:{e.bg};border:{e.bd};color:{e.c}">{e.g}</span>{e.l} <strong>{porEstado[e.value] ?? 0}</strong>
          </span>
        {/each}
        {#if hayAjustes}
          <button class="restablecer" title="Volver al tamaño Normal" on:click={() => grilla?.restablecer()}>↺ Tamaño normal</button>
        {/if}
      </div>
    </div>

    {#if nCambios > 0 && !$pantallaAmpliada}
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
          {#if editable && confirmarDescarte}
            <span class="confirmar-txt">¿Descartar {nCambios} {nCambios === 1 ? "cambio" : "cambios"}? No se puede deshacer.</span>
            <button class="sub-btn chico-btn" disabled={ocupado} on:click={() => (confirmarDescarte = false)}>Cancelar</button>
            <button class="peligro" disabled={ocupado} on:click={descartar}>Sí, descartar</button>
          {:else if editable}
            <button class="sub-btn chico-btn" disabled={ocupado} on:click={() => (confirmarDescarte = true)}>Descartar</button>
            <button class="sub-btn-primary" on:click={() => (publicarAbierto = true)}>Revisar y publicar a móvil</button>
          {/if}
        </div>
      </div>
    {:else if ultima && !$pantallaAmpliada}
      <div class="publicado">
        <span class="punto"></span>
        <span>Publicado a móvil · {fechaHora(ultima.publicadoEn)} · sin cambios pendientes</span>
        {#if cron.puedeDeshacer && editable}
          <button class="deshacer" disabled={ocupado} on:click={deshacer}>↶ Deshacer última publicación</button>
        {/if}
      </div>
    {/if}

    {#if soloLectura}
      <div class="consulta" role="note">
        {anio} es un año cerrado: aquí solo se consulta lo que se programó y lo que se hizo. Para programar,
        elija {hoy.anioActual} o {hoy.anioActual + 1}.
      </div>
    {/if}

    {#if anioVacio && soloLectura}
      <div class="sub-card vacio-anio">
        <div class="va-t">{anio} no tuvo cronograma publicado</div>
      </div>
    {:else if anioVacio}
      <div class="sub-card vacio-anio">
        <div class="va-t">{anio} todavía no tiene cronograma</div>
        <div class="va-p">
          Copie el año actual como punto de partida y ajuste solo las excepciones. Todo queda en <strong>borrador</strong>:
          los técnicos no ven nada hasta que publique, y puede descartarlo completo.
        </div>
        {#if editable}
          <div class="va-btns">
            <button class="sub-btn-primary" disabled={ocupado || citasOrigenCopia === 0} on:click={copiarAnio}>
              Copiar {anio - 1} como borrador · {citasOrigenCopia} citas
            </button>
            <button class="sub-btn" on:click={abrirMasiva}>Empezar desde cero</button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Cada vista (por estación / por actividad) abre en tamaño Normal. -->
    {#key por}
      <CronogramaGrid
        bind:this={grilla}
        bind:hayAjustes
        {filas}
        meses={mesesVisibles}
        totalesMes={totales}
        total={totalVisible}
        {hoy}
        {anio}
        etiquetaFila={por === "act" ? "Actividad" : "Estación"}
        tituloFila={por === "act" ? "Ver esta actividad por estación" : null}
        conChips={vista === "act"}
        normal={NORMAL[por]}
        dosColumnas={por === "act"}
        actualizando={recargando || ocupado}
        vacio={mensajeVacio}
        on:celda={abrirCelda}
        on:fila={abrirFila}
      />
    {/key}

    {#if filtrosAbierto}
      <FiltrosCronograma
        {filtros}
        {vista}
        citas={citasActivas}
        {anio}
        {hoy}
        estaciones={estacionesActivas}
        actividades={actividades.filter((a) => a.activa || citasActivas.some((c) => c.actividadId === a.id))}
        {estacionesPorId}
        on:aplicar={aplicarFiltros}
        on:close={() => (filtrosAbierto = false)}
      />
    {/if}

    {#if celda}
      {#key celda}
        <CeldaPanel
          {celda}
          citas={citasCelda}
          {anio}
          {hoy}
          esAdmin={editable}
          {ocupado}
          {actividadesPorId}
          {estacionesPorId}
          {actividadesAsignables}
          on:close={() => (celda = null)}
          on:quitar={quitar}
          on:restaurar={restaurar}
          on:asignar={asignarEnCelda}
          on:verEjecuciones={verEjecuciones}
          on:verRegistro={verRegistro}
          on:masivaAqui={masivaAqui}
          on:masivaEstacionAqui={masivaEstacionAqui}
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
        on:parcial={recargar}
      />
    {/if}

    {#if publicarAbierto}
      <PublicarModal {anio} anioActual={hoy.anioActual} on:close={() => (publicarAbierto = false)} on:publicado={publicado} />
    {/if}
    {#if mostrarRegistro}
      <SubestacionEjecucionDetalleModal ejecucion={registro} isLoading={registroCargando} on:close={() => (mostrarRegistro = false)} />
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
  .sub-mod.ampliada {
    padding: 12px 16px;
    gap: 10px;
  }
  .ampliada .sub-title {
    font-size: 16px;
  }
  .anio-t {
    margin-left: 6px;
    color: #898781;
    font-weight: 500;
  }
  .herramientas {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .espacio {
    flex: 1;
  }
  .sub-seg.chico :global(button) {
    padding: 6px 14px;
    font-size: 12.5px;
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
  .anio {
    min-width: 90px;
    font-weight: 600;
  }
  .chico-btn {
    padding: 8px 16px;
  }
  .sub-btn-primary {
    padding: 9px 18px;
  }
  .filtros-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .filtros-btn.activos {
    border: 2px solid #2a78d6;
    padding: 7px 15px;
  }
  .badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #2a78d6;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
  }
  .tag-borrador {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 4px 10px;
    border-radius: 999px;
    background: #e8f1fb;
    color: #1f5fae;
    border: 1px dashed #2a78d6;
    white-space: nowrap;
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
  .estado-fila {
    display: flex;
    align-items: center;
    gap: 8px 16px;
    flex-wrap: wrap;
  }
  .activos {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .chip-filtro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 11px;
    border-radius: 999px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    background: #fff;
    font-size: 12px;
    cursor: pointer;
    color: #0b0b0b;
  }
  .chip-filtro strong {
    font-weight: 600;
  }
  .chip-filtro .x {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #f0f0ee;
    font-size: 12px;
  }
  .chip-filtro:hover {
    border-color: #0b0b0b;
  }
  .lnk {
    all: unset;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .leyenda {
    margin-left: auto;
    display: flex;
    gap: 6px 16px;
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
  .ley strong {
    color: #0b0b0b;
    font-variant-numeric: tabular-nums;
  }
  .cuadro {
    width: 15px;
    height: 15px;
    border-radius: 3px;
    display: inline-grid;
    place-items: center;
    font-size: 9px;
    font-weight: 700;
    box-sizing: border-box;
  }
  .restablecer {
    border-radius: 999px;
    padding: 4px 11px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid #2a78d6;
    background: #e8f1fb;
    color: #1f5fae;
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
  .consulta {
    padding: 10px 14px;
    border-radius: 8px;
    background: #f0f0ee;
    color: #52514e;
    font-size: 13px;
  }
</style>
