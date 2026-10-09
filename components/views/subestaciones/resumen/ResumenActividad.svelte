<script>
  import { onDestroy } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import {
    detalleActividadId, disciplinaFiltro, anioDetalle, cronogramaAnioInicial, cronogramaSoloAtrasadas,
    ejecucionesFiltroInicial, subestacionesActiveTab,
  } from "../../../../stores/subestacionesFilters.js";
  import { alCambiarEjecuciones } from "../../../../stores/subestacionesEventos.js";
  import { disciplinaLabel, MESES_LARGOS } from "../../../../config/subestaciones.js";
  import { IMPREVISTO, porcentaje, semaforoMes, aniosParaSelector } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import DetalleActividad from "./DetalleActividad.svelte";
  import SelectorDisciplina from "../SelectorDisciplina.svelte";
  import ThOrden from "../ThOrden.svelte";
  import { ordenarFilas } from "../../../../utils/ordenTabla.js";

  // Resumen por actividad: cada actividad del cronograma en todas las estaciones. Mismo lenguaje
  // del Dashboard (avance del año sin semáforo, mes en curso con semáforo, imprevistos aparte),
  // pero el Dashboard mira estaciones y esta pestaña mira actividades.
  let filas = [];
  let anio = null;
  let anioActual = null;
  let mes = null;
  let transcurrido = null;
  /** Registros sin actividad del catálogo (o de una desactivada): cuentan por estación, no aquí. */
  let libres = 0;
  let libresMes = 0;
  let cargando = true;
  let recargando = false;
  let errorCarga = "";
  let q = "";
  /** Orden por columna (clic en el encabezado); los botones A–Z / Más atrasadas son atajos. */
  let orden = { campo: "nombre", dir: "asc" };
  /** "anio": avance del año (sin semáforo) · "mes": mes en curso (con semáforo contra el tiempo). */
  let vista = "anio";

  // Solo se aplica la respuesta de la última carga (cambios de año seguidos).
  let secuencia = 0;

  async function cargar() {
    const mia = ++secuencia;
    if (filas.length) recargando = true;
    else cargando = true;
    errorCarga = "";
    try {
      // Los indicadores por estación cuentan todos los registros; los de esta tabla, solo los de
      // actividades del catálogo. La diferencia son los registros libres (para no mostrar otro número sin explicar).
      const [r, est] = await Promise.all([
        substationAdmin.resumenPorActividad(anio, $disciplinaFiltro),
        substationAdmin.indicadoresPorEstacion(anio, $disciplinaFiltro),
      ]);
      if (mia !== secuencia) return;
      const sumar = (xs, k) => xs.reduce((t, x) => t + (x[k] ?? 0), 0);
      libres = Math.max(0, sumar(est, "ejecutadoTotal") - sumar(r, "ejecutadoTotal"));
      libresMes = Math.max(0, sumar(est, "ejecutadoTotalMes") - sumar(r, "ejecutadoTotalMes"));
      // Sin año pedido, el servidor responde con el actual.
      if (anio == null) anio = r[0]?.anio ?? new Date().getFullYear();
      if (anioActual == null) anioActual = anio;
      mes = r[0]?.mes ?? null;
      transcurrido = r[0]?.porcentajeMesTranscurrido != null ? Number(r[0].porcentajeMesTranscurrido) : null;
      filas = r.map(conCalculos);
    } catch (e) {
      if (mia !== secuencia) return;
      errorCarga = e.message;
    } finally {
      if (mia === secuencia) cargando = recargando = false;
    }
  }
  cargar();

  // Años con datos para el selector (si no llega, actual y anterior: no bloquea la vista).
  let infoAnios = null;
  Promise.resolve()
    .then(() => substationAdmin.aniosCronograma())
    .then((r) => (infoAnios = r))
    .catch(() => {});
  $: opcionesAnio = anioActual != null ? aniosParaSelector(infoAnios, anioActual, "consulta", anio) : [];

  // Llegó una ejecución del móvil (WebSocket): se recarga sin que el usuario refresque.
  onDestroy(alCambiarEjecuciones(() => $detalleActividadId == null && cargar()));

  function cambiarAnio(e) {
    anio = Number(e.target.value);
    cargar();
  }

  function abrir(a) {
    anioDetalle.set(anio); // el detalle abre en el año que se está viendo aquí
    detalleActividadId.set(a.actividadId);
  }

  // Tarjetas con acción: "Atrasadas" abre el Cronograma con "Solo atrasadas"; "Imprevistos", la
  // pestaña Ejecuciones con "Solo imprevistos" del periodo. Solo si hay algo que ver.
  function verAtrasadas() {
    cronogramaAnioInicial.set(anio);
    cronogramaSoloAtrasadas.set(true);
    subestacionesActiveTab.set("cronograma");
  }

  function verImprevistos(soloMes) {
    const a = anio;
    const mm = String(mes).padStart(2, "0");
    ejecucionesFiltroInicial.set(soloMes
      ? { esProgramada: false, fechaInicio: `${a}-${mm}-01`, fechaFin: `${a}-${mm}-${new Date(a, mes, 0).getDate()}` }
      : { esProgramada: false, fechaInicio: `${a}-01-01`, fechaFin: `${a}-12-31` });
    subestacionesActiveTab.set("ejecuciones");
  }

  function conCalculos(a) {
    return {
      ...a,
      // Nunca "undefined" en pantalla (p. ej. un backend sin los campos del avance).
      cumple: a.cumple ?? 0,
      estaciones: a.estaciones ?? 0,
      avanceAnio: porcentaje(a.cumple ?? 0, a.programadoAnual ?? 0),
      avanceMes: porcentaje(a.cumpleMes ?? 0, a.programadoMes ?? 0),
      atrasadas: Math.max(0, (a.vencidas ?? 0) - (a.ejecutadasVencidas ?? 0)),
      impAnio: porcentaje(a.ejecutadoNoProgramado ?? 0, a.ejecutadoTotal ?? 0),
      semaforo: semaforoMes(a.cumpleMes ?? 0, a.programadoMes ?? 0, a.porcentajeMesTranscurrido),
      impMes: porcentaje(a.ejecutadoNoProgramadoMes ?? 0, a.ejecutadoTotalMes ?? 0),
    };
  }

  // Esta pestaña es del cronograma: una actividad del catálogo sin citas ni registros en el año
  // no tiene avance que mostrar, solo se cuenta al pie.
  $: conDatos = filas.filter((a) => a.programadoAnual || a.ejecutadoTotal);
  $: sinCitas = filas.length - conDatos.length;
  $: notaSinCitas = sinCitas
    ? ` ${sinCitas} ${sinCitas === 1 ? "actividad del catálogo no tiene" : "actividades del catálogo no tienen"} citas en ${anio}.`
    : "";

  // "Más atrasadas": en el año, más citas atrasadas y menos avance primero; en el mes, las que
  // más se alejan del tiempo transcurrido. Sin citas en el periodo va siempre al final.
  function atraso(a, vista, transcurrido) {
    if (vista === "mes") return a.programadoMes ? (transcurrido ?? 0) - a.avanceMes : null;
    return a.programadoAnual ? a.atrasadas * 1000 + (100 - a.avanceAnio) : null;
  }

  $: valores = vista === "mes"
    ? {
        nombre: (a) => a.actividadNombre,
        atraso: (a) => atraso(a, vista, transcurrido),
        citas: (a) => (a.programadoMes ? a.avanceMes : null),
        estado: (a) => atraso(a, vista, transcurrido),
        pendientes: (a) => (a.programadoMes ? a.programadoMes - a.cumpleMes : null),
        imp: (a) => a.ejecutadoNoProgramadoMes ?? 0,
      }
    : {
        nombre: (a) => a.actividadNombre,
        atraso: (a) => atraso(a, vista, transcurrido),
        avance: (a) => (a.programadoAnual ? a.avanceAnio : null),
        atrasadas: (a) => a.atrasadas,
        imp: (a) => a.ejecutadoNoProgramado ?? 0,
      };
  const ordenar = (e) => (orden = e.detail);

  $: visibles = ordenarFilas(
    conDatos.filter((a) => !q || a.actividadNombre.toLowerCase().includes(q.toLowerCase())),
    orden, valores, (a) => a.actividadNombre,
  );

  // Tarjetas de arriba: mismas cuentas sobre la suma de las actividades que se ven.
  const CAMPOS_SUMA = [
    "programadoAnual", "cumple", "vencidas", "ejecutadasVencidas", "ejecutadoNoProgramado", "ejecutadoTotal",
    "programadoMes", "cumpleMes", "ejecutadoNoProgramadoMes", "ejecutadoTotalMes",
  ];
  $: total = conCalculos({
    ...Object.fromEntries(CAMPOS_SUMA.map((k) => [k, visibles.reduce((t, f) => t + (f[k] ?? 0), 0)])),
    porcentajeMesTranscurrido: transcurrido,
  });
  $: hayMes = mes != null;
  $: if (!hayMes && vista === "mes") vista = "anio";
  $: nombreMes = hayMes ? MESES_LARGOS[mes - 1] : "";
  // Día y días restantes del mes, derivados del % que manda el servidor (nunca la fecha del navegador).
  $: diasMes = hayMes ? new Date(anio, mes, 0).getDate() : 0;
  $: diaMes = hayMes ? Math.round(((transcurrido ?? 0) * diasMes) / 100) : 0;
  $: quedan = Math.max(0, diasMes - diaMes);
  $: pendientesMes = Math.max(0, total.programadoMes - total.cumpleMes);
  $: conCitasMes = visibles.filter((f) => f.programadoMes);
  $: atrasadasMes = conCitasMes.filter((f) => f.semaforo && f.semaforo.l !== "Al día" && f.semaforo.l !== "Mes completo");
  // Columnas que se encogen: a 1024 px la tabla cabe completa (Imprevistos incluida).
  $: cols = vista === "mes"
    ? "minmax(150px,1.2fr) minmax(150px,1.4fr) minmax(150px,auto) 84px minmax(120px,auto)"
    : "minmax(160px,1.2fr) minmax(200px,1.6fr) 84px minmax(120px,auto)";
  $: etiquetaDisc = $disciplinaFiltro ? disciplinaLabel($disciplinaFiltro) : "Todas las disciplinas";
