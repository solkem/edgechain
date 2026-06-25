import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  confirmVirtualNdaniReading,
  loadVirtualNdaniCycleReading,
  loadVirtualNdaniDevices,
  saveVirtualNdaniGuidedReading,
  startVirtualNdaniCycle,
} from '../agent/api';
import type {
  GuidedReadingDraft,
  VirtualNdaniDevice,
  VirtualNdaniReading,
} from '../agent/types';
import { PilotBrand } from '../agent/PilotBrand';

type FieldKey = keyof Omit<GuidedReadingDraft, 'notes'>;

const STEPS: Array<{
  key: FieldKey;
  title: string;
  help: string;
  options: Array<{ value: string; label: string; shona: string; note?: string }>;
}> = [
  {
    key: 'soil_moisture',
    title: 'How does the soil feel?',
    help: 'Touch the soil near the crop. Choose what you observe—this is not a sensor percentage.',
    options: [
      { value: 'very_dry', label: 'Very dry', shona: 'Ivhu rakaoma zvikuru' },
      { value: 'dry', label: 'Dry', shona: 'Ivhu rakaoma' },
      { value: 'moist', label: 'Moist', shona: 'Ivhu rine mwando' },
      { value: 'wet', label: 'Wet', shona: 'Ivhu rakanyorova' },
      { value: 'waterlogged', label: 'Waterlogged', shona: 'Ivhu razara nemvura' },
    ],
  },
  {
    key: 'rain_condition',
    title: 'How much rain was there today?',
    help: 'Choose what you observed at this farm.',
    options: [
      { value: 'none', label: 'No rain', shona: 'Hakuna mvura yanaya' },
      { value: 'light', label: 'Light rain', shona: 'Mvura shoma' },
      { value: 'moderate', label: 'Moderate rain', shona: 'Mvura iri pakati nepakati' },
      { value: 'heavy', label: 'Heavy rain', shona: 'Mvura zhinji' },
    ],
  },
  {
    key: 'plant_condition',
    title: 'How do the plants look?',
    help: 'Look across the field, not only at one plant.',
    options: [
      { value: 'good', label: 'Good', shona: 'Zvirimwa zvakanaka', note: 'Healthy overall' },
      { value: 'fair', label: 'Fair', shona: 'Zvirimwa zviri pakati nepakati', note: 'Some concern' },
      { value: 'poor', label: 'Poor', shona: 'Zvirimwa hazvina kumira zvakanaka', note: 'Needs coordinator review' },
    ],
  },
  {
    key: 'pest_disease_signs',
    title: 'Do you see pest or disease signs?',
    help: 'Look for damaged leaves, insects, spots, wilting, or unusual colour.',
    options: [
      { value: 'none', label: 'None seen', shona: 'Hapana zvaonekwa' },
      { value: 'some', label: 'Some signs', shona: 'Pane zvimwe zviratidzo' },
      { value: 'severe', label: 'Severe signs', shona: 'Zviratidzo zvakanyanya', note: 'Needs coordinator review' },
    ],
  },
  {
    key: 'irrigation',
    title: 'Did you irrigate today?',
    help: 'This records a farm action, not a hardware measurement.',
    options: [
      { value: 'yes', label: 'Yes', shona: 'Hongu' },
      { value: 'no', label: 'No', shona: 'Kwete' },
      { value: 'unknown', label: 'Not sure', shona: 'Handina chokwadi' },
    ],
  },
];

