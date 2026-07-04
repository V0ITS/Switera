const colorMap = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

function ProgressBar({ value = 0, color = "primary", showLabel = false, size = "sm" }) {
  const isOverflow = value > 100;
  const clamped = Math.max(0, Math.min(value, 100));
  const fillColor = isOverflow ? "var(--color-danger)" : colorMap[color] ?? colorMap.primary;
  const height = size === "md" ? "8px" : "4px";

  return (
    <div>
      {showLabel ? (
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            textAlign: "right",
          }}
        >
          {Math.round(value)}%
        </p>
      ) : null}
      <div
        style={{
          width: "100%",
          height: size === "md" ? "12px" : "8px",
          backgroundColor: "var(--color-surface)",
          border: "2px solid #000000",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clamped}%`,
            backgroundColor: fillColor,
            borderRadius: "var(--radius-full)",
            transition: "width 800ms var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
