/**
 * EdgeChain IoT - Arduino Nano BLE Sense / Sense Rev2
 *
 * Collects temperature/humidity data, signs with EdDSA, broadcasts via BLE
 * Each Arduino automatically generates UNIQUE cryptographic identity from hardware serial
 *
 * Compatible with:
 * - Arduino Nano 33 BLE Sense (HTS221 sensor)
 * - Arduino Nano 33 BLE Sense Rev2 (HS300x sensor)
 */

#include <Arduino_HS300x.h>  // Temperature + Humidity sensor (Rev2)
#include <ArduinoBLE.h>      // Bluetooth LE
#include <Ed25519.h>         // EdDSA signing (lightweight)
#include <SHA256.h>          // Hash function

// ===== CONFIGURATION =====
// BLE Service UUID - SHARED across all EdgeChain devices (brand identifier)
const char* BLE_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const char* DATA_CHAR_UUID = "87654321-4321-8765-4321-fedcba987654";

// Device ID - will be generated from hardware serial number (UNIQUE per device)
char DEVICE_ID[32];

// Cryptographic keys - UNIQUE per device, derived from hardware serial
uint8_t device_secret_key[32];
uint8_t device_public_key[32];

// ===== STATE =====
unsigned long last_reading_time = 0;
const unsigned long READING_INTERVAL = 5000; // 5 seconds between readings

BLEService edgechainService(BLE_SERVICE_UUID);
BLECharacteristic dataCharacteristic(DATA_CHAR_UUID, BLERead | BLENotify, 256);

/**
 * Get Arduino's unique hardware serial number
 * This is burned into the nRF52840 chip at manufacturing - CANNOT be changed
 */
void getHardwareSerial(uint8_t* serialBytes) {
  // nRF52840 has unique 64-bit device identifier at fixed address
  // This is different for every chip ever manufactured
  uint32_t deviceId0 = NRF_FICR->DEVICEID[0];
  uint32_t deviceId1 = NRF_FICR->DEVICEID[1];

  // Pack into byte array
  memcpy(serialBytes, &deviceId0, 4);
  memcpy(serialBytes + 4, &deviceId1, 4);
}

/**
 * Generate UNIQUE device keypair from hardware serial
 * Same Arduino = same keys (deterministic)
 * Different Arduino = different keys (unique)
 */
void generateDeviceKeys() {
  Serial.println("\n[KEY GENERATION]");
  Serial.println("Deriving UNIQUE device identity from hardware serial...");

  // Get unique hardware serial number (8 bytes)
  uint8_t hwSerial[8];
  getHardwareSerial(hwSerial);

  Serial.print("Hardware Serial: ");
  for (int i = 0; i < 8; i++) {
    if (hwSerial[i] < 0x10) Serial.print("0");
    Serial.print(hwSerial[i], HEX);
  }
  Serial.println();

  // Derive 32-byte seed from hardware serial using SHA-256
  // This ensures we get a cryptographically strong seed
  SHA256 hasher;
  hasher.reset();
  hasher.update(hwSerial, 8);
  hasher.update((const uint8_t*)"EdgeChain-Device-Seed-v2", 24); // Salt for domain separation (v2 = new identity!)
  hasher.finalize(device_secret_key, 32);

  // Derive public key from secret key (Ed25519)
  Ed25519::derivePublicKey(device_public_key, device_secret_key);

  Serial.println("✓ Keys generated successfully!");
  Serial.print("Device Public Key: ");
  for (int i = 0; i < 32; i++) {
    if (device_public_key[i] < 0x10) Serial.print("0");
    Serial.print(device_public_key[i], HEX);
  }
  Serial.println();

  // Generate human-readable device ID from first 8 bytes of public key
  snprintf(DEVICE_ID, sizeof(DEVICE_ID), "EDGECHAIN_%02X%02X%02X%02X",
           device_public_key[0], device_public_key[1],
           device_public_key[2], device_public_key[3]);

  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  while (!Serial);  // Wait for Serial port to connect

  Serial.println();
  Serial.println("===========================================");
  Serial.println("=== EdgeChain Arduino IoT ===");
  Serial.println("===========================================");
  Serial.println();
  Serial.flush();

  // STEP 1: Generate unique device identity from hardware
  Serial.println("[1/4] Generating UNIQUE device identity...");
  Serial.flush();
  generateDeviceKeys();
  Serial.flush();

  // STEP 2: Initialize sensors
  Serial.println("[2/4] Initializing HS300x sensor (Rev2)...");
  Serial.flush();

  bool sensor_ok = false;
  for (int i = 0; i < 3; i++) {
    Serial.print("   Attempt ");
    Serial.print(i + 1);
    Serial.print("/3... ");
    Serial.flush();

    delay(100); // Give sensor time to stabilize

    if (HS300x.begin()) {
      Serial.println("SUCCESS!");
      sensor_ok = true;
      break;
    } else {
      Serial.println("failed");
      delay(500); // Wait before retry
    }
  }

  if (!sensor_ok) {
    Serial.println();
    Serial.println("⚠ ERROR: HS300x sensor initialization failed after 3 attempts");
    Serial.println("   Possible causes:");
    Serial.println("   - Sensor not properly connected (built-in on Nano 33 BLE Sense Rev2)");
    Serial.println("   - I2C bus issue");
    Serial.println("   - Wrong board selected (must be Arduino Nano 33 BLE)");
    Serial.println("   - Missing library: Install 'Arduino_HS300x' from Library Manager");
    Serial.println();
    Serial.println("   STOPPING - Cannot collect real data without sensor");
    Serial.flush();
    while (1) {
      delay(1000);
    }
  }

  Serial.println("✓ HS300x sensor initialized successfully");
  Serial.flush();
  Serial.println();

  // STEP 3: Initialize BLE
  Serial.println("[3/4] Initializing BLE...");
  Serial.flush();

  if (!BLE.begin()) {
    Serial.println("ERROR: BLE initialization failed");
    Serial.println("Cannot continue without BLE");
    Serial.flush();
    while (1) {
      delay(1000);
    }
  }

  // Set BLE device name to include unique ID
  char bleName[32];
  snprintf(bleName, sizeof(bleName), "EdgeChain-%02X%02X",
           device_public_key[0], device_public_key[1]);
  BLE.setLocalName(bleName);
  BLE.setAdvertisedService(edgechainService);
  edgechainService.addCharacteristic(dataCharacteristic);
  BLE.addService(edgechainService);
  BLE.advertise();

  Serial.println("✓ BLE initialized");
  Serial.println();
  Serial.flush();

  // STEP 4: Ready!
  Serial.println("[4/4] Starting BLE advertising...");
  Serial.println("===========================================");
  Serial.println("✓ Setup complete!");
  Serial.print("✓ BLE advertising as: ");
  Serial.println(bleName);
  Serial.println("✓ Waiting for gateway connection...");
  Serial.println();
  Serial.println("🔐 UNIQUE DEVICE IDENTITY:");
  Serial.print("   Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("   Public Key: ");
  for (int i = 0; i < 16; i++) {  // Show first 16 bytes
    if (device_public_key[i] < 0x10) Serial.print("0");
    Serial.print(device_public_key[i], HEX);
  }
  Serial.println("...");
  Serial.println("===========================================");
  Serial.println();
  Serial.flush();
}

void loop() {
  // Check for BLE connections
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("✓ Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      if (millis() - last_reading_time > READING_INTERVAL) {
        collectAndSignReading();
        last_reading_time = millis();
      }
      delay(100);
    }

    Serial.println("× Central disconnected");
  }

  delay(100);
}

