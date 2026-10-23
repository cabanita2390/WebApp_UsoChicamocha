<script>
  /**
   * Crear la orden de trabajo (OT-EB) que corrige un hallazgo: prioridad, plazo, operario,
   * actividad con la que se registra la corrección e instrucciones.
   */
  import { createEventDispatcher } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { PRIORIDAD, prioridadSugerida, fechaLimiteSugerida, isoLocal } from "../../../../utils/ordenes.js";
  import { fechaCorta } from "../../../../utils/cronograma.js";

  /** EjecucionResponse con el hallazgo. */
  export let hallazgo;

  const dispatch = createEventDispatcher();
  const hoy = isoLocal(new Date());
  // El servidor acepta hasta un año: un error de tecleo (2062) nunca saldría como vencida.
  const maximo = isoLocal(new Date(new Date().setDate(new Date().getDate() + 365)));
  const CUALQUIERA = "cualquiera";

  let prioridad = prioridadSugerida(hallazgo.resultado);
  let fechaLimite = fechaLimiteSugerida(prioridad);
  let plazoTocado = false;
  let asignadoAId = "";
  let actividadId = "";
  let instrucciones = "";
  let operarios = [];
  let actividades = [];
  let cargando = true;
  let guardando = false;
  let error = "";

  // Al abrir (sin onMount: así también corre en los tests).
  cargarDatos();
  async function cargarDatos() {
    try {
      const [ops, acts] = await Promise.all([substationAdmin.operarios(), substationAdmin.listarActividades()]);
      operarios = ops;
      actividades = acts.filter((a) => a.activa && a.disciplina === hallazgo.disciplina);
      // La misma actividad del hallazgo; si fue un registro libre, una de corrección de hallazgos.
      const misma = actividades.find((a) => a.id === hallazgo.actividadId);
      const correccion = actividades.find((a) => /^correcci/i.test(a.nombre));
      actividadId = String((misma ?? correccion ?? actividades[0])?.id ?? "");
      if (operarios.length === 1) asignadoAId = String(operarios[0].id);
    } catch (e) {
      error = e.message;
    } finally {
      cargando = false;
    }
  }

  function cambiarPrioridad(p) {
    prioridad = p;
    if (!plazoTocado) fechaLimite = fechaLimiteSugerida(p);
  }

  $: valido = asignadoAId && actividadId && fechaLimite >= hoy && fechaLimite <= maximo && instrucciones.trim();

  async function crear() {
    if (!valido || guardando) return;
    guardando = true;
    error = "";
    try {
      const orden = await substationAdmin.crearOrden({
        ejecucionOrigenId: hallazgo.id,
        prioridad,
        fechaLimite,
        // "cualquiera": la ven todos los operarios y queda a nombre del primero que la ejecute.
        asignadoAId: asignadoAId === CUALQUIERA ? null : Number(asignadoAId),
        paraCualquiera: asignadoAId === CUALQUIERA,
        actividadId: Number(actividadId),
        instrucciones: instrucciones.trim(),
      });
      dispatch("creada", orden);
    } catch (e) {
      error = e.message;
    } finally {
      guardando = false;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      dispatch("close");
    }
  }
</script>

