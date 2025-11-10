# Aura Farming

**A Smart IoT-Based Farming System for Real-Time Soil Moisture Monitoring and Water Management**

---

## Device Concept

**Aura Farming** is an intelligent IoT-based agricultural monitoring system designed to optimize water usage and improve crop health through real-time soil moisture and rainfall monitoring. The system consists of:

### Hardware Components
- **ESP32 Microcontroller** (LilyGo T-Display compatible) - The brain of the device
- **Soil Moisture Sensor** - Measures soil moisture levels (0-100%)
- **Rain Sensor** - Detects rainfall and precipitation


### How It Works
1. **Data Collection**: ESP32 devices placed in farming zones continuously monitor soil moisture and rainfall using connected sensors
2. **Data Transmission**: Sensor readings are sent to Supabase cloud database every 30 seconds via Wi-Fi
3. **Data Analysis**: The web dashboard analyzes telemetry data to provide:
   - Real-time moisture status (dry/moist/wet)
   - Moisture trend analysis
   - Watering suggestions based on crop type and soil conditions
   - Soil health risk assessments
   - Water savings tracking
4. **Smart Management**: Users can configure multiple zones, set crop-specific thresholds, and enable automated irrigation recommendations

### Key Benefits
- **Water Conservation**: Optimize irrigation schedules to reduce water waste
- **Data-Driven Decisions**: Real-time insights help farmers make informed watering decisions
- **Crop-Specific Monitoring**: Customizable thresholds based on crop type and soil depth
- **Real-Time Alerts**: Get notified when zones need attention
- **Historical Tracking**: View moisture trends over time with interactive graphs

---

## Features

### Dashboard
- **Multi-Zone Monitoring**: View and manage multiple farming zones from a single dashboard
- **Real-Time Telemetry**: Live updates of soil moisture, rainfall, and soil health status
- **Interactive Graphs**: Visualize moisture trends over time with expandable zone graphs
- **Watering Alerts**: Smart suggestions for when and how much to water based on:
  - Current moisture levels
  - Crop type requirements
  - Soil depth
  - Historical trends
- **Water Savings Tracker**: Monitor water conservation achievements

### Zone Management
- **Create & Configure Zones**: Set up multiple farming zones with custom names
- **Crop-Specific Settings**: Configure watering parameters based on crop type
- **Automated Irrigation**: Enable/disable automated irrigation recommendations
- **Threshold Management**: Set custom moisture thresholds for optimal crop health

### Data Analysis
- **Moisture Status Analysis**: Automatic classification of soil conditions
- **Trend Analysis**: 24-hour and extended trend monitoring
- **Threshold Crossing Predictions**: Forecast when moisture levels will cross critical thresholds
- **Soil Health Risk Calculation**: Assess potential risks to crop health

---

## How to Access the Software

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- A Supabase account (for backend database)
- ESP32-compatible hardware (for sensor deployment)


### First-Time Setup
1. Create an account or sign in to the web application
2. Navigate to "User Preferences" to create your first farming zone
3. Configure zone settings (name, crop type, watering parameters)
4. Deploy ESP32 devices to your zones and ensure they're connected to Wi-Fi
5. View real-time data on the Dashboard



## Technology Stack

### Frontend
- **Vite** - Build tool and development server
- **Vanilla JavaScript** - No framework dependencies
- **Supabase JS Client** - Database and authentication

### Backend
- **Supabase** - PostgreSQL database with real-time capabilities
- **REST API** - For ESP32 device communication

### Hardware
- **ESP32** - Microcontroller with Wi-Fi
- **Arduino IDE** - Firmware development
- **Sensors**: Soil moisture sensor, Rain sensor


### Presentation Materials
- **PowerPoint/PDF**: 
- **Demo Video**: 



## Justifications of Code/Hardware Choices

### Rainfall Detector in Combination with Soil Moisture Detectors

We are using rainfall detectors alongside soil moisture sensors because in the field, it may take a while for the water to reach deeper layers of soil, while rainfall detectors instantly detect water. This dual-sensor approach provides:

- **Immediate Detection**: Rain sensors detect precipitation instantly, allowing the system to account for natural watering before soil moisture levels change
- **Accurate Watering Decisions**: By combining both sensors, we can avoid unnecessary irrigation when rain has already occurred
- **Soil Penetration Time**: Soil moisture sensors may take minutes or hours to reflect surface rainfall, especially in deeper soil layers, making rain sensors essential for real-time decision-making

