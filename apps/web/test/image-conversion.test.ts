import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  deserializePatternDocument,
  serializePatternDocument,
  validatePatternDocument,
} from "../../../packages/engine/src/index.js";
import {
  boundedImagePatternDimensions,
  convertImagePixels,
  defaultImagePatternDimensions,
  lockedImagePatternDimensions,
  type ImageConversionResult,
  type ImagePixelSource,
} from "../src/core/image-conversion.js";
import {
  ImageImportError,
  MAX_IMAGE_FILE_BYTES,
  boundedDecodeDimensions,
  imagePatternName,
  inspectImageBytes,
  validateImageMetadata,
} from "../src/core/image-file.js";
import {
  createPatternFromImageConversion,
  selectImageImportReplacement,
} from "../src/core/image-pattern.js";
import { acceptCurrentConversionResult } from "../src/core/image-worker-contract.js";
import { CURATED_CHART_SYMBOLS } from "../src/core/chart-symbols.js";
import {
  drawFullCrossCells,
  exportPatternJson,
  rotatePattern,
  setPatternColorSymbol,
} from "../src/core/pattern.js";

const pixels = (
  width: number,
  height: number,
  values: readonly (readonly [number, number, number, number])[],
): ImagePixelSource => ({
  width,
  height,
  data: new Uint8ClampedArray(values.flat()),
});

test("image dimensions preserve aspect ratio and remain within stitch caps", () => {
  assert.deepEqual(defaultImagePatternDimensions(1600, 900), { width: 80, height: 45 });
  assert.deepEqual(defaultImagePatternDimensions(900, 1600), { width: 45, height: 80 });
  assert.deepEqual(lockedImagePatternDimensions(1600, 900, 200, "width"), {
    width: 200,
    height: 113,
  });
  const capped = lockedImagePatternDimensions(4000, 3000, 500, "width");
  assert.ok(capped.width * capped.height <= 100_000);
  assert.deepEqual(boundedImagePatternDimensions(500, 500, "width"), {
    width: 500,
    height: 200,
  });
});

test("median-cut quantization is deterministic and honors color limits", () => {
  const source = pixels(4, 1, [
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [255, 255, 0, 255],
  ]);
  const options = { width: 4, height: 1, maxColors: 2, dither: false };
  const first = convertImagePixels(source, options);
  const second = convertImagePixels(source, options);
  assert.ok(first.palette.length <= 2);
  assert.deepEqual(first.palette, second.palette);
  assert.deepEqual([...first.colorIndices], [...second.colorIndices]);
});

test("Floyd-Steinberg dithering is explicit, deterministic, and changes gradients", () => {
  const gradient = pixels(
    16,
    1,
    Array.from({ length: 16 }, (_, index) => {
      const value = Math.round(index * 255 / 15);
      return [value, value, value, 255] as const;
    }),
  );
  const plain = convertImagePixels(gradient, {
    width: 16,
    height: 1,
    maxColors: 2,
    dither: false,
  });
  const dithered = convertImagePixels(gradient, {
    width: 16,
    height: 1,
    maxColors: 2,
    dither: true,
  });
  const repeated = convertImagePixels(gradient, {
    width: 16,
    height: 1,
    maxColors: 2,
    dither: true,
  });
  assert.notDeepEqual([...plain.colorIndices], [...dithered.colorIndices]);
  assert.deepEqual([...dithered.colorIndices], [...repeated.colorIndices]);
});

test("fully transparent output cells stay empty and partial alpha composites on white", () => {
  const converted = convertImagePixels(
    pixels(2, 1, [
      [255, 0, 0, 0],
      [0, 0, 0, 128],
    ]),
    { width: 2, height: 1, maxColors: 4, dither: false },
  );
  assert.deepEqual([...converted.colorIndices], [-1, 0]);
  assert.equal(converted.stitchCount, 1);
  assert.deepEqual(converted.palette, [{ r: 127, g: 127, b: 127 }]);
});

test("very low but nonzero alpha remains a visible stitch", () => {
  const converted = convertImagePixels(
    pixels(2, 1, [
      [255, 0, 0, 0],
      [0, 0, 0, 1],
    ]),
    { width: 2, height: 1, maxColors: 4, dither: false },
  );

  assert.deepEqual([...converted.colorIndices], [-1, 0]);
  assert.equal(converted.stitchCount, 1);
  assert.deepEqual(converted.palette, [{ r: 254, g: 254, b: 254 }]);
});

test("PNG, JPEG, and WebP headers expose dimensions without decoding", () => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.set([73, 72, 68, 82], 12);
  new DataView(png.buffer).setUint32(16, 320, false);
  new DataView(png.buffer).setUint32(20, 200, false);
  assert.deepEqual(inspectImageBytes(png), {
    format: "png", mimeType: "image/png", width: 320, height: 200,
  });

  const jpeg = new Uint8Array(21);
  jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xc8, 0x01, 0x40]);
  assert.deepEqual(inspectImageBytes(jpeg), {
    format: "jpeg", mimeType: "image/jpeg", width: 320, height: 200,
  });

  const webp = new Uint8Array(30);
  webp.set([82, 73, 70, 70], 0);
  webp.set([87, 69, 66, 80], 8);
  webp.set([86, 80, 56, 88], 12);
  webp.set([0x3f, 0x01, 0x00, 0xc7, 0x00, 0x00], 24);
  assert.deepEqual(inspectImageBytes(webp), {
    format: "webp", mimeType: "image/webp", width: 320, height: 200,
  });
});

