import './style.css'
import './navigationRail.css'
import './reviews.css'
import './App.css'
import { createApp, setupApp } from './App.js'
import { createLoginPage, setupLoginPage } from './login.js'
import { checkAuth } from './auth.js'

// Simple router
async function router() {
  const appElement = document.querySelector('#app');
  if (!appElement) {
    console.error('App element not found');
    return;
  }

  // Check if Supabase is loaded
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase not loaded. Waiting...');
    setTimeout(router, 100);
    return;
  }

  // Get current path
  const path = window.location.pathname;

  try {
    // Check authentication
    const { isAuthenticated } = await checkAuth();

    if (path === '/dashboard' || path === '/dashboard/') {
      // Dashboard route - requires authentication
      if (isAuthenticated) {
        appElement.innerHTML = createApp();
        setupApp().catch(err => {
          console.error('Error setting up app:', err);
        });
      } else {
        // Not authenticated, redirect to login
        window.location.href = '/';
      }
    } else {
      // Root/login route
      if (isAuthenticated) {
        // Already logged in, redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        // Show login page
        appElement.innerHTML = createLoginPage();
        setupLoginPage();
      }
    }
  } catch (err) {
    console.error('Error in router:', err);
    // On error, show login page
    appElement.innerHTML = createLoginPage();
    setupLoginPage();
  }
}

// Handle browser back/forward
window.addEventListener('popstate', router);

// Start routing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', router);
} else {
  router();
}
