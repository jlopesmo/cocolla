# ADR 0006 — Local image-to-pattern conversion

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.4.2

## Context

Cocolla needs to convert photographs and illustrations into editable cross-stitch patterns while preserving privacy, document compatibility, browser responsiveness, and the UI-independent engine boundary. Source images can be much larger than useful stitch grids, and repeated live previews must not block editing or let stale work overwrite newer settings.

## Decision

- Accept PNG, JPEG, and WebP locally. Inspect file signatures and dimensions before decoding, reject declared/content type mismatches, and never upload or retain the original image in the pattern document.
- Limit files to 20 MB, source images to 8,192 pixels per side and 25 million pixels, decoded working images to 1,600 pixels per side and two million pixels, and converted patterns to 500 cells per side and 100,000 total cells.
- Use browser-native `createImageBitmap` resizing followed by bounded Canvas pixel extraction. The bounded result is transferred to a dedicated Web Worker once per selected image.
- Downsample into the target fabric grid using deterministic box averaging. Fully transparent output cells become empty fabric; partially transparent pixels are composited onto white before averaging and quantization.
- Use a dependency-free deterministic median-cut quantizer. It fits the bounded palette requirement, uses a frequency histogram rather than retaining another full source-pixel object graph, and produces repeatable output with stable tie-breaking.
- Offer optional standard left-to-right Floyd–Steinberg error diffusion. Dithering is off by default because it increases isolated stitches and can make small motifs noisier.
- Debounce preview requests by 180 ms. Tag requests monotonically and ignore responses that do not match the newest request. Closing the dialog or replacing the source terminates its worker.
- Generate native version 1 documents using the existing integer coordinate system and full-cross technique. Color and stitch identifiers derive deterministically from palette entries and row/column positions; unique chart symbols come from the existing portable color field. Validate the complete document before applying it.
- Keep decoding at the browser boundary, conversion and file-header validation in pure TypeScript modules, and document construction independent of React. Applying a conversion is an explicit history commit; preview and Cancel never mutate the current pattern.

## Consequences

- No new dependency, remote service, AI feature, document version, or engine/render coupling is introduced. `repoinspire.md` does not change.
- Imported patterns immediately support editing, history, rotation, fit, appearance controls, isolation, and canonical JSON export.
- Median cut and RGB squared distance are pragmatic chart-generation choices, not perceptual color science. ICC profiles, gamma-aware averaging, thread-product matching, foreground segmentation, and advanced palette cleanup remain future work.
- `createImageBitmap` implementations may transiently use more memory than the resized output; source file, dimension, and pixel caps limit that risk. Native document creation/validation on Apply can still cause a short main-thread pause at the 100,000-cell ceiling.
- Every non-transparent output cell becomes one full cross. The estimated stitch count therefore excludes only fully transparent cells and does not attempt background removal.

## Verification evidence

- Pure tests cover dimensions, palette determinism/limits, dithering, transparency, all supported headers, invalid limits, stable native documents, serialization, stale requests, replacement preservation, editor compatibility, and 100,000-cell conversion/document-generation regressions.
- Headless Edge QA exercises actual PNG/JPEG/WebP decoding, dialog controls, the mounted drag-and-drop path, cancellation, replacement confirmation, native application, rotation, and undo. Exact results and limitations are recorded in `docs/icm/current-state.md`.
