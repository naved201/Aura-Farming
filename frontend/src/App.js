import { createNavigationRail, setupNavigationRail } from './navigationRail.js'
import { createReviewsComponent } from './reviews.js'
import { protectRoute, logout, getCurrentUser, getUserProfile } from './auth.js'
import { createUserPreferencesComponent, loadCropOptions, loadUserZones } from './userPreferences.js'
import { createCropManagementComponent } from './cropManagement.js'
import { setupDashboard } from './dashboard.js'
import { setupStatsCarousel } from './carousel.js'


import { supabase } from './config.js';


export function createApp() {
  return `
    <div class="app-layout">
      ${createNavigationRail()}
      <div class="app-content" id="app-content">
        ${createReviewsComponent()}
      </div>
    </div>
  `;
}

export function navigateTo(page) {
  const contentArea = document.getElementById('app-content');
  if (!contentArea) return;

  if (page === 'dashboard') {
    contentArea.innerHTML = createReviewsComponent();
    setTimeout(() => {
      setupDashboard();
    }, 50);
  } else if (page === 'user-preferences') {
    contentArea.innerHTML = createUserPreferencesComponent();
    setTimeout(() => {
      setupUserPreferences();
      loadCropOptions();
      loadUserZones();
    }, 50);
  } else if (page === 'crop-management') {
    contentArea.innerHTML = createCropManagementComponent();
  }
}

export function setupCropManagementCard() {
  const cropManagementHeroCard = document.querySelector('.crop-management-hero-card');
  if (!cropManagementHeroCard) return;

  cropManagementHeroCard.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('crop-management');
    
    // Update navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
  });
}

export async function setupApp() {
  // Protect the route - check if user is authenticated
  const isAuthenticated = await protectRoute();
  if (!isAuthenticated) {
    return; // User will be redirected to login
  }

  // Get current user info and profile
  try {
    const user = await getCurrentUser();
    const profile = await getUserProfile();
    
    console.log('Logged in as:', user?.email);
    console.log('User profile:', profile);
    
    // Profile is automatically created by the SQL trigger when user signs up
    if (profile) {
      console.log('Display name:', profile.display_name);
    }
  } catch (err) {
    console.error('Error getting user:', err);
  }

  // Set up navigation with our router
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const route = item.getAttribute('data-route');
      
      // Remove active state from all items
      navItems.forEach(nav => nav.classList.remove('active'));
      // Add active state to clicked item
      item.classList.add('active');
      
      // Handle navigation
      if (route === 'dashboard') {
        navigateTo('dashboard');
      } else if (route === 'user-preferences') {
        navigateTo('user-preferences');
      } else if (route === 'logout') {
        if (confirm('Are you sure you want to logout?')) {
          try {
            await logout();
            // logout() will redirect to login page
          } catch (err) {
            console.error('Logout error:', err);
            alert('Error logging out. Please try again.');
          }
        }
      }
    });
  });
  
  // Set initial active state
  const dashboardItem = document.querySelector('.nav-item[data-route="dashboard"]');
  if (dashboardItem) {
    dashboardItem.classList.add('active');
  }

  // Setup crop management card and carousel
  setTimeout(() => {
    setupCropManagementCard();
    setupStatsCarousel();
  }, 100);

  // Setup dashboard on initial load (since createApp() loads the dashboard by default)
  setTimeout(() => {
    setupDashboard();
  }, 150);
}

// Function to load zone data into form for editing
// We need to access editingZoneId from setupUserPreferences scope, so we'll use a closure
let setEditingZoneId = null;

export function loadZoneIntoForm(zone) {
  const zoneNameInput = document.getElementById('zone-name');
  const cropTypeInput = document.getElementById('crop-type');
  const waterVolumeInput = document.getElementById('water-volume');
  const frequencyInput = document.getElementById('frequency');
  const automateCheckbox = document.getElementById('automate');
  
  if (zoneNameInput) zoneNameInput.value = zone?.name || '';
  if (cropTypeInput) {
    cropTypeInput.value = zone?.crop_type || '';
    cropTypeInput.dispatchEvent(new Event('change')); // Trigger change event
  }
  if (waterVolumeInput) waterVolumeInput.value = zone?.watering_amount_l || '';
  if (frequencyInput) frequencyInput.value = zone?.soil_inches || '';
  if (automateCheckbox) automateCheckbox.checked = zone?.auto_irrigation_enabled || false;
  
  // Trigger input events to update formData
  if (zoneNameInput) zoneNameInput.dispatchEvent(new Event('input'));
  if (waterVolumeInput) waterVolumeInput.dispatchEvent(new Event('input'));
  if (frequencyInput) frequencyInput.dispatchEvent(new Event('input'));
  if (automateCheckbox) automateCheckbox.dispatchEvent(new Event('change'));
  
  // Set the editing zone ID
  if (setEditingZoneId && zone?.id) {
    setEditingZoneId(zone.id);
  }
}

