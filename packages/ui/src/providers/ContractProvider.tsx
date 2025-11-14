/**
 * ContractProvider.tsx - V3 with DApp Connector API
 *
 * Provides access to the EdgeChain FL Smart Contract on Midnight Network.
 * Uses DApp Connector API for all contract interactions (no direct runtime imports).
 *
 * Architecture:
 * - Browser: UI, TensorFlow.js training, submit transactions via DApp Connector
 * - Midnight Blockchain: Contract runtime, execute circuits, store state
 *
 * See: private-docs/ARCHITECTURE_REFACTOR.md
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useWallet } from './WalletProvider';
import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

// ✅ NO direct contract runtime imports - those break Vite bundling!
// Contract execution happens on Midnight blockchain, not in browser.
// We only need type definitions for our ledger state.

/**
 * Ledger State Type
 * Represents the public state of our EdgeChain FL contract
 */
interface Ledger {
  currentRound: bigint;
  currentModelVersion: bigint;
  submissionCount: bigint;
  globalModelHash: Uint8Array;
  isAggregating: boolean;
}

// Declare global window type for Midnight API
declare global {
  interface Window {
    cardano?: {
      midnight?: {
        mnLace?: DAppConnectorAPI;
      };
      lace?: {
        mnLace?: DAppConnectorAPI;
      };
    };
  }
}

/**
 * Contract state and functions
 */
interface ContractContextType {
  // DApp Connector API instance
  connector: DAppConnectorAPI | null;

  // Current ledger state
  ledger: Ledger | null;

  // Is contract initialized?
  isInitialized: boolean;

  // Is contract deployed?
  isDeployed: boolean;

  // Contract address (if deployed)
  contractAddress: string | null;

  // Is contract currently processing a transaction?
  isProcessing: boolean;

  // Deployment function
  deployContract: () => Promise<string>;

  // Contract functions
  submitModel: (modelWeightHash: Uint8Array, datasetSize: number, accuracy: number) => Promise<boolean>;
  completeAggregation: (newModelHash: Uint8Array) => Promise<boolean>;
  getGlobalModelHash: () => Promise<Uint8Array>;
  checkAggregating: () => Promise<boolean>;

  // Ledger queries
  getCurrentRound: () => bigint;
  getCurrentModelVersion: () => bigint;
  getSubmissionCount: () => bigint;

  // Refresh ledger state
  refreshLedger: () => Promise<void>;

  // Errors
  error: string | null;
}

const ContractContext = createContext<ContractContextType | null>(null);

/**
 * Hook to access contract
 */
export function useContract() {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within ContractProvider');
  }
  return context;
}

/**
 * ContractProvider Component
 */
