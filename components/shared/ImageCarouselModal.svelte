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

  async function fetchBlobs() {
    console.log('Starting fetchBlobs');
    isLoading = true;
    try {
      blobImages = await Promise.all(imageUrls.map(async (img) => {
        console.log('Fetching image URL:', img.url);
        try {
          const response = await fetch(img.url); // No auth needed, /uploads/ is permitAll
          console.log('Response status for', img.url, ':', response.status);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          console.log('Blob created for', img.url);
          return { ...img, blobUrl };
        } catch (e) {
          console.error('Error fetching image:', e);
          return { ...img, blobUrl: null };
        }
      }));
      console.log('All fetches completed, blobImages:', blobImages);
    } catch (e) {
      console.error('Error in fetchBlobs:', e);
      blobImages = [];
    }
    console.log('Setting isLoading to false');
    isLoading = false;
  }

  function closeModal() {
    // Revoke blob URLs to free memory
    blobImages.forEach(img => {
      if (img.blobUrl) URL.revokeObjectURL(img.blobUrl);
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
              {#if imageHasError || !blobImages[currentIndex].blobUrl}
                <div class="image-error">
                  <span>{imageHasError ? 'URL de imagen roto' : 'Error al cargar imagen'}</span>
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
</style>
