import type { CellPoint } from "./viewport.js";

export type EditorTool = "pencil" | "eraser" | "pan";
export type PointerAction = "draw" | "erase" | "pan" | "ignore";

export const pointerAction = (
  tool: EditorTool,
  button: number,
): PointerAction => {
  if (button === 1 || tool === "pan") {
    return "pan";
  }
  if (button !== 0) {
    return "ignore";
  }
  return tool === "pencil" ? "draw" : "erase";
};

export const traceCellsBetween = (
  start: CellPoint,
  end: CellPoint,
): readonly CellPoint[] => {
  const cells: CellPoint[] = [];
  let column = start.column;
  let row = start.row;
  const deltaColumn = Math.abs(end.column - start.column);
  const deltaRow = Math.abs(end.row - start.row);
  const stepColumn = start.column < end.column ? 1 : -1;
  const stepRow = start.row < end.row ? 1 : -1;
  let error = deltaColumn - deltaRow;

  while (true) {
    cells.push({ column, row });
    if (column === end.column && row === end.row) {
      return cells;
    }
    const doubledError = error * 2;
    if (doubledError > -deltaRow) {
      error -= deltaRow;
      column += stepColumn;
    }
    if (doubledError < deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
  }
};
