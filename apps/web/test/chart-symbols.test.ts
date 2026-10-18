import assert from "node:assert/strict";
import test from "node:test";

import {
  CURATED_CHART_SYMBOLS,
  availableCuratedChartSymbols,
  curatedChartSymbol,
} from "../src/core/chart-symbols.js";

test("curated chart symbols are unique, vector-defined, and not alphabet-only", () => {
  const values = CURATED_CHART_SYMBOLS.map((definition) => definition.value);
  assert.equal(values.length, 32);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.some((value) => !/^[A-Z]$/u.test(value)));
  for (const definition of CURATED_CHART_SYMBOLS) {
    assert.ok(definition.primitives.length > 0);
    assert.equal(curatedChartSymbol(definition.value), definition);
  }
  assert.equal(curatedChartSymbol("custom"), undefined);
});

test("curated symbol availability excludes assignments on other active colors", () => {
  const available = availableCuratedChartSymbols(["●", "◆", "▲"], "◆")
    .map((definition) => definition.value);
  assert.equal(available.includes("●"), false);
  assert.equal(available.includes("▲"), false);
  assert.equal(available.includes("◆"), true);
  assert.equal(available.includes("○"), true);
});
