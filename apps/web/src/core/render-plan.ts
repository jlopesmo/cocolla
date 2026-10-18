import {
  defaultTechniqueRegistry,
  type FrontPrimitive,
  type PatternDocument,
  type StitchElementV1,
} from "../../../../packages/engine/src/index.js";

import {
  type Viewport,
  type ViewportSize,
  visibleCellBounds,
} from "./viewport.js";

export interface VisibleStitchGeometry {
  readonly stitch: StitchElementV1;
  readonly primitives: readonly FrontPrimitive[];
}

export interface RenderPlan {
  readonly visible: readonly VisibleStitchGeometry[];
  readonly skippedUnsupported: number;
}

export const createRenderPlan = (
  document: PatternDocument,
  viewport: Viewport,
  size: ViewportSize,
): RenderPlan => {
  const bounds = visibleCellBounds(viewport, size);
  const units = document.coordinateSystem.unitsPerFabricCell;
  const visible: VisibleStitchGeometry[] = [];
  let skippedUnsupported = 0;

  for (const stitch of document.stitches) {
    const column = Math.floor(stitch.geometry.anchor.x / units);
    const row = Math.floor(stitch.geometry.anchor.y / units);
    if (
      column < bounds.minimumColumn ||
      column > bounds.maximumColumn ||
      row < bounds.minimumRow ||
      row > bounds.maximumRow
    ) {
      continue;
    }
    const technique = defaultTechniqueRegistry.get(
      stitch.technique.key,
      stitch.technique.version,
    );
    if (technique === undefined) {
      skippedUnsupported += 1;
      continue;
    }
    visible.push({
      stitch,
      primitives: technique.frontGeometry(stitch, { document }),
    });
  }

  return { visible, skippedUnsupported };
};
