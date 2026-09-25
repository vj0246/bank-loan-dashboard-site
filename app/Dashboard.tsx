"use client";

import { useState } from "react";

type Metrics = {
  loans: number;
  chargedOff: number;
  fundedCents: number;
  chargedOffFundedCents: number;
  receivedCents: number;
  interestBasisPointSum: number;
  dtiBasisPointSum: number;
};

type Period = {
  summary: Metrics;
  grades: Record<string, Metrics>;
  dtiBands: Record<string, Metrics>;
  purposes: Record<string, Metrics>;
  months: Record<string, Metrics>;
};

export type DashboardData = { periods: Record<string, Period> };
type Tab = "summary" | "risk" | "trends" | "method";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tabs: { id: Tab; label: string }[] = [
  { id: "summary", label: "Overview" },
  { id: "risk", label: "Risk profile" },
  { id: "trends", label: "Originations" },
  { id: "method", label: "Method" },
];

const integer = (value: number) => new Intl.NumberFormat("en-US").format(value);
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const compactMoney = (cents: number) => {
  const dollars = cents / 100;
  return dollars >= 1_000_000 ? `$${(dollars / 1_000_000).toFixed(1)}M` : `$${(dollars / 1_000).toFixed(0)}K`;
};
const share = (numerator: number, denominator: number) => denominator ? (100 * numerator / denominator).toFixed(2) : "0.00";
const outcome = (metrics: Metrics) => share(metrics.chargedOff, metrics.loans);
const monthLabel = (key: string) => monthNames[Number(key.slice(5, 7)) - 1];

