/**
 * Midnight Network Integration Library - V3 (DApp Connector API)
 *
 * Provides utilities for interacting with Midnight Network:
 * - Configuration
 * - Utility functions
 * - Contract deployment helpers
 *
 * NOTE: This file no longer imports contract runtime or providers directly
 * to avoid Vite bundling issues. See private-docs/ARCHITECTURE_REFACTOR.md
 */

import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

// ❌ REMOVED: Direct contract runtime imports (breaks Vite)
// import { Contract as EdgeChainContract, ledger } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';
// import type { Ledger } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';

// ❌ REMOVED: Provider function imports (version mismatches, not needed with DApp Connector)
// import { createFetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
// import { createHttpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
// import { createIndexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
// import { createLevelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

// ✅ NEW ARCHITECTURE:
// - Contract runs on Midnight blockchain (not in browser)
// - Browser uses DApp Connector API to submit transactions
// - No need for direct provider initialization

/**
 * Midnight Network Configuration
 */
export interface MidnightConfig {
  indexerUrl: string;
  indexerWs?: string;
  proofServerUrl?: string;
  nodeUrl?: string;
  contractAddress?: string;
}

/**
 * Get Midnight configuration from environment
 */
export function getMidnightConfig(): MidnightConfig {
  return {
    indexerUrl: import.meta.env.VITE_MIDNIGHT_INDEXER_URL || 'https://indexer.devnet.midnight.network',
    indexerWs: import.meta.env.VITE_MIDNIGHT_INDEXER_WS || 'wss://indexer.devnet.midnight.network',
    proofServerUrl: import.meta.env.VITE_MIDNIGHT_PROOF_SERVER,
    nodeUrl: import.meta.env.VITE_MIDNIGHT_NODE_URL || 'https://rpc.devnet.midnight.network',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  };
}

// ❌ REMOVED: createMidnightProviders - No longer needed with DApp Connector API
// The wallet connector handles all provider setup internally
// When we need providers in the future, we'll use the DApp Connector's built-in providers

// ❌ REMOVED: initializeEdgeChainContract - No longer importing contract runtime
// Contract execution happens on blockchain, not in browser
// We submit transactions via DApp Connector API instead

// ❌ REMOVED: parseLedgerState - No longer importing ledger types
// Ledger queries will use public data provider through DApp Connector

/**
 * Deploy EdgeChain contract (for initial deployment)
 */
export async function deployEdgeChainContract(
  walletApi: DAppConnectorAPI,
  contractBytecode: ArrayBuffer
): Promise<string> {
  console.log('🚀 Deploying EdgeChain contract...');
  console.log(`   Contract size: ${(contractBytecode.byteLength / 1024).toFixed(2)} KB`);

  try {
    // walletApi is already enabled by WalletProvider.connectWallet()
    // No need to call .enable() again
    console.log('✅ Using already-enabled Midnight API from WalletProvider');

    // TODO: Use Midnight.js deployment API when available
    // For now, this is a placeholder
    // Real implementation will be something like:
    // const deployment = await deployContract(walletApi, contractBytecode);
    // return deployment.contractAddress;

    throw new Error(
      'Contract deployment requires Midnight.js deployment API. ' +
      'Please use Midnight CLI or devnet deployment tools.'
    );
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

/**
 * Utility: Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Utility: Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Utility: Hash model weights (SHA-256)
 */
export async function hashModelWeights(weights: any): Promise<Uint8Array> {
  // Convert weights to JSON string
  const weightsStr = JSON.stringify(weights);

  // Create SHA-256 hash
  const msgUint8 = new TextEncoder().encode(weightsStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  return new Uint8Array(hashBuffer);
}
