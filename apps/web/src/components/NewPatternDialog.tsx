import { useEffect, useState } from "react";

import {
  MAX_PATTERN_CELLS,
  MIN_PATTERN_CELLS,
  validatePatternDimensions,
  type PatternDimensions,
} from "../core/pattern.js";

interface NewPatternDialogProps {
  readonly open: boolean;
  readonly initialName: string;
  readonly initialDimensions: PatternDimensions;
  readonly onCancel: () => void;
  readonly onCreate: (name: string, dimensions: PatternDimensions) => void;
}

export const NewPatternDialog = ({
  open,
  initialName,
  initialDimensions,
  onCancel,
  onCreate,
}: NewPatternDialogProps): React.JSX.Element | null => {
  const [name, setName] = useState(initialName);
  const [width, setWidth] = useState(String(initialDimensions.width));
  const [height, setHeight] = useState(String(initialDimensions.height));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setWidth(String(initialDimensions.width));
      setHeight(String(initialDimensions.height));
      setError(null);
    }
  }, [initialDimensions.height, initialDimensions.width, initialName, open]);

  if (!open) {
    return null;
  }

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const dimensions = { width: Number(width), height: Number(height) };
    const dimensionError = validatePatternDimensions(dimensions.width, dimensions.height);
    if (name.trim().length === 0) {
      setError("Give the pattern a name.");
      return;
    }
    if (dimensionError !== null) {
      setError(dimensionError);
      return;
    }
    onCreate(name, dimensions);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="new-pattern-title"
        aria-modal="true"
        className="dialog-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-heading">
          <p className="eyebrow">Blank canvas</p>
          <h2 id="new-pattern-title">Create a new pattern</h2>
          <p>Choose a fabric grid. Existing unsaved work will remain untouched until you create it.</p>
        </div>
        <form onSubmit={submit}>
          <label className="field-label">
            Pattern name
            <input
              autoFocus
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <div className="dimension-fields">
            <label className="field-label">
              Width
              <span className="number-input-wrap">
                <input
                  max={MAX_PATTERN_CELLS}
                  min={MIN_PATTERN_CELLS}
                  onChange={(event) => setWidth(event.target.value)}
                  type="number"
                  value={width}
                />
                <span>cells</span>
              </span>
            </label>
            <label className="field-label">
              Height
              <span className="number-input-wrap">
                <input
                  max={MAX_PATTERN_CELLS}
                  min={MIN_PATTERN_CELLS}
                  onChange={(event) => setHeight(event.target.value)}
                  type="number"
                  value={height}
                />
                <span>cells</span>
              </span>
            </label>
          </div>
          {error === null ? null : <p className="form-error">{error}</p>}
          <div className="dialog-actions">
            <button className="button secondary" onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="button primary" type="submit">
              Create pattern
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
