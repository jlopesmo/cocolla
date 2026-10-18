import {
  CURRENT_PATTERN_DOCUMENT_VERSION,
  PATTERN_DOCUMENT_FORMAT,
  type JsonObject,
  type JsonValue,
  type PatternDocument,
} from "../../contracts/src/index.js";

import { InvalidDocumentError } from "./errors.js";
import { defaultTechniqueRegistry } from "./default-registry.js";
import { TechniqueRegistry } from "./technique-registry.js";
import type { ValidationIssue } from "./types.js";

export interface PatternValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const safeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

const nonNegativeInteger = (value: unknown): value is number =>
  safeInteger(value) && value >= 0;

const positiveInteger = (value: unknown): value is number =>
  safeInteger(value) && value > 0;

const identifier = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);

const jsonValue = (
  value: unknown,
  active = new WeakSet<object>(),
): value is JsonValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "object") {
    return false;
  }
  if (active.has(value)) {
    return false;
  }
  active.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index) || !jsonValue(value[index], active)) {
        active.delete(value);
        return false;
      }
    }
    active.delete(value);
    return true;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    active.delete(value);
    return false;
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    active.delete(value);
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      !jsonValue(descriptor.value, active)
    ) {
      active.delete(value);
      return false;
    }
  }
  active.delete(value);
  return true;
};

const jsonObject = (value: unknown): value is JsonObject =>
  record(value) && jsonValue(value);

const add = (
  issues: ValidationIssue[],
  severity: "error" | "warning",
  code: string,
  path: string,
  message: string,
): void => {
  issues.push({ severity, code, path, message });
};

const rejectUnknownKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void => {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      add(
        issues,
        "error",
        "UNKNOWN_DOCUMENT_FIELD",
        path === "$" ? key : `${path}.${key}`,
        `Unknown field: ${key}. Use an extension or a versioned technique payload for forward-compatible data.`,
      );
    }
  }
};

const validateStructure = (value: unknown, issues: ValidationIssue[]): void => {
  if (!record(value)) {
    add(issues, "error", "DOCUMENT_NOT_OBJECT", "$", "Document must be an object.");
    return;
  }
  rejectUnknownKeys(
    value,
    ["format", "version", "id", "revision", "metadata", "coordinateSystem", "bounds", "layers", "colors", "stitches", "extensions"],
    "$",
    issues,
  );

  if (value.format !== PATTERN_DOCUMENT_FORMAT) {
    add(issues, "error", "INVALID_FORMAT", "format", `Format must be ${PATTERN_DOCUMENT_FORMAT}.`);
  }
  if (value.version !== CURRENT_PATTERN_DOCUMENT_VERSION) {
    add(issues, "error", "INVALID_CURRENT_VERSION", "version", "Document must be migrated to the current version before validation.");
  }
  if (!identifier(value.id)) {
    add(issues, "error", "INVALID_DOCUMENT_ID", "id", "Document id must be a stable identifier of 1–128 safe characters.");
  }
  if (!nonNegativeInteger(value.revision)) {
    add(issues, "error", "INVALID_REVISION", "revision", "Revision must be a non-negative safe integer.");
  }

  if (!record(value.metadata) || !nonEmptyString(value.metadata.name)) {
    add(issues, "error", "INVALID_METADATA", "metadata.name", "Pattern name must be non-empty.");
  } else {
    rejectUnknownKeys(value.metadata, ["name"], "metadata", issues);
  }

  if (
    !record(value.coordinateSystem) ||
    value.coordinateSystem.kind !== "integer-design-units" ||
    !positiveInteger(value.coordinateSystem.unitsPerFabricCell)
  ) {
    add(issues, "error", "INVALID_COORDINATE_SYSTEM", "coordinateSystem", "Coordinate system must use a positive integer design-unit scale.");
  } else {
    rejectUnknownKeys(value.coordinateSystem, ["kind", "unitsPerFabricCell"], "coordinateSystem", issues);
  }

  if (
    !record(value.bounds) ||
    !positiveInteger(value.bounds.width) ||
    !positiveInteger(value.bounds.height)
  ) {
    add(issues, "error", "INVALID_BOUNDS", "bounds", "Pattern bounds must be positive safe integers.");
  } else {
    rejectUnknownKeys(value.bounds, ["width", "height"], "bounds", issues);
  }

  if (!Array.isArray(value.layers) || value.layers.length === 0) {
    add(issues, "error", "INVALID_LAYERS", "layers", "At least one layer is required.");
  } else {
    value.layers.forEach((layer, index) => {
      if (
        !record(layer) ||
        !identifier(layer.id) ||
        !nonEmptyString(layer.name) ||
        !nonNegativeInteger(layer.order)
      ) {
        add(issues, "error", "INVALID_LAYER", `layers.${String(index)}`, "Layer id, name, and order are invalid.");
      } else {
        rejectUnknownKeys(layer, ["id", "name", "order"], `layers.${String(index)}`, issues);
      }
    });
  }

  if (!Array.isArray(value.colors) || value.colors.length === 0) {
    add(issues, "error", "INVALID_COLORS", "colors", "At least one logical color is required.");
  } else {
    value.colors.forEach((color, index) => {
      if (!record(color)) {
        add(issues, "error", "INVALID_COLOR", `colors.${String(index)}`, "Color must be an object.");
        return;
      }
      if (
        !identifier(color.id) ||
        !nonEmptyString(color.name) ||
        typeof color.rgb !== "string" ||
        !/^#[0-9A-Fa-f]{6}$/u.test(color.rgb) ||
        !nonEmptyString(color.symbol) ||
        color.symbol.length > 8 ||
        !(color.threadProductId === null || identifier(color.threadProductId))
      ) {
        add(issues, "error", "INVALID_COLOR", `colors.${String(index)}`, "Color fields are invalid.");
      } else {
        rejectUnknownKeys(
          color,
          ["id", "name", "rgb", "symbol", "threadProductId"],
          `colors.${String(index)}`,
          issues,
        );
      }
    });
  }

  if (!Array.isArray(value.stitches)) {
    add(issues, "error", "INVALID_STITCHES", "stitches", "Stitches must be an array.");
  } else {
    value.stitches.forEach((stitch, index) => {
      if (!record(stitch)) {
        add(issues, "error", "INVALID_STITCH", `stitches.${String(index)}`, "Stitch must be an object.");
        return;
      }
      const validTechnique =
        record(stitch.technique) &&
        nonEmptyString(stitch.technique.key) &&
        positiveInteger(stitch.technique.version);
      const validGeometry =
        record(stitch.geometry) &&
        record(stitch.geometry.anchor) &&
        safeInteger(stitch.geometry.anchor.x) &&
        safeInteger(stitch.geometry.anchor.y) &&
        jsonObject(stitch.geometry.data);
      if (
        !identifier(stitch.id) ||
        !validTechnique ||
        !identifier(stitch.layerId) ||
        !identifier(stitch.colorId) ||
        !validGeometry ||
        !nonNegativeInteger(stitch.elementRevision)
      ) {
        add(issues, "error", "INVALID_STITCH", `stitches.${String(index)}`, "Stitch fields or geometry are invalid.");
      } else {
        rejectUnknownKeys(
          stitch,
          ["id", "technique", "layerId", "colorId", "geometry", "elementRevision"],
          `stitches.${String(index)}`,
          issues,
        );
        if (record(stitch.technique)) {
          rejectUnknownKeys(stitch.technique, ["key", "version"], `stitches.${String(index)}.technique`, issues);
        }
        if (record(stitch.geometry)) {
          rejectUnknownKeys(stitch.geometry, ["anchor", "data"], `stitches.${String(index)}.geometry`, issues);
          if (record(stitch.geometry.anchor)) {
            rejectUnknownKeys(stitch.geometry.anchor, ["x", "y"], `stitches.${String(index)}.geometry.anchor`, issues);
          }
        }
      }
    });
  }

  if (!jsonObject(value.extensions)) {
    add(issues, "error", "INVALID_EXTENSIONS", "extensions", "Extensions must be a finite JSON object.");
  }
};

