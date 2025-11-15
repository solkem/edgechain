import type { Submission } from '../types/app';

export function Aggregation({ 
  round, 
  submissions, 
  aggregating, 
  progress, 
  version, 
  onTrigger, 
  onBack 
}: { 
  round: number; 
  submissions: Submission[]; 
  aggregating: boolean; 
  progress: number; 
  version: number; 
  onTrigger: () => void; 
  onBack: () => void 
}) {
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

