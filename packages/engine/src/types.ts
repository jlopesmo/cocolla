import type {
  IntegerPoint,
  JsonObject,
  PatternDocument,
  StitchElementV1,
} from "../../contracts/src/index.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface LinePrimitive {
  readonly kind: "line";
  readonly role: "front-thread";
  readonly stitchId: string;
  readonly colorId: string;
  readonly start: IntegerPoint;
  readonly end: IntegerPoint;
}

export type FrontPrimitive = LinePrimitive;

export interface RouteSegment {
  readonly from: IntegerPoint;
  readonly to: IntegerPoint;
  readonly side: "front" | "back";
}

export interface TechniqueRouteOption {
  readonly id: string;
  readonly entry: IntegerPoint;
  readonly exit: IntegerPoint;
  readonly segments: readonly RouteSegment[];
}

export interface TechniqueContext {
  readonly document: PatternDocument;
}

export interface StitchTechnique<TData extends JsonObject = JsonObject> {
  readonly key: string;
  readonly version: number;
  validate(
    element: StitchElementV1,
    context: TechniqueContext,
  ): readonly ValidationIssue[];
  frontGeometry(
    element: StitchElementV1,
    context: TechniqueContext,
  ): readonly FrontPrimitive[];
  routeOptions(
    element: StitchElementV1,
    context: TechniqueContext,
  ): readonly TechniqueRouteOption[];
  estimateThreadUnits(
    element: StitchElementV1,
    option: TechniqueRouteOption,
    context: TechniqueContext,
  ): number;
  readonly __dataType?: TData;
}

export interface StitchingRouteStep {
  readonly stitchId: string;
  readonly optionId: string;
}

export interface StitchingRoute {
  readonly kind: "estimated-route";
  readonly documentId: string;
  readonly documentRevision: number;
  readonly steps: readonly StitchingRouteStep[];
}

export interface BackFabricSegment {
  readonly kind: "internal-back" | "carry";
  readonly stitchId: string;
  readonly from: IntegerPoint;
  readonly to: IntegerPoint;
  readonly lengthUnits: number;
}

export interface BackFabricEstimate {
  readonly kind: "heuristic-back-estimate";
  readonly documentId: string;
  readonly documentRevision: number;
  readonly segments: readonly BackFabricSegment[];
  readonly totalBackThreadUnits: number;
  readonly disclaimer: string;
}
