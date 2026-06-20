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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 pt-[65px]">
      <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-black mb-2">Create Your Profile</h1>
        <p className="text-gray-600 text-sm mb-8">Choose your privacy level - powered by Midnight ZK-Proofs</p>

        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Connected Wallet</p>
            <p className="text-xs text-black font-mono break-all">{address}</p>
          </div>

          {/* Privacy Level Selection */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-black font-semibold mb-4 text-base">Select Privacy Level</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => setPrivacyLevel('basic')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border hover:cursor-pointer ${
                  privacyLevel === 'basic' 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                Basic
              </button>
              <button
                onClick={() => setPrivacyLevel('enhanced')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border hover:cursor-pointer ${
                  privacyLevel === 'enhanced' 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                Enhanced
              </button>
              <button
                onClick={() => setPrivacyLevel('detailed')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border hover:cursor-pointer ${
                  privacyLevel === 'detailed' 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                Detailed
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-2 pt-2 border-t border-gray-200">
              {privacyLevel === 'basic' && (
                <>
                  <p className="font-semibold text-black">Maximum Privacy - Local-first model</p>
                  <p className="text-gray-600">Train on your data only. Works offline. Optionally contribute ZK-proofs to help others.</p>
                </>
              )}
              {privacyLevel === 'enhanced' && (
                <>
                  <p className="font-semibold text-black">Better Accuracy - Local + Global models</p>
                  <p className="text-gray-600">Merge your local model with crowd wisdom. Optional profile helps personalization.</p>
                </>
              )}
              {privacyLevel === 'detailed' && (
                <>
                  <p className="font-semibold text-black">Best Performance - Cohort learning via ZK-proofs</p>
                  <p className="text-gray-600">Learn from similar farms without revealing identity. Prove attributes privately.</p>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Privacy Fields - Optional basic profile */}
          {privacyLevel === 'enhanced' && (
            <>
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-sm text-black font-semibold mb-4">Optional: Basic Profile (helps personalization)</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Farm Name (optional)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={form.region}
                    onChange={e => setForm({...form, region: e.target.value})}
                    placeholder="Region (optional)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <div>
                    <label className="block text-sm text-black font-medium mb-2">Primary Crops (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {crops.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCrop(c)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            form.crops.includes(c) 
                              ? 'bg-black text-white border-black' 
                              : 'bg-white text-black border-gray-300 hover:border-gray-400'
                          }`}
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
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-sm text-black font-semibold mb-4">Optional: Basic Profile</h4>
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Farm Name (optional)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={form.region}
                    onChange={e => setForm({...form, region: e.target.value})}
                    placeholder="Region (optional)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <div>
                    <label className="block text-sm text-black font-medium mb-2">Primary Crops (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {crops.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCrop(c)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            form.crops.includes(c) 
                              ? 'bg-black text-white border-black' 
                              : 'bg-white text-black border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm text-black font-semibold mb-4">Optional: Farming Details (enables cohort learning)</h4>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Farm Size</label>
                    <select
                      value={form.farmSize}
                      onChange={e => setForm({...form, farmSize: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="<5">{'<'}5 hectares</option>
                      <option value="5-20">5-20 hectares</option>
                      <option value="20-50">20-50 hectares</option>
                      <option value=">50">{'>'}50 hectares</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Soil Type</label>
                    <select
                      value={form.soilType}
                      onChange={e => setForm({...form, soilType: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {soilTypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Irrigation Type</label>
                    <select
                      value={form.irrigationType}
                      onChange={e => setForm({...form, irrigationType: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {irrigationTypes.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Years Experience</label>
                    <input
                      type="number"
                      value={form.yearsExperience}
                      onChange={e => setForm({...form, yearsExperience: e.target.value})}
                      placeholder="Years"
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onSkip} 
              className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-black font-semibold py-3 rounded-lg transition-all hover:cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={() => onRegister({...form, privacyLevel})}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all hover:cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

