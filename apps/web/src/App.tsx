import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PatternDocument, StitchElementV1 } from "../../../packages/engine/src/index.js";
import { Icon } from "./components/Icon.js";
import { NewPatternDialog } from "./components/NewPatternDialog.js";
import { PatternCanvas } from "./components/PatternCanvas.js";
import {
  colorUsage,
  createBlankPattern,
  drawFullCrossCells,
  eraseFullCrossCells,
  exportPatternJson,
  parsePatternJson,
  renamePattern,
  selectActiveColor,
  unsupportedTechniqueCount,
  type PatternDimensions,
} from "./core/pattern.js";
import {
  commitDocument,
  createDocumentHistory,
  redoDocument,
  undoDocument,
} from "./core/history.js";
import type { EditorTool } from "./core/interaction.js";
import {
  fitDocumentViewport,
  zoomViewportAt,
  type CellPoint,
  type Viewport,
  type ViewportSize,
} from "./core/viewport.js";

type Notice = { readonly tone: "info" | "error"; readonly text: string } | null;

const INITIAL_DIMENSIONS: PatternDimensions = { width: 40, height: 30 };
const initialDocument = createBlankPattern("Untitled sampler", INITIAL_DIMENSIONS);

const stitchAtCell = (
  document: PatternDocument,
  cell: CellPoint | null,
): StitchElementV1 | undefined => {
  if (cell === null) {
    return undefined;
  }
  const units = document.coordinateSystem.unitsPerFabricCell;
  return document.stitches.find(
    (stitch) =>
      stitch.technique.key === "full-cross" &&
      stitch.technique.version === 1 &&
      stitch.geometry.anchor.x === cell.column * units &&
      stitch.geometry.anchor.y === cell.row * units,
  );
};

const downloadFilename = (name: string): string => {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  return `${safe.length === 0 ? "cocolla-pattern" : safe}.cocolla.json`;
};

