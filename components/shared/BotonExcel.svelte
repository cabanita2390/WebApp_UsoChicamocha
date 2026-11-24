<script>
  /**
   * El único botón de descarga a Excel de la web. Todo lo que pide sale del motor del back
   * (GET /reportes): si el reporte usa periodo, sus filtros y sus columnas. Si no hay nada que elegir
   * (consolidados, hojas de vida) descarga de una; si no, abre el panel con lo que el reporte pide.
   *
   *   <BotonExcel claves="ordenes-maquinaria" />
   *   <BotonExcel claves="tanqueos" contexto={{ tipo }} periodo={{ desde, hasta }} />
   *   <BotonExcel claves={["estaciones-ejecuciones", "estaciones-hallazgos"]} inicial="estaciones-hallazgos" />
   */
  import { catalogoReportes, descargarReporte } from "../../stores/reportes.js";
  import { PRESETS_PERIODO, rangoDePreset } from "../../utils/periodoExcel.js";
  import { opcionesDisciplina, cargarDisciplinas } from "../../stores/disciplinas.js";
  import { addNotification } from "../../stores/ui.js";
  import { MESES_LARGOS } from "../../config/subestaciones.js";
  import fetchWithAuth from "../../stores/api.js";

  /** Un reporte o varios (el panel deja elegir cuál: "Qué descargar"). */
  export let claves;
  /** Con cuál abre cuando son varios. */
  export let inicial = null;
  /** Filtros que pone la pantalla y no se muestran (tipo de activo, activo…). */
  export let contexto = {};
  /** Periodo que ya fija la pantalla ({ desde, hasta }); así no se pregunta. */
  export let periodo = null;
  /** Valores con los que abren los filtros del panel ({ disciplina, anio, mes, estacionId }). */
  export let filtros = {};
  export let etiqueta = "Exportar Excel";
  export let clase = "vehicle-btn vehicle-btn--export";
  export let disabled = false;

  let reportes = [];
  let clave = null;
  let abierto = false;
  let preparando = false;
  let descargando = false;
  let error = "";
  let preset = "anio";
  let desde = "";
  let hasta = "";
  let valores = {};
  let columnas = {};
  let estaciones = [];

  $: lista = Array.isArray(claves) ? claves : [claves];
  $: actual = reportes.find((r) => r.clave === clave);
  $: elegibles = actual ? actual.filtros.filter((f) => f.tipo !== "CONTEXTO") : [];
  $: pidePeriodo = !!actual?.usaPeriodo && !periodo;
  $: elegidas = actual ? actual.columnas.filter((c) => columnas[actual.clave]?.[c.clave]) : [];
  $: if (abierto && pidePeriodo && preset !== "rango") ({ desde, hasta } = rangoDePreset(preset));
  $: rangoMalo = pidePeriodo && preset === "rango" && desde && hasta && hasta < desde;
  $: sinColumnas = actual && actual.columnas.length > 0 && elegidas.length === 0;
  // Si se cambia de reporte en "Qué descargar", abre con su atajo de periodo.
  let presetDe = null;
  $: if (actual && presetDe !== actual.clave) {
    presetDe = actual.clave;
    preset = actual.periodoInicial || "anio";
  }

  const nadaQueElegir = (r) =>
    (!r.usaPeriodo || periodo) && r.filtros.every((f) => f.tipo === "CONTEXTO") && r.columnas.length === 0;

  async function clic() {
    if (preparando || descargando) return;
    preparando = true;
    error = "";
    try {
      const todos = await catalogoReportes();
      reportes = lista.map((c) => todos.find((r) => r.clave === c)).filter(Boolean);
      if (!reportes.length) throw new Error("No tiene permiso para descargar este reporte.");
      clave = reportes.some((r) => r.clave === inicial) ? inicial : reportes[0].clave;
      if (reportes.length === 1 && nadaQueElegir(reportes[0])) {
        await bajar(reportes[0]);
        return;
      }
      valores = {
        disciplina: filtros.disciplina ?? "",
        anio: filtros.anio ?? new Date().getFullYear(),
        mes: filtros.mes ?? "",
        estacionId: filtros.estacionId ?? "",
      };
      columnas = Object.fromEntries(
        reportes.map((r) => [r.clave, Object.fromEntries(r.columnas.map((c) => [c.clave, c.porDefecto]))]));
      const tipos = reportes.flatMap((r) => r.filtros.map((f) => f.tipo));
      if (tipos.includes("DISCIPLINA")) cargarDisciplinas().catch(() => {});
      if (tipos.includes("ESTACION") && !estaciones.length) {
        estaciones = await fetchWithAuth("substation/estaciones").catch(() => []);
      }
      abierto = true;
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      preparando = false;
    }
  }

  /** Lo que se manda: periodo, filtros del panel (solo los que el reporte usa), contexto y columnas. */
  function peticion(r) {
    const p = { filtros: { ...contexto } };
    if (periodo) {
      p.desde = periodo.desde;
      p.hasta = periodo.hasta;
    } else if (r.usaPeriodo && preset !== "todo") {
      p.desde = desde;
      p.hasta = hasta;
    }
    r.filtros.filter((f) => f.tipo !== "CONTEXTO").forEach((f) => (p.filtros[f.clave] = valores[f.clave]));
    if (r.columnas.length) p.columnas = r.columnas.filter((c) => columnas[r.clave]?.[c.clave]).map((c) => c.clave);
    return p;
  }

  /** Descarga el reporte (el del panel, o el único cuando no hay nada que elegir). */
  async function bajar(r = actual) {
    descargando = true;
    error = "";
    try {
      await descargarReporte(r.clave, peticion(r));
      abierto = false;
      addNotification({ id: Date.now(), text: `${r.titulo}: Excel descargado.` });
    } catch (e) {
      if (abierto) error = e.message;
      else addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      descargando = false;
    }
  }

  function todas(marcar) {
    columnas[actual.clave] = Object.fromEntries(actual.columnas.map((c) => [c.clave, marcar]));
  }

  function cerrar() {
    abierto = false;
  }

  function onKeydown(e) {
    if (abierto && e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<button type="button" class={clase} on:click={clic} disabled={disabled || preparando || descargando}>
  {#if descargando && !abierto}Descargando…{:else}<slot>{etiqueta}</slot>{/if}
</button>

{#if abierto && actual}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="bx-overlay" on:click|self={cerrar}>
    <div class="bx-modal" role="dialog" aria-modal="true" aria-label="Descargar Excel">
      <div class="bx-head">
        <span class="bx-title">{reportes.length > 1 ? "Descargar Excel" : actual.titulo}</span>
        <button class="bx-x" aria-label="Cerrar" on:click={cerrar}>×</button>
      </div>

      <div class="bx-body">
        {#if reportes.length > 1}
          <label class="bx-field">Qué descargar
            <select bind:value={clave}>
              {#each reportes as r}<option value={r.clave}>{r.titulo}</option>{/each}
            </select>
          </label>
        {/if}

        {#if pidePeriodo}
          <span class="bx-label" id="bx-periodo">Periodo</span>
          <div class="bx-presets" role="radiogroup" aria-labelledby="bx-periodo">
            {#each PRESETS_PERIODO as p}
              <button type="button" role="radio" aria-checked={preset === p.value} class:on={preset === p.value}
                on:click={() => (preset = p.value)}>{p.label}</button>
            {/each}
          </div>
          {#if preset !== "todo"}
            <div class="bx-fila">
              <label class="bx-field">Desde
                <input type="date" bind:value={desde} disabled={preset !== "rango"} />
              </label>
              <label class="bx-field">Hasta
                <input type="date" bind:value={hasta} disabled={preset !== "rango"} />
              </label>
            </div>
          {/if}
          {#if rangoMalo}<div class="bx-error" role="alert">La fecha final es anterior a la inicial.</div>{/if}
        {/if}

        {#if elegibles.length}
          <div class="bx-fila">
            {#each elegibles as f (f.clave)}
              {#if f.tipo === "DISCIPLINA"}
                <label class="bx-field">{f.etiqueta}
                  <select bind:value={valores[f.clave]}>
                    <option value="">Todas las disciplinas</option>
                    {#each $opcionesDisciplina as d}<option value={d.value}>{d.label}</option>{/each}
                  </select>
                </label>
              {:else if f.tipo === "ANIO"}
                <label class="bx-field">{f.etiqueta}
                  <input type="number" min="2020" max="2100" bind:value={valores[f.clave]} />
                </label>
              {:else if f.tipo === "MES"}
                <label class="bx-field">{f.etiqueta}
                  <select bind:value={valores[f.clave]}>
                    <option value="">Todo el año</option>
                    {#each MESES_LARGOS as m, i}<option value={i + 1}>{m}</option>{/each}
                  </select>
                </label>
              {:else if f.tipo === "ESTACION"}
                <label class="bx-field">{f.etiqueta}
                  <select bind:value={valores[f.clave]}>
                    <option value="">Todas las estaciones</option>
                    {#each estaciones as e}<option value={e.id}>{e.nombre}</option>{/each}
                  </select>
                </label>
              {/if}
            {/each}
          </div>
        {/if}

        {#if actual.columnas.length}
          <div class="bx-field">
            <span class="bx-cols-head">
              <span>Columnas <span class="bx-n">{elegidas.length} de {actual.columnas.length}</span></span>
              <span class="bx-cols-acc">
                <button type="button" class="bx-link" on:click={() => todas(true)}>Todas</button>
                <button type="button" class="bx-link" on:click={() => todas(false)}>Ninguna</button>
              </span>
            </span>
            <div class="bx-cols">
              {#each actual.columnas as c (c.clave)}
                <label class="bx-col"><input type="checkbox" bind:checked={columnas[actual.clave][c.clave]} />{c.titulo}</label>
              {/each}
            </div>
          </div>
        {/if}

        <p class="bx-nota">El archivo trae una portada con el periodo, los filtros, las cifras principales y un índice de las hojas.</p>
        {#if error}<div class="bx-error" role="alert">{error}</div>{/if}
      </div>

      <div class="bx-foot">
        <button type="button" class="bx-btn" on:click={cerrar}>Cancelar</button>
        <button type="button" class="bx-btn primario" disabled={rangoMalo || sinColumnas || descargando} on:click={() => bajar()}>
          {descargando ? "Generando…" : "Descargar"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .bx-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.32);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1100;
  }
  .bx-modal {
    width: 600px;
    max-width: 100%;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.18);
    font-family: inherit;
    text-align: left;
  }
  .bx-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .bx-title {
    font-size: 16px;
    font-weight: 650;
    color: #1f1e1c;
  }
  .bx-x {
    all: unset;
    cursor: pointer;
    font-size: 20px;
    color: #898781;
    padding: 2px 6px;
  }
  .bx-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }
  .bx-label,
  .bx-field {
    font-size: 13px;
    font-weight: 600;
    color: #3f3e3b;
  }
  .bx-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bx-field select,
  .bx-field input[type="date"],
  .bx-field input[type="number"] {
    padding: 8px 10px;
    border: 1px solid #dcd7e4;
    border-radius: 8px;
    font: inherit;
    font-weight: 400;
    background: #fff;
  }
  .bx-field input:disabled {
    background: #f6f5f3;
    color: #6b6a66;
  }
  .bx-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .bx-presets button {
    border: 1.5px solid #e6e1ee;
    background: #fff;
    border-radius: 999px;
    padding: 6px 12px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .bx-presets button.on {
    border-color: #5b3fa0;
    background: #f7f3fc;
    color: #5b3fa0;
    font-weight: 600;
  }
  .bx-fila {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  .bx-cols-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .bx-n {
    margin-left: 4px;
    font-size: 11.5px;
    font-weight: 500;
    color: #6b6a66;
    background: #f1efeb;
    border-radius: 999px;
    padding: 1px 8px;
  }
  .bx-cols-acc {
    display: flex;
    gap: 10px;
  }
  .bx-link {
    all: unset;
    cursor: pointer;
    font-size: 12.5px;
    color: #5b3fa0;
    font-weight: 600;
  }
  .bx-cols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 6px 14px;
    padding: 10px 12px;
    border: 1px solid #ece9e4;
    border-radius: 10px;
  }
  .bx-col {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 400;
  }
  .bx-nota {
    margin: 0;
    font-size: 12px;
    color: #898781;
  }
  .bx-error {
    color: #b02a2a;
    font-size: 12.5px;
  }
  .bx-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .bx-btn {
    border: 1px solid #dcd7e4;
    background: #fff;
    border-radius: 999px;
    padding: 8px 16px;
    font: inherit;
    font-size: 13.5px;
    cursor: pointer;
  }
  .bx-btn.primario {
    background: #2a78d6;
    border-color: #2a78d6;
    color: #fff;
    font-weight: 600;
  }
  .bx-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  @media (max-width: 520px) {
    .bx-fila {
      grid-template-columns: 1fr;
    }
  }
</style>
