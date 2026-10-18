import type {
  IntegerPoint,
  PatternDocument,
  StitchElementV1,
} from "../../contracts/src/index.js";

import {
  InvalidDocumentError,
  PatternCommandError,
  UnsupportedTechniqueError,
} from "./errors.js";
import { defaultTechniqueRegistry } from "./default-registry.js";
import { cloneJsonObject } from "./json.js";
import {
  assertValidPatternDocument,
  validatePatternDocument,
} from "./validation.js";

export type PatternCommand =
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

  const slots: Array<StitchElementV1 | undefined> = [...document.stitches];
  const indexes = new Map(
    document.stitches.map((stitch, index) => [stitch.id, index] as const),
  );
  const colorIds = new Set(document.colors.map((color) => color.id));
  const addedIds = new Set<string>();

  for (const command of batch.commands) {
    switch (command.type) {
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
    }
  }

  const updated: PatternDocument = {
    ...document,
    revision: document.revision + 1,
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
