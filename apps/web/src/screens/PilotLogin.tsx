import { useEffect, useState, type FormEvent } from 'react';
import { AgentApiError } from '../agent/api';
import { PilotBrand } from '../agent/PilotBrand';

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
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleInvite] = useState(() => {
    const invite = new URLSearchParams(window.location.hash.slice(1)).get('google-invite');
    return invite && /^[A-Za-z0-9_-]{43}$/.test(invite) ? invite : null;
  });
  const googleFailed = new URLSearchParams(window.location.search).get('google') === 'failed';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/auth/google/status', { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setGoogleEnabled((await response.json()).enabled === true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);


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
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5">
          <PilotBrand compact />
        </div>

        <section className="border-2 border-black bg-white p-7 shadow-[10px_10px_0_#000] md:p-9">
          <h1 className="text-3xl font-black text-black">Farmer access</h1>
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
                placeholder="FARM-001"
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

          {googleFailed && (
            <p role="alert" className="mt-6 text-sm font-semibold text-red-800">
              Google sign-in failed. If you used an invitation, reopen it and select the invited Google account.
            </p>
          )}
          {googleEnabled && (
            <form method="post" action="/api/v1/auth/google/start" className="mt-6">
              {googleInvite && <input type="hidden" name="invite" value={googleInvite} />}
              <button type="submit" className="w-full border-2 border-black px-5 py-3 font-bold">
                {googleInvite ? 'Link your Google account' : 'Continue with Google'}
              </button>
            </form>
          )}

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
