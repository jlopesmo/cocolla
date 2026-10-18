import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_APPEARANCE_PREFERENCES,
  cellTintAlpha,
  colorDisplayOpacity,
  displayModeShowsColor,
  displayModeShowsSymbols,
  normalizeAppearancePreferences,
  parseAppearancePreferences,
  reconcileSelectedColors,
  serializeAppearancePreferences,
  threadLineWidth,
  toggleSelectedColor,
} from "../src/core/appearance.js";

test("appearance preferences serialize deterministically and normalize stored input", () => {
  const preferences = {
    ...DEFAULT_APPEARANCE_PREFERENCES,
    threadThickness: 0.24,
    displayMode: "color-symbol" as const,
    dimOpacity: 0.25,
    cellTintEnabled: false,
    cellTintOpacity: 0.2,
  };
  const serialized = serializeAppearancePreferences(preferences);
  assert.deepEqual(parseAppearancePreferences(serialized), preferences);
  assert.deepEqual(parseAppearancePreferences("not JSON"), DEFAULT_APPEARANCE_PREFERENCES);
  assert.deepEqual(
    normalizeAppearancePreferences({
      threadThickness: 99,
      displayMode: "invalid",
      dimOpacity: -1,
      cellTintEnabled: "yes",
      cellTintOpacity: Number.NaN,
    }),
    {
      threadThickness: 0.32,
      displayMode: "color",
      dimOpacity: 0.05,
      cellTintEnabled: true,
      cellTintOpacity: 0.12,
    },
  );
});

test("multi-color selection is immutable and reconciles against a new document", () => {
  const selected = new Set(["red", "blue"]);
  const toggled = toggleSelectedColor(selected, "green");
  assert.deepEqual([...selected], ["red", "blue"]);
  assert.deepEqual([...toggled], ["red", "blue", "green"]);
  assert.deepEqual(
    [...reconcileSelectedColors(toggled, ["blue", "green", "yellow"])],
    ["blue", "green"],
  );
});

test("isolation dims only unselected colors and clamps opacity", () => {
  const isolated = new Set(["red", "blue"]);
  assert.equal(colorDisplayOpacity("red", isolated, 0.2), 1);
  assert.equal(colorDisplayOpacity("green", isolated, 0.2), 0.2);
  assert.equal(colorDisplayOpacity("green", isolated, 0), 0.05);
  assert.equal(colorDisplayOpacity("green", null, 0.2), 1);
});

test("display modes select the intended rendering layers", () => {
  assert.equal(displayModeShowsColor("color"), true);
  assert.equal(displayModeShowsSymbols("color"), false);
  assert.equal(displayModeShowsColor("symbol"), false);
  assert.equal(displayModeShowsSymbols("symbol"), true);
  assert.equal(displayModeShowsColor("color-symbol"), true);
  assert.equal(displayModeShowsSymbols("color-symbol"), true);
});

test("thread width scales with zoom and cell tint follows isolation", () => {
  assert.equal(threadLineWidth(20, 0.2), 4);
  assert.equal(threadLineWidth(40, 0.2), 8);
  assert.equal(threadLineWidth(2, 0.08), 1);
  const preferences = {
    ...DEFAULT_APPEARANCE_PREFERENCES,
    cellTintOpacity: 0.2,
    dimOpacity: 0.25,
  };
  assert.equal(cellTintAlpha("red", new Set(["red"]), preferences), 0.2);
  assert.equal(cellTintAlpha("blue", new Set(["red"]), preferences), 0.05);
  assert.equal(cellTintAlpha("red", null, { ...preferences, cellTintEnabled: false }), 0);
});
