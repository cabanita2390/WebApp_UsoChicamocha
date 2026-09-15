export const SEVERITY_LEVELS = {
  CRITICAL: { level: 0, name: 'Crítico', color: 'ROJO' },
  WARNING: { level: 1, name: 'Advertencia', color: 'AMARILLO' },
  INFO: { level: 2, name: 'Informativo', color: 'VERDE' }
};

export const SEVERITY_ORDER = {
  'ROJO': SEVERITY_LEVELS.CRITICAL.level,
  'AMARILLO': SEVERITY_LEVELS.WARNING.level,
  'VERDE': SEVERITY_LEVELS.INFO.level
};

export function getSeverityLevel(colorEstado) {
  return SEVERITY_ORDER[colorEstado] ?? 999;
}

export function getSeverityInfo(colorEstado) {
  const entries = Object.entries(SEVERITY_LEVELS);
  return entries.find(([, info]) => info.color === colorEstado)?.[1] || SEVERITY_LEVELS.INFO;
}

export function sortAlertsBySeverity(alerts) {
  const typeOrder = {
    'DOCUMENTO_TECNOMECANICA': 0,
    'DOCUMENTO_SOAT': 0,
    'DOCUMENTO_EXTINTOR': 0,
    'CAMBIO_ACEITE_VEHICULO': 1,  // Vehículos segundo
    'CAMBIO_ACEITE_MAQUINARIA': 2   // Máquinas al final
  };

  return [...alerts].sort((a, b) => {
    // Primero ordenar por tipo de alerta
    const typeOrderA = typeOrder[a.tipoAlerta] ?? 999;
    const typeOrderB = typeOrder[b.tipoAlerta] ?? 999;

    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }

    // Si son del mismo tipo, ordenar por severidad (ROJO, AMARILLO, VERDE)
    const severityA = getSeverityLevel(a.colorEstado);
    const severityB = getSeverityLevel(b.colorEstado);
    return severityA - severityB;
  });
}

export function sortNotificationsBySeverity(notifications) {
  const severityMap = {
    'error': 0,
    'warning': 1,
    'success': 2,
    'info': 2
  };

  return [...notifications].sort((a, b) => {
    const severityA = severityMap[a.type] ?? 999;
    const severityB = severityMap[b.type] ?? 999;
    return severityA - severityB;
  });
}
