function EmptyState({ pesan, aksi }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-16) var(--space-8)",
        gap: "var(--space-2)",
      }}
    >
      {/* Ilustrasi ala sistem_ui neo brutalist: lingkaran pastel dengan
          border hitam dan ikon Material, dimiringkan 12 derajat. */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: "128px",
          height: "128px",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          backgroundColor: "var(--color-pastel)",
          border: "2px solid #000000",
          borderRadius: "var(--radius-full)",
          marginBottom: "var(--space-4)",
          transform: "rotate(12deg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "64px",
            lineHeight: 1,
            color: "var(--color-primary)",
            fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48",
          }}
        >
          inbox
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-weight-bold)",
          letterSpacing: "var(--tracking-tight)",
          color: "var(--color-on-surface)",
        }}
      >
        Belum ada data
      </p>
      <p
        style={{
          margin: 0,
          maxWidth: "32rem",
          fontSize: "var(--text-sm)",
          color: "var(--color-on-surface-variant)",
          lineHeight: 1.6,
        }}
      >
        {pesan}
      </p>
      {aksi ? <div style={{ marginTop: "var(--space-4)" }}>{aksi}</div> : null}
    </div>
  );
}

export default EmptyState;
