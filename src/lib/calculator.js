const PERIODS_PER_YEAR = {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
};
export const calculateProjection = (input) => {
    const years = Math.max(0, input.retirementAge - input.currentAge);
    const projection = [];
    let balance = input.currentBalance;
    let contributionAnnual = input.contribution * PERIODS_PER_YEAR[input.frequency];
    let totalContributions = 0;
    let totalGrowth = 0;
    const annualReturnRate = input.annualReturn / 100;
    const inflationRate = input.inflation / 100;
    const salaryGrowthRate = input.salaryGrowth / 100;
    const monthlyReturn = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
    for (let year = 0; year < years; year += 1) {
        const age = input.currentAge + year;
        const monthlyContribution = contributionAnnual / 12;
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
        contributionAnnual *= 1 + salaryGrowthRate;
    }
    return projection;
};
export const summarizeProjection = (projection) => {
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
