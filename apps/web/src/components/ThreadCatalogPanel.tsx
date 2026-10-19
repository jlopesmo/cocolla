import { useEffect, useState } from "react";

import type {
  PatternColorV1,
  ThreadCatalogProvider,
  ThreadColorMatcher,
  ThreadProduct,
} from "../../../../packages/contracts/src/index.js";
import {
  isThreadAssignmentResolutionCurrent,
  resolveThreadAssignment,
  type ThreadAssignmentResolution,
} from "../../../../packages/thread-catalog/src/index.js";

type CatalogView = "catalog" | "nearest";

interface CatalogResult {
  readonly product: ThreadProduct;
  readonly distance: number | null;
}

interface ThreadCatalogPanelProps {
  readonly activeColor: PatternColorV1 | undefined;
  readonly catalog: ThreadCatalogProvider;
  readonly matcher: ThreadColorMatcher;
  readonly onAssign: (productId: string) => void;
  readonly onRemove: () => void;
  readonly onReplace: (product: ThreadProduct) => void;
}

const includesQuery = (product: ThreadProduct, query: string): boolean => {
  const value = query.trim().toLowerCase();
  return value.length === 0 ||
    product.manufacturerCode.toLowerCase().includes(value) ||
    product.name.toLowerCase().includes(value) ||
    product.id.toLowerCase().includes(value);
};

export const ThreadCatalogPanel = ({
  activeColor,
  catalog,
  matcher,
  onAssign,
  onRemove,
  onReplace,
}: ThreadCatalogPanelProps): React.JSX.Element => {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<CatalogView>("catalog");
  const [results, setResults] = useState<readonly CatalogResult[]>([]);
  const [resolution, setResolution] = useState<ThreadAssignmentResolution>({
    status: "unassigned",
  });
  const [error, setError] = useState<string | null>(null);
  const activeThreadProductId = activeColor?.threadProductId ?? null;
  const currentResolution = isThreadAssignmentResolutionCurrent(
    resolution,
    activeThreadProductId,
  ) ? resolution : null;

  useEffect(() => {
    let current = true;
    const load = async (): Promise<void> => {
      try {
        const next = view === "nearest" && activeColor !== undefined
          ? (await matcher.match(
              { rgb: activeColor.rgb, limit: 50 },
              catalog,
            ))
              .filter((match) => includesQuery(match.product, query))
              .map((match) => ({
                product: match.product,
                distance: match.distance,
              }))
          : (await catalog.findProducts({ text: query, limit: 50 })).products
              .map((product) => ({ product, distance: null }));
        if (current) {
          setResults(next);
          setError(null);
        }
      } catch (loadError) {
        if (current) {
          setResults([]);
          setError(loadError instanceof Error ? loadError.message : "Catalog lookup failed.");
        }
      }
    };
    void load();
    return () => { current = false; };
  }, [activeColor?.rgb, catalog, matcher, query, view]);

  useEffect(() => {
    let current = true;
    void resolveThreadAssignment(
      activeThreadProductId,
      [catalog],
    ).then((next) => {
      if (current) setResolution(next);
    });
    return () => { current = false; };
  }, [activeThreadProductId, catalog]);

  return (
    <section className="sidebar-section thread-catalog-panel">
      <div className="section-title">
        <span>Physical thread</span>
        <small>{catalog.descriptor.brand}</small>
      </div>
      <p className="catalog-identity">
        {catalog.descriptor.line} · v{catalog.descriptor.version}
      </p>
      <p className="catalog-warning">
        Synthetic development data — not official DMC or manufacturer products.
      </p>

      <div className={`thread-assignment ${currentResolution?.status ?? "pending"}`}>
        {activeColor === undefined ? (
          <span>Select a logical color to manage its thread mapping.</span>
        ) : currentResolution === null ? (
          <span>Resolving saved thread assignment…</span>
        ) : currentResolution.status === "resolved" ? (
          <>
            <span
              aria-hidden="true"
              className="thread-swatch"
              style={{ background: currentResolution.product.color.value }}
            />
            <div>
              <strong>{currentResolution.product.manufacturerCode} · {currentResolution.product.name}</strong>
              <small>Assigned to {activeColor.name}</small>
            </div>
            <button onClick={onRemove} type="button">Remove</button>
          </>
        ) : currentResolution.status === "unresolved" ? (
          <>
            <div>
              <strong>Catalog entry unavailable</strong>
              <small title={currentResolution.productId}>{currentResolution.productId}</small>
            </div>
            <button onClick={onRemove} type="button">Remove</button>
          </>
        ) : (
          <span>No physical thread assigned to {activeColor.name}.</span>
        )}
      </div>

      <label className="catalog-search">
        <span className="visually-hidden">Search thread catalog</span>
        <input
          aria-label="Search synthetic thread catalog"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search code or name"
          type="search"
          value={query}
        />
      </label>
      <label className="catalog-view">
        <span>Browse</span>
        <select onChange={(event) => setView(event.target.value as CatalogView)} value={view}>
          <option value="catalog">Catalog order</option>
          <option disabled={activeColor === undefined} value="nearest">Closest to selected color</option>
        </select>
      </label>

      {error === null ? null : <p className="catalog-error">{error}</p>}
      <div className="thread-results" aria-label="Thread catalog results">
        {results.map(({ product, distance }) => {
          const assigned = product.id === activeColor?.threadProductId;
          return (
            <article className={`thread-result ${assigned ? "assigned" : ""}`} key={product.id}>
              <span
                aria-label={`${product.color.value} color swatch`}
                className="thread-swatch"
                role="img"
                style={{ background: product.color.value }}
              />
              <div className="thread-result-copy">
                <strong>{product.manufacturerCode} · {product.name}</strong>
                <small>{product.color.value}{distance === null ? "" : ` · ΔE ${distance.toFixed(2)}`}</small>
              </div>
              <div className="thread-result-actions">
                <button disabled={activeColor === undefined || assigned} onClick={() => onAssign(product.id)} type="button">
                  {assigned ? "Assigned" : "Assign"}
                </button>
                <button disabled={activeColor === undefined} onClick={() => onReplace(product)} type="button">
                  Replace color
                </button>
              </div>
            </article>
          );
        })}
        {results.length === 0 && error === null ? (
          <p className="empty-note">No catalog threads match this filter.</p>
        ) : null}
      </div>
    </section>
  );
};
