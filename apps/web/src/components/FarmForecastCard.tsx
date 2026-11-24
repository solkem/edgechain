import { useEffect, useState } from 'react';
import { loadFarmForecast, reportFarmRain, setFarmForecastLocation } from '../agent/api';
import type { FarmForecastBriefing } from '../agent/types';

const buttonStyle = 'border border-black bg-white px-3 py-2 text-sm font-bold disabled:opacity-50';

export function FarmForecastCard({ farmId, shona = false }: { farmId: string; shona?: boolean }) {
  const [briefing, setBriefing] = useState<FarmForecastBriefing | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setBriefing(null);
    setError('');
    void loadFarmForecast(farmId, controller.signal)
      .then((forecast) => {
        if (!controller.signal.aborted) setBriefing(forecast);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(shona ? 'Zvakafanotaurwa nezvemamiriro ekunze hazviwanikwi izvozvi.' : 'Weather is unavailable right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [farmId, revision, shona]);

  function findLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is unavailable on this phone. You can still use the Odzi forecast.');
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(false);
        if (coords.accuracy > 2000) {
          setError('The phone could only find a broad location. Try again when you are outside.');
          return;
        }
        setPendingLocation({
          latitude: Math.round(coords.latitude * 100) / 100,
          longitude: Math.round(coords.longitude * 100) / 100,
        });
      },
      () => {
        setBusy(false);
        setError('Location could not be read. You can still use the Odzi forecast.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function saveLocation(location: typeof pendingLocation) {
    setBusy(true);
    setError('');
    try {
      await setFarmForecastLocation(farmId, location);
      setPendingLocation(null);
      setFeedback(false);
      setRevision((value) => value + 1);
    } catch {
      setError('Your forecast location could not be changed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function recordRain(observed: boolean) {
    if (!briefing) return;
    setBusy(true);
    setError('');
    try {
      await reportFarmRain(farmId, briefing.briefing_id, observed);
      setFeedback(true);
    } catch {
      setError('Your rain report could not be saved. Refresh the forecast and try again.');
    } finally {
      setBusy(false);
    }
  }

  const timeZone = briefing?.timezone ?? 'Africa/Harare';
  const clock = new Intl.DateTimeFormat('en-ZW', {
    timeZone, hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const localHour = new Intl.DateTimeFormat('en-ZW', {
    timeZone, hour: 'numeric', hourCycle: 'h23',
  });
  const zoneLabel = timeZone === 'Africa/Harare' ? 'Zimbabwe time' : timeZone;

  return (
    <section className="my-5 border-2 border-black bg-[#eff7ed] p-5" aria-label="Today’s weather">
      <h2 className="text-xl font-black">
        {briefing?.location === 'farm'
          ? (shona ? 'Mamiriro ekunze pamunda wenyu nhasi' : 'Today on your farm')
          : (shona ? 'Mamiriro ekunze kuOdzi nhasi' : 'Odzi area forecast')}
      </h2>
      <div role="status">
        {loading && <p className="mt-2">{shona ? 'Tiri kutarisa mamiriro ekunze anhasi…' : 'Checking today’s weather…'}</p>}
        {briefing && (
          <>
            <p className="mt-2 text-lg font-bold">
              {briefing.probability === 0
                ? (shona ? 'Mvura ingangosanaya nhasi.' : 'Rain looks unlikely for the rest of today.')
                : shona
                  ? `Mukana mukuru wekunaya kwemvura nhasi i${briefing.probability}% nenguva dza${clock.format(briefing.peak_time * 1000)}.`
                : `Highest rain chance from now: ${briefing.probability}% around ${clock.format(briefing.peak_time * 1000)}.`}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Checked {clock.format(new Date(briefing.checked_at))} · {zoneLabel} · Open-Meteo
            </p>
          </>
        )}
      </div>
      {pendingLocation ? (
        <div className="mt-3">
          <p className="mb-2 text-sm">Save this location to switch the forecast to your farm. EdgeChain uses your approximate location.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonStyle} disabled={busy} onClick={() => void saveLocation(pendingLocation)}>
              Yes, save my farm
            </button>
            <button type="button" className={buttonStyle} disabled={busy} onClick={() => setPendingLocation(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={buttonStyle} disabled={busy || loading} onClick={findLocation}>
            {briefing?.location === 'farm' ? 'Change farm location' : 'Use my location'}
          </button>
          {briefing?.location === 'farm' && (
            <button type="button" className={buttonStyle} disabled={busy} onClick={() => void saveLocation(null)}>
              Use Odzi area
            </button>
          )}
          <button type="button" className={buttonStyle} disabled={busy || loading} onClick={() => {
            setError('');
            setRevision((value) => value + 1);
          }}>Refresh</button>
        </div>
      )}
      {briefing?.location === 'farm' && Number(localHour.format(new Date())) >= 18 && (
        <div className="mt-4 border-t border-black/20 pt-3">
          {feedback ? <p role="status">Rain report saved.</p> : (
            <>
              <p className="mb-2 text-sm font-bold">Has it rained on your farm today?</p>
              <div className="flex gap-2">
                <button type="button" className={buttonStyle} disabled={busy} onClick={() => void recordRain(true)}>Yes</button>
                <button type="button" className={buttonStyle} disabled={busy} onClick={() => void recordRain(false)}>No</button>
              </div>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    </section>
  );
}
