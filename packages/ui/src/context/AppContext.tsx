import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AppContextType, Wallet, Farmer, Submission } from '../types/app';

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [round, setRound] = useState(5);
  const [version, setVersion] = useState(3);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [aggregating, setAggregating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (aggregating && progress < 100) {
      setTimeout(() => setProgress(p => Math.min(p + 5, 100)), 500);
    } else if (progress >= 100) {
      setTimeout(() => {
        setAggregating(false);
        setVersion(v => v + 1);
        setRound(r => r + 1);
        setProgress(0);
        setSubmissions([]);
      }, 2000);
    }
  }, [aggregating, progress]);

  const submitUpdate = () => {
    setSubmissions(prev => [...prev, {
      id: Date.now(),
      proof: `0x${Math.random().toString(16).slice(2, 10)}...`,
      time: new Date()
    }]);
  };

  const disconnect = () => {
    // Clear app state
    setWallet(null);
    setFarmer(null);

    // Clear farmer profile from localStorage
    // Note: wallet disconnection (midnightAddress, midnightNetwork) is handled by WalletProvider
    if (wallet?.address) {
      localStorage.removeItem(`farmer_${wallet.address}`);
    }
  };

  const contextValue: AppContextType = {
    wallet,
    farmer,
    round,
    version,
    submissions,
    aggregating,
    progress,
    setWallet,
    setFarmer,
    setRound,
    setVersion,
    setSubmissions,
    setAggregating,
    setProgress,
    submitUpdate,
    disconnect,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

