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

