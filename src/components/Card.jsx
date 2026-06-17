import { useState } from "react";

function Card({ children, style, ...props }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      {...props}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: isHovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        padding: "24px",
        transition: "box-shadow var(--transition-base)",
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
