export interface Wallet {
  address: string;
}

export interface Farmer {
  name: string;
  region: string;
  crops: string[];
  address: string;
  joinedAt: Date;
  accuracy: number;
}

export interface Submission {
  id: number;
  proof: string;
  time: Date;
}

export interface Message {
  id: number;
  sender: 'bot' | 'farmer';
  text: string;
  time: string;
}

export interface AppContextType {
  wallet: Wallet | null;
  farmer: Farmer | null;
  round: number;
  version: number;
  submissions: Submission[];
  aggregating: boolean;
  progress: number;
  setWallet: (wallet: Wallet | null) => void;
  setFarmer: (farmer: Farmer | null) => void;
  setRound: (round: number) => void;
  setVersion: (version: number) => void;
  setSubmissions: (submissions: Submission[]) => void;
  setAggregating: (aggregating: boolean) => void;
  setProgress: (progress: number) => void;
  submitUpdate: () => void;
  disconnect: () => void;
}

