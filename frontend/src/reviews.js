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

// Individual zone schedule data - each zone has multiple scheduled watering times
// This represents the general watering schedule for each individual zone
const individualZoneSchedules = {
  'Zone 1': [
    { scheduledTime: new Date(Date.now() + 10 * 1000), duration: '30 min' },
    { scheduledTime: new Date(Date.now() + 3600 * 1000), duration: '30 min' }, // 1 hour later
    { scheduledTime: new Date(Date.now() + 7200 * 1000), duration: '30 min' }, // 2 hours later
    { scheduledTime: new Date(Date.now() + 10800 * 1000), duration: '30 min' } // 3 hours later
  ],
  'Zone 2': [
    { scheduledTime: new Date(Date.now() + 20 * 1000), duration: '25 min' },
    { scheduledTime: new Date(Date.now() + 3900 * 1000), duration: '25 min' }, // ~1.1 hours later
    { scheduledTime: new Date(Date.now() + 7500 * 1000), duration: '25 min' }, // ~2.1 hours later
    { scheduledTime: new Date(Date.now() + 11100 * 1000), duration: '25 min' } // ~3.1 hours later
  ],
  'Zone 3': [
    { scheduledTime: new Date(Date.now() + 30 * 1000), duration: '35 min' },
    { scheduledTime: new Date(Date.now() + 4200 * 1000), duration: '35 min' }, // ~1.2 hours later
    { scheduledTime: new Date(Date.now() + 7800 * 1000), duration: '35 min' }, // ~2.2 hours later
    { scheduledTime: new Date(Date.now() + 11400 * 1000), duration: '35 min' } // ~3.2 hours later
  ],
  'Zone 4': [
    { scheduledTime: new Date(Date.now() + 40 * 1000), duration: '40 min' },
    { scheduledTime: new Date(Date.now() + 4500 * 1000), duration: '40 min' }, // ~1.25 hours later
    { scheduledTime: new Date(Date.now() + 8100 * 1000), duration: '40 min' }, // ~2.25 hours later
    { scheduledTime: new Date(Date.now() + 11700 * 1000), duration: '40 min' } // ~3.25 hours later
  ]
};

