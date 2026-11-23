<script>
  /**
   * "Descargar Excel" de Estaciones: el usuario elige la hoja, los filtros y las columnas. Las hojas,
   * sus filtros y sus columnas (y cuáles salen por defecto) los sirve el back
   * (GET /substation/exportar/hojas): la web no los tiene escritos. Abre con la hoja de la vista
   * desde donde se llama y con sus filtros.
   */
  import { substationAdmin } from "../../../stores/substationAdmin.js";
  import { disciplinaFiltro } from "../../../stores/subestacionesFilters.js";
  import { opcionesDisciplina } from "../../../stores/disciplinas.js";
  import { MESES_LARGOS } from "../../../config/subestaciones.js";
  import { flash } from "../../../stores/subestacionesToast.js";

  /** Clave de la hoja con la que abre (EJECUCIONES, HALLAZGOS, ORDENES, AVANCE, ACTIVIDADES). */
  export let hoja = "EJECUCIONES";
  /** Filtros de la vista: { anio, mes, estacionId }. La disciplina sale del filtro de Estaciones. */
  export let filtros = {};

  let abierto = false;
  let cargando = false;
  let descargando = false;
  let error = "";
  let hojas = [];
  let estaciones = [];
  let f = {};
  let columnas = {};

  $: actual = hojas.find((h) => h.clave === f.hoja);
  $: usa = (filtro) => actual?.filtros?.includes(filtro);
  $: elegidas = actual ? actual.columnas.filter((c) => columnas[f.hoja]?.[c.clave]) : [];

  async function abrir() {
    abierto = true;
    error = "";
    const anioActual = new Date().getFullYear();
    f = {
      hoja,
      disciplina: $disciplinaFiltro || "",
      anio: filtros.anio ?? anioActual,
      mes: filtros.mes ?? "",
      estacionId: filtros.estacionId ?? "",
    };
    if (hojas.length) return;
    cargando = true;
    try {
      [hojas, estaciones] = await Promise.all([
        substationAdmin.hojasExportables(),
        substationAdmin.listarEstaciones().catch(() => []),
      ]);
      // Por hoja: qué columnas van marcadas (al principio, las de por defecto del back).
      columnas = Object.fromEntries(hojas.map((h) => [h.clave, Object.fromEntries(h.columnas.map((c) => [c.clave, c.porDefecto]))]));
    } catch (e) {
      error = e.message;
    } finally {
      cargando = false;
    }
  }

  function cerrar() {
    abierto = false;
  }

  function todas(marcar) {
    columnas[f.hoja] = Object.fromEntries(actual.columnas.map((c) => [c.clave, marcar]));
  }

  async function descargar() {
    if (!actual || !elegidas.length || descargando) return;
    descargando = true;
    error = "";
    try {
      await substationAdmin.exportar({
        hoja: f.hoja,
        disciplina: f.disciplina || undefined,
        anio: f.anio || undefined,
        mes: usa("mes") && f.mes ? f.mes : undefined,
        estacionId: usa("estacionId") && f.estacionId ? f.estacionId : undefined,
        columnas: elegidas.map((c) => c.clave),
      });
      flash("Excel descargado");
      cerrar();
    } catch (e) {
      error = e.message;
    } finally {
      descargando = false;
    }
  }

  function onKeydown(e) {
    if (abierto && e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<button type="button" class="sub-btn boton" on:click={abrir}>
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
    <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  Descargar Excel
</button>

{#if abierto}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="sub-overlay" on:click|self={cerrar}>
    <div class="sub-modal ancho" role="dialog" aria-modal="true" aria-label="Descargar Excel">
      <div class="sub-modal-head">
        <span class="sub-modal-title">Descargar Excel</span>
        <button class="sub-modal-x" aria-label="Cerrar" on:click={cerrar}>×</button>
      </div>

      <div class="sub-modal-body">
        {#if cargando}
          <p class="nota">Cargando…</p>
        {:else if actual}
          <label class="sub-field">Qué descargar
            <select class="sub-select" bind:value={f.hoja}>
              {#each hojas as h}<option value={h.clave}>{h.titulo}</option>{/each}
            </select>
          </label>

          <div class="filtros">
            {#if usa("disciplina")}
              <label class="sub-field">Disciplina
                <select class="sub-select" bind:value={f.disciplina}>
                  <option value="">Todas las disciplinas</option>
                  {#each $opcionesDisciplina as d}<option value={d.value}>{d.label}</option>{/each}
                </select>
              </label>
            {/if}
            {#if usa("anio")}
              <label class="sub-field">Año
                <input class="sub-input" type="number" min="2020" max="2100" bind:value={f.anio} />
              </label>
            {/if}
            {#if usa("mes")}
              <label class="sub-field">Mes
                <select class="sub-select" bind:value={f.mes}>
                  <option value="">Todo el año</option>
                  {#each MESES_LARGOS as m, i}<option value={i + 1}>{m}</option>{/each}
                </select>
              </label>
            {/if}
            {#if usa("estacionId")}
              <label class="sub-field">Estación
                <select class="sub-select" bind:value={f.estacionId}>
                  <option value="">Todas las estaciones</option>
                  {#each estaciones as e}<option value={e.id}>{e.nombre}</option>{/each}
                </select>
              </label>
            {/if}
          </div>

          <div class="sub-field">
            <span class="cols-head">
              <span>Columnas <span class="n">{elegidas.length} de {actual.columnas.length}</span></span>
              <span class="cols-acc">
                <button type="button" class="link" on:click={() => todas(true)}>Todas</button>
                <button type="button" class="link" on:click={() => todas(false)}>Ninguna</button>
              </span>
            </span>
            <div class="cols">
              {#each actual.columnas as c (c.clave)}
                <label class="col"><input type="checkbox" bind:checked={columnas[f.hoja][c.clave]} />{c.titulo}</label>
              {/each}
            </div>
            <span class="sub-field-hint">El archivo trae lo mismo que la pantalla, con una hoja «Resumen» de los filtros usados.</span>
          </div>
        {/if}
        {#if error}<div class="sub-field-error" role="alert">{error}</div>{/if}
      </div>

      <div class="sub-modal-foot">
        <button class="sub-btn" on:click={cerrar}>Cancelar</button>
        <button class="sub-btn-primary" disabled={!elegidas.length || descargando || cargando} on:click={descargar}>
          {descargando ? "Generando…" : "Descargar"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .boton {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .sub-modal.ancho {
    width: 620px;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }
  .sub-modal.ancho .sub-modal-body {
    overflow-y: auto;
  }
  .filtros {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  .cols-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .n {
    margin-left: 4px;
    font-size: 11.5px;
    color: #6b6a66;
    background: #f1efeb;
    border-radius: 999px;
    padding: 1px 8px;
  }
  .cols-acc {
    display: flex;
    gap: 10px;
  }
  .link {
    all: unset;
    cursor: pointer;
    font-size: 12.5px;
    color: #5b3fa0;
    font-weight: 600;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 6px 14px;
    padding: 10px 12px;
    border: 1px solid #ece9e4;
    border-radius: 10px;
  }
  .col {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
  }
  .nota {
    color: #898781;
    font-size: 13px;
  }
</style>
