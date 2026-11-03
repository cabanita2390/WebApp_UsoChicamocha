<script>
  /**
   * Lista desplegable con buscador, para filtros que pueden tener muchas opciones (estaciones,
   * actividades, elementos). Escribir filtra sin importar tildes ni mayúsculas; si las opciones
   * traen `grupo`, se muestran agrupadas (solo cuando hay más de un grupo).
   * Opciones: [{ value, label, grupo? }]. `value` vacío ("") es "Todas".
   */
  import { createEventDispatcher, tick } from "svelte";

  export let value = "";
  export let opciones = [];
  export let todas = "Todas";
  export let ariaLabel = "";
  export let buscarPlaceholder = "Buscar…";

  const dispatch = createEventDispatcher();
  const id = `sb-${Math.random().toString(36).slice(2, 9)}`;

  let abierto = false;
  let q = "";
  let activo = 0;
  let boton;
  let input;
  let lista;
  let pop;
  let pos = { top: 0, left: 0, width: 0, arriba: false };

  const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const igual = (a, b) => String(a ?? "") === String(b ?? "");

  $: actual = opciones.find((o) => igual(o.value, value));
  $: filtradas = q ? opciones.filter((o) => normal(o.label).includes(normal(q))) : opciones;
  // "Todas" va primero mientras no se busque; los grupos conservan el orden en que llegan.
  $: visibles = [...(q ? [] : [{ value: "", label: todas }]), ...filtradas];
  $: hayGrupos = new Set(opciones.map((o) => o.grupo ?? "")).size > 1;
  $: if (activo >= visibles.length) activo = Math.max(0, visibles.length - 1);

  function ubicar() {
    if (!boton) return;
    const r = boton.getBoundingClientRect();
    const alto = 300;
    const arriba = window.innerHeight - r.bottom < alto && r.top > window.innerHeight - r.bottom;
    pos = { top: arriba ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, arriba };
  }

  async function abrir() {
    q = "";
    abierto = true;
    ubicar();
    await tick();
    activo = Math.max(0, visibles.findIndex((o) => igual(o.value, value)));
    input?.focus();
    lista?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
  }

  function cerrar(devolverFoco = true) {
    abierto = false;
    if (devolverFoco) boton?.focus();
  }

  function elegir(o) {
    value = o.value;
    dispatch("change", o.value);
    cerrar();
  }

  async function mover(d) {
    if (!visibles.length) return;
    activo = (activo + d + visibles.length) % visibles.length;
    await tick();
    lista?.querySelector(`[data-i="${activo}"]`)?.scrollIntoView?.({ block: "nearest" });
  }

  function onKeydown(e) {
    if (e.key === "ArrowDown") (e.preventDefault(), mover(1));
    else if (e.key === "ArrowUp") (e.preventDefault(), mover(-1));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (visibles[activo]) elegir(visibles[activo]);
    } else if (e.key === "Escape") {
      // Que el Escape cierre solo la lista, no el panel de filtros donde está.
      e.stopPropagation();
      cerrar();
    } else if (e.key === "Tab") cerrar(false);
  }

  // La lista se dibuja en <body>: así no la recorta el panel (overflow) ni la reabre un <label> que la envuelva.
  function enBody(node) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function fuera(e) {
    if (abierto && !boton?.contains(e.target) && !pop?.contains(e.target)) cerrar(false);
  }
</script>

<svelte:window on:mousedown={fuera} on:resize={() => abierto && ubicar()} on:scroll|capture={() => abierto && ubicar()} />

<button
  type="button"
  class="sb-boton"
  class:vacio={!actual}
  bind:this={boton}
  aria-label={ariaLabel}
  aria-haspopup="listbox"
  aria-expanded={abierto}
  data-value={value ?? ""}
  on:click={() => (abierto ? cerrar() : abrir())}
>
  <span class="sb-texto">{actual?.label ?? todas}</span>
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
</button>

{#if abierto}
  <div
    use:enBody
    bind:this={pop}
    class="sb-pop"
    class:arriba={pos.arriba}
    style="left:{pos.left}px;top:{pos.top}px;width:{Math.max(pos.width, 240)}px"
  >
    <input
      bind:this={input}
      bind:value={q}
      class="sb-buscar"
      placeholder={buscarPlaceholder}
      role="combobox"
      aria-label={`Buscar ${ariaLabel.toLowerCase()}`}
      aria-expanded="true"
      aria-controls={id}
      aria-activedescendant={visibles[activo] ? `${id}-${activo}` : undefined}
      on:input={() => (activo = 0)}
      on:keydown={onKeydown}
    />
    <ul class="sb-lista" role="listbox" id={id} aria-label={ariaLabel} bind:this={lista}>
      {#each visibles as o, i (`${o.grupo ?? ""}|${o.value}`)}
        {#if hayGrupos && o.value !== "" && (o.grupo ?? "") !== (visibles[i - 1]?.grupo ?? "")}
          <li class="sb-grupo" role="presentation">{o.grupo || "Otros"}</li>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <li
          id={`${id}-${i}`}
          data-i={i}
          data-value={o.value}
          role="option"
          aria-selected={igual(o.value, value)}
          class:activo={i === activo}
          class:todas={o.value === ""}
          on:mousemove={() => (activo = i)}
          on:click={() => elegir(o)}
        >
          {o.label}
        </li>
      {:else}
        <li class="sb-nada" role="presentation">Nada coincide con «{q}»</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .sb-boton {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    font: inherit;
    font-size: 13px;
    text-align: left;
    padding: 9px 12px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 10px;
    background: #fff;
    color: #0b0b0b;
    cursor: pointer;
  }
  .sb-boton:focus-visible,
  .sb-boton[aria-expanded="true"] {
    outline: 2px solid #2a78d6;
    outline-offset: 1px;
  }
  .sb-texto {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb-pop {
    position: fixed;
    z-index: 1100;
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(11, 11, 11, 0.16);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: #0b0b0b;
  }
  .sb-pop.arriba {
    transform: translateY(-100%);
  }
  .sb-buscar {
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    border-radius: 8px;
    outline: none;
  }
  .sb-buscar:focus {
    border-color: #2a78d6;
  }
  .sb-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 240px;
    overflow-y: auto;
  }
  .sb-lista li[role="option"] {
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
  }
  .sb-lista li.activo {
    background: #f0f0ee;
  }
  .sb-lista li[aria-selected="true"] {
    font-weight: 600;
    color: #1f5fae;
  }
  .sb-lista li.todas {
    color: #52514e;
  }
  .sb-grupo {
    position: sticky;
    top: 0;
    background: #fff;
    padding: 8px 10px 4px;
    font-size: 11.5px;
    font-weight: 600;
    color: #898781;
  }
  .sb-nada {
    padding: 10px;
    color: #898781;
  }
</style>
