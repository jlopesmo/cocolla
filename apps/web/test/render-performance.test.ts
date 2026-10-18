import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import type { PatternDocument, StitchElementV1 } from "../../../packages/engine/src/index.js";
import { createBlankPattern } from "../src/core/pattern.js";
import { createRenderPlan } from "../src/core/render-plan.js";

test("100,000-stitch render planning culls to the visible viewport", () => {
  const base = createBlankPattern("Dense", { width: 500, height: 200 });
  const stitches: StitchElementV1[] = Array.from({ length: 100_000 }, (_, index) => ({
    id: `dense-${String(index).padStart(6, "0")}`,
    technique: { key: "full-cross", version: 1 },
    layerId: "layer-main",
    colorId: base.colors[index % base.colors.length]?.id ?? "color-charcoal",
    geometry: {
      anchor: {
        x: (index % 500) * 1024,
        y: Math.floor(index / 500) * 1024,
      },
      data: {},
    },
    elementRevision: 0,
  }));
  const document: PatternDocument = { ...base, stitches };
  const started = performance.now();
  const plan = createRenderPlan(
    document,
    { offsetX: 0, offsetY: 0, zoom: 1 },
    { width: 900, height: 650 },
  );
  const elapsedMs = performance.now() - started;

  assert.ok(plan.visible.length > 0);
  assert.ok(plan.visible.length < 2_000);
  assert.equal(plan.skippedUnsupported, 0);
  assert.ok(
    elapsedMs < 3_000,
    `100,000-stitch render planning exceeded 3,000 ms: ${elapsedMs.toFixed(1)} ms`,
  );
});
