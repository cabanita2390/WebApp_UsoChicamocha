import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

import { addNotification } from '../stores/ui.js';
import { createQuickCatalog } from '../composables/useQuickCatalog.js';

/** Simula lo que hace bind:value={$catalog.name} en el template al escribir. */
function typeName(catalog, name) {
  catalog.update((s) => ({ ...s, name }));
}

describe('useQuickCatalog', () => {
  let kinds;

  beforeEach(() => {
    vi.clearAllMocks();
    kinds = {
      brand: {
        title: 'Nueva marca',
        placeholder: 'Ej: Toyota',
        create: vi.fn().mockResolvedValue({ idMarca: 42 }),
        getId: (created) => created?.idMarca,
        targetField: 'idMarca',
        successMessage: 'Marca registrada.',
      },
      location: {
        title: 'Nueva ubicación',
        placeholder: 'Ej: Logística',
        create: vi.fn().mockResolvedValue({ id: 7 }),
        afterCreate: vi.fn().mockResolvedValue(),
        getId: (created) => created?.id,
        targetField: 'idUbicacionBase',
        successMessage: 'Ubicación registrada.',
      },
    };
  });

  it('open() fija el modal activo y limpia nombre/error previos', () => {
    const catalog = createQuickCatalog(kinds);
    catalog.open('brand');
    expect(get(catalog)).toMatchObject({ modal: 'brand', name: '', error: '' });
  });

  it('close() resetea todo el estado, incluido submitting', () => {
    const catalog = createQuickCatalog(kinds);
    catalog.open('brand');
    catalog.close();
    expect(get(catalog)).toEqual({ modal: null, name: '', error: '', submitting: false });
  });

  it('submit() sin nombre no llama create() y deja un error', async () => {
    const catalog = createQuickCatalog(kinds);
    catalog.open('brand');

    await catalog.submit(() => ({}));

    expect(kinds.brand.create).not.toHaveBeenCalled();
    expect(get(catalog).error).toBe('Escriba un nombre.');
  });

  it('submit() con nombre válido crea, asigna id, llama afterCreate y cierra', async () => {
    const catalog = createQuickCatalog(kinds);
    catalog.open('location');
    typeName(catalog, 'Bodega Norte');

    const target = {};
    await catalog.submit(() => target);

    expect(kinds.location.create).toHaveBeenCalledWith('Bodega Norte');
    expect(kinds.location.afterCreate).toHaveBeenCalled();
    expect(target.idUbicacionBase).toBe(7);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ text: 'Ubicación registrada.' }));
    expect(get(catalog)).toEqual({ modal: null, name: '', error: '', submitting: false });
  });

  it('submit() en el registro de alta (sin target abierto en edición) asigna el id igual', async () => {
    const catalog = createQuickCatalog(kinds);
    catalog.open('brand');
    typeName(catalog, ' Marca Con Espacios ');

    const newVehicle = { placa: 'ABC123' };
    await catalog.submit(() => newVehicle);

    // el nombre se recorta antes de crear
    expect(kinds.brand.create).toHaveBeenCalledWith('Marca Con Espacios');
    expect(newVehicle.idMarca).toBe(42);
  });

  it('submit() cuando create() falla deja el error visible, no cierra el modal ni notifica', async () => {
    kinds.brand.create.mockRejectedValue(new Error('El backend rechazó la marca'));
    const catalog = createQuickCatalog(kinds);
    catalog.open('brand');
    typeName(catalog, 'MarcaX');

    await catalog.submit(() => ({}));

    const state = get(catalog);
    expect(state.error).toBe('El backend rechazó la marca');
    expect(state.modal).toBe('brand');
    expect(state.submitting).toBe(false);
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('titleFor/placeholderFor devuelven lo configurado por kind, y vacío/genérico si no hay modal', () => {
    const catalog = createQuickCatalog(kinds);
    expect(catalog.titleFor('brand')).toBe('Nueva marca');
    expect(catalog.placeholderFor('location')).toBe('Ej: Logística');
    expect(catalog.titleFor(null)).toBe('');
    expect(catalog.placeholderFor(null)).toBe('Ej: …');
  });
});
