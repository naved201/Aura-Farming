export function setupDashboard() {
  // Setup graph
  setupMoistureGraph();
  
  // Setup zones carousel
  setupZonesCarousel();
  
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
  let zones = carousel.querySelectorAll('.zone-container');
  const totalZones = zones.length;
  
  if (totalZones === 0) {
    setTimeout(setupZonesCarousel, 100);
    return;
  }
  
  const maxIndex = totalZones - 1;

  function updateCarousel() {
    zones = carousel.querySelectorAll('.zone-container');
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
    
    // Get the actual width of the first zone card
    const firstZone = zones[0];
    if (!firstZone) {
      setTimeout(updateCarousel, 100);
      return;
    }
    
    const zoneWidth = firstZone.offsetWidth;
    const carouselStyle = window.getComputedStyle(carousel);
    const gapValue = carouselStyle.gap || '16px';
    const gap = parseInt(gapValue) || 16;
    
    // Calculate translation based on actual zone width
    const translateX = -currentIndex * (zoneWidth + gap);
    
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

  // Remove any existing listeners and add new ones
  const newRightArrow = rightArrow.cloneNode(true);
  const newLeftArrow = leftArrow.cloneNode(true);
  rightArrow.parentNode.replaceChild(newRightArrow, rightArrow);
  leftArrow.parentNode.replaceChild(newLeftArrow, leftArrow);

  newRightArrow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    next();
  });
  
  newLeftArrow.addEventListener('click', (e) => {
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

function setupMoistureGraph() {
  const canvas = document.getElementById('moisture-graph');
  if (!canvas) {
    setTimeout(setupMoistureGraph, 100);
    return;
  }

  // Wait for canvas to be properly sized
  setTimeout(() => {
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const width = container?.offsetWidth || 800;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

  // Set up graph area
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Clear canvas
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
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  
  // X-axis labels (hours)
  for (let i = 0; i <= 6; i++) {
    const x = padding.left + (graphWidth / 6) * i;
    const hour = Math.round((i / 6) * hours);
    ctx.fillText(hour.toString(), x, height - padding.bottom + 20);
  }

    // Y-axis labels (moisture)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * (5 - i);
      const value = Math.round((i / 5) * 100);
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
  }, 200);
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      setupMoistureGraph();
    }, 200);
  });
}

