import { describe, it, expect } from 'vitest';
import { calculateProjection, summarizeProjection, PlanInput } from '../src/lib/calculator';

const baseInput: PlanInput = {
  currentAge: 30,
  retirementAge: 65,
  currentBalance: 10000,
  contribution: 500,
  annualIncome: 60000,
  annualReturn: 7,
  inflation: 2,
  salaryGrowth: 2,
  frequency: 'monthly',
};

// ─── calculateProjection ────────────────────────────────────────────────────

describe('calculateProjection', () => {
  it('returns one entry per year between currentAge and retirementAge', () => {
    const result = calculateProjection(baseInput);
    expect(result).toHaveLength(35); // 65 - 30
  });

  it('returns an empty array when retirementAge equals currentAge', () => {
    const result = calculateProjection({ ...baseInput, retirementAge: 30 });
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when retirementAge is less than currentAge', () => {
    const result = calculateProjection({ ...baseInput, retirementAge: 25 });
    expect(result).toHaveLength(0);
  });

  it('sets age to currentAge + 1 on the first entry (end-of-year)', () => {
    const result = calculateProjection(baseInput);
    expect(result[0].age).toBe(31);
  });

  it('sets age to retirementAge on the last entry', () => {
    const result = calculateProjection(baseInput);
    expect(result[result.length - 1].age).toBe(65);
  });

  it('balance grows monotonically with a positive return rate', () => {
    const result = calculateProjection(baseInput);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].balance).toBeGreaterThan(result[i - 1].balance);
    }
  });

  it('totalContributions increases every year', () => {
    const result = calculateProjection(baseInput);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalContributions).toBeGreaterThan(result[i - 1].totalContributions);
    }
  });

  it('realBalance is less than nominal balance due to inflation', () => {
    const result = calculateProjection(baseInput);
    result.forEach((row) => {
      expect(row.realBalance).toBeLessThan(row.balance);
    });
  });

  it('zero return rate: balance equals starting balance plus contributions only', () => {
    const input: PlanInput = {
      ...baseInput,
      currentBalance: 0,
      annualReturn: 0,
      inflation: 0,
      salaryGrowth: 0,
      contribution: 1000,
      frequency: 'monthly',
      currentAge: 30,
      retirementAge: 31, // 1 year
    };
    const result = calculateProjection(input);
    expect(result).toHaveLength(1);
    // 1000/month × 12 = 12 000
    expect(result[0].balance).toBeCloseTo(12000, 0);
    expect(result[0].interest).toBeCloseTo(0, 5);
  });

  it('employer match is added on top of employee contributions', () => {
    const withMatch = calculateProjection({
      ...baseInput,
      employerMatchPercent: 50,
      employerMatchCap: 10, // 10% of 60 000 = 6 000 ceiling
    });
    const withoutMatch = calculateProjection(baseInput);
    // With a 50% match the balance should be higher every year
    withMatch.forEach((row, i) => {
      expect(row.balance).toBeGreaterThan(withoutMatch[i].balance);
    });
  });

  it('employer match is capped at matchCap% of salary', () => {
    // Employee contributes 500/month × 12 = 6 000/year
    // 50% match = 3 000, but cap is 1% of 60 000 = 600 → cap wins
    const capped = calculateProjection({
      ...baseInput,
      employerMatchPercent: 50,
      employerMatchCap: 1,
    });
    // 50% match uncapped = 3 000, capped = 600 → total annual = 6 600
    const uncapped = calculateProjection({
      ...baseInput,
      employerMatchPercent: 50,
      employerMatchCap: 10, // ceiling = 6 000, uncapped match = 3 000 → match = 3 000
    });
    expect(capped[0].balance).toBeLessThan(uncapped[0].balance);
  });

  it('higher return rate produces a larger final balance', () => {
    const low = calculateProjection({ ...baseInput, annualReturn: 4 });
    const high = calculateProjection({ ...baseInput, annualReturn: 10 });
    const lastLow = low[low.length - 1].balance;
    const lastHigh = high[high.length - 1].balance;
    expect(lastHigh).toBeGreaterThan(lastLow);
  });

  it('weekly frequency contributes the same annual total as monthly at equivalent amounts', () => {
    // 500/month × 12 = 6 000/year; ~115.38/week × 52 ≈ 6 000/year
    const monthly = calculateProjection({
      ...baseInput,
      contribution: 500,
      frequency: 'monthly',
    });
    const weekly = calculateProjection({
      ...baseInput,
      contribution: 6000 / 52,
      frequency: 'weekly',
    });
    // Balances should be very close (within $1 due to rounding)
    expect(Math.abs(monthly[0].balance - weekly[0].balance)).toBeLessThan(1);
  });
});

// ─── summarizeProjection ─────────────────────────────────────────────────────

describe('summarizeProjection', () => {
  it('returns zeros for an empty projection', () => {
    const summary = summarizeProjection([]);
    expect(summary).toEqual({
      finalBalance: 0,
      inflationAdjusted: 0,
      totalContributions: 0,
      totalGrowth: 0,
    });
  });

  it('reflects the last year values from the projection', () => {
    const projection = calculateProjection(baseInput);
    const summary = summarizeProjection(projection);
    const last = projection[projection.length - 1];

    expect(summary.finalBalance).toBe(last.balance);
    expect(summary.inflationAdjusted).toBe(last.realBalance);
    expect(summary.totalContributions).toBe(last.totalContributions);
    expect(summary.totalGrowth).toBe(last.totalGrowth);
  });

  it('totalContributions + totalGrowth approximately equals finalBalance', () => {
    const projection = calculateProjection({ ...baseInput, currentBalance: 0 });
    const { finalBalance, totalContributions, totalGrowth } = summarizeProjection(projection);
    expect(totalContributions + totalGrowth).toBeCloseTo(finalBalance, 0);
  });
});
