function PageHeader({ judul, deskripsi, aksi }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "var(--space-4)",
        flexWrap: "wrap",
        paddingBottom: "var(--space-6)",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-6)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--tracking-tight)",
            background: "linear-gradient(90deg, var(--color-text-primary) 0%, var(--color-text-secondary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {judul}
        </h1>
        {deskripsi ? (
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              margin: "var(--space-2) 0 0",
              backgroundColor: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              padding: "3px 10px",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            {deskripsi}
          </p>
        ) : null}
      </div>
      {aksi ? <div style={{ flexShrink: 0 }}>{aksi}</div> : null}
    </div>
  );
}

export default PageHeader;
