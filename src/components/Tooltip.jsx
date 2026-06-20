import { useState } from "react";

const boxPositionStyles = {
  top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
};

const arrowPositionStyles = {
  top: {
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    borderWidth: "6px 6px 0 6px",
    borderColor: "var(--color-border-mid) transparent transparent transparent",
  },
  bottom: {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    borderWidth: "0 6px 6px 6px",
    borderColor: "transparent transparent var(--color-border-mid) transparent",
  },
  right: {
    right: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    borderWidth: "6px 6px 6px 0",
    borderColor: "transparent var(--color-border-mid) transparent transparent",
  },
};

function Tooltip({ children, content, position = "top" }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            ...boxPositionStyles[position],
            backgroundColor: "var(--color-surface-3)",
            border: "1px solid var(--color-border-mid)",
            borderRadius: "var(--radius-sm)",
            padding: "5px 10px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-md)",
            pointerEvents: "none",
            zIndex: "var(--z-dropdown)",
            animation: "fadeIn 150ms var(--ease-out) both",
          }}
        >
          {content}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 0,
              height: 0,
              border: "solid transparent",
              ...arrowPositionStyles[position],
            }}
          />
        </span>
      ) : null}
    </span>
  );
}

export default Tooltip;
