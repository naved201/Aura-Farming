export function createCropManagementComponent() {
  return `
    <div class="reviews-container">
      <div class="reviews-overflow-clip">
        <div class="content-area">
          <!-- App Bar -->
          <div class="app-bar app-bar-1">
            <div class="app-bar-trailing"></div>
            <div class="app-bar-text-content">
              <p class="app-bar-title">Crop Management</p>
            </div>
          </div>

          <div class="crop-management-page-blank">
            <div class="blank-page-content">
              <div class="blank-page-icon">🌾</div>
              <h1 class="blank-page-title">Crop Management</h1>
              <p class="blank-page-subtitle">Your crop management dashboard will appear here</p>
              <div class="blank-page-stats">
                <div class="blank-stat-item">
                  <div class="blank-stat-icon">🌱</div>
                  <div class="blank-stat-label">Active Crops</div>
                </div>
                <div class="blank-stat-item">
                  <div class="blank-stat-icon">💧</div>
                  <div class="blank-stat-label">Water Efficiency</div>
                </div>
                <div class="blank-stat-item">
                  <div class="blank-stat-icon">📊</div>
                  <div class="blank-stat-label">Growth Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

