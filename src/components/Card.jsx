import { useState } from "react";

const accentColors = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

function Card({ children, style, hoverable = false, accent, shimmer = false, className, ...props }) {
  const [isHovered, setIsHovered] = useState(false);
  const isHighlighted = hoverable && isHovered;
  const combinedClassName = [shimmer ? "card-shimmer" : "", className].filter(Boolean).join(" ");

  return (
    <div
      {...props}
      className={combinedClassName || undefined}
      style={{
        backgroundColor: "var(--color-surface)",
        borderTop: accent
          ? `2px solid ${accentColors[accent] ?? accentColors.primary}`
          : `1px solid ${isHighlighted ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderRight: `1px solid ${isHighlighted ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderBottom: `1px solid ${isHighlighted ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderLeft: `1px solid ${isHighlighted ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        boxShadow: isHighlighted ? "var(--shadow-md)" : "none",
        transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
        animation: "fadeInUp 300ms var(--ease-smooth) both",
        ...style,
      }}
      onMouseEnter={(event) => {
        setIsHovered(true);
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        props.onMouseLeave?.(event);
      }}
    >
      {children}
    </div>
  );
}

export default Card;
