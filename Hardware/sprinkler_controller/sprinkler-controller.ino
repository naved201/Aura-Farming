/*
 * Aura Farming — Sprinkler Decision Logic (ESP32-safe)
 * Computes if each zone's sprinkler should be ON or OFF
 * based on thresholds and telemetry.
 */

 #include <WiFi.h>
 #include <WiFiClientSecure.h>
 #include <HTTPClient.h>
 #include <ArduinoJson.h>
 
 /*** WIFI ***/
 const char* WIFI_SSID = "iPhone";
 const char* WIFI_PASS = "#88Trs0oyad";
 
 /*** SUPABASE ***/
 const char* SUPABASE_REST = "https://nuxiembmbwigfamnyplw.supabase.co/rest/v1";
 const char* SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";
 
 /*** Polling intervals ***/
 const unsigned long WIFI_CHECK_MS        = 30UL * 1000UL;
 const unsigned long THRESHOLD_REFRESH_MS = 5UL * 60UL * 1000UL;
 const unsigned long TELEMETRY_POLL_MS   = 15UL * 1000UL;
 
 /*** Zone structure ***/
 struct Zone {
   String id;
   String cropType;
   bool autoIrrigationEnabled;
   bool isSolutionOn;
 
   // thresholds
   bool thresholdsValid;
   float minMoisture;
   float avgMoisture;
   float moderateRisk;
   float highRisk;
   float maxMoisture;
 
   // runtime
   bool sprinklerOn;
 };
 Zone zones[6];  // Up to 6 zones
 int numZones = 0;
 
 /*** State timers ***/
 unsigned long lastWiFiMs = 0;
 unsigned long lastThresholdMs = 0;
 unsigned long lastTelemetryMs = 0;
 
 /*** WIFI helpers ***/
 void wifiConnect(){
   Serial.printf("Wi-Fi → %s\n", WIFI_SSID);
   WiFi.persistent(false);
   WiFi.mode(WIFI_STA);
   WiFi.disconnect(true, true);
   delay(150);
   WiFi.begin(WIFI_SSID, WIFI_PASS);
 
   unsigned long t0 = millis();
   while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000){
     delay(250);
     Serial.print(".");
   }
   Serial.println();
 
   if (WiFi.status() == WL_CONNECTED){
     Serial.printf("✅ IP=%s  RSSI=%d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
   } else {
     Serial.println("❌ Wi-Fi failed (will retry)");
   }
 }
 
 bool wifiShouldReconnect(){
   wl_status_t s = WiFi.status();
   return (s == WL_DISCONNECTED || s == WL_IDLE_STATUS || s == WL_NO_SSID_AVAIL ||
           s == WL_CONNECTION_LOST || s == WL_CONNECT_FAILED);
 }
 
 /*** HTTP GET ***/
 bool httpGet(const String& url, String& body){
   if (WiFi.status() != WL_CONNECTED) return false;
 
   WiFiClientSecure tls;
   tls.setInsecure();
 
   HTTPClient http;
   if (!http.begin(tls, url)) return false;
 
   http.addHeader("apikey", SUPABASE_ANON);
   http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);
 
   int code = http.GET();
   body = http.getString();
   http.end();
 
   return code == 200;
 }
 
 /*** Load zones ***/
 bool loadZones() {
   String body;
   String url = String(SUPABASE_REST) + "/zones?select=id,crop_type,auto_irrigation_enabled,is_solution_on";
   if (!httpGet(url, body)) return false;
 
   DynamicJsonDocument doc(1024);
   if (deserializeJson(doc, body)) return false;
   if (!doc.is<JsonArray>() || doc.size() == 0) return false;
 
   numZones = min((int)doc.size(), 6);
   for(int i=0; i<numZones; i++){
     JsonObject row = doc[i];
     zones[i].id = row["id"].as<String>();
     zones[i].cropType = row["crop_type"].as<String>();
     zones[i].autoIrrigationEnabled = row.containsKey("auto_irrigation_enabled") ? row["auto_irrigation_enabled"].as<bool>() : false;
     zones[i].isSolutionOn = row.containsKey("is_solution_on") ? row["is_solution_on"].as<bool>() : false;
     zones[i].thresholdsValid = false;
     zones[i].sprinklerOn = false;
 
     Serial.printf("Zone loaded: %s | crop: %s | auto=%d | manual=%d\n",
                   zones[i].id.c_str(), zones[i].cropType.c_str(),
                   (int)zones[i].autoIrrigationEnabled,
                   (int)zones[i].isSolutionOn);
   }
   return true;
 }
 
 /*** Fetch thresholds ***/
 bool refreshThresholds(Zone &z){
   String body;
   String url = String(SUPABASE_REST) + "/thresholds?crop_name=eq." + z.cropType +
                "&select=min_moisture,avg_moisture,moderate_risk,high_risk,max_moisture&limit=1";
   if (!httpGet(url, body)) return false;
 
   DynamicJsonDocument doc(512);
   if (deserializeJson(doc, body)) return false;
   if (!doc.is<JsonArray>() || doc.size() == 0) return false;
 
   JsonObject row = doc[0];
   z.minMoisture = row["min_moisture"].as<float>();
   z.avgMoisture = row["avg_moisture"].as<float>();
   z.moderateRisk = row.containsKey("moderate_risk") ? row["moderate_risk"].as<float>() : z.avgMoisture;
   z.highRisk = row.containsKey("high_risk") ? row["high_risk"].as<float>() : z.avgMoisture + 10.0f;
   z.maxMoisture = row.containsKey("max_moisture") ? row["max_moisture"].as<float>() : z.avgMoisture + 20.0f;
   z.thresholdsValid = true;
 
   Serial.printf("Thresholds for %s: min=%.1f avg=%.1f mod=%.1f high=%.1f max=%.1f\n",
                 z.id.c_str(), z.minMoisture, z.avgMoisture, z.moderateRisk, z.highRisk, z.maxMoisture);
   return true;
 }
 
 /*** Fetch latest telemetry ***/
 bool fetchLatestTelemetry(Zone &z, float &moistureOut, bool &rainOut, String &statusOut){
   String body;
   String url = String(SUPABASE_REST) + "/telemetry?zone_id=eq." + z.id +
                "&select=moisture,rain,status,ts&order=ts.desc.nullslast&limit=1";
   if (!httpGet(url, body)) return false;
 
   DynamicJsonDocument doc(512);
   if (deserializeJson(doc, body)) return false;
   if (!doc.is<JsonArray>() || doc.size() == 0) return false;
 
   JsonObject row = doc[0];
   moistureOut = row["moisture"].as<float>();
   rainOut = row.containsKey("rain") ? row["rain"].as<bool>() : false;
   statusOut = row.containsKey("status") ? String(row["status"].as<const char*>()) : "";
   return true;
 }
 
 /*** Decision logic ***/
 void decideSprinkler(Zone &z){
   if (!z.thresholdsValid) return;
 
   float moisture;
   bool rain;
   String status;
   if (!fetchLatestTelemetry(z, moisture, rain, status)) return;
 
   bool shouldTurnOn = false;
   String reason = "";
 
   if (!z.autoIrrigationEnabled){
     shouldTurnOn = z.isSolutionOn;
     reason = "Manual override";
   } else if (rain){
     shouldTurnOn = false;
     reason = "Rain detected";
   } else if (moisture <= z.minMoisture){
     shouldTurnOn = true;
     reason = "Moisture below min threshold";
   } else if (moisture >= z.avgMoisture){
     shouldTurnOn = false;
     reason = "Moisture above avg threshold";
   } else {
     shouldTurnOn = z.sprinklerOn;
     reason = "Moisture within thresholds, no change";
   }
 
   z.sprinklerOn = shouldTurnOn;
 
   // Formatted output
   Serial.println(F("========================================"));
   Serial.printf("Zone ID       : %s\n", z.id.c_str());
   Serial.printf("Crop Type     : %s\n", z.cropType.c_str());
   Serial.printf("Moisture      : %.1f (min=%.1f, avg=%.1f, max=%.1f)\n",
                 moisture, z.minMoisture, z.avgMoisture, z.maxMoisture);
   Serial.printf("Rain          : %s\n", rain ? "YES" : "NO");
   Serial.printf("Sprinkler     : %s\n", shouldTurnOn ? "ON" : "OFF");
   Serial.printf("Reason        : %s\n", reason.c_str());
   Serial.println(F("========================================\n"));
 }
 
 /*** Setup / Loop ***/
 void setup(){
   Serial.begin(115200);
   delay(500);
 
   wifiConnect();
 
   if (loadZones()){
     for(int i=0;i<numZones;i++){
       refreshThresholds(zones[i]);
     }
   }
 
   lastWiFiMs = millis() - WIFI_CHECK_MS;
   lastThresholdMs = millis() - THRESHOLD_REFRESH_MS;
   lastTelemetryMs = millis() - TELEMETRY_POLL_MS;
 }
 
 void loop(){
   if (millis() - lastWiFiMs >= WIFI_CHECK_MS){
     if (wifiShouldReconnect()) wifiConnect();
     lastWiFiMs = millis();
   }
 
   if (millis() - lastThresholdMs >= THRESHOLD_REFRESH_MS){
     for(int i=0;i<numZones;i++) refreshThresholds(zones[i]);
     lastThresholdMs = millis();
   }
 
   if (millis() - lastTelemetryMs >= TELEMETRY_POLL_MS){
     for(int i=0;i<numZones;i++) decideSprinkler(zones[i]);
     lastTelemetryMs = millis();
   }
 
   delay(20);
 }
 