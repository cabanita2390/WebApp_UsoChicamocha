<script>
  import { onMount, onDestroy } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { userColumns } from '../../config/table-definitions.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';

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
    username: "", email: "", fullName: "", password: "", role: "OPERARIO",
    licenseCategory: "", licenseExpiry: "",
  };
  let newUser = { ...initialUserState };
  let newUserLicenseFile = null;
  let editUserLicenseFile = null;

  // Soft-delete recovery
  let softDeletedUserToRestore = null;
  let showSoftDeletedModal = false;
  let isRestoringUser = false;

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
      const created = await data.createUser(newUser);
      if (created?.id && newUserLicenseFile && newUserLicenseFile.length) {
        await data.uploadUserLicenseDocument(created.id, newUserLicenseFile[0]);
      }
      newUser = { ...initialUserState };
      newUserLicenseFile = null;
    } catch (e) {
      if (e.status === 409 && e.body?.softDeletedUser) {
        softDeletedUserToRestore = e.body.softDeletedUser;
        showSoftDeletedModal = true;
        errorMessage = e.body.error || e.message || "Usuario eliminado detectado";
      } else if (e.status === 500) {
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
      
      const hasInfoChange =
        originalUser.username !== userToEdit.username ||
        originalUser.email !== userToEdit.email ||
        originalUser.role !== userToEdit.role ||
        (originalUser.licenseCategory ?? '') !== (userToEdit.licenseCategory ?? '') ||
        (originalUser.licenseExpiry ?? '') !== (userToEdit.licenseExpiry ?? '');

      if (hasInfoChange) {
        updatePromises.push(data.updateUser(userToEdit.id, {
          username: userToEdit.username,
          email: userToEdit.email,
          role: userToEdit.role,
          licenseCategory: userToEdit.licenseCategory || null,
          licenseExpiry: userToEdit.licenseExpiry || null,
        }));
      }

      if (editUserLicenseFile && editUserLicenseFile.length) {
        updatePromises.push(data.uploadUserLicenseDocument(userToEdit.id, editUserLicenseFile[0]));
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
    else if (type === 'view_license_doc' && userData.licenseDocumentUrl) {
      window.open(`${import.meta.env.VITE_API_BASE_URL}${userData.licenseDocumentUrl}`, '_blank', 'noopener,noreferrer');
    }
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
    editUserLicenseFile = null;
    errorMessage = "";
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    userToEdit = null;
    editUserLicenseFile = null;
  }

  async function handleRestoreUser() {
    if (!softDeletedUserToRestore?.id) return;
    isRestoringUser = true;
    try {
      const restored = await data.restoreUser(softDeletedUserToRestore.id);
      showSoftDeletedModal = false;
      softDeletedUserToRestore = null;
      errorMessage = "";
      newUser = { ...initialUserState };
      newUserLicenseFile = null;
      data.fetchUsers();
    } catch (e) {
      errorMessage = "Error al restaurar usuario: " + (e.message || "desconocido");
    } finally {
      isRestoringUser = false;
    }
  }

  function handleCreateDifferent() {
    showSoftDeletedModal = false;
    softDeletedUserToRestore = null;
    errorMessage = "✏️ Por favor, cambia el nombre de usuario en el formulario de arriba";
    // Enfocar el campo de username (primera sección del formulario)
    setTimeout(() => {
      const inputs = document.querySelectorAll('.create-form input[type="text"]');
      if (inputs && inputs.length > 0) inputs[0].focus();
    }, 150);
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

      <div class="create-section-label">Datos de acceso</div>
      <div class="create-grid">
        <label class="cf-field">
          <span class="cf-label">Usuario *</span>
          <input type="text" bind:value={newUser.username} required disabled={isSubmitting} placeholder="jdoe" />
        </label>
        <label class="cf-field">
          <span class="cf-label">Nombre completo *</span>
          <input type="text" bind:value={newUser.fullName} required disabled={isSubmitting} placeholder="Juan Doe" />
        </label>
        <label class="cf-field">
          <span class="cf-label">Gmail *</span>
          <input type="email" bind:value={newUser.email} required disabled={isSubmitting} placeholder="correo@gmail.com" />
        </label>
        <label class="cf-field">
          <span class="cf-label">Contraseña *</span>
          <div class="password-wrapper">
            {#if showCreatePassword}
              <input type="text" bind:value={newUser.password} required disabled={isSubmitting} placeholder="Contraseña" />
            {:else}
              <input type="password" bind:value={newUser.password} required disabled={isSubmitting} placeholder="Contraseña" />
            {/if}
            <button type="button" class="toggle-password" on:click={() => showCreatePassword = !showCreatePassword}>
              {#if showCreatePassword}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.45L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.77C18.91,14.82 19.96,13.53 20.58,12C19.27,9.11 15.9,7 12,7C10.91,7 9.89,7.16 8.94,7.45L7.33,5.82C8.75,5.06 10.32,4.5 12,4.5M3.42,9.08L5.61,11.27C5.58,11.5 5.56,11.75 5.56,12A3.04,3.04 0 0,0 8.6,15.04L10.05,16.5C8.38,17.21 6.36,17.5 4.42,17.29C5.53,15.86 6.32,14.11 6.63,12.57L3.42,9.08Z" /></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" /></svg>
              {/if}
            </button>
          </div>
        </label>
        <label class="cf-field cf-field--span">
          <span class="cf-label">Rol *</span>
          <select bind:value={newUser.role} required disabled={isSubmitting}>
            <option value="ADMIN">ADMIN </option>
            <option value="SUPERVISOR_OPERATIVO">SUPERVISOR OPERATIVO </option>
            <option value="OPERARIO">OPERARIO</option>
          </select>
        </label>
      </div>

      <div class="create-section-label">Licencia de tránsito <span class="create-section-opt">(opcional)</span></div>
      <div class="create-grid create-grid--license">
        <label class="cf-field">
          <span class="cf-label">Categoría</span>
          <input type="text" bind:value={newUser.licenseCategory} disabled={isSubmitting} placeholder="B1" />
        </label>
        <label class="cf-field">
          <span class="cf-label">Vencimiento</span>
          <input type="date" bind:value={newUser.licenseExpiry} disabled={isSubmitting} />
        </label>
        <label class="file-upload-field cf-field cf-field--doc" class:file-upload-field--disabled={isSubmitting}>
          <span class="file-upload-field__label cf-label">Documento</span>
          <div class="file-upload-field__row">
            <span class="file-upload-field__name" class:file-upload-field__name--empty={!newUserLicenseFile?.length}>
              {newUserLicenseFile?.length ? newUserLicenseFile[0].name : 'Ningún archivo'}
            </span>
            <span class="file-upload-field__btn">Examinar…</span>
            <input type="file" class="file-upload-field__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={newUserLicenseFile} disabled={isSubmitting} />
          </div>
        </label>
        <div class="cf-field cf-field--btn">
          <span class="cf-label">&nbsp;</span>
          <button type="submit" class="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </div>
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

        <div class="edit-section-label">Datos de acceso</div>
        <div class="edit-grid">
          <label class="cf-field">
            <span class="cf-label">Usuario</span>
            <input type="text" bind:value={userToEdit.username} required />
          </label>
          <label class="cf-field">
            <span class="cf-label">Gmail</span>
            <input type="email" bind:value={userToEdit.email} />
          </label>
          {#if isAdmin}
            <label class="cf-field cf-field--span">
              <span class="cf-label">Rol</span>
              <select bind:value={userToEdit.role}>
                <option value="ADMIN">ADMIN — Acceso completo del sistema</option>
                <option value="SUPERVISOR_OPERATIVO">SUPERVISOR_OPERATIVO — Crear y editar activos, inspecciones, combustible</option>
                <option value="OPERARIO">OPERARIO — Solo inspecciones pre-operativas y tanqueo (móvil)</option>
              </select>
              <small class="role-helper-text">Los operarios acceden a través de la app móvil</small>
            </label>
          {/if}
          <label class="cf-field">
            <span class="cf-label">Nueva contraseña</span>
            <div class="password-wrapper">
              {#if showEditNewPassword}
                <input type="text" bind:value={newPassword} placeholder="Dejar en blanco para no cambiar" />
              {:else}
                <input type="password" bind:value={newPassword} placeholder="Dejar en blanco para no cambiar" />
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
        </div>

        <div class="edit-section-label">Licencia de tránsito</div>
        <div class="edit-grid">
          <label class="cf-field">
            <span class="cf-label">Categoría</span>
            <input type="text" bind:value={userToEdit.licenseCategory} placeholder="Ej: B1, C1 (opcional)" />
          </label>
          <label class="cf-field">
            <span class="cf-label">Vencimiento</span>
            <input type="date" bind:value={userToEdit.licenseExpiry} />
          </label>
        </div>

        <div class="license-doc-card">
          <div class="license-doc-card__header">
            <svg class="license-doc-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span class="license-doc-card__title">Documento de licencia</span>
          </div>
          {#if userToEdit.licenseDocumentUrl}
            <a
              class="license-doc-card__preview"
              href="{import.meta.env.VITE_API_BASE_URL}{userToEdit.licenseDocumentUrl}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Ver documento actual
            </a>
          {:else}
            <span class="license-doc-card__empty">Sin documento registrado</span>
          {/if}
          <label class="file-upload-field">
            <span class="file-upload-field__label">Reemplazar documento</span>
            <div class="file-upload-field__row">
              <span class="file-upload-field__name" class:file-upload-field__name--empty={!editUserLicenseFile?.length}>
                {editUserLicenseFile?.length ? editUserLicenseFile[0].name : 'Ningún archivo'}
              </span>
              <span class="file-upload-field__btn">Examinar…</span>
              <input type="file" class="file-upload-field__input" accept=".pdf,.jpg,.jpeg,.png,.webp" bind:files={editUserLicenseFile} />
            </div>
          </label>
        </div>

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

{#if showSoftDeletedModal && softDeletedUserToRestore}
  <div class="modal-overlay" on:click={handleCreateDifferent}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Advertencia: Usuario Eliminado Detectado</h3>
        <button class="close-btn" on:click={handleCreateDifferent}>×</button>
      </div>

      <div class="modal-body">
        <p>Un usuario con el nombre de usuario <strong>"{softDeletedUserToRestore.username}"</strong> fue eliminado previamente.</p>

        <div class="user-info-card">
          <p><strong>Nombre completo:</strong> {softDeletedUserToRestore.fullName}</p>
          <p><strong>Email:</strong> {softDeletedUserToRestore.email}</p>
          <p><strong>Rol anterior:</strong> {softDeletedUserToRestore.role}</p>
          <p><strong>Categoría de licencia:</strong> {softDeletedUserToRestore.licenseCategory || "N/A"}</p>
          {#if softDeletedUserToRestore.licenseExpiry}
            <p><strong>Vencimiento de licencia:</strong> {softDeletedUserToRestore.licenseExpiry}</p>
          {/if}
        </div>

        <p style="margin-top: 16px; color: #666;">
          ¿Es el mismo usuario que deseas restaurar, o es una persona diferente?
        </p>
        <p style="margin-top: 8px; padding: 8px; background: #fff3cd; border-left: 3px solid #ffc107; color: #856404;">
          <strong>Nota:</strong> Si es una persona diferente, deberás cambiar el nombre de usuario antes de crear.
        </p>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          class="btn-cancel"
          on:click={handleCreateDifferent}
          disabled={isRestoringUser}
        >
          Es diferente, crear nuevo
        </button>
        <button
          type="button"
          class="btn-restore"
          on:click={handleRestoreUser}
          disabled={isRestoringUser}
        >
          {isRestoringUser ? "Restaurando..." : "Es el mismo, restaurar"}
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
    padding: 12px 16px 14px;
    background: #e0e0e0;
    border: 2px outset #c0c0c0;
  }
  h3 {
    margin: 0 0 10px 0;
    font-size: 12px;
  }
  .create-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  /* ── Labeled grid for create/edit forms ────────────── */
  .cf-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .cf-label {
    font-size: 9px;
    font-weight: bold;
    color: #404040;
    white-space: nowrap;
  }
  .cf-field input,
  .cf-field select {
    padding: 3px 5px;
    border: 1px inset #c0c0c0;
    font-size: 11px;
    font-family: inherit;
    background: #fff;
    min-height: 22px;
    width: 100%;
    box-sizing: border-box;
  }
  .create-section-label,
  .edit-section-label {
    font-size: 9px;
    font-weight: bold;
    color: #505050;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #b0b0b0;
    padding-bottom: 2px;
    margin: 8px 0 5px;
  }
  .create-section-label:first-of-type,
  .edit-section-label:first-child {
    margin-top: 2px;
  }
  .create-section-opt {
    font-weight: normal;
    text-transform: none;
    letter-spacing: 0;
    color: #888;
  }
  .create-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr));
    gap: 4px 8px;
    align-items: end;
  }
  .create-grid--license {
    grid-template-columns: 7rem 8rem 11rem auto;
    align-items: end;
    gap: 4px 8px;
  }
  .cf-field--doc { min-width: 0; }
  .cf-field--span { grid-column: span 1; }
  .cf-field--btn { display: flex; flex-direction: column; gap: 2px; width: fit-content; }
  .edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
    gap: 6px 10px;
    align-items: end;
  }
  .btn-create {
    padding: 4px 16px;
    background: linear-gradient(to bottom, #e8e8e8 0%, #c0c0c0 100%);
    border: 2px outset #ffffff;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
    font-size: 11px;
  }
  .btn-create:active {
    border-style: inset;
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
    width: min(560px, 96vw);
    box-sizing: border-box;
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
    gap: 2px;
  }
  .modal-form input,
  .modal-form select {
    padding: 3px 5px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    width: 100%;
    box-sizing: border-box;
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

  /* ── File upload widget ─────────────────────────── */
  .file-upload-field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
  }
  .file-upload-field--disabled {
    opacity: 0.55;
    pointer-events: none;
  }
  .file-upload-field__label {
    font-size: 10px;
    font-weight: bold;
    color: #444;
  }
  .file-upload-field__row {
    display: flex;
    align-items: stretch;
    border: 1px inset #c0c0c0;
    background: #fff;
    overflow: hidden;
    height: 22px;
  }
  .file-upload-field__name {
    flex: 1;
    padding: 0 5px;
    font-size: 10px;
    line-height: 22px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #222;
  }
  .file-upload-field__name--empty {
    color: #888;
  }
  .file-upload-field__btn {
    flex-shrink: 0;
    padding: 0 8px;
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
    border-left: 1px solid #b0b0b0;
    font-size: 10px;
    line-height: 22px;
    cursor: pointer;
    white-space: nowrap;
  }
  .file-upload-field__input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }

  /* ── License document card in edit modal ─────────── */
  .license-doc-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: #f0f4f8;
    border: 1px solid #c4d4e4;
    border-left: 3px solid #6090c0;
    margin-top: 4px;
  }
  .license-doc-card__header {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .license-doc-card__icon {
    width: 13px;
    height: 13px;
    color: #5070a0;
    flex-shrink: 0;
  }
  .license-doc-card__title {
    font-size: 10px;
    font-weight: bold;
    color: #304060;
  }
  .license-doc-card__preview {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px 4px 8px;
    background: #fff;
    border: 1px solid #a0b8d0;
    color: #1a4080;
    font-size: 10px;
    text-decoration: none;
    width: fit-content;
    transition: background 0.1s;
  }
  .license-doc-card__preview:hover {
    background: #e8f0fa;
    border-color: #6090c0;
  }
  .license-doc-card__preview svg {
    width: 12px;
    height: 12px;
    color: #4070b0;
    flex-shrink: 0;
  }
  .license-doc-card__empty {
    font-size: 10px;
    color: #909090;
    font-style: italic;
    padding-left: 2px;
  }

  /* ── Role helper text ──────────────────────────── */
  .role-helper-text {
    font-size: 9px;
    color: #666;
    font-style: italic;
    margin-top: 2px;
    display: block;
    padding: 0 2px;
  }

  /* ── Soft-delete modal ─────────────────────────── */
  .modal-body {
    margin-bottom: 16px;
    font-size: 11px;
    line-height: 1.5;
    color: #333;
  }

  .user-info-card {
    background: #f5f5f5;
    border-left: 4px solid #ffa500;
    padding: 12px;
    border-radius: 4px;
    margin: 12px 0;
    font-size: 10px;
  }

  .user-info-card p {
    margin: 6px 0;
    color: #444;
  }

  .user-info-card p strong {
    color: #333;
  }

  .btn-restore {
    background-color: #4CAF50;
    color: white;
    border: 2px outset #c0c0c0;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 11px;
    font-family: inherit;
  }

  .btn-restore:hover:not(:disabled) {
    background-color: #45a049;
  }

  .btn-restore:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #999;
  }
</style>

