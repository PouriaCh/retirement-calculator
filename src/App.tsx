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
import { InfoTooltip } from './components/InfoTooltip';
import { useCountUp } from './hooks/useCountUp';
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
  contribution: 400,
  annualIncome: 90000,
  rrspCarryForward: 0,
  employerMatchPercent: 0,
  employerMatchCap: 0,
  annualReturn: 6.5,
  inflation: 2.1,
  salaryGrowth: 2.5,
  frequency: 'biweekly',
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
  // Always start fresh visitors on Quick Start — the low-friction hook.
  // Inputs persist across visits; the mode itself does not.
  const [mode, setMode] = useState<Mode>('quick');
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
  // null = no manual override, so the target tracks 70% of income automatically.
  // Once the user edits it directly, it locks to that dollar figure and stops
  // following income changes — same reasoning as Set a Goal's fixed target.
  const [verdictTargetOverride, setVerdictTargetOverride] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TFSA, JSON.stringify(tfsaPlan));
  }, [tfsaPlan]);

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
  // In Quick Start and Reverse, keep contributions fixed (no salary growth)
  // In Customize, contributions grow with salary
  const projectionPlan = useMemo(
    () => (mode === 'quick' || mode === 'reverse' ? { ...plan, salaryGrowth: 0 } : plan),
    [plan, mode]
  );
  const projection = useMemo(() => calculateProjection(projectionPlan), [projectionPlan]);
  const summary = useMemo(() => summarizeProjection(projection), [projection]);
  const tfsaProjection = useMemo(
    () =>
      calculateProjection({
        ...projectionPlan,
        currentBalance: tfsaPlan.currentBalance,
        contribution: tfsaPlan.contribution,
        frequency: tfsaPlan.frequency,
        annualReturn: tfsaPlan.annualReturn,
        salaryGrowth: 0,
        employerMatchPercent: 0,
        employerMatchCap: 0,
      }),
    [projectionPlan, tfsaPlan]
  );
  const tfsaSummary = useMemo(() => summarizeProjection(tfsaProjection), [tfsaProjection]);

  const annualContribution = plan.contribution * PERIODS_PER_YEAR[plan.frequency];
  const safeWithdrawal = summary.finalBalance * 0.04;
  const tfsaSafeWithdrawal = tfsaSummary.finalBalance * 0.04;
  // Only Full Control ever shows or collects TFSA inputs — Quick Start and
  // Set a Goal must not silently fold in a TFSA balance/contribution the
  // user never entered or saw.
  const includeTfsa = mode === 'customize';
  const combinedSafeWithdrawal = safeWithdrawal + (includeTfsa ? tfsaSafeWithdrawal : 0);
  const combinedNestEgg = summary.finalBalance + (includeTfsa ? tfsaSummary.finalBalance : 0);
  const combinedInflationAdjusted =
    summary.inflationAdjusted + (includeTfsa ? tfsaSummary.inflationAdjusted : 0);

  // Verdict logic
  const combinedInflationAdjustedWithdrawal = combinedInflationAdjusted * 0.04;
  const hasIncomeForVerdict = plan.annualIncome > 0;
  // Defaults to 70% of income (the standard income-replacement benchmark),
  // but the user can override it with a specific dollar target in Full Control.
  const targetRetirementIncome = verdictTargetOverride ?? plan.annualIncome * 0.7;
  const verdictRatio = hasIncomeForVerdict
    ? combinedInflationAdjustedWithdrawal / targetRetirementIncome
    : null;
  const verdictStatus: 'green' | 'amber' | 'red' =
    verdictRatio === null
      ? 'amber'
      : verdictRatio >= 1
        ? 'green'
        : verdictRatio >= 0.7
          ? 'amber'
          : 'red';
  const verdictGap = hasIncomeForVerdict
    ? combinedInflationAdjustedWithdrawal - targetRetirementIncome
    : null;

  // Reverse calculator: how much to save to hit target income.
  // Set a Goal never shows or collects TFSA inputs, so the search is scoped
  // to the single savings account it does show — no hidden TFSA assumptions.
  // Contributions are held fixed (salaryGrowth: 0) to match the "save this
  // much every paycheck" promise. The target is stated in today's dollars,
  // so the check compares against the inflation-adjusted balance, not the
  // nominal one — otherwise the required amount would be understated.
  const requiredMonthlyForTarget = useMemo(() => {
    if (reverseTargetIncome <= 0) return 0;
    let low = 0;
    let high = 50000;
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const testPlan = { ...plan, contribution: mid, salaryGrowth: 0 };
      const testSummary = summarizeProjection(calculateProjection(testPlan));
      const realWithdrawal = testSummary.inflationAdjusted * 0.04;

      if (realWithdrawal < reverseTargetIncome) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }, [plan, reverseTargetIncome]);

  // Animated versions of the headline numbers — gives each result a "reveal"
  // moment instead of snapping instantly when inputs change.
  const animatedNestEgg = useCountUp(combinedNestEgg);
  const animatedRetirementIncome = useCountUp(combinedInflationAdjustedWithdrawal);
  const animatedNestEggNeeded = useCountUp(reverseTargetIncome / 0.04);
  const animatedRequiredSavings = useCountUp(requiredMonthlyForTarget);

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
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 1 of 4</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">How old are you?</h3>
      </div>
      <NumberField
        label="Current age"
        value={plan.currentAge}
        min={18}
        max={70}
        onChange={(value) => updatePlan('currentAge', value)}
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 2 of 4</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          When do you want to retire?
        </h3>
      </div>
      <NumberField
        label="Retirement age"
        value={plan.retirementAge}
        min={plan.currentAge + 1}
        max={90}
        onChange={(value) => updatePlan('retirementAge', value)}
      />

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 3 of 4</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          How much have you saved so far?
        </h3>
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
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 4 of 4</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          How much can you save?
        </h3>
      </div>
      <NumberField
        label={
          plan.frequency === 'biweekly'
            ? 'Contribution per bi-weekly paycheck'
            : plan.frequency === 'weekly'
              ? 'Weekly contribution'
              : 'Monthly contribution'
        }
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
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Your target retirement income
        </p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          How much per year?
        </h3>
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
        <p className="text-sm uppercase tracking-wide text-slate-500">Your timeline</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          When do you retire?
        </h3>
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
          max={90}
          onChange={(value) => updatePlan('retirementAge', value)}
        />
      </div>

      <div className="pt-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Your starting point</p>
        <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
          What do you have now?
        </h3>
      </div>
      <NumberField
        label="Current savings"
        prefix="$"
        value={plan.currentBalance}
        min={0}
        step={1000}
        onChange={(value) => updatePlan('currentBalance', value)}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
          Factored into calculation
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Expected return</span>
              <InfoTooltip label="What is expected return?">
                The assumed annual growth rate of your investments. This is what turns your
                contributions into a bigger nest egg over time — a higher rate means faster growth,
                but also more risk.
              </InfoTooltip>
            </div>
            <span className="font-semibold text-slate-900">{plan.annualReturn}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Inflation</span>
              <InfoTooltip label="What is inflation used for?">
                Prices rise over time, so money loses buying power. This is how much we assume
                prices rise per year — it's what makes your ${reverseTargetIncome.toLocaleString()}{' '}
                target mean the same thing it means today, not a smaller amount by the time you
                retire.
              </InfoTooltip>
            </div>
            <span className="font-semibold text-slate-900">{plan.inflation}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Contribution frequency</span>
            <span className="font-semibold text-slate-900 capitalize">
              {plan.frequency === 'biweekly' ? 'Bi-weekly' : plan.frequency}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMode('customize')}
          className="mt-4 w-full text-xs font-medium text-brand hover:text-brand-dark transition"
        >
          Adjust assumptions →
        </button>
      </div>
    </div>
  );

  const renderCustomize = () => (
    <div className="space-y-6">
      {/* Back to Reverse button (if user came from Reverse) */}
      <button
        onClick={() => setMode('reverse')}
        className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-dark transition"
      >
        ← Back to target calculation
      </button>

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
          helper="Used for RRSP room and your on-track score below"
        />
      </div>

      <div>
        <NumberField
          label="Target retirement income"
          prefix="$"
          value={targetRetirementIncome}
          min={0}
          step={1000}
          onChange={(value) => setVerdictTargetOverride(value)}
          helper={
            verdictTargetOverride === null
              ? 'Defaults to 70% of your income — edit to set your own goal'
              : undefined
          }
        />
        {verdictTargetOverride !== null && (
          <button
            onClick={() => setVerdictTargetOverride(null)}
            className="mt-2 text-xs font-medium text-brand hover:text-brand-dark transition"
          >
            Reset to 70% of income →
          </button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 text-sm font-medium text-slate-700">
          <span>Contribution frequency</span>
          <select
            value={plan.frequency}
            onChange={(event) =>
              updatePlan('frequency', event.target.value as PlanInput['frequency'])
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
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
      <div className="border-t border-slate-200 pt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Assumptions</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <SliderField
            label="Expected return"
            value={plan.annualReturn}
            min={2}
            max={20}
            step={0.1}
            onChange={(value) => updatePlan('annualReturn', value)}
            tooltip="The assumed annual growth rate of your investments. Higher means faster growth, but also more risk — a diversified portfolio has historically averaged around 6-10%."
          />
          <SliderField
            label="Inflation rate"
            value={plan.inflation}
            min={1}
            max={4}
            step={0.1}
            onChange={(value) => updatePlan('inflation', value)}
            tooltip="Prices rise over time, so money loses buying power. This converts your future nominal balance into today's purchasing power, shown as 'Today's dollars' throughout the results."
          />
          <SliderField
            label="Salary growth"
            value={plan.salaryGrowth}
            min={0}
            max={6}
            step={0.1}
            onChange={(value) => updatePlan('salaryGrowth', value)}
            tooltip="If you expect raises over your career, your contribution amount grows by this % each year too, instead of staying fixed at today's dollar amount."
          />
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <span className="flex items-center justify-between">
          <span>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</span>
          <span className="text-lg">{showAdvanced ? '−' : '+'}</span>
        </span>
      </button>

      {showAdvanced && (
        <>
          {/* Employer match */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Employer match</p>
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
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">RRSP carry-forward</p>
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
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">TFSA</p>
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
              tooltip="The assumed annual growth rate for your TFSA specifically — often set lower than your main account if you hold more conservative investments here."
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50 py-10">
      {/* Decorative glow — adds depth/warmth behind the hero without any image assets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-[60%] rounded-full bg-brand/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-1/2 h-[26rem] w-[26rem] translate-x-[70%] rounded-full bg-emerald-400/10 blur-[120px]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-dark">
            <PiggyBank className="h-3.5 w-3.5 text-brand" />
            Free · Private · No signup
          </div>
          <h1 className="font-heading mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Will you be ready to{' '}
            <span className="bg-gradient-to-r from-brand to-emerald-500 bg-clip-text text-transparent">
              retire?
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            4 questions. 30 seconds. Nothing you enter ever leaves your browser.
          </p>
        </header>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { id: 'quick' as Mode, label: 'Quick Start', icon: '⚡' },
            { id: 'reverse' as Mode, label: 'Set a Goal', icon: '🎯' },
            { id: 'customize' as Mode, label: 'Full Control', icon: '⚙️' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === m.id
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="mb-6 flex items-center gap-2 text-slate-900">
              <div className="rounded-xl bg-brand/10 p-2 text-brand">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Enter your info</p>
                <p className="font-semibold">
                  {mode === 'quick'
                    ? 'Quick Start'
                    : mode === 'reverse'
                      ? 'Set a Goal'
                      : 'Full Control'}
                </p>
              </div>
            </div>

            {mode === 'quick' && renderQuickStart()}
            {mode === 'reverse' && renderReverse()}
            {mode === 'customize' && renderCustomize()}
          </section>

          {/* Results */}
          <section className="flex flex-col gap-6">
            {/* Verdict (only shown in Customize mode, where income is collected) */}
            {mode === 'customize' && (
              <div
                className={`rounded-3xl border p-6 shadow-lg shadow-slate-200/60 ${
                  verdictStatus === 'green'
                    ? 'border-emerald-300 bg-emerald-50'
                    : verdictStatus === 'amber'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-rose-300 bg-rose-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {verdictStatus === 'green' && (
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                    )}
                    {verdictStatus === 'amber' && (
                      <TrendingUp className="h-8 w-8 text-amber-500 flex-shrink-0" />
                    )}
                    {verdictStatus === 'red' && (
                      <TrendingDown className="h-8 w-8 text-rose-500 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-heading text-lg font-semibold ${
                          verdictStatus === 'green'
                            ? 'text-emerald-700'
                            : verdictStatus === 'amber'
                              ? 'text-amber-700'
                              : 'text-rose-700'
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
                      <p className="mt-1 text-sm text-slate-600">
                        {hasIncomeForVerdict ? (
                          <>
                            Your plan generates{' '}
                            <span className="font-semibold text-slate-900">
                              {currency.format(animatedRetirementIncome)}
                            </span>{' '}
                            / year. Target:{' '}
                            <span className="font-semibold text-slate-900">
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
                    className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
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

            {/* Reverse mode: Target + Required savings + Nest egg needed */}
            {mode === 'reverse' && (
              <div className="rounded-3xl border border-brand/30 bg-brand/5 p-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs uppercase tracking-wide text-brand mb-2">Your savings goal</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">Target annual income at retirement</p>
                    <p className="font-heading mt-1 text-3xl font-semibold text-slate-900">
                      {currency.format(reverseTargetIncome)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">In today's dollars</p>
                  </div>
                  <div className="border-t border-brand/20 pt-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-600">Nest egg needed (4% rule)</p>
                      <InfoTooltip label="What is the 4% rule?">
                        A widely-used rule of thumb: withdrawing 4% of your savings per year is
                        generally considered sustainable over a 30-year retirement without running
                        out of money. It's a guideline, not a guarantee — not specific to any
                        country.
                      </InfoTooltip>
                    </div>
                    <p className="font-heading mt-1 text-2xl font-semibold text-brand">
                      {currency.format(animatedNestEggNeeded)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {(reverseTargetIncome / 0.04).toLocaleString()} × 4% ={' '}
                      {reverseTargetIncome.toLocaleString()}
                    </p>
                  </div>
                  <div className="border-t border-brand/20 pt-4">
                    <p className="text-sm text-slate-600">
                      You need to save (per{' '}
                      {plan.frequency === 'biweekly'
                        ? 'bi-weekly paycheck'
                        : plan.frequency === 'weekly'
                          ? 'week'
                          : 'month'}
                      )
                    </p>
                    <p className="font-heading mt-1 text-3xl font-semibold text-brand">
                      {currency.format(animatedRequiredSavings)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Key stats (hidden in Reverse mode) */}
            {mode !== 'reverse' && (
              <div className="rounded-3xl border border-brand/20 bg-gradient-to-br from-white via-white to-brand/10 p-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Your nest egg</p>
                  {mode === 'quick' && (
                    <button
                      onClick={handleCopyLink}
                      className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Link className="h-3.5 w-3.5" />
                          Share
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  <StatCard
                    label="Total at retirement"
                    value={currency.format(animatedNestEgg)}
                    helper="In today's dollars"
                    tooltip="What your savings and growth add up to by your retirement age, adjusted for inflation so it reflects today's purchasing power."
                    accent="brand"
                  />
                  <StatCard
                    label="Annual retirement income"
                    value={currency.format(animatedRetirementIncome)}
                    helper="4% withdrawal rule"
                    tooltip="A widely-used rule of thumb: withdrawing 4% of your savings per year is generally considered sustainable over a 30-year retirement without running out of money. It's a guideline, not a guarantee — not specific to any country."
                    accent="emerald"
                  />
                </div>
              </div>
            )}

            {/* Assumptions (only shown in Customize mode) */}
            {mode === 'customize' && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-4">
                  How we got here
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Expected annual return</span>
                    <span className="font-semibold text-slate-900">{plan.annualReturn}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Inflation rate</span>
                    <span className="font-semibold text-slate-900">{plan.inflation}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Salary growth</span>
                    <span className="font-semibold text-slate-900">{plan.salaryGrowth}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Expand details */}
            {mode !== 'reverse' && (
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                onClick={() => setMode('customize')}
              >
                See full breakdown →
              </button>
            )}
          </section>
        </div>

        {/* Charts section (only in customize mode) */}
        {mode === 'customize' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <h2 className="font-heading text-xl font-semibold text-slate-900">
              Your growth journey
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {plan.retirementAge - plan.currentAge} years · balances update instantly
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:col-span-3">
                <ProjectionChart data={projection} />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">RRSP growth</p>
                <p className="text-xs text-slate-500">Balance over time</p>
                <BalanceMiniChart data={projection} label="RRSP balance" color="#1F8EF1" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">TFSA growth</p>
                <p className="text-xs text-slate-500">Balance over time</p>
                <BalanceMiniChart data={tfsaProjection} label="TFSA balance" color="#C084FC" />
              </div>
            </div>
          </section>
        )}

        {/* Trust footer */}
        <footer className="text-center text-xs text-slate-500 pb-6">
          <p>
            No signup. No data ever leaves your browser. Free, always.{' '}
            <button
              onClick={() => setMode('customize')}
              className="underline underline-offset-2 hover:text-brand transition"
            >
              Includes RRSP &amp; TFSA support for Canadian accounts
            </button>
          </p>
        </footer>
      </div>
    </main>
  );
}

export default App;