export function VirtualNdaniReadingScreen() {
  const navigate = useNavigate();
  const [device, setDevice] = useState<VirtualNdaniDevice | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<GuidedReadingDraft>>({});
  const [reading, setReading] = useState<VirtualNdaniReading | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const devices = await loadVirtualNdaniDevices();
      const primary = devices[0] ?? null;
      if (!primary) return;
      setDevice(primary);
      const cycle = primary.current_cycle_id
        ? { cycle_id: primary.current_cycle_id }
        : await startVirtualNdaniCycle(primary.virtual_device_id, 'manual_guided');
      setCycleId(cycle.cycle_id);
      const existing = await loadVirtualNdaniCycleReading(
        primary.virtual_device_id,
        cycle.cycle_id
      );
      if (existing?.quality_status === 'awaiting_confirmation') {
        setReading(existing);
      }
    })()
      .catch(() => setError('Today’s reading could not be opened. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => STEPS.every(({ key }) => Boolean(draft[key])),
    [draft]
  );

  if (loading) return <ReadingShell><p className="font-black">Preparing today’s reading…</p></ReadingShell>;
  if (!device || !cycleId) {
    return <ReadingShell><p className="font-black">No Virtual Ndani Kit reading is available.</p></ReadingShell>;
  }

  if (reading) {
    return (
      <Confirmation
        device={device}
        reading={reading}
        saving={saving}
        error={error}
        onEdit={() => {
          setReading(null);
          setStep(0);
          setDraft(readingToDraft(reading));
          setNotes(reading.notes || '');
        }}
        onConfirm={async () => {
          setSaving(true);
          setError(null);
          try {
            const confirmed = await confirmVirtualNdaniReading(
              device.virtual_device_id,
              cycleId
            );
            navigate('/virtual-ndani', {
              replace: true,
              state: { readingStatus: confirmed.quality_status },
            });
          } catch {
            setError('The reading could not be confirmed. Please try again.');
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  const current = STEPS[step];
  return (
    <ReadingShell>
      <header className="border-b-2 border-black pb-5">
        <PilotBrand compact />
        <button
          type="button"
          onClick={() => navigate('/virtual-ndani')}
          className="mt-6 text-sm font-black uppercase tracking-wide underline"
        >
          Back to Virtual Ndani Kit
        </button>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[#27653a]">
          {device.device_code} · Guided reading
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h1 className="text-3xl font-black sm:text-5xl">
            {step < STEPS.length ? current.title : 'Any notes to add?'}
          </h1>
          <p className="shrink-0 text-sm font-black">
            {Math.min(step + 1, STEPS.length + 1)} / {STEPS.length + 1}
          </p>
        </div>
        <div className="mt-5 h-3 border border-black bg-white">
          <div
            className="h-full bg-[#27653a]"
            style={{ width: `${((step + 1) / (STEPS.length + 1)) * 100}%` }}
          />
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">
          {error}
        </p>
      )}

      {step < STEPS.length ? (
        <section className="mt-7">
          <p className="max-w-2xl text-lg leading-relaxed text-gray-700">{current.help}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => {
              const selected = draft[current.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setDraft((previous) => ({
                      ...previous,
                      [current.key]: option.value,
                    }));
                    if (step < STEPS.length - 1) setStep(step + 1);
                    else setStep(STEPS.length);
                  }}
                  className={`min-h-24 border-2 border-black p-5 text-left ${
                    selected ? 'bg-[#183c28] text-white' : 'bg-white hover:bg-[#f1d34f]'
                  }`}
                >
                  <span className="block text-xl font-black">{option.label}</span>
                  <span className="mt-1 block text-base font-bold opacity-80">
                    {option.shona}
                  </span>
                  {option.note && <span className="mt-1 block text-sm opacity-75">{option.note}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mt-7">
          <p className="text-lg text-gray-700">
            Optional. Describe anything the choices did not capture.
          </p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 500))}
            rows={5}
            placeholder="Example: Yellow leaves appeared near the lower field."
            className="mt-5 w-full border-2 border-black bg-white p-4 text-lg"
          />
          <p className="mt-2 text-right text-xs font-bold text-gray-500">{notes.length}/500</p>
          <button
            type="button"
            disabled={!completed || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                const saved = await saveVirtualNdaniGuidedReading(
                  device.virtual_device_id,
                  cycleId,
                  { ...(draft as GuidedReadingDraft), notes: notes || undefined }
                );
                setReading(saved);
              } catch {
                setError('The observations could not be saved. Please check each answer and try again.');
              } finally {
                setSaving(false);
              }
            }}
            className="mt-5 w-full bg-[#f1d34f] px-6 py-4 text-lg font-black hover:bg-[#ffe46a] disabled:opacity-50"
          >
            {saving ? 'Preparing summary…' : 'Review my reading'}
          </button>
        </section>
      )}

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          className="mt-7 border-2 border-black bg-white px-5 py-3 font-black"
        >
          Previous question
        </button>
      )}
    </ReadingShell>
  );
}

