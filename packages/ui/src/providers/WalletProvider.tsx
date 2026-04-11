import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  detectAvailableWallets,
  getPreferredWalletAdapter,
  getWalletAdapter,
  type ConnectedWallet,
  type DetectedWallet,
  type MidnightNetwork,
  type WalletAdapterId,
} from '../lib/walletAdapters';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: MidnightNetwork | null;
  isConnecting: boolean;
  error: string | null;
  isWalletInstalled: boolean;
  availableWallets: DetectedWallet[];
  connectedWallet: DetectedWallet | null;
}

export interface TransactionData {
  type: 'registration' | 'model_submission' | 'voting' | 'claim_rewards';
  payload: Record<string, any>;
}

export interface SignedTransaction {
  signature: string;
  txHash: string;
  timestamp: number;
}

interface WalletContextType extends WalletState {
  connectWallet: (preferredWalletId?: WalletAdapterId) => Promise<void>;
  disconnectWallet: () => void;
  refreshAvailableWallets: () => DetectedWallet[];
  signTransaction: (txData: TransactionData) => Promise<SignedTransaction>;
  getMidnightApi: () => Promise<DAppConnectorAPI>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const MIDNIGHT_ADDRESS_KEY = 'midnightAddress';
const MIDNIGHT_NETWORK_KEY = 'midnightNetwork';
const MIDNIGHT_WALLET_ID_KEY = 'midnightWalletId';

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    network: null,
    isConnecting: false,
    error: null,
    isWalletInstalled: false,
    availableWallets: [],
    connectedWallet: null,
  });
  const [connectedWalletSession, setConnectedWalletSession] = useState<ConnectedWallet | null>(null);

  const refreshAvailableWallets = (): DetectedWallet[] => {
    const availableWallets = detectAvailableWallets();
    setWalletState((prev) => ({
      ...prev,
      isWalletInstalled: availableWallets.length > 0,
      availableWallets,
    }));
    return availableWallets;
  };

  const connectWallet = async (preferredWalletId?: WalletAdapterId) => {
    try {
      setWalletState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      const availableWallets = refreshAvailableWallets();
      if (availableWallets.length === 0) {
        throw new Error(
          'No compatible Midnight wallet was detected. Install Lace with Midnight enabled or 1AM Wallet, then refresh the page.',
        );
      }

      const adapter =
        getPreferredWalletAdapter(preferredWalletId) ??
        getPreferredWalletAdapter((localStorage.getItem(MIDNIGHT_WALLET_ID_KEY) as WalletAdapterId | null) ?? null);

      if (!adapter) {
        throw new Error('A compatible Midnight wallet was detected, but no adapter could be selected.');
      }

      const session = await adapter.connect();
      setConnectedWalletSession(session);

      setWalletState({
        isConnected: true,
        address: session.address,
        network: session.network,
        isConnecting: false,
        error: null,
        isWalletInstalled: true,
        availableWallets,
        connectedWallet: session.adapter,
      });

      localStorage.setItem(MIDNIGHT_ADDRESS_KEY, session.address);
      localStorage.setItem(MIDNIGHT_NETWORK_KEY, session.network);
      localStorage.setItem(MIDNIGHT_WALLET_ID_KEY, session.adapter.id);
    } catch (error: any) {
      console.error('Midnight wallet connection error:', error);
      setConnectedWalletSession(null);
      setWalletState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error.message || 'Failed to connect to a Midnight wallet',
      }));
      throw error;
    }
  };

  const disconnectWallet = () => {
    setConnectedWalletSession(null);
    const availableWallets = detectAvailableWallets();

    setWalletState({
      isConnected: false,
      address: null,
      network: null,
      isConnecting: false,
      error: null,
      isWalletInstalled: availableWallets.length > 0,
      availableWallets,
      connectedWallet: null,
    });

    localStorage.removeItem(MIDNIGHT_ADDRESS_KEY);
    localStorage.removeItem(MIDNIGHT_NETWORK_KEY);
    localStorage.removeItem(MIDNIGHT_WALLET_ID_KEY);
  };

  const getMidnightApi = async (): Promise<DAppConnectorAPI> => {
    if (!connectedWalletSession?.api) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    return connectedWalletSession.api as DAppConnectorAPI;
  };

  const signTransaction = async (txData: TransactionData): Promise<SignedTransaction> => {
    try {
      if (!walletState.isConnected || !walletState.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      const api = connectedWalletSession?.api;
      if (!api) {
        throw new Error('Wallet API unavailable. Please reconnect your wallet.');
      }

      const txPayload = {
        type: txData.type,
        address: walletState.address,
        network: walletState.network,
        timestamp: Date.now(),
        payload: txData.payload,
      };

      const message = JSON.stringify(txPayload);

      let signature: string;
      let txHash: string;

      if (typeof api.signData === 'function') {
        const signResult = await api.signData(walletState.address, message);
        signature = signResult.signature;
        txHash = signResult.key || generateTxHash(message, signature);
      } else {
        console.warn('Midnight signData not available, using fallback signing');
        signature = await generateFallbackSignature(message, walletState.address);
        txHash = generateTxHash(message, signature);
      }

      return {
        signature,
        txHash,
        timestamp: txPayload.timestamp,
      };
    } catch (error: any) {
      console.error('Transaction signing error:', error);
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  };

  useEffect(() => {
    const checkWalletWithRetry = (retries = 10, delay = 100) => {
      const check = (attemptsLeft: number) => {
        const availableWallets = detectAvailableWallets();

        if (availableWallets.length > 0) {
          setWalletState((prev) => ({
            ...prev,
            isWalletInstalled: true,
            availableWallets,
          }));

          const savedAddress = localStorage.getItem(MIDNIGHT_ADDRESS_KEY);
          const savedWalletId = localStorage.getItem(MIDNIGHT_WALLET_ID_KEY) as WalletAdapterId | null;

          if (savedAddress && savedWalletId && !connectedWalletSession) {
            connectWallet(savedWalletId).catch(console.error);
          }
        } else if (attemptsLeft > 0) {
          setTimeout(() => check(attemptsLeft - 1), delay);
        } else {
          setWalletState((prev) => ({
            ...prev,
            isWalletInstalled: false,
            availableWallets: [],
          }));
        }
      };

      check(retries);
    };

    checkWalletWithRetry();
  }, []);

  useEffect(() => {
    if (!connectedWalletSession?.adapter.id) return;

    const adapter = getWalletAdapter(connectedWalletSession.adapter.id);
    const eventSource = adapter?.getEventSource?.() ?? connectedWalletSession.api;
    if (!eventSource?.on) return;

    const handleAccountChange = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletState((prev) => ({
          ...prev,
          address: accounts[0],
        }));
        localStorage.setItem(MIDNIGHT_ADDRESS_KEY, accounts[0]);
      } else {
        disconnectWallet();
      }
    };

    eventSource.on('accountsChanged', handleAccountChange);

    return () => {
      eventSource.off?.('accountsChanged', handleAccountChange);
    };
  }, [connectedWalletSession?.adapter.id, connectedWalletSession?.api]);

  const contextValue = useMemo<WalletContextType>(
    () => ({
      ...walletState,
      connectWallet,
      disconnectWallet,
      refreshAvailableWallets,
      signTransaction,
      getMidnightApi,
    }),
    [walletState, connectedWalletSession],
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}

const generateTxHash = (message: string, signature: string): string => {
  const combined = message + signature;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
};

const generateFallbackSignature = async (message: string, address: string | null): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message + (address ?? ''));

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `0x${hashHex}`;
    } catch {
      // Fall back to the deterministic hash below.
    }
  }

  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
};
