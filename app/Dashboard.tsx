"use client";

import { useState } from "react";
import {
  chargedOffRate,
  compactMoney,
  getGradeComparison,
  getHighGradeConcentration,
  getTrend,
  integer,
  money,
  monthGrowth,
  percent,
  type DashboardData,
  type Metrics,
  type Period,
} from "./analytics";

export type { DashboardData } from "./analytics";

type Tab = "overview" | "risk" | "trends" | "method";
type TrendItem = { key: string; label: string; metrics: Metrics };

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk segments" },
  { id: "trends", label: "Cohort trends" },
  { id: "method", label: "Method" },
];

function SectionHeading({ label, title, context }: { label: string; title: string; context?: string }) {
  return <div className="section-heading">
    <div><p className="section-index">{label}</p><h2>{title}</h2></div>
    {context && <span className="section-context">{context}</span>}
  </div>;
}

function GradeBars({ period, compact = false }: { period: Period; compact?: boolean }) {
  const { grades } = getGradeComparison(period);
  const scale = Math.max(...grades.map(([, metrics]) => chargedOffRate(metrics)), chargedOffRate(period.summary), 0.01);
  const baseline = 100 * chargedOffRate(period.summary) / scale;
  return <>
    <div className={`rate-list ${compact ? "compact" : ""}`} role="img" aria-label="Observed charge-off share by assigned grade">
      {grades.map(([grade, metrics]) => <div className="rate-row" key={grade}>
        <strong className="row-key">{grade}</strong>
        <div className="rate-track">
          <span className="baseline-mark" style={{ left: `${baseline}%` }} />
          <span className="rate-fill" style={{ width: `${100 * chargedOffRate(metrics) / scale}%` }} />
        </div>
        <strong className="row-rate">{percent(metrics.chargedOff, metrics.loans)}</strong>
        <span className="row-count">{integer(metrics.loans)} loans</span>
      </div>)}
    </div>
    <p className="panel-note">Vertical marker: selected portfolio average, {percent(period.summary.chargedOff, period.summary.loans)}. Bars share one scale; rates use each grade&apos;s loan count.</p>
  </>;
}

function TrendBars({ items, selected, onSelect }: { items: TrendItem[]; selected: string; onSelect: (key: string) => void }) {
  const max = Math.max(...items.map((item) => item.metrics.fundedCents), 1);
  return <div className="trend-scroll"><div className="trend-chart" role="group" aria-label="Original funded principal by issue period">
    {items.map((item) => <button
      key={item.key}
      type="button"
      className={`trend-item ${selected === item.key ? "selected" : ""}`}
      onClick={() => onSelect(item.key)}
      aria-label={`${item.key}: ${money(item.metrics.fundedCents)} funded across ${integer(item.metrics.loans)} loans`}
      aria-pressed={selected === item.key}
    >
      <span className="trend-value">{items.length <= 6 ? compactMoney(item.metrics.fundedCents) : ""}</span>
      <span className="trend-bar" style={{ height: `${Math.max(3, 100 * item.metrics.fundedCents / max)}%` }} />
      <span className="trend-label">{item.label}</span>
    </button>)}
  </div></div>;
}

