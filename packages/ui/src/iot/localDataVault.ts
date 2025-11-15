/**
 * Layer 1 (L1): Local Data Vault
 *
 * PURPOSE: Store raw IoT sensor readings LOCALLY with encryption.
 * PRIVACY GUARANTEE: Raw data NEVER leaves the farmer's device.
 *
 * Architecture:
 * - Raw readings encrypted with farmer's key (AES-256-GCM)
 * - Stored in browser IndexedDB or local device storage
 * - Only farmer can decrypt (key derived from password)
 * - NO network transmission of raw data
 *
 * This is L1 in EdgeChain's 4-tier privacy architecture.
 */

export interface RawIoTReading {
  temperature: number;      // °C
  humidity: number;         // %
  soil_moisture?: number;   // % (optional, for agricultural sensors)
  pH?: number;              // pH level (optional)
  timestamp: number;        // Unix timestamp (ms)
  device_id: string;        // Device identifier
  location?: {              // Optional location (encrypted)
    latitude: number;
    longitude: number;
  };
}

export interface EncryptedStorageMetadata {
  version: number;
  encrypted_at: number;
  reading_count: number;
  device_id: string;
}

/**
 * Local Data Vault - Encrypted storage for raw IoT readings
 *
 * Security:
 * - AES-256-GCM encryption
 * - PBKDF2 key derivation (100,000 iterations)
 * - Unique IV per encryption operation
 * - Data stays encrypted at rest
 */
export class LocalDataVault {
  private readonly STORAGE_KEY = 'edgechain_raw_data_encrypted';
  private readonly METADATA_KEY = 'edgechain_storage_metadata';
  private readonly SALT_KEY = 'edgechain_salt';

  private farmerKey: CryptoKey | null = null;
  private isInitialized = false;

  /**
   * Initialize vault with farmer's password
   * Derives encryption key using PBKDF2
   */
  async initialize(farmerPassword: string, deviceId: string): Promise<void> {
    console.log('🔐 L1: Initializing Local Data Vault...');

    // Get or generate salt (device-specific)
    let salt = this.getSalt();
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      this.storeSalt(salt);
    }

    // Derive encryption key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(farmerPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.farmerKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // OWASP recommendation
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.isInitialized = true;
    console.log('✅ L1: Vault initialized with AES-256-GCM encryption');

    // Initialize metadata if first time
    const metadata = this.getMetadata();
    if (!metadata) {
      this.storeMetadata({
        version: 1,
        encrypted_at: Date.now(),
        reading_count: 0,
        device_id: deviceId
      });
    }
  }

  /**
   * Store a new IoT reading (encrypted)
   * Raw data NEVER transmitted over network
   */
  async storeReading(reading: RawIoTReading): Promise<void> {
    this.ensureInitialized();

    console.log('💾 L1: Storing raw reading locally (encrypted)...');
    console.log(`   Temperature: ${reading.temperature}°C`);
    console.log(`   Humidity: ${reading.humidity}%`);
    if (reading.soil_moisture) console.log(`   Soil Moisture: ${reading.soil_moisture}%`);
    if (reading.pH) console.log(`   pH: ${reading.pH}`);

    // Get existing readings
    const readings = await this.getAllReadings();

    // Add new reading
    readings.push(reading);

    // Encrypt and store
    await this.encryptAndStore(readings);

    // Update metadata
    const metadata = this.getMetadata()!;
    metadata.reading_count = readings.length;
    metadata.encrypted_at = Date.now();
    this.storeMetadata(metadata);

    console.log(`✅ L1: Reading stored (Total: ${readings.length} readings)`);
    console.log('   🔒 Data encrypted at rest with AES-256-GCM');
    console.log('   🏠 Data stays on device (NEVER transmitted)');
  }

  /**
   * Get all stored readings (decrypted)
   * Only accessible with farmer's key
   */
  async getAllReadings(): Promise<RawIoTReading[]> {
    this.ensureInitialized();

    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) {
      console.log('📭 L1: No readings stored yet');
      return [];
    }

    try {
      const decrypted = await this.decrypt(encrypted);
      const readings = JSON.parse(decrypted) as RawIoTReading[];
      console.log(`📖 L1: Retrieved ${readings.length} readings (decrypted)`);
      return readings;
    } catch (error) {
      console.error('❌ L1: Failed to decrypt readings:', error);
      throw new Error('Failed to decrypt readings. Wrong password?');
    }
  }

  /**
   * Get readings within a time range
   */
  async getReadingsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<RawIoTReading[]> {
    const allReadings = await this.getAllReadings();
    return allReadings.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  /**
   * Get recent readings (last N)
   */
  async getRecentReadings(count: number): Promise<RawIoTReading[]> {
    const allReadings = await this.getAllReadings();
    return allReadings.slice(-count);
  }

  /**
   * Get storage statistics (without decrypting)
   */
  getStorageStats(): EncryptedStorageMetadata | null {
    return this.getMetadata();
  }

  /**
   * Clear all stored data (use with caution!)
   */
  async clearAllData(): Promise<void> {
    console.warn('⚠️  L1: Clearing all encrypted data...');
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.METADATA_KEY);
    console.log('✅ L1: All data cleared');
  }

  /**
   * Export encrypted data (for backup)
   */
  exportEncryptedData(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Import encrypted data (from backup)
   */
  importEncryptedData(encryptedData: string): void {
    localStorage.setItem(this.STORAGE_KEY, encryptedData);
    console.log('✅ L1: Encrypted data imported');
  }

  // ==================== PRIVATE METHODS ====================

  private async encryptAndStore(readings: RawIoTReading[]): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(readings));
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.farmerKey) throw new Error('Vault not initialized');

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.farmerKey,
      new TextEncoder().encode(data)
    );

    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Base64 encode for localStorage
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  private async decrypt(encryptedBase64: string): Promise<string> {
    if (!this.farmerKey) throw new Error('Vault not initialized');

    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes)
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.farmerKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  private getSalt(): Uint8Array | null {
    const saltBase64 = localStorage.getItem(this.SALT_KEY);
    if (!saltBase64) return null;
    return Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  }

  private storeSalt(salt: Uint8Array): void {
    const saltBase64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(this.SALT_KEY, saltBase64);
  }

  private getMetadata(): EncryptedStorageMetadata | null {
    const metadataJson = localStorage.getItem(this.METADATA_KEY);
    if (!metadataJson) return null;
    return JSON.parse(metadataJson);
  }

  private storeMetadata(metadata: EncryptedStorageMetadata): void {
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.farmerKey) {
      throw new Error('LocalDataVault not initialized. Call initialize() first.');
    }
  }
}

// Singleton instance
export const localVault = new LocalDataVault();
