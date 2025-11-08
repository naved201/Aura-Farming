export function setupDashboard() {
  // Setup zones carousel
  setupZonesCarousel();
  
  // Setup watering schedule carousel
  setupWateringScheduleCarousel();
  
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

function setupWateringScheduleCarousel() {
  const carousel = document.getElementById('watering-carousel');
  const leftArrow = document.querySelector('.watering-carousel-arrow-left');
  const rightArrow = document.querySelector('.watering-carousel-arrow-right');
  
  if (!carousel || !leftArrow || !rightArrow) {
    setTimeout(setupWateringScheduleCarousel, 100);
    return;
  }

  // Sort cards by scheduled time
  sortScheduleCardsByTime(carousel);

  // Store carousel state
  let currentIndex = 0;
  let cards = carousel.querySelectorAll('.schedule-card');
  const totalCards = cards.length;
  const cardsPerView = 2; // Show 2 cards at a time
  
  if (totalCards === 0) {
    setTimeout(setupWateringScheduleCarousel, 100);
    return;
  }

  const maxIndex = totalCards > cardsPerView ? totalCards - cardsPerView : 0;
  
  // Setup countdown timers and auto-rotation
  setupScheduleCountdowns(carousel);

  function updateCarousel() {
    cards = carousel.querySelectorAll('.schedule-card');
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
    
    // Get the gap from computed styles
    const carouselStyle = window.getComputedStyle(carousel);
    const gapValue = carouselStyle.gap || '16px';
    const gap = parseFloat(gapValue) || 16;
    
    // Calculate card width: (wrapper width - gap) / cards per view
    const cardWidth = (wrapperWidth - gap) / cardsPerView;
    
    // Set each card width
    cards.forEach((card) => {
      card.style.width = cardWidth + 'px';
      card.style.minWidth = cardWidth + 'px';
      card.style.maxWidth = cardWidth + 'px';
      card.style.flexBasis = cardWidth + 'px';
    });
    
    // Calculate transform: move by one card width + gap for each step
    const translateX = -currentIndex * (cardWidth + gap);
    carousel.style.transform = `translateX(${translateX}px)`;
    carousel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  function next() {
    if (currentIndex >= maxIndex) {
      currentIndex = 0; // Loop back to start
    } else {
      currentIndex++;
    }
    updateCarousel();
  }

  function prev() {
    if (currentIndex <= 0) {
      currentIndex = maxIndex; // Loop to end
    } else {
      currentIndex--;
    }
    updateCarousel();
  }

  // Add click listeners to arrows
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
  requestAnimationFrame(() => {
    currentIndex = 0;
    updateCarousel();
  });
  
  // Store updateCarousel reference for use by moveCompletedZonesToEnd
  carousel.dataset.updateCarousel = 'updateWateringCarousel';
  window.updateWateringCarousel = updateCarousel;
  
  // Recalculate on window resize
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel();
    }, 200);
  };
  
  window.addEventListener('resize', resizeHandler);
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
    
    cards.forEach(card => {
      const scheduledTime = parseInt(card.getAttribute('data-scheduled-time'));
      const countdownEl = card.querySelector('.countdown-value');
      const timeDisplay = card.querySelector('.schedule-time');
      const waterFill = card.querySelector('.water-tube-fill');
      const zone = card.getAttribute('data-zone');
      
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
  completedCards.forEach((card, index) => {
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
      countdownEl.classList.remove('completed');
    }
    if (waterFill) {
      waterFill.style.height = '0%';
    }
    if (statusBadge) {
      statusBadge.textContent = 'Upcoming';
    }
  });
  
  // Combine all cards and sort by time
  const allCards = [...activeCards, ...completedCards];
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
  
  // Trigger carousel update if setup function is available
  const updateCarouselName = carousel.dataset.updateCarousel;
  if (updateCarouselName && typeof window[updateCarouselName] === 'function') {
    window[updateCarouselName]();
  }
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

