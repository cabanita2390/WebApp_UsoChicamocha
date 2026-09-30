<script>
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { TIPOS_ESTACION, FRECUENCIAS, DISCIPLINAS } from "../../../../config/subestaciones.js";

  /** "est" | "act" */
  export let tipo = "est";
  /** Registro a editar (EstacionResponse / ActividadResponse), o null para crear. */
  export let registro = null;

  const dispatch = createEventDispatcher();

  const esEst = tipo === "est";
  const editando = !!registro?.id;
  let f = esEst
    ? { nombre: registro?.nombre ?? "", tipo: registro?.tipo ?? "BOMBEO", frecuenciaBase: registro?.frecuenciaBase ?? "TRIMESTRAL" }
    : {
        nombre: registro?.nombre ?? "",
        nombreCorto: registro?.nombreCorto ?? "",
        disciplina: registro?.disciplina ?? "CIVIL",
        capturaMovilHabilitada: registro?.capturaMovilHabilitada ?? true,
      };
  let confirmar = false;
  let guardando = false;
  let error = "";

  $: titulo = (editando ? "Editar " : "Nueva ") + (esEst ? "estación" : "actividad");
  $: inactiva = editando && registro.activa === false;
  $: sustantivo = esEst ? "la estación" : "la actividad";
  $: offText = inactiva
    ? (esEst
        ? "Estación inactiva: no aparece en consultas nuevas ni en la copia de cronograma."
        : "Actividad inactiva: no se puede asignar ni aparece en la copia de cronograma.")
    : confirmar
      ? "¿Confirmar? Deja de aparecer en cronogramas futuros. Su historial se conserva."
      : `Desactivar oculta ${sustantivo} de cronogramas futuros. No borra datos.`;
  $: invalido = !f.nombre.trim() || (!esEst && f.nombreCorto.trim().length > 24);

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
        : { ...f, nombreCorto: f.nombreCorto.trim() || null };
      if (esEst) {
        editando ? await substationAdmin.actualizarEstacion(registro.id, body) : await substationAdmin.crearEstacion(body);
      } else {
        editando ? await substationAdmin.actualizarActividad(registro.id, body) : await substationAdmin.crearActividad(body);
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
      esEst
        ? await substationAdmin.cambiarEstadoEstacion(registro.id, activa)
        : await substationAdmin.cambiarEstadoActividad(registro.id, activa);
      if (!activa) flash(esEst ? "Estación desactivada" : "Actividad desactivada");
      dispatch("saved");
    } catch (e) {
      error = e.message;
    } finally {
      guardando = false;
    }
  }

  function pedirDesactivar() {
    if (inactiva) {
      cambiarEstado(true);
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

      {#if esEst}
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
          <select class="sub-select" bind:value={f.disciplina}>
            {#each DISCIPLINAS as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
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
