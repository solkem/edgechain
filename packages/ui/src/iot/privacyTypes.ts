/**
 * EdgeChain Privacy Architecture Types
 *
 * Defines the 4-tier privacy architecture:
 * - L1: Raw Data (local device only, encrypted)
 * - L2: Features (temporary, deleted after use)
 * - L3: Gradients (encrypted on IPFS)
 * - L4: Commitments (public hashes on blockchain)
 */

// ==================== L1: RAW DATA ====================

export interface RawIoTReading {
  temperature: number;
  humidity: number;
  soil_moisture?: number;
  pH?: number;
  timestamp: number;
  device_id: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// ==================== L2: FEATURES ====================

/**
 * ML-ready features extracted from raw data
 * These are TEMPORARY - deleted immediately after local training
 */
export interface MLFeatures {
  // Normalized features (0-1 range, no raw values!)
  soil_moisture_normalized: number;
  temperature_normalized: number;
  humidity_normalized: number;
  pH_normalized?: number;

  // Derived features
  moisture_trend: number; // -1 (decreasing) to 1 (increasing)
  temperature_trend: number;
  humidity_trend: number;
  optimal_irrigation: boolean; // Computed locally

  // Temporal features
  hour_of_day: number; // 0-1
  day_of_week: number; // 0-1
  season: number; // 0-1 (0=summer, 0.5=winter)

  // Quality indicators
  reading_freshness: number; // 0-1 (how recent)
  sensor_stability: number; // 0-1 (variance check)
}

// ==================== L3: GRADIENTS ====================

/**
 * Federated Learning gradient bundle
 * Stored ENCRYPTED on IPFS
 */
export interface GradientBundle {
  round_id: number;
  gradients: number[][]; // Model weight updates (Δw)
  data_quality_score: number; // 0-100
  dataset_size: number; // Number of samples used for training
  timestamp: number;
  device_id: string; // For farmer's records only
}

/**
 * Encrypted gradient storage metadata
 */
export interface EncryptedGradientMetadata {
  ipfs_cid: string; // IPFS content identifier
  commitment: string; // Hash(gradients || farmer_key || round_id)
  round_id: number;
  encrypted_at: number;
  data_quality_score: number; // Public (used for rewards)
}

// ==================== L4: COMMITMENTS ====================

/**
 * On-chain commitment (public, but meaningless without private key)
 */
export interface OnChainCommitment {
  commitment: string; // Cryptographic hash
  nullifier: string; // Prevents double-claiming
  round_id: number;
  ipfs_cid: string; // Points to encrypted gradients
  merkle_proof?: string[]; // Proof of inclusion in batch
  timestamp: number;
}

/**
 * ZK proof for contribution verification
 */
export interface ZKContributionProof {
  proof: string; // Compact ZK proof
  public_inputs: {
    commitment: string;
    nullifier: string;
    round_id: number;
    data_quality_score: number;
    claimed_merkle_root: string;
  };
}

// ==================== PRIVACY LAYER METADATA ====================

/**
 * Privacy layer tracking (for debugging/audit)
 */
export interface PrivacyLayerMetadata {
  layer: 'L1' | 'L2' | 'L3' | 'L4';
  description: string;
  storage_location: string;
  encryption: 'AES-256-GCM' | 'none' | 'deleted';
  visibility: 'farmer_only' | 'encrypted' | 'public_hash' | 'deleted';
  data_retained: boolean;
}

export const PRIVACY_LAYERS: Record<string, PrivacyLayerMetadata> = {
  L1: {
    layer: 'L1',
    description: 'Raw IoT sensor readings',
    storage_location: 'Local device only (IndexedDB/localStorage)',
    encryption: 'AES-256-GCM',
    visibility: 'farmer_only',
    data_retained: true
  },
  L2: {
    layer: 'L2',
    description: 'Preprocessed ML features',
    storage_location: 'Temporary memory during training',
    encryption: 'deleted',
    visibility: 'deleted',
    data_retained: false // DELETED after training!
  },
  L3: {
    layer: 'L3',
    description: 'Model weight gradients',
    storage_location: 'IPFS (decentralized)',
    encryption: 'AES-256-GCM',
    visibility: 'encrypted',
    data_retained: true
  },
  L4: {
    layer: 'L4',
    description: 'Cryptographic commitments',
    storage_location: 'Midnight blockchain',
    encryption: 'none',
    visibility: 'public_hash',
    data_retained: true
  }
};

// ==================== FEDERATED LEARNING TYPES ====================

export interface FLRound {
  round_id: number;
  start_time: number;
  end_time: number;
  min_participants: number;
  current_participants: number;
  status: 'collecting' | 'aggregating' | 'completed';
  merkle_root?: string; // Root of all participant commitments
  global_model_cid?: string; // IPFS CID of aggregated model
}

export interface FarmerContribution {
  farmer_id: string; // Anonymous ID (hash of public key)
  round_id: number;
  commitment: string;
  nullifier: string;
  ipfs_cid: string;
  data_quality_score: number;
  reward_amount: number;
  claimed: boolean;
  submitted_at: number;
}

// ==================== REWARD CALCULATION ====================

export interface RewardCalculation {
  base_reward: number; // Base amount (e.g., 100 tDUST)
  quality_bonus: number; // Based on data_quality_score
  consistency_bonus: number; // Based on participation history
  total_reward: number;
}

// ==================== PRIVACY GUARANTEES ====================

/**
 * Summary of privacy guarantees for user display
 */
export interface PrivacyGuarantees {
  raw_data_privacy: {
    guaranteed: boolean;
    description: string;
  };
  device_anonymity: {
    guaranteed: boolean;
    description: string;
  };
  farm_location_privacy: {
    guaranteed: boolean;
    description: string;
  };
  temporal_unlinkability: {
    guaranteed: boolean;
    description: string;
  };
}

export const EDGECHAIN_PRIVACY_GUARANTEES: PrivacyGuarantees = {
  raw_data_privacy: {
    guaranteed: true,
    description: 'Raw IoT readings NEVER leave your device. Encrypted locally with AES-256-GCM.'
  },
  device_anonymity: {
    guaranteed: true,
    description: 'Zero-knowledge proofs hide your device identity. Only cryptographic commitments are public.'
  },
  farm_location_privacy: {
    guaranteed: true,
    description: 'GPS coordinates encrypted and stored locally only. Never transmitted over network.'
  },
  temporal_unlinkability: {
    guaranteed: true,
    description: 'Nullifiers change per round. Cannot track your farm activity over time.'
  }
};
