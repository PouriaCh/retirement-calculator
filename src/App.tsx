import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Link,
  PiggyBank,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { NumberField } from './components/NumberField';
import { SliderField } from './components/SliderField';
import { StatCard } from './components/StatCard';
import { ProjectionChart } from './components/ProjectionChart';
import { BalanceMiniChart } from './components/BalanceMiniChart';
import {
  type ContributionFrequency,
  type PlanInput,
  calculateProjection,
  summarizeProjection,
} from './lib/calculator';

const defaultPlan: PlanInput = {
  currentAge: 32,
  retirementAge: 65,
  currentBalance: 40000,
  contribution: 850,
  annualIncome: 90000,
  rrspCarryForward: 0,
  employerMatchPercent: 0,
  employerMatchCap: 0,
  annualReturn: 6.5,
  inflation: 2.1,
  salaryGrowth: 2.5,
  frequency: 'monthly',
};

const defaultTfsaPlan = {
  currentBalance: 18000,
  contribution: 450,
  frequency: 'monthly' as ContributionFrequency,
  annualReturn: 5.5,
};

const CRA_MAX_2024 = 31560;
const TFSA_ANNUAL_LIMIT_2024 = 7000;

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

const compactCurrency = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return currency.format(value);
};

const sampleMilestones = <T,>(data: T[], target = 8) => {
  if (data.length <= target) return data;
  const bucketSize = Math.ceil(data.length / (target - 1));
  return data.filter((_, index) => index % bucketSize === 0 || index === data.length - 1);
};

const STORAGE_KEY_PLAN = 'retirement-planner:plan';
const STORAGE_KEY_TFSA = 'retirement-planner:tfsa';
const STORAGE_KEY_MODE = 'retirement-planner:mode';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function encodeState(plan: PlanInput, tfsaPlan: typeof defaultTfsaPlan): string {
  try {
    return btoa(JSON.stringify({ p: plan, t: tfsaPlan }));
  } catch {
    return '';
  }
}

function decodeState(
  encoded: string,
  fallbackPlan: PlanInput,
  fallbackTfsa: typeof defaultTfsaPlan
): { plan: PlanInput; tfsaPlan: typeof defaultTfsaPlan } | null {
  try {
    const raw = JSON.parse(atob(encoded));
    if (!raw?.p || !raw?.t) return null;
    return {
      plan: { ...fallbackPlan, ...raw.p },
      tfsaPlan: { ...fallbackTfsa, ...raw.t },
    };
  } catch {
    return null;
  }
}

function getUrlParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('s');
  } catch {
    return null;
  }
}

type Mode = 'quick' | 'customize' | 'reverse';

const PERIODS_PER_YEAR: Record<ContributionFrequency, number> = {
  monthly: 12,
  biweekly: 26,
  weekly: 52,
};

