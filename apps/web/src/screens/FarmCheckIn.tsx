import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadAiFarmPlans,
  loadWeeklyFarmCheckins,
  saveWeeklyFarmCheckin,
} from '../agent/api';
import { PilotBrand } from '../agent/PilotBrand';
import type {
  PilotSession,
  AiFarmPlan,
  WeeklyFarmCheckin,
  WeeklyFarmCheckinDraft,
} from '../agent/types';

const SOIL_OPTIONS = [
  { value: 'very_dry', label: 'Very dry', shona: 'Kuoma zvakanyanya' },
  { value: 'dry', label: 'Dry', shona: 'Kuoma' },
  { value: 'moist', label: 'Moist', shona: 'Kunyorova' },
  { value: 'wet', label: 'Wet', shona: 'Kunyanya kunyorova' },
  { value: 'waterlogged', label: 'Waterlogged', shona: 'Mvura yakawandisa' },
] as const;

const PLANT_OPTIONS = [
  { value: 'good', label: 'Good', shona: 'Zvakamira zvakanaka' },
  { value: 'fair', label: 'Fair', shona: 'Zviri pakati' },
  { value: 'poor', label: 'Poor', shona: 'Hazvina kumira zvakanaka' },
] as const;

const PEST_OPTIONS = [
  { value: 'none', label: 'None seen', shona: 'Hapana zvaonekwa' },
  { value: 'some', label: 'Some signs', shona: 'Zviripo zvishoma' },
  { value: 'severe', label: 'Serious signs', shona: 'Zvakanyanya' },
] as const;

const RAIN_OPTIONS = [
  { value: 'no_recent_rain', label: 'No recent rain', shona: 'Hakuna mvura ichangobva kunaya' },
  { value: 'light_recent_rain', label: 'Light rain', shona: 'Mvura shoma' },
  { value: 'heavy_recent_rain', label: 'Heavy rain', shona: 'Mvura yakawanda' },
] as const;

const IRRIGATION_OPTIONS = [
  { value: 'yes', label: 'Yes', shona: 'Hongu' },
  { value: 'no', label: 'No', shona: 'Kwete' },
  { value: 'not_needed', label: 'Not needed', shona: 'Hazvina kudiwa' },
] as const;

const ADVICE_OPTIONS = [
  { value: 'true', label: 'Yes', shona: 'Hongu' },
  { value: 'false', label: 'No', shona: 'Kwete' },
  { value: 'unknown', label: 'Not sure', shona: 'Handina chokwadi' },
] as const;

