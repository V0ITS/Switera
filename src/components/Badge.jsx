const statusMap = {
  menunggu: {
    backgroundColor: "var(--color-warning-light)",
    color: "var(--color-warning)",
    label: "Menunggu",
  },
  "dalam-pengiriman": {
    backgroundColor: "var(--color-info-light)",
    color: "var(--color-info)",
    label: "Dalam Pengiriman",
  },
  selesai: {
    backgroundColor: "var(--color-success-light)",
    color: "var(--color-success)",
    label: "Selesai",
  },
  dibatalkan: {
    backgroundColor: "var(--color-danger-light)",
    color: "var(--color-danger)",
    label: "Dibatalkan",
  },
};

function Badge({ status }) {
  const config = statusMap[status] ?? {
    backgroundColor: "var(--color-text-secondary)",
    color: "var(--color-surface)",
    label: status,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "var(--radius-full)",
          backgroundColor: config.color,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

export default Badge;
