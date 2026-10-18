<script>
  /**
   * Detalle de una orden de trabajo: el hallazgo (antes) junto a la visita que lo corrigió
   * (después), la verificación y la línea de tiempo.
   */
  import { createEventDispatcher, onDestroy } from "svelte";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { flash } from "../../../../stores/subestacionesToast.js";
  import { alCambiarOrdenes } from "../../../../stores/subestacionesEventos.js";
  import { getFileUrl } from "../../../../stores/api.js";
  import { ui } from "../../../../stores/ui.js";
  import { disciplinaLabel } from "../../../../config/subestaciones.js";
  import { RESULTADO, fechaCorta, fechaHora } from "../../../../utils/cronograma.js";
  import { ORDEN_ESTADO, PRIORIDAD, isoLocal } from "../../../../utils/ordenes.js";
  import Loader from "../../../shared/Loader.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import SubestacionEjecucionDetalleModal from "../../../shared/SubestacionEjecucionDetalleModal.svelte";

  export let id;

  const dispatch = createEventDispatcher();
  const hoy = isoLocal(new Date());
  const maximo = isoLocal(new Date(new Date().setDate(new Date().getDate() + 365)));
  const EVENTO = {
    CREADA: { g: "＋", l: "Orden creada" },
    EDITADA: { g: "✎", l: "Orden editada" },
    EJECUTADA: { g: "◐", l: "El operario registró el trabajo" },
    DEVUELTA: { g: "↺", l: "Devuelta al operario" },
    CERRADA: { g: "✓", l: "Verificada y cerrada" },
    ANULADA: { g: "✕", l: "Anulada" },
    EJECUCION_FUERA_DE_ESTADO: { g: "!", l: "Llegó una visita fuera de tiempo" },
  };

  let d = null;
  let error = "";
  let ocupado = false;
  /** null | "editar" | "cerrar" | "devolver" | "anular" */
  let accion = null;
  let texto = "";
  let edicion = null;
  let operarios = [];
  let registro = null;

  async function cargar() {
    try {
      d = await substationAdmin.obtenerOrden(id);
      error = "";
    } catch (e) {
      error = e.message;
    }
  }
  cargar();
  // El operario la ejecutó desde el móvil u otro supervisor la cambió.
  onDestroy(alCambiarOrdenes((ev) => ev?.ordenId === id && !ocupado && cargar()));

  $: o = d?.orden;
  $: est = o ? ORDEN_ESTADO[o.estado] ?? ORDEN_ESTADO.ASIGNADA : null;
  $: pr = o ? PRIORIDAD[o.prioridad] ?? PRIORIDAD.MEDIA : null;

  function abrir(a) {
    accion = a;
    texto = "";
    if (a === "editar") {
      edicion = {
        prioridad: o.prioridad,
        fechaLimite: o.fechaLimite,
        asignadoAId: o.paraCualquiera ? "cualquiera" : String(o.asignadoAId),
        instrucciones: o.instrucciones,
      };
      substationAdmin.operarios().then((r) => (operarios = r)).catch(() => {});
    }
  }

  async function ejecutar(fn, mensaje) {
    if (ocupado) return;
    ocupado = true;
    try {
      await fn();
      accion = null;
      flash(mensaje);
      await cargar();
    } catch (e) {
      flash(e.message, { error: true });
    } finally {
      ocupado = false;
    }
  }

  const cerrar = () => ejecutar(() => substationAdmin.cerrarOrden(id, texto.trim()), `${o.consecutivo} cerrada · el hallazgo quedó resuelto`);
  const devolver = () =>
    ejecutar(() => substationAdmin.devolverOrden(id, texto.trim()), `${o.consecutivo} devuelta a ${o.asignadoANombre ?? "los operarios"}`);
  const anular = () => ejecutar(() => substationAdmin.anularOrden(id, texto.trim()), `${o.consecutivo} anulada · el hallazgo vuelve a estar abierto`);
  const guardarEdicion = () =>
    ejecutar(
      () =>
        substationAdmin.editarOrden(id, {
          ...edicion,
          asignadoAId: edicion.asignadoAId === "cualquiera" ? null : Number(edicion.asignadoAId),
          paraCualquiera: edicion.asignadoAId === "cualquiera",
          instrucciones: edicion.instrucciones.trim(),
        }),
      "Orden actualizada",
    );

  function urlFoto(ruta) {
    return getFileUrl(ruta.startsWith("/uploads/") ? ruta : `/uploads/${ruta}`);
  }
  function galeria(evidencias, i) {
    const urls = evidencias.map((ev) => ({ url: urlFoto(ev.rutaArchivo), name: ev.nombreOriginal }));
    ui.openImageModal();
    ui.setImageModalLoading(false);
    ui.setImageModalUrls([...urls.slice(i), ...urls.slice(0, i)]);
  }
</script>

