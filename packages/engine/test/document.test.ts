import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  InvalidDocumentError,
  UnsupportedDocumentVersionError,
  UnsupportedTechniqueError,
  applyPatternCommand,
  applyPatternCommands,
  createPatternDocument,
  createNaiveStitchingRoute,
  deserializePatternDocument,
  estimateBackOfFabric,
  frontGeometryForStitch,
  serializePatternDocument,
  validatePatternDocument,
  type LegacyPatternDocumentV0,
  type PatternDocument,
} from "../src/index.js";
import { black, fullCross, makeDocument, red } from "./fixtures.js";

test("creates a valid empty version 1 document", () => {
  const document = makeDocument();
  const validation = validatePatternDocument(document);
  assert.equal(validation.valid, true);
  assert.equal(document.version, 1);
  assert.equal(document.coordinateSystem.kind, "integer-design-units");
  assert.equal(document.stitches.length, 0);
});

test("published version 1 JSON Schema is valid JSON for the current format", () => {
  const schema = JSON.parse(
    readFileSync("packages/contracts/schema/pattern-document-v1.schema.json", "utf8"),
  ) as { readonly properties?: { readonly format?: { readonly const?: unknown }; readonly version?: { readonly const?: unknown } } };
  assert.equal(schema.properties?.format?.const, "cocolla.pattern");
  assert.equal(schema.properties?.version?.const, 1);
});

test("add, move, recolor, and remove are immutable revisioned commands", () => {
  const original = makeDocument();
  const added = applyPatternCommand(original, {
    type: "stitch.add",
    stitch: fullCross("stitch-stable-1", 1, 2),
  });
  assert.equal(original.stitches.length, 0);
  assert.equal(added.revision, 1);
  assert.equal(added.stitches[0]?.id, "stitch-stable-1");

  const moved = applyPatternCommand(added, {
    type: "stitch.move",
    stitchId: "stitch-stable-1",
    anchor: { x: 3 * 1024, y: 4 * 1024 },
  });
  assert.deepEqual(moved.stitches[0]?.geometry.anchor, { x: 3072, y: 4096 });
  assert.equal(moved.stitches[0]?.elementRevision, 1);
  assert.deepEqual(added.stitches[0]?.geometry.anchor, { x: 1024, y: 2048 });

  const recolored = applyPatternCommand(moved, {
    type: "stitch.recolor",
    stitchId: "stitch-stable-1",
    colorId: red.id,
  });
  assert.equal(recolored.stitches[0]?.colorId, red.id);
  assert.equal(recolored.stitches[0]?.elementRevision, 2);

  const removed = applyPatternCommand(recolored, {
    type: "stitch.remove",
    stitchId: "stitch-stable-1",
  });
  assert.equal(removed.stitches.length, 0);
  assert.equal(removed.revision, 4);
});

test("command batches increment document revision once", () => {
  const document = makeDocument();
  const updated = applyPatternCommands(document, {
    baseRevision: 0,
    commands: [
      { type: "stitch.add", stitch: fullCross("stitch-a", 0, 0) },
      { type: "stitch.add", stitch: fullCross("stitch-b", 1, 0) },
      { type: "stitch.recolor", stitchId: "stitch-b", colorId: red.id },
    ],
  });
  assert.equal(updated.revision, 1);
  assert.equal(updated.stitches.length, 2);
  assert.equal(updated.stitches[1]?.colorId, red.id);
});

