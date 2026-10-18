import type { IntegerPoint, PatternDocument } from "../../contracts/src/index.js";

import {
  RouteEstimationError,
  UnsupportedTechniqueError,
} from "./errors.js";
import { defaultTechniqueRegistry } from "./default-registry.js";
import type {
  BackFabricEstimate,
  BackFabricSegment,
  StitchingRoute,
  TechniqueRouteOption,
} from "./types.js";
import type { StitchElementV1 } from "../../contracts/src/index.js";

export const BACK_ESTIMATE_DISCLAIMER =
  "Heuristic estimate only. Actual backs depend on stitcher choices, starts, stops, tension, and carried thread.";

const distance = (start: IntegerPoint, end: IntegerPoint): number =>
  Math.hypot(end.x - start.x, end.y - start.y);

const samePoint = (left: IntegerPoint, right: IntegerPoint): boolean =>
  left.x === right.x && left.y === right.y;

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const routeOptionsForElement = (
  document: PatternDocument,
  stitch: StitchElementV1,
): readonly TechniqueRouteOption[] => {
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
  return technique.routeOptions(stitch, { document });
};

export const routeOptionsForStitch = (
  document: PatternDocument,
  stitchId: string,
): readonly TechniqueRouteOption[] => {
  const stitch = document.stitches.find((candidate) => candidate.id === stitchId);
  if (stitch === undefined) {
    throw new RouteEstimationError(
      "ROUTE_STITCH_NOT_FOUND",
      `Stitch not found: ${stitchId}.`,
    );
  }
  return routeOptionsForElement(document, stitch);
};

export const createNaiveStitchingRoute = (
  document: PatternDocument,
): StitchingRoute => {
  const ordered = [...document.stitches].sort(
    (left, right) =>
      left.geometry.anchor.y - right.geometry.anchor.y ||
      left.geometry.anchor.x - right.geometry.anchor.x ||
      compareText(left.id, right.id),
  );

  return {
    kind: "estimated-route",
    documentId: document.id,
    documentRevision: document.revision,
    steps: ordered.map((stitch) => {
      const option = routeOptionsForElement(document, stitch)[0];
      if (option === undefined) {
        throw new RouteEstimationError(
          "NO_ROUTE_OPTION",
          `Technique returned no route option for stitch ${stitch.id}.`,
        );
      }
      return { stitchId: stitch.id, optionId: option.id };
    }),
  };
};

export const estimateBackOfFabric = (
  document: PatternDocument,
  route: StitchingRoute,
): BackFabricEstimate => {
  if (route.documentId !== document.id) {
    throw new RouteEstimationError(
      "ROUTE_DOCUMENT_MISMATCH",
      "Route belongs to a different pattern document.",
    );
  }
  if (route.documentRevision !== document.revision) {
    throw new RouteEstimationError(
      "STALE_ROUTE",
      `Route revision ${String(route.documentRevision)} does not match document revision ${String(document.revision)}.`,
    );
  }

  const seen = new Set<string>();
  const stitchesById = new Map(
    document.stitches.map((stitch) => [stitch.id, stitch] as const),
  );
  const segments: BackFabricSegment[] = [];
  let previousExit: IntegerPoint | undefined;

  for (const step of route.steps) {
    if (seen.has(step.stitchId)) {
      throw new RouteEstimationError(
        "DUPLICATE_ROUTE_STITCH",
        `Route contains stitch more than once: ${step.stitchId}.`,
      );
    }
    seen.add(step.stitchId);
    const stitch = stitchesById.get(step.stitchId);
    if (stitch === undefined) {
      throw new RouteEstimationError(
        "ROUTE_STITCH_NOT_FOUND",
        `Stitch not found: ${step.stitchId}.`,
      );
    }
    const option = routeOptionsForElement(document, stitch).find(
      (candidate) => candidate.id === step.optionId,
    );
    if (option === undefined) {
      throw new RouteEstimationError(
        "ROUTE_OPTION_NOT_FOUND",
        `Route option ${step.optionId} is not valid for stitch ${step.stitchId}.`,
      );
    }

    if (previousExit !== undefined && !samePoint(previousExit, option.entry)) {
      segments.push({
        kind: "carry",
        stitchId: step.stitchId,
        from: previousExit,
        to: option.entry,
        lengthUnits: distance(previousExit, option.entry),
      });
    }
    for (const segment of option.segments) {
      if (segment.side === "back") {
        segments.push({
          kind: "internal-back",
          stitchId: step.stitchId,
          from: segment.from,
          to: segment.to,
          lengthUnits: distance(segment.from, segment.to),
        });
      }
    }
    previousExit = option.exit;
  }

  return {
    kind: "heuristic-back-estimate",
    documentId: document.id,
    documentRevision: document.revision,
    segments,
    totalBackThreadUnits: segments.reduce(
      (total, segment) => total + segment.lengthUnits,
      0,
    ),
    disclaimer: BACK_ESTIMATE_DISCLAIMER,
  };
};
