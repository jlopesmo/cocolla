import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { PatternDocument } from "../../../../packages/engine/src/index.js";
import { createRenderPlan } from "../core/render-plan.js";
import {
  curatedChartSymbol,
  type ChartSymbolPrimitive,
} from "../core/chart-symbols.js";
import {
  cellTintAlpha,
  colorDisplayOpacity,
  displayModeShowsColor,
  displayModeShowsSymbols,
  threadLineWidth,
  type AppearancePreferences,
} from "../core/appearance.js";
import {
  cellPixels,
  cellToScreen,
  documentToScreen,
  isCellInsideDocument,
  panViewport,
  screenToCell,
  zoomViewportAt,
  type CellPoint,
  type ScreenPoint,
  type Viewport,
  type ViewportSize,
  visibleCellBounds,
  wheelZoomFactor,
} from "../core/viewport.js";
import {
  pointerAction,
  traceCellsBetween,
  type EditorTool,
  type PointerAction,
} from "../core/interaction.js";

interface PatternCanvasProps {
  readonly document: PatternDocument;
  readonly viewport: Viewport;
  readonly tool: EditorTool;
  readonly showGrid: boolean;
  readonly appearance: AppearancePreferences;
  readonly isolatedColorIds: ReadonlySet<string> | null;
  readonly selectedCell: CellPoint | null;
  readonly onViewportChange: (viewport: Viewport) => void;
  readonly onCells: (action: "draw" | "erase", cells: readonly CellPoint[]) => void;
  readonly onSelectCell: (cell: CellPoint | null) => void;
  readonly onHoverCell: (cell: CellPoint | null) => void;
  readonly onSizeChange: (size: ViewportSize) => void;
}

interface ActivePointer {
  readonly id: number;
  readonly action: PointerAction;
  readonly lastPoint: ScreenPoint;
  readonly lastCell: CellPoint;
}

const canvasPixelRatio = (): number =>
  Math.min(2, Math.max(1, window.devicePixelRatio || 1));

const eventPoint = (
  canvas: HTMLCanvasElement,
  event: { readonly clientX: number; readonly clientY: number },
): ScreenPoint => {
  const rectangle = canvas.getBoundingClientRect();
  return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
};

const traceChartSymbolPrimitive = (
  context: CanvasRenderingContext2D,
  primitive: ChartSymbolPrimitive,
  center: ScreenPoint,
  size: number,
): void => {
  context.beginPath();
  if (primitive.kind === "circle") {
    context.arc(center.x, center.y, primitive.radius * size, 0, Math.PI * 2);
    return;
  }
  const first = primitive.points[0];
  if (first === undefined) {
    return;
  }
  context.moveTo(center.x + first.x * size, center.y + first.y * size);
  for (const point of primitive.points.slice(1)) {
    context.lineTo(center.x + point.x * size, center.y + point.y * size);
  }
  if (primitive.closed) {
    context.closePath();
  }
};

const drawCuratedChartSymbol = (
  context: CanvasRenderingContext2D,
  symbol: string,
  center: ScreenPoint,
  size: number,
  foreground: string,
  contrastOutline: string,
): boolean => {
  const definition = curatedChartSymbol(symbol);
  if (definition === undefined) {
    return false;
  }
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const primitive of definition.primitives) {
    traceChartSymbolPrimitive(context, primitive, center, size);
    if (primitive.filled) {
      context.fillStyle = foreground;
      context.fill();
      context.strokeStyle = contrastOutline;
      context.lineWidth = Math.max(1.2, size * 0.07);
      context.stroke();
      continue;
    }
    const heavy = primitive.kind === "path" && primitive.heavy === true;
    context.strokeStyle = contrastOutline;
    context.lineWidth = Math.max(2, size * (heavy ? 0.24 : 0.17));
    context.stroke();
    traceChartSymbolPrimitive(context, primitive, center, size);
    context.strokeStyle = foreground;
    context.lineWidth = Math.max(1.2, size * (heavy ? 0.14 : 0.08));
    context.stroke();
  }
  context.restore();
  return true;
};

