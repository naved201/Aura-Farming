// Get Supabase client
function getSupabase() {
  if (typeof window === 'undefined' || !window.supabase) {
    throw new Error('Supabase script not loaded');
  }
  const SUPABASE_URL = 'https://sxserhbozsmqbyninsbq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2VyaGJvenNtcWJ5bmluc2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjM0MDQsImV4cCI6MjA3ODE5OTQwNH0.WGZfUuLU5Ug0FH6RCwl2RE8F89FqP--qtBhe8ENZ8r0';
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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
                <select id="crop-type" class="form-input form-select">
                  <option value="">Select crop type</option>
                  <!-- Crop options will be loaded dynamically -->
                </select>
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

/**
 * Fetch crop names from Supabase thresholds table and populate dropdown
 */
export async function loadCropOptions() {
  try {
    const cropSelect = document.getElementById('crop-type');
    if (!cropSelect) {
      console.error('Crop select element not found');
      return;
    }

    // Fetch crops from Supabase thresholds table
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('thresholds')
      .select('crop_name')
      .order('crop_name', { ascending: true });

    if (error) {
      console.error('Error fetching crops from Supabase:', error);
      // Show error in dropdown
      const errorOption = document.createElement('option');
      errorOption.value = '';
      errorOption.textContent = 'Error loading crops';
      cropSelect.appendChild(errorOption);
      return;
    }

    // Clear existing options (except the first "Select crop type" option)
    cropSelect.innerHTML = '<option value="">Select crop type</option>';

    // Populate dropdown with crop names
    if (data && data.length > 0) {
      data.forEach(crop => {
        const option = document.createElement('option');
        option.value = crop.crop_name;
        option.textContent = crop.crop_name.charAt(0).toUpperCase() + crop.crop_name.slice(1); // Capitalize first letter
        cropSelect.appendChild(option);
      });
      console.log(`✅ Loaded ${data.length} crops into dropdown`);
    } else {
      console.warn('No crops found in thresholds table');
      const noCropsOption = document.createElement('option');
      noCropsOption.value = '';
      noCropsOption.textContent = 'No crops available';
      cropSelect.appendChild(noCropsOption);
    }
  } catch (error) {
    console.error('Error in loadCropOptions:', error);
  }
}

