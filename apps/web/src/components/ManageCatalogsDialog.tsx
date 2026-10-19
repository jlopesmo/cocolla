import { useEffect, useRef, useState } from "react";

import type {
  PortableThreadCatalogV1,
  ThreadCatalogRedistribution,
} from "../../../../packages/contracts/src/index.js";
import {
  parsePortableThreadCatalogJson,
  parseThreadCatalogCsv,
  serializePortableThreadCatalog,
  threadCatalogVersionKey,
  type CatalogImportDiagnostic,
  type InstalledThreadCatalog,
  type ThreadCatalogRepository,
  type ThreadCatalogVersionKey,
} from "../../../../packages/thread-catalog/src/index.js";

interface ManageCatalogsDialogProps {
  readonly open: boolean;
  readonly repository: ThreadCatalogRepository;
  readonly onCancel: () => void;
  readonly onCatalogSelected: (catalog: PortableThreadCatalogV1 | null) => void;
}

type ImportKind = "csv" | "json";

const sameKey = (left: ThreadCatalogVersionKey | null, right: ThreadCatalogVersionKey): boolean =>
  left?.catalogId === right.catalogId && left.version === right.version;

const catalogFilename = (catalog: PortableThreadCatalogV1): string => {
  const safe = `${catalog.descriptor.id}-${catalog.descriptor.version}`
    .replace(/[^a-z0-9._-]+/giu, "-")
    .slice(0, 100);
  return `${safe}.cocolla-thread-catalog.json`;
};

const errorMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : "Catalog operation failed.";

