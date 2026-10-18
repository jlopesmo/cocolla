export type ThreadCatalogRedistribution = "allowed" | "restricted" | "unknown";

export interface ThreadCatalogAttribution {
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly publisher: string;
  readonly retrievedAt: string | null;
  readonly licenseName: string | null;
  readonly licenseUrl: string | null;
  readonly redistribution: ThreadCatalogRedistribution;
  readonly notes: string | null;
}

export interface ThreadCatalogDescriptor {
  readonly id: string;
  readonly brand: string;
  readonly line: string;
  readonly version: string;
  readonly attribution: ThreadCatalogAttribution;
}

export interface ThreadProductColor {
  readonly colorSpace: "srgb";
  readonly value: string;
  readonly provenance: "catalog" | "measured" | "user-supplied";
}

export interface ThreadProduct {
  readonly id: string;
  readonly catalogId: string;
  readonly manufacturerCode: string;
  readonly name: string;
  readonly color: ThreadProductColor;
}

export interface ThreadCatalogQuery {
  readonly text?: string;
  readonly manufacturerCodes?: readonly string[];
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ThreadCatalogPage {
  readonly products: readonly ThreadProduct[];
  readonly nextCursor: string | null;
}

export interface ThreadCatalogProvider {
  readonly descriptor: ThreadCatalogDescriptor;
  findProducts(query: ThreadCatalogQuery): Promise<ThreadCatalogPage>;
  getProduct(productId: string): Promise<ThreadProduct | null>;
}

export interface ThreadColorMatchRequest {
  readonly rgb: string;
  readonly limit: number;
}

export interface ThreadColorMatch {
  readonly product: ThreadProduct;
  readonly distance: number;
  readonly algorithm: {
    readonly key: string;
    readonly version: number;
  };
}

export interface ThreadColorMatcher {
  match(
    request: ThreadColorMatchRequest,
    catalog: ThreadCatalogProvider,
  ): Promise<readonly ThreadColorMatch[]>;
}
