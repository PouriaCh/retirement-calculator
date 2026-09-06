import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Link,
  PiggyBank,
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

const PERIODS_PER_YEAR: Record<ContributionFrequency, number> = {
  monthly: 12,
  biweekly: 26,
  weekly: 52,
};

const FREQUENCY_DISPLAY: Record<ContributionFrequency, { label: string; unit: string }> = {
  monthly: { label: 'Monthly cadence', unit: 'month' },
  biweekly: { label: 'Every paycheque (bi-weekly)', unit: 'paycheque' },
  weekly: { label: 'Weekly cadence', unit: 'week' },
};

type TfsaPlanInput = Pick<PlanInput, 'currentBalance' | 'contribution' | 'frequency'> & {
  annualReturn: number;
};

const defaultTfsaPlan: TfsaPlanInput = {
  currentBalance: 18000,
  contribution: 450,
  frequency: 'monthly',
  annualReturn: 5.5,
};

const CRA_MAX_2024 = 31560; // FY2024 CRA RRSP limit ceiling in CAD
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

// ── URL state sharing ────────────────────────────────────────────────────────
// Encode both plans into a single base64 URL param so users can copy/share
// their exact scenario. URL state takes priority over localStorage on load.

function encodeState(plan: PlanInput, tfsaPlan: TfsaPlanInput): string {
  try {
    return btoa(JSON.stringify({ p: plan, t: tfsaPlan }));
  } catch {
    return '';
  }
}

