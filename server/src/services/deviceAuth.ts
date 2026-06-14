/**
 * Device Authentication Service
 *
 * Handles cryptographic authentication of IoT devices:
 * - ED25519 keypair generation
 * - Challenge-response protocol
 * - Signature verification
 * - Device registration with proof of ownership
 */

import * as crypto from 'crypto';

async function ed25519() {
  return import('@noble/ed25519');
}

export interface DeviceKeypair {
  publicKey: string; // hex
  privateKey: string; // hex
}

export interface RegistrationChallenge {
  challenge: string; // hex, random 32 bytes
  devicePubkey: string; // hex
  expiresAt: number; // timestamp
}

export interface SignedChallenge {
  challenge: string; // hex
  signature: string; // hex, ED25519 signature
  devicePubkey: string; // hex
}

export class DeviceAuthService {
  // In-memory challenge storage (production: use Redis with TTL)
  private challenges: Map<string, RegistrationChallenge> = new Map();
  private readonly CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate ED25519 keypair for device
   * NOTE: This should run on Arduino, not server!
   * Including here for testing/simulation purposes
   */
  static async generateKeypair(): Promise<DeviceKeypair> {
    const ed = await ed25519();
    // Generate random 32-byte private key
    const privateKey = crypto.randomBytes(32);
    const publicKey = await ed.getPublicKeyAsync(privateKey);

    return {
      publicKey: Buffer.from(publicKey).toString('hex'),
      privateKey: privateKey.toString('hex'),
    };
  }

  /**
   * Issue registration challenge to device
   * Device must sign this challenge to prove it owns the private key
   */
  issueChallenge(devicePubkey: string): RegistrationChallenge {
    // Generate random 32-byte challenge
    const challengeBytes = crypto.randomBytes(32);
    const challenge = challengeBytes.toString('hex');

    const registrationChallenge: RegistrationChallenge = {
      challenge,
      devicePubkey,
      expiresAt: Date.now() + this.CHALLENGE_EXPIRY_MS,
    };

    // Store challenge (indexed by device pubkey)
    this.challenges.set(devicePubkey, registrationChallenge);

    console.log(`🔐 Challenge issued to device: ${devicePubkey.slice(0, 16)}...`);
    console.log(`   Challenge: ${challenge.slice(0, 32)}...`);
    console.log(`   Expires in: ${this.CHALLENGE_EXPIRY_MS / 1000}s`);

    return registrationChallenge;
  }

  /**
   * Verify device signature on challenge
   * Returns true if signature is valid and challenge hasn't expired
   */
  async verifyChallenge(signedChallenge: SignedChallenge): Promise<boolean> {
    const { challenge, signature, devicePubkey } = signedChallenge;

    // 1. Check challenge exists
    const storedChallenge = this.challenges.get(devicePubkey);
    if (!storedChallenge) {
      console.error(`❌ No challenge found for device: ${devicePubkey.slice(0, 16)}...`);
      return false;
    }

    // 2. Verify challenge matches
    if (storedChallenge.challenge !== challenge) {
      console.error(`❌ Challenge mismatch for device: ${devicePubkey.slice(0, 16)}...`);
      return false;
    }

    // 3. Check expiry
    if (Date.now() > storedChallenge.expiresAt) {
      console.error(`❌ Challenge expired for device: ${devicePubkey.slice(0, 16)}...`);
      this.challenges.delete(devicePubkey);
      return false;
    }

    // 4. Verify ED25519 signature
    try {
      const challengeBytes = Buffer.from(challenge, 'hex');
      const signatureBytes = Buffer.from(signature, 'hex');
      const pubkeyBytes = Buffer.from(devicePubkey, 'hex');

      const ed = await ed25519();
      const isValid = await ed.verifyAsync(signatureBytes, challengeBytes, pubkeyBytes);

      if (isValid) {
        console.log(`✅ Device authentication successful: ${devicePubkey.slice(0, 16)}...`);
        // Clean up challenge (can only be used once)
        this.challenges.delete(devicePubkey);
      } else {
        console.error(`❌ Invalid signature from device: ${devicePubkey.slice(0, 16)}...`);
      }

      return isValid;
    } catch (error: any) {
      console.error(`❌ Signature verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Sign a message with device private key
   * NOTE: This should run on Arduino, not server!
   * Including here for testing/simulation purposes
   */
  static async signMessage(message: string, privateKeyHex: string): Promise<string> {
    const messageBytes = Buffer.from(message, 'hex');
    const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

    const ed = await ed25519();
    const signature = await ed.signAsync(messageBytes, privateKeyBytes);
    return Buffer.from(signature).toString('hex');
  }

  /**
   * Verify a reading signature (for data authenticity)
   */
  static async verifyReadingSignature(
    readingJson: string,
    signature: string,
    devicePubkey: string
  ): Promise<boolean> {
    try {
      // Hash the reading JSON to create message
      const messageHash = crypto
        .createHash('sha256')
        .update(readingJson)
        .digest();

      const signatureBytes = Buffer.from(signature, 'hex');
      const pubkeyBytes = Buffer.from(devicePubkey, 'hex');

      const ed = await ed25519();
      return await ed.verifyAsync(signatureBytes, messageHash, pubkeyBytes);
    } catch (error: any) {
      console.error(`❌ Reading signature verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up expired challenges (should run periodically)
   */
  cleanupExpiredChallenges(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [devicePubkey, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(devicePubkey);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired challenge(s)`);
    }

    return cleaned;
  }

  /**
   * Get challenge status (for debugging)
   */
  getChallengeStatus(devicePubkey: string): RegistrationChallenge | null {
    return this.challenges.get(devicePubkey) || null;
  }
}
