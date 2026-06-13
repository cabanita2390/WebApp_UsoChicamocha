import { writable, get } from 'svelte/store';
import { auth } from '../stores/auth.js';
import { data } from '../stores/data.js';
import { ui, addNotification, addPreventiveAlert } from '../stores/ui.js';

// Import SockJS and STOMP for browser environment
import SockJS from 'sockjs-client';
import { Client as StompClient } from '@stomp/stompjs';

// WebSocket configuration
const WS_CONFIG = {
  protocol: window.location.protocol === 'https:' ? 'https:' : 'http:',
  host: window.location.hostname,
  port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
  path: '/ws',
  reconnectDelay: 5000,
  heartbeatDelay: 30000
};

// Notification topics (STOMP subscriptions from backend)
const NOTIFICATION_TOPICS = {
  INSPECTION: '/topic/notifications/inspection',
  DATA_UPDATE: '/topic/notifications/data-update',
  OIL_CHANGE: '/topic/notifications/oil-change',
  CONNECTION: '/topic/notifications/connection',
  SOAT_RUNT: '/topic/notifications/soat-runt',
  ALERTS: '/topic/alerts'
};

// Notification types
export const NOTIFICATION_TYPES = {
  INSPECTION: 'inspection',
  DATA_UPDATE: 'data-update',
  SOAT_RUNT: 'soat-runt',
  OIL_CHANGE: 'oil-change'
};

// WebSocket notification service store
export const wsNotificationService = writable({
  isConnected: false,
  connection: null,
  stompClient: null,
  type: 'sockjs-stomp',
  isReconnecting: false,
  subscriptions: new Map(),
  connectionStats: {
    connectTime: null,
    reconnectAttempts: 0,
    messageCount: 0,
    lastError: null
  }
});

// WebSocket sound activation state store
export const soundNeedsActivation = writable(true);

// Set sound activation status (WebSocket)
export function setWebSocketSoundNeedsActivation(needsActivation) {
  soundNeedsActivation.set(needsActivation);
  console.log(`🔊 [WEBSOCKET] Estado de activación de sonido actualizado: ${!needsActivation ? 'ACTIVADO' : 'REQUIERE ACTIVACIÓN'}`);
}

// WebSocket connections - PERSISTENT
let sockJSConnection = null;
let stompClient = null;
let heartbeatIntervalId = null;
let messageCount = 0; // Local counter para evitar actualizar store constantemente
let isConnecting = false; // 🔴 NUEVO: Flag para evitar múltiples conexiones simultáneas

// Audio context for WebSocket sounds
let audioCtx = null;

// WebSocket URL builder
function buildWebSocketUrl() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  // Use the backend URL from environment variables
  // SockJS expects HTTP/HTTPS URLs (not ws:// or wss://)
  const baseUrl = BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const wsPath = '/ws';
  
  return `${baseUrl}${wsPath}`;
}

// Initialize WebSocket notifications with SockJS + STOMP
export function initializeWebSocketNotifications() {
  const token = localStorage.getItem('accessToken');
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(`🚀 [WEBSOCKET] === INICIO DE INICIALIZACIÓN SOCKJS + STOMP === ${timestamp}`);
  console.log(`🚀 [WEBSOCKET] Token disponible: ${token ? 'SÍ' : 'NO'}`);
  console.log(`🚀 [WEBSOCKET] WebSocket URL: ${buildWebSocketUrl()}`);
  console.log(`🚀 [WEBSOCKET] 🔍 URL ACTUAL: ${buildWebSocketUrl()} (usando backend URL desde environment)`);
  console.log(`🚀 [WEBSOCKET] Auth state: ${get(auth).isAuthenticated ? 'AUTENTICADO' : 'NO AUTENTICADO'}`);
  console.log(`🚀 [WEBSOCKET] 🧪 MODO DEBUG HABILITADO`);
  
  if (!token) {
    console.warn("❌ [WEBSOCKET] No se puede inicializar: falta el token.");
    return;
  }

  connectSockJS(token);
  activateSound();
  console.log(`🚀 [WEBSOCKET] === INICIALIZACIÓN COMPLETA === ${timestamp}`);
}

