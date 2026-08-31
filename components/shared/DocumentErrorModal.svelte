<script>
  import { documentErrorVisible } from '../../stores/ui.js';

  function close() {
    documentErrorVisible.set(false);
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && $documentErrorVisible) close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $documentErrorVisible}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" role="presentation" on:click={close}>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="doc-error-card" role="dialog" aria-modal="true" aria-label="Documento no disponible" on:click|stopPropagation>
      <svg
        class="drop-mascot"
        viewBox="0 0 200 220"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Gotita triste"
      >
        <ellipse class="drop-shadow" cx="100" cy="200" rx="45" ry="8" />

        <g class="drop-body">
          <path
            d="M100 20
               C 100 20, 40 110, 40 150
               A 60 60 0 1 0 160 150
               C 160 110, 100 20, 100 20 Z"
            fill="url(#dropGradient)"
          />
          <ellipse class="drop-shine" cx="72" cy="120" rx="10" ry="16" />

          <g class="drop-face">
            <ellipse class="eye" cx="80" cy="145" rx="5" ry="7" />
            <ellipse class="eye" cx="120" cy="145" rx="5" ry="7" />
            <path class="mouth" d="M84 175 Q100 165 116 175" />
          </g>

          <path class="tear" d="M60 150 C 60 150, 52 168, 52 176 A 8 8 0 1 0 68 176 C 68 168, 60 150, 60 150 Z" />
        </g>

        <defs>
          <linearGradient id="dropGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7fc7ff" />
            <stop offset="100%" stop-color="#2f8fd6" />
          </linearGradient>
        </defs>
      </svg>

      <h2>Documento no disponible</h2>
      <p class="doc-error-subtitle">
        No pudimos encontrar este documento en este momento.
      </p>
      <ul class="doc-error-reasons">
        <li>El archivo aún no ha sido cargado.</li>
        <li>El documento fue eliminado o reemplazado.</li>
        <li>Hubo un problema temporal al recuperarlo.</li>
      </ul>

      <button class="doc-error-btn" on:click={close}>
        Cerrar
      </button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 35, 50, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .doc-error-card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(47, 143, 214, 0.25);
    padding: 36px 32px;
    max-width: 380px;
    width: calc(100% - 32px);
    text-align: center;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  }

  .drop-mascot {
    width: 120px;
    height: auto;
    margin-bottom: 4px;
  }

  .drop-shadow {
    fill: #2f8fd6;
    opacity: 0.15;
    animation: shadow-pulse 2.4s ease-in-out infinite;
    transform-origin: 100px 200px;
  }

  .drop-body {
    animation: bob 2.4s ease-in-out infinite;
    transform-origin: 100px 190px;
  }

  .drop-shine {
    fill: #ffffff;
    opacity: 0.45;
  }

  .eye {
    fill: #1c3d52;
    animation: blink 4.5s ease-in-out infinite;
    transform-origin: center;
  }

  .mouth {
    fill: none;
    stroke: #1c3d52;
    stroke-width: 3;
    stroke-linecap: round;
  }

  .tear {
    fill: #bfe6ff;
    opacity: 0;
    animation: tear-fall 2.4s ease-in infinite;
    animation-delay: 0.6s;
    transform-origin: 60px 150px;
  }

  h2 {
    margin: 8px 0 6px;
    font-size: 1.25rem;
    color: #1c3d52;
  }

  .doc-error-subtitle {
    margin: 0 0 14px;
    color: #4a6478;
    font-size: 0.92rem;
  }

  .doc-error-reasons {
    text-align: left;
    color: #5c7688;
    font-size: 0.83rem;
    margin: 0 0 22px;
    padding-left: 20px;
    line-height: 1.6;
  }

  .doc-error-btn {
    background: linear-gradient(180deg, #4fa8e8 0%, #2f8fd6 100%);
    color: #ffffff;
    border: none;
    border-radius: 10px;
    padding: 10px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(47, 143, 214, 0.35);
  }

  .doc-error-btn:hover {
    filter: brightness(1.05);
  }

  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  @keyframes shadow-pulse {
    0%, 100% { transform: scale(1); opacity: 0.15; }
    50% { transform: scale(0.85); opacity: 0.1; }
  }

  @keyframes blink {
    0%, 92%, 100% { transform: scaleY(1); }
    96% { transform: scaleY(0.1); }
  }

  @keyframes tear-fall {
    0% { opacity: 0; transform: translateY(0); }
    15% { opacity: 1; }
    70% { opacity: 1; transform: translateY(22px); }
    85% { opacity: 0; transform: translateY(26px); }
    100% { opacity: 0; transform: translateY(0); }
  }
</style>