function App() {
  const [mode, setMode] = useState<Mode>(() => loadFromStorage(STORAGE_KEY_MODE, 'quick') as Mode);
  const [plan, setPlan] = useState<PlanInput>(() => {
    const urlParam = getUrlParam();
    if (urlParam) {
      const decoded = decodeState(urlParam, defaultPlan, defaultTfsaPlan);
      if (decoded) return decoded.plan;
    }
    return loadFromStorage(STORAGE_KEY_PLAN, defaultPlan);
  });
  const [tfsaPlan, setTfsaPlan] = useState<typeof defaultTfsaPlan>(() => {
    const urlParam = getUrlParam();
    if (urlParam) {
      const decoded = decodeState(urlParam, defaultPlan, defaultTfsaPlan);
      if (decoded) return decoded.tfsaPlan;
    }
    return loadFromStorage(STORAGE_KEY_TFSA, defaultTfsaPlan);
  });
  const [reverseTargetIncome, setReverseTargetIncome] = useState(100000);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TFSA, JSON.stringify(tfsaPlan));
  }, [tfsaPlan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, JSON.stringify(mode));
  }, [mode]);

  // Keep URL in sync
  useEffect(() => {
    const encoded = encodeState(plan, tfsaPlan);
    if (!encoded) return;
    const url = new URL(window.location.href);
    url.searchParams.set('s', encoded);
    window.history.replaceState(null, '', url.toString());
  }, [plan, tfsaPlan]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Calculate projections
  const projection = useMemo(() => calculateProjection(plan), [plan]);
  const summary = useMemo(() => summarizeProjection(projection), [projection]);
  const tfsaProjection = useMemo(
    () =>
      calculateProjection({
        ...plan,
        currentBalance: tfsaPlan.currentBalance,
        contribution: tfsaPlan.contribution,
        frequency: tfsaPlan.frequency,
        annualReturn: tfsaPlan.annualReturn,
        salaryGrowth: 0,
        employerMatchPercent: 0,
        employerMatchCap: 0,
      }),
    [plan, tfsaPlan]
  );
  const tfsaSummary = useMemo(() => summarizeProjection(tfsaProjection), [tfsaProjection]);

  const annualContribution = plan.contribution * PERIODS_PER_YEAR[plan.frequency];
  const safeWithdrawal = summary.finalBalance * 0.04;
  const tfsaSafeWithdrawal = tfsaSummary.finalBalance * 0.04;
  const combinedSafeWithdrawal = safeWithdrawal + tfsaSafeWithdrawal;
  const combinedNestEgg = summary.finalBalance + tfsaSummary.finalBalance;
  const combinedInflationAdjusted = summary.inflationAdjusted + tfsaSummary.inflationAdjusted;

  // Verdict logic
  const combinedInflationAdjustedWithdrawal = combinedInflationAdjusted * 0.04;
  const hasIncomeForVerdict = plan.annualIncome > 0;
  const verdictRatio = hasIncomeForVerdict
    ? combinedInflationAdjustedWithdrawal / (plan.annualIncome * 0.7)
    : null;
  const verdictStatus: 'green' | 'amber' | 'red' =
    verdictRatio === null
      ? 'amber'
      : verdictRatio >= 1
        ? 'green'
        : verdictRatio >= 0.7
          ? 'amber'
          : 'red';
  const targetRetirementIncome = plan.annualIncome * 0.7;
  const verdictGap = hasIncomeForVerdict
    ? combinedInflationAdjustedWithdrawal - targetRetirementIncome
    : null;

  // Reverse calculator: how much to save to hit target income
  const requiredMonthlyForTarget = useMemo(() => {
    if (reverseTargetIncome <= 0) return 0;
    // Binary search to find the contribution that achieves target
    let low = 0;
    let high = 50000;
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const testPlan = { ...plan, contribution: mid };
      const testProj = calculateProjection(testPlan);
      const testSummary = summarizeProjection(testProj);
      const testWithdrawal = testSummary.finalBalance * 0.04;
      if (testWithdrawal < reverseTargetIncome) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }, [plan, reverseTargetIncome]);

  const updatePlan = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => {
    setPlan((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof value === 'number') {
        if (key === 'currentAge') {
          if (value >= next.retirementAge) next.retirementAge = Math.min(value + 1, 71);
        }
        if (key === 'retirementAge') {
          if (value <= next.currentAge) next.retirementAge = next.currentAge + 1;
        }
      }
      return next;
    });
  };

  const updateTfsaPlan = <K extends keyof typeof defaultTfsaPlan>(
    key: K,
    value: (typeof defaultTfsaPlan)[K]
  ) => {
    setTfsaPlan((prev) => ({ ...prev, [key]: value }));
  };

  // Mode-specific rendering
  const renderQuickStart = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-400">Step 1 of 5</p>
        <h3 className="mt-2 text-lg font-semibold text-white">How old are you?</h3>
      </div>
      <NumberField
        label="Current age"
        value={plan.currentAge}
        min={18}
        max={70}
        onChange={(value) => updatePlan('currentAge', value)}
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Step 2 of 5</p>
        <h3 className="mt-2 text-lg font-semibold text-white">When do you want to retire?</h3>
      </div>
      <NumberField
        label="Retirement age"
        value={plan.retirementAge}
        min={plan.currentAge + 1}
        max={71}
        onChange={(value) => updatePlan('retirementAge', value)}
        helper="RRSP must convert to RRIF by age 71"
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Step 3 of 5</p>
        <h3 className="mt-2 text-lg font-semibold text-white">What's your annual income?</h3>
      </div>
      <NumberField
        label="Annual income"
        prefix="$"
        value={plan.annualIncome}
        min={0}
        step={1000}
        onChange={(value) => updatePlan('annualIncome', value)}
        helper="We'll check if you're on track to replace 70% of this"
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Step 4 of 5</p>
        <h3 className="mt-2 text-lg font-semibold text-white">How much have you saved so far?</h3>
      </div>
      <NumberField
        label="Current savings"
        prefix="$"
        value={plan.currentBalance}
        min={0}
        step={1000}
        onChange={(value) => updatePlan('currentBalance', value)}
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Step 5 of 5</p>
        <h3 className="mt-2 text-lg font-semibold text-white">How much can you save per month?</h3>
      </div>
      <NumberField
        label="Monthly contribution"
        prefix="$"
        value={plan.contribution}
        min={0}
        step={50}
        onChange={(value) => updatePlan('contribution', value)}
      />
    </div>
  );

  const renderReverse = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-400">
          Your target retirement income
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">How much per year?</h3>
      </div>
      <NumberField
        label="Target annual retirement income"
        prefix="$"
        value={reverseTargetIncome}
        min={0}
        step={10000}
        onChange={(value) => setReverseTargetIncome(value)}
        helper="In today's dollars"
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Your timeline</p>
        <h3 className="mt-2 text-lg font-semibold text-white">When do you retire?</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Current age"
          value={plan.currentAge}
          min={18}
          max={70}
          onChange={(value) => updatePlan('currentAge', value)}
        />
        <NumberField
          label="Retirement age"
          value={plan.retirementAge}
          min={plan.currentAge + 1}
          max={71}
          onChange={(value) => updatePlan('retirementAge', value)}
        />
      </div>

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Your starting point</p>
        <h3 className="mt-2 text-lg font-semibold text-white">What do you have now?</h3>
      </div>
      <NumberField
        label="Current savings"
        prefix="$"
        value={plan.currentBalance}
        min={0}
        step={1000}
        onChange={(value) => updatePlan('currentBalance', value)}
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
          Factored into calculation
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Expected return</span>
            <span className="font-semibold text-white">{plan.annualReturn}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Inflation</span>
            <span className="font-semibold text-white">{plan.inflation}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Contribution frequency</span>
            <span className="font-semibold text-white capitalize">
              {plan.frequency === 'biweekly' ? 'Bi-weekly' : plan.frequency}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMode('customize')}
          className="mt-4 w-full text-xs font-medium text-brand hover:text-brand/80 transition"
        >
          Adjust assumptions →
        </button>
      </div>
    </div>
  );

  const renderCustomize = () => (
    <div className="space-y-6">
      {/* Core fields */}
      <div className="grid gap-6 sm:grid-cols-2">
        <NumberField
          label="Current age"
          value={plan.currentAge}
          min={18}
          max={70}
          onChange={(value) => updatePlan('currentAge', value)}
        />
        <NumberField
          label="Retirement age"
          value={plan.retirementAge}
          min={plan.currentAge + 1}
          max={71}
          onChange={(value) => updatePlan('retirementAge', value)}
          helper="RRSP converts to RRIF by 71"
        />
        <NumberField
          label="Current savings"
          prefix="$"
          value={plan.currentBalance}
          min={0}
          step={1000}
          onChange={(value) => updatePlan('currentBalance', value)}
        />
        <NumberField
          label="Annual income"
          prefix="$"
          value={plan.annualIncome}
          min={0}
          step={1000}
          onChange={(value) => updatePlan('annualIncome', value)}
          helper="Used for RRSP room calculation"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 text-sm font-medium text-slate-200">
          <span>Contribution frequency</span>
          <select
            value={plan.frequency}
            onChange={(event) =>
              updatePlan('frequency', event.target.value as PlanInput['frequency'])
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <NumberField
          label={`Contribution per ${plan.frequency.replace('bi', 'bi-')}`}
          prefix="$"
          value={plan.contribution}
          min={0}
          step={50}
          onChange={(value) => updatePlan('contribution', value)}
        />
      </div>

      {/* Rates */}
      <div className="border-t border-white/10 pt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">Assumptions</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <SliderField
            label="Expected return"
            value={plan.annualReturn}
            min={2}
            max={20}
            step={0.1}
            onChange={(value) => updatePlan('annualReturn', value)}
          />
          <SliderField
            label="Inflation rate"
            value={plan.inflation}
            min={1}
            max={4}
            step={0.1}
            onChange={(value) => updatePlan('inflation', value)}
          />
          <SliderField
            label="Salary growth"
            value={plan.salaryGrowth}
            min={0}
            max={6}
            step={0.1}
            onChange={(value) => updatePlan('salaryGrowth', value)}
          />
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <span className="flex items-center justify-between">
          <span>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</span>
          <span className="text-lg">{showAdvanced ? '−' : '+'}</span>
        </span>
      </button>

      {showAdvanced && (
        <>
          {/* Employer match */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Employer match</p>
            <NumberField
              label="Match rate (%)"
              suffix="%"
              value={plan.employerMatchPercent ?? 0}
              min={0}
              max={200}
              step={5}
              onChange={(value) => updatePlan('employerMatchPercent', value)}
              helper="e.g. 50 = 50¢ per $1 you contribute"
            />
            <NumberField
              label="Match cap (% of salary)"
              suffix="%"
              value={plan.employerMatchCap ?? 0}
              min={0}
              max={20}
              step={0.5}
              onChange={(value) => updatePlan('employerMatchCap', value)}
              helper="Match stops at this % of salary"
            />
          </div>

          {/* RRSP carry-forward */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">RRSP carry-forward</p>
            <NumberField
              label="CRA deduction room"
              prefix="$"
              value={plan.rrspCarryForward ?? 0}
              min={0}
              step={500}
              onChange={(value) => updatePlan('rrspCarryForward', value)}
              helper="From your Notice of Assessment"
            />
          </div>

          {/* TFSA */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">TFSA</p>
            <NumberField
              label="Current TFSA balance"
              prefix="$"
              value={tfsaPlan.currentBalance}
              min={0}
              step={1000}
              onChange={(value) => updateTfsaPlan('currentBalance', value)}
            />
            <NumberField
              label={`TFSA contribution per ${tfsaPlan.frequency.replace('bi', 'bi-')}`}
              prefix="$"
              value={tfsaPlan.contribution}
              min={0}
              step={50}
              onChange={(value) => updateTfsaPlan('contribution', value)}
            />
            <SliderField
              label="TFSA return rate"
              value={tfsaPlan.annualReturn}
              min={2}
              max={20}
              step={0.1}
              onChange={(value) => updateTfsaPlan('annualReturn', value)}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <PiggyBank className="h-3.5 w-3.5 text-brand" />
            Free retirement planner
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Will you be ready?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-300">
            Answer a few questions. Get a clear answer about your retirement.
          </p>
        </header>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { id: 'quick' as Mode, label: 'Quick Start', icon: '⚡' },
            { id: 'customize' as Mode, label: 'Customize', icon: '⚙️' },
            { id: 'reverse' as Mode, label: 'Reverse', icon: '🎯' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === m.id
                  ? 'border-brand bg-brand/20 text-brand'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Form */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-white mb-6">
              <div className="rounded-xl bg-brand/20 p-2 text-brand">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Enter your info</p>
                <p className="font-semibold">
                  {mode === 'quick'
                    ? 'Quick Start'
                    : mode === 'reverse'
                      ? 'What do you need?'
                      : 'Full Details'}
                </p>
              </div>
            </div>

            {mode === 'quick' && renderQuickStart()}
            {mode === 'reverse' && renderReverse()}
            {mode === 'customize' && renderCustomize()}
          </section>

          {/* Results */}
          <section className="flex flex-col gap-6">
            {/* Verdict (hidden in Reverse mode) */}
            {mode !== 'reverse' && (
              <div
                className={`rounded-3xl border p-6 shadow-xl shadow-black/30 ${
                  verdictStatus === 'green'
                    ? 'border-emerald-500/30 bg-emerald-950/60'
                    : verdictStatus === 'amber'
                      ? 'border-amber-500/30 bg-amber-950/60'
                      : 'border-rose-500/30 bg-rose-950/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {verdictStatus === 'green' && (
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
                    )}
                    {verdictStatus === 'amber' && (
                      <TrendingUp className="h-8 w-8 text-amber-400 flex-shrink-0" />
                    )}
                    {verdictStatus === 'red' && (
                      <TrendingDown className="h-8 w-8 text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`text-lg font-semibold ${
                          verdictStatus === 'green'
                            ? 'text-emerald-300'
                            : verdictStatus === 'amber'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }`}
                      >
                        {verdictStatus === 'green'
                          ? "You're on track 🎉"
                          : verdictStatus === 'amber'
                            ? hasIncomeForVerdict
                              ? 'Getting there — almost!'
                              : 'Verdict pending'
                            : "You're behind — close the gap"}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {hasIncomeForVerdict ? (
                          <>
                            Your plan generates{' '}
                            <span className="font-semibold text-white">
                              {currency.format(combinedInflationAdjustedWithdrawal)}
                            </span>{' '}
                            / year. Target:{' '}
                            <span className="font-semibold text-white">
                              {currency.format(targetRetirementIncome)}
                            </span>{' '}
                            (70% of income)
                          </>
                        ) : (
                          'Enter your income above to see your retirement score'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Link className="h-3.5 w-3.5" />
                        Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Reverse mode: Target + Required savings */}
            {mode === 'reverse' && (
              <div className="rounded-3xl border border-brand/30 bg-brand/10 p-6 shadow-xl shadow-black/30">
                <p className="text-xs uppercase tracking-wide text-brand mb-2">Your savings goal</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-300">Target annual income at retirement</p>
                    <p className="text-3xl font-semibold text-white mt-1">
                      {currency.format(reverseTargetIncome)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">In today's dollars</p>
                  </div>
                  <div className="border-t border-brand/20 pt-4">
                    <p className="text-sm text-slate-300">You need to save (per month)</p>
                    <p className="text-3xl font-semibold text-brand mt-1">
                      {currency.format(requiredMonthlyForTarget)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Frequency: {plan.frequency === 'biweekly' ? 'Bi-weekly' : plan.frequency}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Key stats */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
              <p className="text-xs uppercase tracking-wide text-slate-400">Your nest egg</p>
              <div className="mt-3 space-y-3">
                <StatCard
                  label="Total at retirement"
                  value={currency.format(combinedNestEgg)}
                  helper="In today's dollars"
                />
                <StatCard
                  label="Annual retirement income"
                  value={currency.format(combinedInflationAdjustedWithdrawal)}
                  helper="4% withdrawal rule"
                />
              </div>
            </div>

            {/* Assumptions */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-4">How we got here</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Expected annual return</span>
                  <span className="font-semibold text-white">{plan.annualReturn}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Inflation rate</span>
                  <span className="font-semibold text-white">{plan.inflation}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Salary growth</span>
                  <span className="font-semibold text-white">{plan.salaryGrowth}%</span>
                </div>
                {mode === 'quick' && (
                  <button
                    onClick={() => setMode('customize')}
                    className="mt-4 w-full text-xs font-medium text-brand hover:text-brand/80 transition"
                  >
                    Change assumptions →
                  </button>
                )}
              </div>
            </div>

            {/* Expand details */}
            {mode !== 'reverse' && (
              <button
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
                onClick={() => setMode('customize')}
              >
                See full breakdown →
              </button>
            )}
          </section>
        </div>

        {/* Charts section (only in customize mode) */}
        {mode === 'customize' && (
          <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
            <h2 className="text-xl font-semibold text-white">Your growth journey</h2>
            <p className="text-sm text-slate-400 mt-1">
              {plan.retirementAge - plan.currentAge} years · balances update instantly
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900 to-slate-950/80 p-4 lg:col-span-3">
                <ProjectionChart data={projection} />
              </div>
              <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">RRSP growth</p>
                <p className="text-xs text-slate-400">Balance over time</p>
                <BalanceMiniChart data={projection} label="RRSP balance" color="#1F8EF1" />
              </div>
              <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">TFSA growth</p>
                <p className="text-xs text-slate-400">Balance over time</p>
                <BalanceMiniChart data={tfsaProjection} label="TFSA balance" color="#C084FC" />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
