import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { PatternDocument } from "../../../../packages/engine/src/index.js";
import { createRenderPlan } from "../core/render-plan.js";
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
  readonly showSymbols: boolean;
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
  event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>,
): ScreenPoint => {
  const rectangle = canvas.getBoundingClientRect();
  return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
};

const drawCanvas = (
  canvas: HTMLCanvasElement,
  document: PatternDocument,
  viewport: Viewport,
  size: ViewportSize,
  showGrid: boolean,
  showSymbols: boolean,
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

  const colors = new Map(document.colors.map((color) => [color.id, color] as const));
  const plan = createRenderPlan(document, viewport, size);
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
  context.lineCap = "round";
  context.lineWidth = Math.max(1.4, Math.min(5, pixels * 0.14));
  for (const [colorId, lines] of linesByColor) {
    context.beginPath();
    context.strokeStyle = colors.get(colorId)?.rgb ?? "#4b5563";
    for (const [start, end] of lines) {
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }
    context.stroke();
  }

  if (showSymbols && pixels >= 18) {
    context.font = `600 ${String(Math.min(12, pixels * 0.38))}px ui-sans-serif, system-ui`;
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
      context.fillStyle = "rgba(255,255,255,0.88)";
      context.fillText(colors.get(stitch.colorId)?.symbol ?? "?", center.x, center.y);
    }
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
  showSymbols,
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
  const [size, setSize] = useState<ViewportSize>({ width: 1, height: 1 });
  const [hoverCell, setHoverCell] = useState<CellPoint | null>(null);

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
        showSymbols,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [document, showGrid, showSymbols, size, viewport]);

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

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>): void => {
    const canvas = overlayCanvasRef.current;
    if (canvas === null) {
      return;
    }
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const factor = Math.exp(-event.deltaY * 0.002);
      onViewportChange(
        zoomViewportAt(viewport, viewport.zoom * factor, eventPoint(canvas, event)),
      );
    } else {
      onViewportChange(
        panViewport(viewport, { x: -event.deltaX, y: -event.deltaY }),
      );
    }
  };

  return (
    <div className={`canvas-stack tool-${tool}`}>
      <canvas aria-hidden="true" className="pattern-canvas base" ref={baseCanvasRef} />
      <canvas
        aria-label="Interactive stitching canvas"
        className="pattern-canvas overlay"
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setHovered(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onWheel={handleWheel}
        ref={overlayCanvasRef}
        tabIndex={0}
      />
    </div>
  );
};
