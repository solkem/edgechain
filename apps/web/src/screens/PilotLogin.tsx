import { useState, type FormEvent } from 'react';
import { AgentApiError } from '../agent/api';

export function PilotLogin({
  onSubmit,
  onWalletAccess,
}: {
  onSubmit: (pilotCode: string, pin: string) => Promise<void>;
  onWalletAccess: () => void;
}) {
  const [pilotCode, setPilotCode] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(pilotCode, pin);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 flex items-center">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-blue-700">
            EdgeChain Odzi Pilot
          </p>
          <h1 className="max-w-2xl text-5xl font-black leading-[0.98] text-black md:text-7xl">
            Meet your farm’s Virtual Ndani Kit.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-700">
            Record today’s field conditions and see what the physical Ndani Kit
            will collect automatically when hardware is deployed.
          </p>
          <div className="mt-8 border-l-4 border-blue-700 pl-5 text-gray-700">
            You do not need a wallet to use Virtual Ndani Kit. The Farm Assistant
            supports you in Shona or English, and wallet learning remains optional.
          </div>
        </section>

        <section className="border-2 border-black bg-white p-7 shadow-[10px_10px_0_#000] md:p-9">
          <h2 className="text-3xl font-black text-black">Farmer access</h2>
          <p className="mt-2 text-gray-600">
            Enter the farmer number and PIN given during onboarding.
          </p>

          <form
            onSubmit={submit}
            autoComplete="off"
            className="mt-8 space-y-6"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Farmer number
              </span>
              <input
                name="edgechain-pilot-code"
                autoComplete="off"
                autoCapitalize="characters"
                data-1p-ignore
                data-lpignore="true"
                value={pilotCode}
                onChange={(event) => setPilotCode(event.target.value.toUpperCase())}
                placeholder="ODZI-001"
                className="w-full border-2 border-black px-4 py-4 text-xl font-semibold uppercase"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Personal PIN
              </span>
              <input
                name="edgechain-pilot-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                data-1p-ignore
                data-lpignore="true"
                pattern="[0-9]{4,8}"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="4–8 digits"
                className="w-full border-2 border-black px-4 py-4 text-xl tracking-[0.35em]"
                required
              />
            </label>

            {error && (
              <p role="alert" className="border-l-4 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-700 px-5 py-4 text-lg font-black text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Opening your farm…' : 'Open Virtual Ndani Kit'}
            </button>
          </form>

          <button
            type="button"
            onClick={onWalletAccess}
            className="mt-6 w-full border-2 border-black px-5 py-3 font-bold text-black hover:bg-black hover:text-white"
          >
            Use existing wallet access
          </button>
        </section>
      </div>
    </main>
  );
}

function friendlyError(error: unknown): string {
  if (error instanceof AgentApiError) {
    if (error.code === 'invalid_credentials') {
      return 'That farmer number or PIN is not correct.';
    }
    if (error.code === 'account_temporarily_locked') {
      return 'Too many attempts. Please wait 15 minutes or ask the coordinator for help.';
    }
  }
  return 'EdgeChain could not sign you in. Please try again or ask the coordinator.';
}
