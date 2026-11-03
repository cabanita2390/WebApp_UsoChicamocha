<script>
  // Crear / editar una configuración de llantas. Se arma en 4 pasos: tipo de activo,
  // nombre, cuántas llantas (distribución) y qué presión llevan; a la derecha se ve
  // el dibujo con las llantas numeradas tal como el operario las medirá.
  import { createEventDispatcher } from "svelte";
  import TireDiagram from "../../shared/TireDiagram.svelte";
  import RangoPsi from "./RangoPsi.svelte";
  import {
    APLICA_A_OPCIONES,
    DISTRIBUCIONES,
    MAX_LLANTAS_PERSONALIZADA,
    contarActivos,
    cambiarCantidadPersonalizada,
    cambiarDistribucion,
    cambiarModo,
    construirPayloadPerfil,
    distribucionInicial,
    formularioNuevo,
    gruposDe,
    llantasDeDistribucion,
    perfilAFormulario,
  } from "../../../lib/presionLlantas.js";

  /** null = nueva configuración. */
  export let perfil = null;
  /** Activos que hoy la usan (no se puede cambiar el tipo ni eliminarla). */
  export let asignados = 0;
  export let guardando = false;
  export let error = "";

  const dispatch = createEventDispatcher();

  let form = perfil ? perfilAFormulario(perfil) : formularioNuevo("VEHICULO");
  let confirmarEliminar = false;
  let errorLocal = "";

  $: editando = perfil != null;
  $: tipoBloqueado = editando && asignados > 0;
  $: distribuciones = DISTRIBUCIONES.filter((d) => d.para.includes(form.aplicaA));
  $: grupos = gruposDe(form);
  $: personalizada = form.distribucion === "personalizada";
  $: mensajeError = errorLocal || error;

  const PLACEHOLDER = {
    VEHICULO: "Ej: Camioneta 4x4",
    MOTOCICLETA: "Ej: Moto 125 cc",
    MAQUINARIA: "Ej: Retroexcavadora",
  };

  function elegirTipo(aplicaA) {
    if (tipoBloqueado || aplicaA === form.aplicaA) return;
    const sigueValida = DISTRIBUCIONES.find((d) => d.id === form.distribucion)?.para.includes(aplicaA);
    form = { ...form, aplicaA };
    if (!sigueValida && !personalizada) form = cambiarDistribucion(form, distribucionInicial(aplicaA));
  }

  function elegirDistribucion(id) {
    if (id === form.distribucion) return;
    form = cambiarDistribucion(form, id);
    if (id === "personalizada" && !form.llantas.length) form = cambiarCantidadPersonalizada(form, 4);
  }

  function elegirModo(modo) {
    form = cambiarModo(form, modo);
  }

  function cerrar() {
    if (!guardando) dispatch("close");
  }

  function guardar() {
    const { error: e, payload } = construirPayloadPerfil(form);
    errorLocal = e ?? "";
    if (!e) dispatch("save", payload);
  }

  function onKeydown(e) {
    if (e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sub-overlay" on:click|self={cerrar}>
  <div class="sub-modal editor" role="dialog" aria-modal="true" aria-label={editando ? "Editar configuración de llantas" : "Nueva configuración de llantas"}>
    <div class="sub-modal-head">
      <span class="sub-modal-title">{editando ? "Editar configuración de llantas" : "Nueva configuración de llantas"}</span>
      <button class="sub-modal-x" aria-label="Cerrar" on:click={cerrar}>×</button>
    </div>

    <form class="body" on:submit|preventDefault={guardar}>
      <div class="pasos">
        <section>
          <h4><span class="n">1</span>¿Para qué tipo de activo es?</h4>
          <div class="sub-seg seg-fit" role="group" aria-label="Tipo de activo">
            {#each APLICA_A_OPCIONES as o}
              <button type="button" class:on={form.aplicaA === o.value} disabled={tipoBloqueado && form.aplicaA !== o.value}
                on:click={() => elegirTipo(o.value)}>{o.label}</button>
            {/each}
          </div>
          {#if tipoBloqueado}
            <span class="sub-field-hint">No se puede cambiar: ya está asignada a {contarActivos(asignados, form.aplicaA)}.</span>
          {/if}
        </section>

        <section>
          <h4><span class="n">2</span>Póngale un nombre</h4>
          <input class="sub-input wide" bind:value={form.nombre} maxlength="100" placeholder={PLACEHOLDER[form.aplicaA]}
            aria-label="Nombre de la configuración" disabled={guardando} />
          <span class="sub-field-hint">Es el nombre que verá al asignarla. Ayuda poner el tipo de vehículo o de llanta.</span>
        </section>

        <section>
          <h4><span class="n">3</span>¿Cuántas llantas tiene?</h4>
          <div class="tiles">
            {#each distribuciones as d (d.id)}
              <button type="button" class="tile" class:on={form.distribucion === d.id} aria-pressed={form.distribucion === d.id}
                on:click={() => elegirDistribucion(d.id)} disabled={guardando}>
                <TireDiagram posiciones={llantasDeDistribucion(d.id)} ancho={46} moto={d.id === "moto2"} />
                <span class="tile-text"><strong>{d.label}</strong><span>{d.detalle}</span></span>
              </button>
            {/each}
            <button type="button" class="tile" class:on={personalizada} aria-pressed={personalizada}
              on:click={() => elegirDistribucion("personalizada")} disabled={guardando}>
              <span class="tile-otra">#</span>
              <span class="tile-text"><strong>Otra cantidad</strong><span>Defina cuántas</span></span>
            </button>
          </div>
          {#if personalizada}
            <label class="sub-field cantidad">Número de llantas
              <input class="sub-input" type="number" min="1" max={MAX_LLANTAS_PERSONALIZADA} value={form.llantas.length}
                on:change={(e) => (form = cambiarCantidadPersonalizada(form, e.currentTarget.value))} disabled={guardando} />
            </label>
          {/if}
        </section>

        <section>
          <h4><span class="n">4</span>¿Qué presión deben tener?</h4>
          <div class="sub-seg seg-fit" role="group" aria-label="Cómo definir la presión">
            <button type="button" class:on={form.modo === "todas"} on:click={() => elegirModo("todas")}>Igual para todas</button>
            {#if grupos.length > 1}
              <button type="button" class:on={form.modo === "grupos"} on:click={() => elegirModo("grupos")}>
                {grupos.join(" y ")} distintas
              </button>
            {/if}
            <button type="button" class:on={form.modo === "llanta"} on:click={() => elegirModo("llanta")}>Una por una</button>
          </div>

          {#if form.modo === "todas"}
            <RangoPsi bind:rango={form.rangoTodas} nombre="Todas las llantas" disabled={guardando} />
          {:else if form.modo === "grupos"}
            <div class="grupo grupo-head" aria-hidden="true">
              <span></span>
              <span class="cols"><span>Mínima</span><span>Ideal <em>(opcional)</em></span><span>Máxima</span></span>
            </div>
            {#each grupos as g (g)}
              <div class="grupo">
                <span class="grupo-nombre">{g}</span>
                <RangoPsi bind:rango={form.rangosGrupo[g]} nombre={g} compacto disabled={guardando} />
              </div>
            {/each}
          {/if}
          <p class="explica">
            Si el operario mide <strong>menos de la mínima</strong>, el reporte la marca <span class="sub-badge bad">Baja</span>;
            si mide <strong>más de la máxima</strong>, <span class="sub-badge warn">Alta</span>. No se crean órdenes:
            calibrar es tarea del operario. La presión recomendada suele estar en la etiqueta de la puerta del conductor o en el manual.
          </p>

          {#if form.modo === "llanta" || personalizada}
            <div class="lista" aria-label="Llantas">
              <div class="lista-head" class:con-rango={form.modo === "llanta"}>
                <span>#</span><span>Nombre de la llanta</span>
                {#if form.modo === "llanta"}<span>Mínima · Ideal · Máxima</span>{/if}
              </div>
              {#each form.llantas as llanta, i (llanta.codigo)}
                <div class="lista-row" class:con-rango={form.modo === "llanta"}>
                  <span class="num">{i + 1}</span>
                  <input class="sub-input" bind:value={llanta.etiqueta} maxlength="80" aria-label="Nombre de la llanta {i + 1}" disabled={guardando} />
                  {#if form.modo === "llanta"}
                    <RangoPsi bind:rango={llanta} nombre={llanta.etiqueta || `Llanta ${i + 1}`} compacto disabled={guardando} />
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <label class="sub-field">Nota (opcional)
          <input class="sub-input wide" bind:value={form.descripcion} placeholder="Ej: llantas 265/70 R16" disabled={guardando} />
        </label>
      </div>

      <aside class="vista">
        <span class="vista-title">Así la verá el operario</span>
        <TireDiagram posiciones={form.llantas} ancho={150} moto={form.distribucion === "moto2"} />
        <ol class="leyenda">
          {#each form.llantas as l (l.codigo)}
            <li>{l.etiqueta || "Sin nombre"}</li>
          {/each}
        </ol>
      </aside>
      <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
    </form>

    {#if mensajeError}<div class="sub-field-error err" role="alert">{mensajeError}</div>{/if}

    <div class="sub-modal-foot foot">
      {#if editando}
        {#if asignados > 0}
          <span class="sub-field-hint borrar-hint">Está en uso en {contarActivos(asignados, form.aplicaA)}. Para eliminarla, primero quítesela con «Asignar».</span>
        {:else if confirmarEliminar}
          <button type="button" class="sub-btn-danger" disabled={guardando} on:click={() => dispatch("delete")}>Sí, eliminar</button>
          <button type="button" class="sub-btn" on:click={() => (confirmarEliminar = false)}>No</button>
        {:else}
          <button type="button" class="sub-btn-danger-outline" disabled={guardando} on:click={() => (confirmarEliminar = true)}>Eliminar</button>
        {/if}
      {/if}
      <span class="spacer"></span>
      <button type="button" class="sub-btn" on:click={cerrar} disabled={guardando}>Cancelar</button>
      <button type="button" class="sub-btn-primary" on:click={guardar} disabled={guardando}>
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </div>
  </div>
</div>

<style>
  .editor {
    width: 900px;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 210px;
    gap: 22px;
    padding: 18px 22px;
    overflow-y: auto;
    min-height: 0;
  }
  .pasos {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .n {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--sub-blue-soft);
    color: var(--sub-blue);
    font-size: 12px;
    font-weight: 700;
  }
  .seg-fit {
    align-self: flex-start;
    flex-wrap: wrap;
  }
  .sub-seg button:disabled {
    color: var(--sub-muted);
    cursor: not-allowed;
  }
  .wide {
    width: 100%;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 8px;
  }
  .tile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--sub-border-2);
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    color: var(--sub-ink);
  }
  .tile:hover {
    background: var(--sub-hover);
  }
  .tile.on {
    border-color: var(--sub-blue);
    box-shadow: 0 0 0 2px var(--sub-blue-soft);
    background: #f7fbff;
  }
  .tile-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }
  .tile-text span {
    font-size: 12px;
    color: var(--sub-ink-2);
  }
  .tile-otra {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: #f0f0ee;
    color: var(--sub-muted);
    font-size: 20px;
    font-weight: 700;
  }
  .cantidad {
    max-width: 180px;
  }
  .grupo {
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }
  .grupo-head {
    margin-bottom: -4px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    font-size: 12px;
    color: var(--sub-ink-2);
  }
  .cols em {
    font-style: normal;
    color: var(--sub-muted);
  }
  .grupo-nombre {
    font-size: 13px;
    font-weight: 600;
  }
  .explica {
    margin: 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f7f7f6;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--sub-ink-2);
  }
  .lista {
    border: 1px solid var(--sub-border);
    border-radius: 8px;
    overflow: hidden;
  }
  .lista-head,
  .lista-row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    padding: 6px 10px;
  }
  .lista-head.con-rango,
  .lista-row.con-rango {
    grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1.4fr);
  }
  .lista-head {
    font-size: 12px;
    font-weight: 600;
    color: var(--sub-muted);
    background: #fafaf9;
    border-bottom: 1px solid var(--sub-border);
  }
  .lista-row + .lista-row {
    border-top: 1px solid var(--sub-row-border);
  }
  .num {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: #3a3a38;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }
  .vista {
    position: sticky;
    top: 0;
    align-self: start;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border-radius: 10px;
    background: #fafaf9;
    border: 1px solid var(--sub-border);
  }
  .vista-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--sub-ink-2);
  }
  .leyenda {
    margin: 0;
    padding-left: 22px;
    font-size: 12px;
    color: var(--sub-ink-2);
    align-self: stretch;
    max-height: 220px;
    overflow-y: auto;
  }
  .err {
    padding: 0 22px 10px;
  }
  .foot {
    align-items: center;
  }
  .spacer {
    flex: 1;
  }
  .borrar-hint {
    max-width: 320px;
  }
  @media (max-width: 760px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }
    .vista {
      position: static;
    }
    .lista-head.con-rango,
    .lista-row.con-rango {
      grid-template-columns: 28px minmax(0, 1fr);
    }
    .lista-row.con-rango :global(.rango) {
      grid-column: 1 / -1;
    }
  }
</style>
