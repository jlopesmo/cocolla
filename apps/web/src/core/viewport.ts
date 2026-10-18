import type { IntegerPoint, PatternDocument } from "../../../../packages/engine/src/index.js";

export const BASE_CELL_PIXELS = 26;
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 8;

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface CellPoint {
  readonly column: number;
  readonly row: number;
}

export interface Viewport {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export type WorkspaceViewportMode = "fit" | "manual";

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const wheelZoomFactor = (delta: number, deltaMode: number): number => {
  const pixelsPerUnit = deltaMode === 1 ? 16 : deltaMode === 2 ? 300 : 1;
  const normalized = Math.min(160, Math.max(-160, delta * pixelsPerUnit));
  return Math.exp(-normalized * 0.002);
};

export const cellPixels = (viewport: Viewport): number =>
  BASE_CELL_PIXELS * viewport.zoom;

export const documentToScreen = (
  point: IntegerPoint,
  unitsPerFabricCell: number,
  viewport: Viewport,
): ScreenPoint => {
  const scale = cellPixels(viewport) / unitsPerFabricCell;
  return {
    x: viewport.offsetX + point.x * scale,
    y: viewport.offsetY + point.y * scale,
  };
};

export const screenToDocument = (
  point: ScreenPoint,
  unitsPerFabricCell: number,
  viewport: Viewport,
): IntegerPoint => {
  const scale = unitsPerFabricCell / cellPixels(viewport);
  return {
    x: Math.floor((point.x - viewport.offsetX) * scale),
    y: Math.floor((point.y - viewport.offsetY) * scale),
  };
};

export const screenToCell = (
  point: ScreenPoint,
  viewport: Viewport,
): CellPoint => ({
  column: Math.floor((point.x - viewport.offsetX) / cellPixels(viewport)),
  row: Math.floor((point.y - viewport.offsetY) / cellPixels(viewport)),
});

export const cellToScreen = (
  cell: CellPoint,
  viewport: Viewport,
): ScreenPoint => ({
  x: viewport.offsetX + cell.column * cellPixels(viewport),
  y: viewport.offsetY + cell.row * cellPixels(viewport),
});

export const panViewport = (
  viewport: Viewport,
  delta: ScreenPoint,
): Viewport => ({
  ...viewport,
  offsetX: viewport.offsetX + delta.x,
  offsetY: viewport.offsetY + delta.y,
});

export const zoomViewportAt = (
  viewport: Viewport,
  nextZoom: number,
  anchor: ScreenPoint,
): Viewport => {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / viewport.zoom;
  return {
    zoom,
    offsetX: anchor.x - (anchor.x - viewport.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - viewport.offsetY) * ratio,
  };
};

export const fitDocumentViewport = (
  document: PatternDocument,
  size: ViewportSize,
  padding = 44,
): Viewport => {
  const units = document.coordinateSystem.unitsPerFabricCell;
  const columns = document.bounds.width / units;
  const rows = document.bounds.height / units;
  const availableWidth = Math.max(1, size.width - padding * 2);
  const availableHeight = Math.max(1, size.height - padding * 2);
  const zoom = clampZoom(
    Math.min(
      availableWidth / (columns * BASE_CELL_PIXELS),
      availableHeight / (rows * BASE_CELL_PIXELS),
      2,
    ),
  );
  const renderedWidth = columns * BASE_CELL_PIXELS * zoom;
  const renderedHeight = rows * BASE_CELL_PIXELS * zoom;
  return {
    zoom,
    offsetX: (size.width - renderedWidth) / 2,
    offsetY: (size.height - renderedHeight) / 2,
  };
};

export const viewportForWorkspace = (
  document: PatternDocument,
  size: ViewportSize,
  current: Viewport,
  mode: WorkspaceViewportMode,
  padding = 44,
): Viewport =>
  mode === "fit"
    ? fitDocumentViewport(document, size, padding)
    : current;

export const isCellInsideDocument = (
  document: PatternDocument,
  cell: CellPoint,
): boolean => {
  const units = document.coordinateSystem.unitsPerFabricCell;
  return (
    cell.column >= 0 &&
    cell.row >= 0 &&
    cell.column * units < document.bounds.width &&
    cell.row * units < document.bounds.height
  );
};

export const visibleCellBounds = (
  viewport: Viewport,
  size: ViewportSize,
  margin = 1,
): {
  readonly minimumColumn: number;
  readonly maximumColumn: number;
  readonly minimumRow: number;
  readonly maximumRow: number;
} => {
  const topLeft = screenToCell({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToCell(
    { x: size.width, y: size.height },
    viewport,
  );
  return {
    minimumColumn: topLeft.column - margin,
    maximumColumn: bottomRight.column + margin,
    minimumRow: topLeft.row - margin,
    maximumRow: bottomRight.row + margin,
  };
};