export function setupUserPreferences() {
  // Remove duplicate import - getCurrentUser is already imported at top
  // The zone buttons are now optional - we'll save with custom names instead

  // Add zone button (shows form)
  const addZoneBtn = document.getElementById('add-zone-btn');
  const zoneConfigForm = document.getElementById('zone-config-form');
  
  if (addZoneBtn && zoneConfigForm) {
    addZoneBtn.addEventListener('click', () => {
      // Clear form before showing (for new zone)
      const zoneNameInput = document.getElementById('zone-name');
      const cropTypeInput = document.getElementById('crop-type');
      const waterVolumeInput = document.getElementById('water-volume');
      const frequencyInput = document.getElementById('frequency');
      const automateCheckbox = document.getElementById('automate');
      
      if (zoneNameInput) zoneNameInput.value = '';
      if (cropTypeInput) cropTypeInput.value = '';
      if (waterVolumeInput) waterVolumeInput.value = '';
      if (frequencyInput) frequencyInput.value = '';
      if (automateCheckbox) automateCheckbox.checked = false;
      
      // Reset editing zone ID (new zone)
      editingZoneId = null;
      
      // Show the form
      zoneConfigForm.classList.add('show');
      // Scroll to form
      setTimeout(() => {
        zoneConfigForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    });
  }

  // Store form data and current editing zone ID
  let formData = {
    zoneName: '',
    cropType: '',
    waterVolume: '',
    frequency: '',
    automate: false
  };
  let editingZoneId = null; // Track which zone is being edited
  
  // Expose setter for editingZoneId to loadZoneIntoForm
  setEditingZoneId = (id) => {
    editingZoneId = id;
  };

  // Handle zone name input
  const zoneNameInput = document.getElementById('zone-name');
  if (zoneNameInput) {
    zoneNameInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      formData.zoneName = value;
      
      // Validation: Check if zone name is entered
      if (value.length > 0) {
        zoneNameInput.style.borderColor = '#4caf50'; // Green border when valid
        console.log('Zone name:', value);
      } else {
        zoneNameInput.style.borderColor = 'rgba(102, 187, 106, 0.35)'; // Reset to default
      }
    });
  }

  // Handle crop type select dropdown
  const cropTypeInput = document.getElementById('crop-type');
  if (cropTypeInput) {
    // Use 'change' event for select dropdown (works better than 'input')
    cropTypeInput.addEventListener('change', (e) => {
      const value = e.target.value.trim();
      formData.cropType = value;
      
      // Validation: Check if crop type is selected
      if (value.length > 0) {
        cropTypeInput.style.borderColor = '#4caf50'; // Green border when valid
        console.log('Crop type selected:', value);
      } else {
        cropTypeInput.style.borderColor = 'rgba(102, 187, 106, 0.35)'; // Reset to default
      }
    });
  }

  // Handle water volume input
  const waterVolumeInput = document.getElementById('water-volume');
  if (waterVolumeInput) {
    waterVolumeInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      formData.waterVolume = value;
      
      // Validation: Check if it's a valid positive number
      if (!isNaN(value) && value > 0) {
        waterVolumeInput.style.borderColor = '#4caf50'; // Green border when valid
        console.log('Water volume:', value, 'litres');
      } else if (e.target.value === '') {
        waterVolumeInput.style.borderColor = 'rgba(102, 187, 106, 0.35)'; // Reset to default
        formData.waterVolume = '';
      } else {
        waterVolumeInput.style.borderColor = '#f44336'; // Red border when invalid
        console.log('Invalid water volume');
      }
    });

    // Prevent negative numbers
    waterVolumeInput.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
        e.preventDefault();
      }
    });
  }

  // Handle soil inches input (previously frequency)
  const frequencyInput = document.getElementById('frequency');
  if (frequencyInput) {
    frequencyInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      formData.frequency = value; // Keep using frequency key in formData for now to avoid breaking other code
      
      // Validation: Check if it's a valid positive number (allow decimals)
      if (!isNaN(value) && value > 0) {
        frequencyInput.style.borderColor = '#4caf50'; // Green border when valid
        console.log('Soil inches:', value, 'inches');
      } else if (e.target.value === '') {
        frequencyInput.style.borderColor = 'rgba(102, 187, 106, 0.35)'; // Reset to default
        formData.frequency = '';
      } else {
        frequencyInput.style.borderColor = '#f44336'; // Red border when invalid
        console.log('Invalid soil inches (must be greater than 0)');
      }
    });

    // Prevent negative numbers (but allow decimals)
    frequencyInput.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
        e.preventDefault();
      }
    });
  }

  // Handle automation checkbox
  const automateCheckbox = document.getElementById('automate');
  if (automateCheckbox) {
    automateCheckbox.addEventListener('change', (e) => {
      formData.automate = e.target.checked;
      console.log('Automation:', e.target.checked ? 'Enabled' : 'Disabled');
    });
  }

  // Form actions
  const saveBtn = document.getElementById('save-zone-btn');
  const cancelBtn = document.getElementById('cancel-zone-btn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      // Validate all fields
      if (!formData.zoneName || formData.zoneName.trim() === '') {
        alert('Please enter a zone name');
        zoneNameInput?.focus();
        return;
      }
      
      if (!formData.cropType || formData.cropType.trim() === '') {
        alert('Please enter a crop type');
        cropTypeInput?.focus();
        return;
      }
      
      if (!formData.waterVolume || formData.waterVolume <= 0) {
        alert('Please enter a valid water volume (greater than 0)');
        waterVolumeInput?.focus();
        return;
      }
      
      if (!formData.frequency || formData.frequency <= 0) {
        alert('Please enter a valid soil depth in inches (must be greater than 0)');
        frequencyInput?.focus();
        return;
      }

      // Get current user
      let user;
      try {
        user = await getCurrentUser();
        if (!user) {
          alert('You must be logged in to save zones');
          return;
        }
      } catch (error) {
        console.error('Error getting user:', error);
        alert('Error: Please log in again');
        return;
      }

      // Show loading state
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';

      try {
        let result;
        
        // If editing an existing zone (by ID), update it
        if (editingZoneId) {
          const { data, error } = await supabase.from('zones')
            .update({
              name: formData.zoneName.trim(),
              crop_type: formData.cropType.trim(),
              watering_amount_l: formData.waterVolume,
              soil_inches: formData.frequency,
              auto_irrigation_enabled: formData.automate
            })
            .eq('id', editingZoneId)
            .eq('owner', user.id)
            .select();

          result = { data, error };
          console.log('Updated existing zone:', data);
        } else {
          // Check if zone with this name already exists for this user (for new zones)
          const { data: existingZone, error: checkError } = await supabase.from('zones')
            .select('id')
            .eq('owner', user.id)
            .eq('name', formData.zoneName.trim())
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned (not an error)
            throw checkError;
          }

          if (existingZone) {
            // UPDATE existing zone by name (user is updating an existing zone)
            const { data, error } = await supabase.from('zones')
              .update({
                crop_type: formData.cropType.trim(),
                watering_amount_l: formData.waterVolume,
                soil_inches: formData.frequency,
                auto_irrigation_enabled: formData.automate
              })
              .eq('id', existingZone.id)
              .eq('owner', user.id)
              .select();

            result = { data, error };
            console.log('Updated existing zone by name:', data);
          } else {
            // INSERT new zone (zone ID is auto-generated by database)
            const { data, error } = await supabase.from('zones')
              .insert({
                owner: user.id,
                name: formData.zoneName.trim(),
                crop_type: formData.cropType.trim(),
                watering_amount_l: formData.waterVolume,
                soil_inches: formData.frequency,
                auto_irrigation_enabled: formData.automate
              })
              .select();

            result = { data, error };
            console.log('Created new zone:', data);
          }
        }

        if (result.error) {
          throw result.error;
        }

        // Success!
        alert(`Zone "${formData.zoneName}" saved successfully!\nCrop: ${formData.cropType}\nWater: ${formData.waterVolume}L\nSoil Depth: ${formData.frequency} inches\nAutomate: ${formData.automate ? 'Yes' : 'No'}`);
        
        // Clear form after successful save
        if (zoneNameInput) zoneNameInput.value = '';
        if (cropTypeInput) cropTypeInput.value = '';
        if (waterVolumeInput) waterVolumeInput.value = '';
        if (frequencyInput) frequencyInput.value = '';
        if (automateCheckbox) automateCheckbox.checked = false;
        
        // Reset form data
        formData = {
          zoneName: '',
          cropType: '',
          waterVolume: '',
          frequency: '',
          automate: false
        };
        
        // Reset border colors
        if (zoneNameInput) zoneNameInput.style.borderColor = 'rgba(102, 187, 106, 0.35)';
        if (cropTypeInput) cropTypeInput.style.borderColor = 'rgba(102, 187, 106, 0.35)';
        if (waterVolumeInput) waterVolumeInput.style.borderColor = 'rgba(102, 187, 106, 0.35)';
        if (frequencyInput) frequencyInput.style.borderColor = 'rgba(102, 187, 106, 0.35)';

        console.log('Zone saved to Supabase:', result.data);

        // Hide form after successful save
        if (zoneConfigForm) {
          zoneConfigForm.classList.remove('show');
        }
        
        // Reset editing zone ID
        editingZoneId = null;

        await loadUserZones();

      } catch (error) {
        console.error('Error saving zone:', error);
        alert(`Error saving zone: ${error.message}\n\nPlease check:\n1. You are logged in\n2. Your Supabase table has the correct columns\n3. Row Level Security allows INSERT/UPDATE`);
      } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const form = document.getElementById('zone-config-form');
      if (form) {
        // Reset form fields
        form.querySelectorAll('input, select').forEach(element => {
          if (element.type === 'checkbox') {
            element.checked = false;
          } else if (element.tagName === 'SELECT') {
            element.value = '';
            element.style.borderColor = 'rgba(102, 187, 106, 0.35)';
          } else {
            element.value = '';
            element.style.borderColor = 'rgba(102, 187, 106, 0.35)'; // Reset border color
          }
        });
        // Hide the form
        form.classList.remove('show');
      }
      // Reset form data
      formData = {
        zoneName: '',
        cropType: '',
        waterVolume: '',
        frequency: '',
        automate: false
      };
      // Reset editing zone ID
      editingZoneId = null;
      console.log('Form cancelled and reset');
    });
  }
}

