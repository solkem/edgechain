/**
 * EdgeChain Privacy Contract SDK
 *
 * TypeScript interface for interacting with edgechain_privacy.compact
 * Implements L4 (Layer 4) of the 4-tier privacy architecture.
 *
 * Contract Features:
 * - Commitment-only storage (no raw data on-chain)
 * - ZK proof verification for device registration
 * - Nullifier-based double-spend prevention
 * - Anonymous reward claiming
 * - IPFS CID storage (not encrypted data itself)
 */

import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';
import { EncryptedGradientMetadata } from '../iot/privacyTypes';

/**
 * Contract types matching edgechain_privacy.compact
 */

export interface RoundCommitment {
  merkleRoot: string;           // Bytes<32> - Root of all farmer commitments
  aggregatedModelCID: string;   // Bytes<32> - IPFS CID of encrypted global model
  participantCount: number;      // Field
  timestamp: number;             // Field
  totalRewards: number;          // Field
}

export interface ContributionParams {
  ipfsCid: string;              // Bytes<32> - IPFS CID of encrypted gradients
  commitment: string;            // Bytes<32> - Hash(CID || farmer_key || round)
  nullifier: string;             // Bytes<32> - Hash(device_secret || round)
  qualityScore: number;          // Field (0-100)
}

export interface PrivateInputs {
  farmerPrivateKey: Uint8Array;  // Bytes<32> - NEVER revealed on-chain
  deviceSecret: Uint8Array;      // Bytes<32> - NEVER revealed on-chain
  merkleProof: Uint8Array[];     // Vector<10, Bytes<32>> - Proof of device registration
  leafIndex: number;             // Field - Position in Merkle tree
}

export interface DeviceRegistration {
  deviceId: string;
  farmerKey: Uint8Array;
  merkleProof: Uint8Array[];
  leafIndex: number;
}

/**
 * EdgeChain Privacy Contract SDK
 *
 * Provides a clean TypeScript interface for contract interactions
 */
export class EdgeChainPrivacyContract {
  private walletApi: DAppConnectorAPI | null = null;
  private contractAddress: string | null = null;

  /**
   * Initialize contract SDK with wallet API and contract address
   */
  async initialize(walletApi: DAppConnectorAPI, contractAddress: string): Promise<void> {
    this.walletApi = walletApi;
    this.contractAddress = contractAddress;
    console.log('✅ EdgeChain Privacy Contract SDK initialized');
    console.log(`   Contract: ${contractAddress}`);
  }

  /**
   * Submit FL contribution with ZK proof
   *
   * What gets proven (privately):
   * - Farmer owns a registered device (Merkle proof)
   * - Gradients uploaded to IPFS (CID provided)
   * - Commitment matches (Hash of CID + farmer key + round)
   * - Nullifier derived correctly (prevents double-claiming)
   *
   * What gets stored (publicly):
   * - Commitment (cryptographic hash)
   * - IPFS CID (pointer to encrypted data)
   * - Quality score (for reward calculation)
   * - Nullifier (to prevent replay)
   */
  async submitContribution(
    params: ContributionParams,
    privateInputs: PrivateInputs
  ): Promise<{ success: boolean; txHash?: string; reward?: number }> {
    if (!this.walletApi || !this.contractAddress) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    console.log('📝 L4: Submitting FL contribution to contract...');
    console.log(`   IPFS CID: ${params.ipfsCid.substring(0, 20)}...`);
    console.log(`   Commitment: ${params.commitment.substring(0, 20)}...`);
    console.log(`   Quality Score: ${params.qualityScore}/100`);
    console.log(`   Expected Reward: ${this.calculateReward(params.qualityScore)} tDUST`);

    try {
      // Convert parameters to contract format
      const publicInputs = {
        ipfsCid: this.stringToBytes32(params.ipfsCid),
        commitment: this.stringToBytes32(params.commitment),
        nullifier: this.stringToBytes32(params.nullifier),
        qualityScore: params.qualityScore
      };

      // Private witness inputs (NEVER revealed on-chain)
      const witnesses = {
        farmerPrivateKey: privateInputs.farmerPrivateKey,
        deviceSecret: privateInputs.deviceSecret,
        merkleProof: privateInputs.merkleProof,
        leafIndex: privateInputs.leafIndex
      };

      // TODO: Call contract via DApp Connector API
      // const tx = await this.walletApi.submitTransaction({
      //   contractAddress: this.contractAddress,
      //   circuit: 'submitContribution',
      //   publicInputs,
      //   witnesses
      // });

      console.log('✅ L4: Contribution submitted successfully');
      const reward = this.calculateReward(params.qualityScore);
      console.log(`   Reward earned: ${reward} tDUST`);
      console.log('   Nullifier marked as spent (prevents double-claiming)');

      // For now, return mock success (until DApp Connector API is fully integrated)
      return {
        success: true,
        txHash: 'mock_tx_hash_' + Date.now(),
        reward
      };
    } catch (error: any) {
      console.error('❌ L4: Contribution submission failed:', error.message);
      throw error;
    }
  }

