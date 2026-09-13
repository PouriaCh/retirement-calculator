export type ContributionFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface PlanInput {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  contribution: number; // contribution amount per selected frequency
  annualIncome: number;
  rrspCarryForward?: number;
  employerMatchPercent?: number; // employer matches this % of employee contribution (e.g. 50 = 50%)
  employerMatchCap?: number; // employer match is capped at this % of annual salary (e.g. 3 = 3%)
  annualReturn: number; // percent
  inflation: number; // percent
  salaryGrowth: number; // percent
  frequency: ContributionFrequency;
}

export interface ProjectionYear {
  year: number;
  age: number;
  balance: number;
  realBalance: number;
  contributions: number;
  totalContributions: number;
  interest: number;
  totalGrowth: number;
}

const PERIODS_PER_YEAR: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
};

const VALID_FREQUENCIES: ContributionFrequency[] = ['weekly', 'biweekly', 'monthly'];

// NaN-safe: falls back when the value isn't a finite number (corrupted share-URL,
// tampered localStorage). Does not restrict the value's legitimate sign — use
// safeNonNegative for fields that genuinely can't be negative.
const safeNumber = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;
const safeNonNegative = (value: number, fallback = 0): number =>
  Math.max(0, safeNumber(value, fallback));

export const calculateProjection = (input: PlanInput): ProjectionYear[] => {
  // Guard against malformed input (e.g. a corrupted ?s= share-URL or tampered
  // localStorage value) silently corrupting results with NaN.
  const safeInput: PlanInput = {
    ...input,
    currentAge: safeNonNegative(input.currentAge),
    retirementAge: safeNonNegative(input.retirementAge),
    currentBalance: safeNonNegative(input.currentBalance),
    contribution: safeNonNegative(input.contribution),
    annualIncome: safeNonNegative(input.annualIncome),
    // These three can be legitimately negative (a market downturn, deflation,
    // a pay cut) — only guard against NaN, don't clamp the sign.
    annualReturn: safeNumber(input.annualReturn),
    inflation: safeNumber(input.inflation),
    salaryGrowth: safeNumber(input.salaryGrowth),
    employerMatchPercent: safeNonNegative(input.employerMatchPercent),
    employerMatchCap: safeNonNegative(input.employerMatchCap),
    frequency: VALID_FREQUENCIES.includes(input.frequency) ? input.frequency : 'monthly',
  };

  const years = Math.max(0, safeInput.retirementAge - safeInput.currentAge);
  const projection: ProjectionYear[] = [];

  let balance = safeInput.currentBalance;
  let employeeAnnual = safeInput.contribution * PERIODS_PER_YEAR[safeInput.frequency];
  let currentIncome = safeInput.annualIncome;
  let totalContributions = 0;
  let totalGrowth = 0;

  const annualReturnRate = safeInput.annualReturn / 100;
  const inflationRate = safeInput.inflation / 100;
  const salaryGrowthRate = safeInput.salaryGrowth / 100;
  const monthlyReturn = Math.pow(1 + annualReturnRate, 1 / 12) - 1;

  const matchRate = (safeInput.employerMatchPercent ?? 0) / 100;
  const matchCapRate = (safeInput.employerMatchCap ?? 0) / 100;

  for (let year = 0; year < years; year += 1) {
    const age = safeInput.currentAge + year;

    // Employer match: match% of employee contribution, capped at matchCap% of salary
    const uncappedMatch = employeeAnnual * matchRate;
    const matchCeiling = currentIncome * matchCapRate;
    const employerAnnual = matchCapRate > 0 ? Math.min(uncappedMatch, matchCeiling) : uncappedMatch;

    const totalAnnual = employeeAnnual + employerAnnual;
    const monthlyContribution = totalAnnual / 12;
    let contributionsThisYear = 0;
    let interestThisYear = 0;

    for (let month = 0; month < 12; month += 1) {
      balance += monthlyContribution;
      contributionsThisYear += monthlyContribution;
      totalContributions += monthlyContribution;

      const interestEarned = balance * monthlyReturn;
      balance += interestEarned;
      interestThisYear += interestEarned;
      totalGrowth += interestEarned;
    }

    const realBalance = balance / Math.pow(1 + inflationRate, year + 1);

    projection.push({
      year,
      age: age + 1, // end-of-year age
      balance,
      realBalance,
      contributions: contributionsThisYear,
      totalContributions,
      interest: interestThisYear,
      totalGrowth,
    });

    employeeAnnual *= 1 + salaryGrowthRate;
    currentIncome *= 1 + salaryGrowthRate;
  }

  return projection;
};

export const summarizeProjection = (projection: ProjectionYear[]) => {
  if (!projection.length) {
    return {
      finalBalance: 0,
      inflationAdjusted: 0,
      totalContributions: 0,
      totalGrowth: 0,
    };
  }

  const last = projection[projection.length - 1];
  return {
    finalBalance: last.balance,
    inflationAdjusted: last.realBalance,
    totalContributions: last.totalContributions,
    totalGrowth: last.totalGrowth,
  };
};