test("document rotation transforms full-cross geometry and swaps rectangular bounds", () => {
  const base = makeDocument(4, 3);
  const document = applyPatternCommands(base, {
    baseRevision: 0,
    commands: [
      { type: "stitch.add", stitch: fullCross("top-left", 0, 0) },
      { type: "stitch.add", stitch: fullCross("bottom-right", 3, 2, red.id) },
      { type: "stitch.add", stitch: fullCross("middle", 1, 2) },
    ],
  });
  const rotated = applyPatternCommand(document, {
    type: "document.rotate",
    rotation: "clockwise-90",
  });

  assert.deepEqual(rotated.bounds, { width: 3 * 1024, height: 4 * 1024 });
  assert.deepEqual(
    rotated.stitches.map((stitch) => stitch.geometry.anchor),
    [
      { x: 2 * 1024, y: 0 },
      { x: 0, y: 3 * 1024 },
      { x: 0, y: 1024 },
    ],
  );
  assert.deepEqual(
    rotated.stitches.map(({ id, layerId, colorId }) => ({ id, layerId, colorId })),
    document.stitches.map(({ id, layerId, colorId }) => ({ id, layerId, colorId })),
  );
  assert.equal(rotated.metadata, document.metadata);
  assert.equal(rotated.layers, document.layers);
  assert.equal(rotated.colors, document.colors);
  assert.equal(rotated.extensions, document.extensions);
  assert.equal(rotated.revision, document.revision + 1);
  assert.ok(rotated.stitches.every((stitch) => stitch.elementRevision === 1));
  assert.equal(validatePatternDocument(rotated).valid, true);
});

test("counterclockwise and 180-degree rotations use deterministic coordinates", () => {
  const document = applyPatternCommand(makeDocument(4, 3), {
    type: "stitch.add",
    stitch: fullCross("corner", 0, 0),
  });
  const counterclockwise = applyPatternCommand(document, {
    type: "document.rotate",
    rotation: "counterclockwise-90",
  });
  assert.deepEqual(counterclockwise.stitches[0]?.geometry.anchor, {
    x: 0,
    y: 3 * 1024,
  });
  assert.deepEqual(counterclockwise.bounds, { width: 3 * 1024, height: 4 * 1024 });

  const halfTurn = applyPatternCommand(document, {
    type: "document.rotate",
    rotation: "180",
  });
  assert.deepEqual(halfTurn.stitches[0]?.geometry.anchor, {
    x: 3 * 1024,
    y: 2 * 1024,
  });
  assert.deepEqual(halfTurn.bounds, document.bounds);
});

test("four clockwise quarter turns restore geometry and remain serializable", () => {
  const original = applyPatternCommands(makeDocument(7, 4), {
    baseRevision: 0,
    commands: [
      { type: "stitch.add", stitch: fullCross("one", 1, 2) },
      { type: "stitch.add", stitch: fullCross("two", 6, 0, red.id) },
    ],
  });
  let rotated = original;
  for (let turn = 0; turn < 4; turn += 1) {
    rotated = applyPatternCommand(rotated, {
      type: "document.rotate",
      rotation: "clockwise-90",
    });
  }
  assert.deepEqual(rotated.bounds, original.bounds);
  assert.deepEqual(
    rotated.stitches.map((stitch) => stitch.geometry),
    original.stitches.map((stitch) => stitch.geometry),
  );
  assert.deepEqual(
    deserializePatternDocument(serializePatternDocument(rotated)),
    rotated,
  );
});

test("rotation rejects unsupported technique payloads atomically", () => {
  const unsupported: PatternDocument = {
    ...makeDocument(4, 3),
    stitches: [
      {
        ...fullCross("future", 1, 1),
        technique: { key: "future-freeform", version: 7 },
        geometry: {
          anchor: { x: 1024, y: 1024 },
          data: { orientation: "north", points: [1, 2, 3] },
        },
      },
    ],
  };
  const before = serializePatternDocument(unsupported);
  assert.throws(
    () =>
      applyPatternCommand(unsupported, {
        type: "document.rotate",
        rotation: "clockwise-90",
      }),
    UnsupportedTechniqueError,
  );
  assert.equal(serializePatternDocument(unsupported), before);
});

test("document transformations cannot be mixed into a stitch command batch", () => {
  const document = makeDocument();
  assert.throws(
    () =>
      applyPatternCommands(document, {
        baseRevision: document.revision,
        commands: [
          { type: "document.rotate", rotation: "180" },
          { type: "stitch.add", stitch: fullCross("mixed", 0, 0) },
        ],
      }),
    { code: "DOCUMENT_COMMAND_MUST_BE_EXCLUSIVE" },
  );
  assert.throws(
    () =>
      applyPatternCommand(document, {
        type: "document.rotate",
        rotation: "invalid" as never,
      }),
    { code: "INVALID_ROTATION" },
  );
});

