/**
 * Msingi ESP32-S3 Firmware - Main Entry Point
 * 
 * Privacy-preserving IoT device for agricultural data collection.
 * Uses ATECC608B secure element for key storage and LoRa for communication.
 * 
 * Architecture:
 *   Device generates commitment C = H(pk || r) using keys in ATECC608B
 *   Sends encrypted sensor data to farmer's proof server via LoRa
 *   Proof server generates ZK proofs and submits to Midnight Network
 */

#include <Arduino.h>
#include <Wire.h>
#include "config.h"
#include "secure_element.h"
#include "lora_comm.h"
#include "sensors.h"
#include "brace_client.h"

// Global instances
SecureElement secureElement;
LoRaComm loraComm;
Sensors sensors;
BraceClient braceClient;

// Device state
bool deviceRegistered = false;
uint32_t currentEpoch = 0;
uint8_t commitmentBytes[32];

/**
 * Setup - Initialize all hardware components
 */
void setup() {
  // Initialize serial for debugging
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // Wait up to 3s for serial
  
  Serial.println("\n═══════════════════════════════════════");
  Serial.println("  Msingi IoT Device - EdgeChain");
  Serial.print("  Firmware: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.println("═══════════════════════════════════════\n");
  
  // Initialize I2C bus
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(I2C_SPEED);
  Serial.println("✓ I2C bus initialized");
  
  // Initialize secure element
  if (!secureElement.begin()) {
    Serial.println("✗ ATECC608B initialization failed!");
    Serial.println("  Device cannot operate without secure element.");
    while (1) { delay(1000); } // Halt
  }
  Serial.println("✓ ATECC608B secure element ready");
  
  // Check if device key is provisioned
  if (!secureElement.isKeyProvisioned(SLOT_DEVICE_KEY)) {
    Serial.println("⚠ Device key not provisioned, generating...");
    if (!secureElement.generateKey(SLOT_DEVICE_KEY)) {
      Serial.println("✗ Key generation failed!");
      while (1) { delay(1000); }
    }
    Serial.println("✓ Device key provisioned (P-256)");
  } else {
    Serial.println("✓ Device key already provisioned");
  }
  
  // Get device public key for display
  uint8_t publicKey[64];
  if (secureElement.getPublicKey(SLOT_DEVICE_KEY, publicKey)) {
    Serial.print("  Public Key: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X", publicKey[i]);
    }
    Serial.println("...");
  }
  
  // Initialize LoRa communication
  if (!loraComm.begin(LORA_RX_PIN, LORA_TX_PIN)) {
    Serial.println("✗ LoRa module initialization failed!");
    while (1) { delay(1000); }
  }
  loraComm.configure(LORA_FREQUENCY, LORA_SPREADING_FACTOR, LORA_BANDWIDTH);
  Serial.println("✓ LoRa RYLR896 ready");
  Serial.printf("  Frequency: %d MHz, SF: %d\n", 
                LORA_FREQUENCY / 1000000, LORA_SPREADING_FACTOR);
  
  // Initialize sensors
  if (!sensors.begin()) {
    Serial.println("⚠ Some sensors failed to initialize");
    // Continue anyway - will report zeros for failed sensors
  } else {
    Serial.println("✓ Environmental sensors ready");
  }
  
  // Initialize BRACE protocol client
  braceClient.begin(&secureElement, &loraComm);
  Serial.println("✓ BRACE protocol client ready");
  
  // Check registration status
  deviceRegistered = braceClient.isRegistered();
  if (deviceRegistered) {
    braceClient.getCommitment(commitmentBytes);
    Serial.println("✓ Device already registered");
    Serial.print("  Commitment: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X", commitmentBytes[i]);
    }
    Serial.println("...");
  } else {
    Serial.println("⚠ Device not registered - will attempt registration");
  }
  
  Serial.println("\n═══════════════════════════════════════");
  Serial.println("  Initialization complete!");
  Serial.println("═══════════════════════════════════════\n");
}

