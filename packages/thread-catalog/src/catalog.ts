import type {
  ThreadCatalogDescriptor,
  ThreadCatalogPage,
  ThreadCatalogProvider,
  ThreadCatalogQuery,
  ThreadColorMatch,
  ThreadColorMatcher,
  ThreadColorMatchRequest,
  ThreadProduct,
} from "../../contracts/src/index.js";

import { deltaE2000, normalizeSrgbHex, srgbHexToLab } from "./color.js";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const cloneProduct = (product: ThreadProduct): ThreadProduct => ({
  ...product,
  color: { ...product.color },
});

export const validateThreadCatalog = (
  descriptor: ThreadCatalogDescriptor,
  products: readonly ThreadProduct[],
): void => {
  if (!IDENTIFIER.test(descriptor.id) || descriptor.version.trim().length === 0) {
    throw new RangeError("Catalog id and version must be non-empty stable identifiers.");
  }
  if (descriptor.brand.trim().length === 0 || descriptor.line.trim().length === 0) {
    throw new RangeError("Catalog brand and line must be non-empty.");
  }
  const attribution = descriptor.attribution;
  if (
    attribution.sourceName.trim().length === 0 ||
    attribution.publisher.trim().length === 0 ||
    !["allowed", "restricted", "unknown"].includes(attribution.redistribution)
  ) {
    throw new RangeError("Catalog attribution and redistribution metadata are invalid.");
  }
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const product of products) {
    if (!IDENTIFIER.test(product.id) || !product.id.startsWith(`${descriptor.id}:`)) {
      throw new RangeError(`Product id is not qualified by catalog ${descriptor.id}: ${product.id}.`);
    }
    if (product.catalogId !== descriptor.id) {
      throw new RangeError(`Product ${product.id} references the wrong catalog.`);
    }
    if (ids.has(product.id)) {
      throw new RangeError(`Duplicate thread product id: ${product.id}.`);
    }
    const normalizedCode = product.manufacturerCode.trim().toUpperCase();
    if (normalizedCode.length === 0 || codes.has(normalizedCode)) {
      throw new RangeError(`Duplicate or empty thread product code: ${product.manufacturerCode}.`);
    }
    if (
      product.name.trim().length === 0 ||
      product.color.colorSpace !== "srgb" ||
      !["catalog", "measured", "user-supplied"].includes(product.color.provenance)
    ) {
      throw new RangeError(`Thread product ${product.id} has invalid display metadata.`);
    }
    normalizeSrgbHex(product.color.value);
    ids.add(product.id);
    codes.add(normalizedCode);
  }
};

export class InMemoryThreadCatalogProvider implements ThreadCatalogProvider {
  readonly descriptor: ThreadCatalogDescriptor;
  readonly #products: readonly ThreadProduct[];
  readonly #byId: ReadonlyMap<string, ThreadProduct>;

  constructor(
    descriptor: ThreadCatalogDescriptor,
    products: readonly ThreadProduct[],
  ) {
    validateThreadCatalog(descriptor, products);
    this.descriptor = {
      ...descriptor,
      attribution: { ...descriptor.attribution },
    };
    this.#products = products.map(cloneProduct);
    this.#byId = new Map(this.#products.map((product) => [product.id, product]));
  }

  findProducts(query: ThreadCatalogQuery): Promise<ThreadCatalogPage> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return Promise.reject(new RangeError("Catalog page size must be between 1 and 100."));
    }
    const offset = query.cursor === undefined ? 0 : Number(query.cursor);
    if (!Number.isSafeInteger(offset) || offset < 0) {
      return Promise.reject(new RangeError("Catalog cursor is invalid."));
    }
    const text = query.text?.trim().toLowerCase() ?? "";
    const requestedCodes = query.manufacturerCodes === undefined
      ? null
      : new Set(query.manufacturerCodes.map((code) => code.trim().toUpperCase()));
    const filtered = this.#products.filter((product) => {
      if (
        requestedCodes !== null &&
        !requestedCodes.has(product.manufacturerCode.toUpperCase())
      ) {
        return false;
      }
      if (text.length === 0) {
        return true;
      }
      return product.manufacturerCode.toLowerCase().includes(text) ||
        product.name.toLowerCase().includes(text) ||
        product.id.toLowerCase().includes(text);
    });
    const end = Math.min(offset + limit, filtered.length);
    return Promise.resolve({
      products: filtered.slice(offset, end).map(cloneProduct),
      nextCursor: end < filtered.length ? String(end) : null,
    });
  }

  getProduct(productId: string): Promise<ThreadProduct | null> {
    const product = this.#byId.get(productId);
    return Promise.resolve(product === undefined ? null : cloneProduct(product));
  }
}

const allProducts = async (
  catalog: ThreadCatalogProvider,
): Promise<readonly ThreadProduct[]> => {
  const products: ThreadProduct[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await catalog.findProducts({ limit: MAX_PAGE_SIZE, ...(cursor === undefined ? {} : { cursor }) });
    products.push(...page.products);
    cursor = page.nextCursor ?? undefined;
    if (cursor !== undefined && seenCursors.has(cursor)) {
      throw new RangeError("Catalog pagination returned a repeated cursor.");
    }
    if (cursor !== undefined) {
      seenCursors.add(cursor);
    }
  } while (cursor !== undefined);
  return products;
};

export class Ciede2000ThreadColorMatcher implements ThreadColorMatcher {
  async match(
    request: ThreadColorMatchRequest,
    catalog: ThreadCatalogProvider,
  ): Promise<readonly ThreadColorMatch[]> {
    if (!Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > 100) {
      throw new RangeError("Color match limit must be between 1 and 100.");
    }
    const reference = srgbHexToLab(request.rgb);
    const products = await allProducts(catalog);
    return products
      .map((product): ThreadColorMatch => ({
        product,
        distance: deltaE2000(reference, srgbHexToLab(product.color.value)),
        algorithm: { key: "ciede2000-srgb-d50", version: 1 },
      }))
      .sort((left, right) =>
        left.distance - right.distance ||
        compareText(left.product.manufacturerCode.toUpperCase(), right.product.manufacturerCode.toUpperCase()) ||
        compareText(left.product.id, right.product.id))
      .slice(0, request.limit);
  }
}

export type ThreadAssignmentResolution =
  | { readonly status: "unassigned" }
  | { readonly status: "resolved"; readonly productId: string; readonly product: ThreadProduct }
  | { readonly status: "unresolved"; readonly productId: string };

export const resolveThreadAssignment = async (
  productId: string | null,
  catalogs: readonly ThreadCatalogProvider[],
): Promise<ThreadAssignmentResolution> => {
  if (productId === null) {
    return { status: "unassigned" };
  }
  for (const catalog of catalogs) {
    if (!productId.startsWith(`${catalog.descriptor.id}:`)) {
      continue;
    }
    try {
      const product = await catalog.getProduct(productId);
      if (product !== null) {
        return { status: "resolved", productId, product };
      }
    } catch {
      // Saved assignments remain unresolved when an optional provider is unavailable.
    }
  }
  return { status: "unresolved", productId };
};
