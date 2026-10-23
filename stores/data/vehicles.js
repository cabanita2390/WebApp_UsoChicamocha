import { createAssetCrud } from './assetCrud.js';

export function createVehicleActions(deps) {
    const crud = createAssetCrud(
        { entity: 'vehicle', endpoint: 'vehicle', loadingKey: 'isLoadingVehicles', errorKey: 'errorVehicles' },
        deps,
    );
    return {
        // Gestión de Vehículos (CRUD)
        fetchVehicles: crud.fetchAll,
        createVehicle: crud.create,
        updateVehicle: crud.update,
        deleteVehicle: crud.remove,
        restoreVehicle: crud.restore,
    };
}
