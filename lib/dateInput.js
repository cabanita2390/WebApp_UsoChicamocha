/**
 * Convierte dd/mm/yyyy a yyyy-mm-dd (formato ISO)
 * @param {string} dateStr - Formato dd/mm/yyyy
 * @returns {string|null} Formato yyyy-mm-dd o null si es inválido
 */
export function ddmmyyyyToIso(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;

  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1) return null;

  const isoDay = String(day).padStart(2, '0');
  const isoMonth = String(month).padStart(2, '0');
  return `${year}-${isoMonth}-${isoDay}`;
}

/**
 * Convierte yyyy-mm-dd a dd/mm/yyyy
 * @param {string} isoStr - Formato yyyy-mm-dd
 * @returns {string} Formato dd/mm/yyyy
 */
export function isoToDdmmyyyy(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return '';

  const parts = isoStr.split('-');
  if (parts.length !== 3) return '';

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  return `${day}/${month}/${year}`;
}

/**
 * Aplica máscara y validación a input de fecha
 * @param {Event} event - Evento del input
 * @returns {string} Valor formateado
 */
export function formatDateInput(event) {
  let value = event.target.value.replace(/[^\d]/g, '');

  if (value.length >= 2 && value.length <= 4 && !value.includes('/')) {
    value = value.slice(0, 2) + '/' + value.slice(2);
  } else if (value.length >= 5) {
    value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
  }

  return value;
}

/**
 * Valida si una cadena está en formato dd/mm/yyyy válido
 * @param {string} dateStr - Cadena a validar
 * @returns {boolean} true si es válido
 */
export function isValidDateFormat(dateStr) {
  return ddmmyyyyToIso(dateStr) !== null;
}
