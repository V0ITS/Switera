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
      {/* Area ilustrasi ala Stitch data_kosong: lingkaran besar + ikon Material
          + dua titik dekoratif blur, dengan animasi mengambang halus. */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: "128px",
          height: "128px",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          backgroundColor: "var(--color-surface-container-low)",
          borderRadius: "var(--radius-full)",
          marginBottom: "var(--space-4)",
          animation: "floatSubtle 4s ease-in-out infinite",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "64px",
            lineHeight: 1,
            color: "rgba(0, 106, 67, 0.6)",
            fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48",
          }}
        >
          folder_open
        </span>
        <span
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "24px",
            height: "24px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-secondary-container)",
            opacity: 0.5,
            filter: "blur(4px)",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: "-4px",
            left: "-12px",
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "#ffb690",
            opacity: 0.4,
            filter: "blur(4px)",
          }}
        />
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-weight-semibold)",
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
