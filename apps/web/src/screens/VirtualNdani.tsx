import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadVirtualNdaniDevices,
  loadPhysicalManualComparison,
  loadVirtualNdaniTimeline,
  startVirtualNdaniCycle,
  VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED,
} from '../agent/api';
import type {
  PilotSession,
  VirtualNdaniDevice,
  VirtualNdaniEvent,
  PhysicalManualComparison,
} from '../agent/types';
import { PilotBrand } from '../agent/PilotBrand';

export function VirtualNdani({
  session,
  onLogout,
}: {
  session: PilotSession;
  onLogout: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [device, setDevice] = useState<VirtualNdaniDevice | null>(null);
  const [events, setEvents] = useState<VirtualNdaniEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<PhysicalManualComparison | null>(null);

  const refresh = async () => {
    setError(null);
    const devices = await loadVirtualNdaniDevices();
    const primary = devices[0] ?? null;
    setDevice(primary);
    setEvents(
      primary
        ? await loadVirtualNdaniTimeline(primary.virtual_device_id)
        : []
    );
    setComparison(
      primary?.mode === 'physical_bound'
        ? await loadPhysicalManualComparison(primary.virtual_device_id)
        : null
    );
  };

  useEffect(() => {
    void refresh()
      .catch(() => setError('Virtual Ndani Kit could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <VirtualNdaniLoading />;
  }

  if (!device) {
    return (
      <main className="min-h-screen bg-[#f4f1e8] px-5 py-24">
        <section className="mx-auto max-w-2xl border-2 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
          <h1 className="text-3xl font-black">No Virtual Ndani Kit is assigned</h1>
          <p className="mt-3 text-gray-700">
            Ask the pilot coordinator to check this farmer’s farm assignment.
          </p>
        </section>
      </main>
    );
  }

  const farm = session.farms.find((item) => item.farm_id === device.farm_id);
  const hasActiveCycle = Boolean(
    device.current_cycle_id && device.current_cycle_status !== 'scheduled'
  );

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-4 pb-16 pt-20 text-[#171713] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-6 border-b-2 border-black pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <PilotBrand compact />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#27653a]">
              <span className="mt-6 block">My Virtual Ndani Kit</span>
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none sm:text-6xl">
              {device.device_code}
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              {farm?.display_name ?? device.farm_display_name} · {device.site_id}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="border-2 border-black bg-white px-5 py-3 font-black hover:bg-black hover:text-white"
          >
            Sign out
          </button>
        </header>

        {error && (
          <p role="alert" className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">
            {error}
          </p>
        )}

        <section className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border-2 border-black bg-[#183c28] p-6 text-white shadow-[8px_8px_0_#000] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#cbe7ba]">
                  {device.mode === 'physical_bound'
                    ? 'Physical Ndani Kit connected'
                    : 'Human-assisted pilot'}
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {statusLabel(device.status, hasActiveCycle)}
                </h2>
              </div>
              <span className="border border-white/50 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide">
                {hasActiveCycle ? 'Reading active' : 'One pilot check due'}
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
              {device.mode === 'physical_bound'
                ? `Your verified physical device can now supply eligible environmental channels every ${device.future_physical_interval_minutes} minutes. Plant and pest observations still come from people.`
                : `During this pilot, you provide selected farm observations. Physical Ndani Kit will later collect environmental measurements automatically every ${device.future_physical_interval_minutes} minutes.`}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  setError(null);
                  try {
                    const cycle = await startVirtualNdaniCycle(
                      device.virtual_device_id,
                      'manual_guided'
                    );
                    navigate('/virtual-ndani/reading', {
                      state: { cycleId: cycle.cycle_id },
                    });
                  } catch {
                    setError('The reading could not be started. Please try again.');
                  } finally {
                    setStarting(false);
                  }
                }}
                className="bg-[#f1d34f] px-5 py-4 text-left font-black text-black hover:bg-[#ffe46a] disabled:opacity-60"
              >
                {hasActiveCycle ? 'Continue today’s reading' : starting ? 'Starting…' : 'Record today’s reading'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/farm-check-in')}
                className="border-2 border-[#f1d34f] px-5 py-4 text-left font-black text-[#f1d34f] hover:bg-[#f1d34f] hover:text-black"
              >
                Weekly farm check-in
              </button>
              <button
                type="button"
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  setError(null);
                  try {
                    await startVirtualNdaniCycle(
                      device.virtual_device_id,
                      'manual_agent'
                    );
                    navigate('/farm-assistant');
                  } catch {
                    if (device.current_collection_mode === 'manual_guided') {
                      setError('Finish or cancel the guided reading before using the Farm Assistant.');
                    } else {
                      setError('The Farm Assistant reading could not be opened. Please try again.');
                    }
                  } finally {
                    setStarting(false);
                  }
                }}
                className="border-2 border-white px-5 py-4 text-left font-black text-white hover:bg-white hover:text-black disabled:opacity-60"
              >
                {device.current_collection_mode === 'manual_guided'
                  ? 'Finish guided reading first'
                  : 'Talk to Farm Assistant'}
              </button>
            </div>
          </div>

          <aside className="border-2 border-black bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
              What hardware changes
            </p>
            <p className="mt-3 text-5xl font-black">
              {device.automation.future_readings_per_day}
            </p>
            <p className="mt-1 font-bold">automatic checks per day</p>
            <p className="mt-5 text-sm leading-relaxed text-gray-600">
              The funded device will measure temperature, humidity, pressure,
              and soil moisture repeatedly. Human knowledge about plants,
              pests, and farm actions will still matter.
            </p>
            {VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED && (
              <button
                type="button"
                onClick={() => navigate('/virtual-ndani/demo')}
                className="mt-5 w-full border-2 border-black bg-[#f1d34f] px-4 py-3 text-left font-black"
              >
                See how the physical Ndani Kit works
              </button>
            )}
          </aside>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <OperationalCard
            label="Today’s pilot check"
            value={device.due_at ? formatDue(device.due_at) : 'Available now'}
            note="One meaningful human check—not 48 manual prompts."
          />
          <OperationalCard
            label="Completed checks"
            value={String(device.operations.completed_cycles)}
            note={`${Math.round(device.operations.completion_rate * 100)}% of recorded cycles completed`}
          />
          <OperationalCard
            label="Missed checks"
            value={String(device.operations.missed_cycles)}
            note="Missed checks remain visible as real gaps."
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">
                Today’s channels
              </p>
              <h2 className="mt-1 text-3xl font-black">What the Ndani Kit knows</h2>
            </div>
            <p className="max-w-xl text-sm text-gray-600">
              No numbers are invented. Each channel says who or what supplied it.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {device.channels.map((channel) => (
              <article
                key={channel.channel_key}
                className="min-h-48 border-2 border-black bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {channelIcon(channel.channel_key)}
                  </span>
                  <span className="bg-[#eee9dc] px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                    {channel.physical_collection_enabled
                      ? 'physical enabled'
                      : channel.current.measurement_kind}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-black">{channel.display_name}</h3>
                <p className="mt-2 font-bold text-[#8a3d24]">
                  {channel.current.label}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  {channel.physical_collection_enabled
                    ? `Verified physical collection enabled. ${futureSource(channel.future_sensor_type, channel.future_unit)}`
                    : futureSource(channel.future_sensor_type, channel.future_unit)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <ContributionPipeline device={device} />

        {device.mode === 'physical_bound' && comparison && (
          <PhysicalComparison comparison={comparison} />
        )}

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-2 border-black bg-[#f1d34f] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Trust rule
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Observation is not measurement.
            </h2>
            <p className="mt-4 leading-relaxed">
              “Soil feels moist” is stored as a farmer observation. EdgeChain
              will never turn it into a made-up moisture percentage.
            </p>
          </div>

          <div className="border-2 border-black bg-white p-6">
            <h2 className="text-2xl font-black">Device timeline</h2>
            {events.length === 0 ? (
              <p className="mt-4 text-gray-600">
                Your first device event will appear when a reading starts.
              </p>
            ) : (
              <ol className="mt-5 space-y-4">
                {events.map((event) => (
                  <li
                    key={event.pipeline_event_id}
                    className="grid grid-cols-[14px_1fr_auto] gap-3 border-b border-gray-200 pb-4"
                  >
                    <span className="mt-1.5 h-3 w-3 rounded-full bg-[#27653a]" />
                    <div>
                      <p className="font-black">{eventLabel(event.stage)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(event.created_at * 1000).toLocaleString()}
                      </p>
                    </div>
                    <span className="h-fit border border-black px-2 py-1 text-[10px] font-black uppercase">
                      {event.execution_kind}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PhysicalComparison({
  comparison,
}: {
  comparison: PhysicalManualComparison;
}) {
  return (
    <section className="mt-10 border-2 border-black bg-[#e8edf4] p-5 sm:p-7">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#244b78]">
        Human knowledge + physical evidence
      </p>
      <h2 className="mt-1 text-3xl font-black">Side-by-side, not interchangeable</h2>
      <p className="mt-3 max-w-3xl text-gray-700">{comparison.interpretation}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="border-2 border-black bg-[#183c28] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-[#cbe7ba]">
            Latest verified physical reading
          </p>
          {comparison.latest_physical ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <ComparisonValue
                label="Temperature"
                value={`${comparison.latest_physical.temperature.toFixed(1)} °C`}
              />
              <ComparisonValue
                label="Humidity"
                value={`${comparison.latest_physical.humidity.toFixed(1)}%`}
              />
              <ComparisonValue
                label="Soil moisture"
                value={`${comparison.latest_physical.soil_moisture.toFixed(1)}%`}
              />
            </div>
          ) : (
            <p className="mt-4 text-white/75">No verified physical packet received yet.</p>
          )}
        </article>

        <article className="border-2 border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-[#8a3d24]">
            Latest farmer observation
          </p>
          {comparison.latest_human ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <ComparisonValue
                label="Soil"
                value={prettyComparison(comparison.latest_human.soil_moisture)}
                dark={false}
              />
              <ComparisonValue
                label="Plants"
                value={prettyComparison(comparison.latest_human.plant_condition)}
                dark={false}
              />
              <ComparisonValue
                label="Pest signs"
                value={prettyComparison(comparison.latest_human.pest_disease_signs)}
                dark={false}
              />
            </div>
          ) : (
            <p className="mt-4 text-gray-600">No farmer observation recorded yet.</p>
          )}
        </article>
      </div>

      <p className="mt-5 border-l-4 border-[#244b78] bg-white p-4 text-sm">
        Coverage so far: <strong>{comparison.coverage.physical_readings}</strong> physical
        readings and <strong>{comparison.coverage.human_readings}</strong> human-assisted
        readings. Pressure is still unavailable because the current firmware packet
        does not transmit it.
      </p>
    </section>
  );
}

function ComparisonValue({
  label,
  value,
  dark = true,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={dark ? 'border border-white/30 p-3' : 'border border-black p-3'}>
      <p className={`text-[10px] font-black uppercase ${dark ? 'text-white/60' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}

function prettyComparison(value: unknown): string {
  if (!value) return 'Not recorded';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function VirtualNdaniLoading() {
  return (
    <main className="min-h-screen bg-[#f4f1e8] flex items-center justify-center">
      <p className="text-lg font-black">Opening your Virtual Ndani Kit…</p>
    </main>
  );
}

function OperationalCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="border-2 border-black bg-white p-5">
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs text-gray-600">{note}</p>
    </article>
  );
}

function formatDue(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string, hasOpenCycle: boolean): string {
  if (hasOpenCycle) return 'Today’s reading is in progress';
  if (status === 'needs_coordinator_review') return 'A reading needs review';
  if (status === 'reading_accepted') return 'Today’s reading was recorded';
  if (status === 'contribution_recorded') return 'Reading ready for EdgeChain research';
  return 'Waiting for today’s farm check';
}

function ContributionPipeline({ device }: { device: VirtualNdaniDevice }) {
  const contribution = device.latest_contribution;
  const flagged = (
    device.latest_reading?.quality_status === 'flagged'
    && (
      !contribution
      || device.latest_reading.observed_at > contribution.observed_at
    )
  );
  const stages = contribution && !flagged
    ? [
        { label: 'Reading recorded', kind: 'real', status: 'complete' },
        { label: 'Quality accepted', kind: 'real', status: 'accepted' },
        { label: 'Research dataset eligibility', kind: 'real', status: 'model ready' },
        { label: 'Physical-device proof', kind: 'not applicable', status: 'manual reading' },
        { label: 'Model training', kind: 'pending', status: 'not started' },
        { label: 'Federated aggregation', kind: 'pending', status: 'not started' },
        { label: 'Contribution score or reward', kind: 'pending', status: 'not started' },
      ]
    : flagged
      ? [
          { label: 'Reading recorded', kind: 'real', status: 'complete' },
          { label: 'Quality review', kind: 'pending', status: 'coordinator review' },
          { label: 'Research dataset eligibility', kind: 'pending', status: 'not eligible yet' },
        ]
      : [];

  if (stages.length === 0) return null;
  return (
    <section className="mt-10 border-2 border-black bg-white p-5 sm:p-7">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">
            My contribution
          </p>
          <h2 className="mt-1 text-3xl font-black">Where this reading stands</h2>
          <p className="mt-3 max-w-2xl text-gray-700">
            {contribution && !flagged
              ? 'Your reading is eligible for an EdgeChain research dataset. It has not yet trained or changed a model.'
              : 'This reading needs coordinator review before it can become eligible for research.'}
          </p>
        </div>
        {contribution && !flagged && (
          <div className="border-2 border-black bg-[#dff3d8] px-4 py-3">
            <p className="text-xs font-black uppercase">Eligible features</p>
            <p className="text-3xl font-black">
              {contribution.eligible_feature_count}
              <span className="text-base font-bold"> / 8</span>
            </p>
          </div>
        )}
      </div>

      <ol className="mt-7 grid gap-3 md:grid-cols-2">
        {stages.map((stage) => (
          <li
            key={stage.label}
            className="grid grid-cols-[14px_1fr_auto] gap-3 border border-black p-4"
          >
            <span className={`mt-1.5 h-3 w-3 rounded-full ${
              stage.kind === 'real'
                ? 'bg-[#27653a]'
                : stage.kind === 'pending'
                  ? 'bg-[#d49b20]'
                  : 'bg-gray-400'
            }`} />
            <div>
              <p className="font-black">{stage.label}</p>
              <p className="mt-1 text-xs text-gray-600">{stage.status}</p>
            </div>
            <span className="h-fit border border-black px-2 py-1 text-[10px] font-black uppercase">
              {stage.kind}
            </span>
          </li>
        ))}
      </ol>

      {contribution && !flagged && (
        <div className="mt-5 border-l-4 border-[#27653a] bg-[#f4f1e8] p-4 text-sm">
          <strong>{contribution.excluded_feature_count} channels excluded:</strong>{' '}
          unavailable hardware measurements were not added to the research features.
          No proof, model update, aggregation, score, payment, or blockchain transaction is being claimed.
        </div>
      )}
    </section>
  );
}

function channelIcon(key: string): string {
  const icons: Record<string, string> = {
    temperature: '🌡️',
    humidity: '💧',
    pressure: '◉',
    soil_moisture: '🌱',
    rain_condition: '🌧️',
    plant_condition: '🌿',
    pest_disease_signs: '🔎',
    irrigation: '🚿',
  };
  return icons[key] ?? '•';
}

function futureSource(sensor: string | null, unit: string | null): string {
  if (!sensor) return 'This remains a human observation after hardware arrives.';
  return `Future source: ${sensor}${unit ? ` (${unit})` : ''}.`;
}

function eventLabel(stage: string): string {
  return stage
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
