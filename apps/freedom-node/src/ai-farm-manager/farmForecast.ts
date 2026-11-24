const ODZI = { latitude: -18.96, longitude: 32.41 };

export interface ForecastLocation {
  latitude: number;
  longitude: number;
}

export function parseForecastLocation(input: Record<string, unknown>): ForecastLocation | null {
  const { latitude, longitude } = input;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90
    || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return null;
  }

  // A kilometre-scale forecast does not need a precise farm pin.
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}

export async function fetchFarmForecast(location: ForecastLocation | undefined) {
  const { latitude, longitude } = location ?? ODZI;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'precipitation_probability',
    forecast_days: '1',
    timezone: 'Africa/Harare',
    timeformat: 'unixtime',
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('Weather provider unavailable');

  const data = await response.json() as { hourly?: { time?: unknown; precipitation_probability?: unknown } } | null;
  const hourly = data?.hourly;
  if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.precipitation_probability)) {
    throw new Error('Invalid weather response');
  }
  const checkedAt = new Date();
  const currentHour = Math.floor(checkedAt.getTime() / 3600000) * 3600;
  const hours: { time: number; probability: number }[] = [];
  for (let index = 0; index < hourly.time.length; index += 1) {
    const time = hourly.time[index];
    const probability = hourly.precipitation_probability[index];
    if (typeof time === 'number' && Number.isFinite(time) && time >= currentHour
      && typeof probability === 'number' && Number.isFinite(probability)
      && probability >= 0 && probability <= 100) {
      hours.push({ time, probability });
    }
  }
  if (!hours.length) throw new Error('Weather provider returned no remaining hours');

  const peak = hours.reduce((highest, hour) =>
    hour.probability > highest.probability ? hour : highest);
  return {
    location: location ? 'farm' as const : 'odzi' as const,
    checked_at: checkedAt.toISOString(),
    peak_time: peak.time,
    probability: peak.probability,
    hours,
  };
}
