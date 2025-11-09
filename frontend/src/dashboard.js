import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';
import { analyzeZoneMoistureStatus, analyzeMoistureTrend, generateWateringSuggestions, fetchThresholds, predictThresholdCrossing } from './moistureAnalysis.js';

let scheduleCategorizationIntervalId = null;
const removedScheduleKeys = new Set();

function buildScheduleKey(zone, scheduledTime) {
  return `${zone}::${scheduledTime}`;
}

function markScheduleRemoved(zone, scheduledTime) {
  if (!zone || !scheduledTime) return;
  removedScheduleKeys.add(buildScheduleKey(zone, scheduledTime));
}

function isScheduleRemoved(zone, scheduledTime) {
  if (!zone || !scheduledTime) return false;
  return removedScheduleKeys.has(buildScheduleKey(zone, scheduledTime));
}

function cleanupRemovedSchedule(zone, scheduledTime) {
  if (!zone || !scheduledTime) return;
  const key = buildScheduleKey(zone, scheduledTime);
  const stillExists = Array.from(document.querySelectorAll('[data-zone][data-scheduled-time]')).some(el => {
    return el.getAttribute('data-zone') === zone && el.getAttribute('data-scheduled-time') === scheduledTime;
  });
  if (!stillExists) {
    removedScheduleKeys.delete(key);
  }
}

export function setupDashboard() {
  // Load zones from database and render them
  loadAndRenderZones().then(() => {
    // Setup zones carousel after zones are loaded
    setupZonesCarousel();
    
    // Setup watering schedule columns
    setupWateringScheduleColumns();
    
    // Load telemetry data for all zones
    loadZoneTelemetryData();
    
    // Load and display watering alerts/suggestions
    loadWateringAlerts();
    
    // Setup update buttons
    const updateButtons = document.querySelectorAll('.update-button');
    updateButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const zoneContainer = btn.closest('.zone-container');
        const zoneTitle = zoneContainer?.querySelector('.zone-title')?.textContent || 'Zone';
        // Refresh telemetry data when update button is clicked
        await loadZoneTelemetryData();
        // Refresh alerts
        await loadWateringAlerts();
        alert(`${zoneTitle} updated!`);
      });
    });

    // Setup zone graph toggles
    setupZoneGraphToggles();
    
    // Setup zone schedule toggles
    setupZoneScheduleToggles();
  });
}

/**
 * Load zones from database and render them dynamically
 */
async function loadAndRenderZones() {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.warn('User not authenticated, cannot load zones');
      return;
    }

    // Get all zones for the current user
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name')
      .eq('owner', user.id)
      .order('created_at', { ascending: true });

    if (zonesError) {
      console.error('Error fetching zones:', zonesError);
      return;
    }

    if (!zones || zones.length === 0) {
      console.log('No zones found for user');
      const carousel = document.getElementById('zones-carousel');
      if (carousel) {
        carousel.innerHTML = '<div class="no-zones-message" style="padding: 40px; text-align: center; color: #666;">No zones configured yet. Create a zone in User Preferences.</div>';
      }
      return;
    }

    // Get the carousel container
    const carousel = document.getElementById('zones-carousel');
    if (!carousel) {
      console.error('Zones carousel not found');
      return;
    }

    // Clear existing zones
    carousel.innerHTML = '';

    // Generate HTML for each zone
    zones.forEach((zone, index) => {
      const zoneHTML = generateZoneHTML(zone, index + 1);
      carousel.insertAdjacentHTML('beforeend', zoneHTML);
    });

    console.log(`✅ Loaded ${zones.length} zones from database`);
  } catch (error) {
    console.error('Error in loadAndRenderZones:', error);
  }
}

/**
 * Generate HTML for a single zone
 */
