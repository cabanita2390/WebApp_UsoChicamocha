<script>
  import { createEventDispatcher } from "svelte";
  import { MESES } from "../../../../config/subestaciones.js";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";

  export let anio;
  /** Año actual del servidor: los cambios de otro año llevan el año en la línea (mockup). */
  export let anioActual;

  const dispatch = createEventDispatcher();

  let resumen = null;
  let error = "";
  let publicando = false;

  substationAdmin
    .resumenBorrador(anio)
    .then((r) => (resumen = r))
    .catch((e) => (error = e.message));

  const etiqueta = (c) => `${MESES[c.mes - 1]}${anio !== anioActual ? ` ${anio}` : ""} · ${c.actividadNombre}`;

  $: lineas = (resumen?.porEstacion ?? []).map((e) => {
    const altas = e.cambios.filter((c) => c.tipo === "ALTA").map(etiqueta);
    const bajas = e.cambios.filter((c) => c.tipo === "BAJA").map(etiqueta);
    return {
      nombre: e.estacionNombre,
      altas: altas.length ? `+${altas.length} · ${altas.join(", ")}` : "",
      bajas: bajas.length ? `−${bajas.length} · ${bajas.join(", ")}` : "",
    };
  });

  async function publicar() {
    publicando = true;
    error = "";
    try {
      const r = await substationAdmin.publicar(anio);
      dispatch("publicado", r);
    } catch (e) {
      error = e.message;
    } finally {
      publicando = false;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sub-overlay" on:click|self={() => dispatch("close")}>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Publicar cronograma a móvil">
    <div class="head">
      <div class="t">Publicar cronograma a móvil</div>
      <div class="s">Revise los cambios antes de enviarlos a los técnicos.</div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kl">Citas nuevas</div><div class="kv verde">+{resumen?.altas ?? 0}</div></div>
      <div class="kpi"><div class="kl">Citas quitadas</div><div class="kv rojo">−{resumen?.bajas ?? 0}</div></div>
      <div class="kpi"><div class="kl">Estaciones afectadas</div><div class="kv">{resumen?.estacionesAfectadas ?? 0}</div></div>
    </div>
    <div class="lineas">
      {#if !resumen && !error}<div class="cargando">Cargando cambios…</div>{/if}
      {#each lineas as l}
        <div class="linea">
          <strong>{l.nombre}</strong>
          <span class="cambios">
            {#if l.altas}<span class="verde">{l.altas}</span>{/if}
            {#if l.bajas}<span class="rojo">{l.bajas}</span>{/if}
          </span>
        </div>
      {/each}
      {#if error}<div class="error" role="alert">{error}</div>{/if}
    </div>
    <div class="pie">
      <span class="nota">Se registra en el historial con su usuario.</span>
      <div class="botones">
        <button class="sec-btn" on:click={() => dispatch("close")}>Seguir editando</button>
        <button class="primario" disabled={publicando || !resumen || resumen.altas + resumen.bajas === 0}
          on:click={publicar}>Publicar a móvil</button>
      </div>
    </div>
  </div>
</div>

<style>
  .sub-overlay {
    z-index: 1060;
  }
  .modal {
    width: 560px;
    max-width: 100%;
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.2);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
  }
  .head {
    padding: 18px 22px 12px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .t {
    font-size: 17px;
    font-weight: 650;
  }
  .s {
    font-size: 13px;
    color: #52514e;
    margin-top: 3px;
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .kpi {
    padding: 14px 22px;
  }
  .kpi + .kpi {
    border-left: 1px solid rgba(11, 11, 11, 0.06);
  }
  .kl {
    font-size: 12px;
    color: #898781;
  }
  .kv {
    font-size: 22px;
    font-weight: 650;
  }
  .verde {
    color: #006300;
  }
  .rojo {
    color: #d03b3b;
  }
  .lineas {
    flex: 1;
    overflow: auto;
    padding: 6px 0;
  }
  .cargando {
    padding: 12px 22px;
    font-size: 13px;
    color: #898781;
  }
  .linea {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 12px;
    padding: 8px 22px;
    font-size: 13px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
  }
  .linea strong {
    font-weight: 600;
  }
  .cambios {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .error {
    padding: 8px 22px;
    font-size: 12.5px;
    color: #d03b3b;
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 14px 22px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .nota {
    font-size: 12px;
    color: #898781;
    flex: 1;
    min-width: 0;
  }
  .botones {
    display: flex;
    gap: 8px;
  }
  .sec-btn {
    background: #fff;
    color: #0b0b0b;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    padding: 9px 20px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }
  .primario {
    background: #2a78d6;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 9px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }
  .primario:disabled {
    background: #a9c6ea;
    cursor: not-allowed;
  }
</style>
