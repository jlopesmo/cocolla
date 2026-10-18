import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  applyPatternCommands,
  deserializePatternDocument,
  frontGeometryForDocument,
  serializePatternDocument,
  validatePatternDocument,
  type PatternCommand,
} from "../src/index.js";
import { fullCross, makeDenseDocument, makeDocument } from "./fixtures.js";

test("10,000-stitch core operations stay below broad regression ceilings", () => {
  const document = makeDenseDocument(10_000);
  const started = performance.now();
  assert.equal(validatePatternDocument(document).valid, true);
  const serialized = serializePatternDocument(document);
  const restored = deserializePatternDocument(serialized);
  const geometry = frontGeometryForDocument(restored);
  const elapsedMs = performance.now() - started;

  assert.equal(restored.stitches.length, 10_000);
  assert.equal(geometry.length, 20_000);
  assert.ok(serialized.length > 1_000_000);
  assert.ok(
    elapsedMs < 15_000,
    `10,000-stitch regression ceiling exceeded: ${elapsedMs.toFixed(1)} ms`,
  );
});

test("a 10,000-stitch add batch avoids quadratic command processing", () => {
  const commands: PatternCommand[] = Array.from(
    { length: 10_000 },
    (_, index) => ({
      type: "stitch.add",
      stitch: fullCross(
        `batch-${String(index).padStart(10, "0")}`,
        index % 100,
        Math.floor(index / 100),
      ),
    }),
  );
  const started = performance.now();
  const document = applyPatternCommands(makeDocument(100, 100), {
    baseRevision: 0,
    commands,
  });
  const elapsedMs = performance.now() - started;

  assert.equal(document.stitches.length, 10_000);
  assert.equal(document.revision, 1);
  assert.ok(
    elapsedMs < 10_000,
    `10,000-stitch batch regression ceiling exceeded: ${elapsedMs.toFixed(1)} ms`,
  );
});
