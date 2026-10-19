import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  PatternDocument,
  PatternRotation,
  StitchElementV1,
} from "../../../packages/engine/src/index.js";
import { Icon } from "./components/Icon.js";
import { ImageImportDialog } from "./components/ImageImportDialog.js";
import { NewPatternDialog } from "./components/NewPatternDialog.js";
import { PatternCanvas } from "./components/PatternCanvas.js";
import { ThreadCatalogPanel } from "./components/ThreadCatalogPanel.js";
import type { ThreadProduct } from "../../../packages/contracts/src/index.js";
import {
  Ciede2000ThreadColorMatcher,
  syntheticThreadCatalog,
} from "../../../packages/thread-catalog/src/index.js";
import {
  colorUsage,
  createBlankPattern,
  drawFullCrossCells,
  eraseFullCrossCells,
  exportPatternJson,
  parsePatternJson,
  renamePattern,
  rotatePattern,
  selectActiveColor,
  setPatternColorSymbol,
  setPatternThreadProduct,
  replacePatternColorWithThread,
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
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_PREFERENCES,
  MAX_DIM_OPACITY,
  MAX_THREAD_THICKNESS,
  MAX_TINT_OPACITY,
  MIN_DIM_OPACITY,
  MIN_THREAD_THICKNESS,
  MIN_TINT_OPACITY,
  parseAppearancePreferences,
  reconcileSelectedColors,
  serializeAppearancePreferences,
  toggleSelectedColor,
  type AppearancePreferences,
  type StitchDisplayMode,
} from "./core/appearance.js";
import {
  CURATED_CHART_SYMBOLS,
  availableCuratedChartSymbols,
} from "./core/chart-symbols.js";
import {
  viewportForWorkspace,
  zoomViewportAt,
  type CellPoint,
  type Viewport,
  type ViewportSize,
  type WorkspaceViewportMode,
} from "./core/viewport.js";

type Notice = { readonly tone: "info" | "error"; readonly text: string } | null;

const INITIAL_DIMENSIONS: PatternDimensions = { width: 40, height: 30 };
const initialDocument = createBlankPattern("Untitled sampler", INITIAL_DIMENSIONS);
const threadColorMatcher = new Ciede2000ThreadColorMatcher();

