import { createNavigationRail, setupNavigationRail } from './navigationRail.js'
import { createReviewsComponent } from './reviews.js'
import { createCropManagementComponent } from './cropManagement.js'
import { createUserPreferencesComponent } from './userPreferences.js'
import { createLoadingScreen } from './loading.js'
import { setupStatsCarousel } from './carousel.js'
import { setupDashboard } from './dashboard.js'

let currentPage = 'dashboard';

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

  // Show loading screen
  contentArea.innerHTML = createLoadingScreen();
  
  // Simulate loading delay
  setTimeout(() => {
    currentPage = page;

    if (page === 'dashboard') {
      contentArea.innerHTML = createReviewsComponent();
      setTimeout(() => {
        setupDashboard();
      }, 50);
    } else if (page === 'user-preferences') {
      contentArea.innerHTML = createUserPreferencesComponent();
      setTimeout(() => setupUserPreferences(), 50);
    } else if (page === 'crop-management') {
      contentArea.innerHTML = createCropManagementComponent();
    }
  }, 200); // 200ms loading delay for faster navigation
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
          console.log('Logging out...');
          // Add logout logic here
          // window.location.href = '/login';
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
}

export function setupUserPreferences() {
  // Zone button selection
  const zoneButtons = document.querySelectorAll('.zone-button');
  zoneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      zoneButtons.forEach(b => {
        b.classList.remove('zone-button-active');
        b.classList.add('zone-button-inactive');
      });
      btn.classList.remove('zone-button-inactive');
      btn.classList.add('zone-button-active');
    });
  });

  // Add zone button
  const addZoneBtn = document.getElementById('add-zone-btn');
  const zoneConfigForm = document.getElementById('zone-config-form');
  
  if (addZoneBtn && zoneConfigForm) {
    addZoneBtn.addEventListener('click', () => {
      zoneConfigForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Form actions
  const saveBtn = document.getElementById('save-zone-btn');
  const cancelBtn = document.getElementById('cancel-zone-btn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      alert('Zone saved successfully!');
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const form = document.getElementById('zone-config-form');
      if (form) {
        form.querySelectorAll('input').forEach(input => {
          if (input.type === 'checkbox') {
            input.checked = false;
          } else {
            input.value = '';
          }
        });
      }
    });
  }
}

