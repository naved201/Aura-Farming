import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export function setupDashboard() {
  // Load zones from database and render them
  loadAndRenderZones().then(() => {
    // Setup zones carousel after zones are loaded
    setupZonesCarousel();
    
    // Setup watering schedule columns
    setupWateringScheduleColumns();
    
    // Load telemetry data for all zones
    loadZoneTelemetryData();
    
    // Setup update buttons
    const updateButtons = document.querySelectorAll('.update-button');
    updateButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const zoneContainer = btn.closest('.zone-container');
        const zoneTitle = zoneContainer?.querySelector('.zone-title')?.textContent || 'Zone';
        // Refresh telemetry data when update button is clicked
        await loadZoneTelemetryData();
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

    // Get all zones for the current user
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name')
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
          card.setAttribute('data-category', newCategory);
          
          // Update draggable state based on category
          if (newCategory === 'upcoming') {
            card.className = `schedule-card schedule-${newCategory}`;
            card.setAttribute('draggable', 'false');
          } else {
            card.className = `schedule-card schedule-${newCategory} draggable`;
            card.setAttribute('draggable', 'true');
          }
          
          // Update status badge
          const badge = card.querySelector('.schedule-status-badge');
          if (badge) {
            const badges = {
              'upcoming': 'Upcoming',
              'imminent': 'Imminent',
              'delayed': 'Overdue'
            };
            badge.textContent = badges[newCategory] || 'Upcoming';
          }
          
          // Handle checkbox/drag-handle/no-drag-indicator swap based on new category
          const cardHeader = card.querySelector('.schedule-card-header');
          if (cardHeader) {
            const existingCheckbox = cardHeader.querySelector('.delayed-checkbox-label');
            const existingDragHandle = cardHeader.querySelector('.schedule-drag-handle');
            const existingNoDrag = cardHeader.querySelector('.schedule-no-drag-indicator');
            
            if (newCategory === 'delayed') {
              // Moving TO delayed - add checkbox
              if (!existingCheckbox) {
                const zone = card.getAttribute('data-zone');
                const scheduledTime = card.getAttribute('data-scheduled-time');
                const checkboxHTML = `
                  <label class="delayed-checkbox-label">
                    <input type="checkbox" class="delayed-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
                    <span class="delayed-checkbox-custom"></span>
                  </label>
                `;
                if (existingDragHandle) {
                  existingDragHandle.outerHTML = checkboxHTML;
                } else if (existingNoDrag) {
                  existingNoDrag.outerHTML = checkboxHTML;
                }
              }
            } else if (newCategory === 'imminent') {
              // Moving TO imminent - add drag handle
              if (!existingDragHandle) {
                const dragHandleHTML = '<div class="schedule-drag-handle">⋮⋮</div>';
                if (existingCheckbox) {
                  existingCheckbox.outerHTML = dragHandleHTML;
                } else if (existingNoDrag) {
                  existingNoDrag.outerHTML = dragHandleHTML;
                }
              }
            } else if (newCategory === 'upcoming') {
              // Moving TO upcoming - add no-drag indicator
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
    draggedCard.setAttribute('data-category', newCategory);
    
    // Update card's status badge and class
    updateCardCategory(draggedCard, newCategory);

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

  function updateCardCategory(card, category) {
    // Remove old category classes
    card.classList.remove('schedule-upcoming', 'schedule-imminent', 'schedule-delayed', 'draggable');
    
    // Add new category class and draggable state
    card.classList.add(`schedule-${category}`);
    if (category !== 'upcoming') {
      card.classList.add('draggable');
      card.setAttribute('draggable', 'true');
    } else {
      card.setAttribute('draggable', 'false');
    }
    
    // Update status badge
    const badge = card.querySelector('.schedule-status-badge');
    if (badge) {
      const badges = {
        'upcoming': 'Upcoming',
        'imminent': 'Imminent',
        'delayed': 'Overdue'
      };
      badge.textContent = badges[category] || 'Upcoming';
    }
    
    // Handle checkbox/drag-handle/no-drag-indicator based on category
    const cardHeader = card.querySelector('.schedule-card-header');
    if (!cardHeader) return;
    
    const existingCheckbox = cardHeader.querySelector('.delayed-checkbox-label');
    const existingDragHandle = cardHeader.querySelector('.schedule-drag-handle');
    const existingNoDrag = cardHeader.querySelector('.schedule-no-drag-indicator');
    
    if (category === 'delayed') {
      // Add checkbox if it doesn't exist
      if (!existingCheckbox) {
        const zone = card.getAttribute('data-zone');
        const scheduledTime = card.getAttribute('data-scheduled-time');
        const checkboxHTML = `
          <label class="delayed-checkbox-label">
            <input type="checkbox" class="delayed-checkbox" data-zone="${zone}" data-scheduled-time="${scheduledTime}">
            <span class="delayed-checkbox-custom"></span>
          </label>
        `;
        if (existingDragHandle) {
          existingDragHandle.outerHTML = checkboxHTML;
        } else if (existingNoDrag) {
          existingNoDrag.outerHTML = checkboxHTML;
        }
      }
    } else if (category === 'imminent') {
      // Add drag handle if it doesn't exist
      if (!existingDragHandle) {
        const dragHandleHTML = '<div class="schedule-drag-handle">⋮⋮</div>';
        if (existingCheckbox) {
          existingCheckbox.outerHTML = dragHandleHTML;
        } else if (existingNoDrag) {
          existingNoDrag.outerHTML = dragHandleHTML;
        }
      }
    } else if (category === 'upcoming') {
      // Add no-drag indicator if it doesn't exist
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
  const updateInterval = 100;
  
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
      const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
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

