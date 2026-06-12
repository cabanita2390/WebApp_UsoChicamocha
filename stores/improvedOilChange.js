import { writable, derived } from 'svelte/store';
import { apiCall } from './api';

function createImprovedOilChangeStore() {
  // Vehicle Oil Changes
  const vehicleOilChanges = writable([]);
  const vehicleOilHistory = writable([]);

  // Machine Oil Changes
  const machineOilChanges = writable([]);
  const machineOilHistory = writable([]);

  // Oil Change Requirements
  const oilChangeRequirements = writable([]);
  const vehicleRequirements = derived(oilChangeRequirements, $reqs =>
    $reqs.filter(r => r.assetType === 'VEHICLE')
  );
  const machineRequirements = derived(oilChangeRequirements, $reqs =>
    $reqs.filter(r => r.assetType === 'MACHINERY')
  );

  // SOS Analysis
  const sosAnalyses = writable([]);
  const sosPending = derived(sosAnalyses, $analyses =>
    $analyses.filter(a => !a.isApproved)
  );

  // UI State
  const loading = writable(false);
  const error = writable(null);
  const success = writable(null);

  // Derived: Alert color mapping
  const getAlertColor = (percentageUsed) => {
    if (percentageUsed >= 100) return 'red';
    if (percentageUsed >= 80) return 'yellow';
    if (percentageUsed >= 60) return 'blue';
    return 'green';
  };

  const getAlertStatus = (percentageUsed) => {
    if (percentageUsed >= 100) return 'VENCIDO';
    if (percentageUsed >= 80) return 'PRÓXIMO';
    if (percentageUsed >= 60) return 'PROGRAMADO';
    return 'BUENO';
  };

  // Load requirements
  async function loadRequirements() {
    loading.set(true);
    try {
      const data = await apiCall('/v1/improved-oil-changes/requirements', 'GET');
      if (data) {
        oilChangeRequirements.set(data);
      }
    } catch (err) {
      error.set('Error cargando requisitos: ' + err.message);
    } finally {
      loading.set(false);
    }
  }

  // Create vehicle oil change
  async function createVehicleOilChange(payload) {
    loading.set(true);
    error.set(null);
    success.set(null);

    try {
      const data = await apiCall('/v1/improved-oil-changes/vehicle', 'POST', payload);
      if (data) {
        vehicleOilChanges.update(changes => [...changes, data]);
        success.set('✅ Cambio de aceite registrado correctamente');
        return data;
      }
    } catch (err) {
      error.set('Error registrando cambio: ' + err.message);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  // Create machine oil change
  async function createMachineOilChange(payload) {
    loading.set(true);
    error.set(null);
    success.set(null);

    try {
      const data = await apiCall('/v1/improved-oil-changes/machine', 'POST', payload);
      if (data) {
        machineOilChanges.update(changes => [...changes, data]);
        success.set('✅ Cambio de aceite registrado correctamente');
        return data;
      }
    } catch (err) {
      error.set('Error registrando cambio: ' + err.message);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  // Load machine oil change history
  async function loadMachineHistory(machineId) {
    loading.set(true);
    try {
      const data = await apiCall(`/v1/improved-oil-changes/machine/${machineId}`, 'GET');
      if (data) {
        machineOilHistory.set(data);
      }
    } catch (err) {
      error.set('Error cargando historial: ' + err.message);
    } finally {
      loading.set(false);
    }
  }

  // Create SOS analysis
  async function createSosAnalysis(payload) {
    loading.set(true);
    error.set(null);
    success.set(null);

    try {
      const data = await apiCall('/v1/improved-oil-changes/analysis-sos', 'POST', payload);
      if (data) {
        sosAnalyses.update(analyses => [...analyses, data]);
        success.set('✅ Análisis SOS creado');
        return data;
      }
    } catch (err) {
      error.set('Error creando análisis: ' + err.message);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  // Approve SOS analysis
  async function approveSosAnalysis(sosId) {
    loading.set(true);
    error.set(null);
    success.set(null);

    try {
      const data = await apiCall(`/v1/improved-oil-changes/analysis-sos/${sosId}/approve`, 'PUT');
      if (data) {
        sosAnalyses.update(analyses =>
          analyses.map(a => a.id === sosId ? { ...a, isApproved: true } : a)
        );
        success.set('✅ Análisis SOS aprobado');
        return data;
      }
    } catch (err) {
      error.set('Error aprobando análisis: ' + err.message);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  // Load machine analyses
  async function loadMachineAnalyses(machineId, approvedOnly = false) {
    loading.set(true);
    try {
      const data = await apiCall(
        `/v1/improved-oil-changes/analysis-sos/machine/${machineId}?approvedOnly=${approvedOnly}`,
        'GET'
      );
      if (data) {
        sosAnalyses.set(data);
      }
    } catch (err) {
      error.set('Error cargando análisis: ' + err.message);
    } finally {
      loading.set(false);
    }
  }

  // Load pending analyses
  async function loadPendingAnalyses(machineId) {
    loading.set(true);
    try {
      const data = await apiCall(
        `/v1/improved-oil-changes/analysis-sos/pending/${machineId}`,
        'GET'
      );
      if (data) {
        sosAnalyses.update(analyses =>
          [...analyses.filter(a => a.machineId !== machineId), ...data]
        );
      }
    } catch (err) {
      error.set('Error cargando análisis pendientes: ' + err.message);
    } finally {
      loading.set(false);
    }
  }

  // Clear messages
  function clearMessages() {
    error.set(null);
    success.set(null);
  }

  return {
    // Stores
    vehicleOilChanges,
    vehicleOilHistory,
    machineOilChanges,
    machineOilHistory,
    oilChangeRequirements,
    vehicleRequirements,
    machineRequirements,
    sosAnalyses,
    sosPending,
    loading,
    error,
    success,

    // Methods
    loadRequirements,
    createVehicleOilChange,
    createMachineOilChange,
    loadMachineHistory,
    createSosAnalysis,
    approveSosAnalysis,
    loadMachineAnalyses,
    loadPendingAnalyses,
    clearMessages,

    // Utilities
    getAlertColor,
    getAlertStatus
  };
}

export const improvedOilChangeStore = createImprovedOilChangeStore();