function Confirmation({
  device,
  reading,
  saving,
  error,
  onEdit,
  onConfirm,
}: {
  device: VirtualNdaniDevice;
  reading: VirtualNdaniReading;
  saving: boolean;
  error: string | null;
  onEdit: () => void;
  onConfirm: () => Promise<void>;
}) {
  const manualFields = reading.fields.filter((field) => field.source_class === 'manual_proxy');
  const unavailable = reading.fields.filter((field) => field.measurement_kind === 'unavailable');
  return (
    <ReadingShell>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#27653a]">
        {device.device_code} · Confirm reading
      </p>
      <h1 className="mt-3 text-4xl font-black sm:text-6xl">Is this correct?</h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-700">
        These are your observations. They have not been submitted until you confirm.
      </p>
      {error && <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">{error}</p>}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {manualFields.map((field) => (
          <article key={field.channel_key} className="border-2 border-black bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
              {labelFor(field.channel_key)}
            </p>
            <p className="mt-2 text-2xl font-black">{pretty(field.value)}</p>
            <p className="mt-3 text-xs font-bold text-[#27653a]">
              Farmer observation · Manual proxy
            </p>
          </article>
        ))}
      </div>
      <div className="mt-5 border-2 border-black bg-[#eee9dc] p-5">
        <p className="font-black">Still awaiting physical hardware</p>
        <p className="mt-2 text-sm text-gray-700">
          {unavailable.map((field) => labelFor(field.channel_key)).join(', ')} remain unavailable.
          No measurements were invented.
        </p>
      </div>
      {reading.risk_flags.length > 0 && (
        <div className="mt-5 border-2 border-[#8a3d24] bg-red-50 p-5">
          <p className="font-black text-[#8a3d24]">Coordinator follow-up will be requested</p>
          <p className="mt-2 text-sm text-gray-700">
            Your reading is still valuable. A coordinator should review the reported condition.
          </p>
        </div>
      )}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onEdit} className="border-2 border-black bg-white px-6 py-4 font-black">
          Change answers
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onConfirm()}
          className="bg-[#183c28] px-6 py-4 font-black text-white disabled:opacity-50"
        >
          {saving ? 'Confirming…' : 'Confirm and submit'}
        </button>
      </div>
    </ReadingShell>
  );
}

function ReadingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen border-t-4 border-[#0000ff] bg-[#f4f1e8] px-4 py-10 text-[#171713] sm:px-6">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}

function readingToDraft(reading: VirtualNdaniReading): Partial<GuidedReadingDraft> {
  return reading.fields.reduce<Partial<GuidedReadingDraft>>((result, field) => {
    if (field.source_class === 'manual_proxy') {
      (result as Record<string, unknown>)[field.channel_key] = field.value;
    }
    return result;
  }, {});
}

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    soil_moisture: 'Soil moisture',
    rain_condition: 'Rain condition',
    plant_condition: 'Plant condition',
    pest_disease_signs: 'Pest or disease signs',
    irrigation: 'Irrigation',
    temperature: 'Temperature',
    humidity: 'Humidity',
    pressure: 'Atmospheric pressure',
  };
  return labels[key] || key;
}

function pretty(value: unknown): string {
  return String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
