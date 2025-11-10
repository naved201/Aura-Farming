# Aura Farming 🌱

**A Smart IoT-Based Farming System for Real-Time Soil Moisture Monitoring and Water Management**

---

## 📋 Table of Contents

- [Device Concept](#device-concept)
- [Features](#features)
- [How to Access the Software](#how-to-access-the-software)
- [Hardware Setup](#hardware-setup)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Links & Resources](#links--resources)
- [Credits](#credits)

---

## 🎯 Device Concept

**Aura Farming** is an intelligent IoT-based agricultural monitoring system designed to optimize water usage and improve crop health through real-time soil moisture and rainfall monitoring. The system consists of:

### Hardware Components
- **ESP32 Microcontroller** (LilyGo T-Display compatible) - The brain of the device
- **Soil Moisture Sensor** - Measures soil moisture levels (0-100%)
- **Rain Sensor** - Detects rainfall and precipitation
- **Wi-Fi Connectivity** - Transmits data to the cloud in real-time

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
- 💧 **Water Conservation**: Optimize irrigation schedules to reduce water waste
- 📊 **Data-Driven Decisions**: Real-time insights help farmers make informed watering decisions
- 🌾 **Crop-Specific Monitoring**: Customizable thresholds based on crop type and soil depth
- ⚡ **Real-Time Alerts**: Get notified when zones need attention
- 📈 **Historical Tracking**: View moisture trends over time with interactive graphs

---

## ✨ Features

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

## 🚀 How to Access the Software

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- A Supabase account (for backend database)
- ESP32-compatible hardware (for sensor deployment)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Aura-Farming
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure Supabase**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Update `frontend/src/config.js` with your Supabase URL and anon key
   - Set up the required database tables (zones, telemetry, profiles, etc.)

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

5. **Build for Production**
   ```bash
   npm run build
   npm run preview
   ```

### Hardware Setup

1. **Configure ESP32 Device**
   - Open `Hardware/aura_farming_esp32/aura_farming_esp32.ino` in Arduino IDE
   - Install required libraries:
     - WiFi
     - WiFiClientSecure
     - HTTPClient
     - ArduinoJson
   - Update Wi-Fi credentials in the code:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```
   - Update Supabase configuration:
     ```cpp
     const char* supabaseUrl = "YOUR_SUPABASE_URL";
     const char* supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
     const char* DEFAULT_ZONE_ID = "YOUR_ZONE_UUID";
     ```
   - Connect sensors:
     - Soil sensor → GPIO 36 (VP, ADC)
     - Rain sensor → GPIO 34 (ADC)
   - Upload the sketch to your ESP32

2. **Calibrate Sensors**
   - Adjust `ADC_DRY` and `ADC_WET` values based on your sensor readings
   - Test in dry and wet conditions to ensure accurate measurements

### Accessing the Web Application

- **Local Development**: `http://localhost:5173`
- **Production**: Deploy the built files to your preferred hosting service (Vercel, Netlify, etc.)

### First-Time Setup
1. Create an account or sign in to the web application
2. Navigate to "User Preferences" to create your first farming zone
3. Configure zone settings (name, crop type, watering parameters)
4. Deploy ESP32 devices to your zones and ensure they're connected to Wi-Fi
5. View real-time data on the Dashboard

---

## 📁 Project Structure

```
Aura-Farming/
├── frontend/                 # Web application frontend
│   ├── src/
│   │   ├── App.js           # Main application component
│   │   ├── dashboard.js     # Dashboard functionality
│   │   ├── auth.js          # Authentication logic
│   │   ├── config.js        # Supabase configuration
│   │   ├── moistureAnalysis.js  # Moisture analysis algorithms
│   │   ├── userPreferences.js   # Zone management
│   │   ├── cropManagement.js    # Crop management features
│   │   ├── waterSaved.js        # Water savings tracking
│   │   └── ...              # Other components
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── Hardware/
│   └── aura_farming_esp32/
│       └── aura_farming_esp32.ino  # ESP32 firmware
└── README.md
```

---

## 🛠 Technology Stack

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

---

## 🔗 Links & Resources

### Try Out the Software
- **Live Demo**: [Add your deployed URL here]
- **Development Server**: `http://localhost:5173` (after running `npm run dev`)

### Documentation
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **ESP32 Documentation**: [https://docs.espressif.com/projects/esp-idf/en/latest/esp32/](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- **Arduino Reference**: [https://www.arduino.cc/reference/en/](https://www.arduino.cc/reference/en/)

### Presentation Materials
- **PowerPoint/PDF**: [Add link to your presentation if available]
- **Demo Video**: [Add link to demo video if available]

### Additional Resources
- **GitHub Repository**: [Add your repository URL]
- **Issue Tracker**: [Add link if using GitHub Issues]
- **Wiki/Documentation**: [Add link if available]

---

## 👥 Credits

### Development Team
- **Project**: Aura Farming
- **Event**: NatHacks 2025
- **Developers**: [Add team member names]

### Technologies & Libraries
- **Supabase** - Backend-as-a-Service platform
- **Vite** - Next-generation frontend tooling
- **ArduinoJson** - JSON library for Arduino
- **ESP32** - Espressif Systems microcontroller

### Acknowledgments
- Special thanks to the NatHacks 2025 organizers
- Inspired by the need for sustainable agriculture and water conservation

---

## 📝 Additional Information

### Database Schema
The system uses the following main tables:
- **zones**: Farming zone configurations
- **telemetry**: Sensor readings (moisture, rain, timestamps)
- **profiles**: User profile information
- **crops**: Crop type definitions and requirements

### API Endpoints
- All database operations are handled through Supabase REST API
- ESP32 devices POST telemetry data to: `{SUPABASE_URL}/rest/v1/telemetry`
- Frontend uses Supabase JS client for all database operations

### Security Notes
- ⚠️ **Important**: The ESP32 code uses Supabase anon key for demo purposes
- For production, implement Supabase Edge Functions with service role key
- Ensure Wi-Fi credentials are secured and not committed to version control
- Use environment variables for sensitive configuration

### Future Enhancements
- Mobile app for iOS and Android
- Machine learning for predictive irrigation
- Integration with weather APIs
- Multi-user support with role-based access
- Automated irrigation valve control
- SMS/Email notifications

---

## 📄 License

[Add your license information here]

---

## 🤝 Contributing

[Add contribution guidelines if applicable]

---

**Built with ❤️ for sustainable farming and water conservation**

For questions or support, please open an issue in the repository or contact the development team.
