/**
 * WalletProvider.tsx
 *
 * This provider manages the Lace wallet connection for Midnight Network.
 * It wraps the app and provides wallet state/functions to all components.
 *
 * Key responsibilities:
 * - Detect if Lace wallet extension is installed
 * - Connect/disconnect wallet
 * - Track connected wallet address and network
 * - Provide wallet functions to child components via Context API
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * TypeScript interfaces for type safety
 */

// Wallet state shape - what information we track about the wallet
interface WalletState {
  // Is a wallet currently connected?
  isConnected: boolean;

  // The Midnight wallet address (if connected)
  address: string | null;

  // Which network are we on? (testnet or mainnet)
  network: 'testnet' | 'mainnet' | null;

  // Is the wallet currently trying to connect?
  isConnecting: boolean;

  // Any error messages to show the user
  error: string | null;

  // Is Lace wallet extension installed in the browser?
  isLaceInstalled: boolean;
}

// Wallet functions - actions we can perform
interface WalletContextType extends WalletState {
  // Connect to the Lace wallet
  connectWallet: () => Promise<void>;

  // Disconnect the current wallet
  disconnectWallet: () => void;

  // Check if Lace extension is installed
  checkLaceInstalled: () => boolean;
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
    isLaceInstalled: false,
  });

  /**
   * Check if Lace wallet extension is installed
   *
   * Lace injects a global object into the browser window.
   * We check for window.cardano.lace to detect the extension.
   */
  const checkLaceInstalled = (): boolean => {
    // Check if we're in a browser (not server-side rendering)
    if (typeof window === 'undefined') return false;

    // Check if Cardano object exists and has Lace
    // @ts-ignore - cardano is injected by Lace extension
    const hasLace = window.cardano?.lace !== undefined;

    return hasLace;
  };

  /**
   * Connect to Lace Wallet
   *
   * This is the main function users call to connect their wallet.
   * It will:
   * 1. Check if Lace is installed
   * 2. Request permission from user
   * 3. Get wallet address
   * 4. Update our state
   */
  const connectWallet = async () => {
    try {
      // Start connecting state
      setWalletState(prev => ({
        ...prev,
        isConnecting: true,
        error: null
      }));

      // Step 1: Check if Lace is installed
      if (!checkLaceInstalled()) {
        throw new Error('Lace wallet is not installed. Please install it from lace.io');
      }

      // Step 2: Get Lace API
      // @ts-ignore - cardano.lace is injected by extension
      const lace = window.cardano.lace;

      // Step 3: Request permission to connect
      // This will show a popup in Lace asking user to approve
      const isEnabled = await lace.enable();

      if (!isEnabled) {
        throw new Error('User denied wallet connection');
      }

      // Step 4: Get wallet info
      // Get the active network ID
      const networkId = await lace.getNetworkId();
      const network = networkId === 1 ? 'mainnet' : 'testnet';

      // Get wallet addresses
      const usedAddresses = await lace.getUsedAddresses();
      const unusedAddresses = await lace.getUnusedAddresses();

      // Use the first available address
      const addresses = [...usedAddresses, ...unusedAddresses];
      const address = addresses[0] || null;

      // Step 5: Update state with connected wallet
      setWalletState({
        isConnected: true,
        address,
        network,
        isConnecting: false,
        error: null,
        isLaceInstalled: true,
      });

      // Save to localStorage so we can reconnect on page refresh
      if (address) {
        localStorage.setItem('laceAddress', address);
        localStorage.setItem('laceNetwork', network);
      }

    } catch (error: any) {
      // Handle any errors during connection
      console.error('Wallet connection error:', error);

      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  };

  /**
   * Disconnect Wallet
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
      isLaceInstalled: checkLaceInstalled(),
    });

    // Clear saved connection
    localStorage.removeItem('laceAddress');
    localStorage.removeItem('laceNetwork');
  };

  /**
   * Check wallet installation on mount
   *
   * This runs once when the component loads.
   * It checks if Lace is installed and tries to auto-reconnect
   * if the user was previously connected.
   */
  useEffect(() => {
    // Check if Lace is installed
    const isInstalled = checkLaceInstalled();
    setWalletState(prev => ({ ...prev, isLaceInstalled: isInstalled }));

    // Try to auto-reconnect if previously connected
    const savedAddress = localStorage.getItem('laceAddress');
    const savedNetwork = localStorage.getItem('laceNetwork') as 'testnet' | 'mainnet' | null;

    if (savedAddress && savedNetwork && isInstalled) {
      // Auto-connect (silently try to restore connection)
      connectWallet().catch(console.error);
    }
  }, []);

  /**
   * Listen for account changes
   *
   * If user switches accounts in Lace, we should update our app.
   * This sets up an event listener.
   */
  useEffect(() => {
    if (!checkLaceInstalled()) return;

    // @ts-ignore
    const lace = window.cardano?.lace;
    if (!lace) return;

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

    // Set up listener (if Lace supports it)
    // Note: Check Lace docs for exact event name
    if (lace.on) {
      lace.on('accountsChanged', handleAccountChange);
    }

    // Cleanup listener when component unmounts
    return () => {
      if (lace.off) {
        lace.off('accountsChanged', handleAccountChange);
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
    checkLaceInstalled,
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
 *    const { isConnected, address, connectWallet } = useWallet();
 *
 * 3. Connect wallet:
 *    <button onClick={connectWallet}>Connect Wallet</button>
 *
 * 4. Show address:
 *    {isConnected && <p>Connected: {address}</p>}
 */
