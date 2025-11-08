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
          
          <div class="nav-item" data-route="water">
            <div class="nav-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.69L5.66 8.03C4.61 8.99 4 10.44 4 12C4 15.31 6.69 18 10 18C11.1 18 12.12 17.64 12.97 17.03L12 16.06L11.03 17.03C10.18 17.64 9.1 18 8 18C4.69 18 2 15.31 2 12C2 10.44 2.61 8.99 3.66 8.03L10 2.69L12 2.69ZM12 4.31L6.34 9.97C5.89 10.42 5.5 11.18 5.5 12C5.5 13.93 7.07 15.5 9 15.5C9.55 15.5 10.07 15.38 10.5 15.17L12 13.67L13.5 15.17C13.93 15.38 14.45 15.5 15 15.5C16.93 15.5 18.5 13.93 18.5 12C18.5 11.18 18.11 10.42 17.66 9.97L12 4.31Z" fill="currentColor"/>
              </svg>
            </div>
            <span class="nav-item-label">Water</span>
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