/**
 * Collect temperature/humidity, sign, and broadcast via BLE
 */
void collectAndSignReading() {
  // 1. Read sensors (HS300x for Rev2)
  float temperature = HS300x.readTemperature();
  float humidity = HS300x.readHumidity();
  unsigned long timestamp = millis() / 1000; // seconds since boot

  Serial.println("\n--- New Reading ---");
  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  // 2. Package reading as JSON with collection_mode
  // Format: { "t": temp, "h": humidity, "ts": timestamp, "mode": "auto" }
  // CRITICAL: "mode":"auto" proves automatic collection (higher reward: 0.1 DUST)
  char reading_json[80];
  snprintf(reading_json, sizeof(reading_json),
           "{\"t\":%.1f,\"h\":%.0f,\"ts\":%lu,\"mode\":\"auto\"}",
           temperature, humidity, timestamp);

  Serial.print("Reading JSON: ");
  Serial.println(reading_json);
  Serial.println("Collection mode: auto (0.1 DUST reward)");

  // 3. Hash the reading (SHA-256)
  uint8_t reading_hash[32];
  hashReading(reading_json, reading_hash);
  Serial.print("Reading Hash: ");
  printHex("", reading_hash, 32);

  // 4. Sign the hash with EdDSA using THIS device's unique private key
  uint8_t signature[64]; // EdDSA signature is 64 bytes (r + s)
  Ed25519::sign(signature, device_secret_key, device_public_key, reading_hash, 32);
  Serial.print("Signature: ");
  printHex("", signature, 64);

  // 5. Package for transmission: reading_json + signature + pubkey
  // Format: [1 byte length] [reading_json] [64-byte signature] [32-byte pubkey]
  uint8_t tx_payload[1 + 80 + 64 + 32];
  int idx = 0;

  // Reading length
  uint8_t json_len = strlen(reading_json);
  tx_payload[idx++] = json_len;

  // Reading JSON
  memcpy(&tx_payload[idx], reading_json, json_len);
  idx += json_len;

  // Signature
  memcpy(&tx_payload[idx], signature, 64);
  idx += 64;

  // Device public key (UNIQUE to this device!)
  memcpy(&tx_payload[idx], device_public_key, 32);
  idx += 32;

  // 6. Broadcast via BLE characteristic
  dataCharacteristic.writeValue(tx_payload, idx);
  Serial.println("✓ Signed reading (auto-collection) broadcast via BLE");
  Serial.println("   Reward: 0.1 DUST (higher reward for automatic collection)");
}

/**
 * Hash the reading JSON with SHA-256
 */
void hashReading(const char* json_str, uint8_t* output) {
  SHA256 hasher;
  hasher.reset();
  hasher.update((const uint8_t*)json_str, strlen(json_str));
  hasher.finalize(output, 32);
}

/**
 * Print hex string for debugging
 */
void printHex(const char* label, const uint8_t* data, size_t len) {
  Serial.print(label);
  for (size_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
  }
  Serial.println();
}
