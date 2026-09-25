import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the historical loan dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Loan Ledger \| Historical Credit Outcomes/);
  assert.match(html, /39,786/);
  assert.match(html, /14\.25/);
  assert.match(html, /Fixed archive snapshot/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("publishes only reconciled aggregates", async () => {
  const data = JSON.parse(await readFile(new URL("../app/loan-aggregates.json", import.meta.url), "utf8"));
  const all = data.periods.all;
  assert.equal(all.summary.loans, 39786);
  assert.equal(all.summary.chargedOff, 5670);
  assert.equal(all.summary.fundedCents, 43600372500);
  for (const period of Object.values(data.periods)) {
    for (const group of [period.grades, period.dtiBands, period.purposes, period.months]) {
      assert.equal(Object.values(group).reduce((sum, item) => sum + item.loans, 0), period.summary.loans);
      assert.equal(Object.values(group).reduce((sum, item) => sum + item.fundedCents, 0), period.summary.fundedCents);
    }
  }
  assert.doesNotMatch(JSON.stringify(data), /loan_record_key|annual_income|address_state/);
});
