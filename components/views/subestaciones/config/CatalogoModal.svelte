<script>
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { TIPOS_ESTACION, FRECUENCIAS, DISCIPLINAS } from "../../../../config/subestaciones.js";

  /** "est" | "act" | "conj" (conjunto) | "elem" (elemento) */
  export let tipo = "est";
  /** Registro a editar (EstacionResponse / ActividadResponse / ItemCatalogoResponse), o null para crear. */
  export let registro = null;
  /** Disciplina con la que arranca un registro nuevo (la del filtro de la pantalla que lo abre). */
  export let disciplinaInicial = "CIVIL";

  const dispatch = createEventDispatcher();

  const esEst = tipo === "est";
  // Conjuntos y elementos solo tienen nombre y disciplina, y desactivarlos no toca el cronograma.
  const esItem = tipo === "conj" || tipo === "elem";
  const editando = !!registro?.id;
  let f = esEst
    ? { nombre: registro?.nombre ?? "", tipo: registro?.tipo ?? "BOMBEO", frecuenciaBase: registro?.frecuenciaBase ?? "TRIMESTRAL" }
    : esItem
      ? { nombre: registro?.nombre ?? "", disciplina: registro?.disciplina ?? disciplinaInicial }
      : {
          nombre: registro?.nombre ?? "",
          nombreCorto: registro?.nombreCorto ?? "",
          disciplina: registro?.disciplina ?? disciplinaInicial,
          capturaMovilHabilitada: registro?.capturaMovilHabilitada ?? true,
        };
  const NOMBRES = { est: ["estación", "la estación"], act: ["actividad", "la actividad"], conj: ["conjunto", "el conjunto"], elem: ["elemento", "el elemento"] };
  const API = {
    act: [substationAdmin.crearActividad, substationAdmin.actualizarActividad, substationAdmin.cambiarEstadoActividad],
    conj: [substationAdmin.crearConjunto, substationAdmin.actualizarConjunto, substationAdmin.cambiarEstadoConjunto],
    elem: [substationAdmin.crearElemento, substationAdmin.actualizarElemento, substationAdmin.cambiarEstadoElemento],
  };
  let confirmar = false;
  let guardando = false;
  let error = "";

  $: titulo = (editando ? "Editar " : esItem ? "Nuevo " : "Nueva ") + NOMBRES[tipo][0];
  $: inactiva = editando && registro.activa === false;
  $: sustantivo = NOMBRES[tipo][1];
  $: offText = esItem
    ? (inactiva
        ? "Inactivo: el móvil no lo ofrece. Las visitas que ya lo marcaron lo conservan."
        : `Desactivar quita ${sustantivo} de la lista del móvil. Las visitas que ya lo marcaron lo conservan.`)
    : inactiva
      ? (esEst
          ? "Estación inactiva: no aparece en consultas nuevas ni en la copia de cronograma."
          : "Actividad inactiva: no se puede asignar ni aparece en la copia de cronograma.")
      : confirmar
        ? "¿Confirmar? Sus citas de los próximos meses quedan en borrador para quitarse al publicar. Su historial se conserva."
        : `Desactivar oculta ${sustantivo} de cronogramas futuros. No borra datos.`;
  // Ya usado (citas, ejecuciones o visitas que lo marcaron): no cambia de disciplina (el backend responde 409).
  $: disciplinaBloqueada = !esEst && editando && registro?.enUso === true;
  $: invalido = !f.nombre.trim() || (tipo === "act" && f.nombreCorto.trim().length > 24);

  function cerrar() {
    dispatch("close");
  }

  async function guardar() {
    if (invalido || guardando) return;
    guardando = true;
    error = "";
    try {
      const body = esEst
        ? { nombre: f.nombre, tipo: f.tipo, frecuenciaBase: f.frecuenciaBase }
        : esItem ? { ...f } : { ...f, nombreCorto: f.nombreCorto.trim() || null };
      if (esEst) {
        editando ? await substationAdmin.actualizarEstacion(registro.id, body) : await substationAdmin.crearEstacion(body);
      } else {
        const [crear, actualizar] = API[tipo];
        editando ? await actualizar(registro.id, body) : await crear(body);
      }
      flash("Guardado");
      dispatch("saved");
    } catch (e) {
      error = e.message;
    } finally {
      guardando = false;
    }
  }

  async function cambiarEstado(activa) {
    guardando = true;
    error = "";
    try {
      const r = esEst
        ? await substationAdmin.cambiarEstadoEstacion(registro.id, activa)
        : await API[tipo][2](registro.id, activa);
      if (!activa && esItem) {
        flash(`${NOMBRES[tipo][0][0].toUpperCase()}${NOMBRES[tipo][0].slice(1)} desactivado`);
      } else if (!activa) {
        const n = r?.citasRetiradas ?? 0;
        flash(
          (esEst ? "Estación desactivada" : "Actividad desactivada") +
            (n ? ` · ${n} cita(s) futura(s) quedan en borrador para quitarse al publicar` : ""),
        );
      }
      dispatch("saved");
    } catch (e) {
      error = e.message;
    } finally {
      guardando = false;
    }
  }

  function pedirDesactivar() {
    // Conjuntos y elementos no tienen citas que retirar: se desactivan en un paso.
    if (inactiva || esItem) {
      cambiarEstado(inactiva);
    } else {
      confirmar = true;
    }
  }

  /** Deja el cursor en el primer campo al abrir el modal. */
  function enfocar(node) {
    node.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sub-overlay" on:click|self={cerrar}>
  <div class="sub-modal" role="dialog" aria-modal="true" aria-label={titulo}>
    <div class="sub-modal-head">
      <span class="sub-modal-title">{titulo}</span>
      <button class="sub-modal-x" aria-label="Cerrar" on:click={cerrar}>×</button>
    </div>

    <form class="sub-modal-body" on:submit|preventDefault={guardar}>
      <label class="sub-field">Nombre
        <input class="sub-input" bind:value={f.nombre} maxlength={esEst ? 120 : 200} use:enfocar />
      </label>

      {#if esItem}
        <label class="sub-field">Disciplina
          <select class="sub-select" bind:value={f.disciplina} disabled={disciplinaBloqueada}>
            {#each DISCIPLINAS as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
          <span class="sub-field-hint">
            {disciplinaBloqueada
              ? "No se puede cambiar: ya está marcado en visitas registradas."
              : "El operario lo verá al registrar una visita de esta disciplina, en «¿Qué se intervino?»."}
          </span>
        </label>
      {:else if esEst}
        <div class="two">
          <label class="sub-field">Tipo
            <select class="sub-select" bind:value={f.tipo}>
              {#each TIPOS_ESTACION as o}<option value={o.value}>{o.label}</option>{/each}
            </select>
          </label>
          <label class="sub-field">Frecuencia base
            <select class="sub-select" bind:value={f.frecuenciaBase}>
              {#each FRECUENCIAS as o}<option value={o.value}>{o.label}</option>{/each}
            </select>
          </label>
        </div>
      {:else}
        <label class="sub-field">Nombre corto
          <input class="sub-input" bind:value={f.nombreCorto} placeholder="Ej. Pintura muros" />
          <span class={f.nombreCorto.trim().length > 24 ? "sub-field-error" : "sub-field-hint"}>
            Se muestra en las celdas del Cronograma ({f.nombreCorto.trim().length}/24). Si se deja vacío, se recorta el nombre.
          </span>
        </label>
        <label class="sub-field">Disciplina
          <select class="sub-select" bind:value={f.disciplina} disabled={disciplinaBloqueada}>
            {#each DISCIPLINAS as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
          {#if disciplinaBloqueada}
            <span class="sub-field-hint">No se puede cambiar: la actividad ya tiene citas o ejecuciones registradas.</span>
          {/if}
        </label>
        <label class="check">
          <input type="checkbox" bind:checked={f.capturaMovilHabilitada} />Habilitar captura desde la app móvil
        </label>
      {/if}

      {#if editando}
        <div class="off">
          <span class="off-text">{offText}</span>
          {#if confirmar}
            <button type="button" class="sub-btn-danger" disabled={guardando} on:click={() => cambiarEstado(false)}>Confirmar</button>
          {:else}
            <button type="button" class="sub-btn-danger-outline" disabled={guardando} on:click={pedirDesactivar}>
              {inactiva ? "Reactivar" : "Desactivar"}
            </button>
          {/if}
        </div>
      {/if}

      {#if error}<div class="sub-field-error" role="alert">{error}</div>{/if}
      <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
    </form>

    <div class="sub-modal-foot">
      <button class="sub-btn" on:click={cerrar}>Cancelar</button>
      <button class="sub-btn-primary" disabled={invalido || guardando} on:click={guardar}>Guardar</button>
    </div>
  </div>
</div>

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .off {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(208, 59, 59, 0.2);
    border-radius: 8px;
    background: #fdf6f6;
  }
  .off-text {
    font-size: 12.5px;
    color: #52514e;
    text-wrap: pretty;
  }
</style>
