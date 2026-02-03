/**
 * BRACE Protocol Client Header
 * 
 * Implements the Blind Registration via Anonymous Commitment Enrollment protocol.
 * Device generates commitment C = H(pk || r) during registration.
 * The public key pk is derived from ATECC608B slot 0.
 * The blinding factor r is stored in slot 1.
 */

#ifndef BRACE_CLIENT_H
#define BRACE_CLIENT_H

#include <Arduino.h>
#include "secure_element.h"
#include "lora_comm.h"

class BraceClient {
public:
  /**
   * Initialize the BRACE client
   * @param se Pointer to secure element
   * @param lora Pointer to LoRa communication
   */
  void begin(SecureElement* se, LoRaComm* lora);
  
  /**
   * Check if device is already registered
   * @return true if commitment has been computed and stored
   */
  bool isRegistered();
  
  /**
   * Register the device using BRACE protocol
   * Generates commitment C = H(pk || r) and sends to proof server
   * @return true if registration request sent
   */
  bool registerDevice();
  
  /**
   * Get the device commitment
   * @param commitment Output buffer (32 bytes)
   * @return true if commitment exists
   */
  bool getCommitment(uint8_t* commitment);
  
  /**
   * Get the Merkle proof for this device
   * In production, this is received from proof server
   * @param proof Output buffer for Merkle siblings
   * @param proofLen Output: number of siblings
   * @return true if proof available
   */
  bool getMerkleProof(uint8_t proof[][32], uint8_t* proofLen);

private:
  SecureElement* _se = nullptr;
  LoRaComm* _lora = nullptr;
  
  bool _registered = false;
  uint8_t _commitment[32];
  uint8_t _blindingFactor[32];
  
  bool generateBlindingFactor();
  bool computeCommitment();
  bool sendRegistrationRequest();
};

#endif // BRACE_CLIENT_H
