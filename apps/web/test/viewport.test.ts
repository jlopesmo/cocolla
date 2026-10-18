import assert from "node:assert/strict";
import test from "node:test";

import {
  cellToScreen,
  fitDocumentViewport,
  screenToCell,
  viewportForWorkspace,
  zoomViewportAt,
  type Viewport,
} from "../src/core/viewport.js";
import { createBlankPattern } from "../src/core/pattern.js";

test("coordinate-to-cell mapping remains accurate across pan and zoom", () => {
  const viewport: Viewport = { offsetX: 120, offsetY: 80, zoom: 2 };
  const screen = cellToScreen({ column: 7, row: 5 }, viewport);
  assert.deepEqual(screenToCell({ x: screen.x + 12, y: screen.y + 8 }, viewport), {
    column: 7,
    row: 5,
  });
  assert.deepEqual(screenToCell({ x: 119, y: 79 }, viewport), {
    column: -1,
    row: -1,
  });
});

test("zooming around a pointer keeps its document location fixed", () => {
  const viewport: Viewport = { offsetX: 40, offsetY: 30, zoom: 1 };
  const anchor = { x: 310, y: 220 };
  const before = screenToCell(anchor, viewport);
  const zoomed = zoomViewportAt(viewport, 3.25, anchor);
  assert.deepEqual(screenToCell(anchor, zoomed), before);
});

test("fit viewport centers the full document within available space", () => {
  const document = createBlankPattern("Fit", { width: 40, height: 20 });
  const viewport = fitDocumentViewport(document, { width: 1000, height: 700 });
  const topLeft = cellToScreen({ column: 0, row: 0 }, viewport);
  const bottomRight = cellToScreen({ column: 40, row: 20 }, viewport);
  assert.ok(topLeft.x >= 0 && topLeft.y >= 0);
  assert.ok(bottomRight.x <= 1000 && bottomRight.y <= 700);
  assert.ok(Math.abs((topLeft.x + bottomRight.x) / 2 - 500) < 0.001);
  assert.ok(Math.abs((topLeft.y + bottomRight.y) / 2 - 350) < 0.001);
});

test("fit viewport centers wide and tall patterns using the container aspect ratio", () => {
  const size = { width: 860, height: 520 };
  for (const dimensions of [
    { width: 120, height: 12 },
    { width: 12, height: 120 },
  ]) {
    const document = createBlankPattern("Aspect", dimensions);
    const viewport = fitDocumentViewport(document, size);
    const topLeft = cellToScreen({ column: 0, row: 0 }, viewport);
    const bottomRight = cellToScreen(
      { column: dimensions.width, row: dimensions.height },
      viewport,
    );
    assert.ok(topLeft.x >= 0 && topLeft.y >= 0);
    assert.ok(bottomRight.x <= size.width && bottomRight.y <= size.height);
    assert.ok(Math.abs((topLeft.x + bottomRight.x) / 2 - size.width / 2) < 0.001);
    assert.ok(Math.abs((topLeft.y + bottomRight.y) / 2 - size.height / 2) < 0.001);
  }
});

test("workspace resizing refits only while the viewport remains in fit mode", () => {
  const document = createBlankPattern("Resize", { width: 80, height: 30 });
  const current: Viewport = { offsetX: -217, offsetY: 83, zoom: 3.4 };
  const compact = viewportForWorkspace(
    document,
    { width: 620, height: 420 },
    current,
    "fit",
  );
  const expanded = viewportForWorkspace(
    document,
    { width: 1040, height: 720 },
    compact,
    "fit",
  );
  assert.notDeepEqual(expanded, compact);
  const bottomRight = cellToScreen({ column: 80, row: 30 }, expanded);
  const topLeft = cellToScreen({ column: 0, row: 0 }, expanded);
  assert.ok(Math.abs((topLeft.x + bottomRight.x) / 2 - 520) < 0.001);
  assert.ok(Math.abs((topLeft.y + bottomRight.y) / 2 - 360) < 0.001);

  const preserved = viewportForWorkspace(
    document,
    { width: 1040, height: 720 },
    current,
    "manual",
  );
  assert.equal(preserved, current);
});
