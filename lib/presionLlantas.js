// Presión de llantas (backend /api/v1/tire). Es solo reporte: una llanta fuera de
// rango no bloquea la inspección ni genera órdenes ni notificaciones — el operario
// calibra. Unidad: PSI en todo el sistema.
//
// En la web el backend lo llama "perfil"; al usuario se le muestra como
// "configuración de llantas": cuántas llantas tiene el activo y qué presión deben tener.

export const APLICA_A_OPCIONES = [
    { value: 'VEHICULO', label: 'Vehículo', singular: 'vehículo', plural: 'vehículos' },
    { value: 'MOTOCICLETA', label: 'Moto', singular: 'moto', plural: 'motos' },
    { value: 'MAQUINARIA', label: 'Maquinaria', singular: 'máquina', plural: 'máquinas' },
];

export function aplicaALabel(aplicaA) {
    return APLICA_A_OPCIONES.find((o) => o.value === aplicaA)?.label ?? aplicaA ?? '';
}

export function aplicaAPlural(aplicaA) {
    return APLICA_A_OPCIONES.find((o) => o.value === aplicaA)?.plural ?? 'activos';
}

/** "1 moto", "3 motos". */
export function contarActivos(n, aplicaA) {
    const o = APLICA_A_OPCIONES.find((x) => x.value === aplicaA);
    return `${n} ${n === 1 ? o?.singular ?? 'activo' : o?.plural ?? 'activos'}`;
}

/**
 * Resultado de una lectura o de la inspección completa (presionLlantasEstado).
 * `tono` usa la paleta de badges moderna (ok / warn / bad / neu); `statusClass`,
 * las clases de semáforo del DataGrid retro.
 */
const ESTADOS = {
    OK: { label: 'OK', tono: 'ok', statusClass: 'status-optimo' },
    BAJA: { label: 'Baja', tono: 'bad', statusClass: 'status-malo' },
    ALTA: { label: 'Alta', tono: 'warn', statusClass: 'status-regular' },
    SIN_RANGO: { label: 'Sin rango', tono: 'neu', statusClass: 'status-unknown' },
};

/** null si la inspección no registró presiones (activo sin configuración o anterior a la función). */
export function estadoPresion(estado) {
    if (!estado) return null;
    return ESTADOS[estado] ?? { label: String(estado), tono: 'neu', statusClass: 'status-unknown' };
}

/** Texto corto de la celda del reporte: "OK", "2 bajas", "1 alta", "1 baja · 1 alta". */
export function resumenCeldaPresion(inspeccion) {
    const estado = estadoPresion(inspeccion?.presionLlantasEstado);
    if (!estado) return null;
    const lecturas = inspeccion.presionesLlantas ?? [];
    const contar = (r) => lecturas.filter((l) => l.resultado === r).length;
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    const partes = [];
    if (contar('BAJA')) partes.push(plural(contar('BAJA'), 'baja', 'bajas'));
    if (contar('ALTA')) partes.push(plural(contar('ALTA'), 'alta', 'altas'));
    return partes.length ? { ...estado, label: partes.join(' · ') } : estado;
}

const fmtNum = (v) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 });

export function formatPsi(valor) {
    if (valor == null || valor === '') return '—';
    const n = Number(valor);
    if (!Number.isFinite(n)) return '—';
    return `${fmtNum(n)} PSI`;
}

/** "28 – 33 PSI" (y el ideal si existe). */
export function formatRango(psiMin, psiMax, psiObjetivo = null) {
    if (psiMin == null || psiMax == null) return 'Sin rango';
    const base = `${fmtNum(psiMin)} – ${fmtNum(psiMax)} PSI`;
    return psiObjetivo != null && psiObjetivo !== '' ? `${base} (ideal ${fmtNum(psiObjetivo)})` : base;
}

/** Asignación vigente del activo en la lista de GET /tire/asignaciones. */
export function asignacionDeActivo(asignaciones, { vehicleId = null, machineId = null }) {
    const lista = Array.isArray(asignaciones) ? asignaciones : [];
    if (vehicleId != null) return lista.find((a) => a.vehicleId === vehicleId) ?? null;
    if (machineId != null) return lista.find((a) => a.machineId === machineId) ?? null;
    return null;
}