function OutcomeBars({ items }: { items: TrendItem[] }) {
  const max = Math.max(...items.map((item) => chargedOffRate(item.metrics)), 0.01);
  return <div className="outcome-list" role="img" aria-label="Observed charge-off share by issue cohort">
    {items.map((item) => <div className="outcome-row" key={item.key}>
      <span>{item.label}</span>
      <div className="rate-track"><span className="rate-fill" style={{ width: `${100 * chargedOffRate(item.metrics) / max}%` }} /></div>
      <strong>{percent(item.metrics.chargedOff, item.metrics.loans)}</strong>
      <small>{integer(item.metrics.loans)} loans</small>
    </div>)}
  </div>;
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const [year, setYear] = useState("all");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedTrend, setSelectedTrend] = useState("");
  const years = Object.keys(data.periods).filter((key) => key !== "all").sort();
  const period = data.periods[year];
  const overall = period.summary;
  const context = year === "all" ? "Full historical sample" : `Issued in ${year}`;
  const gradeComparison = getGradeComparison(period);
  const gradeSampleIsLargeEnough = Boolean(gradeComparison.lowest && gradeComparison.highest
    && gradeComparison.lowest[1].loans >= 100 && gradeComparison.highest[1].loans >= 100);
  const highGrades = getHighGradeConcentration(period);
  const lowDti = period.dtiBands["<10%"];
  const highDti = period.dtiBands[">=20%"];
  const dtiSampleIsLargeEnough = Boolean(lowDti && highDti && lowDti.loans >= 100 && highDti.loans >= 100);
  const dtiBands = ["<10%", "10–<20%", ">=20%"]
    .map((label) => [label, period.dtiBands[label]] as const)
    .filter((item): item is readonly [string, Metrics] => Boolean(item[1]));
  const purposes = Object.entries(period.purposes)
    .sort(([, a], [, b]) => b.fundedCents - a.fundedCents)
    .slice(0, 8);
  const topPurpose = purposes[0];
  const trend = getTrend(data, year);
  const activeTrend = trend.find((item) => item.key === selectedTrend) ?? trend[trend.length - 1];
  const currentGrowth = year === "all" ? null : monthGrowth(data, activeTrend.key);
  const maxPurpose = Math.max(...purposes.map(([, metrics]) => metrics.fundedCents), 1);

  return <main className="site-shell">
    <header className="masthead">
      <div className="brand"><span className="brand-mark" aria-hidden="true">L</span><span>Loan Ledger</span></div>
      <div className="masthead-meta"><span className="status-dot" /> Historical archive <span className="meta-separator" /> 2007-2011</div>
    </header>

    <div className="intro">
      <div>
        <p className="intro-kicker">Credit portfolio analysis</p>
        <h1>Where did loan risk concentrate?</h1>
        <p className="intro-copy">A verified look at funding and eventual outcomes for {integer(data.periods.all.summary.loans)} resolved LendingClub loans. Descriptive evidence, not a forecast.</p>
      </div>
      <div className="scope-select">
        <label htmlFor="year">Issue year</label>
        <select id="year" value={year} onChange={(event) => { setYear(event.target.value); setSelectedTrend(""); }}>
          <option value="all">All years, 2007-2011</option>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <p>Applies to every analysis view</p>
      </div>
    </div>

    <nav className="view-nav" aria-label="Report views">
      {tabs.map(({ id, label }) => <button
        key={id}
        type="button"
        className={`nav-item ${tab === id ? "active" : ""}`}
        aria-pressed={tab === id}
        onClick={() => setTab(id)}
      >{label}</button>)}
      <span className="nav-scope">{context}</span>
    </nav>

    <div className="report-content">
      {tab === "overview" && <>
        <SectionHeading label="Portfolio overview" title="The portfolio at a glance" context={context} />
        <section className="kpi-strip" aria-label="Portfolio key metrics">
          <div className="kpi primary"><span>Observed charge-off share</span><strong>{percent(overall.chargedOff, overall.loans)}</strong><small>{integer(overall.chargedOff)} of {integer(overall.loans)} resolved loans</small></div>
          <div className="kpi"><span>Original funded principal</span><strong>{compactMoney(overall.fundedCents)}</strong><small>{money(overall.fundedCents)} exact</small></div>
          <div className="kpi"><span>Average contracted rate</span><strong>{(overall.interestBasisPointSum / overall.loans / 100).toFixed(2)}%</strong><small>Loan-weighted average</small></div>
          <div className="kpi"><span>Average borrower DTI</span><strong>{(overall.dtiBasisPointSum / overall.loans / 100).toFixed(2)}%</strong><small>At origination</small></div>
        </section>

        <section className="insight-band" aria-labelledby="insights-title">
          <div className="insight-intro"><p className="section-index">Analyst brief</p><h3 id="insights-title">Three signals to investigate</h3><p>Observed differences guide questions, not underwriting decisions on their own.</p></div>
          <div className="insight-item"><strong>{gradeSampleIsLargeEnough && gradeComparison.multiple !== null ? `${gradeComparison.multiple.toFixed(1)}x` : "Small sample"}</strong><span>Grade {gradeComparison.highest?.[0]} vs {gradeComparison.lowest?.[0]} outcome share</span><small>{gradeComparison.highest && `${integer(gradeComparison.highest[1].loans)} loans in Grade ${gradeComparison.highest[0]}`}</small></div>
          <div className="insight-item"><strong>{dtiSampleIsLargeEnough && lowDti && highDti && chargedOffRate(lowDti) > 0 ? `${(chargedOffRate(highDti) / chargedOffRate(lowDti)).toFixed(2)}x` : "Small sample"}</strong><span>High vs low DTI outcome share</span><small>{highDti && `${integer(highDti.loans)} high-DTI loans`}</small></div>
          <div className="insight-item"><strong>{topPurpose ? percent(topPurpose[1].fundedCents, overall.fundedCents) : "N/A"}</strong><span>Funded to {topPurpose?.[0].replaceAll("_", " ")}</span><small>Largest purpose by funded amount</small></div>
        </section>

        <div className="analysis-grid">
          <section className="panel"><div className="panel-title"><div><p className="panel-label">Assigned credit grade</p><h3>Outcome share by grade</h3></div><span>Portfolio marker shown</span></div><GradeBars period={period} compact /></section>
          <section className="panel"><div className="panel-title"><div><p className="panel-label">Origination volume</p><h3>{year === "all" ? "Funding by issue year" : `Funding by issue month, ${year}`}</h3></div><span>{trend.length} periods</span></div><TrendBars items={trend} selected={activeTrend.key} onSelect={setSelectedTrend} /><p className="panel-note">Selected: {activeTrend.key}, {money(activeTrend.metrics.fundedCents)} across {integer(activeTrend.metrics.loans)} loans. These are issuance periods, not charge-off dates.</p></section>
        </div>
      </>}

      {tab === "risk" && <>
        <SectionHeading label="Borrower and product segmentation" title="Where outcomes diverge" context={context} />
        <div className="risk-summary">
          <section><span>Grades E-G, share of loans</span><strong>{percent(highGrades.loans, overall.loans)}</strong><small>{integer(highGrades.loans)} loans</small></section>
          <section><span>Grades E-G, share of charge-offs</span><strong>{percent(highGrades.chargedOff, overall.chargedOff)}</strong><small>{integer(highGrades.chargedOff)} charged off</small></section>
          <section><span>Original funded on charged-off loans</span><strong>{compactMoney(overall.chargedOffFundedCents)}</strong><small>Not realized loss or current exposure</small></section>
        </div>
        <section className="panel"><div className="panel-title"><div><p className="panel-label">Assigned credit grade</p><h3>Observed charge-off share and sample size</h3></div><span>{integer(overall.loans)} loans</span></div><GradeBars period={period} /></section>
        <div className="analysis-grid risk-grid">
          <section className="panel"><div className="panel-title"><div><p className="panel-label">Debt-to-income band</p><h3>Compare borrower debt burden</h3></div></div>
            <div className="dti-list">{dtiBands.map(([label, metrics]) => <div className="dti-row" key={label}><div><strong>{label}</strong><small>{integer(metrics.loans)} loans</small></div><div className="rate-track"><span className="rate-fill" style={{ width: `${100 * chargedOffRate(metrics) / Math.max(...dtiBands.map(([, item]) => chargedOffRate(item)), 0.01)}%` }} /></div><strong>{percent(metrics.chargedOff, metrics.loans)}</strong></div>)}</div>
            <p className="panel-note">Unadjusted comparison. Grade, income, vintage, and selection may explain part of the difference.</p>
          </section>
          <section className="panel"><div className="panel-title"><div><p className="panel-label">Purpose concentration</p><h3>Where funded principal went</h3></div><span>Top eight</span></div>
            <div className="purpose-list">{purposes.map(([purpose, metrics]) => <div className="purpose-row" key={purpose}><span>{purpose.replaceAll("_", " ")}</span><div className="purpose-track"><span style={{ width: `${100 * metrics.fundedCents / maxPurpose}%` }} /></div><strong>{percent(metrics.fundedCents, overall.fundedCents)}</strong></div>)}</div>
            <p className="panel-note">Percentages use total funded principal in the selected issue period.</p>
          </section>
        </div>
        <section className="panel"><div className="panel-title"><div><p className="panel-label">Borrowing purpose</p><h3>Volume and outcomes, side by side</h3></div><span>Sorted by funded amount</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Purpose</th><th scope="col">Loans</th><th scope="col">Funded</th><th scope="col">Charged off</th><th scope="col">Outcome share</th></tr></thead><tbody>{purposes.map(([purpose, metrics]) => <tr key={purpose}><td>{purpose.replaceAll("_", " ")}</td><td>{integer(metrics.loans)}</td><td>{money(metrics.fundedCents)}</td><td>{integer(metrics.chargedOff)}</td><td>{percent(metrics.chargedOff, metrics.loans)}</td></tr>)}</tbody></table></div></section>
      </>}

      {tab === "trends" && <>
        <SectionHeading label="Origination cohorts" title="How issuance changed" context={year === "all" ? "Annual view" : `Monthly view, ${year}`} />
        <div className="trend-headnote">Choose an issue year to inspect monthly movement. The first month in the archive has no prior-month comparison.</div>
        <section className="panel"><div className="panel-title"><div><p className="panel-label">Original funded principal</p><h3>{year === "all" ? "Annual funding" : "Monthly funding"}</h3></div><span>Select a bar for detail</span></div><TrendBars items={trend} selected={activeTrend.key} onSelect={setSelectedTrend} />
          <div className="trend-detail"><div><span>Selected issue period</span><strong>{activeTrend.key}</strong></div><div><span>Funded</span><strong>{money(activeTrend.metrics.fundedCents)}</strong></div><div><span>Loans issued</span><strong>{integer(activeTrend.metrics.loans)}</strong></div>{year !== "all" && <div><span>Change vs prior month</span><strong>{currentGrowth === null ? "No prior month" : `${currentGrowth >= 0 ? "+" : ""}${currentGrowth.toFixed(2)}%`}</strong></div>}</div>
        </section>
        <section className="panel"><div className="panel-title"><div><p className="panel-label">Eventual outcome by issue cohort</p><h3>Observed charge-off share</h3></div><span>Count shown for context</span></div><OutcomeBars items={trend} /><p className="panel-note">These rates group loans by when they were issued. They do not show charge-offs occurring in that year or month. Bars scale to the highest rate in the selected view.</p></section>
        <section className="panel"><div className="panel-title"><div><p className="panel-label">Reconciliation table</p><h3>Exact period values</h3></div><span>{trend.length} periods</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Issue {year === "all" ? "year" : "month"}</th><th scope="col">Loans</th><th scope="col">Funded</th><th scope="col">Charged off</th><th scope="col">Outcome share</th>{year !== "all" && <th scope="col">MoM funded</th>}</tr></thead><tbody>{trend.map((item) => { const growth = year === "all" ? null : monthGrowth(data, item.key); return <tr key={item.key}><td>{item.key}</td><td>{integer(item.metrics.loans)}</td><td>{money(item.metrics.fundedCents)}</td><td>{integer(item.metrics.chargedOff)}</td><td>{percent(item.metrics.chargedOff, item.metrics.loans)}</td>{year !== "all" && <td>{growth === null ? "N/A" : `${growth >= 0 ? "+" : ""}${growth.toFixed(2)}%`}</td>}</tr>; })}</tbody></table></div></section>
      </>}

      {tab === "method" && <>
        <SectionHeading label="Source and definitions" title="How to read this analysis" />
        <section className="panel lineage"><p className="panel-label">Data lineage</p><div className="lineage-steps"><div><strong>01</strong><span>Historical <a href="https://resources.lendingclub.com/LoanStats3a.csv.zip" target="_blank" rel="noreferrer">LendingClub LoanStats3a archive</a></span></div><div><strong>02</strong><span>39,786 resolved loans selected and cleaned</span></div><div><strong>03</strong><span>Python and MySQL totals cross-checked</span></div><div><strong>04</strong><span>Aggregate-only JSON published on Vercel</span></div></div></section>
        <div className="method-grid"><section className="panel"><p className="panel-label">Outcome definition</p><h3>Observed, not predicted</h3><p>Charge-off share is charged-off loan count divided by resolved loan count in the selected issue cohort. Only Fully Paid and Charged Off statuses are included. It is not a future default probability.</p></section><section className="panel"><p className="panel-label">Financial amount</p><h3>Funded is not loss</h3><p>Funded amount is original principal supplied to borrowers. Funding on later charged-off loans is not outstanding balance, charge-off amount, or realized credit loss.</p></section><section className="panel"><p className="panel-label">Timing</p><h3>Issue date, not event date</h3><p>The archive gives an issue month, mapped to its first calendar day. Trend charts describe origination cohorts and their eventual outcomes, not the date of a charge-off event.</p></section><section className="panel"><p className="panel-label">Interpretation</p><h3>Association, not causation</h3><p>Grade and DTI comparisons are unadjusted. Sample size, borrower mix, vintage, and selection can affect the observed rates. These findings support investigation, not automatic underwriting or pricing changes.</p></section></div>
        <section className="source-row"><span>Fixed historical snapshot. No automatic refresh or loan-level public records.</span><a href="https://github.com/vj0246/CreditSight" target="_blank" rel="noreferrer">Review SQL and source checks</a></section>
      </>}
    </div>
    <footer className="site-footer"><span>Loan Ledger / historical credit outcomes</span><span>Source: LendingClub LoanStats3a. Built for transparent portfolio analysis.</span></footer>
  </main>;
}
