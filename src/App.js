import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, PiggyBank } from 'lucide-react';
import { NumberField } from './components/NumberField';
import { SliderField } from './components/SliderField';
import { StatCard } from './components/StatCard';
import { ProjectionChart } from './components/ProjectionChart';
import { BalanceMiniChart } from './components/BalanceMiniChart';
import { calculateProjection, summarizeProjection, } from './lib/calculator';
const defaultPlan = {
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
const PERIODS_PER_YEAR = {
    monthly: 12,
    biweekly: 26,
    weekly: 52,
};
const FREQUENCY_DISPLAY = {
    monthly: { label: 'Monthly cadence', unit: 'month' },
    biweekly: { label: 'Every paycheque (bi-weekly)', unit: 'paycheque' },
    weekly: { label: 'Weekly cadence', unit: 'week' },
};
const defaultTfsaPlan = {
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
const compactCurrency = (value) => {
    if (value >= 1000000)
        return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000)
        return `${(value / 1000).toFixed(1)}k`;
    return currency.format(value);
};
const sampleMilestones = (data, target = 8) => {
    if (data.length <= target)
        return data;
    const bucketSize = Math.ceil(data.length / (target - 1));
    return data.filter((_, index) => index % bucketSize === 0 || index === data.length - 1);
};
function App() {
    const [plan, setPlan] = useState(defaultPlan);
    const [tfsaPlan, setTfsaPlan] = useState(defaultTfsaPlan);
    const projection = useMemo(() => calculateProjection(plan), [plan]);
    const summary = useMemo(() => summarizeProjection(projection), [projection]);
    const tfsaProjection = useMemo(() => calculateProjection({
        ...plan,
        currentBalance: tfsaPlan.currentBalance,
        contribution: tfsaPlan.contribution,
        frequency: tfsaPlan.frequency,
        annualReturn: tfsaPlan.annualReturn,
    }), [plan, tfsaPlan]);
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
    const tenKImpact = contributionMultiplier * 10000;
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
        if (!maxDeductible)
            return [];
        return Object.keys(PERIODS_PER_YEAR).map((freq) => {
            const periods = PERIODS_PER_YEAR[freq];
            const perPeriod = maxDeductible / periods;
            const optimizedPlan = { ...plan, frequency: freq, contribution: perPeriod };
            const optimizedSummary = summarizeProjection(calculateProjection(optimizedPlan));
            return {
                freq,
                perPeriod,
                finalBalance: optimizedSummary.finalBalance,
            };
        });
    }, [plan, maxDeductible]);
    const updatePlan = (key, value) => {
        setPlan((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'currentAge' && typeof value === 'number' && value >= next.retirementAge) {
                next.retirementAge = value + 1;
            }
            return next;
        });
    };
    const updateTfsaPlan = (key, value) => {
        setTfsaPlan((prev) => ({ ...prev, [key]: value }));
    };
    return (_jsx("main", { className: "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 py-10", children: _jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-8 px-4", children: [_jsxs("header", { className: "text-center", children: [_jsxs("div", { className: "inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200", children: [_jsx(PiggyBank, { className: "h-4 w-4 text-brand" }), "Smart RRSP & RPP Planner"] }), _jsx("h1", { className: "mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl", children: "See how steady contributions grow into retirement freedom" }), _jsx("p", { className: "mx-auto mt-4 max-w-2xl text-lg text-slate-300", children: "Adjust each lever to explore how contribution cadence, market returns, and CRA limits change your long-term balance in today\u2019s dollars." })] }), _jsxs("div", { className: "grid gap-8 lg:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("section", { className: "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur", children: [_jsxs("div", { className: "flex items-center gap-3 text-white", children: [_jsx("span", { className: "rounded-2xl bg-brand/20 p-2 text-brand", children: _jsx(Calculator, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/80", children: "RRSP / RPP contributions" }), _jsx("p", { className: "text-xl font-semibold", children: "Craft your plan" })] })] }), _jsxs("div", { className: "mt-6 grid gap-6 md:grid-cols-2", children: [_jsx(NumberField, { label: "Current age", value: plan.currentAge, min: 18, max: 70, onChange: (value) => updatePlan('currentAge', value) }), _jsx(NumberField, { label: "Retirement age", value: plan.retirementAge, min: plan.currentAge + 1, max: 80, onChange: (value) => updatePlan('retirementAge', value) }), _jsx(NumberField, { label: "Current savings", prefix: "$", value: plan.currentBalance, min: 0, step: 1000, onChange: (value) => updatePlan('currentBalance', value) }), _jsx(NumberField, { label: "Annual income", prefix: "$", value: plan.annualIncome, min: 0, step: 1000, onChange: (value) => updatePlan('annualIncome', value), helper: "Used to calculate CRA RRSP deduction room (18% up to $31,560)" }), _jsx(NumberField, { label: "CRA RRSP room carry-forward (optional)", prefix: "$", value: plan.rrspCarryForward ?? 0, min: 0, step: 500, onChange: (value) => updatePlan('rrspCarryForward', value), helper: "Enter the RRSP room shown on your latest Notice of Assessment" }), _jsxs("div", { className: "space-y-2 text-sm font-medium text-slate-200", children: [_jsx("span", { children: "Contribution frequency" }), _jsxs("select", { value: plan.frequency, onChange: (event) => updatePlan('frequency', event.target.value), className: "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40", children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "biweekly", children: "Bi-weekly" }), _jsx("option", { value: "weekly", children: "Weekly" })] })] }), _jsx(NumberField, { label: `Contribution per ${plan.frequency.replace('bi', 'bi-')}`, prefix: "$", value: plan.contribution, min: 0, step: 50, onChange: (value) => updatePlan('contribution', value), helper: "Recurring RRSP/RPP deposit made each pay period" }), overContribution ? (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "CRA limit exceeded" }), _jsxs("p", { children: ["Annual contributions of ", currency.format(annualContribution), " surpass your estimated RRSP room of", ' ', currency.format(maxDeductible), " (base room ", currency.format(baseDeductionRoom), " + carry-forward", ' ', currency.format(plan.rrspCarryForward ?? 0), "). Contributions above the limit are penalized at 1% per month."] })] })] })) : (_jsxs("div", { className: "rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100", children: ["You have about ", currency.format(remainingRoom), " of RRSP room remaining this year, including carry-forward protection."] }))] }), _jsxs("div", { className: "mt-8 grid gap-6 md:grid-cols-3", children: [_jsx(SliderField, { label: "Expected annual return", value: plan.annualReturn, min: 2, max: 12, step: 0.1, onChange: (value) => updatePlan('annualReturn', value) }), _jsx(SliderField, { label: "Inflation (real dollars)", value: plan.inflation, min: 1, max: 4, step: 0.1, onChange: (value) => updatePlan('inflation', value) }), _jsx(SliderField, { label: "Salary & contribution growth", value: plan.salaryGrowth, min: 0, max: 6, step: 0.1, onChange: (value) => updatePlan('salaryGrowth', value) })] }), _jsxs("div", { className: "mt-10 rounded-3xl border border-white/10 bg-slate-900/40 p-5", children: [_jsx("div", { className: "flex items-center justify-between text-white", children: _jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "TFSA boost" }), _jsx("p", { className: "text-lg font-semibold", children: "Tax-free growth on autopilot" }), _jsx("p", { className: "text-xs text-slate-400", children: `Annual limit: $${TFSA_ANNUAL_LIMIT_2024.toLocaleString()} · All growth stays tax-free.` })] }) }), _jsxs("div", { className: "mt-5 grid gap-5 md:grid-cols-2", children: [_jsx(NumberField, { label: "Current TFSA balance", prefix: "$", value: tfsaPlan.currentBalance, min: 0, step: 1000, onChange: (value) => updateTfsaPlan('currentBalance', value) }), _jsx(NumberField, { label: `TFSA contribution per ${tfsaPlan.frequency.replace('bi', 'bi-')}`, prefix: "$", value: tfsaPlan.contribution, min: 0, step: 50, onChange: (value) => updateTfsaPlan('contribution', value), helper: "Counts toward the $7,000 annual limit" }), _jsxs("div", { className: "space-y-2 text-sm font-medium text-slate-200", children: [_jsx("span", { children: "TFSA contribution frequency" }), _jsxs("select", { value: tfsaPlan.frequency, onChange: (event) => updateTfsaPlan('frequency', event.target.value), className: "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40", children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "biweekly", children: "Bi-weekly" }), _jsx("option", { value: "weekly", children: "Weekly" })] })] }), _jsx(SliderField, { label: "TFSA annual return", value: tfsaPlan.annualReturn, min: 2, max: 12, step: 0.1, onChange: (value) => updateTfsaPlan('annualReturn', value) })] }), _jsxs("div", { className: "mt-5 grid gap-4 md:grid-cols-3", children: [_jsx(StatCard, { label: "Projected TFSA balance", value: currency.format(tfsaSummary.finalBalance), helper: "Nominal dollars at retirement", tooltip: "Projected TFSA balance accounts for your deposits, compound growth, and tax-free status." }), _jsx(StatCard, { label: "TFSA total contributions", value: currency.format(tfsaSummary.totalContributions), helper: "Deposits you make each year", tooltip: "Total amount you\u2019ll have contributed to your TFSA over the plan horizon." }), _jsx(StatCard, { label: "Tax-free income", value: currency.format(tfsaSafeWithdrawal), helper: "4% guideline from TFSA alone", tooltip: "Estimated sustainable withdrawal from TFSA only, assuming a 4% draw." })] }), _jsx("div", { className: "mt-5", children: tfsaOverContribution ? (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "TFSA limit exceeded" }), _jsxs("p", { children: ["Depositing ", currency.format(tfsaAnnualContribution), " per year exceeds the", ' ', `$${TFSA_ANNUAL_LIMIT_2024.toLocaleString()}`, " room. CRA taxes the overflow at 1% per month until withdrawn."] })] })] })) : (_jsxs("div", { className: "rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-slate-100", children: ["You still have ", currency.format(tfsaRemainingRoom), " of TFSA space for the year. Staying consistent keeps all growth tax-free."] })) })] })] }), _jsxs("section", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "Plan at a glance (RRSP + TFSA)" }), _jsxs("div", { className: "mt-4 grid gap-4", children: [_jsx(StatCard, { label: "Total projected nest egg", value: currency.format(combinedNestEgg), helper: "Nominal dollars at retirement", tooltip: "Combined RRSP/RPP and TFSA balances at your target retirement age before inflation." }), _jsx(StatCard, { label: "Today\u2019s dollars", value: currency.format(combinedInflationAdjusted), helper: "Inflation-adjusted purchasing power", tooltip: "Same nest egg converted to today\u2019s dollars using your inflation slider." }), _jsx(StatCard, { label: "Lifetime contributions", value: currency.format(combinedContributions), helper: "RRSP + TFSA deposits you\u2019ll make", tooltip: "Sum of every deposit you plan to make across both accounts." }), _jsx(StatCard, { label: "Sustainable income", value: currency.format(combinedSafeWithdrawal), helper: "\u2248 yearly budget at 4% withdrawal", tooltip: "Estimated annual draw you can sustain without depleting capital (RRSP+TFSA)." })] }), _jsxs("div", { className: "mt-6 grid gap-4 md:grid-cols-2", children: [_jsx(StatCard, { label: "RRSP / RPP balance", value: currency.format(summary.finalBalance), helper: "Tax-deferred dollars at retirement", tooltip: "Projected RRSP/RPP balance alone." }), _jsx(StatCard, { label: "TFSA balance", value: currency.format(tfsaSummary.finalBalance), helper: "Tax-free dollars at retirement", tooltip: "Projected TFSA balance alone." }), _jsx(StatCard, { label: "RRSP withdrawals", value: currency.format(safeWithdrawal), helper: "Estimated taxable income", tooltip: "4% rule applied to your RRSP/RPP balance." }), _jsx(StatCard, { label: "TFSA withdrawals", value: currency.format(tfsaSafeWithdrawal), helper: "Estimated tax-free income", tooltip: "4% rule applied to your TFSA balance." })] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/30", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "Insights" }), _jsxs("ul", { className: "mt-4 space-y-4 text-sm text-slate-300", children: [_jsxs("li", { children: ["Annual deposits of ", _jsx("span", { className: "font-semibold text-white", children: currency.format(annualContribution) }), " vs. CRA deduction room of ", _jsx("span", { className: "font-semibold text-white", children: currency.format(maxDeductible) }), overContribution ? ' — reduce contributions to avoid penalties.' : ' keep you within the 18% limit.'] }), _jsxs("li", { children: ["Investment growth represents", _jsxs("span", { className: "font-semibold text-white", children: [" ", growthShare.toFixed(0), "%"] }), " of the nest egg \u2014 keep time on your side."] }), _jsxs("li", { children: ["Every extra $100 per ", plan.frequency.replace('bi', 'bi-'), " can grow into roughly", ' ', _jsx("span", { className: "font-semibold text-white", children: currency.format(extraHundredImpact) }), " by retirement."] })] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/30", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "Max contribution strategy" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-white", children: currency.format(maxDeductible) }), _jsx("p", { className: "text-sm text-slate-400", children: `Annual RRSP room (18% of income, capped at $${CRA_MAX_2024.toLocaleString()}) + carry-forward of ${currency.format(plan.rrspCarryForward ?? 0)}.` }), maxDeductible === 0 ? (_jsx("p", { className: "mt-4 text-sm text-slate-300", children: "Enter your annual income to calculate optimized contribution amounts." })) : (_jsx("div", { className: "mt-5 space-y-3", children: optimizedStrategies.map((strategy) => (_jsx("div", { className: "rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-black/10", children: _jsxs("div", { className: "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: FREQUENCY_DISPLAY[strategy.freq].label }), _jsxs("p", { className: "text-lg font-semibold text-white", children: [currency.format(strategy.perPeriod), " / ", FREQUENCY_DISPLAY[strategy.freq].unit] }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Hits ", currency.format(maxDeductible), " per year"] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Projected balance" }), _jsx("p", { className: "text-base font-semibold text-emerald-300", children: currency.format(strategy.finalBalance) })] })] }) }, strategy.freq))) }))] })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-2xl shadow-black/30", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "Growth journey" }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: "Projection through retirement" }), _jsx("p", { className: "text-sm text-slate-400", children: "Balances update instantly based on your inputs." })] }), _jsxs("div", { className: "rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200", children: [plan.retirementAge - plan.currentAge, " years of compounding \u00B7", ' ', plan.frequency === 'monthly' ? '12' : plan.frequency === 'biweekly' ? '26' : '52', " deposits / year"] })] }), _jsxs("div", { className: "mt-6 grid gap-4 lg:grid-cols-3", children: [_jsx("div", { className: "rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900 to-slate-950/80 p-4 lg:col-span-3", children: _jsx(ProjectionChart, { data: projection }) }), _jsxs("div", { className: "rounded-3xl border border-white/5 bg-slate-950/70 p-4", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: "RRSP / RPP growth" }), _jsx("p", { className: "text-xs text-slate-400", children: "Balance over time" }), _jsx(BalanceMiniChart, { data: projection, label: "RRSP balance", color: "#1F8EF1" })] }), _jsxs("div", { className: "rounded-3xl border border-white/5 bg-slate-950/70 p-4", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: "TFSA growth" }), _jsx("p", { className: "text-xs text-slate-400", children: "Balance over time" }), _jsx(BalanceMiniChart, { data: tfsaProjection, label: "TFSA balance", color: "#C084FC" })] })] }), _jsx("div", { className: "mt-8 overflow-x-auto rounded-2xl border border-white/5", children: _jsxs("table", { className: "min-w-full divide-y divide-white/5 text-sm", children: [_jsx("thead", { className: "bg-white/5 text-left uppercase tracking-wide text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Age" }), _jsx("th", { className: "px-4 py-3", children: "RRSP balance" }), _jsx("th", { className: "px-4 py-3", children: "TFSA balance" }), _jsx("th", { className: "px-4 py-3", children: "Combined" }), _jsx("th", { className: "px-4 py-3", children: "RRSP%" }), _jsx("th", { className: "px-4 py-3", children: "TFSA%" }), _jsx("th", { className: "px-4 py-3", children: "Total contributions" }), _jsx("th", { className: "px-4 py-3", children: "Total growth" })] }) }), _jsx("tbody", { children: combinedMilestones.map((row) => (_jsxs("tr", { className: "odd:bg-white/[0.02]", children: [_jsx("td", { className: "px-4 py-3 font-semibold text-white", children: row.age }), _jsx("td", { className: "px-4 py-3 text-slate-100", children: currency.format(row.rrspBalance) }), _jsx("td", { className: "px-4 py-3 text-slate-100", children: currency.format(row.tfsaBalance) }), _jsx("td", { className: "px-4 py-3 text-white", children: currency.format(row.combinedBalance) }), _jsxs("td", { className: "px-4 py-3 text-slate-300", children: [row.rrspShare.toFixed(0), "%"] }), _jsxs("td", { className: "px-4 py-3 text-slate-300", children: [row.tfsaShare.toFixed(0), "%"] }), _jsx("td", { className: "px-4 py-3 text-slate-300", children: compactCurrency(row.combinedContributions) }), _jsx("td", { className: "px-4 py-3 text-emerald-300", children: compactCurrency(row.combinedGrowth) })] }, row.age))) })] }) })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 p-6 shadow-2xl shadow-black/40", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-emerald-200", children: "Stay the course" }), _jsx("h2", { className: "text-3xl font-semibold text-white", children: "Your retirement lifestyle snapshot" }), _jsxs("p", { className: "text-sm text-emerald-100/70", children: ["Combining disciplined RRSP and TFSA deposits unlocks a future nest egg of ", currency.format(combinedNestEgg), " (", currency.format(combinedInflationAdjusted), " in today\u2019s dollars)."] })] }), _jsxs("div", { className: "mt-6 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-emerald-200", children: "Annual lifestyle budget" }), _jsx("p", { className: "mt-2 text-3xl font-semibold", children: currency.format(combinedSafeWithdrawal) }), _jsxs("p", { className: "text-sm text-emerald-100/70", children: ["\u2248 ", currency.format(combinedSafeWithdrawal / 12), " per month at the 4% sustainability guideline."] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-emerald-200", children: "Compounding at work" }), _jsx("p", { className: "mt-2 text-3xl font-semibold", children: currency.format(combinedGrowth) }), _jsxs("p", { className: "text-sm text-emerald-100/70", children: ["Growth generated over your contributions of ", currency.format(combinedContributions), "."] })] })] }), _jsxs("ul", { className: "mt-6 space-y-3 text-sm text-emerald-50/90", children: [_jsxs("li", { children: ["Stick to the plan: every fully funded year adds ", currency.format(combinedSafeWithdrawal), " of future spending power without touching principal."] }), _jsxs("li", { children: ["Skipping a year means giving up roughly ", currency.format(combinedSafeWithdrawal / Math.max(1, plan.retirementAge - plan.currentAge)), " in lifelong annual income\u2014consistency is your quiet superpower."] }), _jsxs("li", { children: ["Celebrate milestones: each $10,000 you invest today compounds into about ", currency.format(tenKImpact), " waiting at retirement."] })] })] })] }) }));
}
export default App;
