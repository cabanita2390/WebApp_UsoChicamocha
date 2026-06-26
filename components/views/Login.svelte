<script>
  import { auth } from "../../stores/auth.js";
  import { data as dataStore } from "../../stores/data.js";

  let username = "";
  let password = "";
  let error = "";
  let isLoading = false;

  async function handleLogin(event) {
    event.preventDefault();
    isLoading = true;
    error = "";

    try {
      const result = await auth.login(username, password);

      if (result.success) {
        dataStore.fetchDashboardData();
      } else {
        error = result.error;
      }
    } catch (err) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="login-container">
  <div class="login-box">
    <div class="header">
      <h2>Panel de Control - Acceso</h2>
    </div>
    <form class="login-form" on:submit={handleLogin}>
      <div class="logo-header">
        <img
          src="https://usochicamocha.com.co/wp-content/uploads/2024/02/Usochicamocha-v2.png"
          alt="Logo de Usochicamocha"
          class="logo-image"
        />
      </div>

      <div class="form-group">
        <label for="username">Usuario:</label>
        <input type="text" id="username" bind:value={username} required />
      </div>

      <div class="form-group">
        <label for="password">Contraseña:</label>
        <input type="password" id="password" bind:value={password} required />
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <button type="submit" class="login-btn" disabled={isLoading}>
        {isLoading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  </div>
</div>

<style>
  .logo-image {
    height: 60px;
    width: auto;
  }
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background-color: #c0c0c0;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
  }
  .login-box {
    width: 350px;
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px outset #c0c0c0;
  }
  .header {
    background: linear-gradient(to bottom, #000080 0%, #1084d0 100%);
    padding: 4px 8px;
    color: white;
    font-weight: bold;
    font-size: 12px;
  }
  .login-form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .logo-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    justify-content: center;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    font-weight: bold;
  }
  input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-size: 11px;
    font-family: inherit;
    background-color: #ffffff;
  }
  .error-message {
    color: #8b0000;
    background-color: #ffc0cb;
    border: 1px solid #8b0000;
    padding: 8px;
    text-align: center;
    font-size: 10px;
  }
  .login-btn {
    padding: 8px 12px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    color: #000000;
    font-weight: bold;
    align-self: center;
    width: 100px;
  }
  .login-btn:hover:not(:disabled) {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
  .login-btn:active:not(:disabled) {
    border: 1px inset #c0c0c0;
  }
  .login-btn:disabled {
    color: #808080;
    cursor: not-allowed;
  }
</style>
