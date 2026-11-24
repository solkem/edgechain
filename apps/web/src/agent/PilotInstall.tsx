import { useEffect, useState } from 'react';

type InstallPrompt = Event & { prompt(): Promise<unknown> };

export function PilotInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt>();
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function handleInstalled() {
      setInstalled(true);
      setPrompt(undefined);
    }
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed || (!prompt && !isAppleMobile && !isAndroid)) return null;

  return (
    <details className="mt-5 border-t border-gray-300 pt-3 text-sm">
      <summary className="cursor-pointer font-bold">Add Ndani Kit to your phone</summary>
      {prompt ? (
        <button type="button" className="mt-2 border border-black px-3 py-2 font-bold"
          onClick={() => {
            setPrompt(undefined);
            void prompt.prompt().catch(() => {});
          }}
        >
          Install Ndani Kit
        </button>
      ) : (
        <p className="mt-2">
          {isAppleMobile
            ? 'Open this page in Safari. Tap Share, then Add to Home Screen.'
            : 'Open this page in Chrome. Tap the three-dot menu, then Install app or Add to Home screen.'}
        </p>
      )}
    </details>
  );
}
