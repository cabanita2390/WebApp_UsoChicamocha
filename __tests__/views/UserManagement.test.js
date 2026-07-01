import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import UserManagement from '../../components/views/UserManagement.svelte';

// Simular el store de data
vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    changeUserPassword: vi.fn(),
  },
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    }),
  },
}));

// Simular definiciones de tabla
vi.mock('../../config/table-definitions.js', () => ({
  userColumns: [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
  ],
}));

// Simular componentes compartidos
vi.mock('../shared/DataGrid.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';

/**
 * @description Suite de pruebas para la vista UserManagement.
 * Verifica el renderizado de la interfaz de gestión de usuarios, creación, actualización y eliminación.
 * Tests incluidos:
 * - renders loading state when loading and no users: Verifica que se muestre estado de carga cuando está cargando y no hay usuarios.
 * - renders user management interface when not loading: Verifica que se renderice la interfaz de gestión cuando no está cargando.
 * - initializes with empty users array: Verifica que se inicialice con array de usuarios vacío.
 * - calls fetchUsers when refresh button is clicked: Verifica que se llame fetchUsers al hacer clic en refrescar.
 * - creates new user successfully: Verifica que se cree un nuevo usuario exitosamente.
 * - handles user creation failure: Verifica que se maneje fallo en creación de usuario.
 * - has password input field: Verifica que tenga campo de entrada de contraseña.
 * - validates required fields in create form: Verifica que valide campos requeridos en formulario de creación.
 * - resets form after successful creation: Verifica que se resetee el formulario después de creación exitosa.
 * - handles role selection changes: Verifica que se manejen cambios en selección de rol.
 * - shows loading state during user creation: Verifica que se muestre estado de carga durante creación de usuario.
 */
describe('UserManagement', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Configurar store de datos simulado
    mockDataStore = {
      users: [],
      isLoading: false,
      error: null,
    };

    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {};
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state when loading and no users', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.users = [];

    render(UserManagement);

    await tick();

    // Debería mostrar el loader
    expect(screen.queryByText('Refrescar información')).toBeNull();
  });

  it('renders user management interface when not loading', async () => {
    mockDataStore.isLoading = false;
    mockDataStore.users = [{ id: 1, username: 'user1' }];

    render(UserManagement);

    await tick();

    expect(screen.getByText('Crear Nuevo Usuario')).toBeTruthy();
    expect(screen.getByText('Refrescar información')).toBeTruthy();
  });

  it('initializes with empty users array', async () => {
    mockDataStore.users = [];
    mockDataStore.isLoading = false;

    render(UserManagement);

    await tick();

    // Component should render without users initially
    expect(screen.getByText('Crear Nuevo Usuario')).toBeTruthy();
  });

  it('calls fetchUsers when refresh button is clicked', async () => {
    mockDataStore.users = [{ id: 1, username: 'user1' }];

    render(UserManagement);

    await tick();

    const refreshButton = screen.getByText('Refrescar información');
    await fireEvent.click(refreshButton);

    expect(data.fetchUsers).toHaveBeenCalled();
  });

  it('creates new user successfully', async () => {
    mockDataStore.users = [];
    data.createUser.mockResolvedValue();

    render(UserManagement);

    await tick();

    const usernameInput = screen.getByPlaceholderText('jdoe');
    const emailInput = screen.getByPlaceholderText('correo@gmail.com');
    const fullNameInput = screen.getByPlaceholderText('Juan Doe');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const roleSelect = screen.getByDisplayValue('OPERARIO');
    const createButton = screen.getByText('Crear usuario');

    await fireEvent.input(usernameInput, { target: { value: 'newuser' } });
    await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
    await fireEvent.input(fullNameInput, { target: { value: 'New User' } });
    await fireEvent.input(passwordInput, { target: { value: 'password123' } });
    await fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });
    await fireEvent.click(createButton);

    await waitFor(() => {
      expect(data.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        fullName: 'New User',
        password: 'password123',
        role: 'ADMIN',
        licenseCategory: '',
        licenseExpiry: '',
      });
    });
  });

  it('handles user creation failure', async () => {
    mockDataStore.users = [];
    data.createUser.mockRejectedValue(new Error('Creation failed'));

    render(UserManagement);

    await tick();

    const usernameInput = screen.getByPlaceholderText('jdoe');
    const emailInput = screen.getByPlaceholderText('correo@gmail.com');
    const fullNameInput = screen.getByPlaceholderText('Juan Doe');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const createButton = screen.getByText('Crear usuario');

    await fireEvent.input(usernameInput, { target: { value: 'newuser' } });
    await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
    await fireEvent.input(fullNameInput, { target: { value: 'New User' } });
    await fireEvent.input(passwordInput, { target: { value: 'password123' } });
    await fireEvent.click(createButton);

    // Test that the function is called and error is handled
    await waitFor(() => {
      expect(data.createUser).toHaveBeenCalled();
    });
  });

  it('has password input field', async () => {
    mockDataStore.users = [];

    render(UserManagement);

    await tick();

    const passwordInput = screen.getByPlaceholderText('Contraseña');

    // Should have password input
    expect(passwordInput.type).toBe('password');
  });

  it('validates required fields in create form', async () => {
    mockDataStore.users = [];

    render(UserManagement);

    await tick();

    const usernameInput = screen.getByPlaceholderText('jdoe');
    const fullNameInput = screen.getByPlaceholderText('Juan Doe');
    const passwordInput = screen.getByPlaceholderText('Contraseña');

    expect(usernameInput.hasAttribute('required')).toBe(true);
    expect(fullNameInput.hasAttribute('required')).toBe(true);
    expect(passwordInput.hasAttribute('required')).toBe(true);
  });

  it('resets form after successful creation', async () => {
    mockDataStore.users = [];
    data.createUser.mockResolvedValue();

    render(UserManagement);

    await tick();

    const usernameInput = screen.getByPlaceholderText('jdoe');
    const emailInput = screen.getByPlaceholderText('correo@gmail.com');
    const fullNameInput = screen.getByPlaceholderText('Juan Doe');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const createButton = screen.getByText('Crear usuario');

    await fireEvent.input(usernameInput, { target: { value: 'newuser' } });
    await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
    await fireEvent.input(fullNameInput, { target: { value: 'New User' } });
    await fireEvent.input(passwordInput, { target: { value: 'password123' } });
    await fireEvent.click(createButton);

    await waitFor(() => {
      expect(data.createUser).toHaveBeenCalled();
    });

    // Form should be reset
    expect(usernameInput.value).toBe('');
    expect(fullNameInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  it('handles role selection changes', async () => {
    mockDataStore.users = [];

    render(UserManagement);

    await tick();

    const roleSelect = screen.getByDisplayValue('OPERARIO');
    await fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

    expect(roleSelect.value).toBe('ADMIN');
  });

  it('shows loading state during user creation', async () => {
    mockDataStore.users = [];
    data.createUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(), 100)));

    render(UserManagement);

    await tick();

    const usernameInput = screen.getByPlaceholderText('jdoe');
    const emailInput = screen.getByPlaceholderText('correo@gmail.com');
    const fullNameInput = screen.getByPlaceholderText('Juan Doe');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const createButton = screen.getByText('Crear usuario');

    await fireEvent.input(usernameInput, { target: { value: 'newuser' } });
    await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
    await fireEvent.input(fullNameInput, { target: { value: 'New User' } });
    await fireEvent.input(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Creando…')).toBeTruthy();
    });
  });
});