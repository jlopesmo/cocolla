import { useEffect, useRef, useState } from "react";

import type { PatternDocument } from "../../../../packages/engine/src/index.js";
import {
  MAX_IMAGE_PATTERN_COLORS,
  MAX_IMAGE_PATTERN_DIMENSION,
  MIN_IMAGE_PATTERN_COLORS,
  boundedImagePatternDimensions,
  defaultImagePatternDimensions,
  imageConversionPreviewPixels,
  lockedImagePatternDimensions,
  type ImageConversionResult,
} from "../core/image-conversion.js";
import {
  imagePatternName,
  type DecodedImageSource,
} from "../core/image-file.js";
import { createPatternFromImageConversion, rgbToHex } from "../core/image-pattern.js";
import {
  acceptCurrentConversionResult,
  type ImageConversionWorkerRequest,
  type ImageConversionWorkerResponse,
} from "../core/image-worker-contract.js";
import { decodeImageFile } from "../image-decode.js";

interface LoadedImage {
  readonly fileName: string;
  readonly format: string;
  readonly width: number;
  readonly height: number;
  readonly previewUrl: string;
}

interface ImageImportDialogProps {
  readonly currentDocument: PatternDocument;
  readonly isDirty: boolean;
  readonly onApply: (document: PatternDocument) => void;
  readonly onCancel: () => void;
}

const workerUrl = new URL("../workers/image-conversion.worker.ts", import.meta.url);

