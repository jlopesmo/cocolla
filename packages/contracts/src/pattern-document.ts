export const PATTERN_DOCUMENT_FORMAT = "cocolla.pattern" as const;
export const CURRENT_PATTERN_DOCUMENT_VERSION = 1 as const;
export const DEFAULT_UNITS_PER_FABRIC_CELL = 1024 as const;

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface IntegerPoint {
  readonly x: number;
  readonly y: number;
}

export interface PatternLayerV1 {
  readonly id: string;
  readonly name: string;
  readonly order: number;
}

export interface PatternColorV1 {
  readonly id: string;
  readonly name: string;
  readonly rgb: string;
  readonly symbol: string;
  readonly threadProductId: string | null;
}

export interface StitchTechniqueRefV1 {
  readonly key: string;
  readonly version: number;
}

export interface StitchGeometryV1 {
  readonly anchor: IntegerPoint;
  readonly data: JsonObject;
}

export interface StitchElementV1 {
  readonly id: string;
  readonly technique: StitchTechniqueRefV1;
  readonly layerId: string;
  readonly colorId: string;
  readonly geometry: StitchGeometryV1;
  readonly elementRevision: number;
}

export interface PatternDocumentV1 {
  readonly format: typeof PATTERN_DOCUMENT_FORMAT;
  readonly version: typeof CURRENT_PATTERN_DOCUMENT_VERSION;
  readonly id: string;
  readonly revision: number;
  readonly metadata: {
    readonly name: string;
  };
  readonly coordinateSystem: {
    readonly kind: "integer-design-units";
    readonly unitsPerFabricCell: number;
  };
  readonly bounds: {
    readonly width: number;
    readonly height: number;
  };
  readonly layers: readonly PatternLayerV1[];
  readonly colors: readonly PatternColorV1[];
  readonly stitches: readonly StitchElementV1[];
  readonly extensions: JsonObject;
}

export type PatternDocument = PatternDocumentV1;

/**
 * Legacy cell-coordinate shape supported only to exercise and preserve the
 * migration boundary. It was never an externally released Cocolla format.
 */
export interface LegacyPatternDocumentV0 {
  readonly format: typeof PATTERN_DOCUMENT_FORMAT;
  readonly version: 0;
  readonly id: string;
  readonly revision: number;
  readonly name: string;
  readonly widthCells: number;
  readonly heightCells: number;
  readonly layers: readonly PatternLayerV1[];
  readonly colors: readonly PatternColorV1[];
  readonly stitches: readonly {
    readonly id: string;
    readonly technique: "full-cross";
    readonly layerId: string;
    readonly colorId: string;
    readonly xCell: number;
    readonly yCell: number;
  }[];
}
