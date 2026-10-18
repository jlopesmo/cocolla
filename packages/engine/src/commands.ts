import type {
  IntegerPoint,
  PatternDocument,
  StitchElementV1,
} from "../../contracts/src/index.js";

import {
  InvalidDocumentError,
  PatternCommandError,
  UnsupportedTechniqueError,
  UnsupportedTechniqueOperationError,
} from "./errors.js";
import { defaultTechniqueRegistry } from "./default-registry.js";
import { cloneJsonObject } from "./json.js";
import {
  assertValidPatternDocument,
  validatePatternDocument,
} from "./validation.js";
import type { PatternRotation } from "./types.js";

export type PatternCommand =
  | {
      readonly type: "document.rotate";
      readonly rotation: PatternRotation;
    }
  | {
      readonly type: "stitch.add";
      readonly stitch: StitchElementV1;
    }
  | {
      readonly type: "stitch.remove";
      readonly stitchId: string;
    }
  | {
      readonly type: "stitch.move";
      readonly stitchId: string;
      readonly anchor: IntegerPoint;
    }
  | {
      readonly type: "stitch.recolor";
      readonly stitchId: string;
      readonly colorId: string;
    }
  | {
      readonly type: "color.set-symbol";
      readonly colorId: string;
      readonly symbol: string;
    };

export interface PatternCommandBatch {
  readonly baseRevision: number;
  readonly commands: readonly PatternCommand[];
}

const cloneStitch = (stitch: StitchElementV1): StitchElementV1 => ({
  ...stitch,
  technique: { ...stitch.technique },
  geometry: {
    anchor: { ...stitch.geometry.anchor },
    data: cloneJsonObject(stitch.geometry.data),
  },
});

const requireStitchIndex = (
  indexes: ReadonlyMap<string, number>,
  stitchId: string,
): number => {
  const index = indexes.get(stitchId);
  if (index === undefined) {
    throw new PatternCommandError(
      "STITCH_NOT_FOUND",
      `Stitch not found: ${stitchId}.`,
    );
  }
  return index;
};

const rotatedBounds = (
  document: PatternDocument,
  rotation: PatternRotation,
): PatternDocument["bounds"] =>
  rotation === "180"
    ? document.bounds
    : { width: document.bounds.height, height: document.bounds.width };

const isPatternRotation = (value: unknown): value is PatternRotation =>
  value === "clockwise-90" ||
  value === "counterclockwise-90" ||
  value === "180";

const rotateDocument = (
  document: PatternDocument,
  rotation: PatternRotation,
): PatternDocument => {
  const bounds = rotatedBounds(document, rotation);
  const stitches = document.stitches.map((stitch) => {
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
    if (technique.rotateGeometry === undefined) {
      throw new UnsupportedTechniqueOperationError(
        stitch.technique.key,
        stitch.technique.version,
        "document rotation",
      );
    }
    return {
      ...stitch,
      geometry: technique.rotateGeometry(stitch, {
        document,
        rotation,
        rotatedBounds: bounds,
      }),
      elementRevision: stitch.elementRevision + 1,
    };
  });
  const rotated: PatternDocument = {
    ...document,
    revision: document.revision + 1,
    bounds,
    stitches,
  };
  const validation = validatePatternDocument(rotated);
  if (!validation.valid) {
    throw new InvalidDocumentError(validation.issues);
  }
  return rotated;
};