/**
 * Guarda la configuración elegida en el formulario del activo solo si cambió.
 * `acciones` es el store `data`; `activo` es { vehicleId } (vehículo o moto) o { machineId }.
 * Ids como texto ("" = sin configuración). Devuelve true si llamó al backend.
 */
export async function sincronizarPerfilLlantas(acciones, activo, perfilIdNuevo, perfilIdAnterior = '') {
    const nuevo = perfilIdNuevo ? Number(perfilIdNuevo) : null;
    const anterior = perfilIdAnterior ? Number(perfilIdAnterior) : null;
    if (nuevo === anterior) return false;
    if (activo.machineId != null) await acciones.assignTireProfileMachine(activo.machineId, nuevo);
    else await acciones.assignTireProfileVehicle(activo.vehicleId, nuevo);
    return true;
}

// ── Distribuciones de llantas ────────────────────────────────────────────────
// Cada distribución define las llantas por eje, de adelante hacia atrás, con su
// lado (I = izquierda, D = derecha, C = centro) para dibujarlas vistas desde arriba.
// `grupo` agrupa las llantas que normalmente llevan la misma presión.

const ll = (codigo, etiqueta, lado, grupo) => ({ codigo, etiqueta, lado, grupo });
const ejeSimple = (p, nombre, grupo) => [ll(`${p}I`, `${nombre} izquierda`, 'I', grupo), ll(`${p}D`, `${nombre} derecha`, 'D', grupo)];
const ejeDoble = (p, nombre, grupo) => [
    ll(`${p}IE`, `${nombre} izquierda exterior`, 'I', grupo),
    ll(`${p}II`, `${nombre} izquierda interior`, 'I', grupo),
    ll(`${p}DI`, `${nombre} derecha interior`, 'D', grupo),
    ll(`${p}DE`, `${nombre} derecha exterior`, 'D', grupo),
];

export const DISTRIBUCIONES = [
    {
        id: 'moto2',
        label: '2 llantas',
        detalle: 'Moto',
        para: ['MOTOCICLETA'],
        ejes: [[ll('DEL', 'Delantera', 'C', 'Delantera')], [ll('TRA', 'Trasera', 'C', 'Trasera')]],
    },
    {
        id: 'auto4',
        label: '4 llantas',
        detalle: 'Carro, camioneta, retro',
        para: ['VEHICULO', 'MAQUINARIA'],
        ejes: [
            [ll('DI', 'Delantera izquierda', 'I', 'Delanteras'), ll('DD', 'Delantera derecha', 'D', 'Delanteras')],
            [ll('TI', 'Trasera izquierda', 'I', 'Traseras'), ll('TD', 'Trasera derecha', 'D', 'Traseras')],
        ],
    },
    {
        id: 'doble6',
        label: '6 llantas',
        detalle: 'Doble llanta atrás (camión)',
        para: ['VEHICULO', 'MAQUINARIA'],
        ejes: [
            [ll('DI', 'Delantera izquierda', 'I', 'Delanteras'), ll('DD', 'Delantera derecha', 'D', 'Delanteras')],
            [
                ll('TIE', 'Trasera izquierda exterior', 'I', 'Traseras'),
                ll('TII', 'Trasera izquierda interior', 'I', 'Traseras'),
                ll('TDI', 'Trasera derecha interior', 'D', 'Traseras'),
                ll('TDE', 'Trasera derecha exterior', 'D', 'Traseras'),
            ],
        ],
    },
    {
        id: 'volqueta10',
        label: '10 llantas',
        detalle: 'Volqueta 6x4 (dos ejes atrás)',
        para: ['VEHICULO', 'MAQUINARIA'],
        ejes: [
            ejeSimple('D', 'Delantera', 'Delanteras'),
            ejeDoble('E1', 'Eje 1', 'Traseras'),
            ejeDoble('E2', 'Eje 2', 'Traseras'),
        ],
    },
];

export function distribucionPorId(id) {
    return DISTRIBUCIONES.find((d) => d.id === id) ?? null;
}

/** Llantas de la distribución en el orden en que el operario las mide. */
export function llantasDeDistribucion(id) {
    return distribucionPorId(id)?.ejes.flat() ?? [];
}

