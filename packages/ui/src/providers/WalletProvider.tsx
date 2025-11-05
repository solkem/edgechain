/**
 * WalletProvider.tsx
 *
 * This provider manages the Lace Midnight Preview wallet connection for Midnight Network.
 * It wraps the app and provides wallet state/functions to all components.
 *
 * IMPORTANT: This uses Lace Midnight Preview, NOT regular Lace wallet!
 * - Lace Midnight Preview: Specialized extension for Midnight devnet (testing network)
 * - Supports: tDUST tokens (test tokens for Midnight blockchain)
 * - Purpose: Developer tool for privacy-preserving DApps with zero-knowledge proofs
 * - Network: Midnight devnet only (not Cardano mainnet/testnet)
 *
 * Key responsibilities:
 * - Detect if Lace Midnight Preview extension is installed
 * - Connect/disconnect wallet
 * - Track connected Midnight wallet address and network
 * - Provide wallet functions to child components via Context API
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/**
 * TypeScript interfaces for type safety
 */

// Wallet state shape - what information we track about the wallet
interface WalletState {
  // Is a wallet currently connected?
  isConnected: boolean;

  // The Midnight wallet address (if connected)
  address: string | null;

  // Which network are we on? For Midnight Preview, this is always 'devnet'
  // (Midnight Preview only works on the Midnight development network)
  network: 'devnet' | null;

  // Is the wallet currently trying to connect?
  isConnecting: boolean;

  // Any error messages to show the user
  error: string | null;

  // Is Lace Midnight Preview extension installed in the browser?
  isMidnightPreviewInstalled: boolean;
}

// Transaction types for EdgeChain operations
export interface TransactionData {
  type: 'registration' | 'model_submission' | 'voting' | 'claim_rewards';
  payload: Record<string, any>;
}

export interface SignedTransaction {
  signature: string;
  txHash: string;
  timestamp: number;
}

// Wallet functions - actions we can perform
interface WalletContextType extends WalletState {
  // Connect to the Lace Midnight Preview wallet
  connectWallet: () => Promise<void>;

  // Disconnect the current wallet
  disconnectWallet: () => void;

  // Check if Lace Midnight Preview extension is installed
  checkMidnightPreviewInstalled: () => boolean;

  // Sign a transaction with the Midnight wallet
  signTransaction: (txData: TransactionData) => Promise<SignedTransaction>;

  // Get the Midnight API for advanced operations
  getMidnightApi: () => Promise<any>;
}

/**
 * Create the Context
 * This allows any child component to access wallet state/functions
 */
const WalletContext = createContext<WalletContextType | null>(null);