function generateZoneHTML(zone, index) {
  const zoneId = zone.id;
  const zoneName = zone.name;
  
  return `
    <div class="zone-item-wrapper" data-zone-id="${zoneId}">
      <div class="zone-container">
        <div class="zone-header">
          <h3 class="zone-title">${zoneName}</h3>
          <button class="update-button" aria-label="Update ${zoneName}">
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
        <button class="zone-graph-toggle" data-zone-id="${zoneId}" aria-label="Toggle ${zoneName} Graph">
          <span class="zone-graph-toggle-text">View Graph</span>
          <svg class="zone-graph-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <button class="zone-schedule-toggle" data-zone-id="${zoneId}" aria-label="Toggle ${zoneName} Schedule">
          <span class="zone-schedule-toggle-text">View Zone Schedule</span>
          <svg class="zone-schedule-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
      <div class="zone-graph-section" data-zone-id="${zoneId}">
        <div class="zone-graph-section-inner">
          <div class="zone-graph-container">
            <canvas class="zone-moisture-graph" data-zone-id="${zoneId}"></canvas>
            <div class="graph-axes">
              <div class="graph-y-axis">Moisture</div>
              <div class="graph-x-axis">Hours</div>
            </div>
          </div>
          <div class="graph-legend" id="graph-legend-${zoneId}">
            <div class="legend-item">
              <span class="legend-line" style="background: #000000; width: 40px; height: 3px; border-radius: 2px; display: inline-block;"></span>
              <span class="legend-text">Soil Moisture (%)</span>
            </div>
            <!-- Threshold lines will be added dynamically -->
          </div>
        </div>
      </div>
      <div class="zone-schedule-section" data-zone-id="${zoneId}">
        <div class="zone-schedule-section-inner">
          <div class="zone-individual-schedule" id="zone-${zoneId}-schedule-columns">
            <!-- Schedule cards will be generated here -->
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load telemetry data for zones and update the dashboard
 */
async function loadZoneTelemetryData() {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.warn('User not authenticated, cannot load telemetry data');
      return;
    }

    // Get all zones for the current user (include crop_type for threshold analysis)
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name, crop_type')
      .eq('owner', user.id);

    if (zonesError) {
      console.error('Error fetching zones:', zonesError);
      return;
    }

    if (!zones || zones.length === 0) {
      console.log('No zones found for user');
      return;
    }

    // For each zone, get the latest telemetry data
    for (const zone of zones) {
      // Get latest telemetry for this zone
      const { data: telemetry, error: telemetryError } = await supabase
        .from('telemetry')
        .select('moisture, rain')
        .eq('zone_id', zone.id)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (telemetryError) {
        console.error(`Error fetching telemetry for zone ${zone.name}:`, telemetryError);
        continue;
      }

      if (!telemetry) {
        console.log(`No telemetry data found for zone ${zone.name}`);
        continue;
      }

      // Find the zone container in the DOM by zone_id
      const zoneWrapper = document.querySelector(`.zone-item-wrapper[data-zone-id="${zone.id}"]`);
      
      if (zoneWrapper) {
        updateZoneDisplay(zoneWrapper, telemetry);
        
        // Analyze moisture status and update zone with status indicator
        if (zone.crop_type) {
          analyzeZoneMoistureStatus(zone.id, zone.name, zone.crop_type)
            .then(status => {
              updateZoneStatusIndicator(zoneWrapper, status);
            })
            .catch(err => console.error('Error analyzing zone status:', err));
        }
      } else {
        console.log(`Could not find zone element for zone ${zone.name} (${zone.id})`);
      }
    }
  } catch (error) {
    console.error('Error in loadZoneTelemetryData:', error);
  }
}

/**
 * Update zone display with telemetry data
 */
function updateZoneDisplay(zoneWrapper, telemetry) {
  if (!zoneWrapper) return;

  // Find moisture level panel
  const moisturePanel = zoneWrapper.querySelector('.data-panel-title');
  let moistureValueElement = null;
  
  // Find the moisture value element
  const dataPanels = zoneWrapper.querySelectorAll('.data-panel');
  dataPanels.forEach(panel => {
    const title = panel.querySelector('.data-panel-title');
    if (title && title.textContent.trim() === 'Moisture level') {
      moistureValueElement = panel.querySelector('.data-value');
    }
  });

  // Update moisture level
  if (moistureValueElement && telemetry.moisture !== null && telemetry.moisture !== undefined) {
    moistureValueElement.textContent = `${telemetry.moisture.toFixed(1)}%`;
  }

  // Find rainfall panel
  let rainfallValueElement = null;
  dataPanels.forEach(panel => {
    const title = panel.querySelector('.data-panel-title');
    if (title && title.textContent.trim() === 'Rainfall') {
      rainfallValueElement = panel.querySelector('.data-value');
    }
  });

  // Update rainfall
  if (rainfallValueElement && telemetry.rain !== null && telemetry.rain !== undefined) {
    // rain is boolean, display "Yes" or "No"
    rainfallValueElement.textContent = telemetry.rain ? 'Yes' : 'No';
  }
}

/**
 * Update zone status indicator based on moisture analysis
 * Changes the entire card background color based on status
 */
function updateZoneStatusIndicator(zoneWrapper, status) {
  if (!zoneWrapper || !status) return;

  // Find the zone container (the actual card)
  const zoneContainer = zoneWrapper.querySelector('.zone-container');
  if (!zoneContainer) return;

  // Remove all status classes from the zone container
  zoneContainer.classList.remove(
    'zone-status-critical',
    'zone-status-low',
    'zone-status-normal',
    'zone-status-saturated',
    'zone-status-no_data',
    'zone-status-unknown',
    'zone-status-error'
  );

  // Map status to card styling
  // For critical and low (very dry), use red
  // For normal, use green
  // For saturated, use blue
  if (status.status === 'critical' || status.status === 'low') {
    zoneContainer.classList.add('zone-status-critical');
  } else if (status.status === 'normal') {
    zoneContainer.classList.add('zone-status-normal');
  } else if (status.status === 'saturated') {
    zoneContainer.classList.add('zone-status-saturated');
  }
  // For no_data, unknown, error - no special styling (default card color)
}

/**
 * Load and display watering alerts/suggestions
 */
async function loadWateringAlerts() {
  try {
    const suggestions = await generateWateringSuggestions();
    const alertsContainer = document.getElementById('watering-alerts-container');
    
    if (!alertsContainer) {
      console.warn('Watering alerts container not found');
      return;
    }

    // Clear existing alerts
    alertsContainer.innerHTML = '';

    if (suggestions.length === 0) {
      // No alerts - show a positive message or hide the container
      alertsContainer.style.display = 'none';
      return;
    }

    // Show the container
    alertsContainer.style.display = 'block';

    // Create alert banner
    const alertBanner = document.createElement('div');
    alertBanner.className = 'watering-alert-banner';
    
    // Determine overall alert level
    const hasCritical = suggestions.some(s => s.status === 'critical');
    const alertLevel = hasCritical ? 'critical' : 'warning';
    
    alertBanner.classList.add(`alert-${alertLevel}`);
    
    alertBanner.innerHTML = `
      <div class="alert-header">
        <div class="alert-icon">
          ${hasCritical ? '⚠️' : '💧'}
        </div>
        <div class="alert-title">
          <h3>Watering Recommendations</h3>
          <p>${suggestions.length} zone${suggestions.length > 1 ? 's' : ''} ${hasCritical ? 'need immediate attention' : 'may need watering'}</p>
        </div>
        <button class="alert-close-btn" aria-label="Close alerts">×</button>
      </div>
      <div class="alert-content">
        ${suggestions.map(suggestion => `
          <div class="alert-item alert-item-${suggestion.status}" data-zone-id="${suggestion.zoneId}">
            <div class="alert-item-icon">
              ${suggestion.status === 'critical' ? '🔴' : '🟡'}
            </div>
            <div class="alert-item-content">
              <div class="alert-item-title">${suggestion.zoneName}</div>
              <div class="alert-item-message">${suggestion.message}</div>
              <div class="alert-item-details">
                <span>Crop: ${suggestion.cropType || 'Unknown'}</span>
                <span>•</span>
                <span>Moisture: ${suggestion.currentMoisture?.toFixed(1) || 'N/A'}%</span>
                <span>•</span>
                <span>Threshold: ${suggestion.minMoisture || 'N/A'}%</span>
              </div>
            </div>
            <div class="alert-item-action">
              <button class="alert-action-btn" data-zone-id="${suggestion.zoneId}">
                View Zone
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    alertsContainer.appendChild(alertBanner);

    // Add close button functionality
    const closeBtn = alertBanner.querySelector('.alert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        alertBanner.style.display = 'none';
      });
    }

    // Add click handlers for "View Zone" buttons
    const viewZoneButtons = alertBanner.querySelectorAll('.alert-action-btn');
    viewZoneButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const zoneId = btn.getAttribute('data-zone-id');
        // Scroll to the zone in the carousel
        scrollToZone(zoneId);
        // Optionally expand the zone's graph
        const graphToggle = document.querySelector(`.zone-graph-toggle[data-zone-id="${zoneId}"]`);
        if (graphToggle) {
          graphToggle.click();
        }
      });
    });
  } catch (error) {
    console.error('Error loading watering alerts:', error);
  }
}

/**
 * Scroll to a specific zone in the carousel
 */
function scrollToZone(zoneId) {
  const zoneWrapper = document.querySelector(`.zone-item-wrapper[data-zone-id="${zoneId}"]`);
  if (zoneWrapper) {
    zoneWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Update graph legend to show threshold information
 */
function updateGraphLegend(canvas, thresholds) {
  if (!canvas || !thresholds) return;

  const zoneId = canvas.getAttribute('data-zone-id');
  if (!zoneId) return;

  const legendContainer = document.getElementById(`graph-legend-${zoneId}`);
  if (!legendContainer) return;

  // Remove existing threshold legend items
  const existingThresholdItems = legendContainer.querySelectorAll('.legend-item-threshold');
  existingThresholdItems.forEach(item => item.remove());

  // Add min threshold legend (red dotted line)
  const minLegend = document.createElement('div');
  minLegend.className = 'legend-item legend-item-threshold';
  minLegend.innerHTML = `
    <span class="legend-line" style="background: #f44336; width: 40px; height: 2px; border-radius: 0; display: inline-block; border-top: 2px dotted #f44336;"></span>
    <span class="legend-text">Min: ${thresholds.min_moisture}%</span>
  `;
  legendContainer.appendChild(minLegend);

  // Add max threshold legend (blue dotted line)
  const maxLegend = document.createElement('div');
  maxLegend.className = 'legend-item legend-item-threshold';
  maxLegend.innerHTML = `
    <span class="legend-line" style="background: #2196f3; width: 40px; height: 2px; border-radius: 0; display: inline-block; border-top: 2px dotted #2196f3;"></span>
    <span class="legend-text">Max: ${thresholds.max_moisture}%</span>
  `;
  legendContainer.appendChild(maxLegend);
}

function setupZonesCarousel() {
  const carousel = document.getElementById('zones-carousel');
  const leftArrow = document.querySelector('.zone-carousel-arrow-left');
  const rightArrow = document.querySelector('.zone-carousel-arrow-right');
  
  if (!carousel || !leftArrow || !rightArrow) {
    setTimeout(setupZonesCarousel, 100);
    return;
  }

  // Store carousel state
  let currentIndex = 0;
  let zones = carousel.querySelectorAll('.zone-item-wrapper');
  const totalZones = zones.length;
  
  if (totalZones === 0) {
    setTimeout(setupZonesCarousel, 100);
    return;
  }

  function updateCarousel() {
    zones = carousel.querySelectorAll('.zone-item-wrapper');
    if (zones.length === 0) {
      setTimeout(updateCarousel, 100);
      return;
    }
    
    const wrapper = carousel.parentElement;
    if (!wrapper) {
      setTimeout(updateCarousel, 100);
      return;
    }
    
    const wrapperWidth = wrapper.offsetWidth;
    if (wrapperWidth === 0) {
      setTimeout(updateCarousel, 100);
      return;
    }
    
    // Get the gap from computed styles
    const carouselStyle = window.getComputedStyle(carousel);
    const gapValue = carouselStyle.gap || '12px';
    const gap = parseFloat(gapValue) || 12;
    
    // Set each zone to be exactly the wrapper width
    zones.forEach((zone, index) => {
      zone.style.width = wrapperWidth + 'px';
      zone.style.minWidth = wrapperWidth + 'px';
      zone.style.maxWidth = wrapperWidth + 'px';
      zone.style.flexBasis = wrapperWidth + 'px';
    });
    
    // Calculate transform: each zone is wrapperWidth + gap (except last one)
    const translateX = -currentIndex * (wrapperWidth + gap);
    
    carousel.style.transform = `translateX(${translateX}px)`;
    carousel.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  function next() {
    currentIndex = (currentIndex + 1) % totalZones;
    updateCarousel();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + totalZones) % totalZones;
    updateCarousel();
  }

  // Add direct click listeners to arrows
  rightArrow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    next();
  });
  
  leftArrow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    prev();
  });

  // Touch/swipe support
  let startX = 0;
  let isDragging = false;

  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  carousel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
  }, { passive: false });

  carousel.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        next();
      } else {
        prev();
      }
    }
  }, { passive: true });

  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    currentIndex = 0;
    updateCarousel();
  }, 200);
  
  // Recalculate on window resize
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel();
    }, 200);
  };
  
  window.addEventListener('resize', resizeHandler);
  
  // Cleanup function (optional, for when component is removed)
  return () => {
    window.removeEventListener('resize', resizeHandler);
  };
}

function setupWateringScheduleColumns() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  
  if (!columnsWrapper) {
    setTimeout(setupWateringScheduleColumns, 100);
    return;
  }

  // Setup countdown timers for all columns
  const allColumns = columnsWrapper.querySelectorAll('.schedule-column');
  allColumns.forEach(column => {
    const columnContent = column.querySelector('.schedule-column-content');
    if (columnContent) {
      setupScheduleCountdowns(columnContent);
    }
  });
  
  // Setup zone disable/enable functionality
  setupZoneDisableControls(columnsWrapper);
  
  // Setup global halt/resume functionality
  setupGlobalHaltControl();
  
  // Setup dynamic categorization update
  setupScheduleCategorization();
  
  // Setup drag and drop functionality
  setupDragAndDrop();
  
  // Setup delayed cards functionality
  setupDelayedCardsFunctionality();
  
  // Setup selection controls for upcoming and imminent columns
  setupScheduleColumnSelection();
}

function removeScheduleFromGeneralColumns(zone, scheduledTime) {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) return;
  
  const selector = `.schedule-card[data-zone="${zone}"][data-scheduled-time="${scheduledTime}"]`;
  const matchingCards = columnsWrapper.querySelectorAll(selector);
  matchingCards.forEach(card => card.remove());
  
  updateColumnCounts(columnsWrapper);
}

function removeScheduleFromZoneSchedules(zone, scheduledTime) {
  const zoneSchedules = document.querySelectorAll('.zone-individual-schedule');
  zoneSchedules.forEach(scheduleWrapper => {
    const selector = `.zone-schedule-card[data-zone="${zone}"][data-scheduled-time="${scheduledTime}"]`;
    const cards = scheduleWrapper.querySelectorAll(selector);
    if (cards.length === 0) return;
    
    cards.forEach(card => card.remove());
    updateZoneColumnCounts(scheduleWrapper);
  });
}

function applyScheduleCardCategory(card, category) {
  if (!card) return;

  card.setAttribute('data-category', category);
  card.classList.remove('schedule-upcoming', 'schedule-imminent', 'schedule-delayed', 'draggable');
  if (!card.classList.contains('schedule-card')) {
    card.classList.add('schedule-card');
  }
  card.classList.add(`schedule-${category}`);

  if (category !== 'upcoming') {
    card.classList.add('draggable');
    card.setAttribute('draggable', 'true');
  } else {
    card.setAttribute('draggable', 'false');
  }

  const badge = card.querySelector('.schedule-status-badge');
  if (badge) {
    const badges = {
      upcoming: 'Upcoming',
      imminent: 'Imminent',
      delayed: 'Overdue'
    };
    badge.textContent = badges[category] || 'Upcoming';
  }

  const cardHeader = card.querySelector('.schedule-card-header');
  if (!cardHeader) return;

  let leadingContainer = cardHeader.querySelector('.schedule-card-leading');
  const existingCheckbox = cardHeader.querySelector('.delayed-checkbox-label');
  const existingDragHandle = cardHeader.querySelector('.schedule-drag-handle');
  const existingNoDrag = cardHeader.querySelector('.schedule-no-drag-indicator');
  let existingSelectLabel = cardHeader.querySelector('.schedule-select-checkbox-label');

  if (!leadingContainer) {
    leadingContainer = document.createElement('div');
    leadingContainer.className = 'schedule-card-leading';
    cardHeader.insertBefore(leadingContainer, cardHeader.firstChild || null);

    if (existingSelectLabel) {
      leadingContainer.appendChild(existingSelectLabel);
    }
    if (existingDragHandle) {
      leadingContainer.appendChild(existingDragHandle);
    } else if (existingNoDrag) {
      leadingContainer.appendChild(existingNoDrag);
    } else if (existingCheckbox) {
      leadingContainer.appendChild(existingCheckbox);
    }
  }

  existingSelectLabel = leadingContainer.querySelector('.schedule-select-checkbox-label');

  const selectionLabelHTML = (() => {
    const zone = card.getAttribute('data-zone') || '';
    const scheduledTime = card.getAttribute('data-scheduled-time') || '';
    return `<label class="schedule-select-checkbox-label" aria-label="Select schedule">
      <input type="checkbox" class="schedule-select-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
      <span class="schedule-select-checkbox-custom"></span>
    </label>`;
  })();

  if (category === 'delayed') {
    if (existingSelectLabel) {
      existingSelectLabel.remove();
    }
    if (!cardHeader.querySelector('.delayed-checkbox-label')) {
      const zone = card.getAttribute('data-zone') || '';
      const scheduledTime = card.getAttribute('data-scheduled-time') || '';
      const checkboxHTML = `
        <label class="delayed-checkbox-label">
          <input type="checkbox" class="delayed-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
          <span class="delayed-checkbox-custom"></span>
        </label>
      `;
      const controlTarget = leadingContainer.querySelector('.schedule-drag-handle') || leadingContainer.querySelector('.schedule-no-drag-indicator');
      if (controlTarget) {
        controlTarget.outerHTML = checkboxHTML;
      } else {
        leadingContainer.insertAdjacentHTML('afterbegin', checkboxHTML);
      }
    }
  } else if (category === 'imminent') {
    if (!existingSelectLabel) {
      leadingContainer.insertAdjacentHTML('afterbegin', selectionLabelHTML);
    }
    if (!leadingContainer.querySelector('.schedule-drag-handle')) {
      const dragHandleHTML = '<div class="schedule-drag-handle">⋮⋮</div>';
      const checkbox = leadingContainer.querySelector('.delayed-checkbox-label');
      const noDrag = leadingContainer.querySelector('.schedule-no-drag-indicator');
      if (checkbox) {
        checkbox.outerHTML = dragHandleHTML;
      } else if (noDrag) {
        noDrag.outerHTML = dragHandleHTML;
      } else {
        leadingContainer.insertAdjacentHTML('beforeend', dragHandleHTML);
      }
    }
  } else if (category === 'upcoming') {
    if (!existingSelectLabel) {
      leadingContainer.insertAdjacentHTML('afterbegin', selectionLabelHTML);
    }
    if (!leadingContainer.querySelector('.schedule-no-drag-indicator')) {
      const dragHandle = leadingContainer.querySelector('.schedule-drag-handle');
      const checkbox = leadingContainer.querySelector('.delayed-checkbox-label');
      const noDragHTML = '<div class="schedule-no-drag-indicator">📅</div>';
      if (checkbox) {
        checkbox.outerHTML = noDragHTML;
      } else if (dragHandle) {
        dragHandle.outerHTML = noDragHTML;
      } else {
        leadingContainer.insertAdjacentHTML('beforeend', noDragHTML);
      }
    }
  } else if (existingSelectLabel) {
    existingSelectLabel.remove();
  }
}

// Function to dynamically update schedule categorization
function setupScheduleCategorization() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) return;

  if (scheduleCategorizationIntervalId !== null) {
    clearInterval(scheduleCategorizationIntervalId);
  }
  
  scheduleCategorizationIntervalId = setInterval(() => {
    if (!document.body.contains(columnsWrapper)) {
      clearInterval(scheduleCategorizationIntervalId);
      scheduleCategorizationIntervalId = null;
      return;
    }

    const allCards = columnsWrapper.querySelectorAll('.schedule-card');
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    
    allCards.forEach(card => {
      if (!card.isConnected) return;
      const zone = card.getAttribute('data-zone') || '';
      const scheduledTimeAttr = card.getAttribute('data-scheduled-time') || '';

      if (isScheduleRemoved(zone, scheduledTimeAttr)) {
        card.remove();
        updateColumnCounts(columnsWrapper);
        cleanupRemovedSchedule(zone, scheduledTimeAttr);
        return;
      }

      const scheduledTime = parseInt(scheduledTimeAttr, 10);
      if (!scheduledTime) return;
      
      const timeUntil = scheduledTime - now;
      const timeUntilMinutes = timeUntil / (60 * 1000);
      const currentCategory = card.getAttribute('data-category');
      
      // Determine correct category based on time
      let newCategory = currentCategory;
      
      if (timeUntil < 0) {
        // Time passed - overdue/delayed
        newCategory = 'delayed';
      } else if (timeUntilMinutes <= 5) {
        // Within 5 minutes - imminent
        newCategory = 'imminent';
      } else {
        // More than 5 minutes - upcoming
        newCategory = 'upcoming';
      }
      
      // Move card to appropriate column if category changed
      if (newCategory !== currentCategory) {
        const targetColumn = columnsWrapper.querySelector(`.schedule-column[data-category="${newCategory}"]`);
        const targetContent = targetColumn?.querySelector('.schedule-column-content');
        
        if (targetContent) {
          applyScheduleCardCategory(card, newCategory);
          targetContent.appendChild(card);
          
          // Update column counts
          updateColumnCounts(columnsWrapper);
        }
      }
    });
  }, 10000); // Update every 10 seconds
}

// Update column counts
function updateColumnCounts(columnsWrapper) {
  const columns = columnsWrapper.querySelectorAll('.schedule-column');
  columns.forEach(column => {
    const countEl = column.querySelector('.schedule-column-count');
    const cards = column.querySelectorAll('.schedule-card');
    if (countEl) {
      countEl.textContent = cards.length;
    }
    
    // Show/hide empty message
    const columnContent = column.querySelector('.schedule-column-content');
    const emptyMessage = columnContent?.querySelector('.schedule-empty-message');
    if (emptyMessage) {
      emptyMessage.style.display = cards.length === 0 ? 'block' : 'none';
    }
  });
}

// Setup drag and drop functionality for schedule cards
function setupDragAndDrop() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) {
    setTimeout(setupDragAndDrop, 100);
      return;
    }
    
  let draggedCard = null;
  let draggedFromCategory = null;

  // Make draggable schedule cards (not upcoming) draggable
  function initializeDragCards() {
    const cards = columnsWrapper.querySelectorAll('.schedule-card.draggable');
    cards.forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    });
  }

  // Setup drop zones
  function initializeDropZones() {
    const dropZones = columnsWrapper.querySelectorAll('.schedule-column-content');
    dropZones.forEach(dropZone => {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('drop', handleDrop);
      dropZone.addEventListener('dragenter', handleDragEnter);
      dropZone.addEventListener('dragleave', handleDragLeave);
    });
  }

  function handleDragStart(e) {
    draggedCard = this;
    draggedFromCategory = this.getAttribute('data-category');
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    
    // Store the card's data
    e.dataTransfer.setData('zone', this.getAttribute('data-zone'));
    e.dataTransfer.setData('scheduled-time', this.getAttribute('data-scheduled-time'));
    e.dataTransfer.setData('duration', this.querySelector('.schedule-duration')?.textContent || '');
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove drag-over class from all drop zones
    const dropZones = columnsWrapper.querySelectorAll('.schedule-column-content');
    dropZones.forEach(zone => {
      zone.classList.remove('drag-over');
    });
    
    draggedCard = null;
    draggedFromCategory = null;
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
    e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    this.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    // Only remove drag-over if we're actually leaving the drop zone
    if (!this.contains(e.relatedTarget)) {
      this.classList.remove('drag-over');
    }
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    this.classList.remove('drag-over');

    if (!draggedCard) return;

    const newCategory = this.getAttribute('data-drop-zone');
    const oldCategory = draggedCard.getAttribute('data-category');

    // Don't allow dropping into upcoming column
    if (newCategory === 'upcoming') {
      return;
    }

    // Don't do anything if dropped in the same category
    if (newCategory === oldCategory) {
      return;
    }

    // Update card's category
    applyScheduleCardCategory(draggedCard, newCategory);

    // Move card to new drop zone
    this.appendChild(draggedCard);

    // Update column counts
    updateColumnCounts(columnsWrapper);

    // Re-initialize drag handlers for the moved card (if still draggable)
    if (newCategory !== 'upcoming') {
      draggedCard.addEventListener('dragstart', handleDragStart);
      draggedCard.addEventListener('dragend', handleDragEnd);
    }

    return false;
  }


  // Initialize on load
  initializeDragCards();
  initializeDropZones();

  // Re-initialize when new cards are added (for dynamic updates)
  const observer = new MutationObserver(() => {
    initializeDragCards();
  });

  observer.observe(columnsWrapper, {
    childList: true,
    subtree: true
  });
}

// Setup delayed cards functionality (checkboxes, select all, delete)
function setupDelayedCardsFunctionality() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) {
    setTimeout(setupDelayedCardsFunctionality, 100);
    return;
  }
  
  const delayedColumn = columnsWrapper.querySelector('.schedule-column[data-category="delayed"]');
  if (!delayedColumn) {
    setTimeout(setupDelayedCardsFunctionality, 100);
    return;
  }
  
  const selectAllBtn = delayedColumn.querySelector('.delayed-select-all-btn');
  const deleteBtn = delayedColumn.querySelector('.delayed-delete-btn');
  
  if (!selectAllBtn || !deleteBtn) {
    setTimeout(setupDelayedCardsFunctionality, 100);
    return;
  }
  
  // Update delete button state based on checked checkboxes
  function updateDeleteButtonState() {
    const checkboxes = delayedColumn.querySelectorAll('.delayed-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    deleteBtn.disabled = checkedCount === 0;
    deleteBtn.setAttribute('data-count', checkedCount);
    
    if (checkedCount > 0) {
      deleteBtn.querySelector('span').textContent = `Delete (${checkedCount})`;
      } else {
      deleteBtn.querySelector('span').textContent = 'Delete';
    }
  }
  
  // Handle checkbox changes
  delayedColumn.addEventListener('change', (e) => {
    if (e.target.classList.contains('delayed-checkbox')) {
      updateDeleteButtonState();
    }
  });
  
  // Handle select all button
  selectAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const checkboxes = delayedColumn.querySelectorAll('.delayed-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
    });
    
    updateDeleteButtonState();
    
    // Update button text
    if (allChecked) {
      selectAllBtn.querySelector('span').textContent = 'Select All';
    } else {
      selectAllBtn.querySelector('span').textContent = 'Deselect All';
    }
  });
  
  // Handle delete button
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const checkboxes = delayedColumn.querySelectorAll('.delayed-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const confirmMessage = `Delete ${checkboxes.length} delayed schedule${checkboxes.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;
    
    // Remove selected cards
    checkboxes.forEach(checkbox => {
      const card = checkbox.closest('.schedule-card');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => {
          card.remove();
          updateColumnCounts(columnsWrapper);
          updateDeleteButtonState();
        }, 300);
      }
    });
  });
  
  // Initialize delete button state
  updateDeleteButtonState();
  
  // Re-initialize when cards are added/removed
  const observer = new MutationObserver(() => {
    updateDeleteButtonState();
  });
  
  const delayedContent = delayedColumn.querySelector('.schedule-column-content');
  if (delayedContent) {
    observer.observe(delayedContent, {
      childList: true
    });
  }
}