/** Distribución cuyas llantas coinciden exactamente con estos códigos (sin importar el orden). */
export function detectarDistribucion(codigos) {
    const set = new Set((codigos ?? []).map((c) => String(c).toUpperCase()));
    return (
        DISTRIBUCIONES.find((d) => {
            const propios = d.ejes.flat().map((l) => l.codigo);
            return propios.length === set.size && propios.every((c) => set.has(c));
        }) ?? null
    );
}

/**
 * Ejes para dibujar un conjunto de posiciones: los de su distribución si la
 * reconoce, o de a dos llantas por eje (izquierda/derecha) si es personalizada.
 * Cada llanta conserva su número (1..n) según el orden recibido.
 */
export function ejesParaDibujo(posiciones) {
    const lista = (posiciones ?? []).map((p, i) => ({ ...p, numero: i + 1 }));
    const porCodigo = new Map(lista.map((p) => [String(p.codigo).toUpperCase(), p]));
    const dist = detectarDistribucion(lista.map((p) => p.codigo));
    if (dist) {
        return dist.ejes.map((eje) => eje.map((l) => ({ ...l, ...porCodigo.get(l.codigo), lado: l.lado })));
    }
    const ejes = [];
    for (let i = 0; i < lista.length; i += 2) {
        const par = lista.slice(i, i + 2);
        ejes.push(par.length === 2 ? [{ ...par[0], lado: 'I' }, { ...par[1], lado: 'D' }] : [{ ...par[0], lado: 'C' }]);
    }
    return ejes;
}

// ── Formulario de la configuración ───────────────────────────────────────────

// Mismos topes que PerfilLlantasService (NUMERIC(5,1) en BD).
export const PSI_TOPE = 300;
const CODIGO_VALIDO = /^[A-Z0-9_]{1,30}$/;
export const MAX_LLANTAS_PERSONALIZADA = 24;

const rangoVacio = () => ({ psiMin: '', psiObjetivo: '', psiMax: '' });

