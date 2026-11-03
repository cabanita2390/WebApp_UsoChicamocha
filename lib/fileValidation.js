/**
 * Límite alineado con el backend (spring.servlet.multipart.max-file-size=15MB).
 * Validar aquí evita que un archivo grande dispare un 413 en el proxy del VPS,
 * que el navegador reporta como error de CORS por no traer cabeceras CORS.
 */
export const MAX_DOCUMENT_FILE_SIZE_MB = 15;
const MAX_DOCUMENT_FILE_SIZE_BYTES = MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;

/** Devuelve un mensaje de error si el archivo excede el límite, o null si es válido. */
export function validateDocumentFileSize(file) {
  if (file && file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return `El archivo "${file.name}" pesa ${sizeMb}MB; el máximo permitido es ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`;
  }
  return null;
}