export default function Dashboard({ data }: { data: DashboardData }) {
  const [year, setYear] = useState("all");
  const [tab, setTab] = useState<Tab>("summary");
  const [selectedTrend, setSelectedTrend] = useState("");
  const years = Object.keys(data.periods).filter((value) => value !== "all").sort();
  const period = data.periods[year];
  const overall = period.summary;
  const grades = Object.entries(period.grades).sort(([a], [b]) => a.localeCompare(b));
  const purposes = Object.entries(period.purposes)
    .sort(([, a], [, b]) => b.fundedCents - a.fundedCents)
    .slice(0, 8);
  const bands = ["<10%", "10–<20%", ">=20%"]
    .map((label) => [label, period.dtiBands[label]] as const)
    .filter((entry): entry is readonly [string, Metrics] => Boolean(entry[1]));
  const trend = year === "all"
    ? years.map((key) => ({ key, label: key, metrics: data.periods[key].summary }))
    : Object.entries(period.months).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, metrics]) => ({ key, label: monthLabel(key), metrics }));
  const maxTrend = Math.max(...trend.map((item) => item.metrics.fundedCents), 1);
  const activeTrend = trend.find((item) => item.key === selectedTrend) ?? trend[trend.length - 1];
  const allMonthKeys = Object.keys(data.periods.all.months).sort();
  const priorMonth = (key: string) => {
    const index = allMonthKeys.indexOf(key);
    return index > 0 ? data.periods.all.months[allMonthKeys[index - 1]] : null;
  };
  const growth = (key: string, funded: number) => {
    const prior = priorMonth(key)?.fundedCents;
    return prior ? `${((funded / prior - 1) * 100) >= 0 ? "+" : ""}${((funded / prior - 1) * 100).toFixed(1)}%` : "No prior month";
  };
  const gradeScale = Math.max(...grades.map(([, metrics]) => metrics.chargedOff / metrics.loans), 0.01);
  const dtiScale = Math.max(...bands.map(([, metrics]) => metrics.chargedOff / metrics.loans), 0.01);

  return (
    <main className="site-shell">
      <header className="masthead">
        <div className="brand"><span className="brand-mark" aria-hidden="true">L</span><span>LOAN LEDGER</span></div>
        <div className="masthead-meta"><span>Historical archive</span><span className="meta-separator" /> <span>2007–2011</span></div>
      </header>

      <div className="intro">
        <div>
          <p className="intro-kicker">A credit outcomes study</p>
          <h1>What happened after<br />the loans were issued?</h1>
          <p className="intro-copy">Explore origination volume and eventual charge-offs across 39,786 resolved loans. Descriptive evidence, not a forecast.</p>
        </div>
        <div className="scope-select">
          <label htmlFor="year">Issue year</label>
          <select id="year" value={year} onChange={(event) => { setYear(event.target.value); setSelectedTrend(""); }}>
            <option value="all">All years, 2007–2011</option>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <p>Filter applies across every view.</p>
        </div>
      </div>

      <div className="report-grid">
        <nav className="view-nav" aria-label="Report views">
          <p className="nav-heading">Explore</p>
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" className={`nav-item ${tab === id ? "active" : ""}`} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}<span aria-hidden="true">{tab === id ? "●" : ""}</span></button>
          ))}
          <p className="nav-note">Outcome status is observed after origination. Month labels are issue months.</p>
        </nav>

        <div className="report-content">
          {tab === "summary" && <>
            <div className="section-heading"><div><p className="section-index">Portfolio overview</p><h2>One archive. Two outcomes.</h2></div><span className="section-context">{year === "all" ? "Full sample" : `Issued in ${year}`}</span></div>
            <div className="hero-grid">
              <section className="hero-rate" aria-label="Observed charge-off share">
                <p className="metric-label">Observed charge-off share</p>
                <div className="hero-number">{outcome(overall)}<span>%</span></div>
                <p className="metric-foot">{integer(overall.chargedOff)} charged off / {integer(overall.loans)} resolved loans</p>
                <div className="split-track" role="img" aria-label={`${outcome(overall)} percent charged off and ${(100 - Number(outcome(overall))).toFixed(2)} percent fully paid`}><span style={{ width: `${100 - Number(outcome(overall))}%` }} /><span /></div>
                <div className="split-legend"><span><i className="dot blue" />Fully paid</span><span><i className="dot red" />Charged off</span></div>
              </section>
              <div className="side-metrics">
                <div><p className="metric-label">Original amount funded</p><strong>{compactMoney(overall.fundedCents)}</strong><small>{money(overall.fundedCents)} total</small></div>
                <div><p className="metric-label">Average contracted rate</p><strong>{(overall.interestBasisPointSum / overall.loans / 100).toFixed(2)}%</strong><small>Across {integer(overall.loans)} loans</small></div>
                <div><p className="metric-label">Average debt-to-income</p><strong>{(overall.dtiBasisPointSum / overall.loans / 100).toFixed(2)}%</strong><small>At origination</small></div>
              </div>
            </div>
            <div className="panel two-column"><div><p className="panel-label">Reading the rate</p><h3>Not a default prediction.</h3><p>This share counts charged-off loans among resolved loans in this historical extract. It does not measure when charge-offs occurred or the dollars ultimately lost.</p></div><div className="panel-figure"><span>{integer(overall.loans)}</span><small>loans in the selected issue period</small></div></div>
          </>}

          {tab === "risk" && <>
            <div className="section-heading"><div><p className="section-index">Risk profile</p><h2>Differences worth investigating.</h2></div><span className="section-context">{year === "all" ? "Full sample" : `Issued in ${year}`}</span></div>
            <section className="panel"><div className="panel-title"><div><p className="panel-label">Assigned grade</p><h3>Observed charge-off share by grade</h3></div><span>Count / rate</span></div>
              <div className="rate-list">{grades.map(([grade, metrics]) => <div className="rate-row" key={grade}><strong className="row-key">{grade}</strong><div className="rate-track"><span style={{ width: `${100 * (metrics.chargedOff / metrics.loans) / gradeScale}%` }} /></div><strong className="row-rate">{outcome(metrics)}%</strong><span className="row-count">{integer(metrics.loans)} loans</span></div>)}</div>
              <p className="panel-note">Bars share a scale within the selected year. Grade is assigned at origination; differences are descriptive.</p>
            </section>
            <div className="risk-bottom"><section className="panel"><p className="panel-label">Debt-to-income</p><h3>Higher DTI, higher observed share</h3><div className="dti-list">{bands.map(([label, metrics]) => <div className="dti-row" key={label}><div><strong>{label}</strong><small>{integer(metrics.loans)} loans</small></div><div className="rate-track"><span style={{ width: `${100 * (metrics.chargedOff / metrics.loans) / dtiScale}%` }} /></div><strong>{outcome(metrics)}%</strong></div>)}</div><p className="panel-note">Unadjusted comparison; other borrower characteristics may explain part of the gap.</p></section>
              <section className="panel"><p className="panel-label">Original funded principal</p><h3>Loans later charged off</h3><p className="large-figure risk-text">{compactMoney(overall.chargedOffFundedCents)}</p><p className="panel-note">Original amount funded on charged-off loans. Not outstanding exposure or realized loss.</p></section></div>
            <section className="panel"><div className="panel-title"><div><p className="panel-label">Borrowing purpose</p><h3>Top purposes by amount funded</h3></div><span>Top eight</span></div><div className="table-scroll"><table><thead><tr><th>Purpose</th><th>Loans</th><th>Funded</th><th>Charged-off share</th></tr></thead><tbody>{purposes.map(([purpose, metrics]) => <tr key={purpose}><td>{purpose.replaceAll("_", " ")}</td><td>{integer(metrics.loans)}</td><td>{compactMoney(metrics.fundedCents)}</td><td>{outcome(metrics)}%</td></tr>)}</tbody></table></div></section>
          </>}

          {tab === "trends" && <>
            <div className="section-heading"><div><p className="section-index">Origination trends</p><h2>Growth has a denominator.</h2></div><span className="section-context">{year === "all" ? "Annual view" : `Monthly view, ${year}`}</span></div>
            <section className="panel"><div className="panel-title"><div><p className="panel-label">Original funded principal</p><h3>{year === "all" ? "Funded by issue year" : "Funded by issue month"}</h3></div><span>{year === "all" ? "Select a year for months" : "Select a bar for detail"}</span></div>
              <div className="trend-scroll"><div className="trend-chart" role="group" aria-label="Funded amount by issue period">{trend.map((item) => <button key={item.key} type="button" className={`trend-item ${activeTrend.key === item.key ? "selected" : ""}`} onClick={() => setSelectedTrend(item.key)} aria-label={`${item.key}: ${money(item.metrics.fundedCents)} funded across ${integer(item.metrics.loans)} loans`} aria-pressed={activeTrend.key === item.key}><span className="trend-bar" style={{ height: `${Math.max(2, 100 * item.metrics.fundedCents / maxTrend)}%` }} /><span className="trend-label">{item.label}</span></button>)}</div></div>
              <div className="trend-detail"><div><p className="metric-label">Selected issue period</p><strong>{activeTrend.key}</strong></div><div><p className="metric-label">Funded</p><strong>{money(activeTrend.metrics.fundedCents)}</strong></div><div><p className="metric-label">Loans</p><strong>{integer(activeTrend.metrics.loans)}</strong></div>{year !== "all" && <div><p className="metric-label">MoM funded change</p><strong>{growth(activeTrend.key, activeTrend.metrics.fundedCents)}</strong></div>}</div>
            </section>
            <section className="panel"><div className="panel-title"><div><p className="panel-label">Audit table</p><h3>Exact period values</h3></div><span>{trend.length} periods</span></div><div className="table-scroll"><table><thead><tr><th>Issue {year === "all" ? "year" : "month"}</th><th>Loans</th><th>Funded</th><th>Charged-off share</th>{year !== "all" && <th>MoM funded</th>}</tr></thead><tbody>{trend.map((item) => <tr key={item.key}><td>{item.key}</td><td>{integer(item.metrics.loans)}</td><td>{money(item.metrics.fundedCents)}</td><td>{outcome(item.metrics)}%</td>{year !== "all" && <td>{growth(item.key, item.metrics.fundedCents)}</td>}</tr>)}</tbody></table></div></section>
            <p className="reading-note">An issue-month outcome share groups loans by when they were issued. The dataset does not contain each loan&apos;s charge-off date.</p>
          </>}

          {tab === "method" && <>
            <div className="section-heading"><div><p className="section-index">Method and source</p><h2>How to read this ledger.</h2></div></div>
            <div className="method-grid"><section className="panel"><p className="panel-label">01 / Source</p><h3>Historical LendingClub archive</h3><p>The analysis starts from the public LoanStats3a archive covering originations from June 2007 to December 2011. Only the standard Fully Paid and Charged Off statuses are included.</p><p><a href="https://resources.lendingclub.com/LoanStats3a.csv.zip" target="_blank" rel="noreferrer">Source archive</a></p></section><section className="panel"><p className="panel-label">02 / Definition</p><h3>Observed outcome, not forecast</h3><p>Charge-off share equals charged-off loan count divided by resolved loan count. Funded amount is original funded principal. The dataset does not provide an exact charge-off event date in this report.</p></section><section className="panel"><p className="panel-label">03 / Verification</p><h3>Three checks, same totals</h3><p>The prepared CSV is checked independently, then reconciled against MySQL baseline queries and the report measures. This companion site contains only grouped statistics, not loan-level rows.</p></section><section className="panel"><p className="panel-label">04 / Limitation</p><h3>Historical and selected</h3><p>Other credit-policy statuses are excluded. Grade and DTI comparisons are unadjusted associations; they do not establish causation, current underwriting performance, or pricing adequacy.</p></section></div>
          </>}
        </div>
      </div>
      <footer className="site-footer"><span>Loan Ledger / historical credit outcomes</span><span>Fixed archive snapshot. No automatic refresh on this companion site.</span></footer>
    </main>
  );
}
