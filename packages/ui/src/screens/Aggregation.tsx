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
    <div className="min-h-screen bg-white text-black p-4 pt-[65px]">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-gray-600 hover:text-black"
        >
          ← Back to FL Training
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">🤖 Automatic Aggregation Process</h1>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Current Round: {round}</h2>
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Submissions</span>
                <span className="font-semibold text-black">{submissions.length}/847</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${(submissions.length / 847) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>✓</span>
              <span>All ZK-proofs verified on Midnight</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 space-y-4">
            <h3 className="text-lg font-semibold">How automatic aggregation works</h3>
            <div className="space-y-3 text-sm text-gray-600">
              {[
                'Farmers submit updates with ZK-proofs',
                'Midnight smart contract verifies proofs on-chain',
                'FedAvg runs automatically (weighted accuracy)',
                'New model computed—no central server needed',
                `Model v${version + 1} deployed for predictions`,
              ].map((text, idx) => (
                <div key={text} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
          {aggregating && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 space-y-3">
              <h3 className="text-lg font-semibold">⏳ Aggregation in progress</h3>
              <div>
                <div className="mb-2 flex justify-between text-sm text-gray-600">
                  <span>Computing weighted average…</span>
                  <span className="font-semibold text-black">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {progress >= 100 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>✓</span>
                  <span>Aggregation complete! Model v{version + 1} deployed.</span>
                </div>
              )}
            </div>
          )}
          {!aggregating && submissions.length > 0 && (
            <button
              onClick={onTrigger}
              className="w-full rounded-lg bg-black px-4 py-4 text-sm font-semibold text-white transition hover:bg-gray-900"
            >
              Trigger Aggregation (Demo)
            </button>
          )}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>✓</span> No Central Aggregator
            </h3>
            <p className="text-sm text-gray-600">
              Traditional FL depends on a trusted server. EdgeChain runs aggregation on the Midnight blockchain—transparent,
              verifiable, and trustless.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



