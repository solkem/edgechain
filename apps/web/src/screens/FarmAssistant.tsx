import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AgentApiError,
  loadLatestAgentConversation,
  sendFarmManagerChatMessage,
} from '../agent/api';
import type {
  AgentChatMessage,
  PilotSession,
} from '../agent/types';
import { PilotBrand } from '../agent/PilotBrand';

export function FarmAssistant({
  session,
  onLogout,
}: {
  session: PilotSession;
  onLogout: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [farmId, setFarmId] = useState(session.farms[0]?.farm_id || '');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Mauya, ${session.farmer.display_name}. Ask me about your farm plan, crop, water, pests, or what to do next. I will use your EdgeChain farm memory.`,
      createdAt: new Date(),
    },
  ]);

  const selectedFarm = useMemo(
    () => session.farms.find((farm) => farm.farm_id === farmId),
    [session.farms, farmId]
  );

  useEffect(() => {
    if (!farmId) return;
    let active = true;
    void loadLatestAgentConversation(farmId)
      .then((result) => {
        if (!active || !result || result.messages.length === 0) return;
        setMessages(result.messages.map((message) => ({
          id: message.message_id,
          sender: message.direction === 'inbound' ? 'farmer' : 'agent',
          text: message.text,
          createdAt: new Date(message.created_at * 1000),
        })));
      })
      .catch(() => {
        if (active) {
          setError('EdgeChain could not restore the previous conversation.');
        }
      });
    return () => {
      active = false;
    };
  }, [farmId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || !farmId || sending) return;

    const clientMessageId = crypto.randomUUID();
    setMessages((current) => [...current, {
      id: clientMessageId,
      sender: 'farmer',
      text,
      createdAt: new Date(),
    }]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const result = await sendFarmManagerChatMessage({
        farmId,
        text,
      });
      const reply = [
        result.reply.answer,
        result.reply.shona_summary ? `\nShona: ${result.reply.shona_summary}` : '',
        result.reply.recommended_next_step
          ? `\nNext step: ${result.reply.recommended_next_step}`
          : '',
        result.reply.coordinator_review_required
          ? '\nCoordinator review recommended before taking risky or costly action.'
          : '',
      ].filter(Boolean).join('\n');
      setMessages((current) => [...current, {
        id: `${clientMessageId}-reply`,
        sender: 'agent',
        text: reply,
        createdAt: new Date(),
      }]);
    } catch (sendError) {
      setError(
        sendError instanceof AgentApiError
          && sendError.code === 'finish_guided_reading_first'
          ? 'Finish the guided Virtual Ndani Kit reading before submitting through the Farm Assistant.'
          : 'EdgeChain could not send this message yet. Please try again before leaving this screen.'
      );
    } finally {
      setSending(false);
    }
  };

  if (session.farms.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] flex items-center justify-center p-6">
        <section className="max-w-lg border-2 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
          <h1 className="text-3xl font-black">No farm assigned</h1>
          <p className="mt-4 text-gray-700">
            Ask the pilot coordinator to assign a farm to your farmer profile.
          </p>
          <button
            onClick={() => void onLogout().then(() => navigate('/pilot-login'))}
            className="mt-7 bg-black px-5 py-3 font-bold text-white"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 pb-6 pt-20 md:px-7">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-4 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] md:flex-row md:items-center md:justify-between">
          <div>
            <PilotBrand compact />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              <span className="mt-4 block">AI Farm Manager</span>
            </p>
            <h1 className="mt-1 text-3xl font-black">{session.farmer.display_name}</h1>
            <p className="text-sm text-gray-600">
              {selectedFarm?.display_name} · {selectedFarm?.site_id}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/virtual-ndani')}
              className="border-2 border-black bg-[#f1d34f] px-4 py-2 font-bold hover:bg-[#ffe46a]"
            >
              My Virtual Ndani Kit
            </button>
            {session.farms.length > 1 && (
              <select
                value={farmId}
                onChange={(event) => setFarmId(event.target.value)}
                className="border-2 border-black bg-white px-3 py-2 font-semibold"
              >
                {session.farms.map((farm) => (
                  <option key={farm.farm_id} value={farm.farm_id}>
                    {farm.display_name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => void onLogout().then(() => navigate('/pilot-login'))}
              className="border-2 border-black px-4 py-2 font-bold hover:bg-black hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="overflow-hidden border-2 border-black bg-white">
          <div className="border-b-2 border-black bg-blue-700 px-5 py-3 text-sm font-bold text-white">
            Your profile · weekly check-ins · AI plans · farm memory
          </div>
          <div
            className="h-[52vh] min-h-[360px] space-y-4 overflow-y-auto bg-[#fbfbf7] p-4 md:p-6"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'farmer' ? 'justify-end' : 'justify-start'}`}
              >
                <article
                  className={`max-w-[86%] border-2 border-black px-4 py-3 md:max-w-[70%] ${
                    message.sender === 'farmer'
                      ? 'bg-black text-white'
                      : 'bg-white text-black shadow-[4px_4px_0_#d1d5db]'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  <time className={`mt-2 block text-xs ${
                    message.sender === 'farmer' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </article>
              </div>
            ))}
            {sending && (
              <p className="text-sm font-semibold text-blue-700">
                EdgeChain is recording your message…
              </p>
            )}
          </div>

          <form onSubmit={submit} className="border-t-2 border-black bg-white p-4 md:p-5">
            {error && (
              <p role="alert" className="mb-3 border-l-4 border-red-700 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Ask about your farm plan, crop, water, pests, or next step..."
                className="min-h-16 flex-1 resize-none border-2 border-black px-4 py-3 text-lg"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-blue-700 px-8 py-4 text-lg font-black text-white hover:bg-blue-800 disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Do not send wallet passwords, recovery phrases, or personal secrets. Use the Weekly Farm Check-in screen for structured weekly records.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
