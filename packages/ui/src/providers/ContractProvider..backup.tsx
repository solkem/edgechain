/**
 * ContractProvider.tsx
 *
 * Provides access to the EdgeChain FL Smart Contract on Midnight Network.
 * Handles contract initialization, circuit calls, and ledger state queries.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useWallet } from './WalletProvider';
import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

// Import the compiled Midnight contract
// @ts-ignore - Contract types will be available after compilation
import type { Contract, Ledger } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';

// Declare global window type for Midnight API
// Extended from WalletProvider types to include additional paths
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
  // Contract instance
  contract: Contract<any> | null;

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
  submitModel: () => Promise<boolean>;
  completeAggregation: () => Promise<boolean>;
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
  const [contract, setContract] = useState<Contract<any> | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing contract address on mount
  useEffect(() => {
    const savedAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    if (savedAddress) {
      setContractAddress(savedAddress);
      setIsDeployed(true);
    }
  }, []);

  /**
   * Initialize contract when wallet connects
   */
  useEffect(() => {
    if (!wallet.isConnected) {
      setContract(null);
      setLedger(null);
      setIsInitialized(false);
      return;
    }

    initializeContract();
  }, [wallet.isConnected, wallet.address]);

  /**
   * Initialize the Midnight contract
   *
   * DEPLOYMENT ROADMAP:
   * ====================
   *
   * 1. Install Required Packages (add to package.json):
   *    - @midnight-ntwrk/midnight-js-contracts
   *    - @midnight-ntwrk/midnight-js-node-provider
   *    - @midnight-ntwrk/midnight-js-http-client-provider
   *    - @midnight-ntwrk/midnight-js-proof-provider
   *    - @midnight-ntwrk/midnight-js-utils
   *
   * 2. Deploy Contract to Midnight Devnet:
   *    $ cd packages/contract
   *    $ yarn compact deploy --network devnet
   *    # Save the contract address from output
   *
   * 3. Update Environment Config:
   *    - Create .env with VITE_CONTRACT_ADDRESS=<deployed_address>
   *    - Add VITE_MIDNIGHT_INDEXER_URL=https://indexer.devnet.midnight.network
   *    - Add VITE_MIDNIGHT_NODE_URL=https://rpc.devnet.midnight.network
   *
   * 4. Configure ZK Keys (already done in build script):
   *    - Keys copied to dist/keys/ during build
   *    - zkir copied to dist/zkir/ during build
   *
   * 5. Real Implementation Code (replace TODO below):
   *    ```typescript
   *    import { Contract } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';
   *    import { createZkConfigProvider } from '@midnight-ntwrk/midnight-js-contracts';
   *    import { createHttpClientProvider } from '@midnight-ntwrk/midnight-js-http-client-provider';
   *    import { createProofProvider } from '@midnight-ntwrk/midnight-js-proof-provider';
   *
   *    const zkConfigProvider = await createZkConfigProvider({
   *      keysPath: '/keys/',
   *      zkirPath: '/zkir/'
   *    });
   *
   *    const indexerProvider = createHttpClientProvider(
   *      import.meta.env.VITE_MIDNIGHT_INDEXER_URL
   *    );
   *
   *    const proofProvider = createProofProvider(zkConfigProvider);
   *
   *    const providers = {
   *      zkConfigProvider,
   *      indexerProvider,
   *      proofProvider,
   *      walletProvider: api // From getDAppConnectorAPI()
   *    };
   *
   *    const contractInstance = await Contract.deploy(
   *      providers,
   *      import.meta.env.VITE_CONTRACT_ADDRESS
   *    );
   *
   *    setContract(contractInstance);
   *    ```
   */
  const initializeContract = async () => {
    try {
      console.log('🔧 Initializing EdgeChain FL contract...');

      // Step 1: Get DApp Connector API from Lace Midnight Preview wallet
      const api = await getDAppConnectorAPI();
      if (!api) {
        throw new Error('Midnight DApp Connector API not available. Please install Lace Midnight Preview wallet.');
      }

      console.log('✅ DApp Connector API obtained');

      // Step 2: Initialize Midnight Providers
      // TODO: Once contract is deployed and Midnight.js packages are installed,
      // replace this section with the code from the roadmap comment above

      console.log('⚠️  Contract providers pending configuration');
      console.log('   Next steps:');
      console.log('   1. Install Midnight.js packages (see roadmap comment)');
      console.log('   2. Deploy contract to Midnight devnet');
      console.log('   3. Configure environment variables');
      console.log('   4. Initialize providers with deployed contract address');

      setIsInitialized(true);
      setError(null);
    } catch (err: any) {
      console.error('Contract initialization error:', err);
      setError(err.message);
      setIsInitialized(false);
    }
  };

  /**
   * Get DApp Connector API from Lace Midnight Preview wallet
   */
  const getDAppConnectorAPI = async (): Promise<DAppConnectorAPI | null> => {
    // Check multiple possible locations for the Midnight API
    // (Lace Midnight Preview may inject at different paths)

    // Path 1: window.cardano.midnight.mnLace
    if (window.cardano?.midnight?.mnLace) {
      console.log('Found Midnight API at window.cardano.midnight.mnLace');
      return window.cardano.midnight.mnLace;
    }

    // Path 2: window.cardano.lace.mnLace
    if (window.cardano?.lace?.mnLace) {
      console.log('Found Midnight API at window.cardano.lace.mnLace');
      return window.cardano.lace.mnLace;
    }

    // Path 3: Check WalletProvider's detected API (from window.midnight)
    // The WalletProvider already handles window.midnight.mnLace detection
    // We can access it through the wallet context if needed

    console.warn('Midnight DApp Connector API not found in cardano namespace');
    console.warn('Make sure Lace Midnight Preview wallet is installed and enabled');
    return null;
  };

  /**
   * Deploy EdgeChain contract to Midnight devnet
   *
   * This function deploys the compiled Compact contract using the connected wallet.
   * The wallet will prompt the user to approve the transaction.
   *
   * @returns Contract address
   */
  const deployContract = async (): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected. Please connect your Lace Midnight Preview wallet first.');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🚀 Starting contract deployment...');

      // Step 1: Get DApp Connector API
      const api = await getDAppConnectorAPI();
      if (!api) {
        throw new Error('Midnight DApp Connector API not available. Please install Lace Midnight Preview wallet.');
      }

      console.log('✅ DApp Connector API obtained');

      // Step 2: Enable wallet (may prompt user if not already approved)
      console.log('🔓 Requesting wallet access...');
      const enabledWallet = await api.enable();
      console.log('✅ Wallet access granted');

      // Step 3: Fetch compiled contract bytecode
      console.log('📦 Loading contract bytecode...');

      // The contract file is copied to dist during build
      // We need to fetch it from the public directory
      const response = await fetch('/edgechain.compact');
      if (!response.ok) {
        throw new Error(`Failed to load contract file: ${response.statusText}`);
      }

      const contractBytecode = await response.arrayBuffer();
      console.log(`✅ Contract loaded: ${(contractBytecode.byteLength / 1024).toFixed(2)} KB`);

      // Step 4: Deploy contract via wallet
      console.log('📡 Submitting deployment transaction...');
      console.log('   → Wallet will prompt for approval');

      // TODO: Once Midnight.js deployment API is finalized, use:
      // const tx = await enabledWallet.deployContract(contractBytecode);
      // const receipt = await tx.wait();
      // const deployedAddress = receipt.contractAddress;

      // For now, show instructions to user
      console.log('⚠️  Deployment API integration pending');
      console.log('   The contract is compiled and ready at: /edgechain.compact');
      console.log('');
      console.log('   Manual deployment steps:');
      console.log('   1. Ensure you have tDUST tokens: https://faucet.devnet.midnight.network');
      console.log('   2. Use Midnight CLI or browser deployment tool');
      console.log('   3. Save contract address to .env file');

      throw new Error('Contract deployment requires manual setup. See console for instructions.');

      // Placeholder for when API is available:
      // setContractAddress(deployedAddress);
      // setIsDeployed(true);
      // console.log('✅ Contract deployed successfully!');
      // console.log(`   Address: ${deployedAddress}`);
      // return deployedAddress;

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
   * Called by farmer after training local model
   */
  const submitModel = async (): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    if (!contract) {
      throw new Error('Contract instance not available');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('📤 Calling submitModel circuit...');

      // Real implementation:
      // 1. Prepare circuit inputs (witnesses - private data)
      const witnesses = {
        // TODO: Add actual witness data when implementing ZK-proofs
        // This would include:
        // - Model weight hash
        // - Proof of minimum dataset size
        // - Proof of minimum accuracy threshold
      };

      // 2. Generate ZK-proof and submit transaction
      console.log('   ⚡ Generating ZK-proof for model submission...');

      // TODO: Once contract is deployed, this will be:
      // const result = await contract.submitModel(witnesses);
      // await result.wait(); // Wait for transaction confirmation

      // For now, simulate the process
      console.log('   📡 Submitting proof to Midnight contract...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('✅ Model submitted to contract');

      // 3. Refresh ledger state to get updated counters
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
   * Called by backend after FedAvg computation
   */
  const completeAggregation = async (): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    if (!contract) {
      throw new Error('Contract instance not available');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🌐 Calling completeAggregation circuit...');

      // Real implementation:
      // 1. Prepare circuit inputs (witnesses - private data)
      const witnesses = {
        // TODO: Add actual witness data when implementing ZK-proofs
        // This would include:
        // - New global model hash
        // - Proof of valid FedAvg computation
        // - Aggregation metadata
      };

      // 2. Generate ZK-proof and submit transaction
      console.log('   ⚡ Generating ZK-proof for aggregation result...');

      // TODO: Once contract is deployed, this will be:
      // const result = await contract.completeAggregation(witnesses);
      // await result.wait(); // Wait for transaction confirmation

      // For now, simulate the process
      console.log('   📡 Updating global model on-chain...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('✅ Aggregation completed on-chain');

      // 3. Refresh ledger state to get updated version and round
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
   * Get global model hash from contract
   */
  const getGlobalModelHash = async (): Promise<Uint8Array> => {
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }

    if (!contract) {
      throw new Error('Contract instance not available');
    }

    try {
      console.log('📥 Querying global model hash from contract...');

      // TODO: Once contract is deployed, this will be:
      // const result = await contract.getGlobalModelHash({});
      // return result.value; // Returns Bytes<32>

      // For now, return from cached ledger state
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

    if (!contract) {
      console.warn('Contract instance not available');
      return false;
    }

    try {
      // TODO: Once contract is deployed, this will be:
      // const result = await contract.checkAggregating({});
      // return result.value; // Returns Boolean

      // For now, return from cached ledger state
      return ledger?.isAggregating || false;
    } catch (err: any) {
      console.error('Check aggregating error:', err);
      return false;
    }
  };

  /**
   * Refresh ledger state from contract
   */
  const refreshLedger = async (): Promise<void> => {
    if (!isInitialized) {
      return;
    }

    try {
      console.log('🔄 Refreshing contract ledger state...');

      // TODO: Real implementation will query ledger from contract
      // For now, create mock ledger state
      const mockLedger: Ledger = {
        currentRound: BigInt(1),
        currentModelVersion: BigInt(0),
        submissionCount: BigInt(0),
        globalModelHash: new Uint8Array(32),
        isAggregating: false,
      };

      setLedger(mockLedger);
      console.log('✅ Ledger state refreshed');
    } catch (err: any) {
      console.error('Refresh ledger error:', err);
    }
  };

  /**
   * Ledger query helpers
   */
  const getCurrentRound = (): bigint => {
    return ledger?.currentRound || BigInt(1);
  };

  const getCurrentModelVersion = (): bigint => {
    return ledger?.currentModelVersion || BigInt(0);
  };

  const getSubmissionCount = (): bigint => {
    return ledger?.submissionCount || BigInt(0);
  };

  // Provide contract context
  const contextValue: ContractContextType = {
    contract,
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