// Debug connection status - solo errores y eventos críticos
function logConnectionStatus(event, data) {
  // Solo log eventos críticos y errores para evitar spam
  const criticalEvents = ['STOMP_CONNECT', 'STOMP_DISCONNECT', 'STOMP_ERROR', 'STOMP_PROTOCOL_ERROR', 'SOCKJS_ERROR', 'SOCKJS_CLOSE'];
  if (criticalEvents.includes(event)) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [WEBSOCKET] [${timestamp}] ${event}:`, data);
  }
}

// 🔴 NUEVO: Limpiar todas las subscriptions activas
function cleanupSubscriptions() {
  wsNotificationService.update(state => {
    if (state.subscriptions && state.subscriptions.size > 0) {
      console.log(`🧹 [WEBSOCKET] Limpiando ${state.subscriptions.size} subscriptions activas...`);

      // Unsubscribe de cada topic
      state.subscriptions.forEach((subscription, topic) => {
        try {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe();
            console.log(`✅ [WEBSOCKET] Unsubscribed de: ${topic}`);
          }
        } catch (error) {
          console.warn(`⚠️ [WEBSOCKET] Error al unsubscribir de ${topic}:`, error);
        }
      });

      // Limpiar el Map
      state.subscriptions.clear();
    }
    return state;
  });
}

// WebSocket connection with SockJS + STOMP - DEBUG VERSION
function connectSockJS(token) {
  console.log("🚀 [WEBSOCKET] Iniciando conexión SockJS + STOMP con DEBUG...");

  // 🔴 NUEVO: Si ya está conectado, NO reconectar
  if (stompClient && stompClient.connected && sockJSConnection && sockJSConnection.readyState === 1) {
    console.log("✅ [WEBSOCKET] Ya está conectado, ignorando nueva conexión");
    return;
  }

  // 🔴 NUEVO: Si ya está intentando conectar, NO iniciar otra conexión
  if (isConnecting) {
    console.log("⏳ [WEBSOCKET] Ya hay una conexión en progreso, ignorando");
    return;
  }

  isConnecting = true;

  // IMPORTANTE: Limpiar conexiones anteriores SOLO si están realmente desconectadas
  if (stompClient && stompClient.connected) {
    console.log("⚠️ [WEBSOCKET] Desconectando cliente STOMP anterior...");
    stompClient.deactivate();
  }
  if (sockJSConnection && sockJSConnection.readyState === 1) {
    console.log("⚠️ [WEBSOCKET] Cerrando conexión SockJS anterior...");
    sockJSConnection.close();
  }
  stompClient = null;
  sockJSConnection = null;

  const wsUrl = buildWebSocketUrl();

  // Step 1: Test SockJS connection first
  sockJSConnection = new SockJS(wsUrl);
  
  // Step 2: Monitor SockJS connection events
  sockJSConnection.onopen = function() {
    logConnectionStatus("SOCKJS_OPEN", "SockJS conexión abierta exitosamente");
  };
  
  sockJSConnection.onmessage = function(event) {
    logConnectionStatus("SOCKJS_MESSAGE", {
      data: event.data,
      type: typeof event.data
    });
  };
  
  sockJSConnection.onerror = function(error) {
    logConnectionStatus("SOCKJS_ERROR", error);
    updateConnectionError(`SockJS Error: ${error}`);
  };
  
  sockJSConnection.onclose = function(event) {
    logConnectionStatus("SOCKJS_CLOSE", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
  };
  
  // Step 3: Create STOMP client with CORS fixes
  stompClient = new StompClient({
    webSocketFactory: function() {
      return sockJSConnection;
    },
    connectHeaders: {
      'Authorization': `Bearer ${token}`
    },
    // CORS CONFIGURATION TO FIX BLOCKED REQUEST
    forceJSONP: false,
    checkOrigin: false,
    // Disable debug logging to prevent console spam
    debug: function (str) {
      // Silenciar debug de STOMP - causa spam en consola
      // Solo log en desarrollo y solo errores críticos
      if (str.includes('ERROR') || str.includes('error')) {
        console.warn('STOMP DEBUG:', str);
      }
    },
    onConnect: (frame) => {
      logConnectionStatus("STOMP_CONNECT", "Conectado exitosamente a STOMP");
      console.log(`✅ [WEBSOCKET] Conectado STOMP`);

      isConnecting = false; // 🔴 NUEVO: Marcar que ya no está conectando
      updateConnectionStatus(true);
      subscribeToAllTopics();

      // NO enviar ping inicial - STOMP maneja su propio heartbeat
      // sendPing();

      // NO iniciar heartbeat manual - STOMP + SockJS manejan reconnection automáticamente
      // startHeartbeat();
    },
    onError: (error) => {
      logConnectionStatus("STOMP_ERROR", error);
      console.error('❌ [WEBSOCKET] Error de conexión STOMP:', error);

      isConnecting = false; // 🔴 NUEVO: Marcar que no está conectando
      // 🔴 NUEVO: Limpiar subscriptions en error
      cleanupSubscriptions();

      updateConnectionError(`STOMP Error: ${JSON.stringify(error)}`);
      // NO llamar handleConnectionError() aquí - evitar loops
      // handleConnectionError();
    },
    onDisconnect: (frame) => {
      logConnectionStatus("STOMP_DISCONNECT", frame);
      console.log('🔌 [WEBSOCKET] Conexión STOMP cerrada:', frame);

      isConnecting = false; // 🔴 NUEVO: Marcar que no está conectando
      // 🔴 NUEVO: Limpiar subscriptions al desconectarse
      cleanupSubscriptions();

      updateConnectionStatus(false);
    },
    onStompError: function(frame) {
      logConnectionStatus("STOMP_PROTOCOL_ERROR", {
        headers: frame.headers,
        body: frame.body
      });
      console.error('❌ [WEBSOCKET] Error de protocolo STOMP:', frame);
      updateConnectionError(`Protocolo STOMP Error: ${frame.body}`);
    }
  });
  
  // Step 4: Activate with error handling
  try {
    stompClient.activate();
  } catch (error) {
    console.error('❌ [WEBSOCKET] Error activando cliente STOMP:', error);
    updateConnectionError(`Activación STOMP Error: ${error.message}`);
  }
}

// Update connection status with error tracking
function updateConnectionStatus(isConnected, isReconnecting = false) {
  wsNotificationService.update(state => {
    // Solo log si el estado realmente cambió
    if (state.isConnected !== isConnected || state.isReconnecting !== isReconnecting) {
      console.log(`📊 [WEBSOCKET] Estado actualizado - Conectado: ${isConnected}, Reconectando: ${isReconnecting}`);
    }
    return {
      ...state,
      isConnected: isConnected,
      connection: sockJSConnection,
      stompClient: stompClient,
      isReconnecting: isReconnecting,
      connectionStats: {
        ...state.connectionStats,
        connectTime: isConnected ? new Date().toISOString() : state.connectionStats.connectTime,
        lastError: isConnected ? null : state.connectionStats.lastError
      }
    };
  });
}

// Update connection error
function updateConnectionError(error) {
  console.error('💥 [WEBSOCKET] Error registrado:', error);
  
  wsNotificationService.update(state => ({
    ...state,
    connectionStats: {
      ...state.connectionStats,
      lastError: error
    }
  }));
}

// Subscribe to all notification topics
function subscribeToAllTopics() {
  console.log("📡 [WEBSOCKET] Suscribiéndose a todos los topics STOMP...");
  
  const subscriptions = [
    {
      topic: NOTIFICATION_TOPICS.INSPECTION,
      type: NOTIFICATION_TYPES.INSPECTION,
      handler: handleInspectionMessage
    },
    {
      topic: NOTIFICATION_TOPICS.DATA_UPDATE,
      type: NOTIFICATION_TYPES.DATA_UPDATE,
      handler: handleDataUpdateMessage
    },
    {
      topic: NOTIFICATION_TOPICS.OIL_CHANGE,
      type: NOTIFICATION_TYPES.OIL_CHANGE,
      handler: handleOilChangeMessage
    },
    {
      topic: NOTIFICATION_TOPICS.SOAT_RUNT,
      type: NOTIFICATION_TYPES.SOAT_RUNT,
      handler: handleSoatRuntMessage
    },
    {
      topic: NOTIFICATION_TOPICS.CONNECTION,
      type: 'connection',
      handler: handleConnectionMessage
    },
    {
      topic: NOTIFICATION_TOPICS.ALERTS,
      type: 'alert',
      handler: handleAlertMessage
    }
  ];
  
  subscriptions.forEach(sub => {
    subscribeToTopic(sub.topic, sub.handler);
  });
}

// Subscribe to a specific topic
function subscribeToTopic(topic, handler) {
  if (!stompClient || !stompClient.connected) {
    console.warn(`⚠️ [WEBSOCKET] No se puede suscribir a ${topic}: cliente no conectado`);
    return;
  }
  
  console.log(`📡 [WEBSOCKET] Suscribiéndose a topic: ${topic}`);
  
  try {
    const subscription = stompClient.subscribe(topic, (message) => {
      logConnectionStatus("STOMP_MESSAGE", {
        topic: topic,
        body: message.body,
        headers: message.headers
      });
      console.log(`📨 [WEBSOCKET] Mensaje recibido en ${topic}:`, message.body);
      handleMessage(topic, message.body, handler);
    });
    
    // Store subscription
    wsNotificationService.update(state => {
      state.subscriptions.set(topic, subscription);
      return state;
    });
    
    logConnectionStatus("STOMP_SUBSCRIBE_SUCCESS", topic);
    
  } catch (error) {
    console.error(`❌ [WEBSOCKET] Error suscribiendo a ${topic}:`, error);
    logConnectionStatus("STOMP_SUBSCRIBE_ERROR", {
      topic: topic,
      error: error.message
    });
  }
}

// Send ping message
function sendPing() {
  console.log("🏓 [WEBSOCKET] Enviando ping de confirmación...");
  sendWebSocketMessage('/app/ping', { 
    timestamp: Date.now(),
    client: 'frontend'
  });
}

// Send message via STOMP
function sendWebSocketMessage(destination, body) {
  if (!stompClient || !stompClient.connected) {
    console.warn(`⚠️ [WEBSOCKET] No se puede enviar mensaje a ${destination}: cliente no conectado`);
    return;
  }
  
  console.log(`📤 [WEBSOCKET] Enviando mensaje STOMP a ${destination}:`, body);
  try {
    stompClient.publish({
      destination: destination,
      body: JSON.stringify(body),
      headers: {}
    });
    logConnectionStatus("STOMP_PUBLISH_SUCCESS", destination);
  } catch (error) {
    console.error(`❌ [WEBSOCKET] Error enviando mensaje:`, error);
    logConnectionStatus("STOMP_PUBLISH_ERROR", {
      destination: destination,
      error: error.message
    });
  }
}

// Handle different message types
function handleMessage(topic, messageBody, handler) {
  try {
    let message = messageBody;

    // Try to parse as JSON, but handle plain strings gracefully
    if (typeof messageBody === 'string' && messageBody.trim()) {
      try {
        // Try JSON parsing first
        message = JSON.parse(messageBody);
      } catch (jsonError) {
        // If JSON parsing fails, treat as plain string
        message = messageBody;
      }
    }

    handler(message);

    // Incrementar contador local (evita actualizar store constantemente)
    messageCount++;

    // Actualizar stats en el store cada 10 mensajes para reducir actualización
    if (messageCount % 10 === 0) {
      wsNotificationService.update(state => ({
        ...state,
        connectionStats: {
          ...state.connectionStats,
          messageCount: messageCount
        }
      }));
    }

  } catch (error) {
    console.error(`❌ [WEBSOCKET] Error procesando mensaje:`, error);
  }
}

// Message handlers
function handleInspectionMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') {
    return;
  }

  const machineInfo = message.machine ?
    `${message.machine.name} ${message.machine.model}` :
    'una máquina';

  addNotification({
    id: message.UUID || message.id || Date.now(),
    text: `¡IMPREVISTO EN ${machineInfo}!`
  });

  playNotificationSound();

  // Auto-refresh dashboard if on inspection view
  const currentView = get(ui).currentView;

  if (currentView === 'dashboard') {
    const dataState = get(data);
    data.fetchDashboardData(dataState.dashboard.currentPage, dataState.dashboard.pageSize);
  }
}

function handleDataUpdateMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') {
    return;
  }

  const currentView = get(ui).currentView;
  const updateType = message.type || message;

  handleDataUpdate(currentView, updateType);
}

function handleOilChangeMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') {
    return;
  }

  addNotification({
    id: message.id || Date.now(),
    text: message.message || 'Notificación de cambio de aceite'
  });
}

function handleSoatRuntMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') {
    return;
  }
  
  addNotification({
    id: message.id || Date.now(),
    text: message.message || 'Notificación SOAT/RUNT'
  });
}

function handleConnectionMessage(message) {
  // Silenciar logs de conexión
}

function handleAlertMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') return;

  let alertData;

  // Si el mensaje es un string, es una notificación regular
  if (typeof message === 'string') {
    addNotification({
      id: Date.now(),
      text: message,
    });
    return;
  }

  // Si viene con propiedades de AlertDTO, es una alerta preventiva
  if (message.tipoAlerta && message.placa) {
    alertData = {
      id: message.id || Date.now(),
      placa: message.placa,
      tipoAlerta: message.tipoAlerta,
      descripcion: message.descripcion,
      fechaVencimiento: message.fechaVencimiento,
      fechaCreacion: message.fechaCreacion,
      estado: message.estado || 'ACTIVA',
      colorEstado: message.colorEstado || 'AMARILLO'
    };

    addPreventiveAlert(alertData);
  } else {
    // Fallback a notificación regular
    const text = message.message || message.text || 'Alerta del sistema';
    addNotification({
      id: message.id || Date.now(),
      text,
    });
  }
}

// Heartbeat to maintain connection
function startHeartbeat() {
  stopHeartbeat();
  heartbeatIntervalId = setInterval(() => {
    if (stompClient && stompClient.connected) {
      console.log("💓 [WEBSOCKET] Verificando conexión STOMP...");
      sendPing();
    }
  }, WS_CONFIG.heartbeatDelay);
}

// Stop heartbeat
function stopHeartbeat() {
  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
    console.log("🛑 [WEBSOCKET] Heartbeat detenido");
  }
}

// Handle connection errors and reconnection
function handleConnectionError() {
  console.warn("⚠️ [WEBSOCKET] Error de conexión - intentando reconectar...");

  const currentState = get(wsNotificationService);
  const attempts = currentState.connectionStats.reconnectAttempts;

  if (attempts >= 3) {
    console.error("❌ [WEBSOCKET] Máximo número de intentos de reconexión alcanzado. Abandonando.");
    wsNotificationService.update(state => ({
      ...state,
      isReconnecting: false,
      connectionStats: {
        ...state.connectionStats,
        lastError: "Max reconnection attempts exceeded"
      }
    }));
    return;
  }

  wsNotificationService.update(state => ({
    ...state,
    isReconnecting: true,
    connectionStats: {
      ...state.connectionStats,
      reconnectAttempts: state.connectionStats.reconnectAttempts + 1
    }
  }));

  console.log(`🔄 [WEBSOCKET] Intento ${attempts + 1}/3 - Reconectando en ${WS_CONFIG.reconnectDelay}ms...`);

  setTimeout(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log("🔄 [WEBSOCKET] Ejecutando reconexión...");
      connectSockJS(token);
    } else {
      console.warn("⚠️ [WEBSOCKET] No hay token disponible para reconectar");
      wsNotificationService.update(state => ({
        ...state,
        isReconnecting: false
      }));
    }
  }, WS_CONFIG.reconnectDelay);
}

// Handle data updates (same logic as SSE)
function handleDataUpdate(currentView, message) {
  console.log("🔄 [DATA_UPDATE] Manejando actualización para vista:", currentView, "mensaje:", message);
  
  const dataState = get(data);
  console.log("🔄 [DATA_UPDATE] Estado actual de datos:", {
    dashboard: dataState.dashboard?.currentPage,
    workOrders: dataState.workOrders?.currentPage
  });
  
  switch (message) {
    case 'inspections-updated':
      if (currentView === 'dashboard') {
        data.fetchDashboardData(dataState.dashboard.currentPage, dataState.dashboard.pageSize);
      }
      break;
    case 'machines-updated':
      if (currentView === 'machines') {
        data.fetchMachines();
      }
      break;
    case 'users-updated':
      if (currentView === 'users') {
        data.fetchUsers();
      }
      break;
    case 'orders-updated':
      if (currentView === 'work-orders') {
        data.fetchWorkOrders(dataState.workOrders.currentPage, dataState.workOrders.pageSize);
      }
      break;
    case 'oil-changes-updated':
      if (currentView === 'consolidado') {
        data.fetchConsolidadoData();
      }
      break;
    case 'fuel-updated':
      if (currentView === 'fuel') {
        data.fetchFuelLogs(null, null);
        data.fetchFuelDashboard(null, null);
      }
      break;
    case 'oil-change-alert-updated':
      // Refrescar consolidado cuando hay alerta de aceite
      if (currentView === 'consolidado') {
        console.log("🔔 [OIL_CHANGE_ALERT] Refrescando datos de consolidado...");
        data.fetchConsolidadoData();
      }
      break;
    case 'vehicle-inspections-updated':
      if (currentView === 'dashboard') {
        data.fetchVehicleInspections(dataState.vehicleInspections.currentPage, dataState.vehicleInspections.pageSize, { reload: true });
        data.fetchVehicles();
      } else if (currentView === 'vehicles') {
        data.fetchVehicles();
      }
      break;
    case 'moto-inspections-updated':
      if (currentView === 'dashboard') {
        data.fetchMotoInspections();
        data.fetchMotos();
      } else if (currentView === 'moto-inventory') {
        data.fetchMotos();
      }
      break;
  }
}

// Disconnect from WebSocket
export function disconnectFromWebSocket() {
  console.log("🔌 [WEBSOCKET] Cerrando conexión WebSocket...");

  stopHeartbeat();

  // 🔴 ACTUALIZADO: Usar función centralizada de cleanup
  cleanupSubscriptions();

  if (stompClient && stompClient.connected) {
    // Deactivate STOMP client
    stompClient.deactivate();
  }

  stompClient = null;
  sockJSConnection = null;
  
  wsNotificationService.set({
    isConnected: false,
    connection: null,
    stompClient: null,
    type: null,
    isReconnecting: false,
    subscriptions: new Map(),
    connectionStats: {
      connectTime: null,
      reconnectAttempts: 0,
      messageCount: 0,
      lastError: null
    }
  });
  
  console.log("🔌 [WEBSOCKET] Conexión WebSocket cerrada.");
}

// Audio functions - FIXED AUDIO CONTEXT
export function activateSound() {
  console.log("🔊 [AUDIO] Activando contexto de audio WebSocket...");
  
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      console.log("🔊 [AUDIO] Contexto de audio WebSocket activado exitosamente.");
    } catch(e) {
      console.error("❌ [AUDIO] Web Audio API no es soportada:", e.message);
      setWebSocketSoundNeedsActivation(false);
    }
  } else {
    console.log("🔊 [AUDIO] Contexto de audio ya existía, activándolo...");
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log("🔊 [AUDIO] Contexto de audio reanudado.");
      });
    }
  }
}

export function playNotificationSound() {
  console.log("🔊 [AUDIO] Reproduciendo sonido WebSocket LIMPIO Y PROFESIONAL...");
  
  if (!audioCtx) {
    console.warn("⚠️ [AUDIO] El audio debe ser activado por un gesto del usuario.");
    return;
  }
  if (audioCtx.state === "suspended") {
    console.log("🔊 [AUDIO] Reanudando contexto de audio...");
    audioCtx.resume();
  }
  const now = audioCtx.currentTime;
  const duration = 0.8; // Sonido corto y limpio: 0.8 segundos

  // Usar solo 2-3 osciladores de alta calidad con mayor volumen
  const oscillators = [
    { type: "sine", freq: 1200, volume: 0.9 },
    { type: "sine", freq: 1800, volume: 0.7 },
    { type: "triangle", freq: 2400, volume: 0.5 }
  ];

  oscillators.forEach((oscConfig, index) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = oscConfig.type;
    oscillator.frequency.setValueAtTime(oscConfig.freq, now);

    // Envolvente suave y profesional
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(oscConfig.volume, now + 0.05); // Ataque suave
    gainNode.gain.setValueAtTime(oscConfig.volume * 0.8, now + duration * 0.7); // Sostenimiento
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Decay limpio
    
    console.log(`🔊 [AUDIO] Sonido WebSocket ${index + 1} (${oscConfig.type}, ${oscConfig.freq}Hz).`);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  });

  // Añadir un segundo beep más corto para más impacto
  setTimeout(() => {
    const now2 = audioCtx.currentTime;
    const duration2 = 0.3;
    
    const oscillator2 = audioCtx.createOscillator();
    const gainNode2 = audioCtx.createGain();

    oscillator2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);

    oscillator2.type = "sine";
    oscillator2.frequency.setValueAtTime(2000, now2);
    oscillator2.frequency.linearRampToValueAtTime(1500, now2 + duration2);

    gainNode2.gain.setValueAtTime(0, now2);
    gainNode2.gain.linearRampToValueAtTime(0.8, now2 + 0.02);
    gainNode2.gain.linearRampToValueAtTime(0, now2 + duration2);
    
    console.log(`🔊 [AUDIO] Sonido WebSocket beep adicional (2000-1500Hz).`);
    
    oscillator2.start(now2);
    oscillator2.stop(now2 + duration2);
  }, 100);
  
  console.log("🔊 [AUDIO] Sonido WebSocket LIMPIO Y PROFESIONAL: 0.8s + 0.3s beep.");
}

export function getWebSocketSoundNeedsActivation() {
  console.log("🔊 [AUDIO] Estado de activación WebSocket:", $soundNeedsActivation);
  return soundNeedsActivation;
}

export function getWebSocketConnectionStatus() {
  const status = wsNotificationService;
  console.log("📊 [WEBSOCKET] Obteniendo estado de conexión WebSocket...");
  return status;
}

// Export legacy compatibility functions
export const initializeNotifications = initializeWebSocketNotifications;
export const disconnectFromAllStreams = disconnectFromWebSocket;
export const getSoundNeedsActivation = getWebSocketSoundNeedsActivation;
export const getConnectionStatus = getWebSocketConnectionStatus;

// Debug functions
export function getConnectionDebugInfo() {
  return {
    isConnected: get(wsNotificationService).isConnected,
    reconnectAttempts: get(wsNotificationService).connectionStats.reconnectAttempts,
    lastError: get(wsNotificationService).connectionStats.lastError,
    messageCount: get(wsNotificationService).connectionStats.messageCount,
    connectTime: get(wsNotificationService).connectionStats.connectTime,
    stompConnected: stompClient?.connected || false,
    sockJSReadyState: sockJSConnection?.readyState || 'undefined'
  };
}

export function forceReconnect() {
  console.log("🔄 [WEBSOCKET] Forzando reconexión manual...");
  disconnectFromWebSocket();
  setTimeout(() => {
    initializeWebSocketNotifications();
  }, 1000);
}