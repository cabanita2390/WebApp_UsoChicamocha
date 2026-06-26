<script>
  import { onMount, onDestroy } from "svelte";
  import { data } from "../../stores/data.js";
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { userColumns } from '../../config/table-definitions.js';

  let users = [];
  let isLoading = true;
  let serverError = "";

  const unsubscribe = data.subscribe(storeValue => {
    users = storeValue.users || [];
    isLoading = storeValue.isLoading;
    serverError = storeValue.error || "";

   
  });

  let userToDelete = null;
  let showDeleteModal = false;
  let isDeleteConfirmEnabled = false;
  let deleteConfirmTimer = null;
  
  let userToEdit = null;
  let showEditModal = false;
  let newPassword = "";

  let showCreatePassword = false;
  let showEditNewPassword = false;

  let isSubmitting = false;
  let errorMessage = "";
  const initialUserState = {
    username: "", email: "", fullName: "", password: "", role: "MECANIC",
  };
  let newUser = { ...initialUserState };

  onMount(() => {
    if (users.length === 0) {
      data.fetchUsers();
    }
  });

  onDestroy(() => {
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer);
    unsubscribe();
  });

  async function handleCreateUser(event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = "";
    try {
      await data.createUser(newUser);
      newUser = { ...initialUserState };
    } catch (e) {
      if (e.status === 500) {
        errorMessage = "Algo salió mal. Pruebe usando un nombre de usuario diferente. Recuerde que los nombres de usuario no pueden repetirse por seguridad en toda la historia de la app";
      } else {
        errorMessage = e.message || "Error al crear usuario.";
      }
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUpdateUser(event) {
    event.preventDefault();
    if (!userToEdit) return;
    isSubmitting = true;
    errorMessage = "";
    try {
      const updatePromises = [];
      const originalUser = users.find((u) => u.id === userToEdit.id);
      
      if (originalUser.username !== userToEdit.username || originalUser.email !== userToEdit.email) {
        updatePromises.push(data.updateUser(userToEdit.id, {
          username: userToEdit.username,
          email: userToEdit.email,
        }));
      }

      if (newPassword) {
        updatePromises.push(data.changeUserPassword(userToEdit.id, newPassword));
      }

      if (updatePromises.length > 0) await Promise.all(updatePromises);
      closeEditModal();
    } catch (e) {
      errorMessage = e.message || "Error al actualizar usuario.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    errorMessage = "";
    try {
      await data.deleteUser(userToDelete.id);
      closeDeleteModal();
    } catch (e) {
      errorMessage = e.message || "Error al eliminar usuario.";
    }
  }

  function handleAction(event) {
    const { type, data: userData } = event.detail;
    if (type === 'edit') openEditModal(userData);
    else if (type === 'delete') openDeleteModal(userData);
  }

  function openDeleteModal(user) {
    userToDelete = user;
    showDeleteModal = true;
    isDeleteConfirmEnabled = false;
    deleteConfirmTimer = setTimeout(() => { isDeleteConfirmEnabled = true; }, 3000);
  }

  function closeDeleteModal() {
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer);
    showDeleteModal = false;
    userToDelete = null;
  }

  function openEditModal(user) {
    userToEdit = { ...user };
    newPassword = "";
    errorMessage = "";
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    userToEdit = null;
  }
</script>

{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando usuarios...</p>
  </div>
{:else}
<div class="management-container">
  <div class="refresh-container">
    <button class="btn-refresh" on:click={() => data.fetchUsers()}>
      Refrescar información
    </button>
  </div>
  <div class="form-container">
    <h3>Crear Nuevo Usuario</h3>
    <form class="create-form" on:submit={handleCreateUser}>
      <input type="text" placeholder="Nombre de usuario" bind:value={newUser.username} required disabled={isSubmitting} />
      <input type="email" placeholder="Gmail" bind:value={newUser.email} disabled={isSubmitting} />
      <input type="text" placeholder="Nombre completo" bind:value={newUser.fullName} required disabled={isSubmitting} />
      
      <div class="password-wrapper">
        {#if showCreatePassword}
          <input 
            type="text" 
            placeholder="Contraseña" 
            bind:value={newUser.password} 
            required 
            disabled={isSubmitting} 
          />
        {:else}
          <input 
            type="password" 
            placeholder="Contraseña" 
            bind:value={newUser.password} 
            required 
            disabled={isSubmitting} 
          />
        {/if}
        <button type="button" class="toggle-password" on:click={() => showCreatePassword = !showCreatePassword}>
          {#if showCreatePassword}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.45L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.77C18.91,14.82 19.96,13.53 20.58,12C19.27,9.11 15.9,7 12,7C10.91,7 9.89,7.16 8.94,7.45L7.33,5.82C8.75,5.06 10.32,4.5 12,4.5M3.42,9.08L5.61,11.27C5.58,11.5 5.56,11.75 5.56,12A3.04,3.04 0 0,0 8.6,15.04L10.05,16.5C8.38,17.21 6.36,17.5 4.42,17.29C5.53,15.86 6.32,14.11 6.63,12.57L3.42,9.08Z" /></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" /></svg>
          {/if}
        </button>
      </div>
      
      <select bind:value={newUser.role} required disabled={isSubmitting}>
        <option value="ADMIN">ADMIN</option>
        <option value="MECANIC">MECANIC</option>
      </select>
      <button type="submit" class="btn-create" disabled={isSubmitting}>
        {isSubmitting ? "Creando..." : "Crear"}
      </button>
    </form>
    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  </div>

  <div class="table-wrapper">
    <DataGrid columns={userColumns} data={users} on:action={handleAction} />
  </div>
</div>
{/if}

{#if showEditModal}
  <div class="modal-overlay" >
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar Usuario</h3>
        <button class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form class="modal-form" on:submit={handleUpdateUser}>
        <label>Usuario: <input type="text" bind:value={userToEdit.username} required /></label>
        <label>Gmail: <input type="email" bind:value={userToEdit.email} /></label>
        <label>Nueva Contraseña:
            <div class="password-wrapper">
                {#if showEditNewPassword}
                    <input 
                        type="text" 
                        bind:value={newPassword} 
                        placeholder="Dejar en blanco para no cambiar" 
                    />
                {:else}
                    <input 
                        type="password" 
                        bind:value={newPassword} 
                        placeholder="Dejar en blanco para no cambiar" 
                    />
                {/if}
                 <button type="button" class="toggle-password" on:click={() => showEditNewPassword = !showEditNewPassword}>
                    {#if showEditNewPassword}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.45L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.77C18.91,14.82 19.96,13.53 20.58,12C19.27,9.11 15.9,7 12,7C10.91,7 9.89,7.16 8.94,7.45L7.33,5.82C8.75,5.06 10.32,4.5 12,4.5M3.42,9.08L5.61,11.27C5.58,11.5 5.56,11.75 5.56,12A3.04,3.04 0 0,0 8.6,15.04L10.05,16.5C8.38,17.21 6.36,17.5 4.42,17.29C5.53,15.86 6.32,14.11 6.63,12.57L3.42,9.08Z" /></svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" /></svg>
                    {/if}
                </button>
            </div>
        </label>
        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>Cancelar</button>
          <button type="submit" class="btn-save" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div class="modal-overlay" >
    <div class="modal-content confirmation" on:click|stopPropagation>
      <h3>Confirmar Eliminación</h3>
      <p>
        ¿Está seguro que desea eliminar al usuario "{userToDelete.fullName}"?
      </p>
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" on:click={closeDeleteModal}>Cancelar</button>
        <button type="button" class="btn-delete" on:click={handleDeleteUser} disabled={!isDeleteConfirmEnabled}>
          {isDeleteConfirmEnabled ? "Sí, Eliminar" : "Espere 3 segundos"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .loader-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
  }
  .management-container {
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    height: 100%;
  }
  .form-container {
    padding: 16px;
    background: #e0e0e0;
    border: 2px outset #c0c0c0;
  }
  h3 {
    margin: 0 0 12px 0;
  }
  .create-form {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .create-form input,
  .create-form select {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-size: 11px;
    font-family: inherit;
    flex: 1;
  }
  .btn-create {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
  }
  .table-wrapper {
    flex: 1;
    overflow-y: auto;
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    min-height: 0;
  }
  .error-message {
    color: red;
    margin-top: 10px;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: #e0e0e0;
    padding: 20px;
    border: 2px outset #c0c0c0;
    min-width: 400px;
  }
  .modal-content.confirmation {
    font-size: medium;
    text-align: center;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .modal-form input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  .btn-cancel,
  .btn-save {
    padding: 4px 12px;
    border: 1px outset #c0c0c0;
    cursor: pointer;
  }
  .btn-save {
    font-weight: bold;
  }
  .btn-delete[disabled] {
    background: #d3d3d3;
    cursor: not-allowed;
  }

  .password-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
  }
  .password-wrapper input {
    width: 100%;
    padding-right: 30px;
  }
  .toggle-password {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
  }
  .toggle-password svg {
    width: 16px;
    height: 16px;
    fill: #555;
  }
  .refresh-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .btn-refresh {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
  }
  .btn-refresh:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
</style>

