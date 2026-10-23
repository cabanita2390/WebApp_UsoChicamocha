import { createAssetCrud } from './assetCrud.js';

export function createMotoActions(deps) {
    /** CRUD motocicletas — GET/POST/PUT/DELETE `/api/v1/moto` (tipo MOTOCICLETA forzado en servidor). */
    const crud = createAssetCrud(
        { entity: 'moto', endpoint: 'moto', loadingKey: 'isLoadingMotos', errorKey: 'errorMotos' },
        deps,
    );
    return {
        fetchMotos: crud.fetchAll,
        createMoto: crud.create,
        updateMoto: crud.update,
        deleteMoto: crud.remove,
        restoreMoto: crud.restore,
    };
}
