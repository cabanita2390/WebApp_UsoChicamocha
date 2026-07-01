// Test for simplified notification system
import {
  initializeNotifications,
  disconnectFromAllStreams,
  getSoundNeedsActivation
} from '../../composables/useNotifications.js';
import { NOTIFICATION_TYPES } from '../../composables/useNotifications.js';

// jsdom no expone localStorage por defecto en este entorno de test.
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('Notification System Refactoring', () => {
  beforeEach(() => {
    // Reset any existing streams
    disconnectFromAllStreams();
  });

  describe('Notification Service Functions', () => {
    it('should initialize notification service', () => {
      // Mock localStorage
      localStorage.setItem('accessToken', 'test-token');
      window.VITE_API_BASE_URL = 'http://test-api.com';

      expect(() => {
        initializeNotifications();
      }).not.toThrow();
      
      // Cleanup
      localStorage.removeItem('accessToken');
    });

    it('should handle missing token gracefully', () => {
      delete window.VITE_API_BASE_URL;
      localStorage.removeItem('accessToken');
      
      // Should not throw error when missing credentials
      expect(() => {
        initializeNotifications();
      }).not.toThrow();
    });

    it('should get sound activation status', () => {
      const needsActivation = getSoundNeedsActivation();
      expect(typeof needsActivation).toBe('boolean');
    });

    it('should export notification types', () => {
      expect(NOTIFICATION_TYPES).toEqual({
        INSPECTION: 'inspection',
        DATA_UPDATE: 'data-update',
        SOAT_RUNT: 'soat-runt',
        OIL_CHANGE: 'oil-change'
      });
    });
  });

  describe('Stream Management', () => {
    it('should disconnect from all streams', () => {
      // This should not throw any errors
      expect(() => {
        disconnectFromAllStreams();
      }).not.toThrow();
    });
  });
});