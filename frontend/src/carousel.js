export function setupStatsCarousel() {
  const carousel = document.getElementById('crop-management-carousel');
  const cropCard = document.querySelector('.crop-management-hero-card');
  
  if (!carousel || !cropCard) return;

  const leftArrow = cropCard.querySelector('.crop-carousel-arrow-left');
  const rightArrow = cropCard.querySelector('.crop-carousel-arrow-right');
  
  if (!leftArrow || !rightArrow) return;

  let currentIndex = 0;
  const cards = carousel.querySelectorAll('.zone-card');
  const totalCards = cards.length;
  const cardsPerView = 2; // Show 2 cards at a time inside the crop management card
  // With 8 cards showing 2 at a time: positions 0-6 (7 positions)
  // Position 6 shows cards 7-8 (Zone 3 & Zone 4)
  // maxIndex = 8 - 2 = 6, so we can show positions 0,1,2,3,4,5,6
  const maxIndex = totalCards > cardsPerView ? totalCards - cardsPerView : 0;

  function updateCarousel() {
    // Wait for cards to be rendered
    if (cards.length === 0) {
      console.warn('No cards found in carousel');
      return;
    }
    
    // Get wrapper width (the visible area)
    const wrapper = carousel.parentElement;
    if (!wrapper) {
      console.warn('Carousel wrapper not found');
      return;
    }
    
    const wrapperWidth = wrapper.offsetWidth;
    if (wrapperWidth === 0) {
      // Retry after a short delay if wrapper isn't ready
      setTimeout(updateCarousel, 50);
      return;
    }
    
    // Get actual rendered card width from the first card
    const firstCard = cards[0];
    const cardWidth = firstCard.offsetWidth;
    const carouselStyle = window.getComputedStyle(carousel);
    const gapValue = carouselStyle.gap || '16px';
    const gap = parseInt(gapValue) || 16;
    
    // Calculate translation: move by one card width + gap for each step
    // This ensures we move exactly one card position
    const translateX = -currentIndex * (cardWidth + gap);
    carousel.style.transform = `translateX(${translateX}px)`;
    carousel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    console.log(`Carousel update: index=${currentIndex}, translateX=${translateX}px, cardWidth=${cardWidth}px, gap=${gap}px`);
  }
  
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(updateCarousel, 100);
    });
  } else {
    setTimeout(updateCarousel, 100);
  }

  function next() {
    if (currentIndex >= maxIndex) {
      currentIndex = 0; // Loop back to start after Zone 4
    } else {
      currentIndex++;
    }
    updateCarousel();
  }

  function prev() {
    if (currentIndex <= 0) {
      currentIndex = maxIndex; // Loop to end (shows Zone 3 & 4)
    } else {
      currentIndex--;
    }
    updateCarousel();
  }
  
  // Recalculate on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel();
    }, 100);
  });

  rightArrow.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent card click
    next();
  });
  
  leftArrow.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent card click
    prev();
  });

  // Touch/swipe support
  let startX = 0;
  let isDragging = false;

  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
    e.stopPropagation();
  });

  carousel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
  });

  carousel.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    e.stopPropagation();
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        next();
      } else {
        prev();
      }
    }
  });

  // Initial update
  updateCarousel();
}