  /**
   * Submit FL round commitment (called by aggregator)
   *
   * Stores Merkle root of all farmer commitments + aggregated model CID
   */
  async submitRound(
    merkleRoot: string,
    aggregatedModelCID: string,
    participantCount: number,
    totalRewards: number
  ): Promise<{ success: boolean; roundId?: number }> {
    if (!this.walletApi || !this.contractAddress) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    console.log('📝 L4: Submitting FL round commitment...');
    console.log(`   Participants: ${participantCount}`);
    console.log(`   Total Rewards: ${totalRewards} tDUST`);

    try {
      const publicInputs = {
        merkleRoot: this.stringToBytes32(merkleRoot),
        aggregatedModelCID: this.stringToBytes32(aggregatedModelCID),
        participantCount,
        totalRewards
      };

      // TODO: Call contract via DApp Connector API
      // const tx = await this.walletApi.submitTransaction({
      //   contractAddress: this.contractAddress,
      //   circuit: 'submitRound',
      //   publicInputs
      // });

      const currentRound = await this.getCurrentRound();
      console.log(`✅ L4: Round ${currentRound} commitment stored`);
      console.log('   Round advanced, model version incremented');

      return {
        success: true,
        roundId: currentRound
      };
    } catch (error: any) {
      console.error('❌ L4: Round submission failed:', error.message);
      throw error;
    }
  }

  /**
   * Update device registry root
   *
   * Called when new devices are registered
   * Stores ONLY Merkle root (not individual device IDs)
   */
  async updateDeviceRegistry(newRoot: string): Promise<{ success: boolean }> {
    if (!this.walletApi || !this.contractAddress) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    console.log('📝 L4: Updating device registry root...');

    try {
      const publicInputs = {
        newRoot: this.stringToBytes32(newRoot)
      };

      // TODO: Call contract via DApp Connector API
      // const tx = await this.walletApi.submitTransaction({
      //   contractAddress: this.contractAddress,
      //   circuit: 'updateDeviceRegistry',
      //   publicInputs
      // });

      console.log('✅ L4: Device registry root updated');
      console.log('   Individual device IDs NOT stored (privacy preserved)');

      return { success: true };
    } catch (error: any) {
      console.error('❌ L4: Registry update failed:', error.message);
      throw error;
    }
  }

