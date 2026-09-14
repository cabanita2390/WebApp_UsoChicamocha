import { validateDocumentFileSize } from '@/lib/fileValidation.js';

export function normLower(s) {
  return String(s ?? '').trim().toLowerCase();
}

export function normalizeBelongsTo(value) {
  if (!value) return 'Distrito';
  const trimmed = String(value).trim().toLowerCase();
  if (trimmed === 'asociacion') return 'Asociación';
  if (trimmed === 'asociación') return 'Asociación';
  return 'Distrito';
}

/** Filas antiguas: a veces se persistió el toString() del principal (UserPrincipal[id=…, username=…]). */
export function formatSubidoPor(val) {
  if (val == null || String(val).trim() === '') return '—';
  const s = String(val).trim();
  if (s.startsWith('UserPrincipal[')) {
    const m = s.match(/username=([^,\]]+)/);
    if (m) return m[1];
  }
  return s;
}

/** Texto mostrado en el control estilo "Examinar…" de documentos. */
export function filePickLabel(fileList) {
  if (!fileList || fileList.length === 0) return 'Ningún archivo';
  return fileList[0].name;
}

export function locationLabel(loc) {
  return loc?.name ?? loc?.nombre ?? '';
}

/** Devuelve el primer error de tamaño entre las listas de archivos de documentos dadas, o null si todas pasan. */
export function firstOversizedDocError(fileLists) {
  for (const fileList of fileLists) {
    const f = fileList && fileList.length ? fileList[0] : null;
    const err = validateDocumentFileSize(f);
    if (err) return err;
  }
  return null;
}