test("invalid, mismatched, and oversized image metadata fail explicitly", () => {
  assert.throws(
    () => inspectImageBytes(new Uint8Array([1, 2, 3, 4])),
    ImageImportError,
  );
  const metadata = { format: "png" as const, mimeType: "image/png" as const, width: 100, height: 100 };
  assert.throws(
    () => validateImageMetadata(metadata, MAX_IMAGE_FILE_BYTES + 1),
    { code: "IMAGE_FILE_TOO_LARGE" },
  );
  assert.throws(
    () => validateImageMetadata(metadata, 100, "image/jpeg"),
    { code: "IMAGE_TYPE_MISMATCH" },
  );
  assert.throws(
    () => validateImageMetadata({ ...metadata, width: 8_193 }, 100),
    { code: "IMAGE_DIMENSIONS_TOO_LARGE" },
  );
  const bounded = boundedDecodeDimensions(8_000, 3_000);
  assert.ok(bounded.width * bounded.height <= 2_000_000);
  assert.ok(bounded.width <= 1_600);
});

test("native pattern generation uses stable ids, unique symbols, and valid geometry", () => {
  const conversion: ImageConversionResult = {
    width: 2,
    height: 2,
    palette: [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }],
    colorIndices: new Int16Array([0, 1, -1, 0]),
    stitchCount: 3,
  };
  const document = createPatternFromImageConversion({
    id: "pattern-image-test",
    name: "Image test",
    conversion,
  });
  assert.equal(validatePatternDocument(document).valid, true);
  assert.deepEqual(document.stitches.map((stitch) => stitch.id), [
    "stitch-r0-c0", "stitch-r0-c1", "stitch-r1-c1",
  ]);
  assert.deepEqual(document.stitches.map((stitch) => stitch.geometry.anchor), [
    { x: 0, y: 0 }, { x: 1024, y: 0 }, { x: 1024, y: 1024 },
  ]);
  assert.equal(new Set(document.colors.map((color) => color.symbol)).size, 2);
  assert.deepEqual(
    document.colors.map((color) => color.symbol),
    CURATED_CHART_SYMBOLS.slice(0, 2).map((definition) => definition.value),
  );
  const serialized = exportPatternJson(document);
  assert.equal(serializePatternDocument(deserializePatternDocument(serialized)), serialized);
});

test("generated image patterns remain compatible with editor operations", () => {
  const conversion = convertImagePixels(
    pixels(2, 2, [
      [255, 0, 0, 255], [0, 0, 255, 255],
      [0, 0, 0, 0], [255, 0, 0, 255],
    ]),
    { width: 2, height: 2, maxColors: 2, dither: false },
  );
  const generated = createPatternFromImageConversion({
    id: "pattern-compatible",
    name: "Compatible",
    conversion,
  });
  const drawn = drawFullCrossCells(
    generated,
    [{ column: 0, row: 1 }],
    generated.colors[0]?.id ?? "",
    () => "stitch-added-after-import",
  );
  const symbolChanged = setPatternColorSymbol(
    drawn,
    drawn.colors[0]?.id ?? "",
    "★",
  );
  const rotated = rotatePattern(symbolChanged, "clockwise-90");
  assert.equal(rotated.stitches.length, 4);
  assert.equal(validatePatternDocument(rotated).valid, true);
});

test("stale conversion results and unconfirmed replacement preserve current state", () => {
  const currentResult = { label: "current" };
  const staleResult = { label: "stale" };
  assert.equal(acceptCurrentConversionResult(3, currentResult, 2, staleResult), currentResult);
  assert.equal(acceptCurrentConversionResult(3, currentResult, 3, staleResult), staleResult);

  const conversion = convertImagePixels(
    pixels(1, 1, [[0, 0, 0, 255]]),
    { width: 1, height: 1, maxColors: 2, dither: false },
  );
  const current = createPatternFromImageConversion({ id: "pattern-current", name: "Current", conversion });
  const candidate = createPatternFromImageConversion({ id: "pattern-candidate", name: "Candidate", conversion });
  assert.equal(selectImageImportReplacement(current, candidate, false), current);
  assert.equal(selectImageImportReplacement(current, candidate, true), candidate);
  assert.equal(imagePatternName("photo.webp"), "photo pattern");
});

test("bounded 100,000-cell conversion remains below a broad responsiveness ceiling", () => {
  const width = 800;
  const height = 500;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = index % 256;
    data[index * 4 + 1] = Math.floor(index / width) % 256;
    data[index * 4 + 2] = (index * 17) % 256;
    data[index * 4 + 3] = 255;
  }
  const started = performance.now();
  const result = convertImagePixels(
    { width, height, data },
    { width: 400, height: 250, maxColors: 16, dither: true },
  );
  const elapsedMs = performance.now() - started;
  assert.equal(result.stitchCount, 100_000);
  assert.ok(result.palette.length <= 16);
  assert.ok(elapsedMs < 5_000, `Conversion exceeded 5,000 ms: ${elapsedMs.toFixed(1)} ms`);
});

test("100,000-cell native document generation remains below a broad apply ceiling", () => {
  const width = 400;
  const height = 250;
  const palette = Array.from({ length: 16 }, (_, index) => ({
    r: index * 16,
    g: 255 - index * 16,
    b: (index * 37) % 256,
  }));
  const colorIndices = new Int16Array(width * height);
  for (let index = 0; index < colorIndices.length; index += 1) {
    colorIndices[index] = index % palette.length;
  }
  const started = performance.now();
  const document = createPatternFromImageConversion({
    id: "pattern-performance",
    name: "Performance",
    conversion: {
      width,
      height,
      palette,
      colorIndices,
      stitchCount: colorIndices.length,
    },
  });
  const elapsedMs = performance.now() - started;
  assert.equal(document.stitches.length, 100_000);
  assert.ok(elapsedMs < 5_000, `Document apply exceeded 5,000 ms: ${elapsedMs.toFixed(1)} ms`);
});