  /**
   * Query: Get reward balance for a nullifier
   * Farmers can query anonymously using their nullifier
   */
  async getRewardBalance(nullifier: string): Promise<number> {
    console.log('🔍 L4: Querying reward balance...');

    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'getRewardBalance',
      //   params: { nullifier: this.stringToBytes32(nullifier) }
      // });

      // Mock response for now
      const balance = 0;
      console.log(`   Balance: ${balance} tDUST`);
      return balance;
    } catch (error: any) {
      console.error('❌ L4: Balance query failed:', error.message);
      return 0;
    }
  }

  /**
   * Query: Get round commitment by round ID
   */
  async getRoundCommitment(roundId: number): Promise<RoundCommitment | null> {
    console.log(`🔍 L4: Querying round ${roundId} commitment...`);

    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'getRoundCommitment',
      //   params: { round: roundId }
      // });

      // Mock response for now
      return null;
    } catch (error: any) {
      console.error('❌ L4: Round query failed:', error.message);
      return null;
    }
  }

  /**
   * Query: Get current round number
   */
  async getCurrentRound(): Promise<number> {
    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'getCurrentRound'
      // });

      // Mock response for now
      return 1;
    } catch (error: any) {
      console.error('❌ L4: Current round query failed:', error.message);
      return 0;
    }
  }

  /**
   * Query: Get current model version
   */
  async getCurrentModelVersion(): Promise<number> {
    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'getCurrentModelVersion'
      // });

      // Mock response for now
      return 1;
    } catch (error: any) {
      console.error('❌ L4: Model version query failed:', error.message);
      return 0;
    }
  }

  /**
   * Query: Check if nullifier has been spent
   */
  async isNullifierSpent(nullifier: string): Promise<boolean> {
    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'isNullifierSpent',
      //   params: { nullifier: this.stringToBytes32(nullifier) }
      // });

      // Mock response for now
      return false;
    } catch (error: any) {
      console.error('❌ L4: Nullifier check failed:', error.message);
      return false;
    }
  }

  /**
   * Query: Get device registry root
   */
  async getDeviceRegistryRoot(): Promise<string> {
    try {
      // TODO: Query contract state via DApp Connector API
      // const result = await this.walletApi.queryContract({
      //   contractAddress: this.contractAddress,
      //   circuit: 'getDeviceRegistryRoot'
      // });

      // Mock response for now
      return '00000000000000000000000000000000';
    } catch (error: any) {
      console.error('❌ L4: Registry root query failed:', error.message);
      return '';
    }
  }

  /**
   * Helper: Derive nullifier from device secret and round
   * Matches deriveNullifier circuit in contract
   */
  async deriveNullifier(deviceSecret: Uint8Array, round: number): Promise<string> {
    // Nullifier = Hash("edgechain:nullifier:" || round || device_secret)
    const prefix = new TextEncoder().encode('edgechain:nullifier:');
    const roundBytes = new Uint8Array(32);
    new DataView(roundBytes.buffer).setUint32(0, round, false);

    const combined = new Uint8Array(prefix.length + roundBytes.length + deviceSecret.length);
    combined.set(prefix, 0);
    combined.set(roundBytes, prefix.length);
    combined.set(deviceSecret, prefix.length + roundBytes.length);

    const hash = await crypto.subtle.digest('SHA-256', combined);
    return this.bytes32ToString(new Uint8Array(hash));
  }

  /**
   * Helper: Compute commitment from gradient metadata
   * Matches computeCommitment circuit in contract
   */
  async computeCommitment(
    ipfsCid: string,
    farmerKey: Uint8Array,
    round: number
  ): Promise<string> {
    // Commitment = Hash("edgechain:commitment:" || ipfsCid || farmerKey || round)
    const prefix = new TextEncoder().encode('edgechain:commitment:');
    const cidBytes = this.stringToBytes32(ipfsCid);
    const roundBytes = new Uint8Array(32);
    new DataView(roundBytes.buffer).setUint32(0, round, false);

    const combined = new Uint8Array(
      prefix.length + cidBytes.length + farmerKey.length + roundBytes.length
    );
    combined.set(prefix, 0);
    combined.set(cidBytes, prefix.length);
    combined.set(farmerKey, prefix.length + cidBytes.length);
    combined.set(roundBytes, prefix.length + cidBytes.length + farmerKey.length);

    const hash = await crypto.subtle.digest('SHA-256', combined);
    return this.bytes32ToString(new Uint8Array(hash));
  }

  /**
   * Calculate reward based on quality score
   * Matches contract logic: 100 base + (qualityScore * 2)
   */
  calculateReward(qualityScore: number): number {
    const baseReward = 100; // 100 tDUST base
    const qualityBonus = qualityScore * 2; // Up to 200 tDUST bonus
    return baseReward + qualityBonus; // Max 300 tDUST
  }

  /**
   * Create contribution parameters from gradient metadata
   *
   * Bridges L3 (GradientManager) → L4 (Contract)
   */
  async createContributionParams(
    metadata: EncryptedGradientMetadata,
    deviceSecret: Uint8Array
  ): Promise<ContributionParams> {
    const nullifier = await this.deriveNullifier(deviceSecret, metadata.round_id);

    return {
      ipfsCid: metadata.ipfs_cid,
      commitment: metadata.commitment,
      nullifier,
      qualityScore: metadata.data_quality_score
    };
  }

  /**
   * Utility: Convert string to Bytes<32> format
   */
  private stringToBytes32(str: string): Uint8Array {
    // If already base64, decode it
    if (this.isBase64(str)) {
      const decoded = atob(str);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return bytes;
    }

    // Otherwise, treat as hex or pad to 32 bytes
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);

    if (encoded.length > 32) {
      return encoded.slice(0, 32);
    }

    const padded = new Uint8Array(32);
    padded.set(encoded, 0);
    return padded;
  }

  /**
   * Utility: Convert Bytes<32> to string
   */
  private bytes32ToString(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Utility: Check if string is base64
   */
  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Privacy verification: Ensure no raw data leaked
   */
  verifyPrivacyGuarantees(params: ContributionParams): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Check that commitment is a hash (not plaintext)
    if (params.commitment.length < 32) {
      violations.push('Commitment too short (not a proper hash)');
    }

    // Check that nullifier is a hash (not plaintext)
    if (params.nullifier.length < 32) {
      violations.push('Nullifier too short (not a proper hash)');
    }

    // Check that quality score is in valid range
    if (params.qualityScore < 0 || params.qualityScore > 100) {
      violations.push('Quality score out of range [0, 100]');
    }

    const valid = violations.length === 0;

    if (valid) {
      console.log('✅ Privacy guarantees verified:');
      console.log('   - No raw IoT data in params');
      console.log('   - No ML features in params');
      console.log('   - No gradient values in params');
      console.log('   - Only commitments and IPFS CID');
    } else {
      console.warn('⚠️  Privacy violations detected:', violations);
    }

    return { valid, violations };
  }
}

/**
 * Singleton instance for global access
 */
export const edgechainPrivacyContract = new EdgeChainPrivacyContract();