const loadAppearancePreferences = (): AppearancePreferences => {
  try {
    return parseAppearancePreferences(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
};

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
  const [canvasSize, setCanvasSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [viewportMode, setViewportMode] = useState<WorkspaceViewportMode>("fit");
  const [fitRequest, setFitRequest] = useState(0);
  const [hoverCell, setHoverCell] = useState<CellPoint | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellPoint | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [appearance, setAppearance] = useState(loadAppearancePreferences);
  const [selectedColorIds, setSelectedColorIds] = useState<ReadonlySet<string>>(
    () => new Set(initialDocument.colors[0] === undefined ? [] : [initialDocument.colors[0].id]),
  );
  const [isolationEnabled, setIsolationEnabled] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [newPatternOpen, setNewPatternOpen] = useState(false);
  const [imageImportOpen, setImageImportOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    text: "Local editing only — export JSON to keep your work.",
  });
  const [nameDraft, setNameDraft] = useState(initialDocument.metadata.name);
  const [symbolDraft, setSymbolDraft] = useState(initialDocument.colors[0]?.symbol ?? "");
  const importInputRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef(0);
  const document = history.present;
  const activeColor = document.colors.find((color) => color.id === activeColorId);
  const isolatedColorIds = isolationEnabled ? selectedColorIds : null;
  const availableSymbolValues = useMemo(
    () => new Set(
      availableCuratedChartSymbols(
        document.colors.map((color) => color.symbol),
        activeColor?.symbol ?? "",
      ).map((definition) => definition.value),
    ),
    [activeColor?.symbol, document.colors],
  );

  const nextStitchId = useCallback((): string => {
    idCounterRef.current += 1;
    const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    return `stitch-${randomPart}-${String(idCounterRef.current)}`;
  }, []);

  const requestFit = useCallback((): void => {
    setViewportMode("fit");
    setFitRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    setNameDraft(document.metadata.name);
  }, [document.metadata.name]);

  useEffect(() => {
    setSymbolDraft(activeColor?.symbol ?? "");
  }, [activeColor?.symbol, activeColorId]);

  useEffect(() => {
    if (!document.colors.some((color) => color.id === activeColorId)) {
      setActiveColorId(document.colors[0]?.id ?? "");
    }
  }, [activeColorId, document.colors]);

  useEffect(() => {
    setSelectedColorIds((current) =>
      reconcileSelectedColors(current, document.colors.map((color) => color.id)),
    );
  }, [document.colors]);

  useEffect(() => {
    if (isolationEnabled && selectedColorIds.size === 0) {
      setIsolationEnabled(false);
    }
  }, [isolationEnabled, selectedColorIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        APPEARANCE_STORAGE_KEY,
        serializeAppearancePreferences(appearance),
      );
    } catch {
      // The editor still works when storage is blocked or unavailable.
    }
  }, [appearance]);

  useLayoutEffect(() => {
    if (canvasSize.width <= 1 || canvasSize.height <= 1) {
      return;
    }
    setViewport((current) =>
      viewportForWorkspace(document, canvasSize, current, viewportMode),
    );
  }, [
    canvasSize.height,
    canvasSize.width,
    document.bounds.height,
    document.bounds.width,
    document.coordinateSystem.unitsPerFabricCell,
    fitRequest,
    viewportMode,
  ]);

  const updateManualViewport = useCallback((next: Viewport): void => {
    setViewportMode("manual");
    setViewport(next);
  }, []);

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
    setSelectedColorIds(new Set(next.colors[0] === undefined ? [] : [next.colors[0].id]));
    setIsolationEnabled(false);
    setSelectedCell(null);
    setNewPatternOpen(false);
    requestFit();
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
      setSelectedColorIds(new Set(parsed.document.colors[0] === undefined ? [] : [parsed.document.colors[0].id]));
      setIsolationEnabled(false);
      setSelectedCell(null);
      requestFit();
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
    setViewportMode("manual");
    setViewport((current) =>
      zoomViewportAt(current, current.zoom * factor, {
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
      }),
    );
  };

  const applyRotation = (rotation: PatternRotation): void => {
    try {
      const rotated = rotatePattern(document, rotation);
      setHistory((current) => commitDocument(current, rotated));
      setSelectedCell(null);
      requestFit();
      setNotice({ tone: "info", text: "Pattern rotated and fitted to the workspace." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? `Rotation failed: ${error.message}` : "Rotation failed.",
      });
    }
  };

  const updateAppearance = <Key extends keyof AppearancePreferences>(
    key: Key,
    value: AppearancePreferences[Key],
  ): void => {
    setAppearance((current) => ({ ...current, [key]: value }));
  };

  const commitSymbol = (nextSymbol = symbolDraft): void => {
    setSymbolDraft(nextSymbol);
    if (activeColor === undefined || nextSymbol === activeColor.symbol) {
      return;
    }
    try {
      const updated = setPatternColorSymbol(document, activeColor.id, nextSymbol);
      setHistory(commitDocument(history, updated));
      setNotice({ tone: "info", text: `Symbol for ${activeColor.name} updated.` });
    } catch (error) {
      setSymbolDraft(activeColor.symbol);
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Color symbol is invalid.",
      });
    }
  };

  const assignThreadProduct = (threadProductId: string | null): void => {
    if (activeColor === undefined) return;
    try {
      const updated = setPatternThreadProduct(document, activeColor.id, threadProductId);
      setHistory(commitDocument(history, updated));
      setNotice({
        tone: "info",
        text: threadProductId === null
          ? `Physical thread removed from ${activeColor.name}.`
          : `Physical thread assigned to ${activeColor.name}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Thread assignment failed.",
      });
    }
  };

  const replaceLogicalColor = (product: ThreadProduct): void => {
    if (activeColor === undefined) return;
    try {
      const updated = replacePatternColorWithThread(
        document,
        activeColor.id,
        product,
      );
      setHistory(commitDocument(history, updated));
      setNotice({
        tone: "info",
        text: `${activeColor.name} replaced with ${product.name}; stitch references and symbol preserved.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Logical color replacement failed.",
      });
    }
  };

  const applyImagePattern = (next: PatternDocument): void => {
    setHistory((current) => commitDocument(current, next));
    setActiveColorId(next.colors[0]?.id ?? "");
    setSelectedColorIds(new Set(next.colors[0] === undefined ? [] : [next.colors[0].id]));
    setIsolationEnabled(false);
    setSelectedCell(null);
    setImageImportOpen(false);
    requestFit();
    setNotice({
      tone: "info",
      text: `Created ${next.bounds.width / next.coordinateSystem.unitsPerFabricCell} × ${next.bounds.height / next.coordinateSystem.unitsPerFabricCell} image pattern locally.`,
    });
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
        <details className="transform-menu">
          <summary className="button secondary compact">
            <Icon name="rotate-cw" /> Transform
          </summary>
          <div className="transform-popover" role="menu" aria-label="Pattern transforms">
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                applyRotation("clockwise-90");
              }}
              role="menuitem"
            ><Icon name="rotate-cw" /> Rotate 90° clockwise</button>
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                applyRotation("counterclockwise-90");
              }}
              role="menuitem"
            ><Icon name="rotate-ccw" /> Rotate 90° counterclockwise</button>
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                applyRotation("180");
              }}
              role="menuitem"
            ><span className="turn-180" aria-hidden="true">180°</span> Rotate 180°</button>
          </div>
        </details>
        <div className="toolbar-spacer" />
        <div className="toolbar-group zoom-group">
          <button aria-label="Zoom out" className="icon-button" onClick={() => zoomBy(0.8)}>
            <Icon name="minus" />
          </button>
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <button aria-label="Zoom in" className="icon-button" onClick={() => zoomBy(1.25)}>
            <Icon name="add" />
          </button>
          <button aria-label="Fit pattern" className="icon-button" onClick={requestFit} title="Fit pattern">
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
            <Icon name="upload" /> Import JSON
          </button>
          <button className="button secondary compact" onClick={() => setImageImportOpen(true)}>
            <Icon name="image" /> Import image
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
              <span className="color-dot" style={{ background: activeColor?.rgb }} />
              <div><strong>{activeColor?.name}</strong><small>Logical color</small></div>
            </div>
            <label className="field-label symbol-field">
              Chart symbol
              <input
                aria-label="Chart symbol for active color"
                maxLength={8}
                onBlur={() => commitSymbol()}
                onChange={(event) => setSymbolDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                value={symbolDraft}
              />
            </label>
            <div aria-label="Curated chart symbols" className="symbol-picker" role="listbox">
              {CURATED_CHART_SYMBOLS.map((definition) => {
                const selected = activeColor?.symbol === definition.value;
                const available = availableSymbolValues.has(definition.value);
                return (
                  <button
                    aria-label={definition.label}
                    aria-selected={selected}
                    className={selected ? "selected" : ""}
                    disabled={!available}
                    key={definition.value}
                    onClick={() => commitSymbol(definition.value)}
                    role="option"
                    title={available ? definition.label : `${definition.label} · already assigned`}
                    type="button"
                  >{definition.value}</button>
                );
              })}
            </div>
          </section>

          <ThreadCatalogPanel
            activeColor={activeColor}
            catalog={syntheticThreadCatalog}
            matcher={threadColorMatcher}
            onAssign={(productId) => assignThreadProduct(productId)}
            onRemove={() => assignThreadProduct(null)}
            onReplace={replaceLogicalColor}
          />

          <section className="sidebar-section">
            <div className="section-title"><span>Stitch technique</span></div>
            <div className="technique-card"><span className="mini-cross">×</span><div><strong>Full cross</strong><small>Version 1 · 1 fabric cell</small></div></div>
          </section>

          <section className="sidebar-section canvas-options">
            <label><span><Icon name="grid" /> Show fabric grid</span><input checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} type="checkbox" /></label>
            <label className="stacked-option">
              <span><span className="symbol-icon">A</span> Stitch display</span>
              <select
                aria-label="Stitch display mode"
                onChange={(event) => updateAppearance("displayMode", event.target.value as StitchDisplayMode)}
                value={appearance.displayMode}
              >
                <option value="color">Color</option>
                <option value="symbol">Symbols</option>
                <option value="color-symbol">Color + symbols</option>
              </select>
            </label>
            <label className="range-option">
              <span>Thread thickness <output>{Math.round(appearance.threadThickness * 100)}%</output></span>
              <input
                aria-label="Thread thickness"
                max={MAX_THREAD_THICKNESS}
                min={MIN_THREAD_THICKNESS}
                onChange={(event) => updateAppearance("threadThickness", event.target.valueAsNumber)}
                step="0.01"
                type="range"
                value={appearance.threadThickness}
              />
            </label>
            <label><span>Cell background tint</span><input checked={appearance.cellTintEnabled} onChange={(event) => updateAppearance("cellTintEnabled", event.target.checked)} type="checkbox" /></label>
            {appearance.cellTintEnabled ? (
              <label className="range-option">
                <span>Tint intensity <output>{Math.round(appearance.cellTintOpacity * 100)}%</output></span>
                <input
                  aria-label="Cell tint intensity"
                  max={MAX_TINT_OPACITY}
                  min={MIN_TINT_OPACITY}
                  onChange={(event) => updateAppearance("cellTintOpacity", event.target.valueAsNumber)}
                  step="0.01"
                  type="range"
                  value={appearance.cellTintOpacity}
                />
              </label>
            ) : null}
          </section>
        </aside>

        {!leftPanelOpen ? <button className="edge-toggle left" onClick={() => setLeftPanelOpen(true)} aria-label="Open design tools">›</button> : null}

        <section className="canvas-stage" aria-label="Pattern workspace">
          <PatternCanvas
            document={document}
            appearance={appearance}
            isolatedColorIds={isolatedColorIds}
            onCells={applyCells}
            onHoverCell={setHoverCell}
            onSelectCell={setSelectedCell}
            onSizeChange={setCanvasSize}
            onViewportChange={updateManualViewport}
            selectedCell={selectedCell}
            showGrid={showGrid}
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
            <span>Wheel to zoom</span>
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
            <div className="filter-actions">
              <button className="button secondary compact" onClick={() => setIsolationEnabled(false)}>Show all</button>
              <button
                className="button primary compact"
                disabled={selectedColorIds.size === 0}
                onClick={() => setIsolationEnabled(true)}
              >Isolate selected</button>
            </div>
            <div className="usage-list">
              {document.colors.map((color) => {
                const count = usage.get(color.id) ?? 0;
                return (
                  <label className={`usage-row ${isolationEnabled && selectedColorIds.has(color.id) ? "isolated" : ""}`} key={color.id}>
                    <input
                      aria-label={`Select ${color.name} for isolation`}
                      checked={selectedColorIds.has(color.id)}
                      onChange={() => setSelectedColorIds((current) => toggleSelectedColor(current, color.id))}
                      type="checkbox"
                    />
                    <span className="color-dot" style={{ background: color.rgb }} />
                    <span>{color.symbol} · {color.name}</span><strong>{count.toLocaleString()}</strong>
                  </label>
                );
              })}
            </div>
            <label className="range-option dim-opacity">
              <span>Unselected opacity <output>{Math.round(appearance.dimOpacity * 100)}%</output></span>
              <input
                aria-label="Unselected color opacity"
                max={MAX_DIM_OPACITY}
                min={MIN_DIM_OPACITY}
                onChange={(event) => updateAppearance("dimOpacity", event.target.valueAsNumber)}
                step="0.01"
                type="range"
                value={appearance.dimOpacity}
              />
            </label>
            {document.stitches.length === 0 ? <p className="empty-note">Place a stitch to build the palette summary.</p> : null}
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
      {imageImportOpen ? (
        <ImageImportDialog
          currentDocument={document}
          isDirty={isDirty}
          onApply={applyImagePattern}
          onCancel={() => setImageImportOpen(false)}
        />
      ) : null}
    </div>
  );
};