test("invalid commands fail explicitly", () => {
  const document = makeDocument();
  assert.throws(
    () =>
      applyPatternCommands(document, {
        baseRevision: 2,
        commands: [{ type: "stitch.add", stitch: fullCross("stitch-a", 0, 0) }],
      }),
    { code: "REVISION_CONFLICT" },
  );
  assert.throws(
    () =>
      applyPatternCommand(document, {
        type: "stitch.add",
        stitch: fullCross("stitch-outside", 100, 100),
      }),
    InvalidDocumentError,
  );
});

test("validation rejects duplicate ids, invalid references, and unsafe geometry", () => {
  const duplicate = {
    ...makeDocument(),
    stitches: [fullCross("duplicate", 0, 0), fullCross("duplicate", 1, 0)],
  };
  const duplicateResult = validatePatternDocument(duplicate);
  assert.equal(duplicateResult.valid, false);
  assert.ok(duplicateResult.issues.some((issue) => issue.code === "DUPLICATE_ID"));

  const invalidReferences = {
    ...makeDocument(),
    stitches: [
      {
        ...fullCross("bad-references", 0, 0),
        layerId: "missing-layer",
        colorId: "missing-color",
      },
    ],
  };
  const referenceResult = validatePatternDocument(invalidReferences);
  assert.equal(referenceResult.valid, false);
  assert.ok(referenceResult.issues.some((issue) => issue.code === "UNKNOWN_LAYER"));
  assert.ok(referenceResult.issues.some((issue) => issue.code === "UNKNOWN_COLOR"));

  const unsafe = fullCross("unsafe-coordinate", 0, 0);
  const unsafeDocument = {
    ...makeDocument(),
    stitches: [
      {
        ...unsafe,
        geometry: {
          ...unsafe.geometry,
          anchor: { x: Number.MAX_SAFE_INTEGER, y: 0 },
        },
      },
    ],
  };
  const unsafeResult = validatePatternDocument(unsafeDocument);
  assert.equal(unsafeResult.valid, false);
  assert.ok(
    unsafeResult.issues.some((issue) => issue.code === "FULL_CROSS_UNSAFE_EXTENT"),
  );
});

test("a failing batch is atomic and does not mutate its source", () => {
  const document = makeDocument();
  const before = serializePatternDocument(document);
  assert.throws(
    () =>
      applyPatternCommands(document, {
        baseRevision: 0,
        commands: [
          { type: "stitch.add", stitch: fullCross("temporary", 0, 0) },
          {
            type: "stitch.recolor",
            stitchId: "temporary",
            colorId: "missing-color",
          },
        ],
      }),
    { code: "COLOR_NOT_FOUND" },
  );
  assert.equal(serializePatternDocument(document), before);
  assert.equal(document.revision, 0);
  assert.equal(document.stitches.length, 0);
});

test("commands and document creation defensively copy caller-owned data", () => {
  const extensions = { nested: { enabled: true } };
  const layer = { id: "layer-copy", name: "Copy", order: 0 };
  const color = {
    id: "color-copy",
    name: "Copy",
    rgb: "#123456",
    symbol: "C",
    threadProductId: null,
  };
  const created = createPatternDocument({
    id: "copy-test",
    name: "Copy test",
    width: 2048,
    height: 2048,
    layers: [layer],
    colors: [color],
    extensions,
  });
  layer.name = "Changed";
  color.name = "Changed";
  extensions.nested.enabled = false;
  assert.equal(created.layers[0]?.name, "Copy");
  assert.equal(created.colors[0]?.name, "Copy");
  assert.deepEqual(created.extensions, { nested: { enabled: true } });

  const stitch = fullCross("caller-owned", 0, 0);
  const updated = applyPatternCommand(makeDocument(), {
    type: "stitch.add",
    stitch,
  });
  (stitch.geometry.anchor as { x: number }).x = 1024;
  assert.deepEqual(updated.stitches[0]?.geometry.anchor, { x: 0, y: 0 });
});

