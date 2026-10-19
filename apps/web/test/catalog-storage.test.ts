import assert from "node:assert/strict";
import test from "node:test";

import { CatalogStorageUnavailableError } from "../../../packages/thread-catalog/src/index.js";
import { IndexedDbThreadCatalogRepository } from "../src/platform/indexeddb-thread-catalog-repository.js";

test("IndexedDB repository reports unavailable browser storage explicitly", async () => {
  const repository = new IndexedDbThreadCatalogRepository(null);
  await assert.rejects(repository.listCatalogs(), CatalogStorageUnavailableError);
  await assert.rejects(repository.getActiveCatalog(), /storage is unavailable/u);
});
