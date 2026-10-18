import type { ValidationIssue } from "./types.js";

export class EngineError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EngineError";
  }
}

export class InvalidDocumentError extends EngineError {
  public constructor(public readonly issues: readonly ValidationIssue[]) {
    super(
      "INVALID_DOCUMENT",
      `Pattern document is invalid (${String(issues.filter((issue) => issue.severity === "error").length)} error(s)).`,
    );
    this.name = "InvalidDocumentError";
  }
}

export class UnsupportedDocumentVersionError extends EngineError {
  public constructor(public readonly version: number) {
    super(
      "UNSUPPORTED_DOCUMENT_VERSION",
      `Pattern document version ${String(version)} is not supported.`,
    );
    this.name = "UnsupportedDocumentVersionError";
  }
}

export class MissingDocumentMigrationError extends EngineError {
  public constructor(public readonly fromVersion: number) {
    super(
      "MISSING_DOCUMENT_MIGRATION",
      `No migration is registered from pattern document version ${String(fromVersion)}.`,
    );
    this.name = "MissingDocumentMigrationError";
  }
}

export class UnsupportedTechniqueError extends EngineError {
  public constructor(
    public readonly techniqueKey: string,
    public readonly techniqueVersion: number,
  ) {
    super(
      "UNSUPPORTED_TECHNIQUE",
      `Technique ${techniqueKey}@${String(techniqueVersion)} is not supported.`,
    );
    this.name = "UnsupportedTechniqueError";
  }
}

export class PatternCommandError extends EngineError {
  public constructor(code: string, message: string) {
    super(code, message);
    this.name = "PatternCommandError";
  }
}

export class RouteEstimationError extends EngineError {
  public constructor(code: string, message: string) {
    super(code, message);
    this.name = "RouteEstimationError";
  }
}
