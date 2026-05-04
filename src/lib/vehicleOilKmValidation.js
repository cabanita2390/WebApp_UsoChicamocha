/**
 * Validación de km en cambio de aceite: no menor al km actual del vehículo
 * (regla de negocio + coherencia con GET /vehicle-inspection/validar-kilometraje).
 */

export function assertOilChangeKmNotBelowVehicleCurrent(kmCambioAceite, kmActualVehiculo) {
  const km = Number(kmCambioAceite);
  const actual = Number(kmActualVehiculo ?? 0);
  if (!Number.isFinite(km) || km <= 0) {
    throw new Error('Indique el kilometraje en el que se realizó el cambio de aceite.');
  }
  if (actual > 0 && km < actual) {
    throw new Error(
      `El km del cambio (${km.toLocaleString('es-CO')}) no puede ser menor al km actual del vehículo (${actual.toLocaleString('es-CO')}).`,
    );
  }
}

/**
 * @param {(placa: string, km: number) => Promise<{ alerta?: boolean, mensaje?: string }>} validateVehicleKilometraje
 */
export async function assertOilChangeKmBackendAllows(validateVehicleKilometraje, placa, kmCambioAceite) {
  const res = await validateVehicleKilometraje(placa, Math.floor(Number(kmCambioAceite)));
  if (res?.alerta) {
    throw new Error(res.mensaje || 'El kilometraje no es válido respecto al registro del vehículo.');
  }
}
