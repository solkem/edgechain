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
    <div className="min-h-screen bg-white p-4 pt-[65px]">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Welcome, {farmer.name}</h1>
            <p className="text-gray-600 text-sm">{farmer.region}</p>
          </div>
          <button 
            onClick={onDisconnect} 
            className="px-4 py-2 bg-white border border-gray-300 text-black rounded-lg hover:border-gray-400 transition-all hover:cursor-pointer"
          >
            Disconnect
          </button>
        </div>
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-black mb-3">What would you like to do today?</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <button 
            onClick={() => navigate('/arduino')} 
            className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-6 text-left transition-all hover:shadow-md hover:cursor-pointer"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-2xl">📡</span>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">Arduino IoT</h3>
            <p className="text-gray-600 text-sm">Collect sensor data from your farm</p>
          </button>
          <button 
            onClick={onFL} 
            className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-6 text-left transition-all hover:shadow-md hover:cursor-pointer"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">FL Training</h3>
            <p className="text-gray-600 text-sm">Standard federated learning</p>
          </button>
          <button 
            onClick={() => navigate('/train-privacy')} 
            className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-6 text-left transition-all hover:shadow-md hover:cursor-pointer relative"
          >
            <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-semibold">NEW</div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">Privacy FL</h3>
            <p className="text-gray-600 text-sm">4-tier privacy architecture</p>
          </button>
          <button 
            onClick={onAI} 
            className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-6 text-left transition-all hover:shadow-md hover:cursor-pointer"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-2xl">🌾</span>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">AI Predictions</h3>
            <p className="text-gray-600 text-sm">Get SMS predictions & vote</p>
          </button>
        </div>
      </div>
    </div>
  );
}