// Setup selection controls for upcoming and imminent columns
function setupScheduleColumnSelection() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) {
    setTimeout(setupScheduleColumnSelection, 100);
    return;
  }

  const categories = ['upcoming', 'imminent'];
  categories.forEach(category => {
    const column = columnsWrapper.querySelector(`.schedule-column[data-category="${category}"]`);
    if (!column || column.dataset.selectionInitialized === 'true') {
      return;
    }

    const selectAllBtn = column.querySelector(`.schedule-select-all-btn[data-column="${category}"]`);
    const wateredBtn = column.querySelector(`.schedule-watered-btn[data-column="${category}"]`);
    const columnContent = column.querySelector('.schedule-column-content');

    if (!selectAllBtn || !wateredBtn || !columnContent) {
      return;
    }

    const wateredLabel = wateredBtn.querySelector('span');

    const getCheckboxes = () => columnContent.querySelectorAll('.schedule-select-checkbox');

    const updateSelectAllLabel = () => {
      const checkboxes = Array.from(getCheckboxes());
      if (checkboxes.length === 0) {
        selectAllBtn.querySelector('span').textContent = 'Select All';
        return;
      }
      const allChecked = checkboxes.every(cb => cb.checked);
      selectAllBtn.querySelector('span').textContent = allChecked ? 'Deselect All' : 'Select All';
    };

    const updateWateredState = () => {
      const checkboxes = Array.from(getCheckboxes());
      const checkedCount = checkboxes.filter(cb => cb.checked).length;
      wateredBtn.disabled = checkedCount === 0;
      if (wateredLabel) {
        wateredLabel.textContent = checkedCount > 0 ? `Watered (${checkedCount})` : 'Watered';
      }
    };

    columnContent.addEventListener('change', (event) => {
      if (event.target.classList.contains('schedule-select-checkbox')) {
        updateWateredState();
        updateSelectAllLabel();
      }
    });

    selectAllBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const checkboxes = Array.from(getCheckboxes());
      if (checkboxes.length === 0) {
        return;
      }
      const allChecked = checkboxes.every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
      });
      updateWateredState();
      updateSelectAllLabel();
    });

    wateredBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const selectedCheckboxes = Array.from(columnContent.querySelectorAll('.schedule-select-checkbox:checked'));
      if (selectedCheckboxes.length === 0) {
        return;
      }

      const processedKeys = new Set();
      selectedCheckboxes.forEach(cb => {
        const card = cb.closest('.schedule-card');
        if (!card) return;

        const zone = card.getAttribute('data-zone') || '';
        const scheduledTime = card.getAttribute('data-scheduled-time') || '';
        const key = buildScheduleKey(zone, scheduledTime);
        if (processedKeys.has(key)) return;
        processedKeys.add(key);

        markScheduleRemoved(zone, scheduledTime);
        removeScheduleFromGeneralColumns(zone, scheduledTime);
        removeScheduleFromZoneSchedules(zone, scheduledTime);
        cleanupRemovedSchedule(zone, scheduledTime);
      });

      updateWateredState();
      updateSelectAllLabel();
    });

    column.dataset.selectionInitialized = 'true';
    updateWateredState();
    updateSelectAllLabel();

    const observer = new MutationObserver(() => {
      updateWateredState();
      updateSelectAllLabel();
    });

    observer.observe(columnContent, {
      childList: true,
      subtree: true
    });
  });
}

