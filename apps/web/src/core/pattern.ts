import {
  DEFAULT_UNITS_PER_FABRIC_CELL,
  InvalidDocumentError,
  applyPatternCommands,
  assertValidPatternDocument,
  createPatternDocument,
  deserializePatternDocument,
  serializePatternDocument,
  validatePatternDocument,
  type PatternColorV1,
  type PatternCommand,
  type PatternDocument,
  type StitchElementV1,
} from "../../../../packages/engine/src/index.js";

import type { CellPoint } from "./viewport.js";

export const MIN_PATTERN_CELLS = 1;
export const MAX_PATTERN_CELLS = 2_000;

export const DEFAULT_COLORS: readonly PatternColorV1[] = [
  { id: "color-charcoal", name: "Charcoal", rgb: "#263238", symbol: "A", threadProductId: null },
  { id: "color-coral", name: "Coral", rgb: "#E76F51", symbol: "B", threadProductId: null },
  { id: "color-gold", name: "Marigold", rgb: "#E9A23B", symbol: "C", threadProductId: null },
  { id: "color-sage", name: "Sage", rgb: "#6E9B78", symbol: "D", threadProductId: null },
  { id: "color-teal", name: "Deep teal", rgb: "#287E86", symbol: "E", threadProductId: null },
  { id: "color-blue", name: "Cornflower", rgb: "#5479C9", symbol: "F", threadProductId: null },
  { id: "color-plum", name: "Plum", rgb: "#875B82", symbol: "G", threadProductId: null },
  { id: "color-cream", name: "Warm cream", rgb: "#F0E4CF", symbol: "H", threadProductId: null },
];

export interface PatternDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ParsedPattern {
  readonly document: PatternDocument;
  readonly warnings: readonly string[];
}

export type StitchIdFactory = () => string;

export const validatePatternDimensions = (
  width: number,
  height: number,
): string | null => {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    return "Width and height must be whole numbers.";
  }
  if (width < MIN_PATTERN_CELLS || height < MIN_PATTERN_CELLS) {
    return `Width and height must be at least ${String(MIN_PATTERN_CELLS)} cell.`;
  }
  if (width > MAX_PATTERN_CELLS || height > MAX_PATTERN_CELLS) {
    return `Width and height cannot exceed ${String(MAX_PATTERN_CELLS)} cells.`;
  }
  return null;
};

export const createBlankPattern = (
  name: string,
  dimensions: PatternDimensions,
  id = "pattern-local",
): PatternDocument => {
  const error = validatePatternDimensions(dimensions.width, dimensions.height);
  if (error !== null) {
    throw new RangeError(error);
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new RangeError("Pattern name cannot be empty.");
  }
  return createPatternDocument({
    id,
    name: trimmedName,
    width: dimensions.width * DEFAULT_UNITS_PER_FABRIC_CELL,
    height: dimensions.height * DEFAULT_UNITS_PER_FABRIC_CELL,
    layers: [{ id: "layer-main", name: "Main", order: 0 }],
    colors: DEFAULT_COLORS,
  });
};

const cellKey = (cell: CellPoint): string =>
  `${String(cell.column)},${String(cell.row)}`;

const fullCrossCell = (
  document: PatternDocument,
  stitch: StitchElementV1,
): CellPoint | undefined => {
  if (stitch.technique.key !== "full-cross" || stitch.technique.version !== 1) {
    return undefined;
  }
  const units = document.coordinateSystem.unitsPerFabricCell;
  if (
    stitch.geometry.anchor.x % units !== 0 ||
    stitch.geometry.anchor.y % units !== 0
  ) {
    return undefined;
  }
  return {
    column: stitch.geometry.anchor.x / units,
    row: stitch.geometry.anchor.y / units,
  };
};

const cellsInsideDocument = (
  document: PatternDocument,
  cells: readonly CellPoint[],
): readonly CellPoint[] => {
  const units = document.coordinateSystem.unitsPerFabricCell;
  const columns = document.bounds.width / units;
  const rows = document.bounds.height / units;
  const unique = new Map<string, CellPoint>();
  for (const cell of cells) {
    if (
      Number.isSafeInteger(cell.column) &&
      Number.isSafeInteger(cell.row) &&
      cell.column >= 0 &&
      cell.row >= 0 &&
      cell.column < columns &&
      cell.row < rows
    ) {
      unique.set(cellKey(cell), cell);
    }
  }
  return [...unique.values()];
};

