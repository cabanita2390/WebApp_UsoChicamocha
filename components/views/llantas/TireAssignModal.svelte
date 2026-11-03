<script>
  // Marcar qué vehículos / motos / máquinas usan una configuración de llantas. Al
  // guardar solo se envían los activos que cambiaron (asignar o quitar).
  import { createEventDispatcher } from "svelte";
  import { aplicaAPlural } from "../../../lib/presionLlantas.js";

  export let perfil;
  /** [{ key, id, esMaquina, label, detalle, perfilActualId, perfilActualNombre }] del mismo tipo. */
  export let activos = [];
  export let guardando = false;
  export let error = "";

  const dispatch = createEventDispatcher();

  let busqueda = "";
  let marcados = new Set(activos.filter((a) => a.perfilActualId === perfil.id).map((a) => a.key));

  $: plural = aplicaAPlural(perfil.aplicaA);
  $: filtro = busqueda.trim().toLowerCase();
  $: visibles = activos.filter((a) => !filtro || `${a.label} ${a.detalle ?? ""}`.toLowerCase().includes(filtro));
  $: cambios = activos.filter((a) => marcados.has(a.key) !== (a.perfilActualId === perfil.id));
  $: reemplazos = cambios.filter((a) => marcados.has(a.key) && a.perfilActualId != null).length;

  function alternar(key) {
    const s = new Set(marcados);
    s.has(key) ? s.delete(key) : s.add(key);
    marcados = s;
  }

  function marcarVisibles(valor) {
    const s = new Set(marcados);
    visibles.forEach((a) => (valor ? s.add(a.key) : s.delete(a.key)));
    marcados = s;
  }

  function guardar() {
    dispatch("save", {
      asignar: cambios.filter((a) => marcados.has(a.key)),
      quitar: cambios.filter((a) => !marcados.has(a.key)),
    });
  }

  function cerrar() {
    if (!guardando) dispatch("close");
  }

  function onKeydown(e) {
    if (e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sub-overlay" on:click|self={cerrar}>
  <div class="sub-modal asignar" role="dialog" aria-modal="true" aria-label="Asignar {perfil.nombre}">
    <div class="sub-modal-head">
      <span class="sub-modal-title">¿Qué {plural} usan «{perfil.nombre}»?</span>
      <button class="sub-modal-x" aria-label="Cerrar" on:click={cerrar}>×</button>
    </div>
    <div class="sub-modal-body">
      <p class="intro">
        En los {plural} marcados, la preoperativa del móvil pedirá la presión de sus {perfil.posiciones?.length ?? 0} llantas.
      </p>
      <div class="barra">
        <input class="sub-input buscar" type="search" placeholder="Buscar placa o nombre" aria-label="Buscar" bind:value={busqueda} />
        <button type="button" class="sub-link" on:click={() => marcarVisibles(true)}>Marcar todos</button>
        <button type="button" class="sub-link" on:click={() => marcarVisibles(false)}>Ninguno</button>
      </div>
      <ul class="lista">
        {#each visibles as a (a.key)}
          <li>
            <label class="item" class:on={marcados.has(a.key)}>
              <input type="checkbox" checked={marcados.has(a.key)} on:change={() => alternar(a.key)} disabled={guardando} />
              <span class="item-text">
                <strong>{a.label}</strong>
                {#if a.detalle}<span>{a.detalle}</span>{/if}
              </span>
              {#if a.perfilActualId != null && a.perfilActualId !== perfil.id}
                <span class="actual" title="Configuración que tiene hoy">
                  {marcados.has(a.key) ? "Reemplaza a" : "Usa"} «{a.perfilActualNombre}»
                </span>
              {/if}
            </label>
          </li>
        {:else}
          <li class="sub-empty">{activos.length ? "Nada coincide con la búsqueda." : `No hay ${plural} registrados.`}</li>
        {/each}
      </ul>
      {#if reemplazos > 0}
        <span class="sub-field-hint">{reemplazos} {reemplazos === 1 ? "activo deja" : "activos dejan"} su configuración anterior: cada activo usa una sola.</span>
      {/if}
      {#if error}<div class="sub-field-error" role="alert">{error}</div>{/if}
    </div>
    <div class="sub-modal-foot">
      <span class="conteo">{marcados.size} {marcados.size === 1 ? "marcado" : "marcados"}</span>
      <button class="sub-btn" on:click={cerrar} disabled={guardando}>Cancelar</button>
      <button class="sub-btn-primary" on:click={guardar} disabled={guardando || cambios.length === 0}>
        {guardando ? "Guardando..." : cambios.length ? `Guardar ${cambios.length} ${cambios.length === 1 ? "cambio" : "cambios"}` : "Sin cambios"}
      </button>
    </div>
  </div>
</div>

<style>
  .asignar {
    width: 560px;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }
  .asignar .sub-modal-body {
    min-height: 0;
    overflow: hidden;
  }
  .intro {
    margin: 0;
    font-size: 13px;
    color: var(--sub-ink-2);
  }
  .barra {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .buscar {
    flex: 1;
    min-width: 0;
  }
  .barra .sub-link {
    font-size: 13px;
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--sub-border);
    border-radius: 8px;
    overflow-y: auto;
    max-height: 46vh;
  }
  .lista li + li {
    border-top: 1px solid var(--sub-row-border);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    cursor: pointer;
    font-size: 13px;
  }
  .item:hover {
    background: var(--sub-hover);
  }
  .item.on {
    background: #f7fbff;
  }
  .item input {
    width: 16px;
    height: 16px;
    flex: none;
  }
  .item-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .item-text span {
    font-size: 12px;
    color: var(--sub-muted);
  }
  .actual {
    font-size: 11.5px;
    color: var(--sub-warn);
    background: var(--sub-warn-bg);
    border-radius: 999px;
    padding: 2px 8px;
    white-space: nowrap;
  }
  .conteo {
    margin-right: auto;
    align-self: center;
    font-size: 13px;
    color: var(--sub-ink-2);
  }
</style>