function numeroONull(v) {
    if (v == null || String(v).trim() === '') return null;
    const n = Number(String(v).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
}

const mismoRango = (a, b) =>
    numeroONull(a.psiMin) === numeroONull(b.psiMin) &&
    numeroONull(a.psiMax) === numeroONull(b.psiMax) &&
    numeroONull(a.psiObjetivo) === numeroONull(b.psiObjetivo);

/** Distribución sugerida al elegir el tipo de activo. */
export function distribucionInicial(aplicaA) {
    return aplicaA === 'MOTOCICLETA' ? 'moto2' : 'auto4';
}

/**
 * Formulario vacío. `modo` decide cómo se digita la presión:
 * "todas" (un solo rango), "grupos" (delanteras / traseras) o "llanta" (una por una).
 */
export function formularioNuevo(aplicaA = 'VEHICULO') {
    const distribucion = distribucionInicial(aplicaA);
    return {
        nombre: '',
        aplicaA,
        descripcion: '',
        distribucion,
        modo: 'todas',
        rangoTodas: rangoVacio(),
        rangosGrupo: {},
        llantas: llantasDeDistribucion(distribucion).map((l) => ({ ...l, ...rangoVacio() })),
    };
}

/** Grupos (Delanteras / Traseras...) de la distribución, en orden. */
export function gruposDe(form) {
    return [...new Set(form.llantas.map((l) => l.grupo).filter(Boolean))];
}

const copiaRango = (r) => ({ psiMin: r?.psiMin ?? '', psiObjetivo: r?.psiObjetivo ?? '', psiMax: r?.psiMax ?? '' });

/**
 * Cambia cómo se digita la presión copiando lo ya escrito: al pasar a grupos cada
 * grupo arranca con el rango de "todas", y al pasar a una por una cada llanta
 * arranca con el rango de su grupo (o de "todas").
 */
export function cambiarModo(form, modo) {
    const grupos = gruposDe(form);
    if (modo === 'grupos' && grupos.length < 2) modo = 'todas';
    if (modo === 'grupos') {
        const rangosGrupo = Object.fromEntries(grupos.map((g) => [g, copiaRango(form.rangosGrupo[g] ?? form.rangoTodas)]));
        return { ...form, modo, rangosGrupo };
    }
    if (modo === 'llanta' && form.modo !== 'llanta') {
        const llantas = form.llantas.map((l) => ({ ...l, ...copiaRango(rangoDeLlanta(form, l)) }));
        return { ...form, modo, llantas };
    }
    return { ...form, modo };
}

/** Cambia la distribución conservando el modo y los rangos ya digitados. */
export function cambiarDistribucion(form, distribucion) {
    const llantas =
        distribucion === 'personalizada'
            ? form.llantas.map((l) => ({ ...l, grupo: null, lado: null }))
            : llantasDeDistribucion(distribucion).map((l) => ({ ...l, ...rangoVacio() }));
    // Pasar a "otra cantidad" conserva las mismas llantas, con su rango propio.
    if (distribucion === 'personalizada' && form.modo === 'llanta') return { ...form, distribucion, llantas };
    const modo = form.modo === 'llanta' ? 'todas' : form.modo;
    const base = { ...form, distribucion, llantas, modo: 'todas' };
    return cambiarModo(base, modo);
}

/** Ajusta la cantidad de llantas de una distribución personalizada con códigos L1, L2... únicos. */
export function cambiarCantidadPersonalizada(form, cantidad) {
    const n = Math.max(1, Math.min(MAX_LLANTAS_PERSONALIZADA, Math.trunc(Number(cantidad) || 1)));
    const llantas = form.llantas.slice(0, n);
    const usados = new Set(llantas.map((l) => l.codigo));
    let k = 1;
    while (llantas.length < n) {
        while (usados.has(`L${k}`)) k++;
        usados.add(`L${k}`);
        llantas.push({ codigo: `L${k}`, etiqueta: `Llanta ${llantas.length + 1}`, lado: null, grupo: null, ...rangoVacio() });
    }
    return { ...form, llantas };
}

/** Rango que lleva cada llanta según el modo elegido. */
export function rangoDeLlanta(form, llanta) {
    if (form.modo === 'todas') return form.rangoTodas;
    if (form.modo === 'grupos') return form.rangosGrupo[llanta.grupo] ?? rangoVacio();
    return llanta;
}

function validarRango(rango, quien) {
    const psiMin = numeroONull(rango.psiMin);
    const psiMax = numeroONull(rango.psiMax);
    const psiObjetivo = numeroONull(rango.psiObjetivo);
    if (psiMin == null || psiMax == null) return { error: `${quien}: falta la presión mínima o la máxima.` };
    if ([psiMin, psiMax, psiObjetivo].some((v) => Number.isNaN(v))) return { error: `${quien}: las presiones deben ser números.` };
    if (psiMin <= 0) return { error: `${quien}: la presión mínima debe ser mayor que 0.` };
    if (psiMin > psiMax) return { error: `${quien}: la mínima no puede ser mayor que la máxima.` };
    if (psiMax > PSI_TOPE) return { error: `${quien}: la máxima no puede pasar de ${PSI_TOPE} PSI.` };
    if (psiObjetivo != null && (psiObjetivo < psiMin || psiObjetivo > psiMax)) {
        return { error: `${quien}: la presión ideal debe estar entre la mínima y la máxima.` };
    }
    return { rango: { psiMin, psiObjetivo, psiMax } };
}

/**
 * Valida el formulario con las mismas reglas del backend y arma el payload de
 * POST/PUT /tire/perfiles. Devuelve { error } o { payload }.
 */
export function construirPayloadPerfil(form) {
    const nombre = (form.nombre ?? '').trim();
    if (!nombre) return { error: 'Escriba un nombre para la configuración.' };
    if (nombre.length > 100) return { error: 'El nombre admite máximo 100 caracteres.' };
    if (!APLICA_A_OPCIONES.some((o) => o.value === form.aplicaA)) {
        return { error: 'Elija si es para vehículos, motos o maquinaria.' };
    }
    const llantas = Array.isArray(form.llantas) ? form.llantas : [];
    if (!llantas.length) return { error: 'La configuración debe tener al menos una llanta.' };

    const codigos = new Set();
    const posiciones = [];
    for (let i = 0; i < llantas.length; i++) {
        const l = llantas[i];
        const etiqueta = (l.etiqueta ?? '').trim();
        const quien = etiqueta || `Llanta ${i + 1}`;
        const codigo = (l.codigo ?? '').trim().toUpperCase();
        if (!CODIGO_VALIDO.test(codigo) || codigos.has(codigo)) {
            return { error: `${quien}: identificador interno inválido; vuelva a elegir la distribución.` };
        }
        codigos.add(codigo);
        if (!etiqueta || etiqueta.length > 80) return { error: `Llanta ${i + 1}: necesita un nombre (máx. 80 caracteres).` };

        const quienRango = form.modo === 'todas' ? 'Presión de las llantas' : form.modo === 'grupos' ? `Llantas ${l.grupo?.toLowerCase()}` : quien;
        const { error, rango } = validarRango(rangoDeLlanta(form, l), quienRango);
        if (error) return { error };
        posiciones.push({ codigo, etiqueta, orden: i + 1, ...rango });
    }
    const descripcion = (form.descripcion ?? '').trim();
    return { payload: { nombre, aplicaA: form.aplicaA, descripcion: descripcion || null, posiciones } };
}

/** Configuración del backend → formulario, eligiendo el modo más simple que la represente. */
export function perfilAFormulario(perfil) {
    const txt = (v) => (v == null ? '' : String(v));
    const posiciones = [...(perfil?.posiciones ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const dist = detectarDistribucion(posiciones.map((p) => p.codigo));
    const plantilla = new Map((dist ? dist.ejes.flat() : []).map((l) => [l.codigo, l]));
    const llantas = posiciones.map((p) => ({
        codigo: p.codigo,
        etiqueta: p.etiqueta,
        lado: plantilla.get(p.codigo)?.lado ?? null,
        grupo: plantilla.get(p.codigo)?.grupo ?? null,
        psiMin: txt(p.psiMin),
        psiObjetivo: txt(p.psiObjetivo),
        psiMax: txt(p.psiMax),
    }));
    const form = {
        nombre: perfil?.nombre ?? '',
        aplicaA: perfil?.aplicaA ?? 'VEHICULO',
        descripcion: perfil?.descripcion ?? '',
        distribucion: dist?.id ?? 'personalizada',
        modo: 'llanta',
        rangoTodas: rangoVacio(),
        rangosGrupo: {},
        llantas,
    };
    const rangoDe = (l) => ({ psiMin: l.psiMin, psiObjetivo: l.psiObjetivo, psiMax: l.psiMax });
    if (llantas.length && llantas.every((l) => mismoRango(l, llantas[0]))) {
        return { ...form, modo: 'todas', rangoTodas: rangoDe(llantas[0]) };
    }
    if (dist) {
        const grupos = gruposDe(form);
        const uniformes = grupos.every((g) => {
            const del = llantas.filter((l) => l.grupo === g);
            return del.every((l) => mismoRango(l, del[0]));
        });
        if (uniformes && grupos.length > 1) {
            const rangosGrupo = Object.fromEntries(grupos.map((g) => [g, rangoDe(llantas.find((l) => l.grupo === g))]));
            return { ...form, modo: 'grupos', rangosGrupo };
        }
    }
    return form;
}

/**
 * Resumen de rangos de una configuración guardada: un renglón si todas llevan lo
 * mismo, uno por grupo (Delanteras / Traseras) si así se configuró, o el rango total.
 */
export function resumenRangos(perfil) {
    const form = perfilAFormulario(perfil);
    if (!form.llantas.length) return [];
    if (form.modo === 'todas') {
        const r = form.rangoTodas;
        return [{ titulo: 'Todas', rango: formatRango(r.psiMin, r.psiMax, r.psiObjetivo || null) }];
    }
    if (form.modo === 'grupos') {
        return Object.entries(form.rangosGrupo).map(([g, r]) => ({ titulo: g, rango: formatRango(r.psiMin, r.psiMax, r.psiObjetivo || null) }));
    }
    const min = Math.min(...form.llantas.map((l) => Number(l.psiMin)));
    const max = Math.max(...form.llantas.map((l) => Number(l.psiMax)));
    return [{ titulo: 'Varía por llanta', rango: formatRango(min, max) }];
}

/** ¿Es una moto? Vehículos y motos comparten la tabla vehiculos (y GET /vehicle trae ambos). */
export function esMoto(vehiculo) {
    const tipo = vehiculo?.tipoVehiculo?.nombreTipo ?? vehiculo?.tipoVehiculo ?? vehiculo?.tipo ?? '';
    return String(tipo).toUpperCase().includes('MOTO');
}