<svelte:window on:keydown|capture={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="velo" on:click|self={() => dispatch("close")}>
  <div class="caja" role="dialog" aria-modal="true" aria-label="Crear orden de trabajo">
    <div class="cab">
      <div>
        <div class="t">Crear orden de trabajo</div>
        <div class="s">{hallazgo.estacionNombre} · hallazgo del {fechaCorta(hallazgo.fecha)}</div>
      </div>
      <button class="x" aria-label="Cerrar" on:click={() => dispatch("close")}>✕</button>
    </div>

    <div class="cuerpo">
      <div class="hallazgo">
        <span class="lab">Qué se encontró</span>
        <span>{hallazgo.observaciones}</span>
        <span class="gris">{hallazgo.actividadNombre ?? hallazgo.descripcionLibre ?? ""} · {hallazgo.responsable} ·
          {hallazgo.evidencias?.length ?? 0} foto(s)</span>
      </div>

      {#if cargando}
        <p class="gris">Cargando operarios y actividades…</p>
      {:else}
        <div class="fila2">
          <div class="campo">
            <span class="lab">Prioridad</span>
            <div class="seg" role="group" aria-label="Prioridad">
              {#each Object.entries(PRIORIDAD) as [k, p]}
                <button type="button" class:on={prioridad === k} style={prioridad === k ? `color:${p.c};background:${p.bg};border-color:${p.c}` : ""}
                  on:click={() => cambiarPrioridad(k)}>{p.l}</button>
              {/each}
            </div>
          </div>
          <label class="campo">
            <span class="lab">Fecha límite</span>
            <input type="date" min={hoy} max={maximo} bind:value={fechaLimite} on:input={() => (plazoTocado = true)} />
          </label>
        </div>

        <div class="fila2">
          <label class="campo">
            <span class="lab">Asignar a</span>
            <select bind:value={asignadoAId}>
              <option value="">Elegir operario…</option>
              <option value={CUALQUIERA}>Cualquier operario (el primero que la tome)</option>
              {#each operarios as o (o.id)}<option value={String(o.id)}>{o.nombre}</option>{/each}
            </select>
            {#if asignadoAId === CUALQUIERA}<span class="gris">Le aparece a todos los operarios; queda a nombre de quien la registre.</span>{/if}
            {#if !operarios.length}<span class="aviso">No hay operarios activos para asignar.</span>{/if}
          </label>
          <label class="campo">
            <span class="lab">Se registra como</span>
            <select bind:value={actividadId}>
              {#each actividades as a (a.id)}<option value={String(a.id)}>{a.nombre}</option>{/each}
            </select>
          </label>
        </div>

        <label class="campo">
          <span class="lab">Instrucciones para el operario</span>
          <textarea rows="4" maxlength="2000" bind:value={instrucciones}
            placeholder="Qué hay que hacer, materiales, precauciones…"></textarea>
        </label>
        <p class="gris">La orden aparece en el móvil en "Prioritarias". Cuando la registren, queda por verificar aquí.</p>
      {/if}

      {#if error}<div class="error" role="alert">{error}</div>{/if}
    </div>

    <div class="pie">
      <button class="sec" on:click={() => dispatch("close")}>Cancelar</button>
      <button class="prim" disabled={!valido || guardando} on:click={crear}>{guardando ? "Creando…" : "Crear orden"}</button>
    </div>
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(11, 11, 11, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .caja {
    width: 620px;
    max-width: 100%;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.2);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
  }
  .cab {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 18px 22px;
    border-bottom: 1px solid #f0f0ef;
  }
  .t {
    font-size: 16px;
    font-weight: 650;
  }
  .s,
  .gris {
    font-size: 12.5px;
    color: #898781;
  }
  .x {
    all: unset;
    cursor: pointer;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #f5f6f8;
    color: #898781;
  }
  .cuerpo {
    padding: 18px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hallazgo {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fbeaea;
    font-size: 13px;
  }
  .lab {
    font-size: 11.5px;
    font-weight: 650;
    color: #52514e;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .fila2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 560px) {
    .fila2 {
      grid-template-columns: 1fr;
    }
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  select,
  input,
  textarea {
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    border-radius: 8px;
    background: #fff;
    color: #0b0b0b;
    box-sizing: border-box;
    width: 100%;
  }
  textarea {
    resize: vertical;
  }
  .seg {
    display: flex;
    gap: 6px;
  }
  .seg button {
    flex: 1;
    padding: 8px 0;
    border-radius: 8px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    background: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .aviso,
  .error {
    font-size: 12.5px;
    color: #d03b3b;
  }
  .error {
    background: #fbeaea;
    padding: 10px 12px;
    border-radius: 8px;
  }
  .pie {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 22px;
    border-top: 1px solid #f0f0ef;
  }
  .prim,
  .sec {
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    border-radius: 999px;
    padding: 9px 18px;
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
</style>
