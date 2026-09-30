<script>
  import { substationAdmin } from "../../../../stores/substationAdmin.js";
  import { detalleEstacionId } from "../../../../stores/subestacionesFilters.js";
  import { tipoLabel } from "../../../../config/subestaciones.js";
  import { pctBadge } from "../../../../utils/cronograma.js";
  import Loader from "../../../shared/Loader.svelte";
  import SubToast from "../SubToast.svelte";
  import ErrorCarga from "../ErrorCarga.svelte";
  import DetalleEstacion from "./DetalleEstacion.svelte";

  let filas = [];
  let cargando = true;
  let errorCarga = "";
  // Sin códigos de estación (P1/D3).
  const cols = "minmax(0,2fr) 140px 110px 110px 150px";

  async function cargar() {
    cargando = true;
    errorCarga = "";
    try {
      filas = (await substationAdmin.indicadoresPorEstacion()).map((i) => {
        const pct = i.porcentajeCumplimiento != null ? Math.round(Number(i.porcentajeCumplimiento)) : null;
        return { ...i, pct, pc: pct != null ? pctBadge(pct) : null };
      });
    } catch (e) {
      errorCarga = e.message;
    } finally {
      cargando = false;
    }
  }
  cargar();
</script>

<div class="sub-mod">
  {#if $detalleEstacionId != null}
    {#key $detalleEstacionId}
      <DetalleEstacion estacionId={$detalleEstacionId} on:volver={() => detalleEstacionId.set(null)} />
    {/key}
  {:else if cargando}
    <div class="cargando"><Loader /></div>
  {:else if errorCarga}
    <ErrorCarga que="el dashboard" mensaje={errorCarga} on:reintentar={cargar} />
  {:else}
    <div class="sub-card scroll-x">
      <div class="sub-th" style="grid-template-columns:{cols}">
        <span>Estación</span><span>Tipo</span><span>Programadas</span><span>Ejecutadas</span><span>Cumplimiento</span>
      </div>
      {#each filas as s (s.estacionId)}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="sub-tr clickable" style="grid-template-columns:{cols}" role="button" tabindex="0"
          title="Ver detalle de estación" on:click={() => detalleEstacionId.set(s.estacionId)}
          on:keydown={(e) => e.key === "Enter" && detalleEstacionId.set(s.estacionId)}>
          <span>{s.estacionNombre}</span>
          <span class="gris">{tipoLabel(s.estacionTipo)}</span>
          <span>{s.programado}</span>
          <span>{s.ejecutadasVencidas}</span>
          <span>
            {#if s.pc}
              <span class="sub-badge" style="color:{s.pc.c};background:{s.pc.bg}">{s.pc.g} {s.pct}%</span>
            {:else}
              <span class="sub-badge neu" title="Sin citas vencidas">—</span>
            {/if}
          </span>
        </div>
      {:else}
        <div class="sub-empty">Sin estaciones activas.</div>
      {/each}
    </div>
  {/if}
  <SubToast />
</div>

<style>
  .cargando {
    display: flex;
    justify-content: center;
    padding: 48px;
  }
  .scroll-x {
    overflow-x: auto;
  }
  .sub-th,
  .sub-tr {
    min-width: 820px;
  }
  .gris {
    color: #52514e;
  }
</style>
