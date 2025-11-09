import { getAllZonesTelemetry, subscribeToAllZonesTelemetry } from './telemetry.js';

export function setupDashboard() {
  // Setup zones carousel
  setupZonesCarousel();
  
  // Setup watering schedule columns
  setupWateringScheduleColumns();
  
  // Setup update buttons
  const updateButtons = document.querySelectorAll('.update-button');
  updateButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const zoneContainer = btn.closest('.zone-container');
      const zoneTitle = zoneContainer?.querySelector('.zone-title')?.textContent || 'Zone';
      alert(`Updating ${zoneTitle}...`);
      // Add actual update logic here
    });
  });

  // Setup zone graph toggles
  setupZoneGraphToggles();
  
  // Setup zone schedule toggles
  setupZoneScheduleToggles();
  
  // Load and display real-time telemetry data
  loadTelemetryData();
  
  // Subscribe to real-time updates
  subscribeToTelemetryUpdates();
}

// Load initial telemetry data for all zones
async function loadTelemetryData() {
  try {
    const telemetryData = await getAllZonesTelemetry(1);
    updateDashboardWithTelemetry(telemetryData);
  } catch (err) {
    console.error('Error loading telemetry data:', err);
  }
}

// Subscribe to real-time telemetry updates
function subscribeToTelemetryUpdates() {
  subscribeToAllZonesTelemetry((zoneId, telemetryData) => {
    console.log('New telemetry data received:', zoneId, telemetryData);
    // Update the specific zone's display
    updateZoneTelemetry(zoneId, telemetryData);
  });
}

// Update dashboard with telemetry data
function updateDashboardWithTelemetry(telemetryData) {
  // Update each zone's display
  Object.keys(telemetryData).forEach(zoneId => {
    const latest = telemetryData[zoneId][0];
    if (latest) {
      updateZoneTelemetry(zoneId, latest);
    }
  });
}

// Update a specific zone's telemetry display
function updateZoneTelemetry(zoneId, telemetry) {
  // Find zone card by zone ID (you may need to add data-zone-id attribute to zone cards)
  const zoneCards = document.querySelectorAll('.zone-card, .zone-item-wrapper');
  
  zoneCards.forEach(card => {
    // Try to match by zone ID if data attribute exists
    const cardZoneId = card.getAttribute('data-zone-id');
    if (cardZoneId === zoneId) {
      updateZoneCard(card, telemetry);
    }
  });
  
  // Also try to update by zone name/number if zone ID matching doesn't work
  // This is a fallback for existing zone cards that may not have zone IDs
  updateZoneCardsByIndex(telemetry);
}

// Update zone card with telemetry data
function updateZoneCard(card, telemetry) {
  // Update moisture display
  const moistureEl = card.querySelector('.moisture-value, .zone-moisture-value');
  if (moistureEl && telemetry.moisture !== null && telemetry.moisture !== undefined) {
    moistureEl.textContent = `${telemetry.moisture.toFixed(1)}%`;
  }
  
  // Update rainfall display (rain is boolean: 0 = false, 1 = true)
  const rainEl = card.querySelector('.rain-value, .zone-rain-value');
  if (rainEl && telemetry.rain !== null && telemetry.rain !== undefined) {
    const isRaining = telemetry.rain === 1 || telemetry.rain === true;
    rainEl.textContent = isRaining ? 'Yes' : 'No';
    // Optionally add a class for styling
    rainEl.classList.toggle('raining', isRaining);
    rainEl.classList.toggle('not-raining', !isRaining);
  }
  
  // Update status (dry, moist, wet)
  const statusEl = card.querySelector('.status-value, .zone-status-value');
  if (statusEl && telemetry.status) {
    statusEl.textContent = telemetry.status.charAt(0).toUpperCase() + telemetry.status.slice(1);
    // Add status class for styling
    statusEl.className = statusEl.className.replace(/\bstatus-(dry|moist|wet)\b/g, '');
    statusEl.classList.add(`status-${telemetry.status}`);
  }
  
  // Update timestamp
  const timestampEl = card.querySelector('.timestamp-value, .zone-timestamp-value');
  if (timestampEl && telemetry.ts) {
    const date = new Date(telemetry.ts);
    timestampEl.textContent = date.toLocaleTimeString();
  }
  
  console.log('Updated zone card with telemetry:', {
    moisture: telemetry.moisture,
    rain: telemetry.rain,
    status: telemetry.status,
    timestamp: telemetry.ts
  });
}

// Fallback: Update zone cards by index (for demo zones)
function updateZoneCardsByIndex(telemetry) {
  // This is a fallback method - update the first zone card found
  // In production, you should properly map zone IDs to zone cards
  const firstZoneCard = document.querySelector('.zone-card, .zone-item-wrapper');
  if (firstZoneCard) {
    updateZoneCard(firstZoneCard, telemetry);
  }
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
}