// Sort schedule cards by scheduled time (earliest first)
function sortScheduleCardsByTime(carousel) {
  const cards = Array.from(carousel.querySelectorAll('.schedule-card'));
  
  cards.sort((a, b) => {
    const timeA = parseInt(a.getAttribute('data-scheduled-time')) || 0;
    const timeB = parseInt(b.getAttribute('data-scheduled-time')) || 0;
    return timeA - timeB;
  });
  
  // Re-append cards in sorted order
  cards.forEach((card, index) => {
    card.setAttribute('data-index', index);
    carousel.appendChild(card);
  });
}

// Setup countdown timers and handle completed zones
function setupScheduleCountdowns(carousel) {
  const updateInterval = 250; // Update cadence adjusted for lower CPU usage
  
  function updateCountdowns() {
    const cards = Array.from(carousel.querySelectorAll('.schedule-card'));
    let needsResort = false;
    const isHalted = document.body.classList.contains('watering-halted');
    
    cards.forEach(card => {
      const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
      const countdownEl = card.querySelector('.countdown-value');
      const timeDisplay = card.querySelector('.schedule-time');
      const waterFill = card.querySelector('.water-tube-fill');
      const zone = card.getAttribute('data-zone');
      
      // Skip if queue is halted
      if (isHalted) {
        if (countdownEl && !card.classList.contains('schedule-completed')) {
          countdownEl.textContent = 'Halted';
          countdownEl.classList.add('paused');
          card.classList.add('zone-schedule-paused');
        }
        return;
      } else {
        if (countdownEl) {
          countdownEl.classList.remove('paused');
          card.classList.remove('zone-schedule-paused');
        }
      }
      
      if (!scheduledTime || !countdownEl) return;
      
      const now = Date.now();
      const timeUntilSeconds = Math.floor((scheduledTime - now) / 1000);
      const totalDuration = 10; // 10 seconds for demo
      
      // Calculate progress: when countdown is 10s, progress is 0%; when 0s, progress is 100%
      const progress = Math.max(0, Math.min(100, ((totalDuration - timeUntilSeconds) / totalDuration) * 100));
      
      if (timeUntilSeconds <= 0) {
        // Zone has finished - mark for moving to end
        countdownEl.textContent = 'Completed';
        countdownEl.classList.add('completed');
        card.classList.add('schedule-completed');
        if (waterFill) {
          waterFill.style.height = '100%';
        }
        
        // Show notification if not already shown for this zone
        if (!card.dataset.notificationShown) {
          showWateringCompleteNotification(zone);
          card.dataset.notificationShown = 'true';
        }
        
        needsResort = true;
      } else {
        // Update countdown
        countdownEl.textContent = `${timeUntilSeconds}s`;
        countdownEl.classList.remove('completed');
        card.classList.remove('schedule-completed');
        
        // Update water tube fill
        if (waterFill) {
          waterFill.style.height = `${progress}%`;
          waterFill.style.transition = 'height 0.1s linear';
        }
        
        // Update time display
        const scheduledDate = new Date(scheduledTime);
        const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        });
        if (timeDisplay) {
          timeDisplay.textContent = timeStr;
        }
      }
    });
    
    // If any zones completed, move them to the end and re-sort
    if (needsResort) {
      moveCompletedZonesToEnd(carousel);
    }
  }
  
  // Update immediately
  updateCountdowns();
  
  // Update every 100ms for smooth animation
  const intervalId = setInterval(updateCountdowns, updateInterval);
  
  // Store interval ID for cleanup if needed
  if (carousel.dataset.intervalId) {
    clearInterval(parseInt(carousel.dataset.intervalId));
  }
  carousel.dataset.intervalId = intervalId.toString();
}

