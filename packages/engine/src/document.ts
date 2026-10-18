import {
  CURRENT_PATTERN_DOCUMENT_VERSION,
  DEFAULT_UNITS_PER_FABRIC_CELL,
  PATTERN_DOCUMENT_FORMAT,
  type JsonObject,
  type PatternColorV1,
  type PatternDocument,
  type PatternLayerV1,
} from "../../contracts/src/index.js";

import { InvalidDocumentError, UnsupportedTechniqueError } from "./errors.js";
import { defaultTechniqueRegistry } from "./default-registry.js";
import { cloneJsonObject } from "./json.js";
import type { FrontPrimitive } from "./types.js";
import { validatePatternDocument } from "./validation.js";

export interface CreatePatternDocumentInput {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly unitsPerFabricCell?: number;
  readonly layers: readonly PatternLayerV1[];
  readonly colors: readonly PatternColorV1[];
  readonly extensions?: JsonObject;
}

export const createPatternDocument = (
  input: CreatePatternDocumentInput,
): PatternDocument => {
  const document: PatternDocument = {
    format: PATTERN_DOCUMENT_FORMAT,
    version: CURRENT_PATTERN_DOCUMENT_VERSION,
    id: input.id,
    revision: 0,
    metadata: { name: input.name },
    coordinateSystem: {
      kind: "integer-design-units",
      unitsPerFabricCell:
        input.unitsPerFabricCell ?? DEFAULT_UNITS_PER_FABRIC_CELL,
    },
    bounds: { width: input.width, height: input.height },
    layers: input.layers,
    colors: input.colors,
    stitches: [],
    extensions: input.extensions ?? {},
  };
  const result = validatePatternDocument(document);
  if (!result.valid) {
    throw new InvalidDocumentError(result.issues);
  }
  return {
    ...document,
    layers: document.layers.map((layer) => ({ ...layer })),
    colors: document.colors.map((color) => ({ ...color })),
    extensions: cloneJsonObject(document.extensions),
  };
};

export const frontGeometryForStitch = (
  document: PatternDocument,
  stitchId: string,
): readonly FrontPrimitive[] => {
  const stitch = document.stitches.find((candidate) => candidate.id === stitchId);
  if (stitch === undefined) {
    throw new Error(`Stitch not found: ${stitchId}`);
  }
  const technique = defaultTechniqueRegistry.get(
    stitch.technique.key,
    stitch.technique.version,
  );
  if (technique === undefined) {
    throw new UnsupportedTechniqueError(
      stitch.technique.key,
      stitch.technique.version,
    );
  }
  return technique.frontGeometry(stitch, { document });
};

export const frontGeometryForDocument = (
  document: PatternDocument,
): readonly FrontPrimitive[] => {
  const primitives: FrontPrimitive[] = [];
  for (const stitch of document.stitches) {
    const technique = defaultTechniqueRegistry.get(
      stitch.technique.key,
      stitch.technique.version,
    );
    if (technique === undefined) {
      throw new UnsupportedTechniqueError(
        stitch.technique.key,
        stitch.technique.version,
      );
    }
    primitives.push(...technique.frontGeometry(stitch, { document }));
  }
  return primitives;
};
