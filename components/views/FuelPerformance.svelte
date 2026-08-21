<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { fuelDateRange, resetFuelDateRange } from "../../stores/fuelFilters.js";
  import Loader from "../shared/Loader.svelte";
  import AssetFuelConfigManagement from "./AssetFuelConfigManagement.svelte";
  import { formatCantidad } from "../../config/table-definitions/helpers.js";

  // Alto del sparkline de cada tarjeta (viewBox y CSS van de la mano — ver
  // buildSparkline y .fuel-card-spark). Antes 46px, muy chico para leer la
  // línea proyectado/real; con tarjetas más anchas (mínimo 4 por fila en
  // pantalla completa, ver .fuel-cards-grid) hay espacio de sobra para que la
  // gráfica se vea mejor.
  const SPARK_H = 76;

  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  let mostrarConfig = false;

  let tipo = "MAQUINARIA";
  let q = "";
  let filtro = "TODOS"; // TODOS | ALERTA | DESV

  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelAssetConfig = $data.fuelAssetConfig ?? [];
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  // El reporte no trae la unidad directamente — se obtiene cruzando con la config
  // de rendimiento del activo (fuelTypeDefaultId), que sí sabe qué combustible usa.
  $: unidadPorVehicleId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.vehicleId != null).map((c) => [c.vehicleId, unidadMedidaById[c.fuelTypeDefaultId]])
  );
  $: unidadPorMachineId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.machineId != null).map((c) => [c.machineId, unidadMedidaById[c.fuelTypeDefaultId]])
  );

  function unidadDe(row) {
    const unidad = row.machineId != null ? unidadPorMachineId[row.machineId] : unidadPorVehicleId[row.vehicleId];
    return unidad === "M3" ? "m³" : "gal";
  }

  function claveActivo(row) {
    return row.machineId != null ? `M-${row.machineId}` : `V-${row.vehicleId}`;
  }

  // ---- Inventario completo (independiente de si tanquearon o no) ----
  // GET /vehicle trae motos también (viven en la misma tabla) — se filtran acá,
  // mismo criterio que AssetFuelConfigManagement.svelte.
  $: machines = $data.machines ?? [];
  $: vehicles = ($data.vehicles ?? []).filter((v) => (v.tipoVehiculo ?? "").toUpperCase() !== "MOTOCICLETA");
  $: motos = $data.motos ?? [];

  function labelVehicular(v) {
    return `${v.placa}${v.marca ? " — " + v.marca : ""}`;
  }
  function inventarioDe(tipoSel) {
    if (tipoSel === "MAQUINARIA") {
      return machines.map((m) => ({ key: `M-${m.id}`, machineId: m.id, vehicleId: null, nombreInventario: `${m.name}${m.brand ? " — " + m.brand : ""}` }));
    }
    const lista = tipoSel === "MOTOCICLETA" ? motos : vehicles;
    return lista.map((v) => ({ key: `V-${v.id}`, machineId: null, vehicleId: v.id, nombreInventario: labelVehicular(v) }));
  }
  $: universoTipo = inventarioDe(tipo);
  $: totalInventario = { MAQUINARIA: machines.length, VEHICULO: vehicles.length, MOTOCICLETA: motos.length };

  $: fuelAssetConfigPorClave = Object.fromEntries(
    fuelAssetConfig.map((c) => [c.machineId != null ? `M-${c.machineId}` : `V-${c.vehicleId}`, c])
  );

  // Los 3 tipos se piden siempre juntos (fetchFuelPerformanceAllTipos) — cambiar
  // de pill es solo una lectura local, sin fetch, así que ya no puede "no cargar"
  // por una respuesta vieja que resuelve tarde.
  $: rowsPorTipo = $data.fuelPerformance ?? { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] };
  $: rows = rowsPorTipo[tipo] ?? [];
  // Colapsa a 1 registro por activo = su tanqueo más reciente en el rango
  // filtrado (mismo patrón que la tabla resumen de Tanqueo y Distribución) — "Ver
  // historial" (click en la tarjeta) abre la evolución completa en una pantalla aparte.
  $: resumenPorActivo = Object.values(
    rows.reduce((acc, row) => {
      const key = claveActivo(row);
      if (!acc[key] || new Date(row.fechaRegistro) > new Date(acc[key].fechaRegistro)) {
        acc[key] = row;
      }
      return acc;
    }, {})
  );
  $: resumenPorClave = Object.fromEntries(resumenPorActivo.map((r) => [claveActivo(r), r]));
  // Cuántos tanqueos del rango filtrado tiene cada activo (la tarjeta solo muestra
  // el más reciente, pero el conteo es sobre todos los que matchean el filtro).
  $: registrosPorActivo = rows.reduce((acc, row) => {
    const key = claveActivo(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Universo = inventario completo del tipo, con o sin tanqueos en el rango — un
  // activo sin tanqueos este periodo sigue siendo visible (antes desaparecía del
  // todo, porque el reporte de rendimiento solo trae filas con datos). Se une
  // además cualquier fila con datos que por algún motivo no matchee el inventario
  // cargado (ej. iba a filtrarse pero el fetch de inventario aún no resolvió) —
  // defensivo, para no perder datos reales por una carrera de fetches.
  $: clavesInventario = new Set(universoTipo.map((u) => u.key));
  $: extrasSinInventario = resumenPorActivo
    .filter((r) => !clavesInventario.has(claveActivo(r)))
    .map((r) => ({ key: claveActivo(r), machineId: r.machineId, vehicleId: r.vehicleId, nombreInventario: r.identificacionActivo }));
  $: universoCompleto = [...universoTipo, ...extrasSinInventario].map((u) => ({
    ...u,
    row: resumenPorClave[u.key] ?? null,
    config: fuelAssetConfigPorClave[u.key] ?? null,
  }));
  // Los que sí tanquearon en el rango van primero (más reciente arriba, igual que
  // antes); los "sin tanqueos"/"sin configurar" quedan al final, ordenados por
  // nombre — no compiten por atención con lo accionable, pero siguen visibles.
  $: universoOrdenado = [...universoCompleto].sort((a, b) => {
    if (!!a.row !== !!b.row) return a.row ? -1 : 1;
    if (a.row && b.row) return new Date(b.row.fechaRegistro) - new Date(a.row.fechaRegistro);
    return (a.nombreInventario ?? "").localeCompare(b.nombreInventario ?? "", "es");
  });

  // ---- Modelo de rendimiento (mismo que la tabla de detalle, ver
  // createFuelPerformanceColumns en config/table-definitions/fuel.js) ----
  // H (esperado) = galones tanqueados × consumo estándar (ya viene en horas u
  // horas/gal o km/gal según el activo). D (ejecutado) ya viene calculado del
  // backend. Reemplaza la vieja comparación de galones proyectados/reales, que
  // no aportaba nada legible.
  function esperadoDe(row) {
    return (Number(row.galonesReal) || 0) * (Number(row.consumoEstandar) || 0);
  }
  function diferenciaHorasKm(row) {
    if (!row) return 0;
    return (Number(row.ejecutado) || 0) - esperadoDe(row);
  }
  function unidadEjecDe(tipoSel) {
    return tipoSel === "MAQUINARIA" ? "h" : "km";
  }

  $: qLower = q.trim().toLowerCase();
  $: universoBuscado = universoOrdenado.filter((u) => {
    if (!qLower) return true;
    const nombre = (u.row?.identificacionActivo ?? u.nombreInventario ?? "").toLowerCase();
    const combustibleId = u.row?.fuelTypeId ?? u.config?.fuelTypeDefaultId;
    const combustible = (fuelTypesById[combustibleId] ?? "").toLowerCase();
    return nombre.includes(qLower) || combustible.includes(qLower);
  });
  $: universoFiltrado =
    filtro === "ALERTA"
      ? universoBuscado.filter((u) => u.row?.alerta)
      : filtro === "DESV"
        ? [...universoBuscado].sort((a, b) => Math.abs(diferenciaHorasKm(b.row)) - Math.abs(diferenciaHorasKm(a.row)))
        : universoBuscado;

  // ---- Sparkline por tarjeta: ventana fija de 90 días, independiente del filtro
  // de fecha de arriba (ver fetchFuelPerformanceTrend) — así la tendencia no
  // desaparece solo porque el usuario acotó el rango para las métricas principales.
  $: fuelPerformanceTrend = $data.fuelPerformanceTrend ?? { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] };
  $: trendRowsPorActivo = (fuelPerformanceTrend[tipo] ?? []).reduce((acc, r) => {
    const key = claveActivo(r);
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  function buildSparkline(porActivo, key) {
    const arr = (porActivo[key] ?? [])
      .slice()
      .sort((a, b) => new Date(a.fechaRegistro) - new Date(b.fechaRegistro))
      .slice(-10);
    if (arr.length < 2) return null;
    // H (esperado) vs D (ejecutado) — mismo modelo que la tabla de detalle, ver
    // esperadoDe. Reemplaza el viejo proyectado/real en galones.
    const esperadoVals = arr.map((r) => esperadoDe(r));
    const ejecutadoVals = arr.map((r) => Number(r.ejecutado) || 0);
    const max = Math.max(...esperadoVals, ...ejecutadoVals) || 1;
    const step = 200 / (arr.length - 1);
    // Alto del viewBox del sparkline — ver SPARK_H/.fuel-card-spark (tarjetas más
    // grandes, 4 por fila en pantalla completa, con espacio para que la gráfica
    // se lea mejor).
    const y = (v) => SPARK_H - 6 - (v / max) * (SPARK_H - 14);
    const esperado = esperadoVals.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const ejecutado = ejecutadoVals.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `0,${SPARK_H - 6} ${ejecutado} ${((arr.length - 1) * step).toFixed(1)},${SPARK_H - 6}`;
    return { esperado, ejecutado, area };
  }

  function formatFechaCorta(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const fmt2 = (n) => new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

  $: tarjetas = universoFiltrado.map((u) => {
    const row = u.row;
    const spark = buildSparkline(trendRowsPorActivo, u.key);
    if (row) {
      const dif = diferenciaHorasKm(row);
      const unidadEjec = unidadEjecDe(tipo);
      return {
        key: u.key,
        row,
        nombre: row.identificacionActivo ?? u.nombreInventario ?? "—",
        combustible: fuelTypesById[row.fuelTypeId] ?? "—",
        estado: row.alerta ? "alerta" : "en-rango",
        estadoLabel: row.alerta ? "Alerta" : "En rango",
        ultimoReal: `${formatCantidad(row.galonesReal)} ${unidadDe(row)}`,
        difLabel: `${dif >= 0 ? "+" : "−"}${fmt2(dif)} ${unidadEjec}`,
        registros: registrosPorActivo[u.key] ?? 1,
        ultimaFecha: formatFechaCorta(row.fechaRegistro),
        footLabel: `${registrosPorActivo[u.key] ?? 1} registros · últ. ${formatFechaCorta(row.fechaRegistro)}`,
        spark,
      };
    }
    // Sin tanqueos en el rango filtrado — sigue siendo un activo real del
    // inventario, se muestra igual (con o sin config) en vez de desaparecer.
    const configurado = !!u.config;
    return {
      key: u.key,
      row: { machineId: u.machineId, vehicleId: u.vehicleId },
      nombre: u.nombreInventario ?? "—",
      combustible: configurado ? (fuelTypesById[u.config.fuelTypeDefaultId] ?? "—") : "Sin configurar",
      estado: configurado ? "sin-tanqueo" : "sin-configurar",
      estadoLabel: configurado ? "Sin tanqueos" : "Sin configurar",
      ultimoReal: "—",
      difLabel: "—",
      registros: 0,
      ultimaFecha: "—",
      footLabel: configurado ? "Sin tanqueos en este periodo" : "Sin consumo estándar configurado",
      spark,
    };
  });

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
    data.fetchFuelPerformanceAllTipos($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    data.fetchFuelPerformanceTrend();
    data.fetchMachines();
    data.fetchVehicles();
    data.fetchMotos();
  });

  function handleFiltrar() {
    data.fetchFuelPerformanceAllTipos($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function handleLimpiarFiltro() {
    resetFuelDateRange();
    handleFiltrar();
  }

  function seleccionarTipo(nuevoTipo) {
    tipo = nuevoTipo;
    q = "";
  }

  // "Ver historial" — la evolución completa del activo (todas sus fechas, no solo
  // el rango filtrado acá), con tabla + gráfico real vs. proyectado.
  function abrirHistorialRendimiento(row) {
    const idActivo = row.machineId ?? row.vehicleId;
    push(`/fuel-performance-history/${tipo}/${idActivo}`);
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros-grid">
    <div class="filtros-fechas">
      <label class="field" for="perfFechaInicio">
        <span class="field-lab">Fecha inicio</span>
        <input id="perfFechaInicio" type="date" bind:value={$fuelDateRange.fechaInicio} />
      </label>
      <label class="field" for="perfFechaFin">
        <span class="field-lab">Fecha fin</span>
        <input id="perfFechaFin" type="date" bind:value={$fuelDateRange.fechaFin} />
      </label>
      <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
      <button type="button" class="btn-clear-filter" on:click={handleLimpiarFiltro}>Limpiar filtro</button>
    </div>

    <div class="tipo-selector-center">
      <div class="tipo-selector">
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MAQUINARIA"} on:click={() => seleccionarTipo("MAQUINARIA")}>
          Maquinaria <span class="tipo-pill-count">{totalInventario.MAQUINARIA}</span>
        </button>
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "VEHICULO"} on:click={() => seleccionarTipo("VEHICULO")}>
          Vehículos <span class="tipo-pill-count">{totalInventario.VEHICULO}</span>
        </button>
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MOTOCICLETA"} on:click={() => seleccionarTipo("MOTOCICLETA")}>
          Motocicletas <span class="tipo-pill-count">{totalInventario.MOTOCICLETA}</span>
        </button>
      </div>
    </div>

    <div class="config-btn-wrap">
      {#if isAdmin}
        <button type="button" class="btn-filter btn-config" on:click={() => (mostrarConfig = !mostrarConfig)}>
          {mostrarConfig ? "Ocultar configuración" : "Configurar consumo estándar"}
        </button>
      {/if}
    </div>
  </div>

  {#if isAdmin && mostrarConfig}
    <AssetFuelConfigManagement on:close={() => (mostrarConfig = false)} />
  {/if}

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="fuel-toolbar">
      <div class="fuel-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#898781" stroke-width="2" class="fuel-search-icon">
          <circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.5-4.5"></path>
        </svg>
        <input type="text" bind:value={q} placeholder="Buscar activo por nombre o combustible..." />
      </div>
      <div class="fuel-chips">
        <button type="button" class="chip-mini" class:chip-mini--active={filtro === "TODOS"} on:click={() => (filtro = "TODOS")}>Todos</button>
        <button type="button" class="chip-mini" class:chip-mini--active={filtro === "ALERTA"} on:click={() => (filtro = "ALERTA")}>Con alerta</button>
        <button type="button" class="chip-mini" class:chip-mini--active={filtro === "DESV"} on:click={() => (filtro = "DESV")}>Mayor desviación</button>
      </div>
      <div class="fuel-toolbar-spacer"></div>
      <div class="fuel-conteo">Mostrando {tarjetas.length} de {universoCompleto.length} activos</div>
    </div>

    {#if tarjetas.length}
      <div class="fuel-cards-grid">
        {#each tarjetas as t (t.key)}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="fuel-card"
            class:fuel-card--alerta={t.estado === "alerta"}
            class:fuel-card--sin-datos={t.estado === "sin-tanqueo" || t.estado === "sin-configurar"}
            role="button"
            tabindex="0"
            on:click={() => abrirHistorialRendimiento(t.row)}
          >
            <div class="fuel-card-head">
              <div>
                <div class="fuel-card-nombre">{t.nombre}</div>
                <div class="fuel-card-sub">{t.combustible}</div>
              </div>
              <span
                class="fuel-card-estado"
                class:fuel-card-estado--alerta={t.estado === "alerta"}
                class:fuel-card-estado--neutro={t.estado === "sin-tanqueo" || t.estado === "sin-configurar"}
              >
                {t.estadoLabel}
              </span>
            </div>

            <svg width="100%" height={SPARK_H} viewBox="0 0 200 {SPARK_H}" preserveAspectRatio="none" class="fuel-card-spark">
              {#if t.spark}
                <polygon points={t.spark.area} fill="#eb6834" opacity=".1"></polygon>
                <polyline points={t.spark.esperado} fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round"></polyline>
                <polyline points={t.spark.ejecutado} fill="none" stroke="#eb6834" stroke-width="2.2" stroke-linejoin="round"></polyline>
              {/if}
            </svg>

            <div class="fuel-card-metrics">
              <div>
                <div class="fuel-card-metric-lab">Último real</div>
                <div class="fuel-card-metric-val">{t.ultimoReal}</div>
              </div>
              <div class="fuel-card-metric-right">
                <div class="fuel-card-metric-lab">Diferencia</div>
                <div
                  class="fuel-card-dif"
                  class:fuel-card-dif--alerta={t.estado === "alerta"}
                  class:fuel-card-dif--neutro={t.estado === "sin-tanqueo" || t.estado === "sin-configurar"}
                >
                  {t.difLabel}
                </div>
              </div>
            </div>
            <div class="fuel-card-foot">{t.footLabel}</div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="fuel-empty">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#c7c6c2" stroke-width="1.6"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.5-4.5"></path></svg>
        <div class="fuel-empty-title">Ningún activo coincide con la búsqueda.</div>
        <div class="fuel-empty-sub">Prueba con otro nombre, combustible o quita el filtro.</div>
      </div>
    {/if}
  {/if}
</div>

<style>
.fuel-filtros-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 8px 16px;
      align-items: end;
      margin-bottom: 4px;
      width: 100%;
    }
    .filtros-fechas {
      display: flex;
      gap: 12px;
      align-items: end;
    }
    .tipo-selector-center {
      display: flex;
      justify-content: center;
      align-items: end;
    }
    .tipo-selector {
      display: flex;
      gap: 6px;
    }
    .config-btn-wrap {
      display: flex;
      justify-content: flex-end;
      align-items: end;
    }
    @media (max-width: 700px) {
      .fuel-filtros-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
        gap: 12px 0;
      }
      .filtros-fechas,
      .tipo-selector-center,
      .config-btn-wrap {
        justify-content: flex-start;
      }
      .tipo-selector-center {
        justify-content: center;
      }
      .config-btn-wrap {
        justify-content: flex-end;
      }
    }

  .fuel-dashboard {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --row-border: rgba(11, 11, 11, 0.453);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    /* overflow-y sin overflow-x explícito hace que el navegador calcule
       overflow-x en automático también (spec de CSS) — se fija en "hidden"
       para que esta caja nunca scrollee horizontal (ver mismo ajuste en
       FuelPerformanceHistory.svelte, donde sí se veía con una tabla ancha). */
    overflow-x: hidden;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .field input {
    font-family: inherit;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    background: var(--surface);
    color: var(--ink);
  }
  .btn-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-clear-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #fff;
    color: #52514e;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
  }
  .btn-clear-filter:hover {
    background: #f5f6f8;
  }
  .btn-config {
    background: #52514e;
    margin-left: auto;
  }
  .btn-config:hover {
    background: #3d3c3a;
  }
  .tipo-selector {
    display: flex;
    gap: 8px;
    align-self: center;
  }
  .tipo-pill {
    font-family: inherit;
    background: rgba(42, 120, 214, 0.1);
    color: #2a78d6;
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 12px;
    cursor: pointer;
  }
  .tipo-pill-count {
    opacity: 0.65;
  }
  .tipo-pill--active {
    background: #2a78d6;
    color: #fff;
    font-weight: 600;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  /* ---- Toolbar: buscador + chips de filtro ---- */
  .fuel-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fuel-search {
    position: relative;
    flex: 1;
    min-width: 240px;
    max-width: 380px;
  }
  .fuel-search-icon {
    position: absolute;
    left: 12px;
    top: 10px;
  }
  .fuel-search input {
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 13px;
    padding: 9px 14px 9px 34px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
  }
  .fuel-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .chip-mini {
    font-family: inherit;
    border: 1px solid rgba(11, 11, 11, 0.1);
    background: #fff;
    color: var(--ink-muted);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .chip-mini--active {
    border: none;
    background: rgba(42, 120, 214, 0.14);
    color: #2a78d6;
  }
  .fuel-toolbar-spacer {
    flex: 1;
  }
  .fuel-conteo {
    font-size: 11px;
    color: var(--ink-muted);
    white-space: nowrap;
  }

  /* ---- Grilla de tarjetas ---- */
  /* Columnas fijas (no auto-fill/minmax): un tope de 4 en pantalla completa hace
     que cada tarjeta ocupe 1/4 del ancho disponible y crezca con la ventana
     (más grande, gráfica más legible), en vez de agregar una 5ª/6ª columna
     angosta en monitores anchos. Menos columnas en pantallas chicas, siempre
     ocupando el ancho completo. */
  .fuel-cards-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 16px;
  }
  @media (min-width: 640px) {
    .fuel-cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1000px) {
    .fuel-cards-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 1300px) {
    .fuel-cards-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .fuel-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px 20px;
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: transform 0.16s, box-shadow 0.16s, border-color 0.16s;
  }
  .fuel-card:hover {
    border-color: #2a78d6;
    box-shadow: 0 4px 10px rgba(11, 11, 11, 0.08), 0 16px 32px rgba(11, 11, 11, 0.1);
    transform: translateY(-2px);
  }
  .fuel-card--alerta {
    border-color: rgba(208, 59, 59, 0.28);
  }
  /* Activo del inventario sin tanqueos en el rango (o sin configurar del todo) —
     misma tarjeta, tono apagado para distinguirla a simple vista de las que sí
     tienen datos, sin ser tan llamativa como "Alerta". */
  .fuel-card--sin-datos {
    opacity: 0.72;
  }
  .fuel-card--sin-datos:hover {
    opacity: 1;
  }
  .fuel-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .fuel-card-nombre {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.005em;
    color: var(--ink);
  }
  .fuel-card-sub {
    font-size: 11px;
    color: var(--ink-muted);
    margin-top: 3px;
  }
  .fuel-card-estado {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    color: #006300;
    background: rgba(0, 99, 0, 0.1);
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .fuel-card-estado--alerta {
    color: #d03b3b;
    background: rgba(208, 59, 59, 0.1);
  }
  .fuel-card-estado--neutro {
    color: var(--ink-muted);
    background: rgba(11, 11, 11, 0.06);
  }
  .fuel-card-spark {
    display: block;
    margin: 14px 0 6px;
    overflow: visible;
  }
  .fuel-card-metrics {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid #f0f0ef;
  }
  .fuel-card-metric-right {
    text-align: right;
  }
  .fuel-card-metric-lab {
    font-size: 10px;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }
  .fuel-card-metric-val {
    font-size: 17px;
    font-weight: 700;
    margin-top: 2px;
    color: var(--ink);
  }
  .fuel-card-dif {
    font-size: 13px;
    font-weight: 700;
    margin-top: 2px;
    color: #006300;
  }
  .fuel-card-dif--alerta {
    color: #d03b3b;
  }
  .fuel-card-dif--neutro {
    color: var(--ink-muted);
  }
  .fuel-card-foot {
    font-size: 10px;
    color: var(--ink-muted);
    margin-top: 10px;
  }

  /* ---- Vacío ---- */
  .fuel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
    padding: 56px 0;
  }
  .fuel-empty-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-secondary);
  }
  .fuel-empty-sub {
    font-size: 11px;
    color: var(--ink-muted);
  }
</style>
