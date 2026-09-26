import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getGradeComparison,
  getHighGradeConcentration,
  getTrend,
  monthGrowth,
  percent,
} from "../app/analytics.ts";

const data = JSON.parse(await readFile(new URL("../app/loan-aggregates.json", import.meta.url), "utf8"));

test("portfolio insights use observed counts and selected year", () => {
  const all = data.periods.all;
  assert.equal(percent(all.summary.chargedOff, all.summary.loans), "14.25%");
  assert.equal(percent(all.grades.G.chargedOff, all.grades.G.loans), "31.76%");
  assert.equal(percent(all.grades.A.chargedOff, all.grades.A.loans), "5.97%");
  assert.equal(getGradeComparison(all).multiple.toFixed(1), "5.3");
  assert.deepEqual(getHighGradeConcentration(all), { loans: 4230, chargedOff: 1149 });
  assert.equal(getGradeComparison(data.periods["2007"]).highest[0], "F");
});

test("trend logic never treats missing prior month as growth", () => {
  assert.equal(getTrend(data, "all").length, 5);
  assert.equal(getTrend(data, "2011").length, 12);
  assert.equal(monthGrowth(data, "2007-06"), null);
  assert.equal(monthGrowth(data, "2007-07").toFixed(2), "2189.33");
});