// Generate schedule card HTML for a single schedule
function generateScheduleCardHTML(schedule, index, category) {
    const timeStr = schedule.scheduledTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
  const timeUntilSeconds = Math.floor((schedule.scheduledTime.getTime() - Date.now()) / 1000);
  const timeUntilMinutes = Math.floor(timeUntilSeconds / 60);
  
  // Determine status badge and class based on category
  let statusBadge = 'Upcoming';
  let statusClass = 'schedule-upcoming';
  
  if (category === 'delayed') {
    statusBadge = 'Overdue';
    statusClass = 'schedule-delayed';
  } else if (category === 'imminent') {
    statusBadge = 'Urgent';
    statusClass = 'schedule-imminent';
  } else if (category === 'upcoming') {
    statusBadge = 'Upcoming';
    statusClass = 'schedule-upcoming';
  }
  
  const showSelectionCheckbox = category === 'upcoming' || category === 'imminent';
  const selectionCheckboxHTML = `
          <label class="schedule-select-checkbox-label" aria-label="Select schedule">
            <input type="checkbox" class="schedule-select-checkbox" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}">
            <span class="schedule-select-checkbox-custom"></span>
          </label>
        `;
  
  let leadingControls = '';
  if (category === 'delayed') {
    leadingControls = `
        <div class="schedule-card-leading">
          <label class="delayed-checkbox-label">
            <input type="checkbox" class="delayed-checkbox" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}">
            <span class="delayed-checkbox-custom"></span>
          </label>
        </div>
      `;
  } else {
    const indicatorHTML = category === 'imminent'
      ? '<div class="schedule-drag-handle">⋮⋮</div>'
      : '<div class="schedule-no-drag-indicator">📅</div>';
      
    leadingControls = `
        <div class="schedule-card-leading">
          ${showSelectionCheckbox ? selectionCheckboxHTML : ''}
          ${indicatorHTML}
        </div>
      `;
  }
    
    return `
    <div class="schedule-card ${statusClass} ${category !== 'upcoming' ? 'draggable' : ''}" draggable="${category !== 'upcoming'}" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}" data-index="${index}" data-category="${category}">
      <div class="schedule-card-header">
        ${leadingControls}
        <span class="schedule-zone-name">${schedule.zone}</span>
        <span class="schedule-status-badge">${statusBadge}</span>
      </div>
      <div class="schedule-card-content">
        <div class="schedule-time-display">
          <span class="schedule-icon">🕐</span>
          <span class="schedule-time">${timeStr}</span>
        </div>
        <div class="schedule-countdown">
          <span class="countdown-text">${timeUntilSeconds > 0 ? 'Scheduled in' : 'Overdue by'}</span>
          <span class="countdown-value" data-zone="${schedule.zone}">${timeUntilSeconds > 0 ? `${timeUntilSeconds}s` : `${Math.abs(timeUntilSeconds)}s`}</span>
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
}

// Generate schedule cards HTML from zone data, categorized into columns
function generateScheduleCards() {
  // Flatten all individual zone schedules into a single array with zone names
  const allSchedules = [];
  
  Object.keys(individualZoneSchedules).forEach(zoneName => {
    individualZoneSchedules[zoneName].forEach(schedule => {
      allSchedules.push({
        zone: zoneName,
        scheduledTime: schedule.scheduledTime,
        duration: schedule.duration
      });
    });
  });
  
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  
  // Categorize schedules into 3 logical columns
  const categories = {
    upcoming: [],      // More than 5 minutes away
    imminent: [],      // Within 5 minutes (urgent)
    delayed: []        // Past scheduled time (overdue)
  };
  
  allSchedules.forEach((schedule, index) => {
    const timeUntil = schedule.scheduledTime.getTime() - now;
    const timeUntilMinutes = timeUntil / (60 * 1000);
    
    if (timeUntil < 0) {
      // Time has passed - overdue
      categories.delayed.push({ ...schedule, index, category: 'delayed' });
    } else if (timeUntilMinutes <= 5) {
      // Within 5 minutes - urgent
      categories.imminent.push({ ...schedule, index, category: 'imminent' });
    } else {
      // More than 5 minutes away - upcoming
      categories.upcoming.push({ ...schedule, index, category: 'upcoming' });
    }
  });
  
  // Sort each category by scheduled time
  Object.keys(categories).forEach(key => {
    categories[key].sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  });
  
  // Generate HTML for each column
  return `
    <div class="schedule-columns-container">
      <div class="schedule-column" data-category="upcoming">
        <div class="schedule-column-header">
          <div class="schedule-column-title-group">
            <h3 class="schedule-column-title">Upcoming</h3>
            <span class="schedule-column-count">${categories.upcoming.length}</span>
          </div>
          <div class="schedule-column-actions" data-column="upcoming">
            <button class="schedule-select-all-btn" data-column="upcoming" aria-label="Select all upcoming schedules">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Select All</span>
            </button>
            <button class="schedule-watered-btn" data-column="upcoming" aria-label="Mark selected upcoming schedules as watered" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Watered</span>
            </button>
          </div>
        </div>
        <div class="schedule-column-content" data-drop-zone="upcoming">
          ${categories.upcoming.map((schedule, idx) => generateScheduleCardHTML(schedule, idx, 'upcoming')).join('')}
          ${categories.upcoming.length === 0 ? '<div class="schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
      
      <div class="schedule-column" data-category="imminent">
        <div class="schedule-column-header">
          <div class="schedule-column-title-group">
            <h3 class="schedule-column-title">Imminent (≤5 min)</h3>
            <span class="schedule-column-count">${categories.imminent.length}</span>
          </div>
          <div class="schedule-column-actions" data-column="imminent">
            <button class="schedule-select-all-btn" data-column="imminent" aria-label="Select all imminent schedules">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Select All</span>
            </button>
            <button class="schedule-watered-btn" data-column="imminent" aria-label="Mark selected imminent schedules as watered" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Watered</span>
            </button>
          </div>
        </div>
        <div class="schedule-column-content" data-drop-zone="imminent">
          ${categories.imminent.map((schedule, idx) => generateScheduleCardHTML(schedule, idx, 'imminent')).join('')}
          ${categories.imminent.length === 0 ? '<div class="schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
      
      <div class="schedule-column" data-category="delayed">
        <div class="schedule-column-header">
          <div class="schedule-column-title-group">
            <h3 class="schedule-column-title">Delayed (Overdue)</h3>
            <span class="schedule-column-count">${categories.delayed.length}</span>
          </div>
          <div class="delayed-actions">
            <button class="delayed-select-all-btn" aria-label="Select All Delayed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Select All</span>
            </button>
            <button class="delayed-delete-btn" aria-label="Delete Selected" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
        <div class="schedule-column-content" data-drop-zone="delayed">
          ${categories.delayed.map((schedule, idx) => generateScheduleCardHTML(schedule, idx, 'delayed')).join('')}
          ${categories.delayed.length === 0 ? '<div class="schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
    </div>
  `;
}

// Generate schedule cards HTML for a specific zone (individual zone schedule)
// Uses the same column-based layout as the general schedule
function generateZoneScheduleCards(zoneName) {
  const zoneSchedules = individualZoneSchedules[zoneName] || [];
  
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  
  // Categorize schedules based on time
  const categories = {
    upcoming: [],      // > 5 minutes away
    imminent: [],      // <= 5 minutes away but not yet started
    delayed: []        // Time passed (overdue)
  };
  
  zoneSchedules.forEach((schedule, index) => {
    const timeUntil = schedule.scheduledTime.getTime() - now;
    const timeUntilMinutes = timeUntil / (60 * 1000);
    
    const scheduleWithZone = {
      zone: zoneName,
      scheduledTime: schedule.scheduledTime,
      duration: schedule.duration,
      index
    };
    
    if (timeUntil < 0) {
      // Time has passed - overdue/delayed
      categories.delayed.push({ ...scheduleWithZone, category: 'delayed' });
    } else if (timeUntilMinutes <= 5) {
      // <= 5 minutes away - imminent
      categories.imminent.push({ ...scheduleWithZone, category: 'imminent' });
    } else {
      // > 5 minutes away - upcoming
      categories.upcoming.push({ ...scheduleWithZone, category: 'upcoming' });
    }
  });
  
  // Sort each category by scheduled time
  Object.keys(categories).forEach(key => {
    categories[key].sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  });
  
  // Generate HTML for each column (same structure as general schedule)
  return `
    <div class="zone-schedule-columns-container">
      <div class="zone-schedule-column" data-category="upcoming" data-zone="${zoneName}">
        <div class="zone-schedule-column-header">
          <div class="zone-schedule-column-title-group">
            <h4 class="zone-schedule-column-title">Upcoming</h4>
            <span class="zone-schedule-column-count">${categories.upcoming.length}</span>
          </div>
        </div>
        <div class="zone-schedule-column-content" data-drop-zone="upcoming" data-zone="${zoneName}">
          ${categories.upcoming.map((schedule, idx) => generateZoneScheduleCardHTML(schedule, idx, 'upcoming')).join('')}
          ${categories.upcoming.length === 0 ? '<div class="zone-schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
      
      <div class="zone-schedule-column" data-category="imminent" data-zone="${zoneName}">
        <div class="zone-schedule-column-header">
          <div class="zone-schedule-column-title-group">
            <h4 class="zone-schedule-column-title">Imminent</h4>
            <span class="zone-schedule-column-count">${categories.imminent.length}</span>
          </div>
        </div>
        <div class="zone-schedule-column-content" data-drop-zone="imminent" data-zone="${zoneName}">
          ${categories.imminent.map((schedule, idx) => generateZoneScheduleCardHTML(schedule, idx, 'imminent')).join('')}
          ${categories.imminent.length === 0 ? '<div class="zone-schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
      
      <div class="zone-schedule-column" data-category="delayed" data-zone="${zoneName}">
        <div class="zone-schedule-column-header">
          <div class="zone-schedule-column-title-group">
            <h4 class="zone-schedule-column-title">Delayed</h4>
            <span class="zone-schedule-column-count">${categories.delayed.length}</span>
          </div>
          <div class="zone-delayed-actions">
            <button class="zone-delayed-select-all-btn" data-zone="${zoneName}" aria-label="Select All Delayed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Select All</span>
            </button>
            <button class="zone-delayed-delete-btn" data-zone="${zoneName}" aria-label="Delete Selected" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
        <div class="zone-schedule-column-content" data-drop-zone="delayed" data-zone="${zoneName}">
          ${categories.delayed.map((schedule, idx) => generateZoneScheduleCardHTML(schedule, idx, 'delayed')).join('')}
          ${categories.delayed.length === 0 ? '<div class="zone-schedule-empty-message">Drop cards here</div>' : ''}
        </div>
      </div>
    </div>
  `;
}

// Generate individual card HTML for zone schedules
function generateZoneScheduleCardHTML(schedule, index, category) {
  const timeStr = schedule.scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const timeUntilSeconds = Math.floor((schedule.scheduledTime.getTime() - Date.now()) / 1000);
  
  // Determine status badge based on category
  let statusBadge = 'Upcoming';
  let statusClass = 'zone-schedule-upcoming';
  
  if (category === 'delayed') {
    statusBadge = 'Overdue';
    statusClass = 'zone-schedule-delayed';
  } else if (category === 'imminent') {
    statusBadge = 'Urgent';
    statusClass = 'zone-schedule-imminent';
  }
  
  return `
    <div class="zone-schedule-card ${statusClass} ${category !== 'upcoming' ? 'draggable' : ''}" draggable="${category !== 'upcoming'}" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}" data-index="${index}" data-category="${category}">
      <div class="zone-schedule-card-header">
        ${category === 'delayed' ? `
        <label class="zone-delayed-checkbox-label">
          <input type="checkbox" class="zone-delayed-checkbox" data-zone="${schedule.zone}" data-scheduled-time="${schedule.scheduledTime.getTime()}">
          <span class="zone-delayed-checkbox-custom"></span>
        </label>
        ` : category === 'imminent' ? '<div class="zone-schedule-drag-handle">⋮⋮</div>' : '<div class="schedule-no-drag-indicator">📅</div>'}
        <span class="zone-schedule-time-label">${timeStr}</span>
        <span class="zone-schedule-status-badge">${statusBadge}</span>
      </div>
      <div class="zone-schedule-card-content">
        <div class="zone-schedule-time-display">
          <span class="zone-schedule-icon">🕐</span>
          <span class="zone-schedule-time">${timeStr}</span>
        </div>
        <div class="zone-schedule-countdown">
          <span class="zone-countdown-text">${timeUntilSeconds > 0 ? 'SCHEDULED IN' : 'OVERDUE BY'}</span>
          <span class="zone-countdown-value" data-zone="${schedule.zone}">${timeUntilSeconds > 0 ? `${timeUntilSeconds}s` : `${Math.abs(timeUntilSeconds)}s`}</span>
        </div>
        <div class="zone-water-tube-container">
          <div class="zone-water-tube">
            <div class="zone-water-tube-fill" data-zone="${schedule.zone}" style="height: 0%;">
              <div class="zone-water-wave"></div>
            </div>
            <div class="zone-water-tube-label">WATERING PROGRESS</div>
          </div>
        </div>
        <div class="zone-schedule-duration">Duration: ${schedule.duration}</div>
      </div>
    </div>
  `;
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
                <!-- Zones will be dynamically loaded from database -->
              </div>
            </div>
            
            <button class="zone-carousel-arrow zone-carousel-arrow-right" aria-label="Next Zone">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <!-- Watering Schedule Columns Section -->
          <div class="watering-schedule-section">
            <div class="watering-schedule-header">
              <div class="watering-schedule-title-group">
                <div class="watering-schedule-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                  </svg>
                </div>
                <div class="watering-schedule-title-text">
                  <h2 class="watering-schedule-title">General Watering Schedule</h2>
                  <p class="watering-schedule-subtitle">All zones unified schedule</p>
                </div>
              </div>
              <button class="halt-queue-button" id="halt-queue-btn" aria-label="Halt All Watering">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                <span class="halt-button-text">Halt All</span>
              </button>
            </div>
            <div class="watering-schedule-columns-wrapper" id="watering-schedule-columns">
                  ${generateScheduleCards()}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

