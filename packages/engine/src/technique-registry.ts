import type { StitchTechnique } from "./types.js";

export class TechniqueRegistry {
  readonly #techniques: ReadonlyMap<string, StitchTechnique>;

  public constructor(techniques: readonly StitchTechnique[]) {
    const entries = new Map<string, StitchTechnique>();
    for (const technique of techniques) {
      const registryKey = TechniqueRegistry.key(technique.key, technique.version);
      if (entries.has(registryKey)) {
        throw new Error(`Duplicate stitch technique registration: ${registryKey}`);
      }
      entries.set(registryKey, technique);
    }
    this.#techniques = entries;
  }

  public get(key: string, version: number): StitchTechnique | undefined {
    return this.#techniques.get(TechniqueRegistry.key(key, version));
  }

  public has(key: string, version: number): boolean {
    return this.get(key, version) !== undefined;
  }

  private static key(key: string, version: number): string {
    return `${key}@${String(version)}`;
  }
}