// Move completed zones to the end of the carousel
function moveCompletedZonesToEnd(carousel) {
  const cards = Array.from(carousel.querySelectorAll('.schedule-card'));
  const completedCards = cards.filter(card => card.classList.contains('schedule-completed'));
  const activeCards = cards.filter(card => !card.classList.contains('schedule-completed'));
  
  // Sort active cards by time
  activeCards.sort((a, b) => {
    const timeA = parseInt(a.getAttribute('data-scheduled-time')) || 0;
    const timeB = parseInt(b.getAttribute('data-scheduled-time')) || 0;
    return timeA - timeB;
  });
  
  // Reset completed cards with new scheduled times (cycle them back)
  // Find the latest scheduled time among active cards
  let latestTime = Date.now();
  if (activeCards.length > 0) {
    const lastActiveCard = activeCards[activeCards.length - 1];
    latestTime = parseInt(lastActiveCard.getAttribute('data-scheduled-time')) || Date.now();
  }
  
  // Reset completed cards to start after the last active card
  // Only reset enabled zones (skip disabled ones)
  const enabledCompletedCards = completedCards.filter(card => {
    const checkbox = card.querySelector('.zone-disable-checkbox');
    return checkbox && checkbox.checked;
  });
  
  enabledCompletedCards.forEach((card, index) => {
    // Remove completed class and reset
    card.classList.remove('schedule-completed');
    const countdownEl = card.querySelector('.countdown-value');
    const waterFill = card.querySelector('.water-tube-fill');
    const statusBadge = card.querySelector('.schedule-status-badge');
    
    // Set new scheduled time (10 seconds after the last active card, staggered)
    const newScheduledTime = latestTime + (10 * 1000) + (index * 10 * 1000);
    card.setAttribute('data-scheduled-time', newScheduledTime);
    
    // Reset UI elements
    if (countdownEl) {
      countdownEl.textContent = '10s';
      countdownEl.classList.remove('completed', 'paused');
    }
    if (waterFill) {
      waterFill.style.height = '0%';
    }
    if (statusBadge) {
      statusBadge.textContent = 'Upcoming';
    }
    
    // Reset notification flag
    card.dataset.notificationShown = '';
  });
  
  // Keep disabled completed cards as completed (don't reset them)
  const disabledCompletedCards = completedCards.filter(card => {
    const checkbox = card.querySelector('.zone-disable-checkbox');
    return !checkbox || !checkbox.checked;
  });
  
  // Combine all cards and sort by time (only enabled completed cards are reset)
  const allCards = [...activeCards, ...enabledCompletedCards, ...disabledCompletedCards];
  allCards.sort((a, b) => {
    const timeA = parseInt(a.getAttribute('data-scheduled-time')) || 0;
    const timeB = parseInt(b.getAttribute('data-scheduled-time')) || 0;
    return timeA - timeB;
  });
  
  // Clear carousel
  carousel.innerHTML = '';
  
  // Add all cards in sorted order
  allCards.forEach((card, index) => {
    card.setAttribute('data-index', index);
    carousel.appendChild(card);
  });
  
  // Reset notification flags when zones are reset
  allCards.forEach(card => {
    if (!card.classList.contains('schedule-completed')) {
      card.dataset.notificationShown = '';
    }
  });
  
  // Trigger carousel update if setup function is available
  const updateCarouselName = carousel.dataset.updateCarousel;
  if (updateCarouselName && typeof window[updateCarouselName] === 'function') {
    window[updateCarouselName]();
  }
}

// Show notification when watering completes
function showWateringCompleteNotification(zoneName) {
  // Create notification container if it doesn't exist
  let notificationContainer = document.getElementById('watering-notifications-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'watering-notifications-container';
    notificationContainer.className = 'watering-notifications-container';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'watering-notification';
  notification.setAttribute('data-zone', zoneName);
  
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">💧</div>
      <div class="notification-text">
        <div class="notification-title">Watering Complete!</div>
        <div class="notification-message">${zoneName} has finished watering.</div>
      </div>
      <button class="notification-close" aria-label="Close notification">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
  
  // Add close button functionality
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    dismissNotification(notification);
  });
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      dismissNotification(notification);
    }
  }, 5000);
}

// Dismiss notification with animation
function dismissNotification(notification) {
  notification.classList.remove('show');
  notification.classList.add('dismissing');
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 300);
}

// Setup zone disable/enable controls
function setupZoneDisableControls(carousel) {
  const checkboxes = carousel.querySelectorAll('.zone-disable-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const card = checkbox.closest('.schedule-card');
      const zone = checkbox.getAttribute('data-zone');
      const isHalted = document.body.classList.contains('watering-halted');
      
      if (checkbox.checked) {
        // Zone enabled - remove disabled state
        card.classList.remove('zone-disabled');
        const countdownEl = card.querySelector('.countdown-value');
        
        if (countdownEl) {
          countdownEl.classList.remove('paused');
          
          // If zone was completed and is being re-enabled, reset it
          if (card.classList.contains('schedule-completed')) {
            card.classList.remove('schedule-completed');
            const scheduledTime = parseInt(card.getAttribute('data-scheduled-time')) || Date.now();
            const timeUntilSeconds = Math.max(0, Math.floor((scheduledTime - Date.now()) / 1000));
            countdownEl.textContent = timeUntilSeconds > 0 ? `${timeUntilSeconds}s` : '10s';
            
            // Reset water tube
            const waterFill = card.querySelector('.water-tube-fill');
            if (waterFill) {
              waterFill.style.height = '0%';
            }
            
            // Reset status badge
            const statusBadge = card.querySelector('.schedule-status-badge');
            if (statusBadge) {
              statusBadge.textContent = 'Upcoming';
            }
            
            // Reset notification flag
            card.dataset.notificationShown = '';
          } else if (isHalted) {
            countdownEl.textContent = 'Halted';
            countdownEl.classList.add('paused');
          }
        }
        
        // Re-sort cards to include this zone in the queue
        sortScheduleCardsByTime(carousel);
      } else {
        // Zone disabled - add disabled state
        card.classList.add('zone-disabled');
        const countdownEl = card.querySelector('.countdown-value');
        if (countdownEl && !card.classList.contains('schedule-completed')) {
          countdownEl.textContent = 'Disabled';
          countdownEl.classList.add('paused');
        }
      }
    });
  });
}

// Setup global halt/resume control
function setupGlobalHaltControl() {
  const haltButton = document.getElementById('halt-queue-btn');
  if (!haltButton) return;
  
  haltButton.addEventListener('click', () => {
    const isHalted = document.body.classList.contains('watering-halted');
    
    if (isHalted) {
      // Resume watering
      document.body.classList.remove('watering-halted');
      haltButton.classList.remove('halted');
      const buttonText = haltButton.querySelector('.halt-button-text');
      const buttonIcon = haltButton.querySelector('svg');
      
      if (buttonText) buttonText.textContent = 'Halt All';
      
      // Update icon to pause
      if (buttonIcon) {
        buttonIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
      }
      
      // Restore countdowns for enabled zones in all columns
      const columnsWrapper = document.getElementById('watering-schedule-columns');
      if (columnsWrapper) {
        const cards = columnsWrapper.querySelectorAll('.schedule-card:not(.schedule-completed)');
        cards.forEach(card => {
          const countdownEl = card.querySelector('.countdown-value');
          const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
          if (countdownEl && scheduledTime) {
            const now = Date.now();
            const timeUntilSeconds = Math.floor((scheduledTime - now) / 1000);
            if (timeUntilSeconds > 0) {
              countdownEl.textContent = `${timeUntilSeconds}s`;
            } else {
              countdownEl.textContent = `${Math.abs(timeUntilSeconds)}s`;
            }
              countdownEl.classList.remove('paused');
            card.classList.remove('zone-schedule-paused');
          }
        });
      }
    } else {
      // Halt watering
      document.body.classList.add('watering-halted');
      haltButton.classList.add('halted');
      const buttonText = haltButton.querySelector('.halt-button-text');
      const buttonIcon = haltButton.querySelector('svg');
      
      if (buttonText) buttonText.textContent = 'Resume';
      
      // Update icon to play
      if (buttonIcon) {
        buttonIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      }
      
      // Update all active cards to show "Halted" in all columns
      const columnsWrapper = document.getElementById('watering-schedule-columns');
      if (columnsWrapper) {
        const cards = columnsWrapper.querySelectorAll('.schedule-card:not(.schedule-completed)');
        cards.forEach(card => {
          const countdownEl = card.querySelector('.countdown-value');
          if (countdownEl) {
            countdownEl.textContent = 'Halted';
            countdownEl.classList.add('paused');
            card.classList.add('zone-schedule-paused');
          }
        });
      }
    }
  });
}