const drawCanvas = (
  canvas: HTMLCanvasElement,
  document: PatternDocument,
  viewport: Viewport,
  size: ViewportSize,
  showGrid: boolean,
  appearance: AppearancePreferences,
  isolatedColorIds: ReadonlySet<string> | null,
): void => {
  const ratio = canvasPixelRatio();
  const width = Math.max(1, Math.round(size.width * ratio));
  const height = Math.max(1, Math.round(size.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = "#dfe3df";
  context.fillRect(0, 0, size.width, size.height);

  const units = document.coordinateSystem.unitsPerFabricCell;
  const patternColumns = document.bounds.width / units;
  const patternRows = document.bounds.height / units;
  const pixels = cellPixels(viewport);
  const patternWidth = patternColumns * pixels;
  const patternHeight = patternRows * pixels;

  context.save();
  context.shadowColor = "rgba(40, 50, 44, 0.16)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 4;
  context.fillStyle = "#fffdf8";
  context.fillRect(viewport.offsetX, viewport.offsetY, patternWidth, patternHeight);
  context.restore();

  context.save();
  context.beginPath();
  context.rect(viewport.offsetX, viewport.offsetY, patternWidth, patternHeight);
  context.clip();

  const colors = new Map(document.colors.map((color) => [color.id, color] as const));
  const plan = createRenderPlan(document, viewport, size);

  if (appearance.cellTintEnabled) {
    const tintedCells = new Set<string>();
    for (const { stitch } of plan.visible) {
      const column = Math.floor(stitch.geometry.anchor.x / units);
      const row = Math.floor(stitch.geometry.anchor.y / units);
      const key = `${stitch.colorId}:${String(column)}:${String(row)}`;
      if (tintedCells.has(key)) {
        continue;
      }
      tintedCells.add(key);
      const point = cellToScreen({ column, row }, viewport);
      context.globalAlpha = cellTintAlpha(stitch.colorId, isolatedColorIds, appearance);
      context.fillStyle = colors.get(stitch.colorId)?.rgb ?? "#4b5563";
      context.fillRect(point.x, point.y, pixels, pixels);
    }
    context.globalAlpha = 1;
  }

  if (showGrid && pixels >= 4) {
    const bounds = visibleCellBounds(viewport, size, 0);
    const minimumColumn = Math.max(0, bounds.minimumColumn);
    const maximumColumn = Math.min(patternColumns, bounds.maximumColumn + 1);
    const minimumRow = Math.max(0, bounds.minimumRow);
    const maximumRow = Math.min(patternRows, bounds.maximumRow + 1);
    context.lineWidth = 1;
    for (let column = minimumColumn; column <= maximumColumn; column += 1) {
      const x = viewport.offsetX + column * pixels;
      context.beginPath();
      context.strokeStyle = column % 10 === 0 ? "#b8c1ba" : "#e1e4df";
      context.moveTo(Math.round(x) + 0.5, viewport.offsetY);
      context.lineTo(Math.round(x) + 0.5, viewport.offsetY + patternHeight);
      context.stroke();
    }
    for (let row = minimumRow; row <= maximumRow; row += 1) {
      const y = viewport.offsetY + row * pixels;
      context.beginPath();
      context.strokeStyle = row % 10 === 0 ? "#b8c1ba" : "#e1e4df";
      context.moveTo(viewport.offsetX, Math.round(y) + 0.5);
      context.lineTo(viewport.offsetX + patternWidth, Math.round(y) + 0.5);
      context.stroke();
    }
  }

  const linesByColor = new Map<string, Array<readonly [ScreenPoint, ScreenPoint]>>();
  for (const item of plan.visible) {
    for (const primitive of item.primitives) {
      const lines = linesByColor.get(primitive.colorId) ?? [];
      lines.push([
        documentToScreen(primitive.start, units, viewport),
        documentToScreen(primitive.end, units, viewport),
      ]);
      linesByColor.set(primitive.colorId, lines);
    }
  }
  if (displayModeShowsColor(appearance.displayMode)) {
    context.lineCap = "round";
    context.lineWidth = threadLineWidth(pixels, appearance.threadThickness);
    for (const [colorId, lines] of linesByColor) {
      context.beginPath();
      context.globalAlpha = colorDisplayOpacity(
        colorId,
        isolatedColorIds,
        appearance.dimOpacity,
      );
      context.strokeStyle = colors.get(colorId)?.rgb ?? "#4b5563";
      for (const [start, end] of lines) {
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  if (displayModeShowsSymbols(appearance.displayMode)) {
    const fontSize = Math.max(7, Math.min(18, pixels * 0.48));
    context.font = `700 ${String(fontSize)}px ui-sans-serif, system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const { stitch } of plan.visible) {
      const center = documentToScreen(
        {
          x: stitch.geometry.anchor.x + units / 2,
          y: stitch.geometry.anchor.y + units / 2,
        },
        units,
        viewport,
      );
      context.globalAlpha = colorDisplayOpacity(
        stitch.colorId,
        isolatedColorIds,
        appearance.dimOpacity,
      );
      if (pixels < 9) {
        const marker = Math.max(1.5, pixels * 0.22);
        context.fillStyle = "#263238";
        context.fillRect(center.x - marker / 2, center.y - marker / 2, marker, marker);
        continue;
      }
      const symbol = colors.get(stitch.colorId)?.symbol ?? "?";
      const contrastOutline = appearance.displayMode === "symbol"
        ? "rgba(255,255,255,0.95)"
        : "rgba(38,50,56,0.72)";
      const foreground = appearance.displayMode === "symbol"
        ? "#263238"
        : "rgba(255,255,255,0.96)";
      if (!drawCuratedChartSymbol(
        context,
        symbol,
        center,
        fontSize,
        foreground,
        contrastOutline,
      )) {
        context.lineWidth = Math.max(1.5, fontSize * 0.2);
        context.strokeStyle = contrastOutline;
        context.fillStyle = foreground;
        context.strokeText(symbol, center.x, center.y);
        context.fillText(symbol, center.x, center.y);
      }
    }
    context.globalAlpha = 1;
  }

  context.restore();
};

const drawInteractionOverlay = (
  canvas: HTMLCanvasElement,
  document: PatternDocument,
  viewport: Viewport,
  size: ViewportSize,
  hoverCell: CellPoint | null,
  selectedCell: CellPoint | null,
): void => {
  const ratio = canvasPixelRatio();
  const width = Math.max(1, Math.round(size.width * ratio));
  const height = Math.max(1, Math.round(size.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  const pixels = cellPixels(viewport);
  const highlightCell = (
    cell: CellPoint,
    fill: string,
    stroke: string,
  ): void => {
    if (!isCellInsideDocument(document, cell)) {
      return;
    }
    const point = cellToScreen(cell, viewport);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.fillRect(point.x + 1, point.y + 1, pixels - 2, pixels - 2);
    context.strokeRect(point.x + 1, point.y + 1, pixels - 2, pixels - 2);
  };
  if (selectedCell !== null) {
    highlightCell(selectedCell, "rgba(40, 126, 134, 0.10)", "#287e86");
  }
  if (hoverCell !== null) {
    highlightCell(hoverCell, "rgba(231, 111, 81, 0.11)", "#e76f51");
  }
};

export const PatternCanvas = ({
  document,
  viewport,
  tool,
  showGrid,
  appearance,
  isolatedColorIds,
  selectedCell,
  onViewportChange,
  onCells,
  onSelectCell,
  onHoverCell,
  onSizeChange,
}: PatternCanvasProps): React.JSX.Element => {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<ActivePointer | null>(null);
  const viewportRef = useRef(viewport);
  const viewportChangeRef = useRef(onViewportChange);
  const [size, setSize] = useState<ViewportSize>({ width: 1, height: 1 });
  const [hoverCell, setHoverCell] = useState<CellPoint | null>(null);
  viewportRef.current = viewport;
  viewportChangeRef.current = onViewportChange;

  useLayoutEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const updateSize = (): void => {
      const rectangle = canvas.getBoundingClientRect();
      const next = {
        width: Math.max(1, rectangle.width),
        height: Math.max(1, rectangle.height),
      };
      setSize(next);
      onSizeChange(next);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [onSizeChange]);

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      drawCanvas(
        canvas,
        document,
        viewport,
        size,
        showGrid,
        appearance,
        isolatedColorIds,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [appearance, document, isolatedColorIds, showGrid, size, viewport]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      drawInteractionOverlay(
        canvas,
        document,
        viewport,
        size,
        hoverCell,
        selectedCell,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [document, hoverCell, selectedCell, size, viewport]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const delta = event.deltaY === 0 ? event.deltaX : event.deltaY;
      const factor = wheelZoomFactor(delta, event.deltaMode);
      const current = viewportRef.current;
      const next = zoomViewportAt(
        current,
        current.zoom * factor,
        eventPoint(canvas, event),
      );
      viewportRef.current = next;
      viewportChangeRef.current(next);
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const setHovered = (cell: CellPoint | null): void => {
    setHoverCell(cell);
    onHoverCell(cell);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const action = pointerAction(tool, event.button);
    if (action === "ignore") {
      return;
    }
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const point = eventPoint(canvas, event);
    const cell = screenToCell(point, viewport);
    pointerRef.current = {
      id: event.pointerId,
      action,
      lastPoint: point,
      lastCell: cell,
    };
    if (action === "draw" || action === "erase") {
      onCells(action, [cell]);
      onSelectCell(action === "draw" ? cell : null);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    const point = eventPoint(canvas, event);
    const cell = screenToCell(point, viewport);
    setHovered(isCellInsideDocument(document, cell) ? cell : null);
    const active = pointerRef.current;
    if (active === null || active.id !== event.pointerId) {
      return;
    }
    if (active.action === "pan") {
      onViewportChange(
        panViewport(viewport, {
          x: point.x - active.lastPoint.x,
          y: point.y - active.lastPoint.y,
        }),
      );
    } else if (active.action === "draw" || active.action === "erase") {
      onCells(active.action, traceCellsBetween(active.lastCell, cell));
      if (active.action === "draw") {
        onSelectCell(cell);
      }
    }
    pointerRef.current = { ...active, lastPoint: point, lastCell: cell };
  };

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = overlayCanvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId) === true) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (pointerRef.current?.id === event.pointerId) {
      pointerRef.current = null;
    }
  };

  return (
    <div className={`canvas-stack tool-${tool}`}>
      <canvas aria-hidden="true" className="pattern-canvas base" ref={baseCanvasRef} />
      <canvas
        aria-label="Interactive stitching canvas"
        className="pattern-canvas overlay"
        data-viewport-offset-x={viewport.offsetX}
        data-viewport-offset-y={viewport.offsetY}
        data-viewport-zoom={viewport.zoom}
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setHovered(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        ref={overlayCanvasRef}
        tabIndex={0}
      />
    </div>
  );
};