export function ContractProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [connector, setConnector] = useState<DAppConnectorAPI | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);

  // Check for existing contract address on mount
  useEffect(() => {
    const savedAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    if (savedAddress) {
      setContractAddress(savedAddress);
      setIsDeployed(true);
      console.log('📍 Contract address loaded from config:', savedAddress);
    } else {
      console.warn('⚠️  No contract address configured');
      console.warn('   Set VITE_CONTRACT_ADDRESS in .env after deployment');
    }
  }, []);

  /**
   * Initialize contract when wallet connects
   */
  useEffect(() => {
    if (!wallet.isConnected) {
      setConnector(null);
      setLedger(null);
      setIsInitialized(false);
      return;
    }

    initializeContract();
  }, [wallet.isConnected, wallet.address, contractAddress]);

  /**
   * Get DApp Connector API from WalletProvider
   *
   * WalletProvider already handles detecting and enabling the Midnight API
   * from the Lace Midnight Preview extension. We reuse that instead of
   * duplicating the detection logic.
   */
  const getDAppConnectorAPI = async (): Promise<DAppConnectorAPI | null> => {
    try {
      // Use WalletProvider's getMidnightApi() which already found and enabled the API
      const api = await wallet.getMidnightApi();
      console.log('✅ Got Midnight API from WalletProvider');
      return api;
    } catch (error: any) {
      console.warn('⚠️  Failed to get Midnight API:', error.message);
      return null;
    }
  };

  /**
   * Initialize the Midnight contract
   */
  const initializeContract = async () => {
    try {
      console.log('🔧 Initializing EdgeChain FL contract...');

      // Step 1: Get DApp Connector API
      const api = await getDAppConnectorAPI();
      if (!api) {
        console.warn('⚠️  Wallet API not available - using simulation mode');
        setSimulationMode(true);
        setIsInitialized(true);
        await initializeSimulationMode();
        return;
      }

      console.log('✅ DApp Connector API obtained');

      // Step 2: Check if contract is deployed
      if (!contractAddress) {
        console.warn('⚠️  No contract address - using simulation mode');
        setSimulationMode(true);
        setIsInitialized(true);
        await initializeSimulationMode();
        return;
      }

      // Step 3: Store connector and initialize ledger state
      try {
        setConnector(api);
        setSimulationMode(false);
        console.log('✅ DApp Connector ready (real mode)');

        // Initialize ledger state by querying public data
        await refreshLedger();
        setIsInitialized(true);
        setError(null);
      } catch (providerError: any) {
        console.error('⚠️  Connector initialization failed:', providerError);
        console.warn('   Falling back to simulation mode');
        setSimulationMode(true);
        await initializeSimulationMode();
        setIsInitialized(true);
        setError(`Using simulation mode: ${providerError.message}`);
      }
    } catch (err: any) {
      console.error('Contract initialization error:', err);
      setError(err.message);
      setIsInitialized(false);
    }
  };

  /**
   * Initialize simulation mode (for development/testing)
   */
  const initializeSimulationMode = async () => {
    console.log('🎭 Initializing simulation mode...');

    // Create mock ledger state
    const mockLedger: Ledger = {
      currentRound: BigInt(1),
      currentModelVersion: BigInt(0),
      submissionCount: BigInt(0),
      globalModelHash: new Uint8Array(32),
      isAggregating: false,
    };

    setLedger(mockLedger);
    console.log('✅ Simulation mode active');
  };

  /**
   * Deploy EdgeChain contract
   */
  const deployContract = async (): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🚀 Starting contract deployment...');

      const api = await getDAppConnectorAPI();
      if (!api) {
        throw new Error('Midnight DApp Connector API not available');
      }

      // Fetch compiled contract
      const response = await fetch('/edgechain.compact');
      if (!response.ok) {
        throw new Error(`Failed to load contract file: ${response.statusText}`);
      }

      const contractBytecode = await response.arrayBuffer();
      console.log(`✅ Contract loaded: ${(contractBytecode.byteLength / 1024).toFixed(2)} KB`);

      // Import deployment utilities
      const { deployEdgeChainContract } = await import('../lib/midnight');

      // Deploy contract
      const deployedAddress = await deployEdgeChainContract(api, contractBytecode);

      setContractAddress(deployedAddress);
      setIsDeployed(true);
      console.log('✅ Contract deployed:', deployedAddress);

      return deployedAddress;
    } catch (err: any) {
      console.error('❌ Deployment failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Submit model circuit
   */
  const submitModel = async (
    modelWeightHash: Uint8Array,
    datasetSize: number,
    accuracy: number
  ): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('📤 Submitting model to contract...');
      console.log(`   Hash: ${Array.from(modelWeightHash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);
      console.log(`   Dataset size: ${datasetSize}`);
      console.log(`   Accuracy: ${(accuracy * 100).toFixed(2)}%`);

      if (simulationMode || !connector) {
        // Simulation mode
        console.log('🎭 Simulating submitModel circuit...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update mock ledger
        if (ledger) {
          const newSubmissionCount = ledger.submissionCount + BigInt(1);
          setLedger({
            ...ledger,
            submissionCount: newSubmissionCount,
            isAggregating: newSubmissionCount >= BigInt(2),
          });
        }

        console.log('✅ Model submitted (simulated)');
        return true;
      }

      // Real contract call via DApp Connector API
      // NOTE: The actual implementation depends on whether we:
      // 1. Import contract instance and use connector.callTx.methodName()
      // 2. Use pure connector API without contract imports
      //
      // For now, we'll use a placeholder that documents the intended flow.
      // This will be updated once we have the contract compiled and can
      // import it without breaking Vite (using the new architecture).

      if (!contractAddress) {
        throw new Error('Contract address not set');
      }

      // TODO: Implement actual circuit call using one of these patterns:
      // Pattern 1 (if contract instance available):
      //   const contract = new EdgeChainContract.Contract(witnesses);
      //   const result = await contract.callTx.submitModel();
      //   await connector.submitTransaction(result);
      //
      // Pattern 2 (pure connector API, if supported):
      //   const result = await connector.callCircuit({
      //     contractAddress,
      //     method: 'submitModel',
      //     args: { modelWeightHash, datasetSize, accuracy }
      //   });

      console.warn('⚠️  Real contract calls not yet implemented');
      console.warn('   Using simulation mode for now');
      console.warn('   See private-docs/ARCHITECTURE_REFACTOR.md for next steps');

      throw new Error('Real contract integration pending - use simulation mode');

      await refreshLedger();
      return true;
    } catch (err: any) {
      console.error('Submit model error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Complete aggregation circuit
   */
  const completeAggregation = async (newModelHash: Uint8Array): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🌐 Completing aggregation...');
      console.log(`   New model hash: ${Array.from(newModelHash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);

      if (simulationMode || !connector) {
        // Simulation mode
        console.log('🎭 Simulating completeAggregation circuit...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update mock ledger
        if (ledger) {
          setLedger({
            ...ledger,
            currentRound: ledger.currentRound + BigInt(1),
            currentModelVersion: ledger.currentModelVersion + BigInt(1),
            globalModelHash: newModelHash,
            isAggregating: false,
            submissionCount: BigInt(0),
          });
        }

        console.log('✅ Aggregation completed (simulated)');
        return true;
      }

      // Real contract call via DApp Connector API
      // TODO: Implement when contract is ready
      console.warn('⚠️  Real contract calls not yet implemented');
      throw new Error('Real contract integration pending - use simulation mode');

      await refreshLedger();
      return true;
    } catch (err: any) {
      console.error('Complete aggregation error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get global model hash
   */
  const getGlobalModelHash = async (): Promise<Uint8Array> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    try {
      if (simulationMode || !connector) {
        return ledger?.globalModelHash || new Uint8Array(32);
      }

      // TODO: Query public ledger state via indexer
      // Real implementation would use public data provider to query ledger
      console.warn('⚠️  Real ledger queries not yet implemented');
      return ledger?.globalModelHash || new Uint8Array(32);
    } catch (err: any) {
      console.error('Get global model hash error:', err);
      throw err;
    }
  };

  /**
   * Check if aggregation is in progress
   */
  const checkAggregating = async (): Promise<boolean> => {
    if (!isInitialized) {
      return false;
    }

    try {
      if (simulationMode || !connector) {
        return ledger?.isAggregating || false;
      }

      // TODO: Query public ledger state via indexer
      console.warn('⚠️  Real ledger queries not yet implemented');
      return ledger?.isAggregating || false;
    } catch (err: any) {
      console.error('Check aggregating error:', err);
      return false;
    }
  };

  /**
   * Refresh ledger state
   */
  const refreshLedger = async (): Promise<void> => {
    if (!isInitialized) {
      return;
    }

    try {
      console.log('🔄 Refreshing ledger state...');

      if (simulationMode || !connector) {
        // Already have mock ledger in simulation mode
        console.log('✅ Ledger refreshed (simulation)');
        return;
      }

      // TODO: Real ledger query via public data provider
      // Implementation would use indexer-public-data-provider to query
      // the contract's public ledger state from the Midnight blockchain
      //
      // Example pattern:
      // const publicDataProvider = await createPublicDataProvider(config);
      // const ledgerState = await publicDataProvider.queryLedger(contractAddress);
      // setLedger(parseLedgerState(ledgerState));

      console.warn('⚠️  Real ledger queries not yet implemented');
      console.log('✅ Ledger refreshed (simulation fallback)');
    } catch (err: any) {
      console.error('Refresh ledger error:', err);
    }
  };

  /**
   * Ledger query helpers
   */
  const getCurrentRound = (): bigint => ledger?.currentRound || BigInt(1);
  const getCurrentModelVersion = (): bigint => ledger?.currentModelVersion || BigInt(0);
  const getSubmissionCount = (): bigint => ledger?.submissionCount || BigInt(0);

  // Provide contract context
  const contextValue: ContractContextType = {
    connector,
    ledger,
    isInitialized,
    isDeployed,
    contractAddress,
    isProcessing,
    deployContract,
    submitModel,
    completeAggregation,
    getGlobalModelHash,
    checkAggregating,
    getCurrentRound,
    getCurrentModelVersion,
    getSubmissionCount,
    refreshLedger,
    error,
  };

  return (
    <ContractContext.Provider value={contextValue}>
      {children}
    </ContractContext.Provider>
  );
}
