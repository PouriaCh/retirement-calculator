import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, PiggyBank } from 'lucide-react';
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

function App() {
  const [plan, setPlan] = useState<PlanInput>(defaultPlan);
  const [tfsaPlan, setTfsaPlan] = useState<TfsaPlanInput>(defaultTfsaPlan);

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
      }),
    [plan, tfsaPlan],
  );
  const tfsaSummary = useMemo(() => summarizeProjection(tfsaProjection), [tfsaProjection]);

  const annualContribution = plan.contribution * PERIODS_PER_YEAR[plan.frequency];
  const tfsaAnnualContribution = tfsaPlan.contribution * PERIODS_PER_YEAR[tfsaPlan.frequency];
  const baseDeductionRoom = Math.min(plan.annualIncome * 0.18, CRA_MAX_2024);
  const maxDeductible = baseDeductionRoom + (plan.rrspCarryForward ?? 0);
  const overContribution = annualContribution > maxDeductible;
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
  const contributionMultiplier = combinedContributions ? combinedNestEgg / combinedContributions : 0;
  const tenKImpact = contributionMultiplier * 10_000;
  const growthShare = summary.finalBalance
    ? (summary.totalGrowth / summary.finalBalance) * 100
    : 0;

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
      if (key === 'currentAge' && typeof value === 'number' && value >= next.retirementAge) {
        next.retirementAge = value + 1;
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
            Adjust each lever to explore how contribution cadence, market returns, and CRA limits change your long-term balance in today’s dollars.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center gap-3 text-white">
              <span className="rounded-2xl bg-brand/20 p-2 text-brand">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">RRSP / RPP contributions</p>
                <p className="text-xl font-semibold">Craft your plan</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
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
                max={80}
                onChange={(value) => updatePlan('retirementAge', value)}
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
                helper="Used to calculate CRA RRSP deduction room (18% up to $31,560)"
              />
              <NumberField
                label="CRA RRSP room carry-forward (optional)"
                prefix="$"
                value={plan.rrspCarryForward ?? 0}
                min={0}
                step={500}
                onChange={(value) => updatePlan('rrspCarryForward', value)}
                helper="Enter the RRSP room shown on your latest Notice of Assessment"
              />
              <div className="space-y-2 text-sm font-medium text-slate-200">
                <span>Contribution frequency</span>
                <select
                  value={plan.frequency}
                  onChange={(event) => updatePlan('frequency', event.target.value as PlanInput['frequency'])}
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
                helper="Recurring RRSP/RPP deposit made each pay period"
              />
              {overContribution ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">CRA limit exceeded</p>
                    <p>
                      Annual contributions of {currency.format(annualContribution)} surpass your estimated RRSP room of{' '}
                      {currency.format(maxDeductible)} (base room {currency.format(baseDeductionRoom)} + carry-forward{' '}
                      {currency.format(plan.rrspCarryForward ?? 0)}). Contributions above the limit are penalized at 1% per month.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  You have about {currency.format(remainingRoom)} of RRSP room remaining this year, including carry-forward protection.
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <SliderField
                label="Expected annual return"
                value={plan.annualReturn}
                min={2}
                max={12}
                step={0.1}
                onChange={(value) => updatePlan('annualReturn', value)}
              />
              <SliderField
                label="Inflation (real dollars)"
                value={plan.inflation}
                min={1}
                max={4}
                step={0.1}
                onChange={(value) => updatePlan('inflation', value)}
              />
              <SliderField
                label="Salary & contribution growth"
                value={plan.salaryGrowth}
                min={0}
                max={6}
                step={0.1}
                onChange={(value) => updatePlan('salaryGrowth', value)}
              />
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/70">TFSA boost</p>
                  <p className="text-lg font-semibold">Tax-free growth on autopilot</p>
                  <p className="text-xs text-slate-400">
                    {`Annual limit: $${TFSA_ANNUAL_LIMIT_2024.toLocaleString()} · All growth stays tax-free.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
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
                  helper="Counts toward the $7,000 annual limit"
                />
                <div className="space-y-2 text-sm font-medium text-slate-200">
                  <span>TFSA contribution frequency</span>
                  <select
                    value={tfsaPlan.frequency}
                    onChange={(event) => updateTfsaPlan('frequency', event.target.value as ContributionFrequency)}
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
                  max={12}
                  step={0.1}
                  onChange={(value) => updateTfsaPlan('annualReturn', value)}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Projected TFSA balance"
                  value={currency.format(tfsaSummary.finalBalance)}
                  helper="Nominal dollars at retirement"
                  tooltip="Projected TFSA balance accounts for your deposits, compound growth, and tax-free status."
                />
                <StatCard
                  label="TFSA total contributions"
                  value={currency.format(tfsaSummary.totalContributions)}
                  helper="Deposits you make each year"
                  tooltip="Total amount you’ll have contributed to your TFSA over the plan horizon."
                />
                <StatCard
                  label="Tax-free income"
                  value={currency.format(tfsaSafeWithdrawal)}
                  helper="4% guideline from TFSA alone"
                  tooltip="Estimated sustainable withdrawal from TFSA only, assuming a 4% draw."
                />
              </div>

              <div className="mt-5">
                {tfsaOverContribution ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">TFSA limit exceeded</p>
                      <p>
                        Depositing {currency.format(tfsaAnnualContribution)} per year exceeds the{' '}
                        {`$${TFSA_ANNUAL_LIMIT_2024.toLocaleString()}`} room. CRA taxes the overflow at 1% per month until withdrawn.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-slate-100">
                    You still have {currency.format(tfsaRemainingRoom)} of TFSA space for the year. Staying consistent keeps all growth tax-free.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
              <p className="text-sm uppercase tracking-wide text-white/70">Plan at a glance (RRSP + TFSA)</p>
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
                  Annual deposits of <span className="font-semibold text-white">{currency.format(annualContribution)}</span> vs.
                  CRA deduction room of <span className="font-semibold text-white">{currency.format(maxDeductible)}</span>
                  {overContribution ? ' — reduce contributions to avoid penalties.' : ' keep you within the 18% limit.'}
                </li>
                <li>
                  Investment growth represents
                  <span className="font-semibold text-white"> {growthShare.toFixed(0)}%</span> of the nest egg — keep time on your side.
                </li>
                <li>
                  Every extra $100 per {plan.frequency.replace('bi', 'bi-')} can grow into roughly{' '}
                  <span className="font-semibold text-white">{currency.format(extraHundredImpact)}</span> by retirement.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/30">
              <p className="text-sm uppercase tracking-wide text-white/70">Max contribution strategy</p>
              <p className="mt-2 text-2xl font-semibold text-white">{currency.format(maxDeductible)}</p>
              <p className="text-sm text-slate-400">
                {`Annual RRSP room (18% of income, capped at $${CRA_MAX_2024.toLocaleString()}) + carry-forward of ${currency.format(
                  plan.rrspCarryForward ?? 0,
                )}.`}
              </p>
              {maxDeductible === 0 ? (
                <p className="mt-4 text-sm text-slate-300">Enter your annual income to calculate optimized contribution amounts.</p>
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
                            {currency.format(strategy.perPeriod)} / {FREQUENCY_DISPLAY[strategy.freq].unit}
                          </p>
                          <p className="text-xs text-slate-400">
                            Hits {currency.format(maxDeductible)} per year
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Projected balance</p>
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
              <p className="text-sm text-slate-400">Balances update instantly based on your inputs.</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">
              {plan.retirementAge - plan.currentAge} years of compounding ·{' '}
              {plan.frequency === 'monthly' ? '12' : plan.frequency === 'biweekly' ? '26' : '52'} deposits / year
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
                    <td className="px-4 py-3 text-slate-300">{compactCurrency(row.combinedContributions)}</td>
                    <td className="px-4 py-3 text-emerald-300">{compactCurrency(row.combinedGrowth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-wide text-emerald-200">Stay the course</p>
            <h2 className="text-3xl font-semibold text-white">Your retirement lifestyle snapshot</h2>
            <p className="text-sm text-emerald-100/70">
              Combining disciplined RRSP and TFSA deposits unlocks a future nest egg of {currency.format(combinedNestEgg)} ({currency.format(combinedInflationAdjusted)} in today’s dollars).
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Annual lifestyle budget</p>
              <p className="mt-2 text-3xl font-semibold">{currency.format(combinedSafeWithdrawal)}</p>
              <p className="text-sm text-emerald-100/70">≈ {currency.format(combinedSafeWithdrawal / 12)} per month at the 4% sustainability guideline.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Compounding at work</p>
              <p className="mt-2 text-3xl font-semibold">{currency.format(combinedGrowth)}</p>
              <p className="text-sm text-emerald-100/70">Growth generated over your contributions of {currency.format(combinedContributions)}.</p>
            </div>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-emerald-50/90">
            <li>
              Stick to the plan: every fully funded year adds {currency.format(combinedSafeWithdrawal)} of future spending power without touching principal.
            </li>
            <li>
              Skipping a year means giving up roughly {currency.format(combinedSafeWithdrawal / Math.max(1, plan.retirementAge - plan.currentAge))} in lifelong annual income—consistency is your quiet superpower.
            </li>
            <li>
              Celebrate milestones: each $10,000 you invest today compounds into about {currency.format(tenKImpact)} waiting at retirement.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

export default App;
