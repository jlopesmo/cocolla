import assert from "node:assert/strict";
import test from "node:test";

import type { PortableThreadCatalogV1 } from "../../contracts/src/index.js";
import {
  CatalogVersionConflictError,
  InMemoryThreadCatalogProvider,
  InMemoryThreadCatalogRepository,
  resolveThreadAssignment,
  serializePortableThreadCatalog,
  threadCatalogVersionKey,
} from "../src/index.js";

const catalog = (color = "#112233"): PortableThreadCatalogV1 => ({
  format: "cocolla.thread-catalog",
  formatVersion: 1,
  descriptor: {
    id: "user.repository-test",
    brand: "Repository test",
    line: "Local cotton",
    version: "v1",
    attribution: {
      sourceName: "Test fixture",
      sourceUrl: null,
      publisher: "Cocolla tests",
      retrievedAt: "2026-10-18",
      licenseName: null,
      licenseUrl: null,
      redistribution: "unknown",
      notes: "Synthetic repository fixture.",
    },
  },
  rightsConfirmation: {
    statementVersion: 1,
    confirmed: true,
    confirmedAt: "2026-10-18T20:00:00.000Z",
  },
  products: [{
    id: "user.repository-test:r1",
    catalogId: "user.repository-test",
    manufacturerCode: "R1",
    name: "Repository blue",
    color: { colorSpace: "srgb", value: color, provenance: "user-supplied" },
  }],
});

test("repository imports are idempotent and conflicting versions roll back", async () => {
  const repository = new InMemoryThreadCatalogRepository();
  assert.equal(await repository.saveCatalog(catalog()), "created");
  assert.equal(await repository.saveCatalog(catalog()), "unchanged");
  await assert.rejects(repository.saveCatalog(catalog("#445566")), CatalogVersionConflictError);
  const restored = await repository.getCatalog(threadCatalogVersionKey(catalog()));
  assert.notEqual(restored, null);
  assert.equal(serializePortableThreadCatalog(restored!), serializePortableThreadCatalog(catalog()));
  assert.equal((await repository.listCatalogs()).length, 1);
});

test("catalog selection persists in the repository and active deletion is transactional", async () => {
  const repository = new InMemoryThreadCatalogRepository();
  const key = threadCatalogVersionKey(catalog());
  await repository.saveCatalog(catalog());
  await repository.setActiveCatalog(key);
  assert.deepEqual(await repository.getActiveCatalog(), key);
  await repository.deleteCatalog(key);
  assert.equal(await repository.getCatalog(key), null);
  assert.equal(await repository.getActiveCatalog(), null);
  await assert.rejects(repository.setActiveCatalog(key), /not installed/u);
});

test("missing and restored providers preserve unresolved physical-thread assignments", async () => {
  const productId = catalog().products[0]!.id;
  assert.deepEqual(await resolveThreadAssignment(productId, []), { status: "unresolved", productId });
  const provider = new InMemoryThreadCatalogProvider(catalog().descriptor, catalog().products);
  const restored = await resolveThreadAssignment(productId, [provider]);
  assert.equal(restored.status, "resolved");
  if (restored.status === "resolved") assert.equal(restored.product.id, productId);
  assert.deepEqual(await resolveThreadAssignment(productId, []), { status: "unresolved", productId });
});