test("commands reject an invalid source document before editing", () => {
  const invalid = {
    ...makeDocument(),
    stitches: [fullCross("duplicate-source", 0, 0), fullCross("duplicate-source", 1, 0)],
  };
  assert.throws(
    () =>
      applyPatternCommand(invalid, {
        type: "stitch.remove",
        stitchId: "duplicate-source",
      }),
    InvalidDocumentError,
  );
});

test("full cross produces two front primitives in document units", () => {
  const document = applyPatternCommand(makeDocument(), {
    type: "stitch.add",
    stitch: fullCross("stitch-geometry", 2, 3),
  });
  const geometry = frontGeometryForStitch(document, "stitch-geometry");
  assert.equal(geometry.length, 2);
  assert.deepEqual(geometry[0], {
    kind: "line",
    role: "front-thread",
    stitchId: "stitch-geometry",
    colorId: black.id,
    start: { x: 2048, y: 3072 },
    end: { x: 3072, y: 4096 },
  });
});

test("serialization is canonical and round trips exactly", () => {
  const base = makeDocument();
  const document = applyPatternCommands(base, {
    baseRevision: 0,
    commands: [
      { type: "stitch.add", stitch: fullCross("stitch-z", 1, 1) },
      { type: "stitch.add", stitch: fullCross("stitch-a", 0, 0, red.id) },
    ],
  });
  const serialized = serializePatternDocument(document);
  const restored = deserializePatternDocument(serialized);
  assert.deepEqual(restored, {
    ...document,
    colors: [black, red],
    stitches: [document.stitches[1], document.stitches[0]],
  });
  assert.equal(serializePatternDocument(restored), serialized);
});

test("version 0 migrates into integer design units", () => {
  const legacy: LegacyPatternDocumentV0 = {
    format: "cocolla.pattern",
    version: 0,
    id: "legacy-pattern",
    revision: 4,
    name: "Legacy",
    widthCells: 10,
    heightCells: 8,
    layers: [{ id: "layer-main", name: "Main", order: 0 }],
    colors: [black],
    stitches: [
      {
        id: "legacy-stitch",
        technique: "full-cross",
        layerId: "layer-main",
        colorId: black.id,
        xCell: 2,
        yCell: 3,
      },
    ],
  };
  const migrated = deserializePatternDocument(JSON.stringify(legacy));
  assert.equal(migrated.version, 1);
  assert.deepEqual(migrated.stitches[0]?.geometry.anchor, { x: 2048, y: 3072 });
  assert.equal(
    serializePatternDocument(deserializePatternDocument(JSON.stringify(legacy))),
    serializePatternDocument(migrated),
  );
});

test("malformed legacy documents fail with an explicit validation error", () => {
  const malformed = {
    format: "cocolla.pattern",
    version: 0,
    id: "legacy-bad",
    revision: 0,
    name: "Bad legacy",
    widthCells: 2,
    heightCells: 2,
    layers: [{ id: "layer-main", name: "Main", order: 0 }],
    colors: [black],
    stitches: [
      {
        id: "bad-stitch",
        technique: "full-cross",
        layerId: "layer-main",
        colorId: black.id,
        xCell: "not-an-integer",
        yCell: 0,
      },
    ],
  };
  assert.throws(
    () => deserializePatternDocument(JSON.stringify(malformed)),
    InvalidDocumentError,
  );
});

test("future document versions fail explicitly", () => {
  const future = { ...makeDocument(), version: 99 };
  assert.throws(
    () => deserializePatternDocument(JSON.stringify(future)),
    UnsupportedDocumentVersionError,
  );
});

test("unknown current-version fields fail rather than being dropped", () => {
  const document = { ...makeDocument(), accidentalField: true };
  assert.throws(
    () => deserializePatternDocument(JSON.stringify(document)),
    InvalidDocumentError,
  );
});

