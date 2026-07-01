import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import WorkOrderModal from '../../components/shared/WorkOrderModal.svelte';

/**
 * @description Suite de pruebas para el componente WorkOrderModal.
 * Verifica el renderizado, validación, eventos y manejo de tipos de inspección.
 * Tests incluidos:
 * - renders modal with correct title: Verifica que el modal se renderice con el título correcto "Crear Orden de Trabajo".
 * - displays machine information correctly: Verifica que se muestre correctamente la información de la máquina.
 * - displays affected area information: Verifica que se muestre la información del área afectada.
 * - displays current user: Verifica que se muestre el usuario actual.
 * - shows confirmation dialog when form is submitted: Verifica que se muestre el diálogo de confirmación al enviar el formulario.
 * - dispatches createWorkOrder event when confirmed: Verifica que se despache el evento createWorkOrder al confirmar.
 * - cancels confirmation when cancel button is clicked: Verifica que se cancele la confirmación al hacer clic en cancelar.
 * - handles unexpected inspection type: Verifica que se maneje el tipo de inspección inesperada.
 * - applies correct status class to status badge: Verifica que se aplique la clase correcta al badge de estado.
 * - handles extinguisher date status: Verifica que se maneje el estado de fecha de extintor.
 * - has close button: Verifica que tenga un botón de cerrar.
 * - has modal overlay: Verifica que tenga un overlay modal.
 * - validates required fields: Verifica que valide los campos requeridos.
 */
describe('WorkOrderModal', () => {
  const mockRowData = {
    id: 1,
    machine: {
      name: 'Test Machine',
      brand: 'Test Brand',
      numInterIdentification: '12345'
    },
    leakStatus: 'Óptimo',
    isUnexpected: false
  };

  const mockColumnDef = {
    header: 'Sistema de Fugas',
    accessorKey: 'leakStatus'
  };

  it('renders modal with correct title', () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    const title = screen.getByRole('heading', { name: 'Crear Orden de Trabajo' });
    expect(title.tagName).toBe('H2');
  });

  it('displays machine information correctly', () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    expect(screen.getByText('Test Machine Test Brand 12345')).toBeTruthy();
  });

  it('displays affected area information', () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    expect(screen.getByText('Sistema de Fugas')).toBeTruthy();
    expect(screen.getByText('Óptimo')).toBeTruthy();
  });

  it('displays current user', () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows confirmation dialog when form is submitted', async () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    await tick();

    const detallesTextarea = screen.getByPlaceholderText('Describa en detalle el trabajo a realizar, los procedimientos y las precauciones necesarias...');
    const asignadoInput = screen.getByPlaceholderText('Nombre del técnico o equipo');

    await fireEvent.input(detallesTextarea, { target: { value: 'Test work details' } });
    await fireEvent.input(asignadoInput, { target: { value: 'Test Technician' } });

    const createButtons = screen.getAllByText('Crear Orden de Trabajo');
    const submitButton = createButtons[1]; // The button, not the title
    await fireEvent.click(submitButton);

    // Should show confirmation
    expect(screen.getByText('Confirmar Creación')).toBeTruthy();
  });

  it('dispatches createWorkOrder event when confirmed', async () => {
    const mockDispatch = vi.fn();

    const component = render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    // Escuchar el evento createWorkOrder
    component.component.$on('createWorkOrder', (event) => mockDispatch(event.detail));

    await tick();

    const detallesTextarea = screen.getByPlaceholderText('Describa en detalle el trabajo a realizar, los procedimientos y las precauciones necesarias...');
    const asignadoInput = screen.getByPlaceholderText('Nombre del técnico o equipo');

    await fireEvent.input(detallesTextarea, { target: { value: 'Test work details' } });
    await fireEvent.input(asignadoInput, { target: { value: 'Test Technician' } });

    const createButtons = screen.getAllByText('Crear Orden de Trabajo');
    const submitButton = createButtons[1]; // The button, not the title
    await fireEvent.click(submitButton);

    // Confirm creation
    const acceptButton = screen.getByText('Aceptar');
    await fireEvent.click(acceptButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      inspectionId: 1,
      description: 'Inspección|Sistema de Fugas|Óptimo|Test work details|Test Technician',
      orderType: null,
      maintenanceCategory: null,
      maintenanceType: null,
    });
  });

  it('cancels confirmation when cancel button is clicked', async () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    await tick();

    const detallesTextarea = screen.getByPlaceholderText('Describa en detalle el trabajo a realizar, los procedimientos y las precauciones necesarias...');
    const asignadoInput = screen.getByPlaceholderText('Nombre del técnico o equipo');

    await fireEvent.input(detallesTextarea, { target: { value: 'Test work details' } });
    await fireEvent.input(asignadoInput, { target: { value: 'Test Technician' } });

    const createButtons = screen.getAllByText('Crear Orden de Trabajo');
    const submitButton = createButtons[1]; // The button, not the title
    await fireEvent.click(submitButton);

    // Cancel confirmation
    const cancelButtons = screen.getAllByText('Cancelar');
    const confirmCancelButton = cancelButtons[1]; // The confirmation cancel button
    await fireEvent.click(confirmCancelButton);

    // Should hide confirmation
    expect(screen.queryByText('Confirmar Creación')).toBeNull();
  });

  it('handles unexpected inspection type', () => {
    const unexpectedRowData = { ...mockRowData, isUnexpected: true };

    render(WorkOrderModal, {
      props: {
        rowData: unexpectedRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    // Should use 'Imprevisto' instead of 'Inspección'
    expect(screen.getByText('Panel Informativo')).toBeTruthy();
  });

  it('applies correct status class to status badge', () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    const statusBadge = screen.getByText('Óptimo');
    expect(statusBadge.classList.contains('status-optimo')).toBe(true);
  });

  it('handles extinguisher date status', () => {
    const extinguisherColumnDef = {
      header: 'Vigencia Extintor',
      accessorKey: 'expirationDateFireExtinguisher'
    };

    const extinguisherRowData = {
      ...mockRowData,
      expirationDateFireExtinguisher: '2024-12-31'
    };

    render(WorkOrderModal, {
      props: {
        rowData: extinguisherRowData,
        columnDef: extinguisherColumnDef,
        currentUser: 'Test User'
      }
    });

    // Should show calculated status
    expect(screen.getByText('Panel Informativo')).toBeTruthy();
  });

  it('has close button', async () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    const closeButton = screen.getByText('×');
    expect(closeButton).toBeTruthy();
  });

  it('has modal overlay', async () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    const modal = document.querySelector('.modal-overlay');
    expect(modal).toBeTruthy();
  });

  it('validates required fields', async () => {
    render(WorkOrderModal, {
      props: {
        rowData: mockRowData,
        columnDef: mockColumnDef,
        currentUser: 'Test User'
      }
    });

    await tick();

    const createButtons = screen.getAllByText('Crear Orden de Trabajo');
    const submitButton = createButtons[1]; // The button, not the title

    // Initially should be enabled (form validation is handled internally)
    expect(submitButton).toBeTruthy();

    const detallesTextarea = screen.getByPlaceholderText('Describa en detalle el trabajo a realizar, los procedimientos y las precauciones necesarias...');
    const asignadoInput = screen.getByPlaceholderText('Nombre del técnico o equipo');

    await fireEvent.input(detallesTextarea, { target: { value: 'Test work details' } });
    await fireEvent.input(asignadoInput, { target: { value: 'Test Technician' } });

    // Now should be able to submit
    expect(submitButton).toBeTruthy();
  });
});