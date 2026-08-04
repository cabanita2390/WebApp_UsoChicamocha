import { normalizePlaca, normalizeFreeTextPreserveCase } from '../../src/lib/textFormat.js';
import { validateDocumentFileSize } from '../../src/lib/fileValidation.js';

export function createVehicleMaintenanceActions({ fetchWithAuth }) {
    return {
        // Mantenimiento y Documentación Vehículos
        registerVehicleOilChange: async (oilData) => {
            const body = {
                ...oilData,
                placa: normalizePlaca(oilData.placa),
                oilType: normalizeFreeTextPreserveCase(oilData.oilType) ?? oilData.oilType,
            };
            await fetchWithAuth('vehicle/oil-change', { method: 'POST', body: JSON.stringify(body) });
        },
        fetchVehicleOilHistory: async (placa) => {
            try {
                const p = normalizePlaca(placa);
                const result = await fetchWithAuth(`vehicle/oil-change/history/${encodeURIComponent(p)}`);
                return Array.isArray(result) ? result : [];
            } catch (err) {
                throw err;
            }
        },
        // Editar/eliminar un cambio de aceite ya registrado ("en caso de error") —
        // cubre tanto vehículos como motos, mismo endpoint (viven en vehiculos).
        updateVehicleOilChange: async (id, oilData) => {
            const body = {
                ...oilData,
                placa: normalizePlaca(oilData.placa),
                oilType: normalizeFreeTextPreserveCase(oilData.oilType) ?? oilData.oilType,
            };
            await fetchWithAuth(`vehicle/oil-change/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        },
        deleteVehicleOilChange: async (id) => {
            await fetchWithAuth(`vehicle/oil-change/${id}`, { method: 'DELETE' });
        },
        // Las motos viven en la misma tabla `vehiculos` que los carros — no existe
        // una ruta separada en el backend para su historial de aceite, se reutiliza
        // el mismo endpoint de vehículo con la placa de la moto.
        fetchMotoOilHistory: async (placa) => {
            try {
                const p = normalizePlaca(placa);
                const result = await fetchWithAuth(`vehicle/oil-change/history/${encodeURIComponent(p)}`);
                return Array.isArray(result) ? result : [];
            } catch (err) {
                throw err;
            }
        },
        updateVehicleDocument: async (docData) => {
            await fetchWithAuth('admin/documents', { method: 'POST', body: JSON.stringify(docData) });
        },
        /**
         * Sube PDF o imagen y registra vigencia (multipart).
         * @param {{ idVehiculo: number, tipoDocumento: string, fechaVencimiento: string, file: File }} payload
         */
        uploadVehicleDocumentFile: async (payload) => {
            const { idVehiculo, tipoDocumento, fechaVencimiento, file } = payload;
            const sizeError = validateDocumentFileSize(file);
            if (sizeError) throw new Error(sizeError);
            const form = new FormData();
            form.append('file', file);
            form.append('idVehiculo', String(idVehiculo));
            form.append('tipoDocumento', tipoDocumento);
            if (fechaVencimiento) {
                form.append('fechaVencimiento', fechaVencimiento);
            }
            await fetchWithAuth('admin/documents/upload', { method: 'POST', body: form });
        },
        getVehicleDocuments: (idVehiculo) => fetchWithAuth(`vehicle-inspection/documentos/${idVehiculo}`),
        getVehicleDocumentHistory: (idVehiculo) =>
            fetchWithAuth(`vehicle-inspection/documentos/${idVehiculo}/history`),

    };
}
