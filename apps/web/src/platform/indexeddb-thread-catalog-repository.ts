/// <reference lib="dom" />

import type {
  PortableThreadCatalogV1,
  ThreadCatalogDescriptor,
  ThreadCatalogRightsConfirmation,
  ThreadProduct,
} from "../../../../packages/contracts/src/index.js";
import {
  CatalogStorageQuotaError,
  CatalogStorageUnavailableError,
  CatalogVersionConflictError,
  parsePortableThreadCatalogJson,
  serializePortableThreadCatalog,
  threadCatalogVersionKey,
  threadCatalogVersionStorageKey,
  type InstalledThreadCatalog,
  type SaveThreadCatalogResult,
  type ThreadCatalogRepository,
  type ThreadCatalogVersionKey,
} from "../../../../packages/thread-catalog/src/index.js";

const DATABASE_NAME = "cocolla-thread-catalogs";
const DATABASE_VERSION = 1;
const VERSIONS_STORE = "catalogVersions";
const PRODUCTS_STORE = "catalogProducts";
const SETTINGS_STORE = "catalogSettings";
const ACTIVE_SETTING = "activeCatalog";

interface CatalogManifestRecord {
  readonly storageKey: string;
  readonly catalogId: string;
  readonly version: string;
  readonly format: "cocolla.thread-catalog";
  readonly formatVersion: 1;
  readonly descriptor: ThreadCatalogDescriptor;
  readonly rightsConfirmation: ThreadCatalogRightsConfirmation;
  readonly productCount: number;
  readonly importedAt: string;
  readonly canonicalJson: string;
}

interface CatalogProductRecord {
  readonly storageKey: string;
  readonly productKey: string;
  readonly product: ThreadProduct;
}

interface CatalogSettingRecord {
  readonly key: string;
  readonly value: string | null;
}

const mapStorageError = (reason: unknown): Error => {
  const name = typeof reason === "object" && reason !== null && "name" in reason
    ? String(reason.name)
    : "";
  if (name === "QuotaExceededError") return new CatalogStorageQuotaError();
  if (["SecurityError", "InvalidStateError", "NotSupportedError", "UnknownError"].includes(name)) {
    return new CatalogStorageUnavailableError();
  }
  return reason instanceof Error ? reason : new CatalogStorageUnavailableError();
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(mapStorageError(request.error)), { once: true });
  });

const transactionComplete = (transaction: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(mapStorageError(transaction.error)), { once: true });
    transaction.addEventListener("error", () => reject(mapStorageError(transaction.error)), { once: true });
  });

const cloneDescriptor = (descriptor: ThreadCatalogDescriptor): ThreadCatalogDescriptor => ({
  ...descriptor,
  attribution: { ...descriptor.attribution },
});

const productStorageKey = (storageKey: string, productId: string): string =>
  JSON.stringify([storageKey, productId]);

const parseVersionStorageKey = (storageKey: string): ThreadCatalogVersionKey | null => {
  try {
    const value = JSON.parse(storageKey) as unknown;
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "string"
      ? { catalogId: value[0], version: value[1] }
      : null;
  } catch {
    return null;
  }
};

const manifestSummary = (manifest: CatalogManifestRecord): InstalledThreadCatalog => ({
  key: { catalogId: manifest.catalogId, version: manifest.version },
  descriptor: cloneDescriptor(manifest.descriptor),
  productCount: manifest.productCount,
  importedAt: manifest.importedAt,
});

