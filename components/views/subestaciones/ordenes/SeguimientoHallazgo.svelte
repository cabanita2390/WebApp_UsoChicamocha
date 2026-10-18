<script>
  /**
   * Seguimiento de un hallazgo en el detalle de la ejecución: su estado, su orden de trabajo y,
   * si sigue abierto, "Crear orden de trabajo" o "Resolver sin orden".
   */
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { subestacionesActiveTab, ordenDetalleId } from "../../../../stores/subestacionesFilters.js";
  import { SEGUIMIENTO, fechaCorta, fechaHora } from "../../../../utils/cronograma.js";
  import { ORDEN_ESTADO } from "../../../../utils/ordenes.js";
  import CrearOrdenModal from "./CrearOrdenModal.svelte";

  /** EjecucionResponse completo, con `seguimiento` (null si es Conforme). */
  export let ejecucion;

  const dispatch = createEventDispatcher();

  let creando = false;
  let resolviendo = false;
  let observacion = "";
  /** "misma" | "posterior" | "" (sin indicar) */
  let donde = "";
  let visitaId = "";
  let posteriores = [];
  let guardando = false;
  let error = "";

  $: s = ejecucion.seguimiento;
  $: estado = s ? SEGUIMIENTO[s.estado] ?? SEGUIMIENTO.ABIERTO : null;
  $: orden = s?.orden;
  $: resuelto = s?.estado === "RESUELTO";

  async function recargar() {
    dispatch("cambio", await substationAdmin.obtenerEjecucion(ejecucion.id));
  }

  async function abrirResolver() {
    resolviendo = true;
    error = "";
    try {
      const pagina = await substationAdmin.visitasPosteriores(ejecucion.estacionId, ejecucion.fecha);
      posteriores = (pagina.content ?? []).filter((v) => v.id !== ejecucion.id && v.fecha > ejecucion.fecha);
    } catch {
      posteriores = [];
    }
  }

  async function resolver() {
    if (!observacion.trim() || (donde === "posterior" && !visitaId) || guardando) return;
    guardando = true;
    error = "";
    try {
      await substationAdmin.resolverHallazgo(ejecucion.id, {
        observacionesCierre: observacion.trim(),
        resueltoMismaVisita: donde === "misma",
        resueltoEnEjecucionId: donde === "posterior" ? Number(visitaId) : null,
      });
      resolviendo = false;
      await recargar();
    } catch (e) {
      error = e.message;
    } finally {
      guardando = false;
    }
  }

  async function ordenCreada() {
    creando = false;
    await recargar();
  }

  function verOrden() {
    ordenDetalleId.set(orden.id);
    subestacionesActiveTab.set("ordenes");
    dispatch("verOrden", orden.id);
  }
</script>

{#if s}
  <div class="seg">
    <div class="cab">
      <span class="t">Seguimiento del hallazgo</span>
      <span class="badge" style="color:{estado.c};background:{estado.bg}">{estado.g} {estado.l}</span>
    </div>

    {#if orden}
      {@const oe = ORDEN_ESTADO[orden.estado] ?? ORDEN_ESTADO.ASIGNADA}
      <div class="orden">
        <span><strong>{orden.consecutivo}</strong> <span class="badge" style="color:{oe.c};background:{oe.bg}">{oe.g} {oe.l}</span></span>
        <span class="gris">{oe.ayuda}</span>
        <button class="link" on:click={verOrden}>Ver orden →</button>
      </div>
    {/if}

    {#if resuelto}
      <p class="cierre">
        Resuelto por <strong>{s.cerradoPor}</strong> el {fechaHora(s.cerradoEn)}
        {#if s.resueltoMismaVisita}· en la misma visita{:else if s.resueltoEnEjecucionId}· en la visita del {fechaCorta(s.resueltoEnEjecucionFecha)}{/if}
      </p>
      <p class="obs">"{s.observacionesCierre}"</p>
    {:else if !orden && !resolviendo}
      <p class="gris">Nadie lo atiende todavía. Cree la orden de trabajo para corregirlo, o resuélvalo si ya se arregló.</p>
      <div class="acciones">
        <button class="prim" on:click={() => (creando = true)}>Crear orden de trabajo</button>
        <button class="sec" on:click={abrirResolver}>Resolver sin orden</button>
      </div>
    {/if}

    {#if resolviendo}
      <div class="form">
        <label class="campo">
          <span class="lab">Qué se hizo</span>
          <textarea rows="3" maxlength="2000" bind:value={observacion} placeholder="Ej.: se selló la fisura en la misma visita."></textarea>
        </label>
        <div class="opciones" role="radiogroup" aria-label="Dónde se resolvió">
          <label><input type="radio" bind:group={donde} value="misma" /> Se corrigió en esa misma visita</label>
          <label><input type="radio" bind:group={donde} value="posterior" disabled={!posteriores.length} /> En una visita posterior
            {#if !posteriores.length}<span class="gris">(no hay visitas posteriores)</span>{/if}</label>
          {#if donde === "posterior"}
            <select bind:value={visitaId} aria-label="Visita en que se resolvió">
              <option value="">Elegir visita…</option>
              {#each posteriores as v (v.id)}
                <option value={String(v.id)}>{fechaCorta(v.fecha)} · {v.actividadNombre ?? v.descripcionLibre ?? "Registro"} · {v.responsable}</option>
              {/each}
            </select>
          {/if}
          <label><input type="radio" bind:group={donde} value="" /> No indicar</label>
        </div>
        {#if error}<div class="error" role="alert">{error}</div>{/if}
        <div class="acciones">
          <button class="sec" on:click={() => (resolviendo = false)}>Cancelar</button>
          <button class="prim" disabled={!observacion.trim() || (donde === "posterior" && !visitaId) || guardando} on:click={resolver}>
            {guardando ? "Guardando…" : "Marcar resuelto"}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

{#if creando}
  <CrearOrdenModal hallazgo={ejecucion} on:close={() => (creando = false)} on:creada={ordenCreada} />
{/if}

<style>
  .seg {
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px solid rgba(11, 11, 11, 0.1);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
  }
  .cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .t {
    font-weight: 700;
  }
  .badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 650;
    padding: 2px 9px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .orden {
    display: flex;
    align-items: center;
    gap: 6px 14px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f7f7f6;
  }
  .gris {
    color: #898781;
    font-size: 12.5px;
    margin: 0;
  }
  .cierre,
  .obs {
    margin: 0;
  }
  .obs {
    color: #52514e;
    font-style: italic;
  }
  .link {
    all: unset;
    cursor: pointer;
    color: #1f5fae;
    font-weight: 650;
    margin-left: auto;
  }
  .acciones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .prim,
  .sec {
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    border-radius: 999px;
    padding: 8px 16px;
    cursor: pointer;
  }
  .prim {
    background: #2a78d6;
    color: #fff;
    border: 0;
  }
  .prim:disabled {
    background: #a9c6ea;
    cursor: default;
  }
  .sec {
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.14);
    color: #0b0b0b;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lab {
    font-size: 11.5px;
    font-weight: 650;
    color: #52514e;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  textarea,
  select {
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    border-radius: 8px;
  }
  .opciones {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .opciones label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .error {
    font-size: 12.5px;
    color: #d03b3b;
    background: #fbeaea;
    padding: 8px 12px;
    border-radius: 8px;
  }
</style>
