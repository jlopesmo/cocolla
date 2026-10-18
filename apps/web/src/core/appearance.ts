export const APPEARANCE_STORAGE_KEY = "cocolla.editor.appearance.v1";

export const MIN_THREAD_THICKNESS = 0.08;
export const MAX_THREAD_THICKNESS = 0.32;
export const MIN_DIM_OPACITY = 0.05;
export const MAX_DIM_OPACITY = 0.6;
export const MIN_TINT_OPACITY = 0.03;
export const MAX_TINT_OPACITY = 0.3;

export type StitchDisplayMode = "color" | "symbol" | "color-symbol";

export interface AppearancePreferences {
  readonly threadThickness: number;
  readonly displayMode: StitchDisplayMode;
  readonly dimOpacity: number;
  readonly cellTintEnabled: boolean;
  readonly cellTintOpacity: number;
}

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  threadThickness: 0.14,
  displayMode: "color",
  dimOpacity: 0.18,
  cellTintEnabled: true,
  cellTintOpacity: 0.12,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: unknown, minimum: number, maximum: number, fallback: number): number =>
  isFiniteNumber(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;

const isDisplayMode = (value: unknown): value is StitchDisplayMode =>
  value === "color" || value === "symbol" || value === "color-symbol";

export const normalizeAppearancePreferences = (
  value: unknown,
): AppearancePreferences => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
  const candidate = value as Record<string, unknown>;
  return {
    threadThickness: clamp(
      candidate.threadThickness,
      MIN_THREAD_THICKNESS,
      MAX_THREAD_THICKNESS,
      DEFAULT_APPEARANCE_PREFERENCES.threadThickness,
    ),
    displayMode: isDisplayMode(candidate.displayMode)
      ? candidate.displayMode
      : DEFAULT_APPEARANCE_PREFERENCES.displayMode,
    dimOpacity: clamp(
      candidate.dimOpacity,
      MIN_DIM_OPACITY,
      MAX_DIM_OPACITY,
      DEFAULT_APPEARANCE_PREFERENCES.dimOpacity,
    ),
    cellTintEnabled:
      typeof candidate.cellTintEnabled === "boolean"
        ? candidate.cellTintEnabled
        : DEFAULT_APPEARANCE_PREFERENCES.cellTintEnabled,
    cellTintOpacity: clamp(
      candidate.cellTintOpacity,
      MIN_TINT_OPACITY,
      MAX_TINT_OPACITY,
      DEFAULT_APPEARANCE_PREFERENCES.cellTintOpacity,
    ),
  };
};

export const parseAppearancePreferences = (
  serialized: string | null,
): AppearancePreferences => {
  if (serialized === null) {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
  try {
    return normalizeAppearancePreferences(JSON.parse(serialized));
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
};

export const serializeAppearancePreferences = (
  preferences: AppearancePreferences,
): string => JSON.stringify(normalizeAppearancePreferences(preferences));

export const reconcileSelectedColors = (
  selected: ReadonlySet<string>,
  availableColorIds: readonly string[],
): ReadonlySet<string> => {
  const available = new Set(availableColorIds);
  return new Set([...selected].filter((colorId) => available.has(colorId)));
};

export const toggleSelectedColor = (
  selected: ReadonlySet<string>,
  colorId: string,
): ReadonlySet<string> => {
  const next = new Set(selected);
  if (next.has(colorId)) {
    next.delete(colorId);
  } else {
    next.add(colorId);
  }
  return next;
};

export const colorDisplayOpacity = (
  colorId: string,
  isolatedColorIds: ReadonlySet<string> | null,
  dimOpacity: number,
): number =>
  isolatedColorIds === null || isolatedColorIds.has(colorId)
    ? 1
    : clamp(dimOpacity, MIN_DIM_OPACITY, MAX_DIM_OPACITY, DEFAULT_APPEARANCE_PREFERENCES.dimOpacity);

export const displayModeShowsColor = (mode: StitchDisplayMode): boolean =>
  mode === "color" || mode === "color-symbol";

export const displayModeShowsSymbols = (mode: StitchDisplayMode): boolean =>
  mode === "symbol" || mode === "color-symbol";

export const threadLineWidth = (
  pixelsPerCell: number,
  threadThickness: number,
): number =>
  Math.max(
    1,
    pixelsPerCell * clamp(
      threadThickness,
      MIN_THREAD_THICKNESS,
      MAX_THREAD_THICKNESS,
      DEFAULT_APPEARANCE_PREFERENCES.threadThickness,
    ),
  );

export const cellTintAlpha = (
  colorId: string,
  isolatedColorIds: ReadonlySet<string> | null,
  preferences: AppearancePreferences,
): number =>
  (preferences.cellTintEnabled
    ? clamp(
        preferences.cellTintOpacity,
        MIN_TINT_OPACITY,
        MAX_TINT_OPACITY,
        DEFAULT_APPEARANCE_PREFERENCES.cellTintOpacity,
      )
    : 0) * colorDisplayOpacity(colorId, isolatedColorIds, preferences.dimOpacity);
