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
  return [...alerts].sort((a, b) => {
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