{#if !d && !error}
  <div class="centro"><Loader /></div>
{:else if error && !d}
  <ErrorCarga que="la orden de trabajo" mensaje={error} on:reintentar={cargar} />
{:else}
  <button class="sub-link volver" on:click={() => dispatch("volver")}>← Órdenes de trabajo</button>

  <div class="sub-head">
    <div class="sub-head-text">
      <h1 class="sub-title">
        {o.consecutivo}
        <span class="sub-badge" style="color:{est.c};background:{est.bg}">{est.g} {est.l}</span>
        <span class="sub-badge" style="color:{pr.c};background:{pr.bg}">Prioridad {pr.l.toLowerCase()}</span>
      </h1>
      <p class="sub-subtitle">{o.estacionNombre} · {o.actividadNombre} · {disciplinaLabel(o.disciplina)}</p>
    </div>
  </div>

  <div class="meta">
    <div><span class="lab">Asignada a</span><strong>{o.paraCualquiera ? "Cualquier operario" : o.asignadoANombre}</strong>
      {#if o.paraCualquiera}<span class="gris">la ven todos; queda a nombre de quien la registre</span>{/if}</div>
    <div><span class="lab">Fecha límite</span><strong class:rojo={o.vencida}>{o.vencida ? "⚠ " : ""}{fechaCorta(o.fechaLimite)}</strong></div>
    <div><span class="lab">Creada</span><strong>{fechaHora(o.creadoEn)}</strong><span class="gris">por {o.creadoPor}</span></div>
    <div><span class="lab">{o.estado === "CERRADA" || o.estado === "ANULADA" ? "Duró" : "Abierta hace"}</span><strong>{o.diasAbierta} {o.diasAbierta === 1 ? "día" : "días"}</strong></div>
  </div>

  <div class="sub-card bloque">
    <span class="lab">Instrucciones</span>
    <p class="instr">{o.instrucciones}</p>
  </div>

  <div class="antes-despues">
    {#each [{ t: "Antes · el hallazgo", e: d.hallazgo }, { t: "Después · la corrección", e: d.ejecucion }] as lado}
      <div class="sub-card lado">
        <div class="lado-t">{lado.t}</div>
        {#if lado.e}
          {@const rb = RESULTADO[lado.e.resultado] ?? RESULTADO.CONFORME}
          <div class="lado-meta">
            <span>{fechaCorta(lado.e.fecha)} · {lado.e.responsable}</span>
            <span class="sub-badge" style="color:{rb.c};background:{rb.bg}">{rb.g} {rb.l}</span>
          </div>
          <p class="obs">{lado.e.observaciones}</p>
          {#if lado.e.evidencias?.length}
            <div class="fotos">
              {#each lado.e.evidencias as ev, i (ev.id)}
                <button class="foto" title={ev.nombreOriginal} on:click={() => galeria(lado.e.evidencias, i)}>
                  <img src={urlFoto(ev.rutaArchivo)} alt={ev.nombreOriginal} loading="lazy" />
                </button>
              {/each}
            </div>
          {:else}
            <p class="gris">Sin fotos.</p>
          {/if}
          <button class="sub-link" on:click={() => (registro = lado.e)}>Ver registro completo →</button>
        {:else}
          <p class="gris vacio">{o.estado === "ANULADA" ? "La orden se anuló antes de ejecutarse." : "El operario todavía no registra el trabajo. Aparece en su móvil, en Prioritarias."}</p>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Acciones según el estado -->
  {#if o.estado === "ASIGNADA" || o.estado === "POR_VERIFICAR"}
    <div class="sub-card bloque">
      {#if !accion}
        <div class="acciones">
          {#if o.estado === "POR_VERIFICAR"}
            <span class="gris crece">El operario registró el trabajo. Compare las fotos y verifique.</span>
            <button class="sub-btn-primary verde" on:click={() => abrir("cerrar")}>✓ Verificar y cerrar</button>
            <button class="sub-btn" on:click={() => abrir("devolver")}>↺ Devolver al operario</button>
          {:else}
            <span class="gris crece">Esperando a que el operario la ejecute.</span>
            <button class="sub-btn" on:click={() => abrir("editar")}>Editar</button>
          {/if}
          <button class="sub-btn-danger-outline" on:click={() => abrir("anular")}>Anular</button>
        </div>
      {:else if accion === "editar"}
        <div class="form">
          <div class="dos">
            <label class="sub-field">Prioridad
              <select class="sub-select" bind:value={edicion.prioridad}>
                {#each Object.entries(PRIORIDAD) as [k, p]}<option value={k}>{p.l}</option>{/each}
              </select>
            </label>
            <label class="sub-field">Fecha límite
              <input class="sub-input" type="date" min={hoy} max={maximo} bind:value={edicion.fechaLimite} />
            </label>
            <label class="sub-field">Asignada a
              <select class="sub-select" bind:value={edicion.asignadoAId}>
                <option value="cualquiera">Cualquier operario (el primero que la tome)</option>
                {#if !o.paraCualquiera}<option value={String(o.asignadoAId)}>{o.asignadoANombre}</option>{/if}
                {#each operarios.filter((x) => x.id !== o.asignadoAId) as x (x.id)}<option value={String(x.id)}>{x.nombre}</option>{/each}
              </select>
            </label>
          </div>
          <label class="sub-field">Instrucciones
            <textarea rows="3" maxlength="2000" bind:value={edicion.instrucciones}></textarea>
          </label>
          <div class="acciones">
            <button class="sub-btn" on:click={() => (accion = null)}>Cancelar</button>
            <button class="sub-btn-primary" disabled={ocupado || !edicion.instrucciones.trim() || edicion.fechaLimite < hoy || edicion.fechaLimite > maximo} on:click={guardarEdicion}>Guardar cambios</button>
          </div>
        </div>
      {:else}
        {@const cfg = {
          cerrar: { l: "Observación de la verificación", ph: "Ej.: revisado en sitio, la fisura quedó sellada.", b: "Verificar y cerrar", f: cerrar, cls: "sub-btn-primary verde" },
          devolver: { l: "Qué falta o qué quedó mal", ph: "Ej.: la foto no muestra el muro sellado.", b: "Devolver al operario", f: devolver, cls: "sub-btn-primary" },
          anular: { l: "Por qué se anula", ph: "Ej.: lo corrigió el contratista de la obra.", b: "Anular orden", f: anular, cls: "sub-btn-danger" },
        }[accion]}
        <div class="form">
          <label class="sub-field">{cfg.l}
            <textarea rows="3" maxlength="2000" bind:value={texto} placeholder={cfg.ph}></textarea>
          </label>
          {#if accion === "anular"}<span class="gris">El hallazgo vuelve a quedar abierto: se puede resolver sin orden o crearle otra.</span>{/if}
          <div class="acciones">
            <button class="sub-btn" on:click={() => (accion = null)}>Cancelar</button>
            <button class={cfg.cls} disabled={ocupado || !texto.trim()} on:click={cfg.f}>{cfg.b}</button>
          </div>
        </div>
      {/if}
    </div>
  {:else if o.estado === "CERRADA"}
    <div class="sub-card bloque cerrada">
      <span class="lab">Verificación</span>
      <p class="instr">"{d.observacionCierre}"</p>
      <span class="gris">{d.verificadoPor} · {fechaHora(d.verificadoEn)} · el hallazgo quedó resuelto</span>
    </div>
  {:else}
    <div class="sub-card bloque">
      <span class="lab">Motivo de la anulación</span>
      <p class="instr">"{d.motivoAnulacion}"</p>
    </div>
  {/if}

  <!-- Línea de tiempo -->
  <div class="sub-card bloque">
    <span class="lab">Línea de tiempo</span>
    <ol class="tiempo">
      {#each d.eventos as ev (ev.id)}
        {@const t = EVENTO[ev.tipo] ?? { g: "•", l: ev.tipo }}
        <li class:alerta={ev.tipo === "EJECUCION_FUERA_DE_ESTADO" || ev.tipo === "DEVUELTA"}>
          <span class="punto">{t.g}</span>
          <div>
            <div><strong>{t.l}</strong> <span class="gris">· {ev.usuario ?? "—"} · {fechaHora(ev.creadoEn)}</span></div>
            {#if ev.comentario}<div class="coment">{ev.comentario}</div>{/if}
          </div>
        </li>
      {/each}
    </ol>
  </div>
{/if}

{#if registro}
  <SubestacionEjecucionDetalleModal ejecucion={registro} on:close={() => (registro = null)} on:verOrden={() => (registro = null)} />
{/if}

<style>
  .centro {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .volver {
    align-self: flex-start;
    font-size: 13px;
  }
  .sub-title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .meta > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid rgba(11, 11, 11, 0.08);
    border-radius: 10px;
    font-size: 13.5px;
  }
  .lab {
    font-size: 11.5px;
    font-weight: 650;
    color: #52514e;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .gris {
    color: #898781;
    font-size: 12.5px;
  }
  .rojo {
    color: #d03b3b;
  }
  .bloque {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .instr {
    margin: 0;
    font-size: 13.5px;
    white-space: pre-wrap;
  }
  .antes-despues {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 12px;
  }
  .lado {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lado-t {
    font-weight: 700;
    font-size: 14px;
  }
  .lado-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12.5px;
    color: #52514e;
    flex-wrap: wrap;
  }
  .obs {
    margin: 0;
    font-size: 13px;
  }
  .vacio {
    padding: 24px 0;
    text-align: center;
  }
  .fotos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px;
  }
  .foto {
    all: unset;
    cursor: zoom-in;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    background: #f0f0ee;
  }
  .foto img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .acciones {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .crece {
    flex: 1;
    min-width: 160px;
  }
  .verde {
    background: #006300 !important;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .dos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }
  textarea {
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    border-radius: 8px;
    resize: vertical;
  }
  .cerrada {
    background: #f3f8f3;
  }
  .tiempo {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .tiempo li {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 10px;
    font-size: 13px;
  }
  .punto {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #ecedfb;
    color: #4146b8;
    font-weight: 700;
    font-size: 12px;
  }
  .tiempo li.alerta .punto {
    background: #faf1de;
    color: #8a5b00;
  }
  .coment {
    color: #52514e;
    margin-top: 2px;
  }
</style>