/**
 * Main loop - Collect data and transmit to proof server
 */
void loop() {
  static unsigned long lastReading = 0;
  unsigned long now = millis();
  
  // Check for incoming LoRa messages (commands from proof server)
  if (loraComm.available()) {
    handleIncomingMessage();
  }
  
  // Time for sensor reading?
  if (now - lastReading >= SENSOR_INTERVAL_MS || lastReading == 0) {
    lastReading = now;
    
    // Handle based on registration status
    if (!deviceRegistered) {
      attemptRegistration();
    } else {
      collectAndTransmitData();
    }
  }
  
  // Small delay to prevent busy-waiting
  delay(100);
}

/**
 * Handle incoming LoRa messages from proof server
 */
void handleIncomingMessage() {
  uint8_t buffer[256];
  size_t len = loraComm.receive(buffer, sizeof(buffer));
  
  if (len > 0) {
    // Parse message type
    uint8_t msgType = buffer[0];
    
    switch (msgType) {
      case 0x01: // Registration acknowledgment
        Serial.println("📨 Received registration ACK");
        deviceRegistered = true;
        break;
        
      case 0x02: // Epoch update
        if (len >= 5) {
          currentEpoch = (buffer[1] << 24) | (buffer[2] << 16) | 
                         (buffer[3] << 8) | buffer[4];
          Serial.printf("📨 Epoch updated: %lu\n", currentEpoch);
        }
        break;
        
      case 0x03: // Proof submitted confirmation
        Serial.println("📨 Proof confirmation received");
        break;
        
      default:
        Serial.printf("📨 Unknown message type: 0x%02X\n", msgType);
    }
  }
}

/**
 * Attempt device registration using BRACE protocol
 */
void attemptRegistration() {
  Serial.println("\n📤 Attempting BRACE registration...");
  
  if (braceClient.registerDevice()) {
    braceClient.getCommitment(commitmentBytes);
    Serial.println("✓ Registration request sent");
    Serial.print("  Commitment: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X", commitmentBytes[i]);
    }
    Serial.println("...");
    // Will be marked registered when ACK received
  } else {
    Serial.println("✗ Registration failed");
  }
}

/**
 * Collect sensor data and transmit to proof server
 */
void collectAndTransmitData() {
  Serial.println("\n📊 Collecting sensor data...");
  
  // Read all sensors
  SensorData data;
  if (!sensors.readAll(&data)) {
    Serial.println("⚠ Sensor read error, using partial data");
  }
  
  Serial.printf("  Temperature: %.1f°C\n", data.temperature);
  Serial.printf("  Humidity: %.1f%%\n", data.humidity);
  Serial.printf("  Soil Moisture: %.1f%%\n", data.soilMoisture);
  Serial.printf("  Pressure: %.1f hPa\n", data.pressure);
  
  // Create nullifier for this epoch
  uint8_t nullifier[32];
  if (!secureElement.computeNullifier(currentEpoch, nullifier)) {
    Serial.println("✗ Nullifier computation failed");
    return;
  }
  
  // Create data packet
  DataPacket packet;
  memcpy(packet.commitment, commitmentBytes, 32);
  packet.temperature = data.temperature;
  packet.humidity = data.humidity;
  packet.soilMoisture = data.soilMoisture;
  packet.timestamp = millis();
  memcpy(packet.nullifier, nullifier, 32);
  
  // Sign the packet
  uint8_t signature[64];
  if (!secureElement.sign((uint8_t*)&packet, sizeof(packet) - 64, signature)) {
    Serial.println("✗ Packet signing failed");
    return;
  }
  memcpy(packet.signature, signature, 64);
  
  // Transmit via LoRa
  Serial.println("📤 Transmitting to proof server...");
  if (loraComm.transmit((uint8_t*)&packet, sizeof(packet))) {
    Serial.println("✓ Data transmitted");
  } else {
    Serial.println("✗ Transmission failed");
  }
}
