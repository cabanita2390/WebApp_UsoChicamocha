/**
 * Normalización alineada con el backend ({@code InputTextNormalizer}):
 * placas en mayúsculas sin espacios; nombres en formato título; tipos de catálogo en mayúsculas.
 */

export function normalizePlaca(raw) {
  if (raw == null) return '';
  return String(raw).trim().replace(/\s+/g, '').toUpperCase();
}

export function normalizeUpperToken(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Trim y espacios colapsados; conserva mayúsculas/minúsculas relativas (p. ej. 15W-40). */
export function normalizeFreeTextPreserveCase(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim().replace(/\s+/g, ' ');
}

function smartWordTitle(word) {
  if (!word) return word;
  if (/\d/.test(word.charAt(0))) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function hyphenAwareTitleWord(word) {
  if (!word.includes('-')) return smartWordTitle(word);
  return word.split('-').map((s) => (s ? smartWordTitle(s) : s)).join('-');
}

export function normalizeTitleWords(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const collapsed = String(raw).trim().replace(/\s+/g, ' ');
  return collapsed.split(/\s+/).filter(Boolean).map(hyphenAwareTitleWord).join(' ');
}

export function normalizeIdCode(raw) {
  const p = normalizePlaca(raw);
  return p === '' ? null : p;
}

/** Convierte id de select (string | number) a Integer para el API. */
function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Cuerpo para POST/PUT vehículo (no moto) según {@code VehicleRequest}. */
export function formatVehiclePayload(v) {
  return {
    placa: normalizePlaca(v.placa),
    idMarca: toIntOrNull(v.idMarca),
    idTipoVehiculo: toIntOrNull(v.idTipoVehiculo),
    kilometrajeActual: v.kilometrajeActual,
    belongsTo: normalizeTitleWords(v.belongsTo) ?? '',
    idUbicacionBase: v.idUbicacionBase ?? null,
    activo: v.activo === true || v.activo === 'true' || v.activo === 1 || v.activo === '1',
    fuelTankCapacityGallons: v.fuelTankCapacityGallons != null && v.fuelTankCapacityGallons !== '' ? Number(v.fuelTankCapacityGallons) : null,
  };
}

/** Cuerpo para POST/PUT moto (mismo shape que vehículo + idTipo fijado en cliente). */
export function formatMotoVehiclePayload(v, idTipoVehiculo) {
  return {
    ...formatVehiclePayload(v),
    idTipoVehiculo: idTipoVehiculo,
  };
}

export function formatMachinePayload(m) {
  return {
    name: normalizeTitleWords(m.name) ?? '',
    belongsTo: normalizeTitleWords(m.belongsTo) ?? '',
    model: normalizeTitleWords(m.model) ?? '',
    soat: m.soat || null,
    brand: normalizeTitleWords(m.brand) ?? '',
    runt: m.runt || null,
    numEngine: normalizeIdCode(m.numEngine) ?? '',
    numInterIdentification: normalizeIdCode(m.numInterIdentification) ?? '',
    fuelTankCapacityGallons: m.fuelTankCapacityGallons != null && m.fuelTankCapacityGallons !== '' ? Number(m.fuelTankCapacityGallons) : null,
  };
}

export function formatOilBrandPayload(o) {
  return {
    ...o,
    name: normalizeTitleWords(o.name) ?? '',
    type: normalizeUpperToken(o.type) ?? 'MOTOR',
  };
}