const duplicateIssues = (
  values: readonly { readonly id: string }[],
  collectionPath: string,
  issues: ValidationIssue[],
): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      add(issues, "error", "DUPLICATE_ID", collectionPath, `Duplicate id: ${value.id}.`);
    }
    seen.add(value.id);
  }
};

export const validatePatternDocument = (
  value: unknown,
  registry: TechniqueRegistry = defaultTechniqueRegistry,
): PatternValidationResult => {
  const issues: ValidationIssue[] = [];
  validateStructure(value, issues);
  if (issues.some((candidate) => candidate.severity === "error")) {
    return { valid: false, issues };
  }

  const document = value as PatternDocument;
  duplicateIssues(document.layers, "layers", issues);
  duplicateIssues(document.colors, "colors", issues);
  duplicateIssues(document.stitches, "stitches", issues);
  const symbols = new Set<string>();
  for (const color of document.colors) {
    if (symbols.has(color.symbol)) {
      add(issues, "error", "DUPLICATE_COLOR_SYMBOL", "colors", `Duplicate color symbol: ${color.symbol}.`);
    }
    symbols.add(color.symbol);
  }
  const layerIds = new Set(document.layers.map((layer) => layer.id));
  const colorIds = new Set(document.colors.map((color) => color.id));

  for (const stitch of document.stitches) {
    if (!layerIds.has(stitch.layerId)) {
      add(issues, "error", "UNKNOWN_LAYER", `stitches.${stitch.id}.layerId`, `Unknown layer: ${stitch.layerId}.`);
    }
    if (!colorIds.has(stitch.colorId)) {
      add(issues, "error", "UNKNOWN_COLOR", `stitches.${stitch.id}.colorId`, `Unknown color: ${stitch.colorId}.`);
    }
    const technique = registry.get(stitch.technique.key, stitch.technique.version);
    if (technique === undefined) {
      add(
        issues,
        "warning",
        "UNSUPPORTED_TECHNIQUE",
        `stitches.${stitch.id}.technique`,
        `Technique ${stitch.technique.key}@${String(stitch.technique.version)} is preserved but cannot be interpreted.`,
      );
    } else {
      issues.push(...technique.validate(stitch, { document }));
    }
  }

  return {
    valid: !issues.some((candidate) => candidate.severity === "error"),
    issues,
  };
};

export function assertValidPatternDocument(
  value: unknown,
  registry: TechniqueRegistry = defaultTechniqueRegistry,
): asserts value is PatternDocument {
  const result = validatePatternDocument(value, registry);
  if (!result.valid) {
    throw new InvalidDocumentError(result.issues);
  }
}
