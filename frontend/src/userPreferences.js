import { supabase } from './config.js';
import { getUserProfile } from './auth.js';

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createZoneButtonMarkup(zone, index) {
  const nameFallback = `Zone ${index + 1}`;
  const zoneName = zone?.name && zone.name.trim().length > 0 ? zone.name.trim() : nameFallback;
  // Make all zone buttons green (active) by default since they're valid zones
  const buttonClass = `zone-button zone-button-active`;

  const dataAttributes = [];
  if (zone?.id !== undefined && zone?.id !== null) {
    dataAttributes.push(`data-zone-id="${escapeHtml(zone.id)}"`);
  }
  if (zone?.owner) {
    dataAttributes.push(`data-zone-owner="${escapeHtml(zone.owner)}"`);
  }

  return `
    <div class="${buttonClass}" ${dataAttributes.join(' ')}>
      ${escapeHtml(zoneName)}
    </div>
  `;
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
            <div class="zones-list" id="zones-list">
              <!-- Fetched zones from database will be inserted here -->
              <div id="database-zones-container"></div>
              
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
                <label for="zone-name">Zone Name</label>
                <input type="text" id="zone-name" class="form-input" placeholder="Enter zone name (e.g., North Field, Garden 1)">
              </div>
              
              <div class="form-field">
                <label for="crop-type">Crop</label>
                <select id="crop-type" class="form-input form-select">
                  <option value="">Select crop type</option>
                  <!-- Crop options will be loaded dynamically from Supabase -->
                </select>
              </div>
              
              <div class="form-field">
                <label for="water-volume">Inches of water</label>
                <input type="number" id="water-volume" class="form-input" placeholder="Enter inches" step="0.1">
              </div>
              
              <div class="form-field">
                <label for="frequency">Inches of soil</label>
                <input type="number" id="frequency" class="form-input" placeholder="Enter inches" step="0.1">
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

export async function loadUserZones() {
  const zonesContainer = document.getElementById('database-zones-container');
  if (!zonesContainer) {
    console.warn('Zones container not found in DOM');
    return;
  }

  zonesContainer.setAttribute('aria-busy', 'true');
  zonesContainer.innerHTML = `
    <div class="zone-button zone-button-inactive" data-loading="true">
      Loading zones...
    </div>
  `;

  try {
    const profile = await getUserProfile();

    if (!profile) {
      zonesContainer.innerHTML = `
        <div class="zone-button zone-button-inactive" data-empty="true">
          Sign in to view your zones
        </div>
      `;
      return;
    }

    const { data: zones, error } = await supabase
      .from('zones')
      .select('id, name, crop_type, watering_amount_l, soil_inches, auto_irrigation_enabled, owner')
      .eq('owner', profile.id);

    if (error) {
      throw error;
    }

    const userZones = zones || [];

    if (userZones.length === 0) {
      zonesContainer.innerHTML = `
        <div class="zone-button zone-button-inactive" data-empty="true">
          No zones saved yet
        </div>
      `;
      return;
    }

    userZones.sort((a, b) => {
      const nameA = (a?.name || '').toLowerCase();
      const nameB = (b?.name || '').toLowerCase();
      if (nameA === nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB);
    });

    zonesContainer.innerHTML = userZones
      .map((zone, index) => createZoneButtonMarkup(zone, index))
      .join('');

    // Add click handlers to zone buttons
    zonesContainer.querySelectorAll('.zone-button[data-zone-id]').forEach(button => {
      button.addEventListener('click', async () => {
        const zoneId = button.getAttribute('data-zone-id');
        const zone = userZones.find(z => z.id === zoneId);
        if (zone) {
          // Load zone data into form
          const { loadZoneIntoForm } = await import('./App.js');
          loadZoneIntoForm(zone);
          
          // Show the form
          const form = document.getElementById('zone-config-form');
          if (form) {
            form.classList.add('show');
            setTimeout(() => {
              form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading user zones:', error);
    zonesContainer.innerHTML = `
      <div class="zone-button zone-button-inactive" data-error="true">
        Unable to load zones
      </div>
    `;
  } finally {
    zonesContainer.removeAttribute('aria-busy');
  }
}