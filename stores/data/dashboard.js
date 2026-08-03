export function createDashboardActions({ fetchPaginated, fetchWithAuth, BASE_URL }) {
    return {
        // Dashboard
        fetchDashboardData: (page = 0, size = 20) => fetchPaginated('dashboard', 'inspection', page, size),
        fetchInspectionImages: async (inspectionId) => {
            try {
                // 1. Llama a la API con auth
                const images = await fetchWithAuth(`inspection/${inspectionId}/images`);

                if (!images || !Array.isArray(images)) {
                    return []; // Devuelve un array vacío si no hay imágenes
                }

                // 2. Transforma el array para construir la URL completa
                const imagesWithFullUrl = images.map(image => ({
                    ...image, // Mantiene otras propiedades que pueda tener el objeto (id, name, etc.)
                    // Concatena la URL base con la URL relativa de la imagen.
                    // Normaliza para evitar doble slash
                    url: `${BASE_URL.replace(/\/$/, '')}/${image.url.replace(/^\//, '')}`
                }));

                // 3. Devuelve el nuevo array con las URLs completas
                return imagesWithFullUrl;

            } catch (err) {
                console.error("Error fetching or processing inspection images:", err);
                throw err;
            }
        },
    };
}
