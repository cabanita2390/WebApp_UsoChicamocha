<script>
  /**
   * Panel único de filtros del Cronograma (estilo Airbnb): se elige todo en un borrador y se
   * aplica con "Mostrar N citas". Cerrar sin aplicar no cambia nada.
   */
  import { createEventDispatcher, onMount } from "svelte";
  import { DISCIPLINAS, MESES, TIPOS_ESTACION } from "../../../../config/subestaciones.js";
  import { ESTADOS_CITA, estadoVisible, filtrarCitas, filtrosVacios } from "../../../../utils/cronograma.js";

  export let filtros;
  /** "act" = celdas con nombres · "count" = solo cantidad */
  export let vista = "act";
  /** Citas del año de las estaciones activas (sin filtrar). */
  export let citas = [];
  export let anio;
  export let hoy;
  export let estaciones = [];
  export let actividades = [];
  export let estacionesPorId;

  const dispatch = createEventDispatcher();

  // Copia de trabajo: nada se aplica hasta "Mostrar N citas".
  let b = { ...filtros };
  let celdas = vista;
  let buscarEstacion = "";
  let buscarActividad = "";
  let panel;

  onMount(() => panel?.focus());

  const conteo = (pred) => citas.filter(pred).length;
  const conmutar = (campo, v) => {
    b = { ...b, [campo]: b[campo].includes(v) ? b[campo].filter((x) => x !== v) : [...b[campo], v] };
  };
  const poner = (campo, valores) => (b = { ...b, [campo]: valores });

  $: total = filtrarCitas(citas, { anio, hoy, filtros: b, estacionesPorId }).length;
  $: porEstado = Object.fromEntries(ESTADOS_CITA.map((e) => [e.value, conteo((c) => estadoVisible(c, anio, hoy) === e.value)]));
  $: estadosVisibles = ESTADOS_CITA.filter((e) => e.value !== "new" || porEstado.new);
  // La búsqueda no distingue tildes ni mayúsculas ("electrico" encuentra "Eléctrico").
  const normal = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const coincide = (nombre, q) => !q || normal(nombre).includes(normal(q));
  $: estacionesLista = estaciones.filter((s) => coincide(s.nombre, buscarEstacion));
  $: gruposActividad = DISCIPLINAS.map((d) => ({
    ...d,
    items: actividades.filter((a) => a.disciplina === d.value && (!b.disciplinas.length || b.disciplinas.includes(d.value)) && coincide(a.nombre, buscarActividad)),
  })).filter((g) => g.items.length);

  // Atajos de meses: relativos al mes actual del servidor (en otro año, el año completo).
  $: esteAnio = anio === hoy.anioActual;
  $: trimestre = Math.ceil(hoy.mesActual / 3);
  $: atajos = [
    ...(esteAnio
      ? [
          ["Mes actual", [hoy.mesActual]],
          ["Trimestre actual", [1, 2, 3].map((i) => (trimestre - 1) * 3 + i)],
          ["Lo que queda del año", MESES.map((_, i) => i + 1).filter((m) => m >= hoy.mesActual)],
        ]
      : []),
    ["Todo el año", []],
  ];
  const igual = (x, y) => x.length === y.length && x.every((v) => y.includes(v));

  function limpiar() {
    b = filtrosVacios();
    celdas = "act";
    buscarEstacion = "";
    buscarActividad = "";
  }

  function aplicar() {
    dispatch("aplicar", { filtros: b, vista: celdas });
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      dispatch("close");
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sub-overlay" on:click|self={() => dispatch("close")}>
  <div class="panel" role="dialog" aria-modal="true" aria-label="Filtros" tabindex="-1" bind:this={panel}>
    <div class="cab">
      <button class="x" aria-label="Cerrar" on:click={() => dispatch("close")}>✕</button>
      <span class="t">Filtros</span>
      <span></span>
    </div>

    <div class="cuerpo">
      <section>
        <h3>Disciplina</h3>
        <div class="pills">
          {#each DISCIPLINAS as d}
            <button class="pill" class:on={b.disciplinas.includes(d.value)} aria-pressed={b.disciplinas.includes(d.value)}
              on:click={() => conmutar("disciplinas", d.value)}>
              {d.label} <span class="n">{conteo((c) => c.disciplina === d.value)}</span>
            </button>
          {/each}
        </div>
      </section>

      <section>
        <h3>Estado de la cita</h3>
        <div class="estados">
          {#each estadosVisibles as e}
            <button class="estado" class:on={b.estados.includes(e.value)} aria-pressed={b.estados.includes(e.value)}
              on:click={() => conmutar("estados", e.value)}>
              <span class="g" style="background:{e.bg};border:{e.bd};color:{e.c}">{e.g}</span>
              <span class="el">{e.l}</span>
              <span class="ea">{e.ayuda}</span>
              <span class="en">{porEstado[e.value]}</span>
            </button>
          {/each}
        </div>
      </section>

      <section>
        <h3>Meses</h3>
        <p class="ayuda">Los meses que no elija se ocultan de la grilla y los demás ganan espacio.</p>
        <div class="atajos">
          {#each atajos as [l, ms]}
            <button class="lnk" class:on={igual(b.meses, ms)} on:click={() => poner("meses", ms)}>{l}</button>
          {/each}
        </div>
        <div class="meses">
          {#each MESES as l, i}
            <button class="pill" class:on={b.meses.includes(i + 1)} aria-pressed={b.meses.includes(i + 1)}
              on:click={() => conmutar("meses", i + 1)}>{l}</button>
          {/each}
        </div>
      </section>

      <section>
        <h3>Tipo de estación</h3>
        <div class="pills">
          {#each TIPOS_ESTACION as t}
            <button class="pill" class:on={b.tipos.includes(t.value)} aria-pressed={b.tipos.includes(t.value)}
              on:click={() => conmutar("tipos", t.value)}>{t.label}</button>
          {/each}
        </div>
      </section>

      <section>
        <h3>Estaciones {#if b.estacionIds.length}<span class="cuenta">· {b.estacionIds.length} elegidas</span>{/if}</h3>
        <input class="buscar" bind:value={buscarEstacion} placeholder="Buscar estación…" aria-label="Buscar estación" />
        <div class="lista">
          {#each estacionesLista as s (s.id)}
            <label class="check">
              <input type="checkbox" checked={b.estacionIds.includes(s.id)} on:change={() => conmutar("estacionIds", s.id)} />
              <span>{s.nombre}</span>
            </label>
          {:else}
            <span class="ayuda">Ninguna estación coincide.</span>
          {/each}
        </div>
      </section>

      <section>
        <h3>Actividades {#if b.actividadIds.length}<span class="cuenta">· {b.actividadIds.length} elegidas</span>{/if}</h3>
        <input class="buscar" bind:value={buscarActividad} placeholder="Buscar actividad…" aria-label="Buscar actividad" />
        {#each gruposActividad as g (g.value)}
          <div class="grupo">{g.label}</div>
          <div class="lista">
            {#each g.items as a (a.id)}
              <label class="check">
                <input type="checkbox" checked={b.actividadIds.includes(a.id)} on:change={() => conmutar("actividadIds", a.id)} />
                <span>{a.nombre}</span>
              </label>
            {/each}
          </div>
        {:else}
          <span class="ayuda">Ninguna actividad coincide.</span>
        {/each}
      </section>

      <section>
        <h3>Cómo se ven las celdas</h3>
        <div class="pills">
          <button class="pill" class:on={celdas === "act"} on:click={() => (celdas = "act")}>Con nombres</button>
          <button class="pill" class:on={celdas === "count"} on:click={() => (celdas = "count")}>Solo cantidad</button>
        </div>
      </section>
    </div>

    <div class="pie">
      <button class="limpiar" on:click={limpiar}>Limpiar todo</button>
      <button class="sub-btn-primary mostrar" disabled={!total} on:click={aplicar}>
        {total ? `Mostrar ${total} ${total === 1 ? "cita" : "citas"}` : "Ninguna cita coincide"}
      </button>
    </div>
  </div>
</div>

<style>
  .panel {
    width: 720px;
    max-width: 100%;
    max-height: min(860px, calc(100vh - 40px));
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(11, 11, 11, 0.18);
    outline: none;
    color: #0b0b0b;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .cab {
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .t {
    text-align: center;
    font-size: 15px;
    font-weight: 650;
  }
  .x {
    all: unset;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 14px;
  }
  .x:hover {
    background: #f0f0ee;
  }
  .cuerpo {
    overflow-y: auto;
    padding: 4px 24px;
  }
  section {
    padding: 20px 0;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  section:last-child {
    border-bottom: 0;
  }
  h3 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 650;
  }
  .cuenta {
    font-weight: 500;
    color: #52514e;
    font-size: 13px;
  }
  .ayuda {
    margin: -6px 0 10px;
    font-size: 12.5px;
    color: #898781;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    background: #fff;
    color: #0b0b0b;
    font-size: 13px;
    cursor: pointer;
  }
  .pill:hover {
    border-color: #0b0b0b;
  }
  .pill.on {
    background: #0b0b0b;
    border-color: #0b0b0b;
    color: #fff;
  }
  .pill .n {
    font-size: 11.5px;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }
  .estados {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
    gap: 8px;
  }
  .estado {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: "g n" "l l" "a a";
    gap: 4px 8px;
    align-items: center;
    text-align: left;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(11, 11, 11, 0.14);
    background: #fff;
    cursor: pointer;
    color: #0b0b0b;
  }
  .estado:hover {
    border-color: #0b0b0b;
  }
  .estado.on {
    border: 2px solid #0b0b0b;
    padding: 11px;
    background: #fafaf9;
  }
  .estado .g {
    grid-area: g;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
    box-sizing: border-box;
  }
  .en {
    grid-area: n;
    justify-self: end;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .el {
    grid-area: l;
    font-size: 13px;
    font-weight: 600;
  }
  .ea {
    grid-area: a;
    font-size: 11.5px;
    color: #898781;
  }
  .atajos {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-bottom: 10px;
  }
  .lnk {
    all: unset;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #1f5fae;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: transparent;
  }
  .lnk:hover,
  .lnk.on {
    text-decoration-color: currentColor;
  }
  .meses {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }
  .meses .pill {
    justify-content: center;
    padding: 8px 0;
  }
  .buscar {
    width: 100%;
    height: 36px;
    padding: 0 12px;
    margin-bottom: 10px;
    border: 1px solid rgba(11, 11, 11, 0.16);
    border-radius: 8px;
    font-size: 13px;
    box-sizing: border-box;
  }
  .lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 2px 12px;
    max-height: 210px;
    overflow-y: auto;
  }
  .grupo {
    margin: 10px 0 6px;
    font-size: 11.5px;
    font-weight: 650;
    color: #898781;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .check {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    font-size: 13px;
    cursor: pointer;
  }
  .check input {
    margin-top: 2px;
    accent-color: #0b0b0b;
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .limpiar {
    all: unset;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .mostrar {
    padding: 11px 22px;
    font-size: 14px;
  }
  @media (max-width: 560px) {
    .meses {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
