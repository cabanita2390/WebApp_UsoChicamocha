import { writable, get } from 'svelte/store';
import { auth } from '../stores/auth.js';
import { data } from '../stores/data.js';
import { ui, addNotification } from '../stores/ui.js';

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

// Debug connection status
function logConnectionStatus(event, data) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`🔍 [WEBSOCKET DEBUG] [${timestamp}] ${event}:`, data);
}

// WebSocket connection with SockJS + STOMP - DEBUG VERSION
function connectSockJS(token) {
  console.log("🚀 [WEBSOCKET] Iniciando conexión SockJS + STOMP con DEBUG...");
  
  const wsUrl = buildWebSocketUrl();
  console.log("🔌 [WEBSOCKET] URL:", wsUrl);
  
  // Step 1: Test SockJS connection first
  console.log("📡 [WEBSOCKET] Paso 1: Creando conexión SockJS básica...");
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
  console.log("📡 [WEBSOCKET] Paso 2: Creando cliente STOMP con CORS fix...");
  
  stompClient = new StompClient({
    webSocketFactory: function() {
      logConnectionStatus("STOMP_WS_FACTORY", "Creando WebSocket factory");
      return sockJSConnection;
    },
    connectHeaders: {
      'Authorization': `Bearer ${token}`
    },
    // CORS CONFIGURATION TO FIX BLOCKED REQUEST
    forceJSONP: false,
    checkOrigin: false,
    // Enhanced debug logging
    debug: function (str) {
      console.log('STOMP DEBUG:', str);
    },
    onConnect: (frame) => {
      logConnectionStatus("STOMP_CONNECT", "Conectado exitosamente a STOMP");
      console.log(`✅ [WEBSOCKET] Conectado STOMP:`, frame);
      
      updateConnectionStatus(true);
      subscribeToAllTopics();
      
      // Send ping to confirm connection
      sendPing();
      
      // Start heartbeat monitoring
      startHeartbeat();
    },
    onError: (error) => {
      logConnectionStatus("STOMP_ERROR", error);
      console.error('❌ [WEBSOCKET] Error de conexión STOMP:', error);
      
      updateConnectionError(`STOMP Error: ${JSON.stringify(error)}`);
      handleConnectionError();
    },
    onDisconnect: (frame) => {
      logConnectionStatus("STOMP_DISCONNECT", frame);
      console.log('🔌 [WEBSOCKET] Conexión STOMP cerrada:', frame);
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
  console.log("📡 [WEBSOCKET] Paso 3: Activando cliente STOMP...");
  try {
    stompClient.activate();
    logConnectionStatus("STOMP_ACTIVATE", "Cliente STOMP activado");
  } catch (error) {
    console.error('❌ [WEBSOCKET] Error activando cliente STOMP:', error);
    updateConnectionError(`Activación STOMP Error: ${error.message}`);
  }
}

// Update connection status with error tracking
function updateConnectionStatus(isConnected, isReconnecting = false) {
  console.log(`📊 [WEBSOCKET] Estado actualizado - Conectado: ${isConnected}, Reconectando: ${isReconnecting}`);
  
  wsNotificationService.update(state => ({
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
  }));
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
        console.log(`📝 [WEBSOCKET] Mensaje como texto plano en ${topic}: "${messageBody}"`);
        message = messageBody;
      }
    }
    
    handler(message);
    
    // Update message statistics
    wsNotificationService.update(state => {
      state.connectionStats.messageCount++;
      return state;
    });
    
  } catch (error) {
    console.error(`❌ [WEBSOCKET] Error procesando mensaje de ${topic}:`, error);
    console.error(`❌ [WEBSOCKET] Contenido del mensaje:`, messageBody);
  }
}

// Message handlers (same as before but with debug)
function handleInspectionMessage(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📨 [INSPECTION] ⭐ NOTIFICACIÓN WEBSOCKET EN ${timestamp} ⭐`);
  console.log(`📨 [INSPECTION] 🚨 RAW DATA:`, message);
  
  if (message.type === 'stream_open' || message === 'stream_open') {
    console.log('✅ [INSPECTION] Notificaciones de inspecciones confirmadas.');
    return;
  }
  
  const machineInfo = message.machine ? 
    `${message.machine.name} ${message.machine.model}` : 
    'una máquina';
  
  console.log(`🚨 [INSPECTION] ⚡ AGREGANDO NOTIFICACIÓN WEBSOCKET: ${machineInfo}!`);

  addNotification({
    id: message.UUID || message.id || Date.now(),
    text: `¡IMPREVISTO EN ${machineInfo}!`
  });

  console.log("🔊 [INSPECTION] Reproduciendo sonido...");
  playNotificationSound();

  // Auto-refresh dashboard if on inspection view
  const currentView = get(ui).currentView;
  console.log("🔄 [INSPECTION] Vista actual:", currentView);
  
  if (currentView === 'dashboard') {
    console.log("🔄 [INSPECTION] Actualizando dashboard...");
    const dataState = get(data);
    data.fetchDashboardData(dataState.dashboard.currentPage, dataState.dashboard.pageSize);
  }
}

function handleDataUpdateMessage(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📨 [DATA_UPDATE] Mensaje WebSocket recibido en ${timestamp}`);
  console.log(`📨 [DATA_UPDATE] Raw data:`, message);
  
  if (message.type === 'stream_open' || message === 'stream_open') {
    console.log('✅ [DATA_UPDATE] Notificaciones de actualización confirmadas.');
    return;
  }
  
  const currentView = get(ui).currentView;
  const updateType = message.type || message;
  console.log(`🔄 [DATA_UPDATE] Mensaje: "${updateType}", Vista actual: "${currentView}"`);

  handleDataUpdate(currentView, updateType);
}

