import { fullCrossTechnique } from "./full-cross.js";
import { TechniqueRegistry } from "./technique-registry.js";

export const defaultTechniqueRegistry = new TechniqueRegistry([
  fullCrossTechnique,
]);