function decodeState(
  encoded: string,
  fallbackPlan: PlanInput,
  fallbackTfsa: TfsaPlanInput
): { plan: PlanInput; tfsaPlan: TfsaPlanInput } | null {
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

function App() {
  const [plan, setPlan] = useState<PlanInput>(() => {
    const urlParam = getUrlParam();
    if (urlParam) {
      const decoded = decodeState(urlParam, defaultPlan, defaultTfsaPlan);
      if (decoded) return decoded.plan;
    }
    return loadFromStorage(STORAGE_KEY_PLAN, defaultPlan);
  });
  const [tfsaPlan, setTfsaPlan] = useState<TfsaPlanInput>(() => {
    const urlParam = getUrlParam();
    if (urlParam) {
      const decoded = decodeState(urlParam, defaultPlan, defaultTfsaPlan);
      if (decoded) return decoded.tfsaPlan;
    }
    return loadFromStorage(STORAGE_KEY_TFSA, defaultTfsaPlan);
  });
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TFSA, JSON.stringify(tfsaPlan));
  }, [tfsaPlan]);

  // Keep URL in sync so the current scenario is always shareable
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
        // TFSA contributions are not salary-linked — keep them flat
        salaryGrowth: 0,
        // Employer match does not apply to TFSA
        employerMatchPercent: 0,
        employerMatchCap: 0,
      }),
    [plan, tfsaPlan]
  );
  const tfsaSummary = useMemo(() => summarizeProjection(tfsaProjection), [tfsaProjection]);

  const annualContribution = plan.contribution * PERIODS_PER_YEAR[plan.frequency];
  const tfsaAnnualContribution = tfsaPlan.contribution * PERIODS_PER_YEAR[tfsaPlan.frequency];
  // Average annual contribution across all projected years — this is what the projection
  // actually deposits on average (contributions grow with salaryGrowth each year).
  const projectionYears = Math.max(1, plan.retirementAge - plan.currentAge);
  const avgAnnualContribution = summary.totalContributions / projectionYears;
  const baseDeductionRoom = Math.min(plan.annualIncome * 0.18, CRA_MAX_2024);
  const maxDeductible = baseDeductionRoom + (plan.rrspCarryForward ?? 0);
  const overContribution = annualContribution > maxDeductible;

  // Employer match derived values (mirrors calculator logic for display)
  const matchRate = (plan.employerMatchPercent ?? 0) / 100;
  const matchCapRate = (plan.employerMatchCap ?? 0) / 100;
  const uncappedAnnualMatch = annualContribution * matchRate;
  const matchCeiling = plan.annualIncome * matchCapRate;
  const annualEmployerMatch =
    matchCapRate > 0 ? Math.min(uncappedAnnualMatch, matchCeiling) : uncappedAnnualMatch;
  const hasEmployerMatch = annualEmployerMatch > 0;
  // Cross-field validation flags
  const contributionExceedsIncome = plan.annualIncome > 0 && annualContribution > plan.annualIncome;
  const negativeRealReturn = plan.annualReturn <= plan.inflation;
  const optimisticReturn = plan.annualReturn > 12;
  const matchRateWithoutIncome = (plan.employerMatchPercent ?? 0) > 0 && plan.annualIncome === 0;
  const matchCapWithoutRate =
    (plan.employerMatchCap ?? 0) > 0 && (plan.employerMatchPercent ?? 0) === 0;
  // Rough upper bound: ~$95,000 TFSA lifetime room accumulated since 2009
  const TFSA_LIFETIME_ROOM = 95000;
  const tfsaBalanceExceedsLifetimeRoom = tfsaPlan.currentBalance > TFSA_LIFETIME_ROOM;
  // Carry-forward sanity: max deduction room is CRA_MAX_2024 per year; 35 years is a generous ceiling
  const CARRY_FORWARD_SANITY_LIMIT = CRA_MAX_2024 * 35;
  const carryForwardSeemsLarge = (plan.rrspCarryForward ?? 0) > CARRY_FORWARD_SANITY_LIMIT;
  const remainingRoom = Math.max(0, maxDeductible - annualContribution);
  const tfsaOverContribution = tfsaAnnualContribution > TFSA_ANNUAL_LIMIT_2024;
  const tfsaRemainingRoom = Math.max(0, TFSA_ANNUAL_LIMIT_2024 - tfsaAnnualContribution);
  const safeWithdrawal = summary.finalBalance * 0.04;
  const tfsaSafeWithdrawal = tfsaSummary.finalBalance * 0.04;
  const combinedSafeWithdrawal = safeWithdrawal + tfsaSafeWithdrawal;
  const combinedNestEgg = summary.finalBalance + tfsaSummary.finalBalance;
  const combinedInflationAdjusted = summary.inflationAdjusted + tfsaSummary.inflationAdjusted;
  const combinedContributions = summary.totalContributions + tfsaSummary.totalContributions;
  const combinedGrowth = summary.totalGrowth + tfsaSummary.totalGrowth;
  const contributionMultiplier = combinedContributions
    ? combinedNestEgg / combinedContributions
    : 0;
  const tenKImpact = contributionMultiplier * 10_000;
  const growthShare = summary.finalBalance ? (summary.totalGrowth / summary.finalBalance) * 100 : 0;

  // ── On-track verdict ────────────────────────────────────────────────────────
  // Target: 70% income-replacement — the standard retirement planning benchmark.
  // We use inflation-adjusted safe withdrawal so the comparison is in today's dollars.
  const combinedInflationAdjustedWithdrawal = combinedInflationAdjusted * 0.04;
  const targetRetirementIncome = plan.annualIncome * 0.7;
  const hasIncomeForVerdict = plan.annualIncome > 0;
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

  // ── Cost of waiting 1 year ──────────────────────────────────────────────────
  // Same plan but starting one year later (age+1, same balance — no contributions
  // during the gap year). Shows the compound-growth cost of delaying.
  const waitOnePlan = useMemo(
    () => ({ ...plan, currentAge: Math.min(plan.currentAge + 1, plan.retirementAge - 1) }),
    [plan]
  );
  const waitOneTfsaPlan = useMemo(() => ({ ...tfsaPlan }), [tfsaPlan]);
  const waitOneProjection = useMemo(() => calculateProjection(waitOnePlan), [waitOnePlan]);
  const waitOneSummary = useMemo(() => summarizeProjection(waitOneProjection), [waitOneProjection]);
  const waitOneTfsaProjection = useMemo(
    () =>
      calculateProjection({
        ...waitOnePlan,
        currentBalance: waitOneTfsaPlan.currentBalance,
        contribution: waitOneTfsaPlan.contribution,
        frequency: waitOneTfsaPlan.frequency,
        annualReturn: waitOneTfsaPlan.annualReturn,
        salaryGrowth: 0,
        employerMatchPercent: 0,
        employerMatchCap: 0,
      }),
    [waitOnePlan, waitOneTfsaPlan]
  );
  const waitOneTfsaSummary = useMemo(
    () => summarizeProjection(waitOneTfsaProjection),
    [waitOneTfsaProjection]
  );
  const waitOneCombinedNestEgg = waitOneSummary.finalBalance + waitOneTfsaSummary.finalBalance;
  const costOfWaiting = Math.max(0, combinedNestEgg - waitOneCombinedNestEgg);

  const combinedRows = projection.map((rrspYear, index) => {
    const tfsaYear = tfsaProjection.length
      ? tfsaProjection[Math.min(index, tfsaProjection.length - 1)]
      : undefined;
    const tfsaBalance = tfsaYear?.balance ?? 0;
    const rrspBalance = rrspYear.balance;
    const combinedBalance = rrspBalance + tfsaBalance;
    const rrspShare = combinedBalance ? (rrspBalance / combinedBalance) * 100 : 0;
    const tfsaShare = combinedBalance ? (tfsaBalance / combinedBalance) * 100 : 0;
    return {
      age: rrspYear.age,
      rrspBalance,
      tfsaBalance,
      combinedBalance,
      rrspShare,
      tfsaShare,
      combinedContributions: rrspYear.totalContributions + (tfsaYear?.totalContributions ?? 0),
      combinedGrowth: rrspYear.totalGrowth + (tfsaYear?.totalGrowth ?? 0),
    };
  });
  const combinedMilestones = sampleMilestones(combinedRows, 10);

  const extraHundredImpact = useMemo(() => {
    const increasedPlan = { ...plan, contribution: plan.contribution + 100 };
    const increasedSummary = summarizeProjection(calculateProjection(increasedPlan));
    return Math.max(0, increasedSummary.finalBalance - summary.finalBalance);
  }, [plan, summary.finalBalance]);

  const optimizedStrategies = useMemo(() => {
    if (!maxDeductible) return [];
    return (Object.keys(PERIODS_PER_YEAR) as ContributionFrequency[]).map((freq) => {
      const periods = PERIODS_PER_YEAR[freq];
      const perPeriod = maxDeductible / periods;
      const optimizedPlan: PlanInput = { ...plan, frequency: freq, contribution: perPeriod };
      const optimizedSummary = summarizeProjection(calculateProjection(optimizedPlan));
      return {
        freq,
        perPeriod,
        finalBalance: optimizedSummary.finalBalance,
      };
    });
  }, [plan, maxDeductible]);

  const updatePlan = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => {
    setPlan((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof value === 'number') {
        if (key === 'currentAge') {
          // retirementAge must stay ahead of currentAge, and never exceed 71
          if (value >= next.retirementAge) next.retirementAge = Math.min(value + 1, 71);
        }
        if (key === 'retirementAge') {
          // retirementAge must stay above currentAge
          if (value <= next.currentAge) next.retirementAge = next.currentAge + 1;
        }
      }
      return next;
    });
  };

  const updateTfsaPlan = <K extends keyof TfsaPlanInput>(key: K, value: TfsaPlanInput[K]) => {
    setTfsaPlan((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
            <PiggyBank className="h-4 w-4 text-brand" />
            Smart RRSP & RPP Planner
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            See how steady contributions grow into retirement freedom
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Enter five numbers and see exactly where you stand — then tweak until you like what you
            see.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center gap-3 text-white">
              <span className="rounded-2xl bg-brand/20 p-2 text-brand">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">
                  RRSP / RPP contributions
                </p>
                <p className="text-xl font-semibold">Craft your plan</p>
              </div>
            </div>

            {/* ── Core fields (always visible) ── */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
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
                helper="RRSP must convert to RRIF by age 71"
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
                helper="Used to calculate your RRSP contribution room"
              />
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
                helper="Recurring RRSP/RPP deposit each pay period"
              />
            </div>

            {/* CRA room banner — always visible, relates to core fields */}
            <div className="mt-4">
              {overContribution ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">CRA limit exceeded</p>
                    <p>
                      Annual contributions of {currency.format(annualContribution)} surpass your
                      estimated RRSP room of {currency.format(maxDeductible)}. Contributions above
                      the limit are penalized at 1% per month.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  You have about{' '}
                  <span className="font-semibold">{currency.format(remainingRoom)}</span> of RRSP
                  room remaining this year.
                </div>
              )}
            </div>
            {contributionExceedsIncome && (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  <span className="font-semibold">Contribution exceeds income —</span> annual
                  deposits of {currency.format(annualContribution)} are more than your stated income
                  of {currency.format(plan.annualIncome)}.
                </p>
              </div>
            )}

            {/* ── Advanced toggle ── */}
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-6 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span>{showAdvanced ? 'Hide advanced options' : 'Show advanced options'}</span>
              <span className="text-lg leading-none">{showAdvanced ? '−' : '+'}</span>
            </button>

            {showAdvanced && (
              <>
                {/* ── Rates ── */}
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  <SliderField
                    label="Expected annual return"
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
                {negativeRealReturn && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      <span className="font-semibold">Negative real return —</span> your expected
                      return ({plan.annualReturn}%) is at or below inflation ({plan.inflation}%).
                      Your portfolio will lose purchasing power over time.
                    </p>
                  </div>
                )}
                {optimisticReturn && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      <span className="font-semibold">Optimistic assumption —</span>{' '}
                      {plan.annualReturn}% exceeds the long-run average of most diversified
                      portfolios (~10%). Treat this as a best-case scenario.
                    </p>
                  </div>
                )}

                {/* ── Employer match ── */}
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <NumberField
                    label="Employer match rate"
                    suffix="%"
                    value={plan.employerMatchPercent ?? 0}
                    min={0}
                    max={200}
                    step={5}
                    onChange={(value) => updatePlan('employerMatchPercent', value)}
                    helper="e.g. 50 = employer matches 50¢ for every $1 you contribute"
                  />
                  <NumberField
                    label="Employer match cap"
                    suffix="% of salary"
                    value={plan.employerMatchCap ?? 0}
                    min={0}
                    max={20}
                    step={0.5}
                    onChange={(value) => updatePlan('employerMatchCap', value)}
                    helper="Match stops once it hits this % of your annual salary (0 = no cap)"
                  />
                </div>
                {matchRateWithoutIncome && (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      <span className="font-semibold">Income required for employer match —</span>{' '}
                      enter your annual income so the match can be calculated.
                    </p>
                  </div>
                )}
                {matchCapWithoutRate && (
                  <div className="mt-3 rounded-2xl border border-slate-500/30 bg-slate-500/10 px-4 py-3 text-sm text-slate-300">
                    <span className="font-semibold">Match cap set but no match rate —</span> set the
                    employer match rate to activate the cap.
                  </div>
                )}
                {hasEmployerMatch && (
                  <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                    <span className="font-semibold">
                      Employer adds {currency.format(annualEmployerMatch)} / year
                    </span>
                    {matchCapRate > 0 && uncappedAnnualMatch > matchCeiling && (
                      <span className="text-violet-200/80">
                        {' '}
                        (capped at {plan.employerMatchCap ?? 0}% of salary)
                      </span>
                    )}{' '}
                    — free money baked into your projection.
                  </div>
                )}

                {/* ── RRSP carry-forward ── */}
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <NumberField
                    label="RRSP room carry-forward"
                    prefix="$"
                    value={plan.rrspCarryForward ?? 0}
                    min={0}
                    step={500}
                    onChange={(value) => updatePlan('rrspCarryForward', value)}
                    helper="From your latest CRA Notice of Assessment"
                  />
                </div>
                {carryForwardSeemsLarge && (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      <span className="font-semibold">Carry-forward looks high —</span>{' '}
                      {currency.format(plan.rrspCarryForward ?? 0)} exceeds a realistic lifetime
                      accumulation. Double-check your Notice of Assessment.
                    </p>
                  </div>
                )}

                {/* ── TFSA ── */}
                <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/40 p-5">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-white/70">TFSA boost</p>
                    <p className="text-lg font-semibold text-white">Tax-free growth on autopilot</p>
                    <p className="text-xs text-slate-400">
                      {`Annual limit: $${TFSA_ANNUAL_LIMIT_2024.toLocaleString()} · All growth stays tax-free.`}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <NumberField
                      label="Current TFSA balance"
                      prefix="$"
                      value={tfsaPlan.currentBalance}
                      min={0}
                      step={1000}
                      onChange={(value) => updateTfsaPlan('currentBalance', value)}
                    />
                    {tfsaBalanceExceedsLifetimeRoom && (
                      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p>
                          <span className="font-semibold">Exceeds lifetime room —</span> cumulative
                          TFSA limit since 2009 is ~{currency.format(TFSA_LIFETIME_ROOM)}. Verify
                          with CRA My Account.
                        </p>
                      </div>
                    )}
                    <NumberField
                      label={`TFSA contribution per ${tfsaPlan.frequency.replace('bi', 'bi-')}`}
                      prefix="$"
                      value={tfsaPlan.contribution}
                      min={0}
                      step={50}
                      onChange={(value) => updateTfsaPlan('contribution', value)}
                      helper="Counts toward the $7,000 annual limit"
                    />
                    <div className="space-y-2 text-sm font-medium text-slate-200">
                      <span>TFSA contribution frequency</span>
                      <select
                        value={tfsaPlan.frequency}
                        onChange={(event) =>
                          updateTfsaPlan('frequency', event.target.value as ContributionFrequency)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <SliderField
                      label="TFSA annual return"
                      value={tfsaPlan.annualReturn}
                      min={2}
                      max={20}
                      step={0.1}
                      onChange={(value) => updateTfsaPlan('annualReturn', value)}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <StatCard
                      label="Projected TFSA balance"
                      value={currency.format(tfsaSummary.finalBalance)}
                      helper="Nominal dollars at retirement"
                      tooltip="Projected TFSA balance at retirement."
                    />
                    <StatCard
                      label="TFSA contributions"
                      value={currency.format(tfsaSummary.totalContributions)}
                      helper="Total deposits over the plan"
                      tooltip="Total amount you'll have deposited into your TFSA."
                    />
                    <StatCard
                      label="Tax-free income"
                      value={currency.format(tfsaSafeWithdrawal)}
                      helper="4% guideline from TFSA alone"
                      tooltip="Estimated sustainable annual withdrawal from TFSA only."
                    />
                  </div>

                  <div className="mt-5">
                    {tfsaOverContribution ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">TFSA limit exceeded</p>
                          <p>
                            Depositing {currency.format(tfsaAnnualContribution)} per year exceeds
                            the {`$${TFSA_ANNUAL_LIMIT_2024.toLocaleString()}`} room. CRA taxes the
                            overflow at 1% per month until withdrawn.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-slate-100">
                        You still have {currency.format(tfsaRemainingRoom)} of TFSA space for the
                        year. Staying consistent keeps all growth tax-free.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-6">
            {/* ── On-track verdict ── */}
            <div
              className={[
                'rounded-3xl border p-6 shadow-xl shadow-black/30',
                verdictStatus === 'green'
                  ? 'border-emerald-500/30 bg-emerald-950/60'
                  : verdictStatus === 'amber'
                    ? 'border-amber-500/30 bg-amber-950/60'
                    : 'border-rose-500/30 bg-rose-950/60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {verdictStatus === 'green' ? (
                    <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-emerald-400" />
                  ) : verdictStatus === 'amber' ? (
                    <TrendingUp className="h-8 w-8 flex-shrink-0 text-amber-400" />
                  ) : (
                    <TrendingDown className="h-8 w-8 flex-shrink-0 text-rose-400" />
                  )}
                  <div>
                    <p
                      className={[
                        'text-lg font-semibold',
                        verdictStatus === 'green'
                          ? 'text-emerald-300'
                          : verdictStatus === 'amber'
                            ? 'text-amber-300'
                            : 'text-rose-300',
                      ].join(' ')}
                    >
                      {verdictStatus === 'green'
                        ? "You're on track 🎉"
                        : verdictStatus === 'amber'
                          ? hasIncomeForVerdict
                            ? 'Getting there — a little more goes a long way'
                            : 'Enter your income to see your retirement score'
                          : "You're behind — let's close the gap"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {hasIncomeForVerdict ? (
                        <>
                          Your plan generates{' '}
                          <span className="font-semibold text-white">
                            {currency.format(combinedInflationAdjustedWithdrawal)}
                          </span>{' '}
                          / year in today's dollars.{' '}
                          {verdictGap !== null && verdictGap >= 0 ? (
                            <>
                              That's{' '}
                              <span className="font-semibold text-emerald-300">
                                {currency.format(verdictGap)} more
                              </span>{' '}
                              than the 70% income-replacement target of{' '}
                              {currency.format(targetRetirementIncome)}.
                            </>
                          ) : verdictGap !== null ? (
                            <>
                              You're{' '}
                              <span className="font-semibold text-rose-300">
                                {currency.format(Math.abs(verdictGap))} short
                              </span>{' '}
                              of the 70% income-replacement target of{' '}
                              {currency.format(targetRetirementIncome)}.
                            </>
                          ) : null}
                        </>
                      ) : (
                        "Add your annual income above and we'll tell you exactly where you stand."
                      )}
                    </p>
                  </div>
                </div>
                {/* Share button */}
                <button
                  onClick={handleCopyLink}
                  title="Copy shareable link"
                  className="flex flex-shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Copied!
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

            {/* ── Cost of waiting 1 year ── */}
            {costOfWaiting > 0 && (
              <div className="rounded-3xl border border-orange-500/20 bg-orange-950/40 p-6 shadow-xl shadow-black/30">
                <p className="text-sm uppercase tracking-wide text-orange-300">
                  The cost of waiting
                </p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {currency.format(costOfWaiting)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  That's how much less you'd have at retirement if you started{' '}
                  <span className="font-semibold text-orange-300">one year from now</span> instead
                  of today. Every month you delay, compound growth works against you instead of for
                  you.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Equivalent to{' '}
                  <span className="font-semibold text-white">
                    {currency.format((costOfWaiting * 0.04) / 12)}
                  </span>{' '}
                  less per month in retirement income — forever.
                </p>
              </div>
            )}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
              <p className="text-sm uppercase tracking-wide text-white/70">
                Plan at a glance (RRSP + TFSA)
              </p>
              <div className="mt-4 grid gap-4">
                <StatCard
                  label="Total projected nest egg"
                  value={currency.format(combinedNestEgg)}
                  helper="Nominal dollars at retirement"
                  tooltip="Combined RRSP/RPP and TFSA balances at your target retirement age before inflation."
                />
                <StatCard
                  label="Today’s dollars"
                  value={currency.format(combinedInflationAdjusted)}
                  helper="Inflation-adjusted purchasing power"
                  tooltip="Same nest egg converted to today’s dollars using your inflation slider."
                />
                <StatCard
                  label="Lifetime contributions"
                  value={currency.format(combinedContributions)}
                  helper="RRSP + TFSA deposits you’ll make"
                  tooltip="Sum of every deposit you plan to make across both accounts."
                />
                <StatCard
                  label="Sustainable income"
                  value={currency.format(combinedSafeWithdrawal)}
                  helper="≈ yearly budget at 4% withdrawal"
                  tooltip="Estimated annual draw you can sustain without depleting capital (RRSP+TFSA)."
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <StatCard
                  label="RRSP / RPP balance"
                  value={currency.format(summary.finalBalance)}
                  helper="Tax-deferred dollars at retirement"
                  tooltip="Projected RRSP/RPP balance alone."
                />
                <StatCard
                  label="TFSA balance"
                  value={currency.format(tfsaSummary.finalBalance)}
                  helper="Tax-free dollars at retirement"
                  tooltip="Projected TFSA balance alone."
                />
                <StatCard
                  label="RRSP withdrawals"
                  value={currency.format(safeWithdrawal)}
                  helper="Estimated taxable income"
                  tooltip="4% rule applied to your RRSP/RPP balance."
                />
                <StatCard
                  label="TFSA withdrawals"
                  value={currency.format(tfsaSafeWithdrawal)}
                  helper="Estimated tax-free income"
                  tooltip="4% rule applied to your TFSA balance."
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/30">
              <p className="text-sm uppercase tracking-wide text-white/70">Insights</p>
              <ul className="mt-4 space-y-4 text-sm text-slate-300">
                <li>
                  Starting at{' '}
                  <span className="font-semibold text-white">
                    {currency.format(annualContribution)}
                  </span>{' '}
                  per year today
                  {plan.salaryGrowth > 0 && (
                    <>
                      , averaging{' '}
                      <span className="font-semibold text-white">
                        {currency.format(avgAnnualContribution)}
                      </span>{' '}
                      per year as contributions grow {plan.salaryGrowth}% annually with salary
                    </>
                  )}{' '}
                  vs. CRA deduction room of{' '}
                  <span className="font-semibold text-white">{currency.format(maxDeductible)}</span>
                  {overContribution
                    ? ' — reduce contributions to avoid penalties.'
                    : " — you're within the 18% limit."}
                </li>
                <li>
                  Investment growth represents
                  <span className="font-semibold text-white"> {growthShare.toFixed(0)}%</span> of
                  the nest egg — keep time on your side.
                </li>
                <li>
                  Every extra $100 per {plan.frequency.replace('bi', 'bi-')} can grow into roughly{' '}
                  <span className="font-semibold text-white">
                    {currency.format(extraHundredImpact)}
                  </span>{' '}
                  by retirement.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/30">
              <p className="text-sm uppercase tracking-wide text-white/70">
                Max contribution strategy
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {currency.format(maxDeductible)}
              </p>
              <p className="text-sm text-slate-400">
                {`Annual RRSP room (18% of income, capped at $${CRA_MAX_2024.toLocaleString()}) + carry-forward of ${currency.format(
                  plan.rrspCarryForward ?? 0
                )}.`}
              </p>
              {maxDeductible === 0 ? (
                <p className="mt-4 text-sm text-slate-300">
                  Enter your annual income to calculate optimized contribution amounts.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {optimizedStrategies.map((strategy) => (
                    <div
                      key={strategy.freq}
                      className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-black/10"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            {FREQUENCY_DISPLAY[strategy.freq].label}
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {currency.format(strategy.perPeriod)} /{' '}
                            {FREQUENCY_DISPLAY[strategy.freq].unit}
                          </p>
                          <p className="text-xs text-slate-400">
                            Hits {currency.format(maxDeductible)} per year
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Projected balance
                          </p>
                          <p className="text-base font-semibold text-emerald-300">
                            {currency.format(strategy.finalBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/70">Growth journey</p>
              <h2 className="text-2xl font-semibold text-white">Projection through retirement</h2>
              <p className="text-sm text-slate-400">
                Balances update instantly based on your inputs.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">
              {plan.retirementAge - plan.currentAge} years of compounding ·{' '}
              {plan.frequency === 'monthly' ? '12' : plan.frequency === 'biweekly' ? '26' : '52'}{' '}
              deposits / year
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900 to-slate-950/80 p-4 lg:col-span-3">
              <ProjectionChart data={projection} />
            </div>
            <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">RRSP / RPP growth</p>
              <p className="text-xs text-slate-400">Balance over time</p>
              <BalanceMiniChart data={projection} label="RRSP balance" color="#1F8EF1" />
            </div>
            <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">TFSA growth</p>
              <p className="text-xs text-slate-400">Balance over time</p>
              <BalanceMiniChart data={tfsaProjection} label="TFSA balance" color="#C084FC" />
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/5">
            <table className="min-w-full divide-y divide-white/5 text-sm">
              <thead className="bg-white/5 text-left uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">RRSP balance</th>
                  <th className="px-4 py-3">TFSA balance</th>
                  <th className="px-4 py-3">Combined</th>
                  <th className="px-4 py-3">RRSP%</th>
                  <th className="px-4 py-3">TFSA%</th>
                  <th className="px-4 py-3">Total contributions</th>
                  <th className="px-4 py-3">Total growth</th>
                </tr>
              </thead>
              <tbody>
                {combinedMilestones.map((row) => (
                  <tr key={row.age} className="odd:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-white">{row.age}</td>
                    <td className="px-4 py-3 text-slate-100">{currency.format(row.rrspBalance)}</td>
                    <td className="px-4 py-3 text-slate-100">{currency.format(row.tfsaBalance)}</td>
                    <td className="px-4 py-3 text-white">{currency.format(row.combinedBalance)}</td>
                    <td className="px-4 py-3 text-slate-300">{row.rrspShare.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-slate-300">{row.tfsaShare.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-slate-300">
                      {compactCurrency(row.combinedContributions)}
                    </td>
                    <td className="px-4 py-3 text-emerald-300">
                      {compactCurrency(row.combinedGrowth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-wide text-emerald-200">Stay the course</p>
            <h2 className="text-3xl font-semibold text-white">
              Your retirement lifestyle snapshot
            </h2>
            <p className="text-sm text-emerald-100/70">
              Combining disciplined RRSP and TFSA deposits unlocks a future nest egg of{' '}
              {currency.format(combinedNestEgg)} ({currency.format(combinedInflationAdjusted)} in
              today’s dollars).
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-emerald-200">
                Annual lifestyle budget
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {currency.format(combinedSafeWithdrawal)}
              </p>
              <p className="text-sm text-emerald-100/70">
                ≈ {currency.format(combinedSafeWithdrawal / 12)} per month at the 4% sustainability
                guideline.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-emerald-200">
                Compounding at work
              </p>
              <p className="mt-2 text-3xl font-semibold">{currency.format(combinedGrowth)}</p>
              <p className="text-sm text-emerald-100/70">
                Growth generated over your contributions of {currency.format(combinedContributions)}
                .
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-emerald-50/90">
            <li>
              Stick to the plan: every fully funded year adds{' '}
              {currency.format(combinedSafeWithdrawal)} of future spending power without touching
              principal.
            </li>
            <li>
              Skipping a year means giving up roughly{' '}
              {currency.format(
                combinedSafeWithdrawal / Math.max(1, plan.retirementAge - plan.currentAge)
              )}{' '}
              in lifelong annual income—consistency is your quiet superpower.
            </li>
            <li>
              Celebrate milestones: each $10,000 you invest today compounds into about{' '}
              {currency.format(tenKImpact)} waiting at retirement.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

export default App;