export function FarmCheckIn({
  session,
  onLogout,
}: {
  session: PilotSession;
  onLogout: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [farmId, setFarmId] = useState(session.farms[0]?.farm_id || '');
  const [history, setHistory] = useState<WeeklyFarmCheckin[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<WeeklyFarmCheckin | null>(null);
  const [plan, setPlan] = useState<AiFarmPlan | null>(null);
  const [plans, setPlans] = useState<AiFarmPlan[]>([]);
  const [draft, setDraft] = useState<WeeklyFarmCheckinDraft>({
    farm_id: session.farms[0]?.farm_id || '',
    crop: '',
    crop_stage: '',
    soil_condition: 'moist',
    plant_condition: 'good',
    pest_disease_signs: 'none',
    rain_condition: 'no_recent_rain',
    irrigation_done: 'not_needed',
    farmer_biggest_worry: '',
    labour_or_input_constraint: '',
    followed_previous_advice: null,
    observed_change: '',
    manual_notes: '',
  });

  const selectedFarm = useMemo(
    () => session.farms.find((farm) => farm.farm_id === farmId),
    [session.farms, farmId]
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadWeeklyFarmCheckins(),
      loadAiFarmPlans(),
    ])
      .then(([checkins, farmPlans]) => {
        if (!active) return;
        setHistory(checkins);
        setPlans(farmPlans);
      })
      .catch(() => {
        if (active) setError('EdgeChain could not load previous check-ins and plans.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDraft((current) => ({ ...current, farm_id: farmId }));
  }, [farmId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!farmId || saving) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    setPlan(null);
    try {
      const result = await saveWeeklyFarmCheckin({
        ...draft,
        farm_id: farmId,
      });
      const { checkin, plan: weeklyPlan } = result;
      setSaved(checkin);
      setPlan(weeklyPlan);
      setHistory((current) => [checkin, ...current].slice(0, 8));
      setPlans((current) => [weeklyPlan, ...current].slice(0, 8));
    } catch {
      setError('This weekly check-in and plan could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
              Weekly Farm Check-in
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
              Teach your AI Farm Manager what changed this week
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-gray-700">
              You enter observations manually. EdgeChain remembers, organizes,
              and prepares them for personalized advice.
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

        {error && (
          <p role="alert" className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 font-bold text-red-800">
            {error}
          </p>
        )}
        {saved && plan && (
          <section className="mt-6 border-2 border-black bg-[#dff3d8] p-5 shadow-[6px_6px_0_#000]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#27653a]">
              Your weekly farm plan
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {plan.summary}
            </h2>
            <p className="mt-2 font-bold text-[#27653a]">
              Risk: {riskLabel(plan.risk_level)} · Confidence: {plan.confidence}
              {plan.coordinator_review_required ? ' · Coordinator review recommended' : ''}
            </p>
            {plan.simple_explanation && (
              <p className="mt-3 text-gray-700">{plan.simple_explanation}</p>
            )}
            {plan.shona_summary && (
              <p className="mt-3 border-l-4 border-[#27653a] bg-white p-3 font-bold">
                {plan.shona_summary}
              </p>
            )}
            <ol className="mt-5 grid gap-3 md:grid-cols-2">
              {plan.recommended_actions.map((action) => (
                <li key={`${plan.plan_id}-${action.priority}`} className="border border-black bg-white p-4">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Action {action.priority} · {action.timeframe}
                  </p>
                  <h3 className="mt-1 font-black">{action.title}</h3>
                  <p className="mt-2 text-sm">{action.action}</p>
                  <p className="mt-2 text-xs text-gray-600">{action.reason}</p>
                  {action.shona_phrase && (
                    <p className="mt-2 text-sm font-bold text-[#27653a]">
                      {action.shona_phrase}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {plan.follow_up_question && (
              <p className="mt-4 border-2 border-black bg-[#f1d34f] p-3 font-black">
                Follow-up: {plan.follow_up_question}
              </p>
            )}
          </section>
        )}

        <section className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={submit} className="border-2 border-black bg-white p-5 shadow-[8px_8px_0_#000] sm:p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide">Farm</span>
                <select
                  value={farmId}
                  onChange={(event) => setFarmId(event.target.value)}
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-3 font-bold"
                >
                  {session.farms.map((farm) => (
                    <option key={farm.farm_id} value={farm.farm_id}>
                      {farm.display_name} · {farm.site_id}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Main crop this week"
                value={draft.crop}
                placeholder="e.g. maize, tomatoes"
                onChange={(value) => setDraft((current) => ({ ...current, crop: value }))}
              />
              <TextField
                label="Crop stage"
                value={draft.crop_stage}
                placeholder="e.g. flowering, early growth"
                onChange={(value) => setDraft((current) => ({ ...current, crop_stage: value }))}
              />
              <TextField
                label="Biggest worry"
                value={draft.farmer_biggest_worry}
                placeholder="What worries you most right now?"
                onChange={(value) => setDraft((current) => ({ ...current, farmer_biggest_worry: value }))}
              />
            </div>

            <OptionGroup
              title="Soil condition"
              options={SOIL_OPTIONS}
              value={draft.soil_condition}
              onChange={(value) => setDraft((current) => ({ ...current, soil_condition: value }))}
            />
            <OptionGroup
              title="Plant condition"
              options={PLANT_OPTIONS}
              value={draft.plant_condition}
              onChange={(value) => setDraft((current) => ({ ...current, plant_condition: value }))}
            />
            <OptionGroup
              title="Pests or disease"
              options={PEST_OPTIONS}
              value={draft.pest_disease_signs}
              onChange={(value) => setDraft((current) => ({ ...current, pest_disease_signs: value }))}
            />
            <OptionGroup
              title="Rain this week"
              options={RAIN_OPTIONS}
              value={draft.rain_condition}
              onChange={(value) => setDraft((current) => ({ ...current, rain_condition: value }))}
            />
            <OptionGroup
              title="Did you irrigate?"
              options={IRRIGATION_OPTIONS}
              value={draft.irrigation_done}
              onChange={(value) => setDraft((current) => ({ ...current, irrigation_done: value }))}
            />
            <OptionGroup
              title="Did you follow the previous advice?"
              options={ADVICE_OPTIONS}
              value={adviceValue(draft.followed_previous_advice)}
              onChange={(value) => setDraft((current) => ({
                ...current,
                followed_previous_advice:
                  value === 'unknown' ? null : value === 'true',
              }))}
            />

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <TextArea
                label="What changed?"
                value={draft.observed_change}
                placeholder="e.g. leaves yellowing, weeds increasing, plants recovering"
                onChange={(value) => setDraft((current) => ({ ...current, observed_change: value }))}
              />
              <TextArea
                label="Labour or input constraint"
                value={draft.labour_or_input_constraint}
                placeholder="e.g. no fertilizer, not enough labour, pump broken"
                onChange={(value) => setDraft((current) => ({ ...current, labour_or_input_constraint: value }))}
              />
              <TextArea
                label="Any other notes"
                value={draft.manual_notes}
                placeholder="Optional"
                onChange={(value) => setDraft((current) => ({ ...current, manual_notes: value }))}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-7 w-full bg-[#183c28] px-5 py-4 text-left text-xl font-black text-white hover:bg-[#24583b] disabled:opacity-60"
            >
              {saving ? 'Saving check-in…' : 'Save weekly check-in'}
            </button>
          </form>

          <aside className="space-y-5">
            <section className="border-2 border-black bg-[#183c28] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#cbe7ba]">
                Why this matters
              </p>
              <h2 className="mt-2 text-2xl font-black">This is your farm memory.</h2>
              <p className="mt-4 leading-relaxed text-white/85">
                Today, you record weekly observations. Next, Ndani Kit hardware
                automates more readings. Future EdgeChain keeps this intelligence
                record private and controlled by the farmer.
              </p>
            </section>

            <section className="border-2 border-black bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                Recent check-ins
              </p>
              {loading ? (
                <p className="mt-4 font-bold">Loading…</p>
              ) : history.length === 0 ? (
                <p className="mt-4 text-gray-600">
                  No weekly check-ins yet for {selectedFarm?.display_name ?? 'this farm'}.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {history.slice(0, 4).map((checkin) => (
                    <li key={checkin.checkin_id} className="border border-black p-3">
                      <p className="font-black">{formatWeek(checkin.week_start)}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {checkin.crop || 'Crop not named'} · {pretty(checkin.soil_condition)} soil · {riskLabel(checkin.risk_level)} risk
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="border-2 border-black bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                Recent AI plans
              </p>
              {loading ? (
                <p className="mt-4 font-bold">Loading…</p>
              ) : plans.length === 0 ? (
                <p className="mt-4 text-gray-600">
                  No weekly plans yet.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {plans.slice(0, 3).map((farmPlan) => (
                    <li key={farmPlan.plan_id} className="border border-black p-3">
                      <p className="font-black">{farmPlan.main_issue || 'Weekly plan'}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {riskLabel(farmPlan.risk_level)} risk · {farmPlan.recommended_actions.length} actions
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border-2 border-black px-3 py-3 font-bold"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full border-2 border-black px-3 py-3 font-bold"
      />
    </label>
  );
}

function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: T; label: string; shona: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-7">
      <legend className="text-xs font-black uppercase tracking-wide">{title}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`border-2 border-black p-4 text-left ${
              value === option.value
                ? 'bg-[#f1d34f] shadow-[4px_4px_0_#000]'
                : 'bg-white hover:bg-[#f7f1d1]'
            }`}
          >
            <span className="block font-black">{option.label}</span>
            <span className="mt-1 block text-sm text-gray-700">({option.shona})</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function adviceValue(value: boolean | null): 'true' | 'false' | 'unknown' {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return 'unknown';
}

function riskLabel(risk: WeeklyFarmCheckin['risk_level']): string {
  if (risk === 'high') return 'high';
  if (risk === 'medium') return 'medium';
  if (risk === 'low') return 'low';
  return 'unknown';
}

function pretty(value: string | null): string {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
}

function formatWeek(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
