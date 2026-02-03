/**
 * BRACE Protocol Client Implementation
 * 
 * Implements anonymous device registration:
 * 1. Generate random blinding factor r
 * 2. Compute commitment C = H("commitment" || pk || r)
 * 3. Send C to proof server (pk and r stay secret)
 * 4. Proof server adds C to Merkle tree
 */

#include "brace_client.h"
#include "config.h"

void BraceClient::begin(SecureElement* se, LoRaComm* lora) {
  _se = se;
  _lora = lora;
  _registered = false;
  
  // Check if we have a stored blinding factor
  // If so, reconstruct the commitment
  // In production, store this in ATECC608B slot
  
  // For now, check if slot 1 has data (blinding factor)
  uint8_t testKey[64];
  if (_se->getPublicKey(SLOT_BLINDING_FACTOR, testKey)) {
    // Blinding factor exists, compute commitment
    if (computeCommitment()) {
      _registered = true;
    }
  }
}

bool BraceClient::isRegistered() {
  return _registered;
}

bool BraceClient::registerDevice() {
  if (!_se || !_lora) return false;
  
  // Step 1: Generate random blinding factor
  if (!generateBlindingFactor()) {
    Serial.println("BRACE: Failed to generate blinding factor");
    return false;
  }
  
  // Step 2: Compute commitment C = H(domain || pk || r)
  if (!computeCommitment()) {
    Serial.println("BRACE: Failed to compute commitment");
    return false;
  }
  
  // Step 3: Send registration request to proof server
  if (!sendRegistrationRequest()) {
    Serial.println("BRACE: Failed to send registration");
    return false;
  }
  
  return true;
}

bool BraceClient::getCommitment(uint8_t* commitment) {
  if (!_registered || !commitment) return false;
  memcpy(commitment, _commitment, 32);
  return true;
}

bool BraceClient::getMerkleProof(uint8_t proof[][32], uint8_t* proofLen) {
  // In production, this would be received from proof server
  // For now, return empty proof (proof server will provide this)
  if (!_registered) return false;
  *proofLen = 0;
  return true;
}

bool BraceClient::generateBlindingFactor() {
  // Generate 32 bytes of randomness using ATECC608B hardware RNG
  if (!_se->random(_blindingFactor, 32)) {
    return false;
  }
  
  if (DEBUG_CRYPTO) {
    Serial.print("BRACE: Blinding factor: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X", _blindingFactor[i]);
    }
    Serial.println("...");
  }
  
  return true;
}

bool BraceClient::computeCommitment() {
  // Get device public key
  uint8_t publicKey[64];
  if (!_se->getPublicKey(SLOT_DEVICE_KEY, publicKey)) {
    return false;
  }
  
  // Commitment = H(domain || pk || r)
  // Concatenate: domain prefix (32) + public key (64) + blinding factor (32)
  uint8_t preimage[128];
  const char* domain = COMMITMENT_DOMAIN;
  
  // Pad domain to 32 bytes
  memset(preimage, 0, 32);
  memcpy(preimage, domain, strlen(domain));
  
  // Add public key (64 bytes)
  memcpy(preimage + 32, publicKey, 64);
  
  // Add blinding factor (32 bytes)
  memcpy(preimage + 96, _blindingFactor, 32);
  
  // Compute SHA256 hash
  if (!_se->sha256(preimage, 128, _commitment)) {
    return false;
  }
  
  if (DEBUG_CRYPTO) {
    Serial.print("BRACE: Commitment: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X", _commitment[i]);
    }
    Serial.println("...");
  }
  
  return true;
}

bool BraceClient::sendRegistrationRequest() {
  // Build registration message
  // Format: 0x00 (registration type) + commitment (32 bytes)
  uint8_t message[33];
  message[0] = 0x00; // Registration message type
  memcpy(message + 1, _commitment, 32);
  
  // Send via LoRa
  return _lora->transmit(message, sizeof(message));
}
