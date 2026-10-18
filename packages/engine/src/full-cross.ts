import type { IntegerPoint, JsonObject } from "../../contracts/src/index.js";

import type {
  FrontPrimitive,
  StitchTechnique,
  TechniqueRouteOption,
  ValidationIssue,
} from "./types.js";

const point = (x: number, y: number): IntegerPoint => ({ x, y });

const distance = (start: IntegerPoint, end: IntegerPoint): number =>
  Math.hypot(end.x - start.x, end.y - start.y);

const issue = (
  code: string,
  path: string,
  message: string,
): ValidationIssue => ({ severity: "error", code, path, message });

export const FULL_CROSS_TECHNIQUE_KEY = "full-cross" as const;
export const FULL_CROSS_TECHNIQUE_VERSION = 1 as const;

export const fullCrossTechnique: StitchTechnique<JsonObject> = {
  key: FULL_CROSS_TECHNIQUE_KEY,
  version: FULL_CROSS_TECHNIQUE_VERSION,

  validate(element, context) {
    const issues: ValidationIssue[] = [];
    const unit = context.document.coordinateSystem.unitsPerFabricCell;
    const { x, y } = element.geometry.anchor;

    if (Object.keys(element.geometry.data).length !== 0) {
      issues.push(
        issue(
          "FULL_CROSS_DATA_NOT_EMPTY",
          `stitches.${element.id}.geometry.data`,
          "Full-cross version 1 does not define technique-specific data.",
        ),
      );
    }
    if (x % unit !== 0 || y % unit !== 0) {
      issues.push(
        issue(
          "FULL_CROSS_NOT_GRID_ALIGNED",
          `stitches.${element.id}.geometry.anchor`,
          "Full-cross anchors must align to fabric-cell boundaries.",
        ),
      );
    }
    const maximumX = x + unit;
    const maximumY = y + unit;
    if (!Number.isSafeInteger(maximumX) || !Number.isSafeInteger(maximumY)) {
      issues.push(
        issue(
          "FULL_CROSS_UNSAFE_EXTENT",
          `stitches.${element.id}.geometry.anchor`,
          "Full-cross geometry extent must remain within safe integer coordinates.",
        ),
      );
    } else if (
      x < 0 ||
      y < 0 ||
      maximumX > context.document.bounds.width ||
      maximumY > context.document.bounds.height
    ) {
      issues.push(
        issue(
          "FULL_CROSS_OUT_OF_BOUNDS",
          `stitches.${element.id}.geometry.anchor`,
          "Full-cross geometry must fit inside the pattern bounds.",
        ),
      );
    }
    return issues;
  },

  frontGeometry(element, context): readonly FrontPrimitive[] {
    const unit = context.document.coordinateSystem.unitsPerFabricCell;
    const { x, y } = element.geometry.anchor;
    return [
      {
        kind: "line",
        role: "front-thread",
        stitchId: element.id,
        colorId: element.colorId,
        start: point(x, y),
        end: point(x + unit, y + unit),
      },
      {
        kind: "line",
        role: "front-thread",
        stitchId: element.id,
        colorId: element.colorId,
        start: point(x, y + unit),
        end: point(x + unit, y),
      },
    ];
  },

  routeOptions(element, context): readonly TechniqueRouteOption[] {
    const unit = context.document.coordinateSystem.unitsPerFabricCell;
    const { x, y } = element.geometry.anchor;
    const topLeft = point(x, y);
    const topRight = point(x + unit, y);
    const bottomLeft = point(x, y + unit);
    const bottomRight = point(x + unit, y + unit);

    return [
      {
        id: "down-forward-then-backward",
        entry: topLeft,
        exit: topRight,
        segments: [
          { from: topLeft, to: bottomRight, side: "front" },
          { from: bottomRight, to: bottomLeft, side: "back" },
          { from: bottomLeft, to: topRight, side: "front" },
        ],
      },
      {
        id: "down-backward-then-forward",
        entry: topRight,
        exit: topLeft,
        segments: [
          { from: topRight, to: bottomLeft, side: "front" },
          { from: bottomLeft, to: bottomRight, side: "back" },
          { from: bottomRight, to: topLeft, side: "front" },
        ],
      },
      {
        id: "up-forward-then-backward",
        entry: bottomLeft,
        exit: bottomRight,
        segments: [
          { from: bottomLeft, to: topRight, side: "front" },
          { from: topRight, to: topLeft, side: "back" },
          { from: topLeft, to: bottomRight, side: "front" },
        ],
      },
      {
        id: "up-backward-then-forward",
        entry: bottomRight,
        exit: bottomLeft,
        segments: [
          { from: bottomRight, to: topLeft, side: "front" },
          { from: topLeft, to: topRight, side: "back" },
          { from: topRight, to: bottomLeft, side: "front" },
        ],
      },
    ];
  },

  estimateThreadUnits(_element, option) {
    return option.segments.reduce(
      (total, segment) => total + distance(segment.from, segment.to),
      0,
    );
  },
};
