// Almacenar IDs de notificaciones ya mostradas para evitar duplicados
const shownNotifications = new Set();
const NOTIFICATION_CACHE_TIME = 3600000; // 1 hora

/**
 * Genera notificaciones para documentos próximos a vencer
 * Identifica SOAT, Tecno, Licencia y otros documentos en estado "Regular"
 */
export function checkExpiringDocuments(vehicles, motos, machines, addNotification) {
  if (!addNotification) return;

  let hasNotifications = false;

  // Verificar vehículos - PRIMERO VENCIDOS, LUEGO PRÓXIMOS
  if (Array.isArray(vehicles)) {
    vehicles.forEach((v) => {
      // Vencidos (prioridad alta - rojo)
      if (checkDocumentExpired(v, 'SOAT', 'soat', v.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkDocumentExpired(v, 'Tecno', 'tecno', v.placa, addNotification)) {
        hasNotifications = true;
      }
      // Próximos a vencer (prioridad normal - amarillo)
      if (checkDocumentStatus(v, 'SOAT', 'soat', v.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkDocumentStatus(v, 'Tecno', 'tecno', v.placa, addNotification)) {
        hasNotifications = true;
      }
      // Vencidos (prioridad alta - rojo)
      if (checkFireExtinguisherExpired(v, 'extintor', v.placa, addNotification)) {
        hasNotifications = true;
      }
      // Próximos a vencer (prioridad normal - amarillo)
      if (checkFireExtinguisherStatus(v, 'extintor', v.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkOilChangeStatus(v, 'oil', v.placa, addNotification)) {
        hasNotifications = true;
      }
    });
  }

  // Verificar motos - PRIMERO VENCIDOS, LUEGO PRÓXIMOS
  if (Array.isArray(motos)) {
    motos.forEach((m) => {
      // Vencidos (prioridad alta - rojo)
      if (checkDocumentExpired(m, 'SOAT', 'soat', m.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkDocumentExpired(m, 'Tecno', 'tecno', m.placa, addNotification)) {
        hasNotifications = true;
      }
      // Próximos a vencer (prioridad normal - amarillo)
      if (checkDocumentStatus(m, 'SOAT', 'soat', m.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkDocumentStatus(m, 'Tecno', 'tecno', m.placa, addNotification)) {
        hasNotifications = true;
      }
      // Vencidos (prioridad alta - rojo)
      if (checkFireExtinguisherExpired(m, 'extintor', m.placa, addNotification)) {
        hasNotifications = true;
      }
      // Próximos a vencer (prioridad normal - amarillo)
      if (checkFireExtinguisherStatus(m, 'extintor', m.placa, addNotification)) {
        hasNotifications = true;
      }
      if (checkOilChangeStatus(m, 'oil', m.placa, addNotification)) {
        hasNotifications = true;
      }
    });
  }

  // Verificar máquinas - PRIMERO VENCIDOS, LUEGO PRÓXIMOS
  if (Array.isArray(machines)) {
    machines.forEach((m) => {
      // SOAT - Vencidos
      if (m.soat) {
        const notifIdExp = `EXPIRED-machine-soat-${m.id || m.name}`;
        if (!shownNotifications.has(notifIdExp)) {
          const fechaVenc = formatDateForDisplay(m.soat);
          // Asumir vencido si la fecha es pasada
          const today = new Date();
          const docDate = parseDate(m.soat);
          if (docDate && docDate < today) {
            shownNotifications.add(notifIdExp);
            addNotification({
              id: Date.now() + Math.random(),
              text: `🚨 SOAT de ${m.name || 'máquina'} VENCIDO (${fechaVenc}) - Acción inmediata`,
            });
            hasNotifications = true;
          }
        }
      }
      // SOAT - Próximos a vencer
      if (m.soat) {
        const notifId = `machine-soat-${m.id || m.name}`;
        if (!shownNotifications.has(notifId)) {
          const fechaVenc = formatDateForDisplay(m.soat);
          const notifIdExp = `EXPIRED-machine-soat-${m.id || m.name}`;
          if (!shownNotifications.has(notifIdExp)) {
            addNotification({
              id: Date.now() + Math.random(),
              text: `⚠️ SOAT de ${m.name || 'máquina'} próximo a vencer: ${fechaVenc}`,
            });
            shownNotifications.add(notifId);
            hasNotifications = true;
          }
        }
      }
      // Seguro - Vencidos
      if (m.runt) {
        const notifIdExp = `EXPIRED-machine-runt-${m.id || m.name}`;
        if (!shownNotifications.has(notifIdExp)) {
          const fechaVenc = formatDateForDisplay(m.runt);
          const today = new Date();
          const docDate = parseDate(m.runt);
          if (docDate && docDate < today) {
            shownNotifications.add(notifIdExp);
            addNotification({
              id: Date.now() + Math.random(),
              text: `🚨 Seguro de ${m.name || 'máquina'} VENCIDO (${fechaVenc}) - Acción inmediata`,
            });
            hasNotifications = true;
          }
        }
      }
      // Seguro - Próximos a vencer
      if (m.runt) {
        const notifId = `machine-runt-${m.id || m.name}`;
        if (!shownNotifications.has(notifId)) {
          const fechaVenc = formatDateForDisplay(m.runt);
          const notifIdExp = `EXPIRED-machine-runt-${m.id || m.name}`;
          if (!shownNotifications.has(notifIdExp)) {
            addNotification({
              id: Date.now() + Math.random(),
              text: `⚠️ Seguro de ${m.name || 'máquina'} próximo a vencer: ${fechaVenc}`,
            });
            shownNotifications.add(notifId);
            hasNotifications = true;
          }
        }
      }
    });
  }

  return hasNotifications;
}

function checkDocumentExpired(asset, docType, docKey, identifier, addNotification) {
  const doc = asset[docKey];
  if (!doc) return false;

  // Verificar si está VENCIDO (estado "Malo" o diasRestantes <= 0)
  const estado = String(doc.estado || '').toLowerCase();
  const diasRestantes = doc.diasRestantes || 0;

  if (estado.includes('malo') || estado.includes('vencido') || diasRestantes <= 0) {
    const fechaVenc = formatDateForDisplay(doc.fechaVencimiento);
    const notificationId = `EXPIRED-${identifier}-${docType}-${doc.fechaVencimiento}`;

    if (!shownNotifications.has(notificationId)) {
      shownNotifications.add(notificationId);
      addNotification({
        id: Date.now() + Math.random(),
        text: `🚨 ${docType} de ${identifier} VENCIDO (${fechaVenc}) - Acción inmediata`,
      });
      return true;
    }
  }
  return false;
}

function checkDocumentStatus(asset, docType, docKey, identifier, addNotification) {
  const doc = asset[docKey];
  if (!doc) return false;

  // Verificar si está en estado "Regular" (próximo a vencer)
  if (doc.estado && String(doc.estado).toLowerCase().includes('regular')) {
    const fechaVenc = formatDateForDisplay(doc.fechaVencimiento);
    const diasRestantes = doc.diasRestantes || '?';
    const notificationId = `${identifier}-${docType}-${doc.fechaVencimiento}`;

    // Evitar duplicados
    if (!shownNotifications.has(notificationId)) {
      shownNotifications.add(notificationId);
      addNotification({
        id: Date.now() + Math.random(),
        text: `⚠️ ${docType} de ${identifier} vence en ${diasRestantes} días (${fechaVenc})`,
      });
      return true;
    }
  }
  return false;
}

function checkFireExtinguisherExpired(asset, extintorKey, identifier, addNotification) {
  const extintor = asset[extintorKey];
  if (!extintor) return false;

  // El extintor se vence el primer día del mes
  // Si estamos en el mes de vencimiento o después, está vencido
  const estado = String(extintor.estado || '').toLowerCase();

  if (estado.includes('vencido')) {
    const fechaVenc = formatDateForDisplay(extintor.fechaVencimiento);
    const notificationId = `EXPIRED-${identifier}-extintor-${extintor.fechaVencimiento}`;

    if (!shownNotifications.has(notificationId)) {
      shownNotifications.add(notificationId);
      addNotification({
        id: Date.now() + Math.random(),
        text: `🚨 EXTINTOR de ${identifier} VENCIDO (${fechaVenc}) - Acción inmediata`,
      });
      return true;
    }
  }
  return false;
}

function checkFireExtinguisherStatus(asset, extintorKey, identifier, addNotification) {
  const extintor = asset[extintorKey];
  if (!extintor) return false;

  // Verificar si está en estado "Próximo a Vencer" (falta 1 mes para que se venza)
  if (extintor.estado) {
    const estado = String(extintor.estado).toLowerCase();
    if (estado.includes('proximo') || estado.includes('próximo')) {
      const fechaVenc = formatDateForDisplay(extintor.fechaVencimiento);
      const notificationId = `${identifier}-extintor-${extintor.fechaVencimiento}`;

      // Evitar duplicados
      if (!shownNotifications.has(notificationId)) {
        shownNotifications.add(notificationId);
        addNotification({
          id: Date.now() + Math.random(),
          text: `🧯 EXTINTOR de ${identifier} vence próximo mes (${fechaVenc}) - Revisión preventiva`,
        });
        return true;
      }
    }
  }
  return false;
}

function checkOilChangeStatus(asset, oilKey, identifier, addNotification) {
  const oil = asset[oilKey];
  if (!oil) return false;

  // Verificar si está en estado "Regular" o "Próximo a cambiar"
  const estado = String(oil.estado || '').toLowerCase();
  if (estado.includes('regular') || estado.includes('proximo') || estado.includes('próximo')) {
    const fechaProxima = formatDateForDisplay(oil.proximaFecha || oil.proxima_fecha);
    const kmProximo = oil.kmProximoCambio || oil.km_proximo_cambio;
    const notificationId = `${identifier}-oil-change-${fechaProxima}`;

    if (!shownNotifications.has(notificationId)) {
      shownNotifications.add(notificationId);
      let text = `⚠️ Cambio de aceite de ${identifier} próximo`;
      if (fechaProxima && fechaProxima !== 'N/A') {
        text += ` (${fechaProxima})`;
      }
      if (kmProximo) {
        text += ` - ${kmProximo} km`;
      }
      addNotification({
        id: Date.now() + Math.random(),
        text,
      });
      return true;
    }
  }
  return false;
}

function parseDate(dateValue) {
  if (!dateValue) return null;

  // Si es un array [año, mes, día]
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    return new Date(year, month - 1, day);
  }

  // Si es string yyyy-mm-dd
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  return null;
}

function formatDateForDisplay(dateValue) {
  if (!dateValue) return 'N/A';

  // Si es un array [año, mes, día]
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  // Si es string yyyy-mm-dd
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  return String(dateValue);
}
