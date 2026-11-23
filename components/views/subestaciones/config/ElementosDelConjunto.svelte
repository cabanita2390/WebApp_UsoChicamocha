<script>
  /**
   * Lo que tiene adentro un conjunto (el conjunto es la caja; esto es su contenido). Se agrega un
   * elemento escogiéndolo de los nombres que ya existen en la disciplina (se reutilizan entre
   * conjuntos: "Fusibles" se escribe una vez) o escribiendo uno nuevo. Quitarlo no lo borra: las
   * visitas que ya lo marcaron lo conservan.
   */
  import { coincideTexto } from "../../../../utils/opcionesFiltro.js";

  /** [{ elementoId, nombre, pideDetalle, provisional }] en el orden en que los ve el operario. */
  export let lista = [];
  /** Nombres de elemento de la disciplina (ItemCatalogoResponse[]), para reutilizarlos. */
  export let catalogo = [];

  let q = "";
  let abierto = false;

  // Misma comparación que el back: sin mayúsculas, tildes ni espacios de más.
  const clave = (t) =>
    String(t ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  $: yaEstan = new Set(lista.map((x) => clave(x.nombre)));
  $: sugerencias = catalogo
    .filter((e) => e.activa !== false && !yaEstan.has(clave(e.nombre)) && coincideTexto([e.nombre], q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 8);
  $: escrito = q.trim().replace(/\s+/g, " ");
  // "Crear" solo si el texto no es ya un nombre existente (eso se escoge de la lista, no se duplica).
  $: existente = catalogo.find((e) => clave(e.nombre) === clave(escrito));
  $: puedeCrear = escrito && !existente && !yaEstan.has(clave(escrito));

  function agregar(item) {
    lista = [...lista, { pideDetalle: false, provisional: false, ...item }];
    q = "";
    abierto = false;
  }

  function agregarEscrito() {
    if (existente && !yaEstan.has(clave(existente.nombre))) {
      agregar({ elementoId: existente.id, nombre: existente.nombre });
    } else if (puedeCrear) {
      agregar({ elementoId: null, nombre: escrito.charAt(0).toUpperCase() + escrito.slice(1) });
    }
  }

  function quitar(i) {
    lista = lista.filter((_, j) => j !== i);
  }

  function mover(i, paso) {
    const j = i + paso;
    if (j < 0 || j >= lista.length) return;
    const copia = [...lista];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    lista = copia;
  }

  function onKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarEscrito();
    } else if (e.key === "Escape" && abierto) {
      e.stopPropagation();
      abierto = false;
    }
  }
</script>

<div class="sub-field">
  <span>Elementos de este conjunto <span class="n">{lista.length}</span></span>
  <span class="sub-field-hint">Lo que el operario verá dentro de este conjunto en «¿Qué elementos revisaste?».</span>

  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="buscador" on:focusout={(e) => !e.currentTarget.contains(e.relatedTarget) && (abierto = false)}>
    <input class="sub-input" type="text" bind:value={q} placeholder="Buscar o escribir un elemento…"
      aria-label="Agregar elemento" maxlength="200" autocomplete="off"
      on:focus={() => (abierto = true)} on:input={() => (abierto = true)} on:keydown={onKeydown} />
    {#if abierto && (sugerencias.length || puedeCrear)}
      <ul class="sugerencias" role="listbox">
        {#each sugerencias as e (e.id)}
          <li>
            <button type="button" role="option" aria-selected="false"
              on:click={() => agregar({ elementoId: e.id, nombre: e.nombre })}>{e.nombre}</button>
          </li>
        {/each}
        {#if puedeCrear}
          <li>
            <button type="button" role="option" aria-selected="false" class="crear" on:click={agregarEscrito}>
              + Crear «{escrito}»
            </button>
          </li>
        {/if}
      </ul>
    {/if}
  </div>

  {#if lista.length}
    <ol class="lista">
      {#each lista as x, i (x.elementoId ?? `nuevo-${x.nombre}`)}
        <li class="fila">
          <span class="flechas">
            <button type="button" aria-label="Subir {x.nombre}" disabled={i === 0} on:click={() => mover(i, -1)}>▲</button>
            <button type="button" aria-label="Bajar {x.nombre}" disabled={i === lista.length - 1} on:click={() => mover(i, 1)}>▼</button>
          </span>
          <span class="nombre">
            {x.nombre}
            {#if x.provisional}<span class="sub-badge warn" title="Lo agregó un operario con «Otro». Al guardar queda revisado.">Por revisar</span>{/if}
            {#if !x.elementoId}<span class="sub-badge neu">Nuevo</span>{/if}
          </span>
          <label class="detalle" title="Al marcarlo, el operario escribe cómo se encuentra">
            <input type="checkbox" bind:checked={x.pideDetalle} />Pide texto
          </label>
          <button type="button" class="quitar" aria-label="Quitar {x.nombre}" on:click={() => quitar(i)}>×</button>
        </li>
      {/each}
    </ol>
  {:else}
    <div class="vacio">Este conjunto todavía no tiene elementos.</div>
  {/if}
</div>

<style>
  .n {
    margin-left: 4px;
    font-size: 11.5px;
    color: #6b6a66;
    background: #f1efeb;
    border-radius: 999px;
    padding: 1px 8px;
  }
  .buscador {
    position: relative;
  }
  .buscador .sub-input {
    width: 100%;
    box-sizing: border-box;
  }
  .sugerencias {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    z-index: 5;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: #fff;
    border: 1px solid #e6e1ee;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(11, 11, 11, 0.12);
    max-height: 240px;
    overflow-y: auto;
  }
  .sugerencias button {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
  .sugerencias button:hover,
  .sugerencias button:focus-visible {
    background: #f7f3fc;
  }
  .sugerencias .crear {
    color: #5b3fa0;
    font-weight: 600;
  }
  .lista {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid #ece9e4;
    border-radius: 10px;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-bottom: 1px solid #f1efeb;
    font-size: 13px;
  }
  .fila:last-child {
    border-bottom: none;
  }
  .flechas {
    display: flex;
    flex-direction: column;
  }
  .flechas button {
    all: unset;
    cursor: pointer;
    font-size: 8px;
    line-height: 10px;
    color: #898781;
    padding: 0 2px;
  }
  .flechas button:disabled {
    opacity: 0.25;
    cursor: default;
  }
  .nombre {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .detalle {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #52514e;
    white-space: nowrap;
  }
  .quitar {
    all: unset;
    cursor: pointer;
    color: #898781;
    font-size: 17px;
    padding: 0 4px;
  }
  .quitar:hover {
    color: #d03b3b;
  }
  .vacio {
    font-size: 12.5px;
    color: #898781;
    padding: 10px 12px;
    border: 1px dashed #e0dcd5;
    border-radius: 10px;
  }
</style>
