import { validateDocumentFileSize } from '../../src/lib/fileValidation.js';

export function createUserActions({ update, get, subscribe, fetchAll, fetchWithAuth }) {
    return {
        // Usuarios
        fetchUsers: () => fetchAll('users', 'user'),
        createUser: async (newUser) => {
            const createdUser = await fetchWithAuth('user', { method: 'POST', body: JSON.stringify(newUser) });
            update(s => ({ ...s, users: [...s.users, createdUser] }));
            return createdUser;
        },
        updateUser: async (userId, userData) => {
            const userToUpdate = get({ subscribe }).users.find(u => u.id === userId);
            if (!userToUpdate) throw new Error("Usuario no encontrado");
            const payload = { id: userId, ...userToUpdate, ...userData };
            const updatedUser = await fetchWithAuth(`user/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });
            update(s => ({ ...s, users: s.users.map(u => (u.id === userId ? updatedUser : u)) }));
        },
        deleteUser: async (userId) => {
            await fetchWithAuth(`user/${userId}`, { method: 'DELETE' });
            update(s => ({ ...s, users: s.users.filter(u => u.id !== userId) }));
        },
        restoreUser: async (userId) => {
            const restored = await fetchWithAuth(`user/${userId}/restore`, { method: 'POST' });
            update(s => ({ ...s, users: [...s.users, restored] }));
            return restored;
        },
        changeUserPassword: async (userId, newPassword) => {
            await fetchWithAuth(`user/${userId}/change-password`, {
                method: 'PATCH',
                body: JSON.stringify({ id: userId, newPassword: newPassword })
            });
        },
        uploadUserLicenseDocument: async (userId, file) => {
            const sizeError = validateDocumentFileSize(file);
            if (sizeError) throw new Error(sizeError);
            const form = new FormData();
            form.append('file', file);
            const updated = await fetchWithAuth(`user/${userId}/license-document`, { method: 'POST', body: form });
            update(s => ({ ...s, users: s.users.map(u => (u.id === userId ? updated : u)) }));
            return updated;
        },
    };
}