// Function to dynamically update schedule categorization
function setupScheduleCategorization() {
  const columnsWrapper = document.getElementById('watering-schedule-columns');
  if (!columnsWrapper) return;
  
  // Update categorization every 10 seconds
  setInterval(() => {
    const allCards = columnsWrapper.querySelectorAll('.schedule-card');
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    
    allCards.forEach(card => {
      const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
      if (!scheduledTime) return;
      
      const timeUntil = scheduledTime - now;
      const timeUntilMinutes = timeUntil / (60 * 1000);
      const currentCategory = card.getAttribute('data-category');
      const userPushed = card.hasAttribute('data-user-pushed');
      
      let newCategory = currentCategory;
      
      if (userPushed) {
        newCategory = 'user-pushed';
      } else if (timeUntil < 0) {
        newCategory = 'delayed';
      } else if (timeUntilMinutes <= 5) {
        newCategory = 'imminent';
      } else {
        newCategory = 'upcoming';
      }
      
      // Move card to appropriate column if category changed
      if (newCategory !== currentCategory) {
        const targetColumn = columnsWrapper.querySelector(`.schedule-column[data-category="${newCategory}"]`);
        const targetContent = targetColumn?.querySelector('.schedule-column-content');
        
        if (targetContent) {
          card.setAttribute('data-category', newCategory);
          card.className = `schedule-card schedule-${newCategory}`;
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
  const updateInterval = 100; // Update every 100ms for smooth animation (10-second demo)
  
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
      const checkbox = card.querySelector('.zone-disable-checkbox');
      const isDisabled = !checkbox || !checkbox.checked;
      
      // Skip disabled zones or if queue is halted
      if (isDisabled || isHalted) {
        if (countdownEl && !card.classList.contains('schedule-completed')) {
          countdownEl.textContent = isHalted ? 'Halted' : 'Disabled';
          countdownEl.classList.add('paused');
        }
        card.classList.add('zone-disabled');
        return;
      } else {
        card.classList.remove('zone-disabled');
        if (countdownEl) {
          countdownEl.classList.remove('paused');
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
      
      // Restore countdowns for enabled zones
      const carousel = document.getElementById('watering-carousel');
      if (carousel) {
        const cards = carousel.querySelectorAll('.schedule-card:not(.zone-disabled):not(.schedule-completed)');
        cards.forEach(card => {
          const countdownEl = card.querySelector('.countdown-value');
          const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
          if (countdownEl && scheduledTime) {
            const now = Date.now();
            const timeUntilSeconds = Math.floor((scheduledTime - now) / 1000);
            if (timeUntilSeconds > 0) {
              countdownEl.textContent = `${timeUntilSeconds}s`;
              countdownEl.classList.remove('paused');
            }
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
      
      // Update all active cards to show "Halted"
      const carousel = document.getElementById('watering-carousel');
      if (carousel) {
        const cards = carousel.querySelectorAll('.schedule-card:not(.zone-disabled):not(.schedule-completed)');
        cards.forEach(card => {
          const countdownEl = card.querySelector('.countdown-value');
          if (countdownEl) {
            countdownEl.textContent = 'Halted';
            countdownEl.classList.add('paused');
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
      
      const zoneNumber = button.getAttribute('data-zone');
      const graphSection = document.querySelector(`.zone-graph-section[data-zone="${zoneNumber}"]`);
      
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
          // Wait for the transition to start before calculating size
          setTimeout(() => {
            setupZoneMoistureGraph(canvas, zoneNumber);
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
        
        // Setup carousel for this zone's schedule
        const carouselId = `zone-${zoneNumber}-schedule-carousel`;
        setupZoneScheduleCarousel(carouselId, zoneNumber);
      }
    });
  });
}

function setupZoneScheduleCarousel(carouselId, zoneNumber) {
  const carousel = document.getElementById(carouselId);
  const leftArrow = document.querySelector(`.zone-schedule-carousel-arrow-left[data-zone="${zoneNumber}"]`);
  const rightArrow = document.querySelector(`.zone-schedule-carousel-arrow-right[data-zone="${zoneNumber}"]`);
  
  if (!carousel || !leftArrow || !rightArrow) {
    setTimeout(() => setupZoneScheduleCarousel(carouselId, zoneNumber), 100);
    return;
  }

  // Sort cards by scheduled time
  sortZoneScheduleCards(carousel);

  let currentIndex = 0;
  let cards = carousel.querySelectorAll('.zone-schedule-card');
  const totalCards = cards.length;
  const cardsPerView = 2; // Show 2 cards at a time in the dropdown (compact cards)
  
  if (totalCards === 0) {
    setTimeout(() => setupZoneScheduleCarousel(carouselId, zoneNumber), 100);
    return;
  }

  const maxIndex = totalCards > cardsPerView ? totalCards - cardsPerView : 0;
  
  // Setup countdown timers for this zone's schedule
  setupZoneScheduleCountdowns(carousel, zoneNumber);

  function updateCarousel() {
    cards = carousel.querySelectorAll('.zone-schedule-card');
    if (cards.length === 0) {
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
    
    const carouselStyle = window.getComputedStyle(carousel);
    const gapValue = carouselStyle.gap || '16px';
    const gap = parseFloat(gapValue) || 16;
    
    const cardWidth = (wrapperWidth - gap) / cardsPerView;
    
    cards.forEach((card) => {
      card.style.width = cardWidth + 'px';
      card.style.minWidth = cardWidth + 'px';
      card.style.maxWidth = cardWidth + 'px';
      card.style.flexBasis = cardWidth + 'px';
    });
    
    const translateX = -currentIndex * (cardWidth + gap);
    carousel.style.transform = `translateX(${translateX}px)`;
    carousel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  function next() {
    if (currentIndex >= maxIndex) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    updateCarousel();
  }

  function prev() {
    if (currentIndex <= 0) {
      currentIndex = maxIndex;
    } else {
      currentIndex--;
    }
    updateCarousel();
  }

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

  requestAnimationFrame(() => {
    currentIndex = 0;
    updateCarousel();
  });
  
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel();
    }, 200);
  };
  
  window.addEventListener('resize', resizeHandler);
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

function setupZoneScheduleCountdowns(carousel, zoneNumber) {
  const updateInterval = 100;
  
  function updateCountdowns() {
    const cards = Array.from(carousel.querySelectorAll('.zone-schedule-card'));
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
  
  if (carousel.dataset.intervalId) {
    clearInterval(parseInt(carousel.dataset.intervalId));
  }
  carousel.dataset.intervalId = intervalId.toString();
}

function setupZoneMoistureGraph(canvas, zoneNumber) {
  if (!canvas) return;

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

  // Generate sample data
  const hours = 24;
  const dataPoints = [];
  for (let i = 0; i <= hours; i++) {
    dataPoints.push({
      hour: i,
      moisture1: 50 + Math.sin(i / 4) * 20 + Math.random() * 10, // Black line
      moisture2: 60 + Math.cos(i / 3) * 15 + Math.random() * 8   // Blue line
    });
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

  // Vertical grid lines
  for (let i = 0; i <= 6; i++) {
    const x = padding.left + (graphWidth / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  // Draw black line (moisture good/medium)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  dataPoints.forEach((point, index) => {
    const x = padding.left + (point.hour / hours) * graphWidth;
    const y = height - padding.bottom - (point.moisture1 / 100) * graphHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw blue line (rainfall yes/no)
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  dataPoints.forEach((point, index) => {
    const x = padding.left + (point.hour / hours) * graphWidth;
    const y = height - padding.bottom - (point.moisture2 / 100) * graphHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw highlight area where blue > black
  ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
  ctx.beginPath();
  dataPoints.forEach((point, index) => {
    const x = padding.left + (point.hour / hours) * graphWidth;
    const y1 = height - padding.bottom - (point.moisture1 / 100) * graphHeight;
    const y2 = height - padding.bottom - (point.moisture2 / 100) * graphHeight;
    if (point.moisture2 > point.moisture1) {
      if (index === 0) {
        ctx.moveTo(x, y1);
      }
      ctx.lineTo(x, y2);
    }
  });
  // Close the path
  dataPoints.slice().reverse().forEach((point, index) => {
    const x = padding.left + (point.hour / hours) * graphWidth;
    const y1 = height - padding.bottom - (point.moisture1 / 100) * graphHeight;
    if (point.moisture2 > point.moisture1) {
      ctx.lineTo(x, y1);
    }
  });
  ctx.closePath();
  ctx.fill();

  // Draw axis labels
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  
  // X-axis labels (hours)
  for (let i = 0; i <= 6; i++) {
    const x = padding.left + (graphWidth / 6) * i;
    const hour = Math.round((i / 6) * hours);
    ctx.fillText(hour.toString(), x, height - padding.bottom + 15);
  }

    // Y-axis labels (moisture)
    ctx.textAlign = 'right';
    ctx.font = '11px sans-serif';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * (5 - i);
      const value = Math.round((i / 5) * 100);
      ctx.fillText(value.toString(), padding.left - 8, y + 3);
    }
  }, 100);
  
  // Handle window resize for this specific canvas
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (canvas.offsetParent !== null) { // Only if visible
        setupZoneMoistureGraph(canvas, zoneNumber);
      }
    }, 200);
  };
  
  window.addEventListener('resize', resizeHandler);
}

