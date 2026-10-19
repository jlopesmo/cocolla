export interface ThreadCatalogResultContext {
  readonly catalogId: string;
  readonly catalogVersion: string;
  readonly query: string;
  readonly view: "catalog" | "nearest";
  readonly activeColorId: string | null;
  readonly activeColorRgb: string | null;
}

export const threadCatalogResultKey = (
  context: ThreadCatalogResultContext,
): string => JSON.stringify([
  context.catalogId,
  context.catalogVersion,
  context.query,
  context.view,
  context.view === "nearest" ? context.activeColorId : null,
  context.view === "nearest" ? context.activeColorRgb : null,
]);

export const isThreadCatalogResultCurrent = (
  resultKey: string | null,
  currentKey: string,
): boolean => resultKey === currentKey;