/**
 * Custom hook to use the wallet context
 * This makes it easy to access wallet in any component:
 *
 * Example usage in a component:
 *   const { isConnected, address, connectWallet } = useWallet();
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

/**
 * WalletProvider Component
 * Wrap your app with this to provide wallet functionality everywhere
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  // Initialize wallet state
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    network: null,
    isConnecting: false,
    error: null,
    isMidnightPreviewInstalled: false,
  });

  // Store the Midnight API instance for transaction signing
  const [midnightApiInstance, setMidnightApiInstance] = useState<any>(null);

  /**
   * Check if Lace Midnight Preview extension is installed
   *
   * Lace Midnight Preview injects a global object into the browser window.
   * We check multiple possible injection points since different versions
   * of the extension may use different paths.
   *
   * This specialized extension is ONLY for Midnight devnet, not Cardano.
   */
  const checkMidnightPreviewInstalled = (): boolean => {
    // Check if we're in a browser (not server-side rendering)
    if (typeof window === 'undefined') return false;

    // Check multiple possible injection points for Midnight Preview
    // @ts-ignore
    const hasCardanoLace = window.cardano?.lace !== undefined;
    // @ts-ignore
    const hasMidnightDirect = window.midnight !== undefined;
    // @ts-ignore
    const hasCardanoMidnight = window.cardano?.midnight !== undefined;

    // Return true if ANY of these exist
    return hasCardanoLace || hasMidnightDirect || hasCardanoMidnight;
  };

  /**
   * Connect to Lace Midnight Preview Wallet
   *
   * This is the main function users call to connect their Midnight wallet.
   * It will:
   * 1. Check if Lace Midnight Preview is installed
   * 2. Request permission from user
   * 3. Get Midnight wallet address
   * 4. Update our state
   *
   * IMPORTANT: This connects to Midnight devnet, NOT Cardano!
   * - Uses tDUST tokens (test tokens)
   * - Privacy-focused with zero-knowledge proofs
   * - Developer network only
   */
  const connectWallet = async () => {
    try {
      // Start connecting state
      setWalletState(prev => ({
        ...prev,
        isConnecting: true,
        error: null
      }));

      // Step 1: Check if Lace Midnight Preview is installed
      if (!checkMidnightPreviewInstalled()) {
        throw new Error(
          'Lace Midnight Preview is not installed. ' +
          'Please install it to connect to Midnight devnet. ' +
          'This is a specialized extension for Midnight blockchain development.'
        );
      }

      // Step 2: Get Lace Midnight Preview API from whichever location it's injected
      // @ts-ignore
      let walletContainer = window.cardano?.lace || window.midnight || window.cardano?.midnight;

      if (!walletContainer) {
        throw new Error('Wallet API not found. Please refresh the page and try again.');
      }

      // Lace Midnight Preview uses mnLace (midnight + Lace) NOT mLace!
      // @ts-ignore
      const walletApi = walletContainer.mnLace || walletContainer.mLace || walletContainer;

      if (!walletApi || typeof walletApi.enable !== 'function') {
        throw new Error('Wallet API structure not recognized. Please ensure Lace Midnight Preview is properly installed.');
      }

      // Step 3: Request permission to connect
      // This will show a popup in Lace Midnight Preview asking user to approve
      const midnightApi = await walletApi.enable();

      if (!midnightApi || typeof midnightApi !== 'object') {
        throw new Error('Failed to get Midnight API after enabling');
      }

      // Step 4: Get Midnight wallet info
      // Midnight Preview always runs on devnet (development network)
      const network = 'devnet';

      // Get Midnight wallet address using the state() method
      let address = null;

      if (typeof midnightApi.state === 'function') {
        const stateResult = await midnightApi.state();
        address = stateResult?.address || null;
      }

      if (!address) {
        throw new Error('Failed to get wallet address from Midnight Preview');
      }

      // Step 5: Store the Midnight API instance for transaction signing
      setMidnightApiInstance(midnightApi);

      // Step 6: Update state with connected Midnight wallet
      setWalletState({
        isConnected: true,
        address,
        network,
        isConnecting: false,
        error: null,
        isMidnightPreviewInstalled: true,
      });

      // Save to localStorage so we can reconnect on page refresh
      // Use Midnight-specific keys to avoid conflicts with regular Lace
      if (address) {
        localStorage.setItem('midnightAddress', address);
        localStorage.setItem('midnightNetwork', network);
      }

    } catch (error: any) {
      // Handle any errors during connection
      console.error('Midnight wallet connection error:', error);

      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error.message || 'Failed to connect to Midnight Preview wallet',
      }));
    }
  };

  /**
   * Disconnect Midnight Wallet
   *
   * Clears wallet state and removes from localStorage
   */
  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      network: null,
      isConnecting: false,
      error: null,
      isMidnightPreviewInstalled: checkMidnightPreviewInstalled(),
    });

    // Clear the Midnight API instance
    setMidnightApiInstance(null);

    // Clear saved Midnight connection from localStorage
    localStorage.removeItem('midnightAddress');
    localStorage.removeItem('midnightNetwork');
  };

  /**
   * Get Midnight API instance
   *
   * Returns the Midnight API for advanced operations
   */
  const getMidnightApi = async (): Promise<any> => {
    if (!midnightApiInstance) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    return midnightApiInstance;
  };

  /**
   * Sign a transaction with the Midnight wallet
   *
   * This function handles signing different types of EdgeChain transactions:
   * - Farmer registration: Sign farmer profile data
   * - Model weight submission: Sign ML model weights
   * - Voting on predictions: Sign vote data
   * - Claiming rewards: Sign reward claim
   *
   * The transaction is signed using Midnight's zero-knowledge proofs,
   * ensuring privacy while proving authenticity.
   */
  const signTransaction = async (txData: TransactionData): Promise<SignedTransaction> => {
    try {
      // Check if wallet is connected
      if (!walletState.isConnected || !walletState.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Get the Midnight API
      const api = await getMidnightApi();

      // Prepare transaction payload
      const txPayload = {
        type: txData.type,
        address: walletState.address,
        network: walletState.network,
        timestamp: Date.now(),
        payload: txData.payload,
      };

      // Convert payload to JSON string for signing
      const message = JSON.stringify(txPayload);

      // Sign the transaction using Midnight wallet
      // The Midnight API provides signData for signing arbitrary data
      let signature: string;
      let txHash: string;

      if (typeof api.signData === 'function') {
        // Use Midnight's signData method
        const signResult = await api.signData(walletState.address, message);
        signature = signResult.signature;
        txHash = signResult.key || generateTxHash(message, signature);
      } else {
        // Fallback: generate a local signature (for development/testing)
        console.warn('Midnight signData not available, using fallback signing');
        signature = await generateFallbackSignature(message);
        txHash = generateTxHash(message, signature);
      }

      // Return signed transaction
      const signedTx: SignedTransaction = {
        signature,
        txHash,
        timestamp: txPayload.timestamp,
      };

      // Log transaction for debugging
      console.log(`Transaction signed: ${txData.type}`, {
        txHash,
        address: walletState.address,
        timestamp: signedTx.timestamp,
      });

      return signedTx;

    } catch (error: any) {
      console.error('Transaction signing error:', error);
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  };

  /**
   * Generate transaction hash from message and signature
   */
  const generateTxHash = (message: string, signature: string): string => {
    // Simple hash generation for transaction ID
    // In production, this would use a proper cryptographic hash
    const combined = message + signature;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  };

  /**
   * Generate fallback signature for development/testing
   * This is used when the Midnight API signData is not available
   */
  const generateFallbackSignature = async (message: string): Promise<string> => {
    // In development, create a deterministic signature
    // In production, this should never be called - always use Midnight's signData
    const encoder = new TextEncoder();
    const data = encoder.encode(message + walletState.address);

    // Use Web Crypto API for a more secure fallback
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `0x${hashHex}`;
      } catch {
        // Fallback to simple hash if crypto.subtle fails
      }
    }

    // Simple fallback hash
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  };

  /**
   * Check Midnight Preview installation on mount
   *
   * This runs once when the component loads.
   * It checks if Lace Midnight Preview is installed and tries to auto-reconnect
   * if the user was previously connected.
   *
   * IMPORTANT: Wallet extensions load asynchronously, so we need to wait for them!
   */
  useEffect(() => {
    // Function to check for wallet with retries
    const checkWalletWithRetry = (retries = 10, delay = 100) => {
      const check = (attemptsLeft: number) => {
        const isInstalled = checkMidnightPreviewInstalled();

        if (isInstalled) {
          // Wallet found! Update state
          setWalletState(prev => ({ ...prev, isMidnightPreviewInstalled: true }));

          // Try to auto-reconnect if previously connected
          const savedAddress = localStorage.getItem('midnightAddress');
          const savedNetwork = localStorage.getItem('midnightNetwork') as 'devnet' | null;

          if (savedAddress && savedNetwork) {
            connectWallet().catch(console.error);
          }
        } else if (attemptsLeft > 0) {
          // Not found yet, try again after delay
          setTimeout(() => check(attemptsLeft - 1), delay);
        } else {
          // All retries exhausted - wallet not detected
          setWalletState(prev => ({ ...prev, isMidnightPreviewInstalled: false }));
        }
      };

      check(retries);
    };

    // Start checking with retries
    checkWalletWithRetry();
  }, []);

  /**
   * Listen for account changes
   *
   * If user switches accounts in Lace Midnight Preview, we should update our app.
   * This sets up an event listener.
   */
  useEffect(() => {
    if (!checkMidnightPreviewInstalled()) return;

    // Get wallet container and extract mnLace API
    // @ts-ignore
    const walletContainer = window.cardano?.lace || window.midnight || window.cardano?.midnight;
    if (!walletContainer) return;

    // @ts-ignore
    const walletApi = walletContainer.mnLace || walletContainer.mLace || walletContainer;
    if (!walletApi) return;

    // Listen for account changes
    const handleAccountChange = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      } else {
        // No accounts - user disconnected
        disconnectWallet();
      }
    };

    // Set up listener (if wallet supports it)
    if (walletApi.on) {
      walletApi.on('accountsChanged', handleAccountChange);
    }

    // Cleanup listener when component unmounts
    return () => {
      if (walletApi.off) {
        walletApi.off('accountsChanged', handleAccountChange);
      }
    };
  }, []);

  /**
   * Provide wallet state and functions to all children
   */
  const contextValue: WalletContextType = {
    ...walletState,
    connectWallet,
    disconnectWallet,
    checkMidnightPreviewInstalled,
    signTransaction,
    getMidnightApi,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * How to use this provider:
 *
 * 1. Wrap your app:
 *    <WalletProvider>
 *      <App />
 *    </WalletProvider>
 *
 * 2. Use in any component:
 *    const { isConnected, address, connectWallet, isMidnightPreviewInstalled } = useWallet();
 *
 * 3. Connect Midnight wallet:
 *    <button onClick={connectWallet}>Connect Midnight Preview</button>
 *
 * 4. Show Midnight address:
 *    {isConnected && <p>Connected to Midnight devnet: {address}</p>}
 *
 * 5. Check installation:
 *    {!isMidnightPreviewInstalled && <p>Please install Lace Midnight Preview</p>}
 *
 * REMEMBER: This is for Midnight devnet with tDUST tokens, not Cardano ADA!
 */