export const App = (): React.JSX.Element => {
  const [history, setHistory] = useState(() => createDocumentHistory(initialDocument));
  const [savedDocument, setSavedDocument] = useState<PatternDocument | null>(null);
  const [activeColorId, setActiveColorId] = useState(
    initialDocument.colors[0]?.id ?? "",
  );
  const [tool, setTool] = useState<EditorTool>("pencil");
  const [viewport, setViewport] = useState<Viewport>({
    offsetX: 46,
    offsetY: 42,
    zoom: 1,
  });
  const [canvasSize, setCanvasSize] = useState<ViewportSize>({ width: 900, height: 650 });
  const [hoverCell, setHoverCell] = useState<CellPoint | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellPoint | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showSymbols, setShowSymbols] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [newPatternOpen, setNewPatternOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    text: "Local editing only — export JSON to keep your work.",
  });
  const [nameDraft, setNameDraft] = useState(initialDocument.metadata.name);
  const importInputRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef(0);
  const fittedDocumentRef = useRef<PatternDocument | null>(null);
  const document = history.present;

  const nextStitchId = useCallback((): string => {
    idCounterRef.current += 1;
    const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    return `stitch-${randomPart}-${String(idCounterRef.current)}`;
  }, []);

  const fitCanvas = useCallback(
    (target = document): void => {
      setViewport(fitDocumentViewport(target, canvasSize));
    },
    [canvasSize, document],
  );

  useEffect(() => {
    setNameDraft(document.metadata.name);
    if (fittedDocumentRef.current !== document && history.past.length === 0) {
      fittedDocumentRef.current = document;
      fitCanvas(document);
    }
  }, [document, fitCanvas, history.past.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistory((current) =>
          event.shiftKey ? redoDocument(current) : undoDocument(current),
        );
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        setHistory(redoDocument);
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "p") setTool("pencil");
      if (key === "e") setTool("eraser");
      if (key === "h") setTool("pan");
      if (key === "g") setShowGrid((value) => !value);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const applyCells = useCallback(
    (action: "draw" | "erase", cells: readonly CellPoint[]): void => {
      setHistory((current) => {
        const next =
          action === "draw"
            ? drawFullCrossCells(current.present, cells, activeColorId, nextStitchId)
            : eraseFullCrossCells(current.present, cells);
        return commitDocument(current, next);
      });
    },
    [activeColorId, nextStitchId],
  );

  const selectedStitch = useMemo(
    () => stitchAtCell(document, selectedCell),
    [document, selectedCell],
  );
  const usage = useMemo(() => colorUsage(document), [document]);
  const units = document.coordinateSystem.unitsPerFabricCell;
  const dimensions = {
    width: document.bounds.width / units,
    height: document.bounds.height / units,
  };
  const isDirty = savedDocument === null || document !== savedDocument;
  const unsupportedCount = unsupportedTechniqueCount(document);

  const createNewPattern = (name: string, nextDimensions: PatternDimensions): void => {
    const next = createBlankPattern(
      name,
      nextDimensions,
      `pattern-${crypto.randomUUID()}`,
    );
    setHistory(createDocumentHistory(next));
    setSavedDocument(null);
    setActiveColorId(next.colors[0]?.id ?? "");
    setSelectedCell(null);
    setNewPatternOpen(false);
    fittedDocumentRef.current = null;
    setNotice({ tone: "info", text: "Blank local pattern created." });
  };

  const commitName = (): void => {
    try {
      setHistory((current) =>
        commitDocument(current, renamePattern(current.present, nameDraft)),
      );
      setNotice(null);
    } catch (error) {
      setNameDraft(document.metadata.name);
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Pattern name is invalid.",
      });
    }
  };

  const exportJson = (): void => {
    const serialized = exportPatternJson(document);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = downloadFilename(document.metadata.name);
    anchor.click();
    URL.revokeObjectURL(url);
    setSavedDocument(document);
    setNotice({ tone: "info", text: "Versioned Cocolla JSON exported locally." });
  };

  const importJson = async (file: File): Promise<void> => {
    if (file.size > 25 * 1024 * 1024) {
      setNotice({ tone: "error", text: "Import is limited to 25 MB in this milestone." });
      return;
    }
    try {
      const parsed = parsePatternJson(await file.text());
      setHistory(createDocumentHistory(parsed.document));
      setSavedDocument(parsed.document);
      setActiveColorId(parsed.document.colors[0]?.id ?? "");
      setSelectedCell(null);
      fittedDocumentRef.current = null;
      setNotice({
        tone: parsed.warnings.length === 0 ? "info" : "error",
        text:
          parsed.warnings.length === 0
            ? "Pattern imported and validated."
            : `Imported with warning: ${parsed.warnings.join(" ")}`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? `Import failed: ${error.message}` : "Import failed.",
      });
    } finally {
      if (importInputRef.current !== null) {
        importInputRef.current.value = "";
      }
    }
  };

  const zoomBy = (factor: number): void => {
    setViewport((current) =>
      zoomViewportAt(current, current.zoom * factor, {
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
      }),
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">×</span>
          <div>
            <strong>Cocolla</strong>
            <span>Pattern studio</span>
          </div>
        </div>
        <div className="toolbar-group">
          <button className="button primary compact" onClick={() => setNewPatternOpen(true)}>
            <Icon name="add" /> New pattern
          </button>
          <div className="dimension-chip" title="Pattern dimensions">
            <span>{dimensions.width}</span><i>×</i><span>{dimensions.height}</span>
            <small>cells</small>
          </div>
        </div>
        <div className="toolbar-group toolbar-history">
          <button
            aria-label="Undo"
            className="icon-button"
            disabled={history.past.length === 0}
            onClick={() => setHistory(undoDocument)}
            title="Undo (Ctrl+Z)"
          ><Icon name="undo" /></button>
          <button
            aria-label="Redo"
            className="icon-button"
            disabled={history.future.length === 0}
            onClick={() => setHistory(redoDocument)}
            title="Redo (Ctrl+Y)"
          ><Icon name="redo" /></button>
        </div>
        <div className="toolbar-spacer" />
        <div className="toolbar-group zoom-group">
          <button aria-label="Zoom out" className="icon-button" onClick={() => zoomBy(0.8)}>
            <Icon name="minus" />
          </button>
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <button aria-label="Zoom in" className="icon-button" onClick={() => zoomBy(1.25)}>
            <Icon name="add" />
          </button>
          <button aria-label="Fit pattern" className="icon-button" onClick={() => fitCanvas()} title="Fit pattern">
            <Icon name="fit" />
          </button>
        </div>
        <div className="toolbar-group">
          <input
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) void importJson(file);
            }}
            ref={importInputRef}
            type="file"
          />
          <button className="button secondary compact" onClick={() => importInputRef.current?.click()}>
            <Icon name="upload" /> Import
          </button>
          <button className="button dark compact" onClick={exportJson}>
            <Icon name="download" /> Export JSON
          </button>
        </div>
      </header>

      <main
        className={`workspace ${leftPanelOpen ? "has-left" : ""} ${rightPanelOpen ? "has-right" : ""}`}
      >
        <aside className="sidebar left-sidebar" aria-label="Design tools">
          <div className="sidebar-heading">
            <div><p className="eyebrow">Design</p><h2>Tools</h2></div>
            <button className="panel-toggle" onClick={() => setLeftPanelOpen(false)} aria-label="Collapse tools">‹</button>
          </div>
          <div className="tool-list" role="toolbar" aria-label="Canvas tools">
            {([
              ["pencil", "pencil", "Pencil", "P"],
              ["eraser", "erase", "Eraser", "E"],
              ["pan", "hand", "Hand tool", "H"],
            ] as const).map(([value, icon, label, shortcut]) => (
              <button
                aria-pressed={tool === value}
                className={`tool-button ${tool === value ? "active" : ""}`}
                key={value}
                onClick={() => setTool(value)}
              >
                <span className="tool-icon"><Icon name={icon} size={20} /></span>
                <span><strong>{label}</strong><small>{value === "pencil" ? "Place full crosses" : value === "eraser" ? "Remove stitches" : "Move the fabric"}</small></span>
                <kbd>{shortcut}</kbd>
              </button>
            ))}
          </div>

          <section className="sidebar-section">
            <div className="section-title"><span>Thread color</span><small>{document.colors.length}</small></div>
            <div className="palette-grid">
              {document.colors.map((color) => (
                <button
                  aria-label={color.name}
                  aria-pressed={activeColorId === color.id}
                  className={`swatch ${activeColorId === color.id ? "active" : ""}`}
                  key={color.id}
                  onClick={() => setActiveColorId(selectActiveColor(document, color.id))}
                  style={{ "--swatch": color.rgb } as React.CSSProperties}
                  title={`${color.name} · ${color.symbol}`}
                ><span>{color.symbol}</span></button>
              ))}
            </div>
            <div className="active-color-row">
              <span className="color-dot" style={{ background: document.colors.find((color) => color.id === activeColorId)?.rgb }} />
              <div><strong>{document.colors.find((color) => color.id === activeColorId)?.name}</strong><small>Logical color</small></div>
            </div>
          </section>

          <section className="sidebar-section">
            <div className="section-title"><span>Stitch technique</span></div>
            <div className="technique-card"><span className="mini-cross">×</span><div><strong>Full cross</strong><small>Version 1 · 1 fabric cell</small></div></div>
          </section>

          <section className="sidebar-section canvas-options">
            <label><span><Icon name="grid" /> Show fabric grid</span><input checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} type="checkbox" /></label>
            <label><span><span className="symbol-icon">A</span> Stitch symbols</span><input checked={showSymbols} onChange={(event) => setShowSymbols(event.target.checked)} type="checkbox" /></label>
          </section>
        </aside>

        {!leftPanelOpen ? <button className="edge-toggle left" onClick={() => setLeftPanelOpen(true)} aria-label="Open design tools">›</button> : null}

        <section className="canvas-stage" aria-label="Pattern workspace">
          <PatternCanvas
            document={document}
            onCells={applyCells}
            onHoverCell={setHoverCell}
            onSelectCell={setSelectedCell}
            onSizeChange={setCanvasSize}
            onViewportChange={setViewport}
            selectedCell={selectedCell}
            showGrid={showGrid}
            showSymbols={showSymbols}
            tool={tool}
            viewport={viewport}
          />
          <div className="canvas-floating-info">
            <span className={`save-state ${isDirty ? "dirty" : ""}`}><i />{isDirty ? "Unsaved local changes" : "Local file matches"}</span>
            {notice === null ? null : <span className={`notice ${notice.tone}`}>{notice.text}</span>}
          </div>
          <div className="canvas-statusbar">
            <span>{hoverCell === null ? "Move over the fabric" : `Column ${String(hoverCell.column + 1)}, row ${String(hoverCell.row + 1)}`}</span>
            <span>{tool === "pan" ? "Drag to pan" : tool === "eraser" ? "Drag to erase" : "Drag to stitch"}</span>
            <span>Ctrl + wheel to zoom</span>
          </div>
        </section>

        {!rightPanelOpen ? <button className="edge-toggle right" onClick={() => setRightPanelOpen(true)} aria-label="Open pattern properties">‹</button> : null}

        <aside className="sidebar right-sidebar" aria-label="Pattern properties">
          <div className="sidebar-heading">
            <div><p className="eyebrow">Inspector</p><h2>Pattern</h2></div>
            <button className="panel-toggle" onClick={() => setRightPanelOpen(false)} aria-label="Collapse properties">›</button>
          </div>
          <section className="sidebar-section first">
            <label className="field-label compact-label">
              Pattern name
              <input
                maxLength={120}
                onBlur={commitName}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                value={nameDraft}
              />
            </label>
            <div className="metric-grid">
              <div><span>Width</span><strong>{dimensions.width}</strong><small>cells</small></div>
              <div><span>Height</span><strong>{dimensions.height}</strong><small>cells</small></div>
              <div><span>Stitches</span><strong>{document.stitches.length.toLocaleString()}</strong><small>total</small></div>
              <div><span>Revision</span><strong>{document.revision}</strong><small>local</small></div>
            </div>
          </section>

          <section className="sidebar-section">
            <div className="section-title"><span>Color usage</span><small>{[...usage.values()].filter((count) => count > 0).length} used</small></div>
            <div className="usage-list">
              {document.colors.map((color) => {
                const count = usage.get(color.id) ?? 0;
                return count === 0 ? null : (
                  <div className="usage-row" key={color.id}>
                    <span className="color-dot" style={{ background: color.rgb }} />
                    <span>{color.name}</span><strong>{count.toLocaleString()}</strong>
                  </div>
                );
              })}
              {document.stitches.length === 0 ? <p className="empty-note">Place a stitch to build the palette summary.</p> : null}
            </div>
          </section>

          <section className="sidebar-section">
            <div className="section-title"><span>Selected stitch</span></div>
            {selectedStitch === undefined ? (
              <p className="empty-note">Select a stitched cell to inspect its stable ID and geometry.</p>
            ) : (
              <dl className="property-list">
                <div><dt>ID</dt><dd title={selectedStitch.id}>{selectedStitch.id}</dd></div>
                <div><dt>Technique</dt><dd>{selectedStitch.technique.key} v{selectedStitch.technique.version}</dd></div>
                <div><dt>Cell</dt><dd>{selectedCell?.column}, {selectedCell?.row}</dd></div>
                <div><dt>Element rev.</dt><dd>{selectedStitch.elementRevision}</dd></div>
              </dl>
            )}
          </section>

          <section className="sidebar-section information-card">
            <strong>Local document</strong>
            <p>This milestone has no server storage. Export the versioned JSON file to keep or move your pattern.</p>
            {unsupportedCount > 0 ? <p className="warning-text">{unsupportedCount} unsupported technique {unsupportedCount === 1 ? "element is" : "elements are"} preserved but not rendered.</p> : null}
          </section>
        </aside>
      </main>

      <NewPatternDialog
        initialDimensions={dimensions}
        initialName="Untitled sampler"
        onCancel={() => setNewPatternOpen(false)}
        onCreate={createNewPattern}
        open={newPatternOpen}
      />
    </div>
  );
};
