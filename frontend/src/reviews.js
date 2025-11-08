// Image assets from Figma
const imgImageAlbumArt = "https://www.figma.com/api/mcp/asset/fe69c311-f4c9-47c2-aff6-ad44dc9877db";

export function createReviewsComponent() {
  return `
    <div class="reviews-container" data-name="Examples/Reviews-Web" data-node-id="14:2081">
      <div class="reviews-overflow-clip">
        <!-- Main Content -->
        <div class="content-area" data-name="Content" data-node-id="14:2102">
          <!-- App Bar 1 -->
          <div class="app-bar app-bar-1" data-name="App bar" data-node-id="14:2634">
            <div class="app-bar-trailing" data-name="Trailing elements" data-node-id="I14:2634;58114:20568"></div>
            <div class="app-bar-text-content" data-name="Text content" data-node-id="I14:2634;58114:22390">
              <p class="app-bar-title">Aura-Farming</p>
            </div>
          </div>

          <!-- App Bar 2 -->
          <div class="app-bar app-bar-2" data-name="App bar" data-node-id="14:2103">
            <div class="app-bar-leading" data-name="Leading icon" data-node-id="I14:2103;58114:20586">
              <div class="app-bar-leading-content" data-name="Content" data-node-id="I14:2103;58114:20586;58665:37347"></div>
            </div>
            <div class="app-bar-trailing-2" data-name="Trailing elements" data-node-id="I14:2103;58114:20588"></div>
          </div>

          <!-- Hero Images -->
          <div class="hero-images" data-name="Hero Image" data-node-id="14:2104">
            <!-- Hero Card 1 -->
            <div class="hero-card" data-name="Content" data-node-id="14:2105">
              <div class="hero-image-bg" data-name="Image (Album art)" data-node-id="14:2113">
                <div class="hero-image-placeholder"></div>
                <img alt="" class="hero-image" src="${imgImageAlbumArt}" />
              </div>
              <div class="hero-header" data-name="Header" data-node-id="14:2106">
                <div class="hero-title-subtitle" data-name="Title & subtitle" data-node-id="14:2107">
                  <div class="hero-title-wrapper" data-node-id="14:2108">
                    <p class="hero-title">Title</p>
                  </div>
                  <p class="hero-subtitle" data-node-id="14:2109">Subtitle</p>
                </div>
              </div>
            </div>

            <!-- Hero Card 2 -->
            <div class="hero-card" data-name="Content" data-node-id="14:2345">
              <div class="hero-image-bg" data-name="Image (Album art)" data-node-id="14:2350">
                <div class="hero-image-placeholder"></div>
                <img alt="" class="hero-image" src="${imgImageAlbumArt}" />
              </div>
              <div class="hero-header" data-name="Header" data-node-id="14:2346">
                <div class="hero-title-subtitle" data-name="Title & subtitle" data-node-id="14:2347">
                  <div class="hero-title-wrapper" data-node-id="14:2348">
                    <p class="hero-title">Title</p>
                  </div>
                  <p class="hero-subtitle" data-node-id="14:2349">Subtitle</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

