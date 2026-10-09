<script>
  import { createEventDispatcher } from "svelte";
  import { DISCIPLINAS, MESES, MESES_LARGOS } from "../../../../config/subestaciones.js";
  import { PRESETS, mesesDePreset, mesCerrado, paresAsignacion } from "../../../../utils/cronograma.js";
  import { substationAdmin } from "../../../../stores/substationAdmin.js";

  export let anio;
  export let hoy;
  /** Actividades activas de todas las disciplinas. */
  export let actividades = [];
  /** Estaciones activas. */
  export let estaciones = [];
  /** Citas vigentes del año (publicadas y borrador) para contar duplicados. */
  export let citasVigentes = [];
  /** { modo?, disciplina, actividadId?, actividadIds?, estacionIds, meses } */
  export let inicial = {};

  const dispatch = createEventDispatcher();

  // Dos formas de llenar el cronograma, como se piensa en cada caso:
  //  - "actividad": una actividad → sus estaciones → meses (como la hoja CRONOGRAMA_POR_ESTACION del Excel).
  //  - "estacion": una o varias estaciones → varias actividades → meses ("en octubre, en Ayalas, esto y esto").
  const MODOS = [
    { value: "actividad", label: "Por actividad", s: "Una actividad, varias estaciones y meses, en un solo paso." },
    { value: "estacion", label: "Por estación", s: "Una estación, varias actividades y meses, en un solo paso." },
  ];
  let modo = inicial.modo === "estacion" ? "estacion" : "actividad";
  let disciplina = inicial.disciplina || "CIVIL";
  let actividadId = inicial.actividadId ?? null;
  /** Modo estación: actividades marcadas (pueden ser de varias disciplinas). */
  let actIds = [...(inicial.actividadIds ?? [])];
  let q = "";
  let sq = "";
  let st = [...(inicial.estacionIds ?? [])];
  let meses = [...(inicial.meses ?? [])];
  let preset = "";
  let desde = 1;
  let enviando = false;
  let error = "";

  $: porEstacion = modo === "estacion";
  $: seleccionada = actividades.find((a) => a.id === actividadId) ?? null;
  // Las actividades que se van a asignar, en el orden del catálogo.
  $: elegidas = porEstacion ? actividades.filter((a) => actIds.includes(a.id)) : seleccionada ? [seleccionada] : [];
  $: deDisciplina = actividades.filter((a) => a.disciplina === disciplina);
  $: lista = deDisciplina.filter((a) => !q || a.nombre.toLowerCase().includes(q.toLowerCase()));
  $: estacionesFiltradas = estaciones.filter((s) => !sq || s.nombre.toLowerCase().includes(sq.toLowerCase()));
  $: atajos = [
    ["Todas", estaciones.map((s) => s.id)],
    ["Bombeo", estaciones.filter((s) => s.tipo === "BOMBEO").map((s) => s.id)],
    ["Complementarias", estaciones.filter((s) => s.tipo !== "BOMBEO").map((s) => s.id)],
    ["Ninguna", []],
  ].map(([l, ids]) => ({
    l: l + (ids.length ? ` (${ids.length})` : ""),
    ids,
    on: ids.length === st.length && ids.every((i) => st.includes(i)) && (ids.length > 0 || (l === "Ninguna" && !st.length)),
  }));
  $: todasDeDisciplina = deDisciplina.length > 0 && deDisciplina.every((a) => actIds.includes(a.id));
  $: conteo = elegidas.reduce(
    (t, a) => {
      const c = paresAsignacion(citasVigentes, a.id, st, meses);
      return { nuevas: t.nuevas + c.nuevas, duplicadas: t.duplicadas + c.duplicadas };
    },
    { nuevas: 0, duplicadas: 0 },
  );
  $: ok = conteo.nuevas > 0 && !enviando;
  $: soloWeb = elegidas.filter((a) => !a.capturaMovilHabilitada);
  $: nombreEstaciones = st.length === 1 ? (estaciones.find((s) => s.id === st[0])?.nombre ?? "1 estación") : `${st.length} estaciones`;
  $: resumen = porEstacion
    ? `${nombreEstaciones} · ${actIds.length} ${actIds.length === 1 ? "actividad" : "actividades"} × ${meses.length} ${meses.length === 1 ? "mes" : "meses"}`
    : seleccionada
      ? `${seleccionada.nombre} · ${st.length} estaciones × ${meses.length} meses`
      : "Elija una actividad";
  // El orden de las secciones sigue el modo; los meses van siempre al final.
  $: secciones = porEstacion ? ["estaciones", "actividades"] : ["actividades", "estaciones"];
  $: tituloActividades = porEstacion ? "Actividades" : "Disciplina y actividad";

  // Cambiar de modo conserva estaciones y meses; la actividad elegida pasa a ser la primera marcada y viceversa.
  function cambiarModo(m) {
    if (m === modo) return;
    if (m === "estacion") actIds = actividadId != null ? [actividadId] : actIds;
    else actividadId = actIds.length === 1 ? actIds[0] : null;
    modo = m;
    error = "";
  }

  function elegirDisciplina(d) {
    disciplina = d;
    q = "";
    // En modo estación se pueden mezclar disciplinas: lo marcado se conserva.
    if (!porEstacion) actividadId = null;
  }

  function toggleActividad(id) {
    actIds = actIds.includes(id) ? actIds.filter((x) => x !== id) : [...actIds, id];
  }

  function marcarDisciplina() {
    const ids = deDisciplina.map((a) => a.id);
    actIds = todasDeDisciplina ? actIds.filter((id) => !ids.includes(id)) : [...new Set([...actIds, ...ids])];
  }

  function marcadasDe(d) {
    return actividades.filter((a) => a.disciplina === d && actIds.includes(a.id)).length;
  }

  function aplicarPreset(nombre, desdeMes = desde) {
    const p = PRESETS.find((x) => x[0] === nombre);
    preset = nombre;
    meses = p ? mesesDePreset(p[1], desdeMes, anio, hoy) : meses;
  }

  function cambiarDesde(e) {
    desde = Number(e.target.value);
    if (preset) aplicarPreset(preset, desde);
  }

  function toggleEstacion(id) {
    st = st.includes(id) ? st.filter((x) => x !== id) : [...st, id];
    // D2: con una sola estación marcada, su frecuencia base preselecciona los meses
    // (solo si todavía no se eligió una frecuencia ni meses a mano).
    if (st.length === 1 && !preset && !meses.length) {
      const frec = estaciones.find((s) => s.id === st[0])?.frecuenciaBase;
      const p = PRESETS.find((x) => x[2] === frec);
      if (p) aplicarPreset(p[0]);
    }
  }

  function toggleMes(m) {
    if (mesCerrado(anio, m, hoy)) return;
    preset = "";
    meses = meses.includes(m) ? meses.filter((x) => x !== m) : [...meses, m];
  }

  async function asignar() {
    if (!ok) return;
    enviando = true;
    error = "";
    // El backend asigna una actividad por llamada: una por cada actividad que tenga algo nuevo
    // (las que ya están completas en el cronograma no se envían). Repetir es seguro (lo que ya
    // existe se omite), así que si una falla se puede volver a intentar.
    const enviar = elegidas.filter((a) => paresAsignacion(citasVigentes, a.id, st, meses).nuevas > 0);
    const total = { creadas: 0, omitidasDuplicadas: 0, omitidasMesCerrado: 0, omitidasEstacionInactiva: 0 };
    const hechas = [];
    try {
      for (const a of enviar) {
        const r = await substationAdmin.asignar({
          anio,
          actividadId: a.id,
          estacionIds: st,
          meses: [...meses].sort((x, y) => x - y),
        });
        for (const k of Object.keys(total)) total[k] += r?.[k] ?? 0;
        hechas.push(a);
      }
      dispatch("asignado", { resultado: total, actividad: hechas.length === 1 ? hechas[0] : null, actividades: hechas });
    } catch (e) {
      error = hechas.length
        ? `Se asignaron ${hechas.length} de ${enviar.length} actividades; falló “${enviar[hechas.length].nombre}”: ${e.message}. Vuelva a intentar: lo ya asignado no se duplica.`
        : e.message;
      if (hechas.length) dispatch("parcial");
    } finally {
      enviando = false;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="velo" on:click={() => dispatch("close")}></div>
<aside class="drawer" role="dialog" aria-label="Asignación masiva">
  <div class="head">
    <div>
      <div class="t">Asignación masiva</div>
      <div class="s">{MODOS.find((m) => m.value === modo).s}</div>
    </div>
    <button class="x" aria-label="Cerrar" on:click={() => dispatch("close")}>×</button>
  </div>

  <div class="modos">
    <div class="seg" role="group" aria-label="Forma de asignar">
      {#each MODOS as m}
        <button class:on={modo === m.value} aria-pressed={modo === m.value} on:click={() => cambiarModo(m.value)}>{m.label}</button>
      {/each}
    </div>
  </div>

  <div class="cuerpo">
    {#each secciones as sec, i (sec)}
      {#if sec === "actividades"}
        <section>
          <div class="sec entre">
            <span>{i + 1} · {tituloActividades}</span>
            {#if porEstacion}<span class="normal">{actIds.length} {actIds.length === 1 ? "marcada" : "marcadas"}</span>{/if}
          </div>
          <div class="seg">
            {#each DISCIPLINAS as d}
              <button class:on={disciplina === d.value} on:click={() => elegirDisciplina(d.value)}>
                {d.label}
                <span class="n">{#if porEstacion && marcadasDe(d.value)}{marcadasDe(d.value)}/{/if}{actividades.filter((a) => a.disciplina === d.value).length}</span>
              </button>
            {/each}
          </div>
          <div class="fila">
            <input class="inp flex" bind:value={q} placeholder="Buscar actividad…" />
            {#if porEstacion}
              <button class="chip" class:on={todasDeDisciplina} disabled={!deDisciplina.length} on:click={marcarDisciplina}>
                {todasDeDisciplina ? "Desmarcar todas" : "Marcar todas"}
              </button>
            {:else}
              <span class="total">{deDisciplina.length} en total</span>
            {/if}
          </div>
          {#if !porEstacion && seleccionada}
            <div class="elegida">
              <span class="elipsis">✓ {seleccionada.nombre}</span>
              <button class="cambiar" on:click={() => (actividadId = null)}>Cambiar</button>
            </div>
          {/if}
          <div class="acts">
            {#each lista as a (a.id)}
              {@const on = porEstacion ? actIds.includes(a.id) : actividadId === a.id}
              <button class="act" class:on aria-pressed={on}
                on:click={() => (porEstacion ? toggleActividad(a.id) : (actividadId = a.id))}>
                <span class="g" class:caja={porEstacion}>{on ? "✓" : ""}</span>
                <span class="act-text">{a.nombre}{#if !a.capturaMovilHabilitada}<span class="soloweb">Solo web</span>{/if}</span>
              </button>
            {:else}
              <span class="vacio">Sin actividades en esta disciplina.</span>
            {/each}
          </div>
        </section>
      {:else}
        <section>
          <div class="sec entre"><span>{i + 1} · Estaciones</span><span class="normal">{st.length} seleccionadas</span></div>
          <input class="inp" bind:value={sq} placeholder="Buscar estación…" />
          <div class="atajos">
            {#each atajos as a}
              <button class="chip" class:on={a.on} on:click={() => (st = [...a.ids])}>{a.l}</button>
            {/each}
          </div>
          <div class="ests">
            {#each estacionesFiltradas as s (s.id)}
              <label class="est" class:on={st.includes(s.id)}>
                <input type="checkbox" checked={st.includes(s.id)} on:change={() => toggleEstacion(s.id)} />
                <span class="elipsis">{s.nombre}</span>
              </label>
            {/each}
          </div>
        </section>
      {/if}
    {/each}

    <section>
      <div class="sec entre"><span>3 · Meses</span><span class="normal">{meses.length} seleccionados</span></div>
      <div class="fila wrap">
        <div class="seg chico">
          {#each PRESETS as [l]}
            <button class:on={preset === l} on:click={() => aplicarPreset(l)}>{l}</button>
          {/each}
        </div>
        <label class="desde">desde
          <select value={String(desde)} on:change={cambiarDesde}>
            {#each MESES_LARGOS as l, i}<option value={String(i + 1)}>{l}</option>{/each}
          </select>
        </label>
      </div>
      <div class="meses">
        {#each MESES as l, i}
          {@const m = i + 1}
          {@const cerrado = mesCerrado(anio, m, hoy)}
          <button class="mes" class:on={meses.includes(m)} class:cerrado title={cerrado ? "Mes cerrado" : ""}
            disabled={cerrado} on:click={() => toggleMes(m)}>{l}</button>
        {/each}
      </div>
    </section>

    <div class="resumen">
      <div class="r1">{resumen}</div>
      <div class="r2">{conteo.nuevas} <span>citas nuevas</span></div>
      {#if conteo.duplicadas > 0}
        <div class="aviso">{conteo.duplicadas} ya existían en el cronograma y se omiten.</div>
      {/if}
      {#if soloWeb.length === 1}
        <div class="aviso">{porEstacion ? `“${soloWeb[0].nombre}” no tiene` : "Esta actividad no tiene"} captura móvil: los técnicos la verán en su lista, pero deberá registrarse desde la web.</div>
      {:else if soloWeb.length > 1}
        <div class="aviso">{soloWeb.length} de las actividades marcadas no tienen captura móvil: los técnicos las verán en su lista, pero deberán registrarse desde la web.</div>
      {/if}
      <div class="nota">
        {#if anio === hoy.anioActual}Meses anteriores a {MESES_LARGOS[hoy.mesActual - 1]} están cerrados. {/if}Se agregan como
        borrador. Llegan a la app móvil cuando se pulse “Publicar a móvil”.
      </div>
      {#if error}<div class="error" role="alert">{error}</div>{/if}
    </div>
  </div>

  <div class="pie">
    <button class="sec-btn" on:click={() => dispatch("close")}>Cancelar</button>
    <button class="primario" disabled={!ok} on:click={asignar}>{enviando ? "Asignando…" : conteo.nuevas > 0 ? `Asignar ${conteo.nuevas} ${conteo.nuevas === 1 ? "cita" : "citas"}` : "Asignar"}</button>
  </div>
</aside>


<style>
  .velo {
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.28);
    z-index: 1055;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100vw;
    background: #fff;
    z-index: 1056;
    box-shadow: -12px 0 40px rgba(11, 11, 11, 0.16);
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
  }
  .drawer :global(*) {
    box-sizing: border-box;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 18px 22px;
    border-bottom: 1px solid rgba(11, 11, 11, 0.08);
  }
  .t {
    font-size: 17px;
    font-weight: 650;
  }
  .s {
    font-size: 12.5px;
    color: #52514e;
    margin-top: 3px;
  }
  .x {
    all: unset;
    cursor: pointer;
    font-size: 20px;
    color: #898781;
    padding: 0 4px;
  }
  .cuerpo {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-width: 0;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sec {
    font-size: 12px;
    font-weight: 600;
  }
  .entre {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    white-space: nowrap;
  }
  .normal {
    font-weight: 400;
    color: #52514e;
  }
  .seg {
    display: flex;
    padding: 3px;
    background: #efefed;
    border-radius: 999px;
    align-self: flex-start;
  }
  .seg button {
    border: 0;
    border-radius: 999px;
    padding: 6px 14px;
    white-space: nowrap;
    font-size: 12.5px;
    cursor: pointer;
    background: transparent;
    color: #0b0b0b;
    font-family: inherit;
  }
  .seg.chico button {
    padding: 5px 10px;
    font-size: 12px;
  }
  .seg button.on {
    background: #fff;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(11, 11, 11, 0.1);
  }
  .n {
    color: #898781;
    font-weight: 400;
  }
  .fila {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .flex {
    flex: 1;
  }
  .inp {
    height: 34px;
    padding: 0 12px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
  }
  .total {
    font-size: 12px;
    color: #898781;
    white-space: nowrap;
  }
  .elegida {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    background: #e8f1fb;
    color: #1f5fae;
    font-size: 13px;
  }
  .elipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cambiar {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    color: #1f5fae;
  }
  .acts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    max-height: 212px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1px;
  }
  .act {
    text-align: left;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.3;
    cursor: pointer;
    display: flex;
    gap: 6px;
    align-items: center;
    min-width: 0;
    overflow-wrap: anywhere;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #0b0b0b;
    font-family: inherit;
  }
  .act.on {
    border-color: #2a78d6;
    background: #e8f1fb;
    color: #1f5fae;
  }
  .g {
    font-weight: 700;
    width: 10px;
    flex: none;
  }
  /* Modo estación: casilla, porque se marcan varias. */
  .g.caja {
    width: 14px;
    height: 14px;
    border: 1.5px solid rgba(11, 11, 11, 0.3);
    border-radius: 3px;
    font-size: 10px;
    line-height: 11px;
    text-align: center;
  }
  .act.on .g.caja {
    border-color: #2a78d6;
    background: #2a78d6;
    color: #fff;
  }
  .modos {
    padding: 12px 22px 0;
  }
  .chip:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .act-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .soloweb {
    font-size: 11px;
    color: #8a5b00;
  }
  .vacio {
    font-size: 12.5px;
    color: #898781;
  }
  .atajos {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .chip {
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #0b0b0b;
    font-family: inherit;
  }
  .chip.on {
    border-color: #2a78d6;
    background: #e8f1fb;
    color: #1f5fae;
  }
  .ests {
    border: 1px solid rgba(11, 11, 11, 0.08);
    border-radius: 8px;
    max-height: 236px;
    overflow-y: auto;
    overflow-x: hidden;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .est {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid rgba(11, 11, 11, 0.04);
    min-width: 0;
  }
  .est.on {
    background: #f1f6fd;
  }
  .desde {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #52514e;
    white-space: nowrap;
  }
  .desde select {
    height: 30px;
    padding: 0 8px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 6px;
    font-size: 12.5px;
    background: #fff;
    font-family: inherit;
  }
  .meses {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
  }
  .mes {
    border-radius: 6px;
    padding: 6px 0;
    font-size: 12.5px;
    cursor: pointer;
    border: 1px solid rgba(11, 11, 11, 0.12);
    background: #fff;
    color: #52514e;
    font-family: inherit;
  }
  .mes.on {
    border-color: #2a78d6;
    background: #2a78d6;
    color: #fff;
  }
  .mes.cerrado {
    border-color: transparent;
    background: #f3f3f1;
    color: #b5b4af;
    cursor: default;
  }
  .resumen {
    border-radius: 10px;
    background: #f7f7f6;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .r1 {
    font-size: 12px;
    color: #52514e;
  }
  .r2 {
    font-size: 22px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .r2 span {
    font-size: 13px;
    font-weight: 400;
    color: #52514e;
  }
  .aviso {
    font-size: 12.5px;
    color: #8a5b00;
    text-wrap: pretty;
  }
  .nota {
    font-size: 12px;
    color: #898781;
    text-wrap: pretty;
  }
  .error {
    font-size: 12.5px;
    color: #d03b3b;
  }
  .pie {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 22px;
    border-top: 1px solid rgba(11, 11, 11, 0.08);
  }
  .sec-btn {
    background: #fff;
    color: #0b0b0b;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    padding: 9px 20px;
    font-size: 13px;
    cursor: pointer;
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
    font-family: inherit;
  }
  .primario:disabled {
    background: #a9c6ea;
    cursor: not-allowed;
  }
</style>
