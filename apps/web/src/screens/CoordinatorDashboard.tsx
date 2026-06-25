import { useCallback, useEffect, useState } from 'react';
import {
  downloadCoordinatorEvidenceCsv,
  issuePhysicalBindingChallenge,
  loadCoordinatorEvidenceReport,
  loadCoordinatorFarmers,
  loadCoordinatorFleet,
  loadCoordinatorMetrics,
  loadCoordinatorReviews,
  markCoordinatorCycleMissed,
  runCoordinatorOperations,
  submitCoordinatorReview,
  verifyPhysicalBinding,
  VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED,
} from '../agent/api';
import type {
  CoordinatorFleetDevice,
  CoordinatorFarmer,
  CoordinatorReadingReview,
  PilotOperationsMetrics,
  PilotEvidenceReport,
  PilotSession,
  PhysicalBindingChallenge,
} from '../agent/types';
import { FarmerAdministration } from './FarmerAdministration';

export function CoordinatorDashboard({
  session,
  onLogout,
}: {
  session: PilotSession;
  onLogout: () => Promise<void>;
}) {
  const [devices, setDevices] = useState<CoordinatorFleetDevice[]>([]);
  const [farmers, setFarmers] = useState<CoordinatorFarmer[]>([]);
  const [reviews, setReviews] = useState<CoordinatorReadingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [missedReasons, setMissedReasons] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<PilotOperationsMetrics | null>(null);
  const [evidence, setEvidence] = useState<PilotEvidenceReport | null>(null);
  const [downloadingEvidence, setDownloadingEvidence] = useState(false);
  const [bindingDeviceId, setBindingDeviceId] = useState('');
  const [bindingPubkey, setBindingPubkey] = useState('');
  const [bindingSignature, setBindingSignature] = useState('');
  const [bindingChallenge, setBindingChallenge] =
    useState<PhysicalBindingChallenge | null>(null);
  const [reviewStartedAt, setReviewStartedAt] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    setError(null);
    await runCoordinatorOperations();
    const [fleet, pending, operationalMetrics, evidenceReport, enrolledFarmers] = await Promise.all([
      loadCoordinatorFleet(),
      loadCoordinatorReviews(),
      loadCoordinatorMetrics(),
      loadCoordinatorEvidenceReport(),
      loadCoordinatorFarmers(),
    ]);
    setDevices(fleet);
    setFarmers(enrolledFarmers);
    setReviews(pending);
    setMetrics(operationalMetrics);
    setEvidence(evidenceReport);
    setReviewStartedAt((current) => {
      const next = { ...current };
      const now = Date.now();
      for (const review of pending) {
        if (!next[review.reading_id]) next[review.reading_id] = now;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void refresh()
      .catch(() => setError('The coordinator dashboard could not be loaded.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <main className="min-h-screen bg-[#f4f1e8] p-10 font-black">Loading the Virtual Ndani Kit fleet…</main>;
  }

  const completed = devices.filter((device) =>
    ['reading_accepted', 'contribution_recorded'].includes(device.status)
  ).length;

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-4 py-10 text-[#171713] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-5 border-b-2 border-black pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#27653a]">
              EdgeChain Coordinator
            </p>
            <h1 className="mt-2 text-4xl font-black sm:text-6xl">Virtual Ndani Kit fleet</h1>
            <p className="mt-3 text-gray-700">{session.farmer.display_name} · Odzi pilot</p>
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
          <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">
            {error}
          </p>
        )}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Virtual devices" value={devices.length} />
          <Metric label="Completed or contributed" value={completed} />
          <Metric label="Needs review" value={reviews.length} alert={reviews.length > 0} />
          <Metric
            label="Research contributions"
            value={devices.reduce((sum, device) => sum + device.contribution_count, 0)}
          />
        </section>

        <FarmerAdministration farmers={farmers} onChanged={refresh} />

        {metrics && (
          <section className="mt-7 border-2 border-black bg-[#183c28] p-5 text-white sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#cbe7ba]">
              Hardware-value evidence
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DarkMetric
                label="Completion rate"
                value={`${Math.round(metrics.completion_rate * 100)}%`}
              />
              <DarkMetric
                label="Average manual time"
                value={`${metrics.average_manual_minutes.toFixed(1)} min`}
              />
              <DarkMetric
                label="Projected physical readings"
                value={`${metrics.projected_physical_readings_per_day}/day`}
              />
              <DarkMetric
                label="Coverage multiplier"
                value={`${metrics.projected_temporal_coverage_multiplier.toFixed(1)}×`}
              />
            </div>
            <p className="mt-5 text-sm text-white/75">
              Physical projections use the configured 30-minute interval. They are estimates,
              not readings that occurred during the pilot.
            </p>
          </section>
        )}

        {evidence && (
          <section className="mt-7 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">
                  Accelerator evidence journey
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  From one human check to funded automation
                </h2>
                <p className="mt-3 max-w-3xl text-gray-700">{evidence.truth_statement}</p>
              </div>
              <button
                type="button"
                disabled={downloadingEvidence}
                onClick={() => void downloadEvidence()}
                className="border-2 border-black bg-[#f1d34f] px-5 py-3 font-black disabled:opacity-50"
              >
                {downloadingEvidence ? 'Preparing report…' : 'Download evidence CSV'}
              </button>
            </div>

            <ol className="mt-7 grid gap-3 lg:grid-cols-4">
              <JourneyStep
                number="1"
                title="Human-assisted collection"
                text={`${evidence.summary.completed_cycles} completed checks; ${evidence.summary.missed_cycles} gaps remain visible.`}
                kind="REAL PILOT DATA"
              />
              <JourneyStep
                number="2"
                title="Provenance and quality"
                text={`${evidence.research.eligible_features} eligible features; ${evidence.research.excluded_features} excluded with reasons.`}
                kind="REAL EDGECHAIN PROCESS"
              />
              <JourneyStep
                number="3"
                title="Research readiness"
                text={`${evidence.research.model_ready_batches} batches are dataset-ready; ${evidence.research.features_used_in_training} features used in a training run.`}
                kind={evidence.research.model_training_completed ? 'TRAINING RECORDED' : 'TRAINING NOT STARTED'}
              />
              <JourneyStep
                number="4"
                title="Physical Ndani Kit projection"
                text={`${evidence.summary.projected_physical_readings_per_day} automatic readings/day across the fleet at configured intervals.`}
                kind="PROJECTED — NOT MEASURED"
              />
            </ol>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <EvidenceFact
                label="Manual labor recorded"
                value={`${evidence.summary.total_manual_hours.toFixed(1)} hours`}
              />
              <EvidenceFact
                label="Coordinator labor recorded"
                value={`${evidence.summary.total_coordinator_hours.toFixed(1)} hours`}
              />
              <EvidenceFact
                label="Manual readings with device proof"
                value="0"
                note={`${evidence.research.manual_readings_without_device_proof} correctly labelled not device-signed`}
              />
            </div>

            <p className="mt-5 border-l-4 border-[#27653a] bg-[#f4f1e8] p-4 text-sm">
              Report identity policy: {evidence.methodology.identity_policy}. Synthetic
              demonstration records included: no.
            </p>
          </section>
        )}

        {VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED && (
          <section className="mt-7 border-2 border-black bg-[#e8edf4] p-5 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#244b78]">
              Phase 6 · Physical transition
            </p>
            <div className="mt-2 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-3xl font-black">Bind a funded Ndani Kit</h2>
                <p className="mt-3 leading-relaxed text-gray-700">
                  The device must already be registered in EdgeChain and must sign
                  a one-time challenge using its ATECC608B P-256 key. Existing
                  farmer history remains manual evidence and is never rewritten.
                </p>
                <ul className="mt-5 space-y-2 text-sm font-bold">
                  <li>✓ Same Virtual Ndani Kit identity and timeline</li>
                  <li>✓ Temperature, humidity, pressure and soil channels enabled</li>
                  <li>✓ Plant and pest observations remain human knowledge</li>
                </ul>
              </div>

              <div className="border-2 border-black bg-white p-5">
                <label className="block">
                  <span className="text-xs font-black uppercase">Virtual Ndani Kit</span>
                  <select
                    value={bindingDeviceId}
                    onChange={(event) => {
                      setBindingDeviceId(event.target.value);
                      setBindingChallenge(null);
                      setBindingSignature('');
                    }}
                    className="mt-2 w-full border-2 border-black p-3"
                  >
                    <option value="">Choose an unbound device…</option>
                    {devices
                      .filter((device) => !device.physical_device_pubkey)
                      .map((device) => (
                        <option
                          key={device.virtual_device_id}
                          value={device.virtual_device_id}
                        >
                          {device.device_code} · {device.site_id}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase">
                    P-256 public key (X || Y hex)
                  </span>
                  <textarea
                    value={bindingPubkey}
                    onChange={(event) => setBindingPubkey(
                      event.target.value.replace(/\s/g, '').toLowerCase().slice(0, 130)
                    )}
                    rows={3}
                    placeholder="128 hexadecimal characters"
                    className="mt-2 w-full break-all border-2 border-black p-3 font-mono text-xs"
                  />
                </label>

                {!bindingChallenge ? (
                  <button
                    type="button"
                    disabled={
                      workingId === 'physical-binding'
                      || !bindingDeviceId
                      || !/^(04)?[0-9a-f]{128}$/.test(bindingPubkey)
                    }
                    onClick={() => void requestBindingChallenge()}
                    className="mt-4 w-full bg-[#244b78] px-5 py-3 font-black text-white disabled:opacity-40"
                  >
                    Request device challenge
                  </button>
                ) : (
                  <>
                    <div className="mt-4 border-2 border-[#244b78] bg-[#eef5ff] p-4">
                      <p className="text-xs font-black uppercase">
                        Sign these 32 challenge bytes on the physical device
                      </p>
                      <p className="mt-2 break-all font-mono text-xs">
                        {bindingChallenge.challenge}
                      </p>
                      <p className="mt-2 text-xs text-gray-600">
                        Algorithm: ECDSA P-256 with SHA-256; 64-byte R || S signature.
                      </p>
                    </div>
                    <label className="mt-4 block">
                      <span className="text-xs font-black uppercase">
                        Device signature
                      </span>
                      <textarea
                        value={bindingSignature}
                        onChange={(event) => setBindingSignature(
                          event.target.value.replace(/\s/g, '').toLowerCase().slice(0, 128)
                        )}
                        rows={3}
                        placeholder="128 hexadecimal characters"
                        className="mt-2 w-full break-all border-2 border-black p-3 font-mono text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        workingId === 'physical-binding'
                        || !/^[0-9a-f]{128}$/.test(bindingSignature)
                      }
                      onClick={() => void completePhysicalBinding()}
                      className="mt-4 w-full bg-[#183c28] px-5 py-3 font-black text-white disabled:opacity-40"
                    >
                      Verify and preserve history
                    </button>
                  </>
                )}
              </div>
            </div>

            {devices.some((device) => device.physical_device_pubkey) && (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {devices
                  .filter((device) => device.physical_device_pubkey)
                  .map((device) => (
                    <article key={device.virtual_device_id} className="bg-[#183c28] p-4 text-white">
                      <p className="text-xs font-black uppercase text-white/65">
                        Physical device verified
                      </p>
                      <p className="mt-1 text-xl font-black">{device.device_code}</p>
                      <p className="mt-2 break-all font-mono text-[10px] text-white/70">
                        {device.physical_device_pubkey}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">
            Coordinator queue
          </p>
          <h2 className="mt-1 text-3xl font-black">Readings needing review</h2>
          {reviews.length === 0 ? (
            <div className="mt-5 border-2 border-black bg-[#dff3d8] p-6 font-bold">
              No flagged readings are waiting for review.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {reviews.map((review) => (
                <article key={review.reading_id} className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#8a3d24]">Review required</p>
                      <h3 className="mt-1 text-2xl font-black">{review.device_code}</h3>
                      <p className="text-sm text-gray-600">
                        {review.farmer_display_name || 'Farmer'} · {review.farm_display_name}
                      </p>
                    </div>
                    <span className="h-fit border border-black px-2 py-1 text-xs font-black uppercase">
                      {review.collection_mode.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {review.fields
                      .filter((field) => field.source_class === 'manual_proxy')
                      .map((field) => (
                        <div key={field.channel_key} className="border border-black p-3">
                          <p className="text-[10px] font-black uppercase text-gray-500">
                            {pretty(field.channel_key)}
                          </p>
                          <p className="mt-1 font-black">{pretty(field.value)}</p>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 border-l-4 border-[#8a3d24] bg-red-50 p-3">
                    <p className="text-xs font-black uppercase">Risk flags</p>
                    <p className="mt-1 text-sm">{review.risk_flags.map(pretty).join(', ')}</p>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-black">Review reason</span>
                    <textarea
                      value={reasons[review.reading_id] || ''}
                      onChange={(event) => setReasons((current) => ({
                        ...current,
                        [review.reading_id]: event.target.value.slice(0, 500),
                      }))}
                      rows={3}
                      placeholder="Explain what you checked and why."
                      className="mt-2 w-full border-2 border-black p-3"
                    />
                  </label>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={workingId === review.reading_id || (reasons[review.reading_id] || '').trim().length < 5}
                      onClick={() => void decide(review.reading_id, 'excluded')}
                      className="border-2 border-[#8a3d24] px-4 py-3 font-black text-[#8a3d24] disabled:opacity-40"
                    >
                      Exclude
                    </button>
                    <button
                      type="button"
                      disabled={workingId === review.reading_id || (reasons[review.reading_id] || '').trim().length < 5}
                      onClick={() => void decide(review.reading_id, 'approved')}
                      className="bg-[#183c28] px-4 py-3 font-black text-white disabled:opacity-40"
                    >
                      Approve for research
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">All farms</p>
          <h2 className="mt-1 text-3xl font-black">Fleet status</h2>
          <div className="mt-5 overflow-x-auto border-2 border-black bg-white">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-black text-white">
                <tr>
                  {['Device', 'Farmer / farm', 'Status', 'Due', 'Last reading', 'Missed', 'Contributions', 'Action'].map((label) => (
                    <th key={label} className="px-4 py-3 text-xs uppercase tracking-wide">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.virtual_device_id} className="border-t border-black">
                    <td className="px-4 py-3 font-black">{device.device_code}</td>
                    <td className="px-4 py-3">
                      <strong>{device.farmer_display_name || 'Unassigned'}</strong>
                      <br /><span className="text-xs text-gray-500">{device.farm_display_name}</span>
                    </td>
                    <td className="px-4 py-3">{pretty(device.status)}</td>
                    <td className="px-4 py-3">
                      {device.current_due_at
                        ? new Date(device.current_due_at * 1000).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {device.latest_observed_at
                        ? new Date(device.latest_observed_at * 1000).toLocaleString()
                        : 'No reading'}
                    </td>
                    <td className="px-4 py-3 font-black">{device.missed_cycle_count}</td>
                    <td className="px-4 py-3 font-black">{device.contribution_count}</td>
                    <td className="px-4 py-3">
                      {device.current_cycle_status === 'scheduled' && device.current_cycle_id ? (
                        <div className="flex min-w-56 gap-2">
                          <select
                            value={missedReasons[device.current_cycle_id] || ''}
                            onChange={(event) => setMissedReasons((current) => ({
                              ...current,
                              [device.current_cycle_id!]: event.target.value,
                            }))}
                            className="border border-black px-2 py-1 text-xs"
                          >
                            <option value="">Missed reason…</option>
                            <option value="farmer_unavailable">Farmer unavailable</option>
                            <option value="phone_unavailable">Phone unavailable</option>
                            <option value="no_connectivity">No connectivity</option>
                            <option value="coordinator_visit_postponed">Visit postponed</option>
                            <option value="observation_unsafe_or_impossible">Unsafe or impossible</option>
                            <option value="other">Other</option>
                          </select>
                          <button
                            type="button"
                            disabled={!missedReasons[device.current_cycle_id]}
                            onClick={() => void markMissed(device)}
                            className="bg-black px-3 py-1 text-xs font-black text-white disabled:opacity-30"
                          >
                            Mark missed
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );

  async function decide(readingId: string, decision: 'approved' | 'excluded') {
    setWorkingId(readingId);
    setError(null);
    try {
      await submitCoordinatorReview({
        readingId,
        decision,
        reason: reasons[readingId] || '',
        coordinatorDurationSeconds: Math.max(
          0,
          Math.round((Date.now() - (reviewStartedAt[readingId] || Date.now())) / 1000)
        ),
      });
      await refresh();
    } catch {
      setError('The review could not be saved. Please reload and try again.');
    } finally {
      setWorkingId(null);
    }
  }

  async function markMissed(device: CoordinatorFleetDevice) {
    if (!device.current_cycle_id) return;
    setWorkingId(device.current_cycle_id);
    setError(null);
    try {
      await markCoordinatorCycleMissed({
        deviceId: device.virtual_device_id,
        cycleId: device.current_cycle_id,
        reason: missedReasons[device.current_cycle_id] || '',
      });
      await refresh();
    } catch {
      setError('The missed reading could not be recorded.');
    } finally {
      setWorkingId(null);
    }
  }

  async function downloadEvidence() {
    setDownloadingEvidence(true);
    setError(null);
    try {
      await downloadCoordinatorEvidenceCsv();
    } catch {
      setError('The accelerator evidence report could not be downloaded.');
    } finally {
      setDownloadingEvidence(false);
    }
  }

  async function requestBindingChallenge() {
    if (!bindingDeviceId) return;
    setWorkingId('physical-binding');
    setError(null);
    try {
      setBindingChallenge(await issuePhysicalBindingChallenge({
        deviceId: bindingDeviceId,
        devicePubkey: bindingPubkey,
      }));
    } catch {
      setError(
        'The binding challenge could not be created. Confirm that the physical device is already registered.'
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function completePhysicalBinding() {
    if (!bindingChallenge) return;
    setWorkingId('physical-binding');
    setError(null);
    try {
      await verifyPhysicalBinding({
        deviceId: bindingChallenge.virtual_device_id,
        challengeId: bindingChallenge.challenge_id,
        signature: bindingSignature,
      });
      setBindingDeviceId('');
      setBindingPubkey('');
      setBindingSignature('');
      setBindingChallenge(null);
      await refresh();
    } catch {
      setError('The physical-device signature was invalid, expired, or already used.');
    } finally {
      setWorkingId(null);
    }
  }
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <article className={`border-2 border-black p-5 ${alert ? 'bg-[#f1d34f]' : 'bg-white'}`}>
      <p className="text-xs font-black uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </article>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-white/40 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-white/65">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function JourneyStep({
  number,
  title,
  text,
  kind,
}: {
  number: string;
  title: string;
  text: string;
  kind: string;
}) {
  return (
    <li className="border-2 border-black p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center bg-black font-black text-white">
          {number}
        </span>
        <span className="text-[9px] font-black uppercase tracking-wide text-[#8a3d24]">
          {kind}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
    </li>
  );
}

function EvidenceFact({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="bg-[#183c28] p-4 text-white">
      <p className="text-xs font-black uppercase tracking-wide text-white/65">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {note && <p className="mt-2 text-xs text-white/70">{note}</p>}
    </article>
  );
}

function pretty(value: unknown): string {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
