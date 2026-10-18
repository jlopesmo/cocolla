import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPatternCommands,
  deserializePatternDocument,
  serializePatternDocument,
  validatePatternDocument,
  type PatternCommand,
} from "../src/index.js";
import { black, fullCross, makeDocument, red } from "./fixtures.js";

const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
};

const integer = (random: () => number, maximumExclusive: number): number =>
  Math.floor(random() * maximumExclusive);

test("property: generated documents serialize deterministically and round trip", () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const random = createRandom(seed);
    const width = 4 + integer(random, 28);
    const height = 4 + integer(random, 28);
    const count = 1 + integer(random, Math.min(width * height, 180));
    const cells = Array.from({ length: width * height }, (_, index) => index);
    for (let index = cells.length - 1; index > 0; index -= 1) {
      const target = integer(random, index + 1);
      const currentValue = cells[index];
      const targetValue = cells[target];
      if (currentValue !== undefined && targetValue !== undefined) {
        cells[index] = targetValue;
        cells[target] = currentValue;
      }
    }
    const commands: PatternCommand[] = cells.slice(0, count).map((cell, index) => ({
      type: "stitch.add",
      stitch: fullCross(
        `stitch-${String(seed)}-${String(index)}`,
        cell % width,
        Math.floor(cell / width),
        random() < 0.5 ? black.id : red.id,
      ),
    }));
    const document = applyPatternCommands(makeDocument(width, height), {
      baseRevision: 0,
      commands,
    });
    const first = serializePatternDocument(document);
    const restored = deserializePatternDocument(first);
    const second = serializePatternDocument(restored);
    assert.equal(second, first, `seed ${String(seed)}`);
    assert.equal(validatePatternDocument(restored).valid, true, `seed ${String(seed)}`);
  }
});

test("property: valid move and recolor sequences preserve ids and validity", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const random = createRandom(seed * 17);
    const width = 20;
    const height = 20;
    const stitchCount = 20;
    const adds: PatternCommand[] = Array.from({ length: stitchCount }, (_, index) => ({
      type: "stitch.add",
      stitch: fullCross(`stitch-${String(seed)}-${String(index)}`, index, 0),
    }));
    const created = applyPatternCommands(makeDocument(width, height), {
      baseRevision: 0,
      commands: adds,
    });
    const edits: PatternCommand[] = created.stitches.flatMap((stitch) => [
      {
        type: "stitch.move" as const,
        stitchId: stitch.id,
        anchor: {
          x: integer(random, width) * 1024,
          y: integer(random, height) * 1024,
        },
      },
      {
        type: "stitch.recolor" as const,
        stitchId: stitch.id,
        colorId: random() < 0.5 ? black.id : red.id,
      },
    ]);
    const edited = applyPatternCommands(created, {
      baseRevision: created.revision,
      commands: edits,
    });
    assert.equal(validatePatternDocument(edited).valid, true);
    assert.deepEqual(
      edited.stitches.map((stitch) => stitch.id).sort(),
      created.stitches.map((stitch) => stitch.id).sort(),
    );
    assert.ok(edited.stitches.every((stitch) => stitch.elementRevision === 2));
  }
});
