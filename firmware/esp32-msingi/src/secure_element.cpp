/**
 * Secure Element Implementation
 * 
 * ATECC608B driver for Msingi ESP32-S3 firmware.
 * Handles P-256 key operations and secure hashing.
 */

#include "secure_element.h"
#include "config.h"
#include <SparkFun_ATECCX08a_Arduino_Library.h>

// Static instance of the ATECC library
static ATECCX08A atecc;

bool SecureElement::begin() {
  if (_initialized) return true;
  
  // Initialize the ATECC608B
  if (!atecc.begin()) {
    Serial.println("ATECC608B: begin() failed");
    return false;
  }
  
  // Verify communication by reading serial number
  if (!atecc.wakeUp()) {
    Serial.println("ATECC608B: wakeUp() failed");
    return false;
  }
  
  // Read and display serial number
  atecc.readSerialNumber();
  Serial.print("ATECC608B Serial: ");
  for (int i = 0; i < 9; i++) {
    Serial.printf("%02X", atecc.serialNumber[i]);
  }
  Serial.println();
  
  _initialized = true;
  return true;
}

bool SecureElement::isKeyProvisioned(uint8_t slot) {
  if (!_initialized) return false;
  
  // Try to read the public key from the slot
  // If it fails, the slot is not provisioned
  uint8_t pubKey[64];
  return getPublicKey(slot, pubKey);
}

bool SecureElement::generateKey(uint8_t slot) {
  if (!_initialized) return false;
  
  // Generate a new P-256 private key in the slot
  // The private key is generated inside the chip and never exported
  if (!atecc.generatePrivateKey(slot)) {
    Serial.printf("ATECC608B: generatePrivateKey(%d) failed\n", slot);
    return false;
  }
  
  Serial.printf("ATECC608B: Key generated in slot %d\n", slot);
  return true;
}

bool SecureElement::getPublicKey(uint8_t slot, uint8_t* publicKey) {
  if (!_initialized) return false;
  
  // Read the public key associated with the private key in slot
  if (!atecc.generatePublicKey(slot)) {
    return false;
  }
  
  // Copy public key (64 bytes: X and Y coordinates)
  memcpy(publicKey, atecc.publicKey64Bytes, 64);
  return true;
}

bool SecureElement::sign(const uint8_t* data, size_t dataLen, uint8_t* signature) {
  if (!_initialized) return false;
  
  // First, compute SHA256 of the data
  uint8_t hash[32];
  if (!sha256(data, dataLen, hash)) {
    return false;
  }
  
  // Load the hash into the chip's TempKey
  // ATECC608B requires the message digest to be provided, not raw data
  if (!atecc.createSignature(hash)) {
    Serial.println("ATECC608B: createSignature() failed");
    return false;
  }
  
  // Copy the signature (64 bytes: R and S)
  memcpy(signature, atecc.signature, 64);
  return true;
}

bool SecureElement::verify(const uint8_t* publicKey, const uint8_t* data, 
                           size_t dataLen, const uint8_t* signature) {
  if (!_initialized) return false;
  
  // Compute hash of data
  uint8_t hash[32];
  if (!sha256(data, dataLen, hash)) {
    return false;
  }
  
  // Load public key for verification
  memcpy(atecc.publicKey64Bytes, publicKey, 64);
  
  // Load signature
  uint8_t sigCopy[64];
  memcpy(sigCopy, signature, 64);
  
  // Verify the signature
  // This uses the external public key mode
  return atecc.verifySignature(hash, sigCopy);
}

bool SecureElement::computeNullifier(uint32_t epoch, uint8_t* nullifier) {
  if (!_initialized) return false;
  
  // Nullifier = H(domain || device_nonce || epoch)
  // Use HMAC mode with the device key in slot
  
  // Prepare message: domain prefix + epoch bytes
  uint8_t message[64];
  memset(message, 0, sizeof(message));
  
  // Domain separation
  const char* domain = NULLIFIER_DOMAIN;
  size_t domainLen = strlen(domain);
  memcpy(message, domain, domainLen);
  
  // Append epoch (big-endian)
  message[domainLen + 0] = (epoch >> 24) & 0xFF;
  message[domainLen + 1] = (epoch >> 16) & 0xFF;
  message[domainLen + 2] = (epoch >> 8) & 0xFF;
  message[domainLen + 3] = (epoch >> 0) & 0xFF;
  
  // Compute HMAC using the device key (slot 0)
  // The ATECC608B supports native MAC operations
  if (!atecc.macData(message, domainLen + 4)) {
    Serial.println("ATECC608B: macData() failed");
    return false;
  }
  
  // The MAC result is the nullifier
  memcpy(nullifier, atecc.macBuffer, 32);
  return true;
}

bool SecureElement::random(uint8_t* buffer, size_t length) {
  if (!_initialized) return false;
  
  // ATECC608B generates 32 random bytes at a time
  size_t remaining = length;
  uint8_t* ptr = buffer;
  
  while (remaining > 0) {
    if (!atecc.random(atecc.randomNumber)) {
      Serial.println("ATECC608B: random() failed");
      return false;
    }
    
    size_t toCopy = (remaining < 32) ? remaining : 32;
    memcpy(ptr, atecc.randomNumber, toCopy);
    ptr += toCopy;
    remaining -= toCopy;
  }
  
  return true;
}

bool SecureElement::sha256(const uint8_t* data, size_t dataLen, uint8_t* hash) {
  if (!_initialized) return false;
  
  // Use the ATECC608B's SHA256 engine
  // This is faster and more secure than software implementation
  
  // Start SHA operation
  if (!atecc.sha256Start()) {
    Serial.println("ATECC608B: sha256Start() failed");
    return false;
  }
  
  // Process data in chunks (max 64 bytes per update)
  const uint8_t* ptr = data;
  size_t remaining = dataLen;
  
  while (remaining > 64) {
    if (!atecc.sha256Update((uint8_t*)ptr, 64)) {
      return false;
    }
    ptr += 64;
    remaining -= 64;
  }
  
  // Final chunk
  if (remaining > 0) {
    if (!atecc.sha256Update((uint8_t*)ptr, remaining)) {
      return false;
    }
  }
  
  // Get the digest
  if (!atecc.sha256End(hash)) {
    Serial.println("ATECC608B: sha256End() failed");
    return false;
  }
  
  return true;
}
