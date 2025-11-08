// Image assets from Figma
const imgImageAlbumArt = "https://www.figma.com/api/mcp/asset/fe69c311-f4c9-47c2-aff6-ad44dc9877db";

export function createReviewsComponent() {
  return `
    <div class="reviews-container" data-name="Examples/Reviews-Web" data-node-id="14:2081">
      <div class="reviews-overflow-clip">
        <!-- Main Content -->
        <div class="content-area" data-name="Content" data-node-id="14:2102">
          <!-- App Bar -->
          <div class="app-bar app-bar-1">
            <div class="app-bar-trailing"></div>
            <div class="app-bar-text-content">
              <p class="app-bar-title">Homepage</p>
            </div>
          </div>

          <!-- Water Saved Metric -->
          <div class="water-saved-metric">
            <p class="water-saved-label">Water saved</p>
            <p class="water-saved-value">--</p>
          </div>

          <!-- Zones Carousel Section -->
          <div class="zones-carousel-section">
            <button class="zone-carousel-arrow zone-carousel-arrow-left" aria-label="Previous Zone">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            
            <div class="zones-carousel-wrapper">
              <div class="zones-carousel" id="zones-carousel">
                <!-- Zone 1 -->
                <div class="zone-container">
                  <div class="zone-header">
                    <h3 class="zone-title">Zone 1</h3>
                    <button class="update-button" aria-label="Update Zone 1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span>Update</span>
                    </button>
                  </div>
                  <div class="zone-data-grid">
                    <div class="data-panel">
                      <h4 class="data-panel-title">Moisture level</h4>
                      <div class="data-panel-content">
                        <p class="data-value">--</p>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Rainfall</h4>
                      <div class="data-panel-content">
                        <p class="data-value">--</p>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Soil health</h4>
                      <p class="data-panel-subtitle">(pertaining how long its wet for)</p>
                      <div class="data-panel-content">
                        <p class="data-value">--</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Zone 2 -->
                <div class="zone-container">
                  <div class="zone-header">
                    <div class="zone-title-group">
                      <h3 class="zone-title">Zone 2</h3>
                      <input type="checkbox" class="zone-checkbox" aria-label="Zone 2 checkbox">
                    </div>
                    <button class="update-button" aria-label="Update Zone 2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span>Update</span>
                    </button>
                  </div>
                  <div class="zone-data-grid">
                    <div class="data-panel">
                      <h4 class="data-panel-title">Moisture level</h4>
                      <div class="data-panel-content">
                        <div class="moisture-status">
                          <span class="status-item status-dry">dry → red</span>
                          <span class="status-item status-wet">wet → yellow</span>
                          <span class="status-item status-very">very → green</span>
                        </div>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Rainfall</h4>
                      <div class="data-panel-content">
                        <div class="rainfall-status">
                          <span class="status-item">yes</span>
                          <span class="status-item">no</span>
                        </div>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Soil health</h4>
                      <p class="data-panel-subtitle">(pertaining how long its wet for)</p>
                      <div class="data-panel-content">
                        <div class="soil-health-indicator"></div>
                        <p class="data-value">--</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Zone 3 -->
                <div class="zone-container">
                  <div class="zone-header">
                    <div class="zone-title-group">
                      <h3 class="zone-title">Zone 3</h3>
                      <input type="checkbox" class="zone-checkbox" aria-label="Zone 3 checkbox">
                    </div>
                    <button class="update-button" aria-label="Update Zone 3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span>Update</span>
                    </button>
                  </div>
                  <div class="zone-data-grid">
                    <div class="data-panel">
                      <h4 class="data-panel-title">Moisture level</h4>
                      <div class="data-panel-content">
                        <p class="data-value">65%</p>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Rainfall</h4>
                      <div class="data-panel-content">
                        <p class="data-value">Yes</p>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Soil health</h4>
                      <p class="data-panel-subtitle">(pertaining how long its wet for)</p>
                      <div class="data-panel-content">
                        <p class="data-value">Good</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Zone 4 -->
                <div class="zone-container">
                  <div class="zone-header">
                    <div class="zone-title-group">
                      <h3 class="zone-title">Zone 4</h3>
                      <input type="checkbox" class="zone-checkbox" aria-label="Zone 4 checkbox">
                    </div>
                    <button class="update-button" aria-label="Update Zone 4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span>Update</span>
                    </button>
                  </div>
                  <div class="zone-data-grid">
                    <div class="data-panel">
                      <h4 class="data-panel-title">Moisture level</h4>
                      <div class="data-panel-content">
                        <div class="moisture-status">
                          <span class="status-item status-dry">dry → red</span>
                          <span class="status-item status-wet">wet → yellow</span>
                          <span class="status-item status-very">very → green</span>
                        </div>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Rainfall</h4>
                      <div class="data-panel-content">
                        <div class="rainfall-status">
                          <span class="status-item">yes</span>
                          <span class="status-item">no</span>
                        </div>
                      </div>
                    </div>
                    <div class="data-panel">
                      <h4 class="data-panel-title">Soil health</h4>
                      <p class="data-panel-subtitle">(pertaining how long its wet for)</p>
                      <div class="data-panel-content">
                        <div class="soil-health-indicator"></div>
                        <p class="data-value">Excellent</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button class="zone-carousel-arrow zone-carousel-arrow-right" aria-label="Next Zone">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <!-- Graph Section -->
          <div class="graph-section">
            <div class="graph-container">
              <canvas id="moisture-graph" class="moisture-graph"></canvas>
              <div class="graph-axes">
                <div class="graph-y-axis">Moisture</div>
                <div class="graph-x-axis">Hours</div>
              </div>
            </div>
            <div class="graph-legend">
              <div class="legend-item">
                <span class="legend-line legend-line-black"></span>
                <span class="legend-text">~ moisture good <=> moisture medium</span>
              </div>
              <div class="legend-item">
                <span class="legend-line legend-line-blue"></span>
                <span class="legend-text">~ rainfall no <=> rainfall yes</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot"></span>
                <span class="legend-text">~ no problem <=> yes plan : medium</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

