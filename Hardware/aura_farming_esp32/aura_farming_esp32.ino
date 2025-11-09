/*
 * Aura Farming - ESP32 Feather v2
 * 
 * Wireless Soil Moisture & Rainfall Sensor Monitor
 * 
 * Hardware Setup:
 *   - Soil Moisture Sensor → A0
 *   - Rainfall Sensor → A2
 *   - VCC → 3V (via Power Rail)
 *   - GND → GND (via Ground Rail)
 * 
 * Features:
 *   - WiFi connectivity
 *   - Sends data to Supabase wirelessly
 *   - Real-time updates to dashboard
 *   - Standalone operation (no laptop needed)
 * 
 * Required Libraries:
 *   - WiFi (built-in)
 *   - HTTPClient (built-in)
 *   - ArduinoJson (install from Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION ====================

// WiFi Credentials - UPDATE THESE!
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase Configuration
const char* supabaseUrl = "https://buqsqvmyyjrpzfrrnnti.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cXNxdm15eWpycHpmcnJubnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTY4MzcsImV4cCI6MjA3ODEzMjgzN30.H7mjJxkj-T-h6kusXvt80NI6BlazsjGti2rDWJ8V06Y";
const char* supabaseRestUrl = "https://buqsqvmyyjrpzfrrnnti.supabase.co/rest/v1";

// Pin Definitions
const int SOIL_SENSOR_PIN = A0;      // Soil moisture sensor
const int RAINFALL_SENSOR_PIN = A2;  // Rainfall sensor

// Sensor Configuration
const int NUM_READINGS = 5;           // Number of samples to average
const int READING_DELAY = 50;         // Delay between readings (ms)
const int DRY_VALUE = 4095;            // Calibration: dry ADC value
const int WET_VALUE = 1500;            // Calibration: wet ADC value

// Timing
const unsigned long SENSOR_READ_INTERVAL = 30000;  // Send data every 30 seconds (to avoid overwhelming Supabase)

// ==================== VARIABLES ====================

// User ID - SET THIS! (Get from dashboard browser console)
String userId = ""; // Will be set via serial command or hardcode here

unsigned long lastSensorRead = 0;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 60000;  // Check WiFi every 60 seconds

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial port to initialize
  
  Serial.println("\n\n========================================");
  Serial.println("Aura Farming - ESP32 Wireless Monitor");
  Serial.println("========================================");
  Serial.println("Standalone sensor system");
  Serial.println("========================================\n");
  
  // Initialize sensor pins
  pinMode(SOIL_SENSOR_PIN, INPUT);
  pinMode(RAINFALL_SENSOR_PIN, INPUT);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Check if user ID is set
  if (userId.length() == 0) {
    Serial.println("\n⚠️  WARNING: User ID not set!");
    Serial.println("Type in Serial Monitor: SET_USER:your-user-id-here");
    Serial.println("Or update line 55 in code");
  } else {
    Serial.print("✅ User ID: ");
    Serial.println(userId);
  }
  
  Serial.println("System initialized!");
  Serial.println("Sending data wirelessly to Supabase...");
  Serial.println("========================================\n");
}

// ==================== MAIN LOOP ====================

void loop() {
  // Check WiFi connection periodically
  if (millis() - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️  WiFi disconnected. Reconnecting...");
      connectToWiFi();
    }
    lastWiFiCheck = millis();
  }
  
  // Read and send sensor data at intervals
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readAndSendSensorData();
    lastSensorRead = millis();
  }
  
  // Handle serial commands (for setup/debugging)
  handleSerialCommands();
  
  delay(100); // Small delay to prevent watchdog issues
}

// ==================== WIFI FUNCTIONS ====================

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.println("Please check your credentials and try again.");
    Serial.println("System will retry in 60 seconds...");
  }
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

// ==================== SENSOR READING FUNCTIONS ====================

int readAnalogSensor(int pin, int numSamples) {
  long sum = 0;
  for (int i = 0; i < numSamples; i++) {
    sum += analogRead(pin);
    delay(READING_DELAY);
  }
  return sum / numSamples;
}

float calculateMoisturePercent(int rawValue) {
  // Map ADC value to moisture percentage
  // Higher ADC = DRY, Lower ADC = WET
  float percent = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  return constrain(percent, 0, 100);
}

// ==================== DATA TRANSMISSION ====================

void readAndSendSensorData() {
  if (userId.length() == 0) {
    Serial.println("⚠️  User ID not set. Skipping data upload.");
    Serial.println("Type: SET_USER:your-user-id-here");
    return;
  }
  
  if (!isWiFiConnected()) {
    Serial.println("⚠️  WiFi not connected. Skipping data upload.");
    return;
  }
  
  Serial.println("\n--- Reading Sensors ---");
  
  // Read soil moisture sensor
  int soilRawValue = readAnalogSensor(SOIL_SENSOR_PIN, NUM_READINGS);
  float soilMoisturePercent = calculateMoisturePercent(soilRawValue);
  
  Serial.print("Soil (A0) - Raw ADC: ");
  Serial.print(soilRawValue);
  Serial.print(" | Moisture: ");
  Serial.print(soilMoisturePercent, 1);
  Serial.print("%");
  
  if (soilMoisturePercent < 30) {
    Serial.print(" [DRY]");
  } else if (soilMoisturePercent < 70) {
    Serial.print(" [MOIST]");
  } else {
    Serial.print(" [WET]");
  }
  Serial.println();
  
  // Read rainfall sensor
  int rainRawValue = readAnalogSensor(RAINFALL_SENSOR_PIN, NUM_READINGS);
  float rainMoisturePercent = calculateMoisturePercent(rainRawValue);
  
  Serial.print("Rain (A2) - Raw ADC: ");
  Serial.print(rainRawValue);
  Serial.print(" | Moisture: ");
  Serial.print(rainMoisturePercent, 1);
  Serial.print("%");
  
  if (rainMoisturePercent < 30) {
    Serial.print(" [DRY]");
  } else if (rainMoisturePercent < 70) {
    Serial.print(" [MOIST]");
  } else {
    Serial.print(" [WET]");
  }
  Serial.println();
  
  // Send to Supabase
  Serial.print("📤 Sending to Supabase... ");
  sendToSupabase(1, "soil_moisture", 1, soilRawValue, soilMoisturePercent);
  delay(500);
  sendToSupabase(1, "rainfall", 1, rainRawValue, rainMoisturePercent);
  
  Serial.println("✅ Data transmission complete!");
}

// ==================== SUPABASE FUNCTIONS ====================

String sendHTTPRequest(String endpoint, String method, String payload = "") {
  if (!isWiFiConnected()) {
    return "";
  }
  
  HTTPClient http;
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Prefer", "return=representation");
  
  int httpCode = 0;
  if (method == "POST") {
    httpCode = http.POST(payload);
  }
  
  String response = "";
  if (httpCode > 0) {
    response = http.getString();
    if (httpCode == 200 || httpCode == 201) {
      Serial.print("✅ ");
    } else {
      Serial.print("⚠️  HTTP ");
      Serial.print(httpCode);
      Serial.print(" ");
    }
  } else {
    Serial.print("❌ Failed ");
  }
  
  http.end();
  return response;
}

void sendToSupabase(int zoneId, const char* sensorType, int sensorId, int rawValue, float moisturePercent) {
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["zone_id"] = zoneId;
  doc["sensor_type"] = sensorType;
  doc["sensor_id"] = sensorId;
  doc["raw_value"] = rawValue;
  doc["moisture_percent"] = moisturePercent;
  doc["is_reliable"] = true;
  doc["user_id"] = userId;
  
  String payload;
  serializeJson(doc, payload);
  
  // Send to Supabase
  String endpoint = String(supabaseRestUrl) + "/sensor_readings";
  sendHTTPRequest(endpoint, "POST", payload);
}

// ==================== SERIAL COMMANDS ====================

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("SET_USER:")) {
      userId = command.substring(9);
      userId.trim();
      Serial.print("✅ User ID set to: ");
      Serial.println(userId);
    } else if (command == "STATUS") {
      printStatus();
    } else if (command == "READ") {
      readAndSendSensorData();
    } else if (command == "HELP") {
      Serial.println("\nAvailable commands:");
      Serial.println("  SET_USER:your-user-id-here  - Set your user ID");
      Serial.println("  STATUS                      - Show system status");
      Serial.println("  READ                        - Read sensors now");
      Serial.println("  HELP                        - Show this help");
    }
  }
}

void printStatus() {
  Serial.println("\n=== System Status ===");
  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "✅ Connected" : "❌ Disconnected");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  Serial.print("User ID: ");
  Serial.println(userId.length() > 0 ? userId : "❌ Not set");
  Serial.print("Update Interval: 30 seconds");
  Serial.println();
  Serial.println("===================\n");
}
