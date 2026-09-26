export type Metrics = {
  loans: number;
  chargedOff: number;
  fundedCents: number;
  chargedOffFundedCents: number;
  receivedCents: number;
  interestBasisPointSum: number;
  dtiBasisPointSum: number;
};

export type Period = {
  summary: Metrics;
  grades: Record<string, Metrics>;
  dtiBands: Record<string, Metrics>;
  purposes: Record<string, Metrics>;
  months: Record<string, Metrics>;
};

export type DashboardData = { periods: Record<string, Period> };

export const integer = (value: number) => new Intl.NumberFormat("en-US").format(value);
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
export const compactMoney = (cents: number) => {
  const dollars = cents / 100;
  return dollars >= 1_000_000 ? `$${(dollars / 1_000_000).toFixed(1)}M` : `$${(dollars / 1_000).toFixed(0)}K`;
};
export const percent = (numerator: number, denominator: number) =>
  denominator > 0 ? `${(100 * numerator / denominator).toFixed(2)}%` : "N/A";
export const chargedOffRate = (metrics: Metrics) => metrics.loans > 0 ? metrics.chargedOff / metrics.loans : 0;

export function getGradeComparison(period: Period) {
  const grades = Object.entries(period.grades).sort(([a], [b]) => a.localeCompare(b));
  const lowest = grades[0];
  const highest = grades[grades.length - 1];
  const lowRate = lowest ? chargedOffRate(lowest[1]) : 0;
  const highRate = highest ? chargedOffRate(highest[1]) : 0;
  return { grades, lowest, highest, multiple: lowRate > 0 ? highRate / lowRate : null };
}

export function getHighGradeConcentration(period: Period) {
  const highGrades = ["E", "F", "G"].map((grade) => period.grades[grade]).filter((value): value is Metrics => Boolean(value));
  return highGrades.reduce((total, grade) => ({
    loans: total.loans + grade.loans,
    chargedOff: total.chargedOff + grade.chargedOff,
  }), { loans: 0, chargedOff: 0 });
}

export function getTrend(data: DashboardData, year: string) {
  const period = data.periods[year];
  if (year === "all") {
    return Object.keys(data.periods)
      .filter((key) => key !== "all")
      .sort()
      .map((key) => ({ key, label: key, metrics: data.periods[key].summary }));
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Object.entries(period.months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, metrics]) => ({ key, label: monthNames[Number(key.slice(5, 7)) - 1], metrics }));
}

export function priorMonthFunded(data: DashboardData, month: string) {
  const keys = Object.keys(data.periods.all.months).sort();
  const index = keys.indexOf(month);
  return index > 0 ? data.periods.all.months[keys[index - 1]].fundedCents : null;
}

export function monthGrowth(data: DashboardData, month: string) {
  const prior = priorMonthFunded(data, month);
  const current = data.periods.all.months[month]?.fundedCents;
  return prior && current !== undefined ? (current / prior - 1) * 100 : null;
}
