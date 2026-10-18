import type {
  JsonObject,
  JsonValue,
  PatternDocument,
} from "../../contracts/src/index.js";

import { InvalidDocumentError } from "./errors.js";
import { migratePatternDocument } from "./migrations.js";
import { assertValidPatternDocument, validatePatternDocument } from "./validation.js";

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const canonicalJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [key, canonicalJsonValue(child)]),
    ) as JsonObject;
  }
  return value;
};

export const normalizePatternDocument = (
  document: PatternDocument,
): PatternDocument => ({
  format: document.format,
  version: document.version,
  id: document.id,
  revision: document.revision,
  metadata: { name: document.metadata.name },
  coordinateSystem: { ...document.coordinateSystem },
  bounds: { ...document.bounds },
  layers: [...document.layers]
    .map((layer) => ({ ...layer }))
    .sort((left, right) => left.order - right.order || compareText(left.id, right.id)),
  colors: [...document.colors]
    .map((color) => ({ ...color }))
    .sort((left, right) => compareText(left.id, right.id)),
  stitches: [...document.stitches]
    .map((stitch) => ({
      ...stitch,
      technique: { ...stitch.technique },
      geometry: {
        anchor: { ...stitch.geometry.anchor },
        data: canonicalJsonValue(stitch.geometry.data) as JsonObject,
      },
    }))
    .sort((left, right) => compareText(left.id, right.id)),
  extensions: canonicalJsonValue(document.extensions) as JsonObject,
});

const canonicalStringify = (value: JsonValue): string => {
  const normalized = canonicalJsonValue(value);
  return JSON.stringify(normalized);
};

export const serializePatternDocument = (document: PatternDocument): string => {
  const validation = validatePatternDocument(document);
  if (!validation.valid) {
    throw new InvalidDocumentError(validation.issues);
  }
  return canonicalStringify(
    normalizePatternDocument(document) as unknown as JsonObject,
  );
};

export const deserializePatternDocument = (serialized: string): PatternDocument => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new InvalidDocumentError([
      {
        severity: "error",
        code: "INVALID_JSON",
        path: "$",
        message: error instanceof Error ? error.message : "Invalid JSON.",
      },
    ]);
  }
  const migrated = migratePatternDocument(parsed);
  assertValidPatternDocument(migrated);
  return normalizePatternDocument(migrated);
};
