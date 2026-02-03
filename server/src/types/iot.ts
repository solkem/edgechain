/**
 * Arduino Integration Types
 */

export interface SignedReading {
  reading_json: string;
  signature: string; // hex
  device_pubkey: string; // hex
  timestamp: number; // when received by gateway
}

export interface ArduinoReading {
  t: number; // temperature in Celsius
  h: number; // humidity percentage
  ts: number; // device timestamp (seconds since boot)
}

export interface DeviceRegistration {
  device_pubkey: string;
  device_id?: string;
  registered_at: number;
  approved: boolean;
}

export interface MerkleProof {
  merkle_proof: string[];
  leaf_index: number;
  merkle_root: string;
}

export interface ZKProofRequest {
  reading_json: string;
  device_signature_r: string;
  device_signature_s: string;
  device_pubkey: string;
  merkle_proof: string[];
  leaf_index: number;
}

export interface ZKProofResult {
  proof: string;
  public_inputs: {
    global_root: string;
    data_hash: string;
    claim_nullifier: string;
    epoch: number;
  };
}

export interface VerificationResult {
  valid: boolean;
  reward?: number;
  reason?: string;
  datapoint_added?: boolean;
}
