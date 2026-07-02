/**
 * Configuración centralizada para WebSocket
 * Funciona en desarrollo (localhost:8080) y producción (https://server.usochicamocha.co)
 */
import { log } from './logger.js';

/**
 * Obtiene la URL correcta del WebSocket basada en el ambiente
 * @returns {string} URL del WebSocket (ws:// o wss://)
 */
export function getWebSocketUrl() {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '');

  // Convertir HTTP/HTTPS a WS/WSS
  let wsUrl;
  if (baseUrl.startsWith('https://')) {
    wsUrl = baseUrl.replace(/^https:/, 'wss:') + '/ws';
  } else if (baseUrl.startsWith('http://')) {
    wsUrl = baseUrl.replace(/^http:/, 'ws:') + '/ws';
  } else {
    // Fallback: si no tiene protocolo, usar el del navegador actual
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws`;
  }

  log('📡 WebSocket URL:', wsUrl);
  log('📡 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  log('📡 window.location.origin:', window.location.origin);
  log('📡 Environment:', import.meta.env.MODE);

  return wsUrl;
}

/**
 * Obtiene el token de acceso
 * @returns {string|null} Token JWT o null
 */
export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

/**
 * Obtiene las opciones de configuración de STOMP
 * @param {string} wsUrl - URL del WebSocket
 * @param {string} token - Token de acceso
 * @returns {object} Configuración de STOMP
 */
export function getStompConfig(wsUrl, token) {
  return {
    brokerURL: wsUrl,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 30000,
    heartbeatOutgoing: 30000,
    debug: (msg) => log('🔍 STOMP:', msg)
  };
}
