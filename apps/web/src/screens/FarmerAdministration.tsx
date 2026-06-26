import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteCoordinatorFarmer,
  enrollCoordinatorFarmer,
  loadCoordinatorFarmerAiProfile,
  resetCoordinatorFarmerPin,
  saveCoordinatorFarmerAiProfile,
  updateCoordinatorFarmer,
} from '../agent/api';
import type { CoordinatorFarmer, FarmerAiProfile } from '../agent/types';

export function FarmerAdministration({
  farmers,
  onChanged,
}: {
  farmers: CoordinatorFarmer[];
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-7 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0000ff]">
            Farmer administration
          </p>
          <h2 className="mt-1 text-3xl font-black">People, farms and AI usage</h2>
          <p className="mt-2 max-w-3xl text-gray-700">
            Each farmer receives an isolated EdgeChain profile, farm, PIN and Virtual Ndani Kit.
            Gemini is shared at account level; conversation context and costs remain separated here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="bg-[#0000ff] px-5 py-3 font-black text-white"
        >
          {showForm ? 'Close form' : 'Add farmer'}
        </button>
      </div>

      {message && (
        <p className="mt-5 border-l-4 border-[#27653a] bg-[#dff3d8] p-3 font-bold">{message}</p>
      )}
      {error && (
        <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-50 p-3 font-bold text-red-800">
          {error}
        </p>
      )}

      {showForm && (
        <EnrollmentForm
          saving={workingId === 'new'}
          onSubmit={async (input) => {
            setWorkingId('new');
            setError(null);
            setMessage(null);
            try {
              const farmer = await enrollCoordinatorFarmer(input);
              setMessage(`${farmer.pilot_code} was enrolled and assigned ${farmer.device_code}.`);
              setShowForm(false);
              await onChanged();
            } catch (submitError) {
              setError(errorMessage(submitError));
            } finally {
              setWorkingId(null);
            }
          }}
        />
      )}

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {farmers.map((farmer) => (
          <FarmerCard
            key={farmer.farmer_id}
            farmer={farmer}
            working={workingId === farmer.farmer_id}
            onSave={async (update) => {
              setWorkingId(farmer.farmer_id);
              setError(null);
              setMessage(null);
              try {
                await updateCoordinatorFarmer({ farmerId: farmer.farmer_id, ...update });
                setMessage(`${farmer.pilot_code} was updated.`);
                await onChanged();
              } catch (saveError) {
                setError(errorMessage(saveError));
              } finally {
                setWorkingId(null);
              }
            }}
            onResetPin={async (pin) => {
              setWorkingId(farmer.farmer_id);
              setError(null);
              setMessage(null);
              try {
                await resetCoordinatorFarmerPin(farmer.farmer_id, pin);
                setMessage(`${farmer.pilot_code} received a new PIN. Existing sessions were signed out.`);
                await onChanged();
              } catch (resetError) {
                setError(errorMessage(resetError));
              } finally {
                setWorkingId(null);
              }
            }}
            onDelete={async () => {
              setWorkingId(farmer.farmer_id);
              setError(null);
              setMessage(null);
              try {
                await deleteCoordinatorFarmer(farmer.farmer_id);
                setMessage(`${farmer.pilot_code} and their Ndani Kit were deleted.`);
                await onChanged();
              } catch (deleteError) {
                setError(errorMessage(deleteError));
              } finally {
                setWorkingId(null);
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

function EnrollmentForm({
  saving,
  onSubmit,
}: {
  saving: boolean;
  onSubmit: (input: {
    pilotCode: string;
    displayName: string;
    preferredLanguage: 'en' | 'sn' | 'sn-en';
    pin: string;
    siteId: string;
    farmDisplayName: string;
  }) => Promise<void>;
}) {
  const [pilotCode, setPilotCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [farmDisplayName, setFarmDisplayName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [pin, setPin] = useState('');
  const [preferredLanguage, setPreferredLanguage] =
    useState<'en' | 'sn' | 'sn-en'>('sn-en');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      pilotCode,
      displayName,
      preferredLanguage,
      pin,
      siteId,
      farmDisplayName,
    });
  };

  return (
    <form onSubmit={submit} className="mt-6 border-2 border-black bg-[#f4f1e8] p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Farmer number">
          <input
            value={pilotCode}
            onChange={(event) => setPilotCode(event.target.value.toUpperCase())}
            pattern="[A-Z0-9-]{3,24}"
            placeholder="ODZI-003"
            required
            className="input"
          />
        </Field>
        <Field label="Farmer name">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className="input" />
        </Field>
        <Field label="Farm name">
          <input value={farmDisplayName} onChange={(event) => setFarmDisplayName(event.target.value)} required className="input" />
        </Field>
        <Field label="Site ID">
          <input
            value={siteId}
            onChange={(event) => setSiteId(event.target.value.toLowerCase())}
            pattern="site-[0-9]{3}"
            placeholder="site-003"
            required
            className="input"
          />
        </Field>
        <Field label="Language">
          <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as typeof preferredLanguage)} className="input">
            <option value="sn-en">Shona + English</option>
            <option value="sn">Shona</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Initial PIN">
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
            pattern="[0-9]{4,8}"
            inputMode="numeric"
            required
            className="input"
          />
        </Field>
      </div>
      <button disabled={saving} className="mt-5 bg-[#183c28] px-6 py-3 font-black text-white disabled:opacity-50">
        {saving ? 'Creating farmer…' : 'Create farmer and Ndani Kit'}
      </button>
    </form>
  );
}

function FarmerCard({
  farmer,
  working,
  onSave,
  onResetPin,
  onDelete,
}: {
  farmer: CoordinatorFarmer;
  working: boolean;
  onSave: (input: {
    displayName: string;
    preferredLanguage: 'en' | 'sn' | 'sn-en';
    status: 'active' | 'suspended' | 'withdrawn';
    farmDisplayName: string;
  }) => Promise<void>;
  onResetPin: (pin: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(farmer.display_name);
  const [farmDisplayName, setFarmDisplayName] = useState(farmer.farm_display_name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(farmer.preferred_language);
  const [status, setStatus] = useState(farmer.status);
  const [pin, setPin] = useState('');

  return (
    <article className="border-2 border-black p-5">
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#0000ff]">{farmer.pilot_code}</p>
          <h3 className="mt-1 text-2xl font-black">{farmer.display_name}</h3>
          <p className="text-sm text-gray-600">{farmer.farm_display_name} · {farmer.site_id}</p>
        </div>
        <span className={`h-fit border border-black px-2 py-1 text-xs font-black uppercase ${
          farmer.status === 'active' ? 'bg-[#dff3d8]' : 'bg-[#f1d34f]'
        }`}>
          {farmer.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Fact label="Ndani Kit" value={farmer.device_code || 'Provisioning'} />
        <Fact label="Language" value={languageLabel(farmer.preferred_language)} />
        <Fact label="Active sessions" value={String(farmer.active_sessions)} />
        <Fact label="Last login" value={farmer.last_used_at ? new Date(farmer.last_used_at * 1000).toLocaleDateString() : 'Never'} />
        <Fact label="Gemini requests" value={String(farmer.gemini_request_count)} />
        <Fact label="Gemini cost" value={`$${farmer.gemini_estimated_cost_usd.toFixed(4)}`} />
      </div>

      <button type="button" onClick={() => setEditing((current) => !current)} className="mt-4 font-black text-[#0000ff] underline">
        {editing ? 'Close administration' : 'Administer farmer'}
      </button>

      {editing && (
        <div className="mt-4 border-t-2 border-black pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Farmer name">
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="input" />
            </Field>
            <Field label="Farm name">
              <input value={farmDisplayName} onChange={(event) => setFarmDisplayName(event.target.value)} className="input" />
            </Field>
            <Field label="Language">
              <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as typeof preferredLanguage)} className="input">
                <option value="sn-en">Shona + English</option>
                <option value="sn">Shona</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Account status">
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="input">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </Field>
          </div>
          <button
            type="button"
            disabled={working}
            onClick={() => void onSave({ displayName, farmDisplayName, preferredLanguage, status })}
            className="mt-4 bg-black px-5 py-2 font-black text-white disabled:opacity-50"
          >
            Save profile
          </button>

          <AiManagerProfileEditor farmer={farmer} working={working} />

          <div className="mt-5 border-t border-gray-300 pt-4">
            <p className="text-sm font-black">Reset personal PIN</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                pattern="[0-9]{4,8}"
                inputMode="numeric"
                placeholder="4–8 digits"
                className="input"
              />
              <button
                type="button"
                disabled={working || !/^\d{4,8}$/.test(pin)}
                onClick={() => void onResetPin(pin).then(() => setPin(''))}
                className="shrink-0 bg-[#f1d34f] px-4 font-black disabled:opacity-40"
              >
                Reset PIN
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600">Resetting the PIN signs the farmer out on all devices.</p>
          </div>

          <div className="mt-5 border-t border-red-200 pt-4">
            <p className="text-sm font-black text-red-800">Delete farmer</p>
            <p className="mt-1 text-xs text-gray-600">
              This removes the farmer profile, farm assignment, sessions and Virtual Ndani Kit records.
            </p>
            <button
              type="button"
              disabled={working}
              onClick={() => {
                const confirmed = window.confirm(
                  `Delete ${farmer.pilot_code} and their Ndani Kit? This cannot be undone.`
                );
                if (confirmed) void onDelete();
              }}
              className="mt-3 border-2 border-red-800 bg-red-50 px-4 py-2 font-black text-red-800 disabled:opacity-40"
            >
              Delete farmer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function AiManagerProfileEditor({
  farmer,
  working,
}: {
  farmer: CoordinatorFarmer;
  working: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<FarmerAiProfile | null>(null);
  const [preferredLanguage, setPreferredLanguage] =
    useState<'en' | 'sn' | 'sn-en'>(farmer.preferred_language);
  const [literacyLevel, setLiteracyLevel] = useState('');
  const [technologyComfort, setTechnologyComfort] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [primaryPainPoint, setPrimaryPainPoint] = useState('');
  const [secondaryPainPoints, setSecondaryPainPoints] = useState('');
  const [waterAccess, setWaterAccess] = useState('');
  const [irrigationMethod, setIrrigationMethod] = useState('');
  const [budgetConstraint, setBudgetConstraint] = useState('');
  const [labourConstraint, setLabourConstraint] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [currentCrop, setCurrentCrop] = useState('');
  const [currentCropStage, setCurrentCropStage] = useState('');
  const [soilType, setSoilType] = useState('');
  const [farmStorySummary, setFarmStorySummary] = useState('');
  const [aiManagerBrief, setAiManagerBrief] = useState('');
  const [profileStatus, setProfileStatus] =
    useState<'draft' | 'active' | 'needs_update' | 'archived'>('active');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadCoordinatorFarmerAiProfile(farmer.farmer_id)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setPreferredLanguage(loaded?.preferred_language || farmer.preferred_language);
        setLiteracyLevel(loaded?.literacy_level || '');
        setTechnologyComfort(loaded?.technology_comfort || '');
        setPrimaryGoal(loaded?.primary_goal || '');
        setPrimaryPainPoint(loaded?.primary_pain_point || '');
        setSecondaryPainPoints((loaded?.secondary_pain_points || []).join(', '));
        setWaterAccess(loaded?.water_access || '');
        setIrrigationMethod(loaded?.irrigation_method || '');
        setBudgetConstraint(loaded?.budget_constraint || '');
        setLabourConstraint(loaded?.labour_constraint || '');
        setMainCrops((loaded?.main_crops || []).join(', '));
        setCurrentCrop(loaded?.current_crop || '');
        setCurrentCropStage(loaded?.current_crop_stage || '');
        setSoilType(loaded?.soil_type || '');
        setFarmStorySummary(loaded?.farm_story_summary || '');
        setAiManagerBrief(loaded?.ai_manager_brief || '');
        setProfileStatus(loaded?.status || 'active');
      })
      .catch((loadError) => setError(errorMessage(loadError)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farmer.farmer_id, farmer.preferred_language]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveCoordinatorFarmerAiProfile({
        farmerId: farmer.farmer_id,
        preferredLanguage,
        literacyLevel,
        technologyComfort,
        primaryGoal,
        primaryPainPoint,
        secondaryPainPoints: listFromText(secondaryPainPoints),
        waterAccess,
        irrigationMethod,
        budgetConstraint,
        labourConstraint,
        mainCrops: listFromText(mainCrops),
        currentCrop,
        currentCropStage,
        soilType,
        farmStorySummary,
        aiManagerBrief,
        status: profileStatus,
      });
      setProfile(saved);
      setAiManagerBrief(saved.ai_manager_brief || '');
      setMessage('AI Farm Manager profile saved.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-5 border-t border-[#27653a]/30 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#27653a]">AI Farm Manager profile</p>
          <p className="mt-1 text-xs text-gray-600">
            Captures the farm story, pain points and constraints that will personalize this farmer’s AI agent.
          </p>
        </div>
        <span className="border border-black bg-[#dff3d8] px-2 py-1 text-[10px] font-black uppercase">
          {profile ? `brief v${profile.brief_version}` : 'not started'}
        </span>
      </div>

      {message && <p className="mt-3 bg-[#dff3d8] p-2 text-sm font-bold">{message}</p>}
      {error && <p className="mt-3 bg-red-50 p-2 text-sm font-bold text-red-800">{error}</p>}
      {loading && <p className="mt-3 text-sm font-bold">Loading AI profile…</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Current crop">
          <input value={currentCrop} onChange={(event) => setCurrentCrop(event.target.value)} placeholder="Tomato" className="input" />
        </Field>
        <Field label="Crop stage">
          <input value={currentCropStage} onChange={(event) => setCurrentCropStage(event.target.value)} placeholder="Flowering" className="input" />
        </Field>
        <Field label="Primary goal">
          <input value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value)} placeholder="Improve yield" className="input" />
        </Field>
        <Field label="Primary pain point">
          <input value={primaryPainPoint} onChange={(event) => setPrimaryPainPoint(event.target.value)} placeholder="Water timing" className="input" />
        </Field>
        <Field label="Main crops">
          <input value={mainCrops} onChange={(event) => setMainCrops(event.target.value)} placeholder="Tomato, maize" className="input" />
        </Field>
        <Field label="Other pain points">
          <input value={secondaryPainPoints} onChange={(event) => setSecondaryPainPoints(event.target.value)} placeholder="Pest identification, record keeping" className="input" />
        </Field>
        <Field label="Water access">
          <input value={waterAccess} onChange={(event) => setWaterAccess(event.target.value)} placeholder="Limited borehole irrigation" className="input" />
        </Field>
        <Field label="Irrigation method">
          <input value={irrigationMethod} onChange={(event) => setIrrigationMethod(event.target.value)} placeholder="Bucket, drip, flood" className="input" />
        </Field>
        <Field label="Budget constraint">
          <input value={budgetConstraint} onChange={(event) => setBudgetConstraint(event.target.value)} placeholder="Low input budget" className="input" />
        </Field>
        <Field label="Labour constraint">
          <input value={labourConstraint} onChange={(event) => setLabourConstraint(event.target.value)} placeholder="Limited labour during weekdays" className="input" />
        </Field>
        <Field label="Soil type">
          <input value={soilType} onChange={(event) => setSoilType(event.target.value)} placeholder="Unknown, sandy, clay..." className="input" />
        </Field>
        <Field label="AI language">
          <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as typeof preferredLanguage)} className="input">
            <option value="sn-en">Shona + English</option>
            <option value="sn">Shona</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <div className="mt-3 grid gap-3">
        <Field label="Farm story summary">
          <textarea
            value={farmStorySummary}
            onChange={(event) => setFarmStorySummary(event.target.value)}
            placeholder="What has this farmer struggled with in recent seasons?"
            className="input min-h-24"
          />
        </Field>
        <Field label="AI Manager Brief">
          <textarea
            value={aiManagerBrief}
            onChange={(event) => setAiManagerBrief(event.target.value)}
            placeholder="Leave blank to auto-generate from the profile."
            className="input min-h-24"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select value={profileStatus} onChange={(event) => setProfileStatus(event.target.value as typeof profileStatus)} className="input w-auto">
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="needs_update">Needs update</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="button"
          disabled={working || saving || loading}
          onClick={() => void save()}
          className="bg-[#27653a] px-5 py-2 font-black text-white disabled:opacity-50"
        >
          {saving ? 'Saving AI profile…' : 'Save AI Farm Manager profile'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f4f1e8] p-3">
      <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function listFromText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function languageLabel(language: CoordinatorFarmer['preferred_language']) {
  if (language === 'sn') return 'Shona';
  if (language === 'sn-en') return 'Shona + English';
  return 'English';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'pilot_code_or_site_already_exists') {
      return 'That farmer number or site ID is already in use.';
    }
    return error.message.replace(/_/g, ' ');
  }
  return 'The administration change could not be saved.';
}
