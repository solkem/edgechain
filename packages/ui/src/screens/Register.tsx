import { useState } from 'react';

export function Register({ 
  address, 
  onRegister, 
  onSkip 
}: { 
  address: string; 
  onRegister: (data: { 
    name: string; 
    region: string; 
    crops: string[]; 
    privacyLevel?: string; 
    farmSize?: string; 
    soilType?: string; 
    irrigationType?: string; 
    yearsExperience?: string 
  }) => void; 
  onSkip: () => void 
}) {
  const [privacyLevel, setPrivacyLevel] = useState<'basic' | 'enhanced' | 'detailed'>('basic');
  const [form, setForm] = useState({
    name: '',
    region: '',
    crops: [] as string[],
    // Enhanced privacy data
    farmSize: '',
    soilType: '',
    irrigationType: '',
    yearsExperience: ''
  });
  const crops = ['Wheat', 'Corn', 'Rice', 'Soybeans', 'Cotton', 'Barley'];
  const soilTypes = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Peaty'];
  const irrigationTypes = ['Drip', 'Sprinkler', 'Flood', 'Rainfed'];

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
      <div className="max-w-2xl w-full bg-slate-800/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create Your Profile</h1>
        <p className="text-purple-200 text-sm mb-6">Choose your privacy level - powered by Midnight ZK-Proofs</p>

        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-xs text-purple-300 mb-1">Connected Wallet</p>
            <p className="text-xs text-white font-mono break-all">{address}</p>
          </div>

          {/* Privacy Level Selection */}
          <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🔐</span> Programmable Privacy Level
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setPrivacyLevel('basic')}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${privacyLevel === 'basic' ? 'bg-green-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
              >
                Basic
              </button>
              <button
                onClick={() => setPrivacyLevel('enhanced')}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${privacyLevel === 'enhanced' ? 'bg-yellow-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
              >
                Enhanced
              </button>
              <button
                onClick={() => setPrivacyLevel('detailed')}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${privacyLevel === 'detailed' ? 'bg-orange-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
              >
                Detailed
              </button>
            </div>
            <div className="text-xs text-purple-200 space-y-1">
              {privacyLevel === 'basic' && (
                <>
                  <p className="font-semibold">✓ Maximum Privacy - Local-first model</p>
                  <p className="text-purple-300">Train on your data only. Works offline. Optionally contribute ZK-proofs to help others.</p>
                </>
              )}
              {privacyLevel === 'enhanced' && (
                <>
                  <p className="font-semibold">✓ Better Accuracy - Local + Global models</p>
                  <p className="text-purple-300">Merge your local model with crowd wisdom. Optional profile helps personalization.</p>
                </>
              )}
              {privacyLevel === 'detailed' && (
                <>
                  <p className="font-semibold">✓ Best Performance - Cohort learning via ZK-proofs</p>
                  <p className="text-purple-300">Learn from similar farms without revealing identity. Prove attributes privately.</p>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Privacy Fields - Optional basic profile */}
          {privacyLevel === 'enhanced' && (
            <>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="text-sm text-yellow-300 mb-3 flex items-center gap-2">
                  <span>📝</span> Optional: Basic Profile (helps personalization)
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Farm Name (optional)"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={form.region}
                    onChange={e => setForm({...form, region: e.target.value})}
                    placeholder="Region (optional)"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  <div>
                    <label className="block text-sm text-yellow-200 mb-2">Primary Crops (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {crops.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCrop(c)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all ${form.crops.includes(c) ? 'bg-yellow-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Detailed Fields (only for detailed privacy level) */}
          {privacyLevel === 'detailed' && (
            <>
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <h4 className="text-sm text-orange-300 mb-3 flex items-center gap-2">
                  <span>📝</span> Optional: Basic Profile
                </h4>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Farm Name (optional)"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={form.region}
                    onChange={e => setForm({...form, region: e.target.value})}
                    placeholder="Region (optional)"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <div>
                    <label className="block text-sm text-orange-200 mb-2">Primary Crops (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {crops.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCrop(c)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all ${form.crops.includes(c) ? 'bg-orange-600 text-white' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-orange-500/30 pt-4">
                  <h4 className="text-sm text-orange-300 mb-3 flex items-center gap-2">
                    <span>📊</span> Optional: Farming Details (enables cohort learning)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-purple-200 mb-1">Farm Size</label>
                    <select
                      value={form.farmSize}
                      onChange={e => setForm({...form, farmSize: e.target.value})}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      <option value="<5">{'<'}5 hectares</option>
                      <option value="5-20">5-20 hectares</option>
                      <option value="20-50">20-50 hectares</option>
                      <option value=">50">{'>'}50 hectares</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-200 mb-1">Soil Type</label>
                    <select
                      value={form.soilType}
                      onChange={e => setForm({...form, soilType: e.target.value})}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      {soilTypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-200 mb-1">Irrigation Type</label>
                    <select
                      value={form.irrigationType}
                      onChange={e => setForm({...form, irrigationType: e.target.value})}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      {irrigationTypes.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-200 mb-1">Years Experience</label>
                    <input
                      type="number"
                      value={form.yearsExperience}
                      onChange={e => setForm({...form, yearsExperience: e.target.value})}
                      placeholder="Years"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onSkip} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all">Skip</button>
            <button
              onClick={() => onRegister({...form, privacyLevel})}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

