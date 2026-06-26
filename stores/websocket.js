import { writable } from 'svelte/store';
import SockJS from 'sockjs-client';
import { Client as StompClient } from '@stomp/stompjs';

/**
 * Store global para el cliente STOMP
 * Permite que múltiples composables usen el mismo cliente WebSocket
 */

function createStompClientStore() {
  const { subscribe, set } = writable(null);

  return {
    subscribe,
    set,
    connect: (token, onConnect) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin;
      const wsUrl = `${baseUrl}/ws`;

      const client = new StompClient({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 30000,
        heartbeatOutgoing: 30000,
        onConnect: () => {
          console.log('🔗 STOMP connected');
          set(client);
          if (onConnect) onConnect();
        },
        onStompError: (error) => {
          console.error('❌ STOMP error:', error);
        }
      });

      client.activate();
      return client;
    }
  };
}

export const stompClient = createStompClientStore();