### ESP32 Microcontroller Choice

The ESP32 was chosen over alternatives (Arduino Uno, Raspberry Pi, etc.) for several critical reasons:

- **Built-in Wi-Fi**: ESP32 has integrated Wi-Fi connectivity, eliminating the need for additional Wi-Fi shields or modules, reducing cost and complexity
- **Dual-Core Processing**: The dual-core architecture allows efficient handling of sensor readings and network communication simultaneously
- **Low Power Consumption**: ESP32's power management features are essential for battery-powered field deployments
- **ADC Capabilities**: Built-in 12-bit ADC (Analog-to-Digital Converter) with multiple channels (GPIO 36, 34) perfectly matches our sensor requirements
- **Cost-Effective**: Significantly cheaper than Raspberry Pi while providing all necessary IoT capabilities
- **Arduino Compatibility**: Works with Arduino IDE and libraries, making development faster and more accessible
- **LilyGo T-Display Support**: Compatible with display modules for potential future UI enhancements

### Supabase Backend Choice

Supabase gives you production-grade auth on top of Postgres with Row-Level Security (RLS), handy SDKs, and a generous free tier—so you ship secure sign-up/login fast without reinventing sessions, tokens, or password flows.

**Authentication & User Management**: Supabase handles authentication and user management. The app initializes a Supabase client with your project URL and anon key in `config.js`. The login page (`login.js`) uses `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` to create accounts and authenticate users. On successful login, Supabase creates a session stored in browser localStorage, so users stay logged in across sessions. The router in `main.js` checks authentication via `checkAuth()` from `auth.js` before showing the dashboard; if not authenticated, it redirects to the login page. The dashboard (`App.js`) calls `protectRoute()` on load to verify authentication again. User data is stored in Supabase's `auth.users` table, with a `profiles` table linked via Row Level Security (RLS) so users only access their own data. The connection between login and dashboard is handled by the router checking the session and redirecting accordingly—login redirects to `/dashboard` on success, and the dashboard redirects to `/` if the user isn't authenticated.

**Additional Benefits**:
- **PostgreSQL Database**: Full-featured relational database with JSON support
- **Row-Level Security (RLS)**: Database-level security ensures users can only access their own zones and telemetry data
- **Real-time Capabilities**: Built-in real-time subscriptions for live data updates
- **REST API**: Automatic REST API generation from database schema
- **Free Tier**: Generous free tier perfect for hackathon and prototype development
- **SDK Support**: Well-maintained JavaScript SDK for frontend integration

### Database Schema Design Choices

**Thresholds Table with `crop_name` as Primary Key**: Using `crop_name` as the primary key (instead of a surrogate UUID) provides:
- **Natural Key**: Crop names are meaningful identifiers that don't require lookups
- **Simpler Queries**: Direct joins without additional foreign key relationships
- **Case-Insensitive Lookup**: Index on `lower(crop_name)` ensures consistent matching regardless of input case
- **Data Integrity**: Unique constraint prevents duplicate crop definitions

**Zones and Telemetry Separation**: Separating zone configuration from telemetry readings provides:
- **Normalization**: Avoids data duplication and maintains referential integrity
- **Efficient Queries**: Indexed `zone_id` and `ts` columns enable fast time-series queries
- **Scalability**: Can handle millions of telemetry records per zone without affecting zone configuration queries

**Row-Level Security (RLS) Policies**: Database-level security ensures:
- **Data Isolation**: Users can only read/write their own zones and telemetry data
- **Security at Source**: Security enforced at database level, not just application level
- **Automatic Enforcement**: Works regardless of how data is accessed (REST API, direct SQL, etc.)

### 30-Second Sensor Reading Interval

The 30-second interval (`SENSOR_READ_INTERVAL = 30UL * 1000UL`) was chosen to balance:

- **Data Freshness**: Provides near-real-time monitoring without excessive delay
- **Battery Life**: Longer intervals would save power but reduce responsiveness
- **Network Usage**: Prevents overwhelming the network or database with excessive requests
- **Soil Moisture Dynamics**: Soil moisture changes slowly, so 30 seconds captures meaningful changes without redundancy
- **Cost Efficiency**: Reduces Supabase API calls while maintaining adequate monitoring granularity

### ADC Averaging (5 Samples)

The `readAveragedADC()` function takes 5 samples with 40ms delays between readings:

