interface IconProps {
  readonly name:
    | "add"
    | "download"
    | "erase"
    | "fit"
    | "grid"
    | "hand"
    | "minus"
    | "pencil"
    | "redo"
    | "upload"
    | "undo";
  readonly size?: number;
}

const paths: Record<IconProps["name"], string> = {
  add: "M12 5v14M5 12h14",
  download: "M12 3v12m0 0 5-5m-5 5-5-5M5 21h14",
  erase: "m7 20-4-4 10-10 5 5-9 9H7Zm5-13 5 5",
  fit: "M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5",
  grid: "M4 4h16v16H4zM4 10h16M10 4v16",
  hand: "M8 12V6a2 2 0 0 1 4 0v4-1V5a2 2 0 0 1 4 0v5-1V7a2 2 0 0 1 4 0v7c0 4-3 7-7 7h-1c-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-2l2 2v-2Z",
  minus: "M5 12h14",
  pencil: "m4 20 4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3",
  redo: "M20 7v5h-5M20 12a8 8 0 0 0-14-4M4 17v-5h5M4 12a8 8 0 0 0 14 4",
  upload: "M12 21V9m0 0 5 5m-5-5-5 5M5 3h14",
  undo: "M4 7v5h5M4 12A8 8 0 0 1 18 8M20 17v-5h-5M20 12a8 8 0 0 1-14 4",
};

export const Icon = ({ name, size = 18 }: IconProps): React.JSX.Element => (
  <svg
    aria-hidden="true"
    className="icon"
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <path
      d={paths[name]}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);
