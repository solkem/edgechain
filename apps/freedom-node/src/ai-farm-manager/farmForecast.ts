import { db } from '../database';

const ODZI = { latitude: -18.96, longitude: 32.41 };
const ODZI_TIME_ZONE = 'Africa/Harare';

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

export async function loadFarmForecast(farmerId: string, farmId: string, days: 1 | 2 | 7 = 1) {
  const { rows } = await db.query(
    'SELECT latitude, longitude FROM farm_forecast_locations WHERE farmer_id = $1 AND farm_id = $2',
    [farmerId, farmId]
  );
  return fetchFarmForecast(rows[0], days).catch(() => null);
}

export async function fetchFarmForecast(location: ForecastLocation | undefined, days: 1 | 2 | 7 = 1) {
  const { latitude, longitude } = location ?? ODZI;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'precipitation_probability',
    forecast_days: String(days),
    timezone: location ? 'auto' : ODZI_TIME_ZONE,
    timeformat: 'unixtime',
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('Weather provider unavailable');

  const data = await response.json() as {
    timezone?: unknown;
    hourly?: { time?: unknown; precipitation_probability?: unknown };
  } | null;
  const hourly = data?.hourly;
  if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.precipitation_probability)) {
    throw new Error('Invalid weather response');
  }
  const timeZone = location ? data?.timezone : ODZI_TIME_ZONE;
  if (typeof timeZone !== 'string' || !timeZone) throw new Error('Missing forecast time zone');

  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const dateKey = (time: number) => {
    const parts = localDate.formatToParts(time);
    return ['year', 'month', 'day'].map(part => parts.find(value => value.type === part)?.value).join('-');
  };
  const checkedAt = new Date();
  const today = dateKey(checkedAt.getTime());
  const currentHour = Math.floor(checkedAt.getTime() / 3600000) * 3600;
  const hours: { time: number; probability: number }[] = [];
  const followingHours: typeof hours = [];
  const daily = new Map<string, number>();
  const tomorrow = new Date(Date.parse(today) + 86400_000).toISOString().slice(0, 10);
  for (let index = 0; index < hourly.time.length; index += 1) {
    const time = hourly.time[index];
    const probability = hourly.precipitation_probability[index];
    if (typeof time === 'number' && Number.isFinite(time) && time >= currentHour
      && typeof probability === 'number' && Number.isFinite(probability)
      && probability >= 0 && probability <= 100) {
      const day = dateKey(time * 1000);
      daily.set(day, Math.max(daily.get(day) ?? 0, probability));
      if (day === today) hours.push({ time, probability });
      else if (day === tomorrow) followingHours.push({ time, probability });

    }
  }
  if (!hours.length) throw new Error('Weather provider returned no remaining hours');

  const peak = hours.reduce((highest, hour) =>
    hour.probability > highest.probability ? hour : highest);
  return {
    location: location ? 'farm' as const : 'odzi' as const,
    timezone: timeZone,
    checked_at: checkedAt.toISOString(),
    peak_time: peak.time,
    probability: peak.probability,
    hours,
    following_hours: followingHours,
    daily: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, peak_probability]) => ({ date, peak_probability })),
  };
}
