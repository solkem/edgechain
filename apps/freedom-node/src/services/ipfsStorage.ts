/**
 * IPFS Storage Service using Microservice Architecture
 *
 * Provides decentralized storage for ZK proofs and IoT sensor readings.
 * - Calls separate ESM-based IPFS microservice on port 3002
 * - FREE unlimited storage via Storacha
 * - Content-addressed (CID-based)
 * - Censorship-resistant
 * - Perfect for privacy-preserving IoT data
 *
 * Usage:
 * 1. Upload ZK proof + reading → get CID
 * 2. Store CID in database (zk_proof_submissions.ipfs_cid)
 * 3. Anyone can retrieve and verify from IPFS
 */

export interface IPFSZKProofData {
  // ZK Proof data
  proof: string;
  public_inputs: {
    collectionMode: number;
    nullifier: string;
    dataHash: string;
    epoch: number;
    temperature: number;
    humidity: number;
    timestamp: number;
  };

  // Reading data (for convenience)
  reading: {
    temperature: number;
    humidity: number;
    timestamp: number;
  };

  // Metadata
  collection_mode: string;
  reward: number;
  verified: boolean;
  submitted_at: number;
}

export interface IPFSReading {
  reading_json: string;
  signature: string;
  device_pubkey: string;
  timestamp: number;
  metadata?: any;
}

export class IPFSStorageService {
  private ipfsServiceUrl: string;
  private initialized: boolean = false;

  constructor() {
    // IPFS microservice endpoint
    this.ipfsServiceUrl = process.env.IPFS_SERVICE_URL || 'http://localhost:3002';
  }

  /**
   * Check if IPFS service is available
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const response = await fetch(`${this.ipfsServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });

      if (response.ok) {
        const data = await response.json() as any;
        // Mark as initialized even in mock mode - service is available
        this.initialized = true;

        if (data.ipfs_enabled) {
          console.log('✅ IPFS Storage Service: Connected to microservice (real IPFS)');
          console.log(`   Service URL: ${this.ipfsServiceUrl}`);
        } else {
          console.log('✅ IPFS Storage Service: Connected to microservice (mock mode)');
          console.log('   Will generate mock CIDs for demo purposes');
        }
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error: any) {
      console.error('⚠️  IPFS microservice not available:', error.message);
      console.log('   ZK proofs will be stored in database only');
      this.initialized = false;
    }
  }

  /**
   * Upload ZK proof and reading to IPFS via microservice
   * Returns the Content ID (CID) for later retrieval
   *
   * This makes the proof publicly verifiable while maintaining device privacy!
   */
  async uploadZKProof(data: IPFSZKProofData): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('IPFS service not available');
    }

    try {
      const response = await fetch(`${this.ipfsServiceUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: data.proof,
          public_inputs: data.public_inputs,
          reading: data.reading,
          metadata: {
            collection_mode: data.collection_mode,
            reward: data.reward,
            verified: data.verified,
            submitted_at: data.submitted_at
          }
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout for upload
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json() as any;

      console.log(`📤 Uploaded ZK proof to IPFS: ${result.cid}`);
      console.log(`   Nullifier: ${data.public_inputs.nullifier.slice(0, 16)}...`);
      console.log(`   Gateway: ${result.gateway_url}`);

      if (result.mock) {
        console.log(`   ⚠️  Using mock CID (IPFS credentials not configured)`);
      }

      return result.cid;
    } catch (error: any) {
      console.error('❌ Failed to upload ZK proof to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Upload signed reading to IPFS via microservice
   */
  async uploadReading(data: IPFSReading): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('IPFS service not available');
    }

    try {
      const response = await fetch(`${this.ipfsServiceUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: 'signed_reading',
          public_inputs: {
            device_pubkey: data.device_pubkey,
            timestamp: data.timestamp
          },
          reading: JSON.parse(data.reading_json),
          metadata: {
            signature: data.signature,
            ...data.metadata
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json() as any;
      console.log(`📤 Uploaded signed reading to IPFS: ${result.cid}`);

      return result.cid;
    } catch (error: any) {
      console.error('❌ Failed to upload reading to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve ZK proof from IPFS by CID via microservice
   */
  async retrieveZKProof(cid: string): Promise<IPFSZKProofData | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return null;
    }

    try {
      const response = await fetch(`${this.ipfsServiceUrl}/retrieve/${cid}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Retrieval failed: ${response.status}`);
      }

      const result = await response.json() as any;

      if (result.success) {
        console.log(`📥 Retrieved ZK proof from IPFS: ${cid}`);
        return result.data;
      } else {
        throw new Error('Retrieval unsuccessful');
      }
    } catch (error: any) {
      console.error('❌ Failed to retrieve from IPFS:', error.message);
      return null;
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   * Anyone can use this URL to retrieve and verify the proof
   */
  getGatewayUrl(cid: string): string {
    return `https://w3s.link/ipfs/${cid}`;
  }

  /**
   * Check if IPFS service is currently available
   */
  isAvailable(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const ipfsStorage = new IPFSStorageService();
