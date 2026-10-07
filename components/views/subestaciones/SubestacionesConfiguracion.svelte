<script>
  import { push } from "svelte-spa-router";
  import { auth } from "../../../stores/auth.js";
  import { substationAdmin } from "../../../stores/substationAdmin.js";
  import { flash } from "../../../stores/subestacionesToast.js";
  import {
    configuracionTab,
    cronogramaAnioInicial,
    subestacionesActiveTab,
  } from "../../../stores/subestacionesFilters.js";
  import Loader from "../../shared/Loader.svelte";
  import SubToast from "./SubToast.svelte";
  import ErrorCarga from "./ErrorCarga.svelte";
  import EstacionesTabla from "./config/EstacionesTabla.svelte";
  import ActividadesTabla from "./config/ActividadesTabla.svelte";
  import ProgramacionPanel from "./config/ProgramacionPanel.svelte";
  import CatalogoModal from "./config/CatalogoModal.svelte";

  const TABS = [
    ["est", "Estaciones"],
    ["act", "Actividades"],
    ["prog", "Programación"],
  ];

  $: esAdmin = $auth?.currentUser?.role === "ADMIN";

  let cargando = true;
  let errorCarga = "";
  let estaciones = [];
  let actividades = [];
  let anioActual = new Date().getFullYear();
  let citasOrigen = 0;
  let citasDestino = 0;
  /** { tipo: "est" | "act", registro } | null */
  let modal = null;

  $: estacionesInactivas = estaciones.filter((e) => !e.activa).length;

  async function cargarCronogramas() {
    // "Año actual" lo decide el servidor (hora de Colombia): se pide con el año del
    // navegador y se corrige si difiere (ej. 31-dic por la noche).
    let actual = await substationAdmin.obtenerCronograma(anioActual);
    if (actual.anioActual !== anioActual) {
      anioActual = actual.anioActual;
      actual = await substationAdmin.obtenerCronograma(anioActual);
    }
    citasOrigen = actual.citas.filter((c) => c.estado === "PUBLICADA").length;
    const siguiente = await substationAdmin.obtenerCronograma(anioActual + 1);
    citasDestino = siguiente.citas.length;
  }

  async function cargar() {
    errorCarga = "";
    try {
      [estaciones, actividades] = await Promise.all([
        substationAdmin.listarEstaciones(),
        substationAdmin.listarActividades(),
        cargarCronogramas(),
      ]);
    } catch (e) {
      // Primera carga: pantalla de error con "Reintentar". Recarga tras guardar: se
      // conservan los datos y se avisa.
      if (cargando) errorCarga = e.message;
      else flash(e.message, { error: true });
    } finally {
      cargando = false;
    }
  }

  function reintentar() {
    cargando = true;
    cargar();
  }

  async function guardado() {
    modal = null;
    await cargar();
  }

  function irAlCronograma(anio) {
    cronogramaAnioInicial.set(anio);
    subestacionesActiveTab.set("cronograma");
    push("/subestaciones");
  }

  // Carga una sola vez, cuando se sabe que el usuario es ADMIN.
  let iniciado = false;
  $: if (esAdmin && !iniciado) {
    iniciado = true;
    cargar();
  }
</script>

<div class="sub-mod">
  {#if !esAdmin}
    <div class="sub-card denegado">
      <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#898781" stroke-width="1.4" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2"></path>
      </svg>
      <strong>Configuración disponible solo para ADMIN</strong>
      <span class="denegado-sub">Su rol actual permite consultar. Solicite acceso a un administrador.</span>
      <button class="sub-btn" on:click={() => push("/subestaciones")}>Volver a Consulta</button>
    </div>
  {:else}
    <div class="sub-head">
      <div class="sub-head-text">
        <h1 class="sub-title">Configuración de Estaciones de Bombeo</h1>
        <p class="sub-subtitle">Catálogos por disciplina. Los registros no se eliminan: se desactivan.</p>
      </div>
      <div class="sub-seg" role="tablist">
        {#each TABS as [id, label]}
          <button role="tab" aria-selected={$configuracionTab === id} class:on={$configuracionTab === id}
            on:click={() => configuracionTab.set(id)}>{label}</button>
        {/each}
      </div>
    </div>

    {#if cargando}
      <div class="cargando"><Loader /></div>
    {:else if errorCarga}
      <ErrorCarga que="la configuración" mensaje={errorCarga} on:reintentar={reintentar} />
    {:else if $configuracionTab === "est"}
      <EstacionesTabla {estaciones}
        on:nueva={() => (modal = { tipo: "est", registro: null })}
        on:editar={(e) => (modal = { tipo: "est", registro: e.detail })} />
    {:else if $configuracionTab === "act"}
      <ActividadesTabla {actividades} {anioActual}
        on:nueva={() => (modal = { tipo: "act", registro: null })}
        on:editar={(e) => (modal = { tipo: "act", registro: e.detail })} />
    {:else}
      <ProgramacionPanel {anioActual} {citasOrigen} {citasDestino} {estacionesInactivas}
        on:copiado={(e) => irAlCronograma(e.detail)}
        on:abrirCronograma={(e) => irAlCronograma(e.detail)} />
    {/if}

    {#if modal}
      {#key modal}
        <CatalogoModal tipo={modal.tipo} registro={modal.registro} on:close={() => (modal = null)} on:saved={guardado} />
      {/key}
    {/if}
  {/if}
  <SubToast />
</div>

<style>
  .denegado {
    padding: 48px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    box-shadow: none;
  }
  .denegado strong {
    font-size: 15px;
  }
  .denegado-sub {
    font-size: 13px;
    color: #52514e;
  }
  .denegado .sub-btn {
    margin-top: 8px;
    padding: 8px 18px;
  }
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
</style>