function setupZoneGraphToggles() {
  const toggleButtons = document.querySelectorAll('.zone-graph-toggle');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get zone ID from button's data-zone-id attribute
      const zoneId = button.getAttribute('data-zone-id');
      const graphSection = document.querySelector(`.zone-graph-section[data-zone-id="${zoneId}"]`);
      
      if (!graphSection) return;
      
      const isExpanded = graphSection.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse - smooth glide up
        const inner = graphSection.querySelector('.zone-graph-section-inner');
        if (inner) {
          // Get current height (use offsetHeight if style is auto)
          const currentHeight = graphSection.style.height === 'auto' 
            ? graphSection.offsetHeight 
            : parseInt(graphSection.style.height) || graphSection.scrollHeight;
          graphSection.style.height = currentHeight + 'px';
          graphSection.style.overflow = 'hidden';
          // Force reflow
          graphSection.offsetHeight;
          requestAnimationFrame(() => {
            graphSection.style.height = '0px';
          });
        }
        graphSection.classList.remove('expanded');
        button.classList.remove('active');
        button.querySelector('.zone-graph-toggle-text').textContent = 'View Graph';
      } else {
        // Expand - smooth glide down
        graphSection.classList.add('expanded');
        button.classList.add('active');
        button.querySelector('.zone-graph-toggle-text').textContent = 'Hide Graph';
        
        // Measure and set height for smooth transition
        const inner = graphSection.querySelector('.zone-graph-section-inner');
        if (inner) {
          // Temporarily set to auto to measure actual content height
          graphSection.style.height = 'auto';
          graphSection.style.overflow = 'visible';
          const targetHeight = inner.scrollHeight + 24; // Add padding for border
          graphSection.style.height = '0px';
          graphSection.style.overflow = 'hidden';
          
          // Force reflow
          graphSection.offsetHeight;
          
          // Animate to target height
          requestAnimationFrame(() => {
            graphSection.style.height = targetHeight + 'px';
            // After animation completes, allow natural height
            setTimeout(() => {
              graphSection.style.height = 'auto';
              graphSection.style.overflow = 'visible';
            }, 300);
          });
        }
        
        // Initialize/reinitialize graph for this zone to ensure correct sizing
        const canvas = graphSection.querySelector('.zone-moisture-graph');
        if (canvas) {
          // Get zone ID from canvas or graph section
          const zoneId = canvas.getAttribute('data-zone-id') || graphSection.getAttribute('data-zone-id');
          // Wait for the transition to start before calculating size
          setTimeout(() => {
            setupZoneMoistureGraph(canvas, zoneId);
          }, 100);
        }
      }
    });
  });
}

function setupZoneScheduleToggles() {
  const toggleButtons = document.querySelectorAll('.zone-schedule-toggle');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const zoneNumber = button.getAttribute('data-zone');
      const scheduleSection = document.querySelector(`.zone-schedule-section[data-zone="${zoneNumber}"]`);
      
      if (!scheduleSection) return;
      
      const isExpanded = scheduleSection.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse - smooth glide up
        const inner = scheduleSection.querySelector('.zone-schedule-section-inner');
        if (inner) {
          const currentHeight = scheduleSection.style.height === 'auto' 
            ? scheduleSection.offsetHeight 
            : parseInt(scheduleSection.style.height) || scheduleSection.scrollHeight;
          scheduleSection.style.height = currentHeight + 'px';
          scheduleSection.style.overflow = 'hidden';
          scheduleSection.offsetHeight;
          requestAnimationFrame(() => {
            scheduleSection.style.height = '0px';
          });
        }
        scheduleSection.classList.remove('expanded');
        button.classList.remove('active');
        button.querySelector('.zone-schedule-toggle-text').textContent = 'View Zone Schedule';
      } else {
        // Expand - smooth glide down
        scheduleSection.classList.add('expanded');
        button.classList.add('active');
        button.querySelector('.zone-schedule-toggle-text').textContent = 'Hide Zone Schedule';
        
        // Measure and set height for smooth transition
        const inner = scheduleSection.querySelector('.zone-schedule-section-inner');
        if (inner) {
          scheduleSection.style.height = 'auto';
          scheduleSection.style.overflow = 'visible';
          const targetHeight = inner.scrollHeight + 24;
          scheduleSection.style.height = '0px';
          scheduleSection.style.overflow = 'hidden';
          
          scheduleSection.offsetHeight;
          
          requestAnimationFrame(() => {
            scheduleSection.style.height = targetHeight + 'px';
            setTimeout(() => {
              scheduleSection.style.height = 'auto';
              scheduleSection.style.overflow = 'visible';
            }, 300);
          });
        }
        
        // Setup columns for this zone's schedule
        const columnsId = `zone-${zoneNumber}-schedule-columns`;
        setupZoneScheduleColumns(columnsId, zoneNumber);
      }
    });
  });
}

// Setup zone schedule columns (individual zone dropdown with column layout)
function setupZoneScheduleColumns(columnsId, zoneNumber) {
  const columnsWrapper = document.getElementById(columnsId);
  
  if (!columnsWrapper) {
    setTimeout(() => setupZoneScheduleColumns(columnsId, zoneNumber), 100);
    return;
  }

  // Setup countdown timers for all columns in this zone
  const allColumns = columnsWrapper.querySelectorAll('.zone-schedule-column');
  allColumns.forEach(column => {
    const columnContent = column.querySelector('.zone-schedule-column-content');
    if (columnContent) {
      setupZoneScheduleCountdowns(columnContent, zoneNumber);
    }
  });
  
  // Setup drag and drop for this zone's schedule
  setupZoneScheduleDragAndDrop(columnsWrapper, zoneNumber);
  
  // Setup delayed cards functionality for this zone
  setupZoneDelayedCardsFunctionality(columnsWrapper, zoneNumber);
  
  // Setup automatic categorization for this zone
  setupZoneScheduleCategorization(columnsWrapper, zoneNumber);
}

function sortZoneScheduleCards(carousel) {
  const cards = Array.from(carousel.querySelectorAll('.zone-schedule-card'));
  
  cards.sort((a, b) => {
    const timeA = parseInt(a.getAttribute('data-scheduled-time')) || 0;
    const timeB = parseInt(b.getAttribute('data-scheduled-time')) || 0;
    return timeA - timeB;
  });
  
  cards.forEach((card, index) => {
    card.setAttribute('data-index', index);
    carousel.appendChild(card);
  });
}

// Setup countdowns for zone schedule cards in column content
function setupZoneScheduleCountdowns(columnContent, zoneNumber) {
  const updateInterval = 250;
  
  function updateCountdowns() {
    const cards = Array.from(columnContent.querySelectorAll('.zone-schedule-card'));
    const isHalted = document.body.classList.contains('watering-halted');
    
    cards.forEach(card => {
      const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
      const countdownEl = card.querySelector('.zone-countdown-value');
      const timeDisplay = card.querySelector('.zone-schedule-time');
      const waterFill = card.querySelector('.zone-water-tube-fill');
      
      if (!scheduledTime || !countdownEl) return;
      
      if (isHalted) {
        if (countdownEl && !card.classList.contains('schedule-completed')) {
          countdownEl.textContent = 'Halted';
          countdownEl.classList.add('paused');
        }
        card.classList.add('zone-schedule-paused');
        return;
      } else {
        card.classList.remove('zone-schedule-paused');
        if (countdownEl) {
          countdownEl.classList.remove('paused');
        }
      }
      
      const now = Date.now();
      const timeUntilSeconds = Math.floor((scheduledTime - now) / 1000);
      const totalDuration = 10;
      const progress = Math.max(0, Math.min(100, ((totalDuration - timeUntilSeconds) / totalDuration) * 100));
      
      if (timeUntilSeconds <= 0) {
        countdownEl.textContent = 'Completed';
        countdownEl.classList.add('completed');
        card.classList.add('schedule-completed');
        if (waterFill) {
          waterFill.style.height = '100%';
        }
      } else {
        countdownEl.textContent = `${timeUntilSeconds}s`;
        countdownEl.classList.remove('completed');
        card.classList.remove('schedule-completed');
        
        if (waterFill) {
          waterFill.style.height = `${progress}%`;
          waterFill.style.transition = 'height 0.1s linear';
        }
        
        const scheduledDate = new Date(scheduledTime);
        const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        });
        if (timeDisplay) {
          timeDisplay.textContent = timeStr;
        }
      }
    });
  }
  
  updateCountdowns();
  const intervalId = setInterval(updateCountdowns, updateInterval);
  
  if (columnContent.dataset.intervalId) {
    clearInterval(parseInt(columnContent.dataset.intervalId));
  }
  columnContent.dataset.intervalId = intervalId.toString();
}

