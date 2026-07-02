export function fmtCurrency(v) {
  if (v == null) return '—';
  return `$${Number(v).toLocaleString('es-CO')}`;
}

export function fmtNum(v, d = 2) {
  if (v == null) return '—';
  return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function fmtEfficiency(r) {
  if (!r.efficiencyValue) return '—';
  const unit = r.efficiencyUnit === 'KM_PER_GALLON' ? 'km/Gal'
             : r.efficiencyUnit === 'GALLON_PER_HOUR' ? 'Gal/h'
             : r.efficiencyUnit === 'KM_PER_LITER' ? 'km/L' : 'L/h';
  return `${fmtNum(r.efficiencyValue, 2)} ${unit}`;
}