export class IndexedDbThreadCatalogRepository implements ThreadCatalogRepository {
  readonly #factory: IDBFactory | null;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory?: IDBFactory | null) {
    if (factory !== undefined) {
      this.#factory = factory;
      return;
    }
    try {
      this.#factory = globalThis.indexedDB ?? null;
    } catch {
      this.#factory = null;
    }
  }

  async #open(): Promise<IDBDatabase> {
    if (this.#factory === null) throw new CatalogStorageUnavailableError();
    if (this.#database !== null) return this.#database;
    this.#database = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.#factory!.open(DATABASE_NAME, DATABASE_VERSION);
      } catch (reason) {
        reject(mapStorageError(reason));
        return;
      }
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(VERSIONS_STORE)) {
          database.createObjectStore(VERSIONS_STORE, { keyPath: "storageKey" });
        }
        if (!database.objectStoreNames.contains(PRODUCTS_STORE)) {
          const products = database.createObjectStore(PRODUCTS_STORE, { keyPath: "productKey" });
          products.createIndex("byCatalogVersion", "storageKey", { unique: false });
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
        }
      });
      request.addEventListener("success", () => {
        const database = request.result;
        database.addEventListener("versionchange", () => database.close());
        resolve(database);
      }, { once: true });
      request.addEventListener("blocked", () => reject(new CatalogStorageUnavailableError("Catalog storage upgrade is blocked by another Cocolla tab.")), { once: true });
      request.addEventListener("error", () => reject(mapStorageError(request.error)), { once: true });
    }).catch((reason: unknown) => {
      this.#database = null;
      throw mapStorageError(reason);
    });
    return this.#database;
  }

  async listCatalogs(): Promise<readonly InstalledThreadCatalog[]> {
    const database = await this.#open();
    const transaction = database.transaction(VERSIONS_STORE, "readonly");
    const completion = transactionComplete(transaction);
    const records = await requestResult(transaction.objectStore(VERSIONS_STORE).getAll()) as CatalogManifestRecord[];
    await completion;
    return records
      .map(manifestSummary)
      .sort((left, right) =>
        left.descriptor.brand.localeCompare(right.descriptor.brand, "en") ||
        left.key.catalogId.localeCompare(right.key.catalogId, "en") ||
        left.key.version.localeCompare(right.key.version, "en"));
  }

  async getCatalog(key: ThreadCatalogVersionKey): Promise<PortableThreadCatalogV1 | null> {
    const database = await this.#open();
    const storageKey = threadCatalogVersionStorageKey(key);
    const transaction = database.transaction([VERSIONS_STORE, PRODUCTS_STORE], "readonly");
    const completion = transactionComplete(transaction);
    const manifestRequest = transaction.objectStore(VERSIONS_STORE).get(storageKey);
    const productsRequest = transaction.objectStore(PRODUCTS_STORE).index("byCatalogVersion").getAll(storageKey);
    const [manifestValue, productValues] = await Promise.all([
      requestResult(manifestRequest),
      requestResult(productsRequest),
    ]);
    await completion;
    if (manifestValue === undefined) return null;
    const manifest = manifestValue as CatalogManifestRecord;
    const records = productValues as CatalogProductRecord[];
    if (records.length !== manifest.productCount) {
      throw new CatalogStorageUnavailableError("Stored catalog products are incomplete.");
    }
    const candidate: PortableThreadCatalogV1 = {
      format: manifest.format,
      formatVersion: manifest.formatVersion,
      descriptor: manifest.descriptor,
      rightsConfirmation: manifest.rightsConfirmation,
      products: records.map((record) => record.product),
    };
    try {
      const serialized = serializePortableThreadCatalog(candidate);
      const parsed = parsePortableThreadCatalogJson(serialized);
      if (!parsed.ok || serializePortableThreadCatalog(parsed.catalog) !== manifest.canonicalJson) {
        throw new CatalogStorageUnavailableError("Stored catalog failed its integrity check.");
      }
      return parsed.catalog;
    } catch (reason) {
      if (reason instanceof CatalogStorageUnavailableError) throw reason;
      throw new CatalogStorageUnavailableError("Stored catalog failed its integrity check.");
    }
  }

  async saveCatalog(catalog: PortableThreadCatalogV1): Promise<SaveThreadCatalogResult> {
    const canonicalJson = serializePortableThreadCatalog(catalog);
    const normalized = parsePortableThreadCatalogJson(canonicalJson);
    if (!normalized.ok) throw new RangeError("Catalog validation failed before storage.");
    const key = threadCatalogVersionKey(normalized.catalog);
    const storageKey = threadCatalogVersionStorageKey(key);
    const database = await this.#open();
    const lookup = database.transaction(VERSIONS_STORE, "readonly");
    const lookupCompletion = transactionComplete(lookup);
    const existing = await requestResult(lookup.objectStore(VERSIONS_STORE).get(storageKey)) as CatalogManifestRecord | undefined;
    await lookupCompletion;
    if (existing !== undefined) {
      if (existing.canonicalJson === canonicalJson) {
        const stored = await this.getCatalog(key);
        if (stored === null) throw new CatalogStorageUnavailableError("Stored catalog manifest disappeared during import.");
        return "unchanged";
      }
      throw new CatalogVersionConflictError(key);
    }

    const transaction = database.transaction([VERSIONS_STORE, PRODUCTS_STORE], "readwrite");
    const completion = transactionComplete(transaction);
    let writeFailure: DOMException | null = null;
    const recordWriteFailure = (request: IDBRequest): void => {
      request.addEventListener("error", () => { writeFailure = request.error; }, { once: true });
    };
    const manifest: CatalogManifestRecord = {
      storageKey,
      catalogId: key.catalogId,
      version: key.version,
      format: normalized.catalog.format,
      formatVersion: normalized.catalog.formatVersion,
      descriptor: cloneDescriptor(normalized.catalog.descriptor),
      rightsConfirmation: { ...normalized.catalog.rightsConfirmation },
      productCount: normalized.catalog.products.length,
      importedAt: new Date().toISOString(),
      canonicalJson,
    };
    recordWriteFailure(transaction.objectStore(VERSIONS_STORE).add(manifest));
    const productStore = transaction.objectStore(PRODUCTS_STORE);
    for (const product of normalized.catalog.products) {
      const record: CatalogProductRecord = {
        storageKey,
        productKey: productStorageKey(storageKey, product.id),
        product: { ...product, color: { ...product.color } },
      };
      recordWriteFailure(productStore.add(record));
    }
    await completion.catch((reason: unknown) => {
      const failure = writeFailure ?? reason;
      if (failure instanceof Error && failure.name === "ConstraintError") throw new CatalogVersionConflictError(key);
      throw mapStorageError(failure);
    });
    return "created";
  }

  async deleteCatalog(key: ThreadCatalogVersionKey): Promise<void> {
    const database = await this.#open();
    const storageKey = threadCatalogVersionStorageKey(key);
    const transaction = database.transaction([VERSIONS_STORE, PRODUCTS_STORE, SETTINGS_STORE], "readwrite");
    const completion = transactionComplete(transaction);
    transaction.objectStore(VERSIONS_STORE).delete(storageKey);
    const cursorRequest = transaction.objectStore(PRODUCTS_STORE).index("byCatalogVersion").openKeyCursor(IDBKeyRange.only(storageKey));
    cursorRequest.addEventListener("success", () => {
      const cursor = cursorRequest.result;
      if (cursor === null) return;
      transaction.objectStore(PRODUCTS_STORE).delete(cursor.primaryKey);
      cursor.continue();
    });
    const settings = transaction.objectStore(SETTINGS_STORE);
    const activeRequest = settings.get(ACTIVE_SETTING);
    activeRequest.addEventListener("success", () => {
      const active = activeRequest.result as CatalogSettingRecord | undefined;
      if (active?.value === storageKey) settings.put({ key: ACTIVE_SETTING, value: null } satisfies CatalogSettingRecord);
    });
    await completion;
  }

  async getActiveCatalog(): Promise<ThreadCatalogVersionKey | null> {
    const database = await this.#open();
    const transaction = database.transaction(SETTINGS_STORE, "readonly");
    const completion = transactionComplete(transaction);
    const record = await requestResult(transaction.objectStore(SETTINGS_STORE).get(ACTIVE_SETTING)) as CatalogSettingRecord | undefined;
    await completion;
    return record?.value === null || record === undefined ? null : parseVersionStorageKey(record.value);
  }

  async setActiveCatalog(key: ThreadCatalogVersionKey | null): Promise<void> {
    if (key !== null && await this.getCatalog(key) === null) {
      throw new RangeError(`Catalog ${key.catalogId} version ${key.version} is not installed.`);
    }
    const database = await this.#open();
    const transaction = database.transaction(SETTINGS_STORE, "readwrite");
    const completion = transactionComplete(transaction);
    const record: CatalogSettingRecord = {
      key: ACTIVE_SETTING,
      value: key === null ? null : threadCatalogVersionStorageKey(key),
    };
    transaction.objectStore(SETTINGS_STORE).put(record);
    await completion;
  }
}
