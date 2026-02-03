/**
 * LoRa Communication Header
 * 
 * Driver for RYLR896 LoRa transceiver module.
 * Uses AT command interface over UART.
 */

#ifndef LORA_COMM_H
#define LORA_COMM_H

#include <Arduino.h>
#include <HardwareSerial.h>

class LoRaComm {
public:
  /**
   * Initialize LoRa module on specified pins
   * @param rxPin ESP32 RX pin (connects to module TX)
   * @param txPin ESP32 TX pin (connects to module RX)
   * @return true if module responds to AT commands
   */
  bool begin(int rxPin, int txPin);
  
  /**
   * Configure LoRa parameters
   * @param frequency Frequency in Hz (e.g., 868000000)
   * @param spreadingFactor SF7-SF12
   * @param bandwidth Bandwidth in kHz (125, 250, or 500)
   */
  void configure(uint32_t frequency, uint8_t spreadingFactor, uint16_t bandwidth);
  
  /**
   * Set network ID (must match proof server)
   * @param networkId Network ID (0-255)
   */
  void setNetworkId(uint8_t networkId);
  
  /**
   * Set device address
   * @param address Device address (0-65535)
   */
  void setAddress(uint16_t address);
  
  /**
   * Transmit data to proof server (address 1)
   * @param data Data buffer
   * @param length Data length (max 240 bytes)
   * @return true if transmission acknowledged
   */
  bool transmit(const uint8_t* data, size_t length);
  
  /**
   * Check if data is available to receive
   * @return true if data is waiting
   */
  bool available();
  
  /**
   * Receive data from LoRa
   * @param buffer Output buffer
   * @param maxLen Maximum bytes to read
   * @return Number of bytes received
   */
  size_t receive(uint8_t* buffer, size_t maxLen);
  
  /**
   * Get last RSSI value
   * @return RSSI in dBm
   */
  int getRSSI();
  
  /**
   * Get last SNR value
   * @return SNR in dB
   */
  int getSNR();

private:
  HardwareSerial* _serial = nullptr;
  int _rssi = 0;
  int _snr = 0;
  
  bool sendCommand(const char* cmd, char* response = nullptr, size_t maxResponse = 0);
  bool waitForResponse(char* response, size_t maxLen, unsigned long timeout = 2000);
};

#endif // LORA_COMM_H
