<script>
  import { createEventDispatcher } from 'svelte';
  import Loader from './Loader.svelte';

  export let imageUrls = [];
  export let isLoading = false;

  const dispatch = createEventDispatcher();

  let currentIndex = 0;
  let imageHasError = false;
  let blobImages = [];

  // Reset index when blobImages changes
  $: if (blobImages.length > 0) {
    currentIndex = 0;
    imageHasError = false;
  }

  // Fetch images as blobs when imageUrls changes
  $: if (imageUrls.length > 0 && blobImages.length === 0) {
    console.log('fetchBlobs called with imageUrls:', imageUrls);
    fetchBlobs();
  }

  function isPdfUrl(url) {
    return typeof url === 'string' && url.trim().toLowerCase().endsWith('.pdf');
  }

  async function fetchBlobs() {
    isLoading = true;
    try {
      blobImages = await Promise.all(imageUrls.map(async (img) => {
        if (isPdfUrl(img.url)) {
          return { ...img, blobUrl: null, isPdf: true };
        }
        try {
          const response = await fetch(img.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          return { ...img, blobUrl, isPdf: false };
        } catch (e) {
          console.error('Error fetching image:', e);
          return { ...img, blobUrl: null, isPdf: false };
        }
      }));
    } catch (e) {
      console.error('Error in fetchBlobs:', e);
      blobImages = [];
    }
    isLoading = false;
  }

  function closeModal() {
    blobImages.forEach(img => {
      if (img.blobUrl && !img.isPdf) URL.revokeObjectURL(img.blobUrl);
    });
    blobImages = [];
    dispatch('close');
  }

  function goToNext() {
    currentIndex = (currentIndex + 1) % blobImages.length;
  }

  function goToPrevious() {
    currentIndex = (currentIndex - 1 + blobImages.length) % blobImages.length;
  }

  function handleImageError() {
    imageHasError = true;
  }
</script>

<div class="modal-overlay" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h3>Imágenes de la Inspección</h3>
      <button class="close-btn" on:click={closeModal}>×</button>
    </div>

    <div class="modal-body">
      {#if isLoading}
        <div class="status-container">
          <Loader />
        </div>
      {:else if blobImages.length === 0}
        <div class="status-container">
          <p>No hay imágenes para esta inspección.</p>
        </div>
      {:else}
        <div class="carousel-container">
          <button class="nav-btn prev" on:click={goToPrevious}>&#10094;</button>

          <div class="image-wrapper">
            {#key currentIndex}
              {#if blobImages[currentIndex]?.isPdf}
                <div class="pdf-preview">
                  <span class="pdf-icon">📄</span>
                  <span class="pdf-label">{blobImages[currentIndex].label ?? 'Documento PDF'}</span>
                  <a class="pdf-open-btn" href={blobImages[currentIndex].url} target="_blank" rel="noopener noreferrer">Abrir PDF</a>
                </div>
              {:else if imageHasError || !blobImages[currentIndex].blobUrl}
                <div class="image-error">
                  <span>{imageHasError ? 'URL de imagen rota' : 'Error al cargar imagen'}</span>
                </div>
              {:else}
                <img
                  src={blobImages[currentIndex].blobUrl}
                  alt={`Inspección ${currentIndex + 1}`}
                  on:error={handleImageError}
                />
              {/if}
            {/key}
            <div class="image-counter">
              {currentIndex + 1} / {blobImages.length}
            </div>
          </div>

          <button class="nav-btn next" on:click={goToNext}>&#10095;</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: #e0e0e0;
    border: 2px outset #c0c0c0;
    width: 90vw;
    height: 90vh;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #888;
  }
  .modal-header h3 {
    margin: 0;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }
  .modal-body {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    overflow: hidden;
  }
  .status-container {
    text-align: center;
    font-size: 1.2em;
  }
  .carousel-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
  }
  .nav-btn {
    background-color: rgba(0, 0, 0, 0.3);
    color: white;
    border: none;
    font-size: 2em;
    cursor: pointer;
    padding: 15px;
    border-radius: 50%;
    user-select: none;
    transition: background-color 0.2s;
    margin: 0 10px;
  }
  .nav-btn:hover {
    background-color: rgba(0, 0, 0, 0.6);
  }
  .image-wrapper {
    flex: 1;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  .image-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border: 2px inset #c0c0c0;
  }
  .image-counter {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 0.9em;
  }
  .image-error {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;
    border: 2px dashed #999;
    color: #555;
    font-size: 1.1em;
  }
  .pdf-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    border: 2px dashed #bbb;
  }
  .pdf-icon {
    font-size: 3.5em;
    line-height: 1;
  }
  .pdf-label {
    font-size: 1em;
    color: #444;
    font-weight: bold;
  }
  .pdf-open-btn {
    padding: 8px 20px;
    background: #c62828;
    color: #fff;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.95em;
    font-weight: bold;
  }
  .pdf-open-btn:hover {
    background: #8e0000;
  }
</style>
