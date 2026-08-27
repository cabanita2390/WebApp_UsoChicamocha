export function createConsolidadoActions({ update, setLoading, setError, fetchWithAuth }) {
    return {
        // Consolidado
        fetchConsolidadoData: async () => {
            setLoading(true);
            try {
                console.log('\ud83d\udcca [CONSOLIDADO] Refrescando datos del consolidado...');
                const result = await fetchWithAuth('oil-changes/consolidated', { version: null });
                const dataToStore = Array.isArray(result?.content) ? result.content : (Array.isArray(result) ? result : []);
                const norm = (s) =>
                    String(s ?? '')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                const consolidatedData = {
                    distrito: dataToStore.filter((item) => norm(item?.machine?.belongsTo) === 'distrito'),
                    asociacion: dataToStore.filter((item) => norm(item?.machine?.belongsTo) === 'asociacion'),
                };
                console.log('\u2705 [CONSOLIDADO] Datos refrescados:', consolidatedData);
                update(s => ({ ...s, consolidated: consolidatedData, isLoading: false, error: null }));
                return consolidatedData;
            } catch (err) {
                console.error('\u274c [CONSOLIDADO] Error al refrescar:', err.message);
                setError(err.message);
                throw err;
            }
        },
    };
}