const nextUniqueStitchId = (
  existingIds: Set<string>,
  idFactory: StitchIdFactory,
): string => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = idFactory();
    if (!existingIds.has(id)) {
      existingIds.add(id);
      return id;
    }
  }
  throw new Error("Unable to allocate a unique stitch identifier.");
};

export const drawFullCrossCells = (
  document: PatternDocument,
  cells: readonly CellPoint[],
  colorId: string,
  idFactory: StitchIdFactory,
): PatternDocument => {
  if (!document.colors.some((color) => color.id === colorId)) {
    throw new Error(`Unknown pattern color: ${colorId}.`);
  }
  const existingByCell = new Map<string, StitchElementV1>();
  for (const stitch of document.stitches) {
    const cell = fullCrossCell(document, stitch);
    if (cell !== undefined) {
      existingByCell.set(cellKey(cell), stitch);
    }
  }
  const existingIds = new Set(document.stitches.map((stitch) => stitch.id));
  const commands: PatternCommand[] = [];
  const units = document.coordinateSystem.unitsPerFabricCell;

  for (const cell of cellsInsideDocument(document, cells)) {
    const existing = existingByCell.get(cellKey(cell));
    if (existing !== undefined) {
      if (existing.colorId !== colorId) {
        commands.push({
          type: "stitch.recolor",
          stitchId: existing.id,
          colorId,
        });
      }
      continue;
    }
    const stitch: StitchElementV1 = {
      id: nextUniqueStitchId(existingIds, idFactory),
      technique: { key: "full-cross", version: 1 },
      layerId: document.layers[0]?.id ?? "layer-main",
      colorId,
      geometry: {
        anchor: { x: cell.column * units, y: cell.row * units },
        data: {},
      },
      elementRevision: 0,
    };
    commands.push({ type: "stitch.add", stitch });
    existingByCell.set(cellKey(cell), stitch);
  }

  return commands.length === 0
    ? document
    : applyPatternCommands(document, {
        baseRevision: document.revision,
        commands,
      });
};

export const eraseFullCrossCells = (
  document: PatternDocument,
  cells: readonly CellPoint[],
): PatternDocument => {
  const targets = new Set(cellsInsideDocument(document, cells).map(cellKey));
  const commands: PatternCommand[] = document.stitches.flatMap((stitch) => {
    const cell = fullCrossCell(document, stitch);
    return cell !== undefined && targets.has(cellKey(cell))
      ? [{ type: "stitch.remove" as const, stitchId: stitch.id }]
      : [];
  });
  return commands.length === 0
    ? document
    : applyPatternCommands(document, {
        baseRevision: document.revision,
        commands,
      });
};

export const renamePattern = (
  document: PatternDocument,
  name: string,
): PatternDocument => {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 120) {
    throw new RangeError("Pattern name must contain 1–120 characters.");
  }
  if (trimmed === document.metadata.name) {
    return document;
  }
  const renamed: PatternDocument = {
    ...document,
    revision: document.revision + 1,
    metadata: { name: trimmed },
  };
  assertValidPatternDocument(renamed);
  return renamed;
};

export const parsePatternJson = (serialized: string): ParsedPattern => {
  const document = deserializePatternDocument(serialized);
  const validation = validatePatternDocument(document);
  if (!validation.valid) {
    throw new InvalidDocumentError(validation.issues);
  }
  return {
    document,
    warnings: validation.issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => issue.message),
  };
};

export const exportPatternJson = (document: PatternDocument): string =>
  serializePatternDocument(document);

export const selectActiveColor = (
  document: PatternDocument,
  colorId: string,
): string => {
  if (!document.colors.some((color) => color.id === colorId)) {
    throw new Error(`Unknown pattern color: ${colorId}.`);
  }
  return colorId;
};

export const colorUsage = (
  document: PatternDocument,
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>(
    document.colors.map((color) => [color.id, 0]),
  );
  for (const stitch of document.stitches) {
    counts.set(stitch.colorId, (counts.get(stitch.colorId) ?? 0) + 1);
  }
  return counts;
};

export const unsupportedTechniqueCount = (document: PatternDocument): number =>
  document.stitches.filter(
    (stitch) =>
      stitch.technique.key !== "full-cross" || stitch.technique.version !== 1,
  ).length;
