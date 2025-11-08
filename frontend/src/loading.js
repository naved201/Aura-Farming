export function createLoadingScreen() {
  return `
    <div class="loading-screen">
      <div class="loading-content">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <div class="loading-text">
          <p class="loading-title">Loading...</p>
          <p class="loading-subtitle">Please wait</p>
        </div>
      </div>
    </div>
  `;
}