export const ImageImportDialog = ({
  currentDocument,
  isDirty,
  onApply,
  onCancel,
}: ImageImportDialogProps): React.JSX.Element => {
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [patternName, setPatternName] = useState("Imported image pattern");
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(80);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [maxColors, setMaxColors] = useState(12);
  const [dither, setDither] = useState(false);
  const [result, setResult] = useState<ImageConversionResult | null>(null);
  const [converting, setConverting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const sourcePreviewRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const loadIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadIdRef.current += 1;
      workerRef.current?.terminate();
      if (sourcePreviewRef.current !== null) {
        URL.revokeObjectURL(sourcePreviewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (source === null || workerRef.current === null) {
      return;
    }
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setConverting(true);
    setError(null);
    setConfirmReplace(false);
    const timer = window.setTimeout(() => {
      const request: ImageConversionWorkerRequest = {
        type: "convert",
        requestId,
        options: { width, height, maxColors, dither },
      };
      workerRef.current?.postMessage(request);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [dither, height, maxColors, source, width]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas === null || result === null) {
      return;
    }
    canvas.width = result.width;
    canvas.height = result.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }
    const imageData = context.createImageData(result.width, result.height);
    imageData.data.set(imageConversionPreviewPixels(result));
    context.putImageData(imageData, 0, 0);
  }, [result]);

  const installDecodedImage = (decoded: DecodedImageSource): void => {
    workerRef.current?.terminate();
    if (sourcePreviewRef.current !== null) {
      URL.revokeObjectURL(sourcePreviewRef.current);
    }
    sourcePreviewRef.current = decoded.previewUrl;
    const worker = new Worker(workerUrl, { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ImageConversionWorkerResponse>): void => {
      const response = event.data;
      if (response.type === "error") {
        if (response.requestId === requestIdRef.current) {
          setConverting(false);
          setError(response.message);
        }
        return;
      }
      setResult((previous) =>
        acceptCurrentConversionResult(
          requestIdRef.current,
          previous,
          response.requestId,
          response.result,
        ),
      );
      if (response.requestId === requestIdRef.current) {
        setElapsedMs(response.elapsedMs);
        setConverting(false);
      }
    };
    worker.onerror = (): void => {
      setConverting(false);
      setError("The conversion worker stopped unexpectedly.");
    };
    const sourceRequest: ImageConversionWorkerRequest = {
      type: "source",
      width: decoded.decodedWidth,
      height: decoded.decodedHeight,
      pixels: decoded.pixels,
    };
    worker.postMessage(sourceRequest, [decoded.pixels.buffer as ArrayBuffer]);
    const dimensions = defaultImagePatternDimensions(decoded.width, decoded.height);
    setWidth(dimensions.width);
    setHeight(dimensions.height);
    setPatternName(imagePatternName(decoded.fileName));
    setSource({
      fileName: decoded.fileName,
      format: decoded.format,
      width: decoded.width,
      height: decoded.height,
      previewUrl: decoded.previewUrl,
    });
    setResult(null);
    setElapsedMs(null);
    setConfirmReplace(false);
  };

  const loadFile = async (file: File): Promise<void> => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    setError(null);
    setConverting(true);
    setConfirmReplace(false);
    try {
      const decoded = await decodeImageFile(file);
      if (!mountedRef.current || loadId !== loadIdRef.current) {
        URL.revokeObjectURL(decoded.previewUrl);
        return;
      }
      installDecodedImage(decoded);
    } catch (caught) {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setConverting(false);
        setError(caught instanceof Error ? caught.message : "Image import failed.");
      }
    } finally {
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = "";
      }
    }
  };

  const changeDimension = (
    value: number,
    axis: "width" | "height",
  ): void => {
    if (!Number.isFinite(value) || source === null) {
      return;
    }
    const next = aspectLocked
      ? lockedImagePatternDimensions(source.width, source.height, value, axis)
      : boundedImagePatternDimensions(
          axis === "width" ? value : width,
          axis === "height" ? value : height,
          axis,
        );
    setWidth(next.width);
    setHeight(next.height);
  };

  const applyResult = (): void => {
    if (result === null) {
      return;
    }
    try {
      const document = createPatternFromImageConversion({
        id: `pattern-${crypto.randomUUID()}`,
        name: patternName,
        conversion: result,
      });
      onApply(document);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The pattern could not be created.");
    }
  };

  const requestApply = (): void => {
    if (isDirty) {
      setConfirmReplace(true);
    } else {
      applyResult();
    }
  };

  return (
    <div className="dialog-backdrop image-import-backdrop" role="presentation">
      <section
        aria-labelledby="image-import-title"
        aria-modal="true"
        className="dialog-card image-import-dialog"
        role="dialog"
      >
        <div className="dialog-heading image-import-heading">
          <div>
            <p className="eyebrow">Local conversion</p>
            <h2 id="image-import-title">Image to pattern</h2>
            <p>PNG, JPEG, or WebP. Your original image stays in this browser.</p>
          </div>
          <button aria-label="Close image import" className="panel-toggle" onClick={onCancel}>×</button>
        </div>

        {source === null ? (
          <div
            className={`image-drop-zone ${dragging ? "dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file !== undefined) void loadFile(file);
            }}
          >
            <div className="image-drop-mark" aria-hidden="true">▧</div>
            <strong>Drop an image here</strong>
            <span>Up to 20 MB and 25 million source pixels</span>
            <button className="button primary" onClick={() => fileInputRef.current?.click()} type="button">
              Choose image
            </button>
          </div>
        ) : (
          <div className="image-conversion-workspace">
            <div className="image-preview-column">
              <div className="image-preview-card">
                <div className="image-preview-label"><strong>Source preview</strong><span>{source.width} × {source.height}</span></div>
                <div className="image-preview-surface checkerboard">
                  <img alt={`Source preview of ${source.fileName}`} src={source.previewUrl} />
                </div>
              </div>
              <div className="image-preview-card">
                <div className="image-preview-label">
                  <strong>Pattern preview</strong>
                  <span>{converting ? "Converting…" : `${String(width)} × ${String(height)} cells`}</span>
                </div>
                <div className="image-preview-surface checkerboard">
                  <canvas aria-label="Converted pattern preview" className="image-pattern-preview" ref={previewCanvasRef} />
                </div>
              </div>
            </div>

            <div className="image-controls-column">
              <label className="field-label">
                Pattern name
                <input maxLength={120} onChange={(event) => setPatternName(event.target.value)} value={patternName} />
              </label>
              <div className="dimension-fields">
                <label className="field-label">Width
                  <span className="number-input-wrap">
                    <input aria-label="Image pattern width" max={MAX_IMAGE_PATTERN_DIMENSION} min="1" onChange={(event) => changeDimension(event.target.valueAsNumber, "width")} type="number" value={width} />
                    <span>cells</span>
                  </span>
                </label>
                <label className="field-label">Height
                  <span className="number-input-wrap">
                    <input aria-label="Image pattern height" max={MAX_IMAGE_PATTERN_DIMENSION} min="1" onChange={(event) => changeDimension(event.target.valueAsNumber, "height")} type="number" value={height} />
                    <span>cells</span>
                  </span>
                </label>
              </div>
              <label className="image-toggle-row">
                <span>Lock source aspect ratio</span>
                <input checked={aspectLocked} onChange={(event) => setAspectLocked(event.target.checked)} type="checkbox" />
              </label>
              <label className="range-option image-range">
                <span>Maximum colors <output>{maxColors}</output></span>
                <input aria-label="Maximum pattern colors" max={MAX_IMAGE_PATTERN_COLORS} min={MIN_IMAGE_PATTERN_COLORS} onChange={(event) => setMaxColors(event.target.valueAsNumber)} step="1" type="range" value={maxColors} />
              </label>
              <label className="image-toggle-row">
                <span><strong>Dithering</strong><small>Mix palette colors to preserve gradients</small></span>
                <input checked={dither} onChange={(event) => setDither(event.target.checked)} type="checkbox" />
              </label>

              <div className="image-result-summary">
                <div><span>Estimated stitches</span><strong>{result?.stitchCount.toLocaleString() ?? "—"}</strong></div>
                <div><span>Palette colors</span><strong>{result?.palette.length ?? "—"}</strong></div>
                <div><span>Conversion</span><strong>{elapsedMs === null ? "—" : `${elapsedMs.toFixed(0)} ms`}</strong></div>
              </div>
              <div className="image-palette" aria-label="Resulting color palette">
                {result?.palette.map((color, index) => (
                  <span key={`${rgbToHex(color)}-${String(index)}`} style={{ background: rgbToHex(color) }} title={rgbToHex(color)} />
                ))}
              </div>
              <p className="image-policy-note">Fully transparent cells remain empty fabric. Partial transparency is blended onto white.</p>
              <button className="button secondary" onClick={() => fileInputRef.current?.click()} type="button">Choose a different image</button>
            </div>
          </div>
        )}

        <input
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void loadFile(file);
          }}
          ref={fileInputRef}
          type="file"
        />
        {error === null ? null : <p className="form-error image-import-error">{error}</p>}
        {confirmReplace ? (
          <div className="replace-warning" role="alert">
            <div><strong>Replace the current pattern?</strong><span>Your unsaved pattern stays available only through Undo after replacement.</span></div>
            <button className="button secondary compact" onClick={() => setConfirmReplace(false)} type="button">Keep editing</button>
            <button className="button primary compact" onClick={applyResult} type="button">Replace pattern</button>
          </div>
        ) : null}
        <div className="dialog-actions image-import-actions">
          <button className="button secondary" onClick={onCancel} type="button">Cancel</button>
          <button className="button primary" disabled={source === null || result === null || converting || patternName.trim().length === 0} onClick={requestApply} type="button">
            Create pattern
          </button>
        </div>
        <span className="image-current-name">Current pattern: {currentDocument.metadata.name}</span>
      </section>
    </div>
  );
};