- **Noise Reduction**: Analog sensors are susceptible to electrical noise; averaging multiple samples filters out transient spikes
- **Accuracy Improvement**: Reduces measurement variance and provides more stable readings
- **Minimal Overhead**: 5 samples with 40ms delays = 200ms total, which is negligible compared to the 30-second interval
- **Industry Standard**: Multi-sample averaging is a common practice in embedded sensor applications

### Vanilla JavaScript (No Framework)

Using vanilla JavaScript instead of React, Vue, or Angular provides:

- **Zero Framework Overhead**: No virtual DOM, no framework runtime, resulting in faster initial load times
- **Smaller Bundle Size**: Minimal dependencies reduce the final bundle size significantly
- **Simpler Deployment**: No complex build configurations or framework-specific deployment requirements
- **Direct DOM Control**: Full control over DOM manipulation without framework abstractions
- **Faster Development**: For a hackathon project, vanilla JS allows rapid iteration without learning curve
- **Performance**: Direct DOM updates can be faster than framework reconciliation for simple UIs

### Vite Build Tool

Vite was chosen over Webpack, Parcel, or other bundlers because:

- **Lightning-Fast HMR**: Near-instant Hot Module Replacement during development
- **Native ES Modules**: Uses native ES modules in development, eliminating bundling overhead
- **Minimal Configuration**: Works out-of-the-box with minimal setup
- **Modern Tooling**: Built for modern JavaScript with native ESM support
- **Fast Builds**: Uses esbuild for production builds, resulting in faster build times
- **Development Server**: Built-in dev server with automatic reloading

### Canvas API for Graphs

Using native Canvas API instead of Chart.js or other charting libraries:

- **Zero Dependencies**: No external library needed, reducing bundle size and avoiding version conflicts
- **Full Control**: Complete control over rendering, styling, and interactions without library constraints
- **Performance**: Direct canvas rendering is highly performant for real-time data visualization
- **Customization**: Easy to implement custom features like threshold lines, zone-specific styling, and dynamic scaling
- **Lightweight**: Native browser API with no additional dependencies or framework overhead

### ArduinoJson Library

Using ArduinoJson for JSON serialization on ESP32:

- **Memory Efficient**: Designed specifically for embedded systems with limited RAM
- **Small Footprint**: Minimal memory usage compared to full JSON libraries
- **ESP32 Optimized**: Works seamlessly with ESP32's memory constraints
- **Easy Integration**: Simple API for creating and parsing JSON payloads
- **Reliability**: Well-tested library widely used in IoT projects

### WiFiClientSecure with setInsecure()

The code uses `WiFiClientSecure` with `setInsecure()` for HTTPS connections:

- **Demo/Prototype Purpose**: For hackathon/prototype, certificate validation is disabled for simplicity
- **Production Note**: In production, this should be replaced with proper certificate pinning or validation
- **Supabase Compatibility**: Supabase REST API requires HTTPS, so secure client is necessary
- **Future Improvement**: Production version should implement proper SSL certificate validation

### Database Indexes

Strategic indexes on `telemetry` table:

- **`telemetry_zone_ts_idx`**: Composite index on `(zone_id, ts)` enables fast queries for zone-specific time-series data
- **`telemetry_ts_idx`**: Index on `ts` (timestamp) enables efficient time-range queries across all zones
- **Query Performance**: These indexes are essential for dashboard graphs and trend analysis, which frequently query historical data

## Additional Information

### Database Schema
The system uses the following main tables:
- **zones**: Farming zone configurations
- **telemetry**: Sensor readings (moisture, rain, timestamps)
- **profiles**: User profile information
- **thresholds**: Crop-specific moisture thresholds

### API Endpoints
- All database operations are handled through Supabase REST API
- ESP32 devices POST telemetry data to: `{SUPABASE_URL}/rest/v1/telemetry`
- Frontend uses Supabase JS client for all database operations

### Security Notes
- The ESP32 code uses Supabase anon key for demo purposes
- For production, implement Supabase Edge Functions with service role key
- Ensure Wi-Fi credentials are secured and not committed to version control
- Use environment variables for sensitive configuration
- Row-Level Security (RLS) policies ensure users can only access their own data

### Future Enhancements
- Mobile app for iOS and Android
- Machine learning for predictive irrigation
- Integration with weather APIs
- Multi-user support with role-based access
- Automated irrigation valve control
- SMS/Email notifications


