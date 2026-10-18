import type { PatternDocument } from "../../../../packages/engine/src/index.js";

export const DEFAULT_HISTORY_LIMIT = 80;

export interface DocumentHistory {
  readonly past: readonly PatternDocument[];
  readonly present: PatternDocument;
  readonly future: readonly PatternDocument[];
  readonly limit: number;
}

export const createDocumentHistory = (
  document: PatternDocument,
  limit = DEFAULT_HISTORY_LIMIT,
): DocumentHistory => ({ past: [], present: document, future: [], limit });

export const commitDocument = (
  history: DocumentHistory,
  document: PatternDocument,
): DocumentHistory => {
  if (document === history.present) {
    return history;
  }
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: document,
    future: [],
  };
};

export const undoDocument = (history: DocumentHistory): DocumentHistory => {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, history.limit),
  };
};

export const redoDocument = (history: DocumentHistory): DocumentHistory => {
  const next = history.future[0];
  if (next === undefined) {
    return history;
  }
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: history.future.slice(1),
  };
};
