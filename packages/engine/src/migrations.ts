import {
  CURRENT_PATTERN_DOCUMENT_VERSION,
  DEFAULT_UNITS_PER_FABRIC_CELL,
  PATTERN_DOCUMENT_FORMAT,
  type LegacyPatternDocumentV0,
  type PatternDocument,
} from "../../contracts/src/index.js";

import {
  InvalidDocumentError,
  MissingDocumentMigrationError,
  UnsupportedDocumentVersionError,
} from "./errors.js";
import type { ValidationIssue } from "./types.js";

type Migration = (value: unknown) => unknown;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const migrationError = (message: string): InvalidDocumentError =>
  new InvalidDocumentError([
    {
      severity: "error",
      code: "INVALID_LEGACY_DOCUMENT",
      path: "$",
      message,
    },
  ] satisfies readonly ValidationIssue[]);

const migrateV0ToV1: Migration = (value): PatternDocument => {
  if (
    !record(value) ||
    value.format !== PATTERN_DOCUMENT_FORMAT ||
    value.version !== 0 ||
    typeof value.id !== "string" ||
    !Number.isSafeInteger(value.revision) ||
    typeof value.name !== "string" ||
    !Number.isSafeInteger(value.widthCells) ||
    !Number.isSafeInteger(value.heightCells) ||
    (value.widthCells as number) <= 0 ||
    (value.heightCells as number) <= 0 ||
    !Array.isArray(value.layers) ||
    !Array.isArray(value.colors) ||
    !Array.isArray(value.stitches)
  ) {
    throw migrationError("Legacy version 0 document has an invalid envelope.");
  }

  const legacy = value as unknown as LegacyPatternDocumentV0;
  return {
    format: PATTERN_DOCUMENT_FORMAT,
    version: CURRENT_PATTERN_DOCUMENT_VERSION,
    id: legacy.id,
    revision: legacy.revision,
    metadata: { name: legacy.name },
    coordinateSystem: {
      kind: "integer-design-units",
      unitsPerFabricCell: DEFAULT_UNITS_PER_FABRIC_CELL,
    },
    bounds: {
      width: legacy.widthCells * DEFAULT_UNITS_PER_FABRIC_CELL,
      height: legacy.heightCells * DEFAULT_UNITS_PER_FABRIC_CELL,
    },
    layers: legacy.layers,
    colors: legacy.colors,
    stitches: legacy.stitches.map((stitch) => {
      if (
        !record(stitch) ||
        typeof stitch.id !== "string" ||
        stitch.technique !== "full-cross" ||
        typeof stitch.layerId !== "string" ||
        typeof stitch.colorId !== "string" ||
        !Number.isSafeInteger(stitch.xCell) ||
        !Number.isSafeInteger(stitch.yCell)
      ) {
        throw migrationError("Legacy version 0 stitch is invalid.");
      }
      return {
        id: stitch.id,
        technique: { key: "full-cross", version: 1 },
        layerId: stitch.layerId,
        colorId: stitch.colorId,
        geometry: {
          anchor: {
            x: stitch.xCell * DEFAULT_UNITS_PER_FABRIC_CELL,
            y: stitch.yCell * DEFAULT_UNITS_PER_FABRIC_CELL,
          },
          data: {},
        },
        elementRevision: 0,
      };
    }),
    extensions: {},
  };
};

const migrations: Readonly<Record<number, Migration>> = {
  0: migrateV0ToV1,
};

export const migratePatternDocument = (value: unknown): unknown => {
  if (!record(value) || value.format !== PATTERN_DOCUMENT_FORMAT) {
    throw migrationError(`Document format must be ${PATTERN_DOCUMENT_FORMAT}.`);
  }
  if (!Number.isSafeInteger(value.version) || (value.version as number) < 0) {
    throw migrationError("Document version must be a non-negative safe integer.");
  }

  let migrated: unknown = value;
  let version = value.version as number;
  if (version > CURRENT_PATTERN_DOCUMENT_VERSION) {
    throw new UnsupportedDocumentVersionError(version);
  }
  while (version < CURRENT_PATTERN_DOCUMENT_VERSION) {
    const migration = migrations[version];
    if (migration === undefined) {
      throw new MissingDocumentMigrationError(version);
    }
    migrated = migration(migrated);
    if (!record(migrated) || !Number.isSafeInteger(migrated.version)) {
      throw migrationError(`Migration from version ${String(version)} produced an invalid result.`);
    }
    const nextVersion = migrated.version as number;
    if (nextVersion <= version) {
      throw migrationError(`Migration from version ${String(version)} did not advance the version.`);
    }
    version = nextVersion;
  }
  return migrated;
};
