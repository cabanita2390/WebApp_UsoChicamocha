export function formatDateTime(utcDateString) {
    if (!utcDateString) return 'N/A';
    const date = new Date(utcDateString + 'Z');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatDate(utcDateString) {
    if (!utcDateString) return 'N/A';
    const date = new Date(utcDateString + 'Z');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

/** Formatea un LocalDate del backend, que puede llegar como array [y,m,d] o string "yyyy-mm-dd". Retorna dd/mm/yyyy */
export function formatLocalDate(raw) {
    if (!raw) return 'N/A';
    let s = raw;
    if (Array.isArray(raw) && raw.length >= 3) {
        s = `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    }
    const d = new Date(typeof s === 'string' ? `${s}T12:00:00` : s);
    if (Number.isNaN(d.getTime())) return String(raw);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/** Fecha-hora sin forzar Z (LocalDateTime del backend). */
export function formatDateTimeLocal(value) {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function yn(v) {
    if (v === true) return 'SÍ';
    if (v === false) return 'NO';
    return 'N/A';
}

/** Texto SI/NO/N/A para campos de existencia (boolean o texto tipo "SI", "SI, NO"). */
export function siNoCampo(v) {
    if (v === true || v === 'true' || v === 'TRUE') return 'SÍ';
    if (v === false || v === 'false' || v === 'FALSE') return 'NO';
    if (v == null || v === '') return 'N/A';
    return String(v).trim();
}

export function vehiculoInspeccionLabel(row) {
    const m = (row.marca || '').trim();
    const p = (row.placa || '').trim();
    if (m && p) return `${m} ${p}`;
    return p || m || 'N/A';
}

// Helper para calcular porcentaje de uso
export function calculatePercentageUsed(remainingHours, averageChangeHours) {
    // Validar valores
    if (remainingHours === null || remainingHours === undefined || averageChangeHours === null || averageChangeHours === undefined) return null;
    if (averageChangeHours === 0) return null;

    const remaining = Number(remainingHours);
    const average = Number(averageChangeHours);

    if (isNaN(remaining) || isNaN(average)) return null;

    // Si remainingHours es negativo, significa que ya pasó el cambio (100% de uso)
    if (remaining < 0) return 100;

    // Calcular porcentaje: (promedio - restante) / promedio * 100
    const percentageUsed = ((average - remaining) / average) * 100;

    // Limitar entre 0 y 100
    return Math.max(0, Math.min(100, percentageUsed));
}


// Helper para formatear moneda
export const formatCurrency = (value) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
}).format(value || 0);

export const formatKm = (value) => new Intl.NumberFormat('es-CO').format(value || 0);

// Helper para obtener color/semáforo basado en porcentaje de uso
export function getStatusColor(percentageUsed) {
    if (percentageUsed === null || percentageUsed === undefined || isNaN(percentageUsed)) {
        return 'gray';
    }
    if (percentageUsed >= 90) return 'red';      // 🔴 URGENTE (90%+)
    if (percentageUsed >= 70) return 'yellow';   // 🟡 PRÓXIMO (70-89%)
    return 'green';                               // ✅ OK (0-69%)
}

// Helper para obtener clase Tailwind basada en color
export function getStatusTailwindClass(color) {
    const classes = {
        'red': 'bg-red-100 text-red-800 border-l-4 border-red-300',
        'yellow': 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-300',
        'green': 'bg-green-100 text-green-800 border-l-4 border-green-300',
        'gray': 'bg-gray-100 text-gray-800 border-l-4 border-gray-300'
    };
    return classes[color] || classes['gray'];
}

// Helper para obtener emoji/badge basado en color
export function getStatusBadge(color) {
    const badges = {
        'red': '🔴 URGENTE',
        'yellow': '🟡 PRÓXIMO',
        'green': '✅ OK',
        'gray': '⚪ SIN DATOS'
    };
    return badges[color] || badges['gray'];
}

/** Monitoreo moto: `ubicacionBase` del vehículo; si no, unidad de la última inspección (`responsable` en el DTO). */
export const motoMonitoringUbicacionCell = (row) => {
    const fromBase = row.ubicacionBase != null && String(row.ubicacionBase).trim() !== '' ? String(row.ubicacionBase).trim() : '';
    const fromLastInsp = row.responsable != null && String(row.responsable).trim() !== '' ? String(row.responsable).trim() : '';
    return fromBase || fromLastInsp || '—';
};
