/**
 * LoRa Communication Implementation
 * 
 * Driver for RYLR896 LoRa transceiver using AT commands.
 */

#include "lora_comm.h"
#include "config.h"

// Use UART2 for LoRa
HardwareSerial LoRaSerial(2);

bool LoRaComm::begin(int rxPin, int txPin) {
  _serial = &LoRaSerial;
  _serial->begin(LORA_UART_BAUD, SERIAL_8N1, rxPin, txPin);
  
  delay(100); // Wait for module to initialize
  
  // Clear any pending data
  while (_serial->available()) {
    _serial->read();
  }
  
  // Test communication with AT command
  char response[64];
  if (!sendCommand("AT", response, sizeof(response))) {
    return false;
  }
  
  // Check for "+OK" response
  if (strstr(response, "+OK") == nullptr) {
    return false;
  }
  
  return true;
}

void LoRaComm::configure(uint32_t frequency, uint8_t spreadingFactor, uint16_t bandwidth) {
  char cmd[64];
  
  // Set frequency (in MHz)
  snprintf(cmd, sizeof(cmd), "AT+BAND=%lu", frequency);
  sendCommand(cmd);
  delay(100);
  
  // Set spreading factor (7-12) and bandwidth
  // RYLR896 uses combined parameter
  uint8_t bwCode = 0;
  if (bandwidth >= 500) bwCode = 2;
  else if (bandwidth >= 250) bwCode = 1;
  else bwCode = 0; // 125kHz
  
  snprintf(cmd, sizeof(cmd), "AT+PARAMETER=%d,%d,%d,12", 
           spreadingFactor, bwCode, 1); // SF, BW, CR=4/5, Preamble=12
  sendCommand(cmd);
  delay(100);
  
  // Set output power to maximum
  sendCommand("AT+CRFOP=20");
}

void LoRaComm::setNetworkId(uint8_t networkId) {
  char cmd[32];
  snprintf(cmd, sizeof(cmd), "AT+NETWORKID=%d", networkId);
  sendCommand(cmd);
}

void LoRaComm::setAddress(uint16_t address) {
  char cmd[32];
  snprintf(cmd, sizeof(cmd), "AT+ADDRESS=%d", address);
  sendCommand(cmd);
}

bool LoRaComm::transmit(const uint8_t* data, size_t length) {
  if (length > 240) return false; // RYLR896 max payload
  
  // Build hex string from binary data
  char hexData[512];
  for (size_t i = 0; i < length; i++) {
    sprintf(&hexData[i * 2], "%02X", data[i]);
  }
  hexData[length * 2] = '\0';
  
  // Send to proof server (address 1)
  char cmd[560];
  snprintf(cmd, sizeof(cmd), "AT+SEND=1,%zu,%s", length * 2, hexData);
  
  char response[64];
  if (!sendCommand(cmd, response, sizeof(response))) {
    return false;
  }
  
  return strstr(response, "+OK") != nullptr;
}

bool LoRaComm::available() {
  return _serial->available();
}

size_t LoRaComm::receive(uint8_t* buffer, size_t maxLen) {
  if (!_serial->available()) return 0;
  
  // Read incoming message
  char rawResponse[512];
  size_t idx = 0;
  unsigned long timeout = millis() + 1000;
  
  while (millis() < timeout && idx < sizeof(rawResponse) - 1) {
    if (_serial->available()) {
      char c = _serial->read();
      rawResponse[idx++] = c;
      if (c == '\n') break;
    }
  }
  rawResponse[idx] = '\0';
  
  // Parse response: +RCV=<address>,<length>,<data>,<RSSI>,<SNR>
  if (strncmp(rawResponse, "+RCV=", 5) != 0) return 0;
  
  // Extract data from response
  char* token = strtok(rawResponse + 5, ",");
  if (!token) return 0; // address
  
  token = strtok(nullptr, ",");
  if (!token) return 0;
  size_t dataLen = atoi(token);
  
  token = strtok(nullptr, ",");
  if (!token) return 0; // hex data
  
  // Convert hex to binary
  size_t outLen = 0;
  for (size_t i = 0; i < dataLen && outLen < maxLen; i += 2) {
    char hex[3] = { token[i], token[i + 1], '\0' };
    buffer[outLen++] = (uint8_t)strtol(hex, nullptr, 16);
  }
  
  // Extract RSSI and SNR
  token = strtok(nullptr, ",");
  if (token) _rssi = atoi(token);
  
  token = strtok(nullptr, ",");
  if (token) _snr = atoi(token);
  
  return outLen;
}

int LoRaComm::getRSSI() {
  return _rssi;
}

int LoRaComm::getSNR() {
  return _snr;
}

bool LoRaComm::sendCommand(const char* cmd, char* response, size_t maxResponse) {
  // Clear buffer
  while (_serial->available()) _serial->read();
  
  // Send command
  _serial->println(cmd);
  
  if (DEBUG_LORA) {
    Serial.print("LoRa TX: ");
    Serial.println(cmd);
  }
  
  // Wait for response
  return waitForResponse(response, maxResponse);
}

bool LoRaComm::waitForResponse(char* response, size_t maxLen, unsigned long timeout) {
  unsigned long start = millis();
  size_t idx = 0;
  
  while (millis() - start < timeout) {
    if (_serial->available()) {
      char c = _serial->read();
      if (response && idx < maxLen - 1) {
        response[idx++] = c;
      }
      if (c == '\n') break;
    }
  }
  
  if (response) response[idx] = '\0';
  
  if (DEBUG_LORA && response) {
    Serial.print("LoRa RX: ");
    Serial.println(response);
  }
  
  return idx > 0;
}
