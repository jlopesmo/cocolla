import type {
  PortableThreadCatalogV1,
  ThreadCatalogDescriptor,
} from "../../contracts/src/index.js";

import {
  parsePortableThreadCatalogJson,
  portableCatalogKey,
  serializePortableThreadCatalog,
} from "./portable.js";

export interface ThreadCatalogVersionKey {
  readonly catalogId: string;
  readonly version: string;
}

export interface InstalledThreadCatalog {
  readonly key: ThreadCatalogVersionKey;
  readonly descriptor: ThreadCatalogDescriptor;
  readonly productCount: number;
  readonly importedAt: string;
}

export type SaveThreadCatalogResult = "created" | "unchanged";

export interface ThreadCatalogRepository {
  listCatalogs(): Promise<readonly InstalledThreadCatalog[]>;
  getCatalog(key: ThreadCatalogVersionKey): Promise<PortableThreadCatalogV1 | null>;
  saveCatalog(catalog: PortableThreadCatalogV1): Promise<SaveThreadCatalogResult>;
  deleteCatalog(key: ThreadCatalogVersionKey): Promise<void>;
  getActiveCatalog(): Promise<ThreadCatalogVersionKey | null>;
  setActiveCatalog(key: ThreadCatalogVersionKey | null): Promise<void>;
}

export class CatalogVersionConflictError extends Error {
  constructor(readonly key: ThreadCatalogVersionKey) {
    super(`Catalog ${key.catalogId} version ${key.version} already exists with different content.`);
    this.name = "CatalogVersionConflictError";
  }
}

export class CatalogStorageUnavailableError extends Error {
  constructor(message = "Browser catalog storage is unavailable.") {
    super(message);
    this.name = "CatalogStorageUnavailableError";
  }
}

export class CatalogStorageQuotaError extends Error {
  constructor(message = "Browser storage quota was exceeded while saving the catalog.") {
    super(message);
    this.name = "CatalogStorageQuotaError";
  }
}

const keyString = (key: ThreadCatalogVersionKey): string =>
  JSON.stringify([key.catalogId, key.version]);

const catalogKey = (catalog: PortableThreadCatalogV1): ThreadCatalogVersionKey => ({
  catalogId: catalog.descriptor.id,
  version: catalog.descriptor.version,
});

const cloneDescriptor = (descriptor: ThreadCatalogDescriptor): ThreadCatalogDescriptor => ({
  ...descriptor,
  attribution: { ...descriptor.attribution },
});

const deserializeCatalog = (serialized: string): PortableThreadCatalogV1 => {
  const parsed = parsePortableThreadCatalogJson(serialized);
  if (!parsed.ok) throw new RangeError("Stored catalog failed validation.");
  return parsed.catalog;
};

interface MemoryRecord {
  readonly canonicalJson: string;
  readonly importedAt: string;
}

export class InMemoryThreadCatalogRepository implements ThreadCatalogRepository {
  readonly #records = new Map<string, MemoryRecord>();
  #active: ThreadCatalogVersionKey | null = null;

  listCatalogs(): Promise<readonly InstalledThreadCatalog[]> {
    const catalogs = [...this.#records.values()].map((record) => {
      const catalog = deserializeCatalog(record.canonicalJson);
      return {
        key: catalogKey(catalog),
        descriptor: cloneDescriptor(catalog.descriptor),
        productCount: catalog.products.length,
        importedAt: record.importedAt,
      };
    });
    catalogs.sort((left, right) =>
      left.descriptor.brand.localeCompare(right.descriptor.brand, "en") ||
      left.key.catalogId.localeCompare(right.key.catalogId, "en") ||
      left.key.version.localeCompare(right.key.version, "en"));
    return Promise.resolve(catalogs);
  }

  getCatalog(key: ThreadCatalogVersionKey): Promise<PortableThreadCatalogV1 | null> {
    const record = this.#records.get(keyString(key));
    return Promise.resolve(record === undefined ? null : deserializeCatalog(record.canonicalJson));
  }

  saveCatalog(catalog: PortableThreadCatalogV1): Promise<SaveThreadCatalogResult> {
    const canonicalJson = serializePortableThreadCatalog(catalog);
    const key = catalogKey(catalog);
    const existing = this.#records.get(keyString(key));
    if (existing !== undefined) {
      if (existing.canonicalJson === canonicalJson) return Promise.resolve("unchanged");
      return Promise.reject(new CatalogVersionConflictError(key));
    }
    this.#records.set(keyString(key), { canonicalJson, importedAt: new Date().toISOString() });
    return Promise.resolve("created");
  }

  deleteCatalog(key: ThreadCatalogVersionKey): Promise<void> {
    const nextRecords = new Map(this.#records);
    nextRecords.delete(keyString(key));
    this.#records.clear();
    for (const [storedKey, value] of nextRecords) this.#records.set(storedKey, value);
    if (this.#active !== null && keyString(this.#active) === keyString(key)) this.#active = null;
    return Promise.resolve();
  }

  getActiveCatalog(): Promise<ThreadCatalogVersionKey | null> {
    return Promise.resolve(this.#active === null ? null : { ...this.#active });
  }

  async setActiveCatalog(key: ThreadCatalogVersionKey | null): Promise<void> {
    if (key !== null && !this.#records.has(keyString(key))) {
      throw new RangeError(`Catalog ${key.catalogId} version ${key.version} is not installed.`);
    }
    this.#active = key === null ? null : { ...key };
  }
}

export const threadCatalogVersionKey = (
  catalog: PortableThreadCatalogV1,
): ThreadCatalogVersionKey => ({
  catalogId: catalog.descriptor.id,
  version: catalog.descriptor.version,
});

export const threadCatalogVersionStorageKey = (
  key: ThreadCatalogVersionKey,
): string => keyString(key);

export const portableThreadCatalogStorageKey = (
  catalog: PortableThreadCatalogV1,
): string => portableCatalogKey(catalog);
