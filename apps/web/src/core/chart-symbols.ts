export interface ChartSymbolPoint {
  readonly x: number;
  readonly y: number;
}

export type ChartSymbolPrimitive =
  | {
      readonly kind: "circle";
      readonly radius: number;
      readonly filled: boolean;
    }
  | {
      readonly kind: "path";
      readonly points: readonly ChartSymbolPoint[];
      readonly closed: boolean;
      readonly filled: boolean;
      readonly heavy?: boolean;
    };

export interface CuratedChartSymbol {
  readonly value: string;
  readonly label: string;
  readonly primitives: readonly ChartSymbolPrimitive[];
}

const point = (x: number, y: number): ChartSymbolPoint => ({ x, y });
const path = (
  points: readonly ChartSymbolPoint[],
  closed = false,
  filled = false,
  heavy = false,
): ChartSymbolPrimitive => ({ kind: "path", points, closed, filled, heavy });
const circle = (radius: number, filled: boolean): ChartSymbolPrimitive => ({
  kind: "circle",
  radius,
  filled,
});

const diamond = [point(0, -0.43), point(0.43, 0), point(0, 0.43), point(-0.43, 0)];
const triangleUp = [point(0, -0.44), point(0.43, 0.36), point(-0.43, 0.36)];
const triangleDown = [point(-0.43, -0.36), point(0.43, -0.36), point(0, 0.44)];
const triangleLeft = [point(-0.44, 0), point(0.36, -0.43), point(0.36, 0.43)];
const triangleRight = [point(-0.36, -0.43), point(0.44, 0), point(-0.36, 0.43)];
const square = [point(-0.38, -0.38), point(0.38, -0.38), point(0.38, 0.38), point(-0.38, 0.38)];
const star = Array.from({ length: 10 }, (_, index) => {
  const angle = -Math.PI / 2 + index * Math.PI / 5;
  const radius = index % 2 === 0 ? 0.44 : 0.19;
  return point(Math.cos(angle) * radius, Math.sin(angle) * radius);
});

export const CURATED_CHART_SYMBOLS: readonly CuratedChartSymbol[] = [
  { value: "●", label: "Filled circle", primitives: [circle(0.38, true)] },
  { value: "○", label: "Open circle", primitives: [circle(0.38, false)] },
  { value: "◆", label: "Filled diamond", primitives: [path(diamond, true, true)] },
  { value: "◇", label: "Open diamond", primitives: [path(diamond, true)] },
  { value: "▲", label: "Filled triangle up", primitives: [path(triangleUp, true, true)] },
  { value: "△", label: "Open triangle up", primitives: [path(triangleUp, true)] },
  { value: "▼", label: "Filled triangle down", primitives: [path(triangleDown, true, true)] },
  { value: "▽", label: "Open triangle down", primitives: [path(triangleDown, true)] },
  { value: "◀", label: "Filled triangle left", primitives: [path(triangleLeft, true, true)] },
  { value: "◁", label: "Open triangle left", primitives: [path(triangleLeft, true)] },
  { value: "▶", label: "Filled triangle right", primitives: [path(triangleRight, true, true)] },
  { value: "▷", label: "Open triangle right", primitives: [path(triangleRight, true)] },
  { value: "■", label: "Filled square", primitives: [path(square, true, true)] },
  { value: "□", label: "Open square", primitives: [path(square, true)] },
  { value: "+", label: "Plus", primitives: [path([point(-0.4, 0), point(0.4, 0)]), path([point(0, -0.4), point(0, 0.4)])] },
  { value: "×", label: "Cross", primitives: [path([point(-0.34, -0.34), point(0.34, 0.34)]), path([point(0.34, -0.34), point(-0.34, 0.34)])] },
  { value: "✚", label: "Heavy plus", primitives: [path([point(-0.4, 0), point(0.4, 0)], false, false, true), path([point(0, -0.4), point(0, 0.4)], false, false, true)] },
  { value: "✖", label: "Heavy cross", primitives: [path([point(-0.34, -0.34), point(0.34, 0.34)], false, false, true), path([point(0.34, -0.34), point(-0.34, 0.34)], false, false, true)] },
  { value: "•", label: "Dot", primitives: [circle(0.14, true)] },
  { value: "—", label: "Horizontal line", primitives: [path([point(-0.42, 0), point(0.42, 0)])] },
  { value: "│", label: "Vertical line", primitives: [path([point(0, -0.42), point(0, 0.42)])] },
  { value: "/", label: "Forward slash", primitives: [path([point(-0.34, 0.4), point(0.34, -0.4)])] },
  { value: "\\", label: "Backslash", primitives: [path([point(-0.34, -0.4), point(0.34, 0.4)])] },
  { value: "⊙", label: "Bullseye", primitives: [circle(0.39, false), circle(0.12, true)] },
  { value: "⊕", label: "Circled plus", primitives: [circle(0.42, false), path([point(-0.28, 0), point(0.28, 0)]), path([point(0, -0.28), point(0, 0.28)])] },
  { value: "⊗", label: "Circled cross", primitives: [circle(0.42, false), path([point(-0.22, -0.22), point(0.22, 0.22)]), path([point(0.22, -0.22), point(-0.22, 0.22)])] },
  { value: "★", label: "Filled star", primitives: [path(star, true, true)] },
  { value: "☆", label: "Open star", primitives: [path(star, true)] },
  { value: "=", label: "Double horizontal", primitives: [path([point(-0.4, -0.14), point(0.4, -0.14)]), path([point(-0.4, 0.14), point(0.4, 0.14)])] },
  { value: "‖", label: "Double vertical", primitives: [path([point(-0.14, -0.4), point(-0.14, 0.4)]), path([point(0.14, -0.4), point(0.14, 0.4)])] },
  { value: "⌃", label: "Chevron up", primitives: [path([point(-0.38, 0.2), point(0, -0.22), point(0.38, 0.2)])] },
  { value: "⌄", label: "Chevron down", primitives: [path([point(-0.38, -0.2), point(0, 0.22), point(0.38, -0.2)])] },
];

const definitions = new Map(CURATED_CHART_SYMBOLS.map((symbol) => [symbol.value, symbol]));

export const curatedChartSymbol = (value: string): CuratedChartSymbol | undefined =>
  definitions.get(value);

export const availableCuratedChartSymbols = (
  assignedSymbols: readonly string[],
  activeSymbol: string,
): readonly CuratedChartSymbol[] => {
  const assignedElsewhere = new Set(
    assignedSymbols.filter((symbol) => symbol !== activeSymbol),
  );
  return CURATED_CHART_SYMBOLS.filter(
    (definition) => !assignedElsewhere.has(definition.value),
  );
};
