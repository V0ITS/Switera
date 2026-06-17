const baseStyle = {
  borderRadius: "var(--radius-full)",
  border: "1px solid transparent",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  padding: "10px 20px",
  boxShadow: "var(--shadow-xs)",
  transition:
    "background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
};

const variants = {
  primer: {
    backgroundColor: "var(--color-primary)",
    hoverBackgroundColor: "var(--color-primary-light)",
    color: "var(--color-surface)",
  },
  sekunder: {
    backgroundColor: "transparent",
    hoverBackgroundColor: "var(--color-primary-subtle)",
    border: "1.5px solid var(--color-primary)",
    color: "var(--color-primary)",
  },
  bahaya: {
    backgroundColor: "var(--color-danger)",
    hoverBackgroundColor: "#EF4444",
    color: "var(--color-surface)",
  },
};

function Tombol({ label, variant = "primer", onClick, type = "button" }) {
  const selectedVariant = variants[variant] ?? variants.primer;
  const { hoverBackgroundColor, ...buttonVariant } = selectedVariant;

  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        ...baseStyle,
        ...buttonVariant,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor =
          hoverBackgroundColor;
        event.currentTarget.style.transform = "translateY(-1px)";
        event.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor =
          buttonVariant.backgroundColor;
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = "var(--shadow-xs)";
      }}
      onMouseDown={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = "var(--shadow-xs)";
      }}
      onMouseUp={(event) => {
        event.currentTarget.style.transform = "translateY(-1px)";
        event.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {label}
    </button>
  );
}

export default Tombol;