export const applyPatternCommands = (
  document: PatternDocument,
  batch: PatternCommandBatch,
): PatternDocument => {
  assertValidPatternDocument(document);
  if (!Number.isSafeInteger(batch.baseRevision) || batch.baseRevision < 0) {
    throw new PatternCommandError(
      "INVALID_BASE_REVISION",
      "Base revision must be a non-negative safe integer.",
    );
  }
  if (batch.baseRevision !== document.revision) {
    throw new PatternCommandError(
      "REVISION_CONFLICT",
      `Expected revision ${String(batch.baseRevision)}, current revision is ${String(document.revision)}.`,
    );
  }
  if (batch.commands.length === 0) {
    throw new PatternCommandError(
      "EMPTY_COMMAND_BATCH",
      "A command batch must contain at least one command.",
    );
  }

  const documentCommands = batch.commands.filter(
    (command) => command.type === "document.rotate",
  );
  if (documentCommands.length > 0) {
    if (batch.commands.length !== 1) {
      throw new PatternCommandError(
        "DOCUMENT_COMMAND_MUST_BE_EXCLUSIVE",
        "Document transformations must be applied in an exclusive command batch.",
      );
    }
    const command = documentCommands[0];
    if (command === undefined) {
      throw new PatternCommandError(
        "INVALID_DOCUMENT_COMMAND",
        "Document transformation command is missing.",
      );
    }
    if (!isPatternRotation(command.rotation)) {
      throw new PatternCommandError(
        "INVALID_ROTATION",
        "Document rotation must be clockwise-90, counterclockwise-90, or 180.",
      );
    }
    return rotateDocument(document, command.rotation);
  }

  const slots: Array<StitchElementV1 | undefined> = [...document.stitches];
  const indexes = new Map(
    document.stitches.map((stitch, index) => [stitch.id, index] as const),
  );
  const colors = [...document.colors];
  const colorIndexes = new Map(
    document.colors.map((color, index) => [color.id, index] as const),
  );
  const colorIds = new Set(document.colors.map((color) => color.id));
  const addedIds = new Set<string>();
  let colorsChanged = false;

  for (const command of batch.commands) {
    switch (command.type) {
      case "document.rotate":
        throw new PatternCommandError(
          "INVALID_DOCUMENT_COMMAND",
          "Document transformation was not applied exclusively.",
        );
      case "stitch.add": {
        if (indexes.has(command.stitch.id)) {
          throw new PatternCommandError(
            "DUPLICATE_STITCH_ID",
            `Stitch id already exists: ${command.stitch.id}.`,
          );
        }
        if (
          !defaultTechniqueRegistry.has(
            command.stitch.technique.key,
            command.stitch.technique.version,
          )
        ) {
          throw new UnsupportedTechniqueError(
            command.stitch.technique.key,
            command.stitch.technique.version,
          );
        }
        const index = slots.length;
        slots.push(command.stitch);
        indexes.set(command.stitch.id, index);
        addedIds.add(command.stitch.id);
        break;
      }
      case "stitch.remove": {
        const index = requireStitchIndex(indexes, command.stitchId);
        slots[index] = undefined;
        indexes.delete(command.stitchId);
        addedIds.delete(command.stitchId);
        break;
      }
      case "stitch.move": {
        const index = requireStitchIndex(indexes, command.stitchId);
        const stitch = slots[index];
        if (stitch === undefined) {
          throw new PatternCommandError("STITCH_NOT_FOUND", command.stitchId);
        }
        if (
          !defaultTechniqueRegistry.has(
            stitch.technique.key,
            stitch.technique.version,
          )
        ) {
          throw new UnsupportedTechniqueError(
            stitch.technique.key,
            stitch.technique.version,
          );
        }
        slots[index] = {
          ...stitch,
          geometry: { ...stitch.geometry, anchor: { ...command.anchor } },
          elementRevision: stitch.elementRevision + 1,
        };
        break;
      }
      case "stitch.recolor": {
        if (!colorIds.has(command.colorId)) {
          throw new PatternCommandError(
            "COLOR_NOT_FOUND",
            `Color not found: ${command.colorId}.`,
          );
        }
        const index = requireStitchIndex(indexes, command.stitchId);
        const stitch = slots[index];
        if (stitch === undefined) {
          throw new PatternCommandError("STITCH_NOT_FOUND", command.stitchId);
        }
        slots[index] = {
          ...stitch,
          colorId: command.colorId,
          elementRevision: stitch.elementRevision + 1,
        };
        break;
      }
      case "color.set-symbol": {
        const index = colorIndexes.get(command.colorId);
        if (index === undefined) {
          throw new PatternCommandError(
            "COLOR_NOT_FOUND",
            `Color not found: ${command.colorId}.`,
          );
        }
        const color = colors[index];
        if (color === undefined) {
          throw new PatternCommandError(
            "COLOR_NOT_FOUND",
            `Color not found: ${command.colorId}.`,
          );
        }
        colors[index] = { ...color, symbol: command.symbol };
        colorsChanged = true;
        break;
      }
    }
  }

  const updated: PatternDocument = {
    ...document,
    revision: document.revision + 1,
    colors: colorsChanged ? colors : document.colors,
    stitches: slots.filter(
      (stitch): stitch is StitchElementV1 => stitch !== undefined,
    ),
  };

  const validation = validatePatternDocument(updated);
  if (!validation.valid) {
    throw new InvalidDocumentError(validation.issues);
  }
  return {
    ...updated,
    stitches: updated.stitches.map((stitch) =>
      addedIds.has(stitch.id) ? cloneStitch(stitch) : stitch,
    ),
  };
};

export const applyPatternCommand = (
  document: PatternDocument,
  command: PatternCommand,
): PatternDocument =>
  applyPatternCommands(document, {
    baseRevision: document.revision,
    commands: [command],
  });
