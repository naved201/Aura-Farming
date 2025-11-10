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


