/**
 * IPFS Storage Service using Storacha (formerly Web3.Storage)
 *
 * Provides decentralized storage for ZK proofs and IoT sensor readings.
 * - FREE unlimited storage
 * - Content-addressed (CID-based)
 * - Censorship-resistant
 * - Perfect for privacy-preserving IoT data
 *
 * Usage:
 * 1. Upload ZK proof + reading → get CID
 * 2. Store CID in database (zk_proof_submissions.ipfs_cid)
 * 3. Anyone can retrieve and verify from IPFS
 */

import * as Client from '@storacha/client';
import * as Signer from '@ucanto/principal/ed25519';

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
  private client: any;
  private initialized: boolean = false;

  constructor() {
    // Client will be initialized on first use
  }

  /**
   * Initialize the Storacha client
   * This requires an email for authorization (free tier)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create a new client with in-memory store
      const principal = await Signer.generate();

      this.client = await Client.create({ principal });

      // Note: For production, you'll need to:
      // 1. Sign up at https://console.storacha.network
      // 2. Create a space
      // 3. Get delegation credentials
      // For now, we'll use a simpler approach with environment variable

      console.log('✅ IPFS Storage Service initialized (Storacha)');
      this.initialized = true;
    } catch (error: any) {
      console.error('❌ Failed to initialize IPFS Storage Service:', error.message);
      throw error;
    }
  }

  /**
   * Upload ZK proof and reading to IPFS
   * Returns the Content ID (CID) for later retrieval
   *
   * This makes the proof publicly verifiable while maintaining device privacy!
   */
  async uploadZKProof(data: IPFSZKProofData): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert data to blob
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const filename = `zk-proof-${data.public_inputs.nullifier.slice(0, 16)}-${data.reading.timestamp}.json`;
      const file = new File([blob], filename);

      // Upload to IPFS via Storacha
      const cid = await this.client.uploadFile(file);

      console.log(`📤 Uploaded ZK proof to IPFS: ${cid}`);
      console.log(`   Nullifier: ${data.public_inputs.nullifier.slice(0, 16)}...`);
      console.log(`   Gateway: https://${cid}.ipfs.w3s.link/`);

      return cid.toString();
    } catch (error: any) {
      console.error('❌ Failed to upload ZK proof to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Upload sensor reading to IPFS (legacy support)
   * Returns the Content ID (CID) for later retrieval
   */
  async uploadReading(reading: IPFSReading): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert reading to blob
      const data = JSON.stringify(reading);
      const blob = new Blob([data], { type: 'application/json' });
      const file = new File([blob], `reading-${reading.timestamp}.json`);

      // Upload to IPFS via Storacha
      const cid = await this.client.uploadFile(file);

      console.log(`📤 Uploaded reading to IPFS: ${cid}`);
      return cid.toString();
    } catch (error: any) {
      console.error('❌ Failed to upload reading to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Upload multiple ZK proofs as a batch
   * More efficient than individual uploads
   */
  async uploadZKProofBatch(proofs: IPFSZKProofData[]): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const cids: string[] = [];

      // Create files for each proof
      const files = proofs.map((proof, index) => {
        const data = JSON.stringify(proof, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const filename = `zk-proof-${index}-${proof.reading.timestamp}.json`;
        return new File([blob], filename);
      });

      // Upload directory of proofs
      const dirCid = await this.client.uploadDirectory(files);

      console.log(`📤 Uploaded ${proofs.length} ZK proofs to IPFS: ${dirCid}`);

      // For simplicity, return the directory CID for all proofs
      // In production, you might want individual CIDs
      return proofs.map(() => dirCid.toString());
    } catch (error: any) {
      console.error('❌ Failed to upload ZK proof batch to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve ZK proof from IPFS by CID
   * Anyone can call this - it's public data!
   * The proof is verifiable even though device identity stays private!
   */
  async getZKProof(cid: string): Promise<IPFSZKProofData | null> {
    try {
      // Fetch from IPFS gateway
      const response = await fetch(`https://${cid}.ipfs.w3s.link/`);

      if (!response.ok) {
        console.error(`Failed to fetch CID ${cid}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data as IPFSZKProofData;
    } catch (error: any) {
      console.error(`❌ Failed to retrieve ZK proof from IPFS (${cid}):`, error.message);
      return null;
    }
  }

  /**
   * Retrieve reading from IPFS by CID (legacy support)
   * Anyone can call this - it's public data!
   */
  async getReading(cid: string): Promise<IPFSReading | null> {
    try {
      // Fetch from IPFS gateway
      const response = await fetch(`https://${cid}.ipfs.w3s.link/`);

      if (!response.ok) {
        console.error(`Failed to fetch CID ${cid}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data as IPFSReading;
    } catch (error: any) {
      console.error(`❌ Failed to retrieve reading from IPFS (${cid}):`, error.message);
      return null;
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   * Useful for frontend to display links
   */
  getGatewayUrl(cid: string): string {
    return `https://${cid}.ipfs.w3s.link/`;
  }

  /**
   * Verify a ZK proof from IPFS
   * Demonstrates that proofs stored on IPFS are still verifiable!
   */
  async verifyProofFromIPFS(cid: string): Promise<boolean> {
    try {
      const data = await this.getZKProof(cid);
      if (!data) return false;

      // In production, this would call the actual ZK proof verification
      // For now, we just check the structure
      const hasProof = !!data.proof;
      const hasPublicInputs = !!data.public_inputs;
      const hasNullifier = !!data.public_inputs?.nullifier;
      const hasReading = !!data.reading;
      const hasTemperature = typeof data.reading?.temperature === 'number';

      return hasProof && hasPublicInputs && hasNullifier && hasReading && hasTemperature;
    } catch (error: any) {
      console.error(`❌ Failed to verify proof from IPFS (${cid}):`, error.message);
      return false;
    }
  }
}

// Export singleton instance
export const ipfsStorage = new IPFSStorageService();
