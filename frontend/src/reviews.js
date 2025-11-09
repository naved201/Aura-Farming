// Image assets from Figma
const imgImageAlbumArt = "https://www.figma.com/api/mcp/asset/fe69c311-f4c9-47c2-aff6-ad44dc9877db";

// Zone schedule data - each zone has its next scheduled time
// For demo: using 10-second intervals to demonstrate the watering process
const zoneScheduleData = [
  { zone: 'Zone 1', scheduledTime: new Date(Date.now() + 10 * 1000), duration: '30 min' }, // 10 seconds from now
  { zone: 'Zone 2', scheduledTime: new Date(Date.now() + 20 * 1000), duration: '25 min' }, // 20 seconds from now
  { zone: 'Zone 3', scheduledTime: new Date(Date.now() + 30 * 1000), duration: '35 min' }, // 30 seconds from now
  { zone: 'Zone 4', scheduledTime: new Date(Date.now() + 40 * 1000), duration: '40 min' }  // 40 seconds from now
];

// Generate schedule cards HTML from zone data
function generateScheduleCards() {
  // Sort by scheduled time (earliest first)
  const sortedSchedule = [...zoneScheduleData].sort((a, b) => {
    return a.scheduledTime.getTime() - b.scheduledTime.getTime();
  });
  
  return sortedSchedule.map((schedule, index) => {
    const timeUntil = Math.max(0, Math.floor((schedule.scheduledTime.getTime() - Date.now()) / 1000 / 60));
    const timeStr = schedule.scheduledTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const timeUntilSeconds = Math.max(0, Math.floor((schedule.scheduledTime.getTime() - Date.now()) / 1000));
    
    return `
    <div class="schedule-card" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}" data-index="${index}">
      <div class="schedule-card-header">
        <label class="zone-disable-checkbox-label">
          <input type="checkbox" class="zone-disable-checkbox" data-zone="${schedule.zone}" checked>
          <span class="checkbox-custom"></span>
        </label>
        <span class="schedule-zone-name">${schedule.zone}</span>
        <span class="schedule-status-badge">Upcoming</span>
      </div>
      <div class="schedule-card-content">
        <div class="schedule-time-display">
          <span class="schedule-icon">🕐</span>
          <span class="schedule-time">${timeStr}</span>
        </div>
        <div class="schedule-countdown">
          <span class="countdown-text">Scheduled in</span>
          <span class="countdown-value" data-zone="${schedule.zone}">${timeUntilSeconds}s</span>
        </div>
        <div class="water-tube-container">
          <div class="water-tube">
            <div class="water-tube-fill" data-zone="${schedule.zone}" style="height: 0%;">
              <div class="water-wave"></div>
            </div>
            <div class="water-tube-label">Watering Progress</div>
          </div>
        </div>
        <div class="schedule-duration">Duration: ${schedule.duration}</div>
      </div>
    </div>
  `;
  }).join('');
}

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
                <div class="zone-item-wrapper">
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
                    <button class="zone-graph-toggle" data-zone="1" aria-label="Toggle Zone 1 Graph">
                      <span class="zone-graph-toggle-text">View Graph</span>
                      <svg class="zone-graph-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div class="zone-graph-section" data-zone="1">
                    <div class="zone-graph-section-inner">
                      <div class="zone-graph-container">
                        <canvas class="zone-moisture-graph" data-zone="1"></canvas>
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

                <!-- Zone 2 -->
                <div class="zone-item-wrapper">
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
                    <button class="zone-graph-toggle" data-zone="2" aria-label="Toggle Zone 2 Graph">
                      <span class="zone-graph-toggle-text">View Graph</span>
                      <svg class="zone-graph-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div class="zone-graph-section" data-zone="2">
                    <div class="zone-graph-section-inner">
                      <div class="zone-graph-container">
                        <canvas class="zone-moisture-graph" data-zone="2"></canvas>
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

                <!-- Zone 3 -->
                <div class="zone-item-wrapper">
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
                    <button class="zone-graph-toggle" data-zone="3" aria-label="Toggle Zone 3 Graph">
                      <span class="zone-graph-toggle-text">View Graph</span>
                      <svg class="zone-graph-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div class="zone-graph-section" data-zone="3">
                    <div class="zone-graph-section-inner">
                      <div class="zone-graph-container">
                        <canvas class="zone-moisture-graph" data-zone="3"></canvas>
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

                <!-- Zone 4 -->
                <div class="zone-item-wrapper">
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
                    <button class="zone-graph-toggle" data-zone="4" aria-label="Toggle Zone 4 Graph">
                      <span class="zone-graph-toggle-text">View Graph</span>
                      <svg class="zone-graph-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div class="zone-graph-section" data-zone="4">
                    <div class="zone-graph-section-inner">
                      <div class="zone-graph-container">
                        <canvas class="zone-moisture-graph" data-zone="4"></canvas>
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
            </div>
            
            <button class="zone-carousel-arrow zone-carousel-arrow-right" aria-label="Next Zone">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <!-- Watering Schedule Carousel Section -->
          <div class="watering-schedule-section">
            <div class="watering-schedule-header">
              <h2 class="watering-schedule-title">Watering Schedule</h2>
              <button class="halt-queue-button" id="halt-queue-btn" aria-label="Halt All Watering">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                <span class="halt-button-text">Halt All</span>
              </button>
            </div>
            <div class="watering-schedule-carousel-container">
              <button class="watering-carousel-arrow watering-carousel-arrow-left" aria-label="Previous Schedule">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              
              <div class="watering-carousel-wrapper">
                <div class="watering-carousel" id="watering-carousel">
                  ${generateScheduleCards()}
                </div>
              </div>
              
              <button class="watering-carousel-arrow watering-carousel-arrow-right" aria-label="Next Schedule">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