</script>

<div class="sub-mod">
  <!-- El detalle espera la primera carga: de ahí sale el año actual del servidor. -->
  {#if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga && !filas.length}
    <ErrorCarga que="el resumen por actividad" mensaje={errorCarga} on:reintentar={cargar} />
  {:else if $detalleActividadId != null}
    {#key $detalleActividadId}
      <DetalleActividad actividadId={$detalleActividadId} anioInicial={anio} {anioActual}
        on:volver={() => detalleActividadId.set(null)} />
    {/key}
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">{vista === "mes" ? `Avance por actividad · ${nombreMes} ${anio}` : `Avance por actividad ${anio}`}</h1>
        <p class="sub-subtitle">
          {etiquetaDisc} ·
          {#if vista === "mes"}
            va el {Math.round(transcurrido ?? 0)}% del mes; el semáforo compara lo ejecutado con el tiempo que ha pasado
          {:else}
            cuánto se ha hecho de cada actividad del cronograma, sumando todas las estaciones
          {/if}
        </p>
      </div>
      <div class="controles">
        {#if hayMes}
          <div class="sub-seg" role="group" aria-label="Periodo">
            <button class:on={vista === "anio"} on:click={() => (vista = "anio")}>Año</button>
            <button class:on={vista === "mes"} on:click={() => (vista = "mes")}>Mes en curso</button>
          </div>
        {/if}
        <SelectorDisciplina on:change={cargar} />
        <select class="ctl" value={String(anio)} on:change={cambiarAnio} aria-label="Año">
          {#each opcionesAnio as y}<option value={String(y)}>{y}</option>{/each}
        </select>
      </div>
    </div>

    <!-- Resumen de todas las actividades que se ven: tarjetas propias de cada vista -->
    <div class="resumen" class:actualizando={recargando} style="--imp-c:{IMPREVISTO.c};--imp-bg:{IMPREVISTO.bg}">
      {#if vista === "mes"}
        <div class="sub-card tarjeta" data-kpi="mes">
          <div class="t-l">Avance de {nombreMes}</div>
          <div class="t-v">{total.cumpleMes} <span class="t-de">de {total.programadoMes} citas</span></div>
          <div class="barra grande" aria-hidden="true">
            <span style="width:{total.avanceMes ?? 0}%;background:{total.semaforo?.color ?? '#3d3c39'}"></span>
            <i class="marca" style="left:{transcurrido ?? 0}%"></i>
          </div>
          {#if total.semaforo}
            <span class="sub-badge" style="color:{total.semaforo.c};background:{total.semaforo.bg}">{total.semaforo.g} {total.semaforo.pct}% · {total.semaforo.l}</span>
          {:else}
            <span class="t-s">Sin citas este mes</span>
          {/if}
        </div>
        <div class="sub-card tarjeta" data-kpi="pendientes">
          <div class="t-l">Por ejecutar</div>
          <div class="t-v" class:tenue={!pendientesMes}>{pendientesMes}</div>
          <div class="t-s">{pendientesMes ? `citas pendientes · quedan ${quedan} días` : "todas las citas del mes hechas"}</div>
        </div>
        <div class="sub-card tarjeta" data-kpi="actividades">
          <div class="t-l">Actividades atrasadas</div>
          <div class="t-v" class:tenue={!atrasadasMes.length}>{atrasadasMes.length} <span class="t-de">de {conCitasMes.length}</span></div>
          <div class="t-s">con citas este mes, por detrás del tiempo</div>
        </div>
        <svelte:element this={total.ejecutadoNoProgramadoMes ? "button" : "div"} class="sub-card tarjeta" data-kpi="imprevistos"
          class:accion={total.ejecutadoNoProgramadoMes} title={total.ejecutadoNoProgramadoMes ? "Ver cuáles en Ejecuciones" : null}
          on:click={() => total.ejecutadoNoProgramadoMes && verImprevistos(true)} role={total.ejecutadoNoProgramadoMes ? "button" : null}>
          <div class="t-l">Imprevistos de {nombreMes}</div>
          <div class="t-v imp-v" class:tenue={!total.ejecutadoNoProgramadoMes}>{total.ejecutadoNoProgramadoMes}</div>
          <div class="t-s">
            {total.impMes != null ? `${total.impMes}% de ${total.ejecutadoTotalMes} registros del mes` : "sin registros este mes"}
          </div>
          {#if libresMes && !q}
            <div class="t-s libres" title="Registros escritos como texto libre (sin actividad del catálogo) o de una actividad desactivada: no son de ninguna fila de esta tabla. Sí aparecen en el Dashboard y en el Detalle por estación.">+ {libresMes} {libresMes === 1 ? "registro" : "registros"} sin actividad (solo cuentan por estación)</div>
          {/if}
        </svelte:element>
      {:else}
        <div class="sub-card tarjeta" data-kpi="anio">
          <div class="t-l">Avance {anio}</div>
          <div class="t-v">{total.avanceAnio != null ? `${total.avanceAnio}%` : "—"}</div>
          <div class="barra grande" aria-hidden="true"><span style="width:{total.avanceAnio ?? 0}%"></span></div>
          <div class="t-s">{total.cumple} de {total.programadoAnual} citas del año</div>
        </div>
        {#if hayMes}
          <div class="sub-card tarjeta" data-kpi="mes">
            <div class="t-l">{nombreMes} · mes en curso</div>
            <div class="t-v">{total.cumpleMes} <span class="t-de">de {total.programadoMes}</span></div>
            {#if total.semaforo}
              <span class="sub-badge" style="color:{total.semaforo.c};background:{total.semaforo.bg}">{total.semaforo.g} {total.semaforo.pct}% · {total.semaforo.l}</span>
            {:else}
              <span class="t-s">Sin citas este mes</span>
            {/if}
            <div class="t-s">va el {Math.round(transcurrido ?? 0)}% del mes</div>
          </div>
        {/if}
        <svelte:element this={total.atrasadas && anio === anioActual ? "button" : "div"} class="sub-card tarjeta" data-kpi="atrasadas"
          class:accion={total.atrasadas && anio === anioActual} title={total.atrasadas && anio === anioActual ? "Ver cuáles en el Cronograma" : null}
          on:click={() => total.atrasadas && anio === anioActual && verAtrasadas()} role={total.atrasadas && anio === anioActual ? "button" : null}>
          <div class="t-l">Atrasadas</div>
          <div class="t-v" class:tenue={!total.atrasadas}>{total.atrasadas}</div>
          <div class="t-s">citas de meses cerrados sin ejecutar{total.atrasadas && anio === anioActual ? " · ver cuáles →" : ""}</div>
        </svelte:element>
        <svelte:element this={total.ejecutadoNoProgramado ? "button" : "div"} class="sub-card tarjeta" data-kpi="imprevistos"
          class:accion={total.ejecutadoNoProgramado} title={total.ejecutadoNoProgramado ? "Ver cuáles en Ejecuciones" : null}
          on:click={() => total.ejecutadoNoProgramado && verImprevistos(false)} role={total.ejecutadoNoProgramado ? "button" : null}>
          <div class="t-l">Imprevistos</div>
          <div class="t-v imp-v">{total.ejecutadoNoProgramado}</div>
          <div class="t-s">
            {total.impAnio != null ? `${total.impAnio}% de ${total.ejecutadoTotal} registros` : "sin registros todavía"}{hayMes ? ` · ${total.ejecutadoNoProgramadoMes} este mes` : ""}
          </div>
          {#if libres && !q}
            <div class="t-s libres" title="Registros escritos como texto libre (sin actividad del catálogo) o de una actividad desactivada: no son de ninguna fila de esta tabla. Sí aparecen en el Dashboard y en el Detalle por estación.">+ {libres} {libres === 1 ? "registro" : "registros"} sin actividad (solo cuentan por estación)</div>
          {/if}
        </svelte:element>
      {/if}
    </div>

    <div class="barra-tabla">
      <input class="ctl buscar" bind:value={q} placeholder="Buscar actividad…" aria-label="Buscar actividad" />
      <div class="sub-seg" role="group" aria-label="Ordenar">
        <button class:on={orden.campo === "nombre" && orden.dir === "asc"}
          on:click={() => (orden = { campo: "nombre", dir: "asc" })}>A–Z</button>
        <button class:on={orden.campo === "atraso" && orden.dir === "desc"}
          on:click={() => (orden = { campo: "atraso", dir: "desc" })}>Más atrasadas primero</button>
      </div>
    </div>

    <div class="sub-card tabla" class:actualizando={recargando} style="--imp-c:{IMPREVISTO.c};--imp-bg:{IMPREVISTO.bg}">
      <div class="sub-th" style="grid-template-columns:{cols}">
        <ThOrden campo="nombre" {orden} on:orden={ordenar}>Actividad</ThOrden>
        {#if vista === "mes"}
          <ThOrden campo="citas" {orden} on:orden={ordenar} title="La raya marca cuánto del mes ha pasado">Citas de {nombreMes}</ThOrden>
          <ThOrden campo="estado" dirInicial="desc" {orden} on:orden={ordenar} title="Primero las que más van detrás del tiempo del mes">Estado</ThOrden>
          <ThOrden campo="pendientes" dirInicial="desc" der {orden} on:orden={ordenar}>Pendientes</ThOrden>
        {:else}
          <ThOrden campo="avance" {orden} on:orden={ordenar}>Avance del año</ThOrden>
          <ThOrden campo="atrasadas" dirInicial="desc" der {orden} on:orden={ordenar} title="Citas de meses ya cerrados que no se ejecutaron">Atrasadas</ThOrden>
        {/if}
        <ThOrden campo="imp" dirInicial="desc" der {orden} on:orden={ordenar} title="Registros de la actividad sin cita del cronograma y qué parte son del total">Imprevistos</ThOrden>
      </div>
      {#each visibles as a (a.actividadId)}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="sub-tr clickable" style="grid-template-columns:{cols}" role="button" tabindex="0"
          title="Ver cómo va en cada estación" on:click={() => abrir(a)}
          on:keydown={(e) => e.key === "Enter" && abrir(a)}>
          <span class="actividad">
            <span class="nombre" title={a.actividadNombre}>{a.actividadNombre}</span>
            <span class="sub">
              {#if !$disciplinaFiltro}{disciplinaLabel(a.disciplina)} · {/if}{a.estaciones
                ? `en ${a.estaciones} ${a.estaciones === 1 ? "estación" : "estaciones"}`
                : "sin citas en el cronograma"}
            </span>
          </span>

          {#if vista === "mes"}
            {#if a.programadoMes}
              <span class="avance">
                <span class="num cuenta">{a.cumpleMes} <span class="tenue">de {a.programadoMes}</span></span>
                <span class="barra" aria-hidden="true">
                  <span style="width:{a.avanceMes}%;background:{a.semaforo.color}"></span>
                  <i class="marca" style="left:{transcurrido ?? 0}%"></i>
                </span>
              </span>
              <span><span class="sub-badge estado" style="color:{a.semaforo.c};background:{a.semaforo.bg}">{a.semaforo.g} {a.semaforo.pct}% · {a.semaforo.l}</span></span>
              <span class="der num" class:tenue={a.programadoMes === a.cumpleMes}>{a.programadoMes - a.cumpleMes}</span>
            {:else}
              <span class="tenue">Sin citas este mes</span>
              <span></span>
              <span class="der tenue">—</span>
            {/if}
            <span class="der">
              {#if a.ejecutadoNoProgramadoMes}
                <span class="imp">{a.ejecutadoNoProgramadoMes} · {a.impMes}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {:else}
            <span class="avance">
              {#if a.programadoAnual}
                <span class="num cuenta">{a.cumple} <span class="tenue">de {a.programadoAnual}</span></span>
                <span class="barra" aria-hidden="true"><span style="width:{a.avanceAnio}%"></span></span>
                <span class="num pct">{a.avanceAnio}%</span>
              {:else}
                <span class="tenue">Sin citas en {anio}</span>
              {/if}
            </span>
            <span class="der num" class:tenue={!a.atrasadas}>{a.atrasadas}</span>
            <span class="der">
              {#if a.ejecutadoNoProgramado}
                <span class="imp">{a.ejecutadoNoProgramado} · {a.impAnio}% del total</span>
              {:else}<span class="tenue">—</span>{/if}
            </span>
          {/if}
        </div>
      {:else}
        <div class="sub-empty">
          {q
            ? `Ninguna actividad coincide con "${q}".`
            : `Sin actividades en el cronograma de ${anio}${$disciplinaFiltro ? ` para ${disciplinaLabel($disciplinaFiltro)}` : ""}.`}
        </div>
      {/each}
    </div>
    <p class="pie">
      Click en una actividad para ver cómo va en cada estación y sus registros. Los imprevistos son registros sin cita
      del cronograma: no suman al avance.{notaSinCitas}
    </p>
  {/if}
  <SubToast />
</div>

<style>
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .controles,
  .barra-tabla {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ctl {
    height: 36px;
    padding: 0 10px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    color: #0b0b0b;
  }
  .buscar {
    width: 240px;
  }
  .actualizando {
    opacity: 0.55;
    pointer-events: none;
  }

  /* Tarjetas resumen (las mismas del Dashboard) */
  .resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
    transition: opacity 0.15s;
  }
  .tarjeta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 16px 20px;
  }
  .t-l {
    font-size: 12px;
    color: #898781;
  }
  .t-v {
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .t-de {
    font-size: 15px;
    font-weight: 500;
    color: #898781;
  }
  .t-s {
    font-size: 12px;
    color: #52514e;
  }
  .imp-v {
    color: var(--imp-c);
  }
  .libres {
    color: #898781;
    cursor: help;
  }

  /* Tabla */
  .tabla {
    overflow-x: auto;
    transition: opacity 0.15s;
  }
  .sub-th,
  .sub-tr {
    min-width: 640px;
    column-gap: 16px;
    align-items: center;
  }
  .der {
    text-align: right;
    justify-self: end;
  }
  .actividad {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .nombre {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    font-size: 12px;
    color: #898781;
  }
  .avance {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .cuenta {
    min-width: 58px;
  }
  .pct {
    min-width: 40px;
    text-align: right;
    font-weight: 600;
  }
  .estado {
    white-space: nowrap;
  }
  /* Barra de avance: neutra en el año (sensación de progreso, no juicio); en el mes toma el
     color del semáforo y una raya marca cuánto del mes ha pasado. */
  .barra {
    position: relative;
    flex: 1;
    min-width: 80px;
    height: 8px;
    border-radius: 999px;
    background: #ececea;
  }
  .barra > span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: #3d3c39;
  }
  .barra.grande {
    align-self: stretch;
    flex: none;
  }
  .marca {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: #0b0b0b;
    opacity: 0.45;
    border-radius: 1px;
  }
  .imp {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--imp-c);
    background: var(--imp-bg);
    white-space: nowrap;
  }
  .tenue {
    color: #898781;
  }
  .pie {
    margin: 0;
    font-size: 12px;
    color: #898781;
  }
  /* Tarjeta con acción (botón): se ve igual que las demás, con un borde al pasar el mouse */
  .tarjeta.accion {
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .tarjeta.accion:hover {
    border-color: rgba(11, 11, 11, 0.25);
  }
</style>
