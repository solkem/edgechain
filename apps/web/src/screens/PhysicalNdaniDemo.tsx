import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createPhysicalNdaniDemo,
  deletePhysicalNdaniDemo,
  loadVirtualNdaniDevices,
} from '../agent/api';
import type {
  PhysicalNdaniDemoSession,
  PilotSession,
} from '../agent/types';

export function PhysicalNdaniDemo({ session }: { session: PilotSession }) {
  const navigate = useNavigate();
  const [demo, setDemo] = useState<PhysicalNdaniDemoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const devices = await loadVirtualNdaniDevices();
        const device = devices[0];
        if (!device) throw new Error('virtual_ndani_not_found');
        const created = await createPhysicalNdaniDemo(device.virtual_device_id);
        if (active) setDemo(created);
      } catch {
        if (active) setError('The demonstration could not be prepared.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#15130f] text-white">
        <p className="font-black">Preparing demonstration data…</p>
      </main>
    );
  }

  if (!demo || error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1e8] p-6">
        <section className="max-w-xl border-2 border-black bg-white p-7">
          <h1 className="text-3xl font-black">Demonstration unavailable</h1>
          <p className="mt-3">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/virtual-ndani')}
            className="mt-5 bg-black px-5 py-3 font-black text-white"
          >
            Return to Virtual Ndani Kit
          </button>
        </section>
      </main>
    );
  }

  const samples = demo.events.filter((event) => event.stage === 'sensor_collection');
  const stages = demo.events.filter((event) => event.stage !== 'sensor_collection');

  return (
    <main className="min-h-screen bg-[#15130f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="border-4 border-[#f1d34f] bg-black p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-block bg-[#f1d34f] px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-black">
                Demonstration data
              </p>
              <h1 className="mt-4 text-4xl font-black leading-none sm:text-6xl">
                See how the physical Ndani Kit works
              </h1>
              <p className="mt-3 text-white/65">
                {demo.device_code} · education-only session for {session.farmer.display_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/virtual-ndani')}
              className="border-2 border-white px-4 py-3 font-black hover:bg-white hover:text-black"
            >
              Return to real farm data
            </button>
          </div>
          <p className="mt-6 max-w-4xl border-l-4 border-[#f1d34f] pl-4 text-lg leading-relaxed">
            {demo.disclaimer}
          </p>
        </header>

        <section className="mt-7 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-2 border-white/50 bg-[#203d2b] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#cbe7ba]">
              Future funded device
            </p>
            <div className="mx-auto mt-8 grid h-72 max-w-xs place-items-center border-4 border-white bg-[#17261c] shadow-[12px_12px_0_#f1d34f]">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-[#8fd27a] text-4xl">
                  📡
                </div>
                <p className="mt-5 text-2xl font-black">NDANI KIT</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/60">
                  ESP32 · sensors · secure element · LoRa
                </p>
              </div>
            </div>
            <p className="mt-7 text-sm leading-relaxed text-white/70">
              The physical Ndani Kit would wake automatically, collect measurements,
              sign its packet inside the secure element, and transmit without
              asking the farmer to enter sensor numbers.
            </p>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f1d34f]">
              Simulated automatic collection
            </p>
            <h2 className="mt-1 text-3xl font-black">Three checks, 30 minutes apart</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {samples.map((sample) => (
                <article
                  key={sample.demo_event_id}
                  className="border-2 border-[#f1d34f] bg-[#25221b] p-5"
                >
                  <p className="text-xs font-black uppercase text-[#f1d34f]">
                    +{sample.synthetic_values.minute} minutes
                  </p>
                  <DemoValue
                    label="Temperature"
                    value={`${sample.synthetic_values.temperature?.toFixed(1)} °C`}
                  />
                  <DemoValue
                    label="Humidity"
                    value={`${sample.synthetic_values.humidity?.toFixed(1)}%`}
                  />
                  <DemoValue
                    label="Soil moisture"
                    value={`${sample.synthetic_values.soil_moisture?.toFixed(1)}%`}
                  />
                  <p className="mt-4 bg-[#f1d34f] px-2 py-1 text-center text-[10px] font-black uppercase text-black">
                    Synthetic — not this farm
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/60">
              Pressure is omitted because current ESP32 Ndani Kit packet v1 does not transmit it.
            </p>
          </div>
        </section>

        <section className="mt-9">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f1d34f]">
            Demonstrated lifecycle
          </p>
          <h2 className="mt-1 text-3xl font-black">What would happen next</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {stages.map((stage, index) => (
              <li
                key={stage.demo_event_id}
                className="grid grid-cols-[40px_1fr_auto] gap-4 border-2 border-white/35 bg-[#25221b] p-4"
              >
                <span className="grid h-10 w-10 place-items-center bg-[#f1d34f] font-black text-black">
                  {index + 1}
                </span>
                <div>
                  <p className="font-black">{stageLabel(stage.stage)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {stage.explanation}
                  </p>
                </div>
                <span className="h-fit border border-[#f1d34f] px-2 py-1 text-[9px] font-black uppercase text-[#f1d34f]">
                  {stage.status === 'simulated' ? 'simulated' : 'not executed'}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-9 border-4 border-[#f1d34f] bg-black p-6">
          <h2 className="text-2xl font-black">This demonstration is isolated</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Not in farmer history',
              'Not in research datasets',
              'No score or reward',
              'Deleted within 24 hours',
            ].map((label) => (
              <p key={label} className="border border-white/40 p-3 text-sm font-black">
                ✓ {label}
              </p>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/virtual-ndani')}
              className="bg-[#f1d34f] px-5 py-4 font-black text-black"
            >
              Return to my real Virtual Ndani Kit
            </button>
            <button
              type="button"
              onClick={async () => {
                await deletePhysicalNdaniDemo(
                  demo.virtual_device_id,
                  demo.demo_session_id
                );
                navigate('/virtual-ndani');
              }}
              className="border-2 border-white px-5 py-4 font-black"
            >
              Delete this demonstration now
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 border-t border-white/20 pt-3">
      <p className="text-[10px] font-black uppercase text-white/50">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    secure_element_signing: 'Secure element signs',
    lora_transmission: 'LoRa transmits',
    freedom_node_validation: 'Freedom Node validates',
    privacy_proof: 'Privacy proof stage',
    model_pipeline: 'Model contribution stage',
  };
  return labels[stage] || stage.replace(/_/g, ' ');
}
