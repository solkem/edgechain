import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// Import the wallet hook we created
import { useWallet } from './providers/WalletProvider';

// Types
interface Wallet {
  address: string;
}

interface Farmer {
  name: string;
  region: string;
  crops: string[];
  address: string;
  joinedAt: Date;
  accuracy: number;
}

interface Submission {
  id: number;
  proof: string;
  time: Date;
}

interface Message {
  id: number;
  sender: 'bot' | 'farmer';
  text: string;
  time: string;
}

// Context to share state across routes
import { createContext, useContext, ReactNode } from 'react';

interface AppContextType {
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

const AppContext = createContext<AppContextType | null>(null);

function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

// Main App Component with Router
export default function EdgeChainApp() {
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
    setWallet(null);
    setFarmer(null);
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
          <Route path="/register" element={<RegisterRoute />} />
          <Route path="/selection" element={<SelectionRoute />} />
          <Route path="/train" element={<TrainRoute />} />
          <Route path="/aggregation" element={<AggregationRoute />} />
          <Route path="/predictions" element={<PredictionsRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

// Route Components
function LoginRoute() {
  const { setWallet, setFarmer } = useAppContext();
  const navigate = useNavigate();

  /**
   * Use the real wallet from WalletProvider instead of mock
   * This gives us:
   * - Real Lace wallet connection
   * - Wallet installation detection
   * - Actual wallet address from extension
   */
  const walletContext = useWallet();
  const {
    isConnected,
    address,
    isLaceInstalled,
    isConnecting,
    error,
    connectWallet,
  } = walletContext;

  /**
   * When wallet connects successfully, update AppContext
   * and navigate to registration or selection
   */
  useEffect(() => {
    if (isConnected && address) {
      // Update the app's wallet state
      setWallet({ address });

      // Check if farmer profile exists
      const saved = localStorage.getItem(`farmer_${address}`);
      if (saved) {
        const parsedFarmer = JSON.parse(saved);
        parsedFarmer.joinedAt = new Date(parsedFarmer.joinedAt);
        setFarmer(parsedFarmer);
        navigate('/selection');
      } else {
        navigate('/register');
      }
    }
  }, [isConnected, address]);

  /**
   * Pass wallet state and real connect function to Login component
   */
  return (
    <Login
      onConnect={connectWallet}
      isConnecting={isConnecting}
      isLaceInstalled={isLaceInstalled}
      error={error}
    />
  );
}

function RegisterRoute() {
  const { wallet, setFarmer } = useAppContext();
  const navigate = useNavigate();

  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  const register = (data: Omit<Farmer, 'address' | 'joinedAt' | 'accuracy'>) => {
    const newFarmer: Farmer = {
      ...data,
      address: wallet.address,
      joinedAt: new Date(),
      accuracy: 87
    };
    localStorage.setItem(`farmer_${wallet.address}`, JSON.stringify(newFarmer));
    setFarmer(newFarmer);
    navigate('/selection');
  };

  const skip = () => {
    const guest: Farmer = {
      name: 'Guest Farmer',
      region: 'Unknown',
      crops: [],
      address: wallet.address,
      joinedAt: new Date(),
      accuracy: 0
    };
    setFarmer(guest);
    navigate('/selection');
  };

  return <Register address={wallet.address} onRegister={register} onSkip={skip} />;
}

function SelectionRoute() {
  const { farmer, disconnect } = useAppContext();
  const navigate = useNavigate();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return (
    <Selection
      farmer={farmer}
      onFL={() => navigate('/train')}
      onAI={() => navigate('/predictions')}
      onDisconnect={() => {
        disconnect();
        navigate('/');
      }}
    />
  );
}

function TrainRoute() {
  const { farmer, wallet, round, version, submissions, submitUpdate, disconnect } = useAppContext();
  const navigate = useNavigate();

  if (!farmer || !wallet) {
    return <Navigate to="/" replace />;
  }

  return (
    <FLDashboard
      farmer={farmer}
      wallet={wallet}
      round={round}
      version={version}
      submissions={submissions}
      onSubmit={submitUpdate}
      onAggregation={() => navigate('/aggregation')}
      onAI={() => navigate('/predictions')}
      onDisconnect={() => {
        disconnect();
        navigate('/');
      }}
    />
  );
}

function AggregationRoute() {
  const { round, submissions, aggregating, progress, version, setAggregating, setProgress } = useAppContext();
  const navigate = useNavigate();

  return (
    <Aggregation
      round={round}
      submissions={submissions}
      aggregating={aggregating}
      progress={progress}
      version={version}
      onTrigger={() => { setAggregating(true); setProgress(0); }}
      onBack={() => navigate('/train')}
    />
  );
}

function PredictionsRoute() {
  const { farmer, disconnect } = useAppContext();
  const navigate = useNavigate();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return (
    <AIDashboard
      farmer={farmer}
      onFL={() => navigate('/train')}
      onDisconnect={() => {
        disconnect();
        navigate('/');
      }}
    />
  );
}

// Screen Components

/**
 * Login Component - Now with real Lace wallet integration!
 *
 * Props:
 * - onConnect: Function to connect Lace wallet
 * - isConnecting: Are we currently connecting?
 * - isLaceInstalled: Is Lace extension installed?
 * - error: Any error message to display
 */
function Login({
  onConnect,
  isConnecting = false,
  isLaceInstalled = true,
  error = null,
}: {
  onConnect: () => void;
  isConnecting?: boolean;
  isLaceInstalled?: boolean;
  error?: string | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/40 rounded-full mb-6">
            <span className="text-5xl">🌾</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">EdgeChain</h1>
          <p className="text-purple-200 text-lg">Federated Learning for Farmers</p>
          <p className="text-purple-300 text-sm mt-2">Powered by Midnight ZK-Proofs</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
          {/* Show error message if connection failed */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-200 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Show "Install Lace" button if not installed */}
          {!isLaceInstalled ? (
            <div className="mb-6">
              <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-200 text-sm mb-2">
                  ⚠️ Lace wallet is not installed
                </p>
                <p className="text-yellow-100 text-xs">
                  You need the Lace browser extension to use EdgeChain.
                </p>
              </div>
              <a
                href="https://www.lace.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-all"
              >
                Install Lace Wallet →
              </a>
            </div>
          ) : (
            /* Show connect button if Lace is installed */
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl mb-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Connecting...
                </span>
              ) : (
                'Connect Lace Wallet'
              )}
            </button>
          )}

          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-white font-semibold mb-4">What is EdgeChain?</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>✓ Get AI crop predictions via SMS ($0.10 each)</li>
              <li>✓ Vote on accuracy, improve models collectively</li>
              <li>✓ Earn tokens for participation</li>
              <li>✓ Private data with zero-knowledge proofs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Register({ address, onRegister, onSkip }: { address: string; onRegister: (data: { name: string; region: string; crops: string[] }) => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: '', region: '', crops: [] as string[] });
  const crops = ['Wheat', 'Corn', 'Rice', 'Soybeans', 'Cotton', 'Barley'];

  const toggleCrop = (crop: string) => {
    setForm({
      ...form,
      crops: form.crops.includes(crop)
        ? form.crops.filter(x => x !== crop)
        : [...form.crops, crop]
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create Your Profile</h1>
        <p className="text-purple-200 text-sm mb-6">Help us personalize your experience</p>
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-xs text-purple-300 mb-1">Connected Wallet</p>
            <p className="text-xs text-white font-mono break-all">{address}</p>
          </div>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            placeholder="Farm Name"
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <input
            type="text"
            value={form.region}
            onChange={e => setForm({...form, region: e.target.value})}
            placeholder="Region"
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <div>
            <label className="block text-sm text-purple-200 mb-2">Primary Crops</label>
            <div className="grid grid-cols-2 gap-2">
              {crops.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCrop(c)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${form.crops.includes(c) ? 'bg-purple-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onSkip} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all">Skip</button>
            <button onClick={() => onRegister(form)} disabled={!form.name || !form.region || !form.crops.length} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Selection({ farmer, onFL, onAI, onDisconnect }: { farmer: Farmer; onFL: () => void; onAI: () => void; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {farmer.name}</h1>
            <p className="text-purple-200 text-sm">{farmer.region}</p>
          </div>
          <button onClick={onDisconnect} className="px-4 py-2 bg-slate-800/60 text-white rounded-lg hover:bg-slate-800 transition-all">Disconnect</button>
        </div>
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">What would you like to do today?</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button onClick={onFL} className="bg-slate-800/60 border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 text-left transition-all transform hover:scale-105">
            <div className="w-16 h-16 bg-purple-600/40 rounded-full mb-4 flex items-center justify-center text-4xl">⚙️</div>
            <h3 className="text-2xl font-bold text-white mb-2">FL Training</h3>
            <p className="text-purple-200 text-sm">Download models, train locally, submit updates with ZK-proofs</p>
          </button>
          <button onClick={onAI} className="bg-slate-800/60 border-2 border-green-500/30 hover:border-green-500 rounded-2xl p-8 text-left transition-all transform hover:scale-105">
            <div className="w-16 h-16 bg-green-600/40 rounded-full mb-4 flex items-center justify-center text-4xl">🌾</div>
            <h3 className="text-2xl font-bold text-white mb-2">AI Predictions</h3>
            <p className="text-purple-200 text-sm">Get SMS predictions, vote on accuracy, track your impact</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function FLDashboard({ farmer, wallet, round, version, submissions, onSubmit, onAggregation, onAI, onDisconnect }: { farmer: Farmer; wallet: Wallet; round: number; version: number; submissions: Submission[]; onSubmit: () => void; onAggregation: () => void; onAI: () => void; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="bg-slate-900/80 border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, {farmer.name}</h1>
            <p className="text-sm text-purple-300">{farmer.region}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onAI} className="px-4 py-2 bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition-all text-sm">AI Predictions</button>
            <button onClick={onDisconnect} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all">Disconnect</button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Current Round</p>
            <p className="text-4xl font-bold text-purple-400">{round}</p>
          </div>
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Model Version</p>
            <p className="text-4xl font-bold text-blue-400">v{version}</p>
          </div>
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Member Since</p>
            <p className="text-2xl font-bold text-white">{farmer.joinedAt.toLocaleDateString()}</p>
          </div>
        </div>
        <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-500">✓</span>
            <h3 className="text-lg font-semibold text-white">Wallet Connected</h3>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4">
            <p className="text-xs text-purple-300 mb-1">Lace Address</p>
            <p className="text-sm text-white font-mono break-all">{wallet.address}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">📥 Download Model</button>
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">⚙️ Train Model</button>
          <button onClick={onSubmit} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">📤 Submit Update</button>
          <button onClick={onAggregation} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all">📊 View Aggregation</button>
        </div>
        {submissions.length > 0 && (
          <div className="mt-6 bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Submissions</h3>
            {submissions.slice(-3).reverse().map(s => (
              <div key={s.id} className="bg-slate-900/60 rounded-lg p-4 mb-2 flex justify-between items-center">
                <div>
                  <p className="text-sm text-white font-mono">{s.proof}</p>
                  <p className="text-xs text-purple-300 mt-1">{s.time.toLocaleString()}</p>
                </div>
                <span className="text-green-500">✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Aggregation({ round, submissions, aggregating, progress, version, onTrigger, onBack }: { round: number; submissions: Submission[]; aggregating: boolean; progress: number; version: number; onTrigger: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="text-purple-300 hover:text-purple-200 mb-6 transition-colors">← Back to FL Training</button>
        <div className="bg-slate-800/60 border border-purple-500/20 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6">🤖 Automatic Aggregation Process</h1>
          <div className="bg-slate-900/60 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Current Round: {round}</h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-300">Submissions</span>
                <span className="text-white font-semibold">{submissions.length}/847</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300" style={{width: `${(submissions.length/847)*100}%`}} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span>✓</span>
              <span>All ZK-Proofs Verified on Midnight</span>
            </div>
          </div>
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">How Automatic Aggregation Works:</h3>
            <div className="space-y-3 text-sm text-purple-100">
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0">1</span><p>Farmers submit updates with ZK-proofs</p></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0">2</span><p>Midnight smart contract verifies all proofs on-chain</p></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0">3</span><p>FedAvg algorithm runs automatically (weighted by accuracy)</p></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0">4</span><p>New model computed - no central party needed!</p></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0">5</span><p>Model v{version + 1} deployed for predictions</p></div>
            </div>
          </div>
          {aggregating && (
            <div className="bg-slate-900/60 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">⏳ Aggregation in Progress</h3>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Computing weighted average...</span>
                  <span className="text-white font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 h-3 rounded-full transition-all duration-300" style={{width: `${progress}%`}} />
                </div>
              </div>
              {progress >= 100 && <div className="flex items-center gap-2 text-green-400 mt-3"><span>✓</span><span>Aggregation Complete! New model v{version + 1} deployed</span></div>}
            </div>
          )}
          {!aggregating && submissions.length > 0 && (
            <button onClick={onTrigger} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all">Trigger Aggregation (Demo)</button>
          )}
          <div className="mt-6 bg-green-900/40 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><span>✓</span> No Central Aggregator</h3>
            <p className="text-sm text-green-100">Traditional FL uses a trusted central server to combine models. EdgeChain eliminates this single point of failure. All aggregation happens on Midnight blockchain via smart contracts - transparent, verifiable, and trustless.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIDashboard({ farmer, onFL, onDisconnect }: { farmer: Farmer; onFL: () => void; onDisconnect: () => void }) {
  const [tab, setTab] = useState('sms');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'bot', text: `👋 Welcome ${farmer.name}! Send "PREDICT maize rainfall:720 soil:loamy temp:22" to get crop predictions.`, time: '09:16 PM' }
  ]);

  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { id: Date.now(), sender: 'farmer', text: input, time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}) }]);
    const currentInput = input;
    setTimeout(() => {
      let resp = '';
      if (currentInput.toUpperCase().includes('PREDICT')) resp = '✅ Prediction for Maize:\nYield: 4.1 tons/hectare\nConfidence: 84%\nBest Planting: Apr 25, 2024\n\nCost: $0.10\n\n📊 Based on 10,000 farms (ZK-verified)\n💡 Reply "VOTE YES" or "VOTE NO" after harvest!';
      else if (currentInput.toUpperCase().includes('VOTE')) resp = '✅ Vote recorded on Midnight chain!\n\nResults announced tomorrow.\nIf accurate, earn 50 tokens!\n\n💰 Current balance: 250 tokens\n📈 Community accuracy: 78%';
      else resp = '❌ Unknown command. Reply "HELP" for options.';
      setMessages(m => [...m, { id: Date.now()+1, sender: 'bot', text: resp, time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}) }]);
    }, 1000);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">🌾 EdgeChain</h1>
            <p className="text-sm text-green-100">Welcome, {farmer.name}</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="text-right mr-3">
              <div className="text-xs text-green-100">Balance</div>
              <div className="text-lg font-bold">250 tokens</div>
            </div>
            <button onClick={onFL} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all">FL Training</button>
            <button onClick={onDisconnect} className="p-2 rounded-lg hover:bg-white/10 transition-all">Disconnect</button>
          </div>
        </div>
      </div>
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={() => setTab('sms')} className={`flex-1 px-4 py-3 font-medium transition-all ${tab === 'sms' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}>SMS Chat</button>
          <button onClick={() => setTab('history')} className={`flex-1 px-4 py-3 font-medium transition-all ${tab === 'history' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}>History</button>
          <button onClick={() => setTab('impact')} className={`flex-1 px-4 py-3 font-medium transition-all ${tab === 'impact' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}>Impact</button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-4">
        {tab === 'sms' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
              <p className="text-sm text-purple-800"><strong>Powered by Midnight ZK-Proofs:</strong> Your farm data stays private. Only proof of correctness is shared on-chain.</p>
            </div>
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'farmer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${m.sender === 'farmer' ? 'bg-green-600 text-white' : 'bg-white border-2 border-gray-200'}`}>
                    <p className="text-sm whitespace-pre-line">{m.text}</p>
                    <p className="text-xs mt-1 opacity-70">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t-2">
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type your message..." className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-full focus:border-green-500 focus:outline-none transition-colors" />
                <button onClick={send} className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition-all">→</button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">💡 Try: "PREDICT maize rainfall:720 soil:loamy temp:22"</p>
            </div>
          </div>
        )}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Your Predictions</h2>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex justify-between mb-4">
                <div><h3 className="text-xl font-bold">Maize</h3><p className="text-sm text-gray-500">Predicted: {new Date().toLocaleDateString()}</p></div>
                <div className="text-right"><div className="text-2xl font-bold text-green-600">4.1 tons/ha</div><div className="text-sm text-gray-500">Expected yield</div></div>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <span className="text-sm text-gray-600">Cost: <strong>$0.10</strong></span>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-all">Vote YES</button>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all">Vote NO</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'impact' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Impact Dashboard</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600">Income Increase</p>
                <p className="text-3xl font-bold text-green-600">+$400</p>
                <p className="text-xs text-gray-500 mt-1">Per year</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600">Predictions Used</p>
                <p className="text-3xl font-bold text-blue-600">24</p>
                <p className="text-xs text-gray-500 mt-1">This season</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600">Tokens Earned</p>
                <p className="text-3xl font-bold text-yellow-600">250</p>
                <p className="text-xs text-gray-500 mt-1">From voting</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">🔐 Privacy via Midnight ZK-Proofs</h3>
              <div className="space-y-2 text-sm">
                <p>✅ Your farm data never leaves your device</p>
                <p>✅ Only cryptographic proofs shared on-chain</p>
                <p>✅ Models improve without exposing private information</p>
                <p>✅ Mathematically guaranteed privacy</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">💰 Your ROI</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Annual Cost:</span>
                  <span className="font-semibold">$2.40</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Income Increase:</span>
                  <span className="font-semibold text-green-600">+$400/year</span>
                </div>
                <div className="border-t-2 border-blue-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-800">ROI:</span>
                  <span className="text-2xl font-bold text-green-600">16,567%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