// Setup automatic categorization for zone schedules
function setupZoneScheduleCategorization(columnsWrapper, zoneNumber) {
  setInterval(() => {
    const allCards = columnsWrapper.querySelectorAll('.zone-schedule-card');
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    
    allCards.forEach(card => {
      const zone = card.getAttribute('data-zone') || '';
      const scheduledTimeAttr = card.getAttribute('data-scheduled-time') || '';

      if (isScheduleRemoved(zone, scheduledTimeAttr)) {
        card.remove();
        updateZoneColumnCounts(columnsWrapper);
        cleanupRemovedSchedule(zone, scheduledTimeAttr);
        return;
      }

      const scheduledTime = parseInt(scheduledTimeAttr, 10);
      if (!scheduledTime) return;
      
      const timeUntil = scheduledTime - now;
      const timeUntilMinutes = timeUntil / (60 * 1000);
      const currentCategory = card.getAttribute('data-category');
      
      let newCategory = currentCategory;
      
      if (timeUntil < 0) {
        newCategory = 'delayed';
      } else if (timeUntilMinutes <= 5) {
        newCategory = 'imminent';
      } else {
        newCategory = 'upcoming';
      }
      
      if (newCategory !== currentCategory) {
        const targetColumn = columnsWrapper.querySelector(`.zone-schedule-column[data-category="${newCategory}"]`);
        const targetContent = targetColumn?.querySelector('.zone-schedule-column-content');
        
        if (targetContent) {
          card.setAttribute('data-category', newCategory);
          
          // Update draggable state
          if (newCategory === 'upcoming') {
            card.className = `zone-schedule-card zone-schedule-${newCategory}`;
            card.setAttribute('draggable', 'false');
          } else {
            card.className = `zone-schedule-card zone-schedule-${newCategory} draggable`;
            card.setAttribute('draggable', 'true');
          }
          
          const badge = card.querySelector('.zone-schedule-status-badge');
          if (badge) {
            const badges = {
              'upcoming': 'Upcoming',
              'imminent': 'Urgent',
              'delayed': 'Overdue'
            };
            badge.textContent = badges[newCategory] || 'Upcoming';
          }
          
          // Handle checkbox/drag-handle/no-drag-indicator swap
          const cardHeader = card.querySelector('.zone-schedule-card-header');
          if (cardHeader) {
            const existingCheckbox = cardHeader.querySelector('.zone-delayed-checkbox-label');
            const existingDragHandle = cardHeader.querySelector('.zone-schedule-drag-handle');
            const existingNoDrag = cardHeader.querySelector('.schedule-no-drag-indicator');
            
            if (newCategory === 'delayed') {
              if (!existingCheckbox) {
                const zone = card.getAttribute('data-zone');
                const scheduledTime = card.getAttribute('data-scheduled-time');
                const checkboxHTML = `
                  <label class="zone-delayed-checkbox-label">
                    <input type="checkbox" class="zone-delayed-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
                    <span class="zone-delayed-checkbox-custom"></span>
                  </label>
                `;
                if (existingDragHandle) {
                  existingDragHandle.outerHTML = checkboxHTML;
                } else if (existingNoDrag) {
                  existingNoDrag.outerHTML = checkboxHTML;
                }
              }
            } else if (newCategory === 'imminent') {
              if (!existingDragHandle) {
                const dragHandleHTML = '<div class="zone-schedule-drag-handle">⋮⋮</div>';
                if (existingCheckbox) {
                  existingCheckbox.outerHTML = dragHandleHTML;
                } else if (existingNoDrag) {
                  existingNoDrag.outerHTML = dragHandleHTML;
                }
              }
            } else if (newCategory === 'upcoming') {
              if (!existingNoDrag) {
                const noDragHTML = '<div class="schedule-no-drag-indicator">📅</div>';
                if (existingCheckbox) {
                  existingCheckbox.outerHTML = noDragHTML;
                } else if (existingDragHandle) {
                  existingDragHandle.outerHTML = noDragHTML;
                }
              }
            }
          }
          
          targetContent.appendChild(card);
          updateZoneColumnCounts(columnsWrapper);
        }
      }
    });
  }, 10000);
}

// Update zone column counts
function updateZoneColumnCounts(columnsWrapper) {
  const columns = columnsWrapper.querySelectorAll('.zone-schedule-column');
  columns.forEach(column => {
    const countEl = column.querySelector('.zone-schedule-column-count');
    const cards = column.querySelectorAll('.zone-schedule-card');
    if (countEl) {
      countEl.textContent = cards.length;
    }
    
    const columnContent = column.querySelector('.zone-schedule-column-content');
    const emptyMessage = columnContent?.querySelector('.zone-schedule-empty-message');
    if (emptyMessage) {
      emptyMessage.style.display = cards.length === 0 ? 'block' : 'none';
    }
  });
}

// Setup drag and drop for zone schedule cards
function setupZoneScheduleDragAndDrop(columnsWrapper, zoneNumber) {
  let draggedCard = null;
  
  function initializeDragCards() {
    const cards = columnsWrapper.querySelectorAll('.zone-schedule-card.draggable');
    cards.forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    });
  }
  
  function initializeDropZones() {
    const dropZones = columnsWrapper.querySelectorAll('.zone-schedule-column-content');
    dropZones.forEach(dropZone => {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('drop', handleDrop);
      dropZone.addEventListener('dragenter', handleDragEnter);
      dropZone.addEventListener('dragleave', handleDragLeave);
    });
  }
  
  function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragEnd(e) {
    this.classList.remove('dragging');
    const dropZones = columnsWrapper.querySelectorAll('.zone-schedule-column-content');
    dropZones.forEach(zone => zone.classList.remove('drag-over'));
    draggedCard = null;
  }
  
  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDragEnter(e) {
    this.classList.add('drag-over');
  }
  
  function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
      this.classList.remove('drag-over');
    }
  }
  
  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    
    this.classList.remove('drag-over');
    if (!draggedCard) return;
    
    const newCategory = this.getAttribute('data-drop-zone');
    const oldCategory = draggedCard.getAttribute('data-category');
    
    // Don't allow dropping into upcoming column
    if (newCategory === 'upcoming') {
      return;
    }
    
    if (newCategory === oldCategory) return;
    
    draggedCard.setAttribute('data-category', newCategory);
    updateZoneCardCategory(draggedCard, newCategory);
    this.appendChild(draggedCard);
    updateZoneColumnCounts(columnsWrapper);
    
    // Re-initialize drag handlers for the moved card (if still draggable)
    if (newCategory !== 'upcoming') {
      draggedCard.addEventListener('dragstart', handleDragStart);
      draggedCard.addEventListener('dragend', handleDragEnd);
    }
    
    return false;
  }
  
  function updateZoneCardCategory(card, category) {
    card.classList.remove('zone-schedule-upcoming', 'zone-schedule-imminent', 'zone-schedule-delayed', 'draggable');
    card.classList.add(`zone-schedule-${category}`);
    
    // Update draggable state
    if (category !== 'upcoming') {
      card.classList.add('draggable');
      card.setAttribute('draggable', 'true');
    } else {
      card.setAttribute('draggable', 'false');
    }
    
    const badge = card.querySelector('.zone-schedule-status-badge');
    if (badge) {
      const badges = {
        'upcoming': 'Upcoming',
        'imminent': 'Urgent',
        'delayed': 'Overdue'
      };
      badge.textContent = badges[category] || 'Upcoming';
    }
    
    const cardHeader = card.querySelector('.zone-schedule-card-header');
    if (!cardHeader) return;
    
    const existingCheckbox = cardHeader.querySelector('.zone-delayed-checkbox-label');
    const existingDragHandle = cardHeader.querySelector('.zone-schedule-drag-handle');
    const existingNoDrag = cardHeader.querySelector('.schedule-no-drag-indicator');
    
    if (category === 'delayed') {
      // Add checkbox
      if (!existingCheckbox) {
        const zone = card.getAttribute('data-zone');
        const scheduledTime = card.getAttribute('data-scheduled-time');
        const checkboxHTML = `
          <label class="zone-delayed-checkbox-label">
            <input type="checkbox" class="zone-delayed-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
            <span class="zone-delayed-checkbox-custom"></span>
          </label>
        `;
        if (existingDragHandle) {
          existingDragHandle.outerHTML = checkboxHTML;
        } else if (existingNoDrag) {
          existingNoDrag.outerHTML = checkboxHTML;
        }
      }
    } else if (category === 'imminent') {
      // Add drag handle
      if (!existingDragHandle) {
        const dragHandleHTML = '<div class="zone-schedule-drag-handle">⋮⋮</div>';
        if (existingCheckbox) {
          existingCheckbox.outerHTML = dragHandleHTML;
        } else if (existingNoDrag) {
          existingNoDrag.outerHTML = dragHandleHTML;
        }
      }
    } else if (category === 'upcoming') {
      // Add no-drag indicator
      if (!existingNoDrag) {
        const noDragHTML = '<div class="schedule-no-drag-indicator">📅</div>';
        if (existingCheckbox) {
          existingCheckbox.outerHTML = noDragHTML;
        } else if (existingDragHandle) {
          existingDragHandle.outerHTML = noDragHTML;
        }
      }
    }
  }
  
  initializeDragCards();
  initializeDropZones();
  
  const observer = new MutationObserver(() => {
    initializeDragCards();
  });
  
  observer.observe(columnsWrapper, {
    childList: true,
    subtree: true
  });
}

// Setup delayed cards functionality for individual zone schedules
function setupZoneDelayedCardsFunctionality(columnsWrapper, zoneNumber) {
  const delayedColumn = columnsWrapper.querySelector('.zone-schedule-column[data-category="delayed"]');
  if (!delayedColumn) {
    setTimeout(() => setupZoneDelayedCardsFunctionality(columnsWrapper, zoneNumber), 100);
    return;
  }
  
  const selectAllBtn = delayedColumn.querySelector('.zone-delayed-select-all-btn');
  const deleteBtn = delayedColumn.querySelector('.zone-delayed-delete-btn');
  
  if (!selectAllBtn || !deleteBtn) {
    setTimeout(() => setupZoneDelayedCardsFunctionality(columnsWrapper, zoneNumber), 100);
    return;
  }
  
  function updateDeleteButtonState() {
    const checkboxes = delayedColumn.querySelectorAll('.zone-delayed-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    deleteBtn.disabled = checkedCount === 0;
    
    if (checkedCount > 0) {
      deleteBtn.querySelector('span').textContent = `Delete (${checkedCount})`;
    } else {
      deleteBtn.querySelector('span').textContent = 'Delete';
    }
  }
  
  delayedColumn.addEventListener('change', (e) => {
    if (e.target.classList.contains('zone-delayed-checkbox')) {
      updateDeleteButtonState();
    }
  });
  
  selectAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const checkboxes = delayedColumn.querySelectorAll('.zone-delayed-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
    });
    
    updateDeleteButtonState();
    
    if (allChecked) {
      selectAllBtn.querySelector('span').textContent = 'Select All';
    } else {
      selectAllBtn.querySelector('span').textContent = 'Deselect All';
    }
  });
  
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const checkboxes = delayedColumn.querySelectorAll('.zone-delayed-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const confirmMessage = `Delete ${checkboxes.length} delayed schedule${checkboxes.length > 1 ? 's' : ''} from ${zoneNumber}?`;
    if (!confirm(confirmMessage)) return;
    
    checkboxes.forEach(checkbox => {
      const card = checkbox.closest('.zone-schedule-card');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => {
          card.remove();
          updateZoneColumnCounts(columnsWrapper);
          updateDeleteButtonState();
        }, 300);
      }
    });
  });
  
  updateDeleteButtonState();
  
  const observer = new MutationObserver(() => {
    updateDeleteButtonState();
  });
  
  const delayedContent = delayedColumn.querySelector('.zone-schedule-column-content');
  if (delayedContent) {
    observer.observe(delayedContent, {
      childList: true
    });
  }
}

