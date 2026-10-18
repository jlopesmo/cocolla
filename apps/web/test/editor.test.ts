import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidDocumentError,
  validatePatternDocument,
} from "../../../packages/engine/src/index.js";
import {
  colorUsage,
  createBlankPattern,
  drawFullCrossCells,
  eraseFullCrossCells,
  exportPatternJson,
  parsePatternJson,
  renamePattern,
  selectActiveColor,
  validatePatternDimensions,
} from "../src/core/pattern.js";
import {
  commitDocument,
  createDocumentHistory,
  redoDocument,
  undoDocument,
} from "../src/core/history.js";
import { pointerAction, traceCellsBetween } from "../src/core/interaction.js";

const sequentialIds = (): (() => string) => {
  let value = 0;
  return () => `stitch-test-${String(value++)}`;
};

test("pattern dimension boundaries are explicit", () => {
  assert.equal(validatePatternDimensions(1, 1), null);
  assert.equal(validatePatternDimensions(2_000, 2_000), null);
  assert.match(validatePatternDimensions(0, 10) ?? "", /at least/u);
  assert.match(validatePatternDimensions(2_001, 10) ?? "", /cannot exceed/u);
  assert.match(validatePatternDimensions(4.5, 10) ?? "", /whole numbers/u);
});

test("drawing places stable full crosses and drawing over one recolors it", () => {
  const ids = sequentialIds();
  const base = createBlankPattern("Draw", { width: 10, height: 10 });
  const firstColor = base.colors[0]?.id ?? "";
  const secondColor = base.colors[1]?.id ?? "";
  const placed = drawFullCrossCells(
    base,
    [{ column: 2, row: 3 }, { column: 3, row: 3 }],
    firstColor,
    ids,
  );
  assert.equal(placed.stitches.length, 2);
  const stableId = placed.stitches[0]?.id;
  const recolored = drawFullCrossCells(
    placed,
    [{ column: 2, row: 3 }],
    secondColor,
    ids,
  );
  assert.equal(recolored.stitches.length, 2);
  assert.equal(recolored.stitches[0]?.id, stableId);
  assert.equal(recolored.stitches[0]?.colorId, secondColor);
  assert.equal(recolored.stitches[0]?.elementRevision, 1);
  assert.equal(validatePatternDocument(recolored).valid, true);
});

test("eraser removes only cells traced by the interaction", () => {
  const ids = sequentialIds();
  const base = createBlankPattern("Erase", { width: 10, height: 10 });
  const color = base.colors[0]?.id ?? "";
  const placed = drawFullCrossCells(
    base,
    [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }],
    color,
    ids,
  );
  const erased = eraseFullCrossCells(placed, [{ column: 2, row: 1 }]);
  assert.equal(erased.stitches.length, 2);
  assert.ok(
    erased.stitches.every(
      (stitch) => stitch.geometry.anchor.x !== 2 * 1024,
    ),
  );
});

test("drag tracing fills rapid horizontal, vertical, and diagonal movement", () => {
  assert.deepEqual(traceCellsBetween({ column: 1, row: 2 }, { column: 5, row: 2 }), [
    { column: 1, row: 2 },
    { column: 2, row: 2 },
    { column: 3, row: 2 },
    { column: 4, row: 2 },
    { column: 5, row: 2 },
  ]);
  const diagonal = traceCellsBetween({ column: 0, row: 0 }, { column: 4, row: 6 });
  assert.deepEqual(diagonal[0], { column: 0, row: 0 });
  assert.deepEqual(diagonal.at(-1), { column: 4, row: 6 });
  assert.ok(diagonal.length >= 7);
});

test("pointer actions keep panning separate from drawing", () => {
  assert.equal(pointerAction("pencil", 0), "draw");
  assert.equal(pointerAction("eraser", 0), "erase");
  assert.equal(pointerAction("pan", 0), "pan");
  assert.equal(pointerAction("pencil", 1), "pan");
  assert.equal(pointerAction("pencil", 2), "ignore");
});

test("bounded snapshot history supports undo and redo without revision corruption", () => {
  const ids = sequentialIds();
  const base = createBlankPattern("History", { width: 10, height: 10 });
  const color = base.colors[0]?.id ?? "";
  const placed = drawFullCrossCells(base, [{ column: 4, row: 4 }], color, ids);
  const renamed = renamePattern(placed, "History renamed");
  let history = createDocumentHistory(base, 2);
  history = commitDocument(history, placed);
  history = commitDocument(history, renamed);
  assert.equal(history.present.metadata.name, "History renamed");
  history = undoDocument(history);
  assert.equal(history.present.stitches.length, 1);
  assert.equal(history.present.metadata.name, "History");
  history = undoDocument(history);
  assert.equal(history.present.stitches.length, 0);
  history = redoDocument(history);
  assert.equal(history.present.stitches.length, 1);
  assert.equal(validatePatternDocument(history.present).valid, true);
});

test("color selection and usage counts follow the pattern palette", () => {
  const ids = sequentialIds();
  const base = createBlankPattern("Colors", { width: 5, height: 5 });
  const color = selectActiveColor(base, base.colors[2]?.id ?? "");
  const placed = drawFullCrossCells(
    base,
    [{ column: 0, row: 0 }, { column: 1, row: 0 }],
    color,
    ids,
  );
  assert.equal(colorUsage(placed).get(color), 2);
  assert.throws(() => selectActiveColor(base, "missing-color"), /Unknown pattern color/u);
});

test("JSON export and import preserve valid documents and reject invalid input", () => {
  const ids = sequentialIds();
  const base = createBlankPattern("Round trip", { width: 8, height: 6 });
  const document = drawFullCrossCells(
    base,
    [{ column: 7, row: 5 }],
    base.colors[0]?.id ?? "",
    ids,
  );
  const exported = exportPatternJson(document);
  const imported = parsePatternJson(exported);
  assert.equal(exportPatternJson(imported.document), exported);
  assert.equal(imported.document.stitches.length, document.stitches.length);
  assert.deepEqual(imported.warnings, []);
  assert.throws(() => parsePatternJson("not JSON"), InvalidDocumentError);
  assert.throws(
    () => parsePatternJson(JSON.stringify({ ...document, colors: [] })),
    InvalidDocumentError,
  );
});
