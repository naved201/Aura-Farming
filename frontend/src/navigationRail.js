// Image asset from Figma
const imgIcon = "https://www.figma.com/api/mcp/asset/1fba7600-e9b7-4f3c-b2cf-64e48ef3f8ac";

export function createNavigationRail() {
  return `
    <div class="navigation-rail-standalone" data-name="Navigation Rail" data-node-id="14:2082">
      <!-- Navigation Items -->
      <div class="nav-items-container">
        <div class="nav-items-top">
          <div class="nav-item" data-route="dashboard">
            <div class="nav-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
              </svg>
            </div>
            <span class="nav-item-label">Home</span>
          </div>
          
          <div class="nav-item" data-route="user-preferences">
            <div class="nav-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <span class="nav-item-label">User Preferences</span>
          </div>
        </div>
        
        <div class="nav-item nav-item-logout" data-route="logout">
          <div class="nav-item-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
            </svg>
          </div>
          <span class="nav-item-label">Logout</span>
        </div>
      </div>
    </div>
  `;
}

// Navigation is now handled in app.js
export function setupNavigationRail() {
  // This function is kept for compatibility but navigation is handled in app.js
}

