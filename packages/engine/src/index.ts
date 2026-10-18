export {
  CURRENT_PATTERN_DOCUMENT_VERSION,
  DEFAULT_UNITS_PER_FABRIC_CELL,
  PATTERN_DOCUMENT_FORMAT,
} from "../../contracts/src/index.js";
export type {
  IntegerPoint,
  JsonObject,
  JsonValue,
  LegacyPatternDocumentV0,
  PatternColorV1,
  PatternDocument,
  PatternDocumentV1,
  PatternLayerV1,
  StitchElementV1,
  StitchGeometryV1,
  StitchTechniqueRefV1,
} from "../../contracts/src/index.js";

export {
  EngineError,
  InvalidDocumentError,
  MissingDocumentMigrationError,
  PatternCommandError,
  RouteEstimationError,
  UnsupportedDocumentVersionError,
  UnsupportedTechniqueError,
} from "./errors.js";
export {
  FULL_CROSS_TECHNIQUE_KEY,
  FULL_CROSS_TECHNIQUE_VERSION,
  fullCrossTechnique,
} from "./full-cross.js";
export { defaultTechniqueRegistry } from "./default-registry.js";
export { TechniqueRegistry } from "./technique-registry.js";
export {
  createPatternDocument,
  frontGeometryForDocument,
  frontGeometryForStitch,
} from "./document.js";
export type { CreatePatternDocumentInput } from "./document.js";
export {
  applyPatternCommand,
  applyPatternCommands,
} from "./commands.js";
export type {
  PatternCommand,
  PatternCommandBatch,
} from "./commands.js";
export { migratePatternDocument } from "./migrations.js";
export {
  deserializePatternDocument,
  normalizePatternDocument,
  serializePatternDocument,
} from "./serialization.js";
export {
  assertValidPatternDocument,
  validatePatternDocument,
} from "./validation.js";
export type { PatternValidationResult } from "./validation.js";
export {
  BACK_ESTIMATE_DISCLAIMER,
  createNaiveStitchingRoute,
  estimateBackOfFabric,
  routeOptionsForStitch,
} from "./routing.js";
export type {
  BackFabricEstimate,
  BackFabricSegment,
  FrontPrimitive,
  LinePrimitive,
  RouteSegment,
  StitchingRoute,
  StitchingRouteStep,
  StitchTechnique,
  TechniqueContext,
  TechniqueRouteOption,
  ValidationIssue,
  ValidationSeverity,
} from "./types.js";
