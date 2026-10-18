import { performance } from "node:perf_hooks";

import {
  createNaiveStitchingRoute,
  deserializePatternDocument,
  frontGeometryForDocument,
  serializePatternDocument,
  validatePatternDocument,
} from "../src/index.js";
import { makeDenseDocument } from "../test/fixtures.js";

interface BenchmarkResult {
  readonly stitches: number;
  readonly serializedBytes: number;
  readonly frontPrimitives: number;
  readonly routeSteps: number;
  readonly timingsMs: Readonly<Record<string, number>>;
}

const measure = <T>(operation: () => T): { readonly value: T; readonly ms: number } => {
  const start = performance.now();
  const value = operation();
  return { value, ms: performance.now() - start };
};

const run = (count: number): BenchmarkResult => {
  const generated = measure(() => makeDenseDocument(count));
  const validated = measure(() => validatePatternDocument(generated.value));
  if (!validated.value.valid) {
    throw new Error(`Generated ${String(count)}-stitch document is invalid.`);
  }
  const serialized = measure(() => serializePatternDocument(generated.value));
  const deserialized = measure(() => deserializePatternDocument(serialized.value));
  const geometry = measure(() => frontGeometryForDocument(deserialized.value));
  const route = measure(() => createNaiveStitchingRoute(deserialized.value));

  return {
    stitches: count,
    serializedBytes: Buffer.byteLength(serialized.value, "utf8"),
    frontPrimitives: geometry.value.length,
    routeSteps: route.value.steps.length,
    timingsMs: {
      generate: generated.ms,
      validate: validated.ms,
      serialize: serialized.ms,
      deserialize: deserialized.ms,
      frontGeometry: geometry.ms,
      naiveRoute: route.ms,
    },
  };
};

const results = [10_000, 100_000].map(run);
console.log(JSON.stringify({
  runtime: process.version,
  platform: `${process.platform}-${process.arch}`,
  note: "Single-process development-machine benchmark; route is deterministic row-major and not physically optimized.",
  results,
}, null, 2));