/**
 * Fetch all moisture readings from Supabase for a specific zone from today
 * Returns all readings from the start of today to now
 * Updates dynamically whenever the graph is opened
 */
async function fetchHourlyMoistureData(zoneId) {
  try {
    // Get current date/time and calculate start of today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    // Fetch all telemetry data for this zone from the start of today
    const { data: telemetryData, error } = await supabase
      .from('telemetry')
      .select('ts, moisture')
      .eq('zone_id', zoneId)
      .gte('ts', startOfToday.toISOString())
      .order('ts', { ascending: true });

    if (error) {
      console.error('Error fetching telemetry data:', error);
      return [];
    }

    if (!telemetryData || telemetryData.length === 0) {
      console.log(`No telemetry data found for zone ${zoneId}`);
      return [];
    }

    // Filter out readings with null/undefined moisture and convert to graph format
    const readingsArray = telemetryData
      .filter(reading => reading.moisture !== null && reading.moisture !== undefined)
      .map(reading => {
        const readingDate = new Date(reading.ts);
        // Calculate hours since start of today (can be fractional, e.g., 14.5 for 2:30 PM)
        const hoursSinceStart = (readingDate - startOfToday) / (1000 * 60 * 60);
        return {
          hour: hoursSinceStart, // Use fractional hours for x-axis positioning
          moisture: reading.moisture,
          timestamp: readingDate,
          hourOfDay: readingDate.getHours(),
          minutes: readingDate.getMinutes()
        };
      })
      .sort((a, b) => a.hour - b.hour); // Sort by time

    return readingsArray;
  } catch (error) {
    console.error('Error in fetchHourlyMoistureData:', error);
    return [];
  }
}

async function setupZoneMoistureGraph(canvas, zoneId) {
  if (!canvas) return;

  // Get zoneId from canvas if not provided
  if (!zoneId) {
    zoneId = canvas.getAttribute('data-zone-id');
  }

  if (!zoneId) {
    console.error('No zone ID provided for graph');
    return;
  }

  // Fetch zone data to get crop_type for threshold lookup
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('id, name, crop_type')
    .eq('id', zoneId)
    .eq('owner', user.id)
    .maybeSingle();

  if (zoneError || !zone) {
    console.error('Error fetching zone data:', zoneError);
    return;
  }

  // Fetch thresholds for this crop
  let thresholds = null;
  if (zone.crop_type) {
    const thresholdsMap = await fetchThresholds();
    const cropNameLower = zone.crop_type.toLowerCase().trim();
    thresholds = thresholdsMap.get(cropNameLower);
  }

  // Fetch real moisture data from Supabase
  const hourlyReadings = await fetchHourlyMoistureData(zoneId);

  // Wait for canvas to be properly sized and visible
  setTimeout(() => {
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    // Get the actual available width, accounting for padding
    const graphSection = canvas.closest('.zone-graph-section');
    if (!graphSection) return;
    
    // Get computed styles to account for padding
    const sectionStyle = window.getComputedStyle(graphSection);
    const sectionWidth = graphSection.offsetWidth;
    const sectionPaddingLeft = parseFloat(sectionStyle.paddingLeft) || 12;
    const sectionPaddingRight = parseFloat(sectionStyle.paddingRight) || 12;
    const width = sectionWidth - sectionPaddingLeft - sectionPaddingRight;
    const height = 150;
    
    // Ensure minimum width
    if (width <= 0) {
      console.warn('Graph section width is invalid, using fallback');
      return;
    }
    
    // Set canvas size (device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Scale context for high DPI displays
    ctx.scale(dpr, dpr);

    // Set up graph area (use the CSS width, not the scaled width)
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear canvas (after scaling, use the logical dimensions)
    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Prepare data points from real readings
    // hourlyReadings now contains all readings from today, sorted by time
    const dataPoints = hourlyReadings.map(reading => ({
      hour: reading.hour, // This is now fractional hours since start of day
      moisture: reading.moisture,
      timestamp: reading.timestamp,
      hourOfDay: reading.hourOfDay,
      minutes: reading.minutes
    }));

    // If no data, show a message or empty graph
    if (dataPoints.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    // Calculate time range for x-axis scaling
    const minHour = dataPoints[0].hour;
    const maxHour = dataPoints[dataPoints.length - 1].hour;
    const timeRange = maxHour - minHour || 1; // Avoid division by zero
    const numDataPoints = dataPoints.length;

    // Draw threshold lines if thresholds are available
    if (thresholds) {
      const minMoisture = thresholds.min_moisture;
      const maxMoisture = thresholds.max_moisture;

      // Draw min threshold line (red, dotted)
      if (minMoisture >= 0 && minMoisture <= 100) {
        const minY = height - padding.bottom - (minMoisture / 100) * graphHeight;
        ctx.strokeStyle = '#f44336'; // Red
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]); // Dotted line
        ctx.beginPath();
        ctx.moveTo(padding.left, minY);
        ctx.lineTo(width - padding.right, minY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid

        // Label for min threshold
        ctx.fillStyle = '#f44336';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Min: ${minMoisture}%`, width - padding.right - 50, minY - 5);
      }

      // Draw max threshold line (blue, dotted)
      if (maxMoisture >= 0 && maxMoisture <= 100) {
        const maxY = height - padding.bottom - (maxMoisture / 100) * graphHeight;
        ctx.strokeStyle = '#2196f3'; // Blue
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]); // Dotted line
        ctx.beginPath();
        ctx.moveTo(padding.left, maxY);
        ctx.lineTo(width - padding.right, maxY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid

        // Label for max threshold
        ctx.fillStyle = '#2196f3';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Max: ${maxMoisture}%`, width - padding.right - 50, maxY - 5);
      }

      // Highlight area below minimum threshold (red tint/halo)
      if (minMoisture >= 0 && minMoisture <= 100) {
        const minY = height - padding.bottom - (minMoisture / 100) * graphHeight;
        ctx.fillStyle = 'rgba(244, 67, 54, 0.08)'; // Light red tint
        ctx.fillRect(padding.left, minY, graphWidth, height - padding.bottom - minY);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines - show grid lines for each hour of the day
    const startHour = Math.floor(minHour);
    const endHour = Math.ceil(maxHour);
    for (let hour = startHour; hour <= endHour; hour++) {
      if (hour >= 0 && hour <= 24) {
        // Calculate x position based on time
        const hourX = padding.left + ((hour - minHour) / timeRange) * graphWidth;
        if (hourX >= padding.left && hourX <= width - padding.right) {
          ctx.beginPath();
          ctx.moveTo(hourX, padding.top);
          ctx.lineTo(hourX, height - padding.bottom);
          ctx.stroke();
        }
      }
    }

    // Draw moisture line (only if we have more than one point)
    if (numDataPoints > 1) {
      // Use black color for the moisture line
      ctx.strokeStyle = '#000000'; // Black
      ctx.lineWidth = 2;
      ctx.beginPath();
      dataPoints.forEach((point, index) => {
        // Calculate x position based on time (fractional hours since start of day)
        const x = padding.left + ((point.hour - minHour) / timeRange) * graphWidth;
        // Moisture is already a percentage (0-100), clamp it to ensure it's within bounds
        const moisture = Math.max(0, Math.min(100, point.moisture));
        const y = height - padding.bottom - (moisture / 100) * graphHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw data points as circles (black)
    dataPoints.forEach((point) => {
      // Calculate x position based on time (fractional hours since start of day)
      const x = padding.left + ((point.hour - minHour) / timeRange) * graphWidth;
      const moisture = Math.max(0, Math.min(100, point.moisture));
      const y = height - padding.bottom - (moisture / 100) * graphHeight;
      
      // Use black for all data points
      ctx.fillStyle = '#000000'; // Black
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw axis labels
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis labels (hours) - show hour labels for each hour in the range
    const startHourLabel = Math.floor(minHour);
    const endHourLabel = Math.ceil(maxHour);
    const hourLabels = [];
    for (let hour = startHourLabel; hour <= endHourLabel && hour <= 24; hour++) {
      if (hour >= 0) {
        hourLabels.push(hour);
      }
    }
    
    // Show labels for each hour, but limit to avoid overcrowding
    // If we have many hours, show every other hour or every 3rd hour
    const labelInterval = hourLabels.length > 12 ? 2 : (hourLabels.length > 6 ? 2 : 1);
    hourLabels.forEach((hour, idx) => {
      if (idx % labelInterval === 0 || idx === hourLabels.length - 1) {
        const hourX = padding.left + ((hour - minHour) / timeRange) * graphWidth;
        if (hourX >= padding.left && hourX <= width - padding.right) {
          ctx.fillText(hour.toString(), hourX, height - padding.bottom + 15);
        }
      }
    });

    // Y-axis labels (moisture)
    ctx.textAlign = 'right';
    ctx.font = '11px sans-serif';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * (5 - i);
      const value = Math.round((i / 5) * 100);
      ctx.fillText(value.toString(), padding.left - 8, y + 3);
    }

    // Update graph legend to include threshold information (after a short delay to ensure DOM is ready)
    setTimeout(() => {
      updateGraphLegend(canvas, thresholds);
    }, 150);
  }, 100);
  
  // Handle window resize for this specific canvas
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (canvas.offsetParent !== null) { // Only if visible
        const canvasZoneId = canvas.getAttribute('data-zone-id') || zoneId;
        setupZoneMoistureGraph(canvas, canvasZoneId);
      }
    }, 200);
  };
  
  window.addEventListener('resize', resizeHandler);
}

