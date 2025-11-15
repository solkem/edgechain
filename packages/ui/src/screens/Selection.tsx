import { useNavigate } from 'react-router-dom';
import type { Farmer } from '../types/app';

export function Selection({ 
  farmer, 
  onFL, 
  onAI, 
  onDisconnect 
}: { 
  farmer: Farmer; 
  onFL: () => void; 
  onAI: () => void; 
  onDisconnect: () => void 
}) {
  const navigate = useNavigate();

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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <button onClick={() => navigate('/arduino')} className="bg-slate-800/60 border-2 border-teal-500/30 hover:border-teal-500 rounded-2xl p-6 text-left transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-teal-600/40 rounded-full mb-3 flex items-center justify-center text-3xl">🌡️</div>
            <h3 className="text-xl font-bold text-white mb-2">Arduino IoT</h3>
            <p className="text-purple-200 text-xs">Collect sensor data from your farm</p>
          </button>
          <button onClick={onFL} className="bg-slate-800/60 border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-6 text-left transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-purple-600/40 rounded-full mb-3 flex items-center justify-center text-3xl">⚙️</div>
            <h3 className="text-xl font-bold text-white mb-2">FL Training</h3>
            <p className="text-purple-200 text-xs">Standard federated learning</p>
          </button>
          <button onClick={() => navigate('/train-privacy')} className="bg-slate-800/60 border-2 border-pink-500/30 hover:border-pink-500 rounded-2xl p-6 text-left transition-all transform hover:scale-105 relative">
            <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs px-2 py-1 rounded-full font-bold">NEW</div>
            <div className="w-14 h-14 bg-pink-600/40 rounded-full mb-3 flex items-center justify-center text-3xl">🔐</div>
            <h3 className="text-xl font-bold text-white mb-2">Privacy FL</h3>
            <p className="text-purple-200 text-xs">4-tier privacy architecture</p>
          </button>
          <button onClick={onAI} className="bg-slate-800/60 border-2 border-green-500/30 hover:border-green-500 rounded-2xl p-6 text-left transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-green-600/40 rounded-full mb-3 flex items-center justify-center text-3xl">🌾</div>
            <h3 className="text-xl font-bold text-white mb-2">AI Predictions</h3>
            <p className="text-purple-200 text-xs">Get SMS predictions & vote</p>
          </button>
        </div>
      </div>
    </div>
  );
}

