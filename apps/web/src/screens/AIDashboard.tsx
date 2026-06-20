import { useState } from 'react';
import type { Farmer, Message } from '../types/app';

export function AIDashboard({ 
  farmer, 
  onFL, 
  onDisconnect 
}: { 
  farmer: Farmer; 
  onFL: () => void; 
  onDisconnect: () => void 
}) {
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
    <div className="min-h-screen bg-white text-black p-4 pt-[65px]">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>🌾</span> EdgeChain
            </h1>
            <p className="text-sm text-gray-600">Welcome, {farmer.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-gray-500">Balance</div>
              <div className="text-lg font-semibold">250 tokens</div>
            </div>
            <button
              onClick={onFL}
              className="rounded-lg border border-gray-900 bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-900"
            >
              FL Training
            </button>
            <button
              onClick={onDisconnect}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:border-gray-400"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white flex overflow-hidden">
          {[
            { key: 'sms', label: 'SMS Chat' },
            { key: 'history', label: 'History' },
            { key: 'impact', label: 'Impact' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                tab === key ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
        {tab === 'sms' && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
              <p className="text-sm text-gray-800">
                <strong>Powered by Midnight ZK-proofs:</strong> Your farm data stays local; only correctness proofs reach the chain.
              </p>
            </div>
            <div className="h-96 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'farmer' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                      m.sender === 'farmer'
                        ? 'bg-black text-white'
                        : 'bg-white border border-gray-200 text-black'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    <p className="mt-1 text-xs text-gray-400">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder='Type your message... e.g. "PREDICT maize ..."'
                  className="flex-1 rounded-full border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={send}
                  className="rounded-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900"
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">💡 Try: "PREDICT maize rainfall:720 soil:loamy temp:22"</p>
            </div>
          </div>
        )}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Predictions</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Maize</h3>
                  <p className="text-sm text-gray-600">Predicted: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-black">4.1 tons/ha</div>
                  <div className="text-sm text-gray-500">Expected yield</div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                <span>
                  Cost: <strong>$0.10</strong>
                </span>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-gray-900 bg-black px-4 py-2 text-white text-sm font-semibold hover:bg-gray-900">
                    Vote YES
                  </button>
                  <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:border-gray-400">
                    Vote NO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'impact' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Impact Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Income Increase', value: '+$400', meta: 'Per year' },
                { label: 'Predictions Used', value: '24', meta: 'This season' },
                { label: 'Tokens Earned', value: '250', meta: 'From voting' },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p className="text-3xl font-bold text-black">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.meta}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">🔐 Privacy via Midnight ZK-proofs</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Your farm data never leaves your device</li>
                <li>• Only cryptographic proofs are shared on-chain</li>
                <li>• Models improve without exposing private info</li>
                <li>• Privacy is mathematically guaranteed</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">💰 Your ROI</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Annual cost</span>
                  <span className="font-semibold text-black">$2.40</span>
                </div>
                <div className="flex justify-between">
                  <span>Income increase</span>
                  <span className="font-semibold text-black">+$400/year</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-black">
                  <span className="font-bold">ROI</span>
                  <span className="text-2xl font-bold">16,567%</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

