import './style.css'
import './navigationRail.css'
import './reviews.css'
import './userPreferences.css'
import './app.css'
import { createApp, setupApp } from './App.js'

// Initialize app
function initApp() {
  const appElement = document.querySelector('#app');
  if (!appElement) {
    console.error('App element not found');
    return;
  }

  try {
    // Load the app directly
    appElement.innerHTML = createApp();
    setupApp().catch(err => {
      console.error('Error setting up app:', err);
    });
  } catch (err) {
    console.error('Error initializing app:', err);
    appElement.innerHTML = '<div style="padding: 20px; color: red;">Error loading application. Please refresh the page.</div>';
  }
}

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
