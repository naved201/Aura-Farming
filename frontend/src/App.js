import { createNavigationRail, setupNavigationRail } from './navigationRail.js'
import { createReviewsComponent } from './reviews.js'
import { protectRoute, logout, getCurrentUser } from './auth.js'

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

  currentPage = page;

  if (page === 'dashboard') {
    contentArea.innerHTML = createReviewsComponent();
  } else if (page === 'water') {
    contentArea.innerHTML = `
      <div class="water-page">
        <h1>Water Page</h1>
        <p>Water management content goes here</p>
      </div>
    `;
  }
}

export async function setupApp() {
  // Protect the route - check if user is authenticated
  const isAuthenticated = await protectRoute();
  if (!isAuthenticated) {
    return; // User will be redirected to login
  }

  // Get current user info (optional - for displaying user data)
  try {
    const user = await getCurrentUser();
    console.log('Logged in as:', user?.email);
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
      } else if (route === 'water') {
        navigateTo('water');
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
}

