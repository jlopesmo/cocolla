import {
  DEFAULT_UNITS_PER_FABRIC_CELL,
  assertValidPatternDocument,
  createPatternDocument,
  type PatternColorV1,
  type PatternDocument,
  type StitchElementV1,
} from "../../../../packages/engine/src/index.js";

import type { ImageConversionResult, RgbColor } from "./image-conversion.js";
import { CURATED_CHART_SYMBOLS } from "./chart-symbols.js";

export const IMAGE_IMPORT_SYMBOLS = CURATED_CHART_SYMBOLS.map(
  (definition) => definition.value,
);

const hexadecimal = (value: number): string =>
  Math.round(value).toString(16).padStart(2, "0").toUpperCase();

export const rgbToHex = (color: RgbColor): string =>
  `#${hexadecimal(color.r)}${hexadecimal(color.g)}${hexadecimal(color.b)}`;

export interface CreateImagePatternInput {
  readonly id: string;
  readonly name: string;
  readonly conversion: ImageConversionResult;
}

export const createPatternFromImageConversion = (
  input: CreateImagePatternInput,
): PatternDocument => {
  if (input.conversion.palette.length > IMAGE_IMPORT_SYMBOLS.length) {
    throw new RangeError("The converted palette exceeds the available default symbols.");
  }
  const palette = input.conversion.palette.length === 0
    ? [{ r: 255, g: 255, b: 255 }]
    : input.conversion.palette;
  const colors: PatternColorV1[] = palette.map((color, index) => {
    const hex = rgbToHex(color);
    return {
      id: `color-import-${String(index).padStart(2, "0")}-${hex.slice(1).toLowerCase()}`,
      name: `Imported ${hex}`,
      rgb: hex,
      symbol: IMAGE_IMPORT_SYMBOLS[index] ?? `S${String(index)}`,
      threadProductId: null,
    };
  });
  const base = createPatternDocument({
    id: input.id,
    name: input.name.trim(),
    width: input.conversion.width * DEFAULT_UNITS_PER_FABRIC_CELL,
    height: input.conversion.height * DEFAULT_UNITS_PER_FABRIC_CELL,
    layers: [{ id: "layer-main", name: "Main", order: 0 }],
    colors,
    extensions: {
      imageImport: {
        transparencyPolicy: "transparent-cells-empty-partial-alpha-on-white",
      },
    },
  });
  const rowDigits = String(Math.max(0, input.conversion.height - 1)).length;
  const columnDigits = String(Math.max(0, input.conversion.width - 1)).length;
  const stitches: StitchElementV1[] = [];
  for (let row = 0; row < input.conversion.height; row += 1) {
    for (let column = 0; column < input.conversion.width; column += 1) {
      const pixelIndex = row * input.conversion.width + column;
      const colorIndex = input.conversion.colorIndices[pixelIndex] ?? -1;
      if (colorIndex < 0) {
        continue;
      }
      const color = colors[colorIndex];
      if (color === undefined) {
        throw new RangeError(`Converted pixel references missing palette index ${String(colorIndex)}.`);
      }
      stitches.push({
        id: `stitch-r${String(row).padStart(rowDigits, "0")}-c${String(column).padStart(columnDigits, "0")}`,
        technique: { key: "full-cross", version: 1 },
        layerId: "layer-main",
        colorId: color.id,
        geometry: {
          anchor: {
            x: column * DEFAULT_UNITS_PER_FABRIC_CELL,
            y: row * DEFAULT_UNITS_PER_FABRIC_CELL,
          },
          data: {},
        },
        elementRevision: 0,
      });
    }
  }
  const document: PatternDocument = { ...base, stitches };
  assertValidPatternDocument(document);
  return document;
};

export const selectImageImportReplacement = (
  current: PatternDocument,
  converted: PatternDocument,
  confirmed: boolean,
): PatternDocument => confirmed ? converted : current;
