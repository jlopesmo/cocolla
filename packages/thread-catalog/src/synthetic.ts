import type {
  ThreadCatalogDescriptor,
  ThreadProduct,
} from "../../contracts/src/index.js";

import { InMemoryThreadCatalogProvider } from "./catalog.js";

export const SYNTHETIC_CATALOG_ID = "cocolla.synthetic-threads";

export const SYNTHETIC_THREAD_CATALOG_DESCRIPTOR: ThreadCatalogDescriptor = {
  id: SYNTHETIC_CATALOG_ID,
  brand: "Cocolla",
  line: "Synthetic validation threads",
  version: "1",
  attribution: {
    sourceName: "Cocolla synthetic test catalog",
    sourceUrl: null,
    publisher: "Cocolla",
    retrievedAt: null,
    licenseName: null,
    licenseUrl: null,
    redistribution: "allowed",
    notes: "Invented development data. These are not official products from DMC or any other manufacturer.",
  },
};

const syntheticProduct = (
  code: string,
  name: string,
  value: string,
): ThreadProduct => ({
  id: `${SYNTHETIC_CATALOG_ID}:${code}`,
  catalogId: SYNTHETIC_CATALOG_ID,
  manufacturerCode: code,
  name,
  color: { colorSpace: "srgb", value, provenance: "catalog" },
});

export const SYNTHETIC_THREAD_PRODUCTS: readonly ThreadProduct[] = [
  syntheticProduct("S001", "Night Ink", "#263238"),
  syntheticProduct("S002", "Coral Bloom", "#E76F51"),
  syntheticProduct("S003", "Sunlit Gold", "#E9A23B"),
  syntheticProduct("S004", "Garden Sage", "#6E9B78"),
  syntheticProduct("S005", "Deep Tide", "#287E86"),
  syntheticProduct("S006", "Open Sky", "#5479C9"),
  syntheticProduct("S007", "Orchard Plum", "#875B82"),
  syntheticProduct("S008", "Warm Linen", "#F0E4CF"),
  syntheticProduct("S009", "Cherry Thread", "#B7374A"),
  syntheticProduct("S010", "Forest Thread", "#285B43"),
  syntheticProduct("S011", "Violet Thread", "#6652A3"),
  syntheticProduct("S012", "Snow Thread", "#FAFAF7"),
];

export const syntheticThreadCatalog = new InMemoryThreadCatalogProvider(
  SYNTHETIC_THREAD_CATALOG_DESCRIPTOR,
  SYNTHETIC_THREAD_PRODUCTS,
);
