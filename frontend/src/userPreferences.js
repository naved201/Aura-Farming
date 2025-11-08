export function createUserPreferencesComponent() {
  return `
    <div class="reviews-container">
      <div class="reviews-overflow-clip">
        <div class="content-area">
          <!-- App Bar -->
          <div class="app-bar app-bar-1">
            <div class="app-bar-trailing"></div>
            <div class="app-bar-text-content">
              <p class="app-bar-title">User Preferences</p>
            </div>
          </div>

          <div class="user-preferences-page">
            <!-- Next Watering Schedule -->
            <div class="next-watering-schedule">
              <p class="schedule-label">Next watering schedule:</p>
              <p class="schedule-value">--</p>
            </div>

            <!-- Page Title -->
            <div class="preferences-header">
              <h2 class="preferences-subtitle">Your zones</h2>
            </div>

            <!-- Zone List -->
            <div class="zones-list">
              <div class="zone-button zone-button-inactive" data-zone="1">
                Zone 1
              </div>
              <div class="zone-button zone-button-active" data-zone="2">
                Zone 2
              </div>
              <div class="zone-button zone-button-inactive" data-zone="3">
                Zone 3
              </div>
              <div class="zone-button zone-button-inactive" data-zone="4">
                Zone 4
              </div>
              <button class="add-zone-button" id="add-zone-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Zone
              </button>
            </div>

            <!-- Zone Configuration Form -->
            <div class="zone-config-form" id="zone-config-form">
              <div class="form-field">
                <label for="crop-type">Crop</label>
                <input type="text" id="crop-type" class="form-input" placeholder="Select crop type">
              </div>
              
              <div class="form-field">
                <label for="water-volume">Litres of water</label>
                <input type="number" id="water-volume" class="form-input" placeholder="Enter litres">
              </div>
              
              <div class="form-field">
                <label for="frequency">Frequency in a day</label>
                <input type="number" id="frequency" class="form-input" placeholder="Enter frequency">
              </div>
              
              <div class="form-field checkbox-field">
                <label class="checkbox-label">
                  <input type="checkbox" id="automate" class="form-checkbox">
                  <span>Do you want to automate it</span>
                </label>
              </div>

              <div class="form-actions">
                <button class="form-button form-button-primary" id="save-zone-btn">Save Zone</button>
                <button class="form-button form-button-secondary" id="cancel-zone-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

