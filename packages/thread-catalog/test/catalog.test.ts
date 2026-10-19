import assert from "node:assert/strict";
import test from "node:test";

import {
  Ciede2000ThreadColorMatcher,
  InMemoryThreadCatalogProvider,
  SYNTHETIC_THREAD_CATALOG_DESCRIPTOR,
  SYNTHETIC_THREAD_PRODUCTS,
  resolveThreadAssignment,
  syntheticThreadCatalog,
} from "../src/index.js";

test("synthetic catalog supports deterministic search, filtering, and pagination", async () => {
  const search = await syntheticThreadCatalog.findProducts({ text: "coral", limit: 10 });
  assert.deepEqual(search.products.map((product) => product.manufacturerCode), ["S002"]);

  const filtered = await syntheticThreadCatalog.findProducts({
    manufacturerCodes: ["s004", "S001"],
    limit: 10,
  });
  assert.deepEqual(filtered.products.map((product) => product.manufacturerCode), ["S001", "S004"]);

  const first = await syntheticThreadCatalog.findProducts({ limit: 5 });
  assert.equal(first.products.length, 5);
  assert.equal(first.nextCursor, "5");
  const second = await syntheticThreadCatalog.findProducts({ cursor: first.nextCursor ?? undefined, limit: 5 });
  assert.equal(second.products[0]?.manufacturerCode, "S006");
  await assert.rejects(syntheticThreadCatalog.findProducts({ cursor: "not-an-offset" }), RangeError);
});

test("CIEDE2000 matcher is exact and deterministic", async () => {
  const matcher = new Ciede2000ThreadColorMatcher();
  const matches = await matcher.match({ rgb: "#E76F51", limit: 3 }, syntheticThreadCatalog);
  assert.equal(matches[0]?.product.id, "cocolla.synthetic-threads:S002");
  assert.equal(matches[0]?.distance, 0);
  assert.deepEqual(matches[0]?.algorithm, { key: "ciede2000-srgb-d50", version: 1 });

  const tiedProducts = [
    { ...SYNTHETIC_THREAD_PRODUCTS[0]!, id: `${SYNTHETIC_THREAD_CATALOG_DESCRIPTOR.id}:Z`, manufacturerCode: "Z" },
    { ...SYNTHETIC_THREAD_PRODUCTS[0]!, id: `${SYNTHETIC_THREAD_CATALOG_DESCRIPTOR.id}:A`, manufacturerCode: "A" },
  ];
  const tied = new InMemoryThreadCatalogProvider(SYNTHETIC_THREAD_CATALOG_DESCRIPTOR, tiedProducts);
  const tiedMatches = await matcher.match({ rgb: tiedProducts[0]!.color.value, limit: 2 }, tied);
  assert.deepEqual(tiedMatches.map((match) => match.product.manufacturerCode), ["A", "Z"]);

  const repeatedCursorCatalog = {
    descriptor: SYNTHETIC_THREAD_CATALOG_DESCRIPTOR,
    findProducts: () => Promise.resolve({ products: [], nextCursor: "same" }),
    getProduct: () => Promise.resolve(null),
  };
  await assert.rejects(
    matcher.match({ rgb: "#000000", limit: 1 }, repeatedCursorCatalog),
    /repeated cursor/u,
  );
});

test("assignment resolution preserves missing catalog identities", async () => {
  assert.deepEqual(await resolveThreadAssignment(null, [syntheticThreadCatalog]), { status: "unassigned" });
  const resolved = await resolveThreadAssignment("cocolla.synthetic-threads:S003", [syntheticThreadCatalog]);
  assert.equal(resolved.status, "resolved");
  if (resolved.status === "resolved") {
    assert.equal(resolved.product.manufacturerCode, "S003");
  }
  assert.deepEqual(
    await resolveThreadAssignment("future.catalog:missing", [syntheticThreadCatalog]),
    { status: "unresolved", productId: "future.catalog:missing" },
  );
  const unavailable = {
    descriptor: { ...SYNTHETIC_THREAD_CATALOG_DESCRIPTOR, id: "offline.catalog" },
    findProducts: syntheticThreadCatalog.findProducts.bind(syntheticThreadCatalog),
    getProduct: () => Promise.reject(new Error("offline")),
  };
  assert.deepEqual(
    await resolveThreadAssignment("offline.catalog:saved", [unavailable]),
    { status: "unresolved", productId: "offline.catalog:saved" },
  );
});

test("catalog validation rejects duplicates and invalid product metadata", () => {
  const product = SYNTHETIC_THREAD_PRODUCTS[0]!;
  assert.throws(
    () => new InMemoryThreadCatalogProvider(
      SYNTHETIC_THREAD_CATALOG_DESCRIPTOR,
      [product, product],
    ),
    /Duplicate thread product id/u,
  );
  assert.throws(
    () => new InMemoryThreadCatalogProvider(
      SYNTHETIC_THREAD_CATALOG_DESCRIPTOR,
      [{ ...product, color: { ...product.color, value: "not-a-color" } }],
    ),
    /#RRGGBB/u,
  );
});