test("unknown technique data is preserved but cannot be interpreted", () => {
  const base = makeDocument();
  const unknown: PatternDocument = {
    ...base,
    stitches: [
      {
        id: "freeform-future",
        technique: { key: "future-freeform", version: 7 },
        layerId: "layer-main",
        colorId: black.id,
        geometry: {
          anchor: { x: 123, y: 456 },
          data: { points: [{ x: 123, y: 456 }, { x: 789, y: 654 }] },
        },
        elementRevision: 0,
      },
    ],
  };
  const validation = validatePatternDocument(unknown);
  assert.equal(validation.valid, true);
  assert.equal(validation.issues[0]?.code, "UNSUPPORTED_TECHNIQUE");
  const restored = deserializePatternDocument(serializePatternDocument(unknown));
  assert.deepEqual(restored.stitches[0]?.geometry.data, unknown.stitches[0]?.geometry.data);
  assert.throws(
    () => frontGeometryForStitch(restored, "freeform-future"),
    UnsupportedTechniqueError,
  );
});

test("unsupported versions of known techniques round trip without corruption", () => {
  const futureTechnique: PatternDocument = {
    ...makeDocument(),
    stitches: [
      {
        ...fullCross("future-full-cross", 0, 0),
        technique: { key: "full-cross", version: 2 },
        geometry: {
          anchor: { x: 17, y: 29 },
          data: { futureOption: { enabled: true }, points: [17, 29] },
        },
      },
    ],
  };
  const validation = validatePatternDocument(futureTechnique);
  assert.equal(validation.valid, true);
  assert.ok(validation.issues.some((issue) => issue.code === "UNSUPPORTED_TECHNIQUE"));
  const serialized = serializePatternDocument(futureTechnique);
  const restored = deserializePatternDocument(serialized);
  assert.deepEqual(restored.stitches[0], futureTechnique.stitches[0]);
  assert.equal(serializePatternDocument(restored), serialized);
  assert.throws(
    () => frontGeometryForStitch(restored, "future-full-cross"),
    UnsupportedTechniqueError,
  );
});

test("JSON payload validation accepts shared acyclic values and rejects lossy values", () => {
  const shared = { x: 1, y: 2 };
  const sharedPayload: PatternDocument = {
    ...makeDocument(),
    stitches: [
      {
        ...fullCross("shared-payload", 0, 0),
        technique: { key: "future-freeform", version: 1 },
        geometry: {
          anchor: { x: 0, y: 0 },
          data: { first: shared, second: shared },
        },
      },
    ],
  };
  assert.equal(validatePatternDocument(sharedPayload).valid, true);

  const sparse: unknown[] = [];
  sparse.length = 1;
  const lossyPayload = {
    ...sharedPayload,
    stitches: [
      {
        ...sharedPayload.stitches[0],
        geometry: {
          anchor: { x: 0, y: 0 },
          data: { sparse } as never,
        },
      },
    ],
  };
  assert.equal(validatePatternDocument(lossyPayload).valid, false);

  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  const cyclicPayload = {
    ...sharedPayload,
    stitches: [
      {
        ...sharedPayload.stitches[0],
        geometry: {
          anchor: { x: 0, y: 0 },
          data: cyclic as never,
        },
      },
    ],
  };
  assert.equal(validatePatternDocument(cyclicPayload).valid, false);
});

test("route and back estimate stay separate and revision-bound", () => {
  const document = applyPatternCommands(makeDocument(), {
    baseRevision: 0,
    commands: [
      { type: "stitch.add", stitch: fullCross("stitch-a", 0, 0) },
      { type: "stitch.add", stitch: fullCross("stitch-b", 2, 0) },
    ],
  });
  const route = createNaiveStitchingRoute(document);
  const estimate = estimateBackOfFabric(document, route);
  assert.equal(route.steps.length, 2);
  assert.ok(estimate.segments.some((segment) => segment.kind === "carry"));
  assert.match(estimate.disclaimer, /Heuristic estimate only/u);
  assert.equal("route" in document, false);

  const changed = applyPatternCommand(document, {
    type: "stitch.recolor",
    stitchId: "stitch-a",
    colorId: red.id,
  });
  assert.throws(() => estimateBackOfFabric(changed, route), { code: "STALE_ROUTE" });
});