export const ManageCatalogsDialog = ({
  open,
  repository,
  onCancel,
  onCatalogSelected,
}: ManageCatalogsDialogProps): React.JSX.Element | null => {
  const [installed, setInstalled] = useState<readonly InstalledThreadCatalog[]>([]);
  const [activeKey, setActiveKey] = useState<ThreadCatalogVersionKey | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ImportKind>("csv");
  const [catalogId, setCatalogId] = useState("user.");
  const [manufacturer, setManufacturer] = useState("");
  const [line, setLine] = useState("");
  const [version, setVersion] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [retrievedAt, setRetrievedAt] = useState("");
  const [licenseName, setLicenseName] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [redistribution, setRedistribution] = useState<ThreadCatalogRedistribution>("unknown");
  const [notes, setNotes] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [preview, setPreview] = useState<PortableThreadCatalogV1 | null>(null);
  const [diagnostics, setDiagnostics] = useState<readonly CatalogImportDiagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async (): Promise<void> => {
    const [catalogs, active] = await Promise.all([
      repository.listCatalogs(),
      repository.getActiveCatalog(),
    ]);
    setInstalled(catalogs);
    setActiveKey(active);
  };

  useEffect(() => {
    if (!open) return;
    let current = true;
    setFailure(null);
    void Promise.all([repository.listCatalogs(), repository.getActiveCatalog()])
      .then(([catalogs, active]) => {
        if (!current) return;
        setInstalled(catalogs);
        setActiveKey(active);
      })
      .catch((reason: unknown) => {
        if (current) setFailure(errorMessage(reason));
      });
    return () => { current = false; };
  }, [open, repository]);

  if (!open) return null;

  const clearPreview = (): void => {
    setPreview(null);
    setDiagnostics([]);
    setMessage(null);
  };

  const selectFile = (next: File | null): void => {
    setFile(next);
    clearPreview();
    if (next !== null) {
      setKind(next.name.toLowerCase().endsWith(".json") ? "json" : "csv");
    }
  };

  const previewImport = async (): Promise<void> => {
    if (file === null) {
      setFailure("Choose a CSV or JSON catalog file first.");
      return;
    }
    if (!rightsConfirmed) {
      setFailure("Confirm that you have the right to use this catalog data before previewing it.");
      return;
    }
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = kind === "json"
        ? parsePortableThreadCatalogJson(bytes)
        : parseThreadCatalogCsv(bytes, {
            descriptor: {
              id: catalogId,
              brand: manufacturer,
              line,
              version,
              attribution: {
                sourceName,
                sourceUrl: sourceUrl.trim().length === 0 ? null : sourceUrl,
                publisher,
                retrievedAt: retrievedAt.trim().length === 0 ? null : retrievedAt,
                licenseName: licenseName.trim().length === 0 ? null : licenseName,
                licenseUrl: licenseUrl.trim().length === 0 ? null : licenseUrl,
                redistribution,
                notes: notes.trim().length === 0 ? null : notes,
              },
            },
            rightsConfirmation: {
              statementVersion: 1,
              confirmed: true,
              confirmedAt: new Date().toISOString(),
            },
          });
      setDiagnostics(result.diagnostics);
      setPreview(result.ok ? result.catalog : null);
      if (!result.ok) setFailure("Catalog validation failed. Correct every error before saving.");
    } catch (reason) {
      setPreview(null);
      setDiagnostics([]);
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const savePreview = async (): Promise<void> => {
    if (preview === null || !rightsConfirmed) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await repository.saveCatalog(preview);
      const key = threadCatalogVersionKey(preview);
      await repository.setActiveCatalog(key);
      setActiveKey(key);
      onCatalogSelected(preview);
      await refresh();
      setMessage(result === "created" ? "Catalog saved locally and selected." : "Identical catalog already installed; selected existing copy.");
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const selectInstalled = async (key: ThreadCatalogVersionKey): Promise<void> => {
    setBusy(true);
    setFailure(null);
    try {
      const catalog = await repository.getCatalog(key);
      if (catalog === null) throw new Error("The selected catalog is no longer installed.");
      await repository.setActiveCatalog(key);
      setActiveKey(key);
      onCatalogSelected(catalog);
      setMessage(`${catalog.descriptor.brand} ${catalog.descriptor.line} selected.`);
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const selectSynthetic = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);
    try {
      await repository.setActiveCatalog(null);
      setActiveKey(null);
      onCatalogSelected(null);
      setMessage("Built-in synthetic validation catalog selected.");
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const exportCatalog = async (key: ThreadCatalogVersionKey): Promise<void> => {
    setFailure(null);
    try {
      const catalog = await repository.getCatalog(key);
      if (catalog === null) throw new Error("The catalog is no longer installed.");
      const blob = new Blob([serializePortableThreadCatalog(catalog)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = catalogFilename(catalog);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage("Portable catalog JSON exported. Keep it as a local backup.");
    } catch (reason) {
      setFailure(errorMessage(reason));
    }
  };

  const deleteCatalog = async (catalog: InstalledThreadCatalog): Promise<void> => {
    setBusy(true);
    setFailure(null);
    try {
      const wasActive = sameKey(activeKey, catalog.key);
      await repository.deleteCatalog(catalog.key);
      if (wasActive) {
        setActiveKey(null);
        onCatalogSelected(null);
      }
      setPendingDelete(null);
      await refresh();
      setMessage("Local catalog version deleted. Pattern thread identifiers were not changed.");
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const diagnosticsErrors = diagnostics.filter((item) => item.severity === "error");

  return (
    <div className="dialog-backdrop catalog-manager-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        aria-labelledby="catalog-manager-title"
        aria-modal="true"
        className="dialog-card catalog-manager-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="catalog-manager-heading">
          <div className="dialog-heading">
            <p className="eyebrow">Local thread library</p>
            <h2 id="catalog-manager-title">Manage catalogs</h2>
            <p>Catalogs stay in this browser profile. Export portable JSON backups because browser storage can be cleared.</p>
          </div>
          <button aria-label="Close catalog manager" className="dialog-close" onClick={onCancel} type="button">×</button>
        </div>

        {failure === null ? null : <p className="form-error" role="alert">{failure}</p>}
        {message === null ? null : <p className="catalog-manager-success" role="status">{message}</p>}

        <div className="catalog-manager-grid">
          <section className="catalog-manager-section">
            <div className="section-title"><span>Installed catalogs</span><small>{installed.length} local</small></div>
            <article className={`installed-catalog ${activeKey === null ? "active" : ""}`}>
              <div><strong>Cocolla synthetic validation threads</strong><small>Built in · invented test data</small></div>
              <button disabled={busy || activeKey === null} onClick={() => void selectSynthetic()} type="button">{activeKey === null ? "Active" : "Select"}</button>
            </article>
            <div className="installed-catalog-list">
              {installed.map((catalog) => {
                const key = JSON.stringify([catalog.key.catalogId, catalog.key.version]);
                const active = sameKey(activeKey, catalog.key);
                const confirmingDelete = pendingDelete === key;
                return (
                  <article className={`installed-catalog ${active ? "active" : ""}`} key={key}>
                    <span aria-hidden="true" className="catalog-dot" />
                    <div>
                      <strong>{catalog.descriptor.brand} · {catalog.descriptor.line}</strong>
                      <small>{catalog.key.catalogId} · version {catalog.key.version} · {catalog.productCount} products</small>
                    </div>
                    <div className="installed-catalog-actions">
                      <button disabled={busy || active} onClick={() => void selectInstalled(catalog.key)} type="button">{active ? "Active" : "Select"}</button>
                      <button disabled={busy} onClick={() => void exportCatalog(catalog.key)} type="button">Export</button>
                      {confirmingDelete ? (
                        <>
                          <button className="danger" disabled={busy} onClick={() => void deleteCatalog(catalog)} type="button">Confirm delete</button>
                          <button disabled={busy} onClick={() => setPendingDelete(null)} type="button">Keep</button>
                        </>
                      ) : (
                        <button disabled={busy} onClick={() => setPendingDelete(key)} type="button">Delete</button>
                      )}
                    </div>
                  </article>
                );
              })}
              {installed.length === 0 ? <p className="empty-note">No user catalogs installed in this browser.</p> : null}
            </div>
          </section>

          <section className="catalog-manager-section catalog-import-section">
            <div className="section-title"><span>Import catalog</span><small>CSV or JSON</small></div>
            <input
              accept=".csv,.json,text/csv,application/json"
              className="visually-hidden"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
            <button className="button secondary" onClick={() => fileInputRef.current?.click()} type="button">
              {file === null ? "Choose catalog file" : `File: ${file.name}`}
            </button>
            <div className="catalog-kind" role="group" aria-label="Catalog import format">
              <button aria-pressed={kind === "csv"} onClick={() => { setKind("csv"); clearPreview(); }} type="button">CSV</button>
              <button aria-pressed={kind === "json"} onClick={() => { setKind("json"); clearPreview(); }} type="button">Cocolla JSON</button>
            </div>

            {kind === "csv" ? (
              <div className="catalog-metadata-fields">
                <label>Catalog namespace<input onChange={(event) => { setCatalogId(event.target.value); clearPreview(); }} placeholder="user.my-floss" value={catalogId} /></label>
                <label>Manufacturer<input onChange={(event) => { setManufacturer(event.target.value); clearPreview(); }} value={manufacturer} /></label>
                <label>Thread line<input onChange={(event) => { setLine(event.target.value); clearPreview(); }} value={line} /></label>
                <label>Catalog version<input onChange={(event) => { setVersion(event.target.value); clearPreview(); }} placeholder="2026-10" value={version} /></label>
                <label>Source name<input onChange={(event) => { setSourceName(event.target.value); clearPreview(); }} value={sourceName} /></label>
                <label>Publisher<input onChange={(event) => { setPublisher(event.target.value); clearPreview(); }} value={publisher} /></label>
                <label>Source URL <span>optional</span><input onChange={(event) => { setSourceUrl(event.target.value); clearPreview(); }} type="url" value={sourceUrl} /></label>
                <label>Retrieved date <span>optional</span><input onChange={(event) => { setRetrievedAt(event.target.value); clearPreview(); }} type="date" value={retrievedAt} /></label>
                <label>License name <span>optional</span><input onChange={(event) => { setLicenseName(event.target.value); clearPreview(); }} value={licenseName} /></label>
                <label>License URL <span>optional</span><input onChange={(event) => { setLicenseUrl(event.target.value); clearPreview(); }} type="url" value={licenseUrl} /></label>
                <label>Redistribution<select onChange={(event) => { setRedistribution(event.target.value as ThreadCatalogRedistribution); clearPreview(); }} value={redistribution}><option value="unknown">Unknown</option><option value="restricted">Restricted</option><option value="allowed">Allowed</option></select></label>
                <label className="wide">Provenance notes <span>optional</span><textarea onChange={(event) => { setNotes(event.target.value); clearPreview(); }} value={notes} /></label>
              </div>
            ) : (
              <p className="catalog-json-note">Cocolla JSON supplies catalog identity, version, products, provenance, and the original rights-confirmation record.</p>
            )}

            <label className="catalog-rights-confirmation">
              <input checked={rightsConfirmed} onChange={(event) => { setRightsConfirmed(event.target.checked); clearPreview(); }} type="checkbox" />
              <span>I confirm that I have the right to use this data in Cocolla. This does not make it official or grant redistribution rights.</span>
            </label>
            <button className="button secondary" disabled={busy || file === null} onClick={() => void previewImport()} type="button">{busy ? "Reading…" : "Validate and preview"}</button>

            {diagnostics.length === 0 ? null : (
              <div className="catalog-diagnostics" aria-label="Catalog import diagnostics">
                <strong>{diagnosticsErrors.length === 0 ? "Validation notes" : `${diagnosticsErrors.length} validation error${diagnosticsErrors.length === 1 ? "" : "s"}`}</strong>
                <ul>{diagnostics.slice(0, 30).map((item, index) => <li className={item.severity} key={`${item.code}-${String(index)}`}>{item.row === undefined ? "" : `Row ${String(item.row)} · `}{item.message}</li>)}</ul>
                {diagnostics.length > 30 ? <small>{diagnostics.length - 30} additional diagnostics not shown.</small> : null}
              </div>
            )}

            {preview === null ? null : (
              <div className="catalog-preview">
                <div><strong>{preview.descriptor.brand} · {preview.descriptor.line}</strong><small>{preview.descriptor.id} · version {preview.descriptor.version} · {preview.products.length} products</small></div>
                <div className="catalog-preview-swatches">
                  {preview.products.slice(0, 18).map((product) => <span key={product.id} style={{ background: product.color.value }} title={`${product.manufacturerCode} · ${product.name}`} />)}
                </div>
                <p>Source: {preview.descriptor.attribution.sourceName} · {preview.descriptor.attribution.publisher}</p>
                <button className="button primary" disabled={busy || !rightsConfirmed} onClick={() => void savePreview()} type="button">Save locally and select</button>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};
