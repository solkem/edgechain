import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadFarmerAiReport,
  loadFarmerTimeline,
} from '../agent/api';
import { PilotBrand } from '../agent/PilotBrand';
import type {
  FarmerAiReport,
  FarmerTimelineEvent,
  PilotSession,
} from '../agent/types';

export function FarmTimelineReport({
  session,
  onLogout,
}: {
  session: PilotSession;
  onLogout: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [farmId, setFarmId] = useState(session.farms[0]?.farm_id || '');
  const [timeline, setTimeline] = useState<FarmerTimelineEvent[]>([]);
  const [report, setReport] = useState<FarmerAiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedFarm = useMemo(
    () => session.farms.find((farm) => farm.farm_id === farmId),
    [session.farms, farmId]
  );

  useEffect(() => {
    if (!farmId) return;
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      loadFarmerTimeline(farmId),
      loadFarmerAiReport(farmId),
    ])
      .then(([events, farmReport]) => {
        if (!active) return;
        setTimeline(events);
        setReport(farmReport);
      })
      .catch(() => {
        if (active) setError('EdgeChain could not load the farm timeline and report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farmId]);

  if (session.farms.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-6">
        <section className="max-w-lg border-2 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
          <h1 className="text-3xl font-black">No farm assigned</h1>
          <p className="mt-4 text-gray-700">
            Ask the pilot coordinator to assign a farm to your farmer profile.
          </p>
          <button
            onClick={() => void onLogout().then(() => navigate('/pilot-login'))}
            className="mt-7 bg-black px-5 py-3 font-bold text-white"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-4 pb-16 pt-20 text-[#171713] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-5 border-b-2 border-black pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <PilotBrand compact />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-[#27653a]">
              Farm timeline and report
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
              Your farm intelligence record
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-gray-700">
              EdgeChain remembers your check-ins, AI plans, follow-ups and Ndani Kit activity so your farm record becomes more useful over time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/virtual-ndani')}
              className="border-2 border-black bg-[#f1d34f] px-5 py-3 font-black"
            >
              My Virtual Ndani Kit
            </button>
            <button
              type="button"
              onClick={() => void onLogout().then(() => navigate('/pilot-login'))}
              className="border-2 border-black bg-white px-5 py-3 font-black hover:bg-black hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mt-6 flex flex-wrap items-center gap-3">
          <label className="font-black">
            Farm
            <select
              value={farmId}
              onChange={(event) => setFarmId(event.target.value)}
              className="ml-3 border-2 border-black bg-white px-3 py-2 font-bold"
            >
              {session.farms.map((farm) => (
                <option key={farm.farm_id} value={farm.farm_id}>
                  {farm.display_name} · {farm.site_id}
                </option>
              ))}
            </select>
          </label>
          {selectedFarm && (
            <span className="border border-black bg-white px-3 py-2 text-sm font-bold">
              {selectedFarm.display_name} · {selectedFarm.site_id}
            </span>
          )}
        </section>

        {error && (
          <p role="alert" className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-lg font-black">Loading your farm record…</p>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-5">
              {report && <ReportSummary report={report} />}
              {report && <FarmerReport report={report} />}
            </section>
            <section className="border-2 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#27653a]">
                Timeline
              </p>
              <h2 className="mt-1 text-3xl font-black">What EdgeChain remembers</h2>
              {timeline.length === 0 ? (
                <p className="mt-4 text-gray-600">
                  No farm timeline events yet. Start with a weekly check-in.
                </p>
              ) : (
                <ol className="mt-6 space-y-4">
                  {timeline.map((event) => (
                    <li
                      key={event.event_id}
                      className="grid grid-cols-[16px_1fr] gap-3 border-b border-gray-200 pb-4"
                    >
                      <span className={`mt-1.5 h-4 w-4 rounded-full ${eventDot(event.event_type)}`} />
                      <article>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">{event.title}</p>
                          <span className="border border-black px-2 py-0.5 text-[10px] font-black uppercase">
                            {event.event_type.replace(/_/g, ' ')}
                          </span>
                          {event.risk_level && (
                            <span className="bg-[#f1d34f] px-2 py-0.5 text-[10px] font-black uppercase">
                              {event.risk_level} risk
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(event.occurred_at)}</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-700">{event.summary}</p>
                      </article>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function ReportSummary({ report }: { report: FarmerAiReport }) {
  return (
    <section className="border-2 border-black bg-[#183c28] p-5 text-white shadow-[8px_8px_0_#000]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#cbe7ba]">
        Pilot report
      </p>
      <h2 className="mt-1 text-3xl font-black">{report.farm.name}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Check-ins" value={String(report.summary.checkins)} />
        <Metric label="AI plans" value={String(report.summary.plans)} />
        <Metric label="High-risk weeks" value={String(report.summary.high_risk_weeks)} />
        <Metric label="Ndani Kits" value={String(report.summary.virtual_ndani_devices)} />
      </div>
      <p className="mt-5 border-l-4 border-[#cbe7ba] bg-white/10 p-3 text-sm">
        {report.physical_ndani_kit_readiness}
      </p>
    </section>
  );
}

function FarmerReport({ report }: { report: FarmerAiReport }) {
  return (
    <section className="space-y-4">
      {report.profile && (
        <ReportCard title="Farm manager brief">
          <p>{report.profile.ai_manager_brief || 'Profile brief not yet captured.'}</p>
          <p className="mt-3 text-sm text-gray-600">
            Crop: {report.profile.current_crop || 'unknown'} · Stage: {report.profile.current_crop_stage || 'unknown'} · Main issue: {report.profile.primary_pain_point || 'unknown'}
          </p>
        </ReportCard>
      )}
      <ReportList title="Crop journey" items={report.crop_journey} />
      <ReportList title="Weekly observation summary" items={report.weekly_observation_summary} />
      <ReportList title="Advice generated" items={report.advice_summary} />
      <ReportList title="Follow-up questions" items={report.follow_up_questions} />
      <ReportList title="Lessons learned" items={report.lessons_learned} />
      <ReportList title="Next-season recommendations" items={report.next_season_recommendations} />
      <ReportCard title="Farmer privacy and control">
        <p>{report.privacy_and_control_statement}</p>
      </ReportCard>
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <ReportCard title={title}>
      {items.length === 0 ? (
        <p className="text-gray-600">No records yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="border-l-4 border-[#27653a] bg-[#f4f1e8] p-3 text-sm">
              {item}
            </li>
          ))}
        </ul>
      )}
    </ReportCard>
  );
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-2 border-black bg-white p-5">
      <h3 className="text-xl font-black">{title}</h3>
      <div className="mt-3 leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/40 p-3">
      <p className="text-xs font-black uppercase text-white/60">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function eventDot(type: FarmerTimelineEvent['event_type']): string {
  if (type === 'plan') return 'bg-[#f1d34f]';
  if (type === 'checkin') return 'bg-[#27653a]';
  if (type === 'ndani_kit') return 'bg-blue-700';
  return 'bg-black';
}

function formatDateTime(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
