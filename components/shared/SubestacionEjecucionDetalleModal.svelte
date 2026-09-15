<script>
  import { createEventDispatcher } from "svelte";
  import Loader from "./Loader.svelte";
  import { getFileUrl } from "../../stores/api.js";
  import { ui } from "../../stores/ui.js";
  import {
    resultadoBadge,
    tipoMantenimientoLabel,
    tipoActividadLabel,
  } from "../../config/table-definitions/substation.js";

  /** EjecucionResponse completo (incluye evidencias[] y ediciones[]), o null mientras carga. */
  export let ejecucion = null;
  export let isLoading = false;

  const dispatch = createEventDispatcher();

  $: badge = ejecucion ? resultadoBadge(ejecucion.resultado) : null;

  function formatFecha(iso) {
    if (!iso) return "—";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  }

  function formatFechaHora(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  /**
   * Desde V40, EvidenciaStorageService (backend) guarda rutaArchivo con el prefijo
   * "/uploads/" incluido, igual que los demás módulos (SOAT/tecnomecánica/facturas) —
   * antes no lo traía, y el navegador pedía la imagen sin "/uploads/" (403). Se acepta
   * cualquiera de los dos formatos por si queda evidencia vieja sin migrar en algún
   * ambiente (mismo patrón que urlEvidencia() en DetalleScreen.kt del móvil).
   */
  function urlEvidencia(rutaArchivo) {
    const ruta = rutaArchivo.startsWith("/uploads/") ? rutaArchivo : `/uploads/${rutaArchivo}`;
    return getFileUrl(ruta);
  }

  function abrirGaleria() {
    const urls = (ejecucion?.evidencias ?? []).map((ev) => ({
      url: urlEvidencia(ev.rutaArchivo),
      name: ev.nombreOriginal,
    }));
    ui.openImageModal();
    ui.setImageModalLoading(false);
    ui.setImageModalUrls(urls);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="overlay" role="presentation" on:click={() => dispatch("close")}>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Detalle de ejecución" on:click|stopPropagation>
    {#if isLoading || !ejecucion}
      <div class="modal-loading"><Loader /></div>
    {:else}
      <div class="modal-head">
        <div class="modal-title">
          Detalle de ejecución
          <span class="ink-muted">· {ejecucion.estacionNombre} · {formatFecha(ejecucion.fecha)}</span>
        </div>
        <button type="button" class="close-btn" on:click={() => dispatch("close")} aria-label="Cerrar">✕</button>
      </div>

      <div class="modal-body">
        {#if ejecucion.evidenciaPendiente}
          <div class="aviso-pendiente">
            Este resultado no es Conforme y todavía no tiene fotos de evidencia.
          </div>
        {/if}

        <div class="data-grid2">
          <div class="dl"><span class="dl-lab">Estación</span><span class="dl-val">{ejecucion.estacionNombre}</span></div>
          <div class="dl"><span class="dl-lab">Mes / semana ejecución</span><span class="dl-val">{MESES[ejecucion.mesEjecucion] ?? "—"} · Semana {ejecucion.semanaEjecucion ?? "—"}</span></div>
          <div class="dl"><span class="dl-lab">Tipo de mantenimiento</span><span class="dl-val">{tipoMantenimientoLabel(ejecucion.tipoMantenimiento)}</span></div>
          <div class="dl"><span class="dl-lab">Tipo de actividad</span><span class="dl-val">{tipoActividadLabel(ejecucion.tipoActividad)}</span></div>
          <div class="dl"><span class="dl-lab">Actividad</span><span class="dl-val">{ejecucion.actividadNombre ?? ejecucion.descripcionLibre ?? "—"}</span></div>
          <div class="dl"><span class="dl-lab">Programada</span><span class="dl-val">{ejecucion.esProgramada ? "Sí" : "No"}</span></div>
          <div class="dl"><span class="dl-lab">Resultado</span><span><span class="badge-cell badge-{badge.color}">{badge.label}</span></span></div>
          <div class="dl"><span class="dl-lab">Responsable</span><span class="dl-val">{ejecucion.responsable}</span></div>
          <div class="dl full"><span class="dl-lab">Observaciones</span><span class="dl-val">{ejecucion.observaciones}</span></div>
        </div>

        <div class="section-h">Evidencia ({ejecucion.evidencias?.length ?? 0} foto{(ejecucion.evidencias?.length ?? 0) === 1 ? "" : "s"})</div>
        {#if ejecucion.evidencias?.length}
          <div class="gallery">
            {#each ejecucion.evidencias as ev}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="thumb" role="button" tabindex="0" on:click={abrirGaleria} title={ev.nombreOriginal}>
                <img src={urlEvidencia(ev.rutaArchivo)} alt={ev.nombreOriginal} loading="lazy" />
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-data">Sin fotos de evidencia.</p>
        {/if}

        <div class="section-h">Historial de ediciones</div>
        {#if ejecucion.ediciones?.length}
          <div class="history">
            {#each ejecucion.ediciones as ed}
              <div class="history-item">
                <div class="history-dot"></div>
                <div>
                  <div class="history-text">{ed.usuario} corrigió el registro</div>
                  <div class="history-meta">"{ed.motivo}" · {formatFechaHora(ed.editadoEn)}</div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-data">Sin ediciones registradas.</p>
        {/if}
      </div>

      <div class="modal-foot">
        <button type="button" class="btn-close" on:click={() => dispatch("close")}>Cerrar</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.45);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 48px 24px;
    overflow: auto;
    z-index: 1000;
  }
  .modal {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #fff;
    border-radius: 14px;
    width: 760px;
    max-width: 100%;
    box-shadow: 0 8px 24px rgba(11, 11, 11, 0.18), 0 2px 6px rgba(11, 11, 11, 0.1);
    overflow: hidden;
  }
  .modal-loading {
    display: flex;
    justify-content: center;
    padding: 60px;
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #f0f0ef;
  }
  .modal-title {
    font-size: 15px;
    font-weight: 700;
    color: #0b0b0b;
  }
  .ink-muted {
    font-weight: 400;
    color: #898781;
  }
  .close-btn {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #898781;
    background: #f5f6f8;
    cursor: pointer;
    font-size: 13px;
  }
  .close-btn:hover {
    background: #ececea;
  }
  .modal-body {
    padding: 20px 22px;
    max-height: 65vh;
    overflow-y: auto;
  }
  .aviso-pendiente {
    background: #fff8e1;
    color: #8a5a00;
    border: 1px solid #f0c34d;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12.5px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .data-grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 20px;
    margin-bottom: 4px;
  }
  .dl {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .dl-lab {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #898781;
  }
  .dl-val {
    font-size: 13px;
    color: #0b0b0b;
  }
  .full {
    grid-column: 1 / -1;
  }
  .badge-cell {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
  }
  .badge-green { background: #e8f5e9; color: #1b5e20; border-left: 3px solid #388e3c; }
  .badge-yellow { background: #fff8e1; color: #e65100; border-left: 3px solid #f57f17; }
  .badge-red { background: #ffebee; color: #c62828; border-left: 3px solid #d32f2f; }
  .badge-gray { background: #f5f5f5; color: #424242; border-left: 3px solid #616161; }
  .section-h {
    font-size: 12.5px;
    font-weight: 700;
    color: #0b0b0b;
    margin: 20px 0 10px;
    padding-top: 16px;
    border-top: 1px solid #f0f0ef;
  }
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .thumb {
    width: 130px;
    height: 100px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3e6e9;
    cursor: pointer;
    background: #eef1f4;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .history-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f5f5f4;
  }
  .history-item:last-child {
    border-bottom: none;
  }
  .history-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #2a78d6;
    margin-top: 5px;
    flex-shrink: 0;
  }
  .history-text {
    font-size: 12.5px;
    color: #0b0b0b;
  }
  .history-meta {
    font-size: 11px;
    color: #898781;
    margin-top: 2px;
  }
  .no-data {
    color: #898781;
    font-size: 12px;
    margin: 0;
  }
  .modal-foot {
    padding: 14px 22px;
    border-top: 1px solid #f0f0ef;
    display: flex;
    justify-content: flex-end;
  }
  .btn-close {
    font-family: inherit;
    padding: 9px 20px;
    background: #fff;
    color: #52514e;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    font-size: 12.5px;
    cursor: pointer;
  }
  .btn-close:hover {
    background: #f5f6f8;
  }
</style>
