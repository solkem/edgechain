/**
 * Secure Element Interface Header
 * 
 * Wrapper for ATECC608B secure element operations.
 * Handles key generation, signing, and nullifier computation.
 */

#ifndef SECURE_ELEMENT_H
#define SECURE_ELEMENT_H

#include <Arduino.h>

class SecureElement {
public:
  /**
   * Initialize the ATECC608B secure element
   * @return true if successful, false otherwise
   */
  bool begin();
  
  /**
   * Check if a key slot is provisioned
   * @param slot Key slot number (0-15)
   * @return true if key exists
   */
  bool isKeyProvisioned(uint8_t slot);
  
  /**
   * Generate a new P-256 key pair in the specified slot
   * Private key never leaves the secure element
   * @param slot Key slot number
   * @return true if successful
   */
  bool generateKey(uint8_t slot);
  
  /**
   * Get the public key from a slot
   * @param slot Key slot number
   * @param publicKey Output buffer (64 bytes for P-256: X || Y)
   * @return true if successful
   */
  bool getPublicKey(uint8_t slot, uint8_t* publicKey);
  
  /**
   * Sign data using the private key in slot
   * @param slot Key slot number
   * @param data Data to sign
   * @param dataLen Length of data
   * @param signature Output buffer (64 bytes for ECDSA P-256)
   * @return true if successful
   */
  bool sign(const uint8_t* data, size_t dataLen, uint8_t* signature);
  
  /**
   * Verify a signature using a public key
   * @param publicKey Public key (64 bytes)
   * @param data Original data
   * @param dataLen Length of data
   * @param signature Signature to verify (64 bytes)
   * @return true if signature is valid
   */
  bool verify(const uint8_t* publicKey, const uint8_t* data, 
              size_t dataLen, const uint8_t* signature);
  
  /**
   * Compute nullifier for an epoch: H(device_secret || epoch)
   * Uses HMAC-SHA256 with device key
   * @param epoch Current epoch number
   * @param nullifier Output buffer (32 bytes)
   * @return true if successful
   */
  bool computeNullifier(uint32_t epoch, uint8_t* nullifier);
  
  /**
   * Generate random bytes using hardware RNG
   * @param buffer Output buffer
   * @param length Number of bytes to generate
   * @return true if successful
   */
  bool random(uint8_t* buffer, size_t length);
  
  /**
   * Compute SHA256 hash (hardware accelerated)
   * @param data Input data
   * @param dataLen Length of data
   * @param hash Output buffer (32 bytes)
   * @return true if successful
   */
  bool sha256(const uint8_t* data, size_t dataLen, uint8_t* hash);

private:
  bool _initialized = false;
};

#endif // SECURE_ELEMENT_H