function handleOilChangeMessage(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📨 [OIL_CHANGE] Mensaje WebSocket recibido en ${timestamp}`);
  console.log(`📨 [OIL_CHANGE] Raw data:`, message);
  
  if (message.type === 'stream_open' || message === 'stream_open') {
    console.log('✅ [OIL_CHANGE] Notificaciones de cambios de aceite confirmadas.');
    return;
  }
  
  console.log("🔔 [OIL_CHANGE] Agregando notificación WebSocket:", message.message || 'Notificación de cambio de aceite');
  
  addNotification({
    id: message.id || Date.now(),
    text: message.message || 'Notificación de cambio de aceite'
  });
}

// ELIMINADO: handleGeneralMessage function - ya no existe el endpoint backend

function handleSoatRuntMessage(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📨 [SOAT_RUNT] Mensaje WebSocket recibido en ${timestamp}`);
  console.log(`📨 [SOAT_RUNT] Raw data:`, message);
  
  if (message.type === 'stream_open' || message === 'stream_open') {
    console.log('✅ [SOAT_RUNT] Notificaciones SOAT/RUNT confirmadas.');
    return;
  }
  
  console.log("🔔 [SOAT_RUNT] Agregando notificación WebSocket:", message.message || 'Notificación SOAT/RUNT');
  
  addNotification({
    id: message.id || Date.now(),
    text: message.message || 'Notificación SOAT/RUNT'
  });
}

function handleConnectionMessage(message) {
  console.log("🔗 [CONNECTION] Mensaje de conexión WebSocket:", message);

  if (message.type === 'connection_status') {
    console.log(`📊 [CONNECTION] Estado de conexión: ${message.status}`);
  }
}

function handleAlertMessage(message) {
  if (message.type === 'stream_open' || message === 'stream_open') return;

  const text = typeof message === 'string'
    ? message
    : message.message || message.text || 'Alerta del sistema';

  addNotification({
    id: message.id || Date.now(),
    text,
  });
}

// Heartbeat to maintain connection
function startHeartbeat() {
  setInterval(() => {
    if (stompClient && stompClient.connected) {
      console.log("💓 [WEBSOCKET] Verificando conexión STOMP...");
      // STOMP handles heartbeat automatically, but we can send a ping
      sendPing();
    }
  }, WS_CONFIG.heartbeatDelay);
}

// Handle connection errors and reconnection
function handleConnectionError() {
  console.warn("⚠️ [WEBSOCKET] Error de conexión - intentando reconectar...");
  
  const currentState = wsNotificationService;
  const attempts = get(currentState).connectionStats.reconnectAttempts;
  
  if (attempts >= 3) {
    console.error("❌ [WEBSOCKET] Máximo número de intentos de reconexión alcanzado.");
    wsNotificationService.update(state => ({
      ...state,
      isReconnecting: false,
      connectionStats: {
        ...state.connectionStats,
        reconnectAttempts: state.connectionStats.reconnectAttempts + 1
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
  
  setTimeout(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log("🔄 [WEBSOCKET] Reintentando conexión...");
      connectSockJS(token);
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
        console.log('🔄 [DATA_UPDATE] Recargando tabla de inspecciones...');
        data.fetchDashboardData(dataState.dashboard.currentPage, dataState.dashboard.pageSize);
      }
      break;
    case 'machines-updated':
      if (currentView === 'machines') {
        console.log('🔄 [DATA_UPDATE] Recargando tabla de máquinas...');
        data.fetchMachines();
      }
      break;
    case 'users-updated':
      if (currentView === 'users') {
        console.log('🔄 [DATA_UPDATE] Recargando tabla de usuarios...');
        data.fetchUsers();
      }
      break;
    case 'orders-updated':
      if (currentView === 'work-orders') {
        console.log('🔄 [DATA_UPDATE] Recargando tabla de órdenes de trabajo...');
        data.fetchWorkOrders(dataState.workOrders.currentPage, dataState.workOrders.pageSize);
      }
      break;
    case 'oil-changes-updated':
      if (currentView === 'consolidado') {
        console.log('🔄 [DATA_UPDATE] Recargando tabla de consolidado...');
        data.fetchConsolidadoData();
      }
      break;
    case 'fuel-updated':
      if (currentView === 'fuel') {
        console.log('🔄 [DATA_UPDATE] Recargando registros de combustible...');
        data.fetchFuelLogs(null, null);
        data.fetchFuelDashboard(null, null);
      }
      break;
    case 'vehicle-inspections-updated':
      if (currentView === 'dashboard') {
        console.log('🔄 [DATA_UPDATE] Recargando inspecciones de vehículos...');
        data.fetchVehicleInspections(dataState.vehicleInspections.currentPage, dataState.vehicleInspections.pageSize, { reload: true });
      }
      break;
    case 'moto-inspections-updated':
      if (currentView === 'dashboard') {
        console.log('🔄 [DATA_UPDATE] Recargando inspecciones de motos...');
        data.fetchMotoInspections();
      }
      break;
    default:
      console.log("⚠️ [DATA_UPDATE] Mensaje no reconocido:", message);
  }
}

// Disconnect from WebSocket
export function disconnectFromWebSocket() {
  console.log("🔌 [WEBSOCKET] Cerrando conexión WebSocket...");
  
  if (stompClient && stompClient.connected) {
    // Unsubscribe from all topics
    wsNotificationService.update(state => {
      state.subscriptions.forEach((subscription, topic) => {
        console.log(`📡 [WEBSOCKET] Desuscribiéndose de ${topic}`);
        subscription.unsubscribe();
      });
      state.subscriptions.clear();
      return state;
    });
    
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