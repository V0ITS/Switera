function EmptyState({ pesan }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "2rem 1.5rem",
        textAlign: "center",
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-body)",
        transition: "box-shadow var(--transition-base)",
      }}
    >
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ maxWidth: "100%", height: "auto", marginBottom: "1rem" }}
      >
        <circle cx="66" cy="66" r="54" fill="var(--color-primary-subtle)" />
        <circle cx="66" cy="66" r="34" fill="var(--color-surface)" />
        <path
          d="M49 58H83M49 70H75M56 46H76C79.866 46 83 49.134 83 53V79C83 82.866 79.866 86 76 86H56C52.134 86 49 82.866 49 79V53C49 49.134 52.134 46 56 46Z"
          stroke="var(--color-primary-light)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
        }}
      >
        Belum ada data
      </p>
      <p
        style={{
          margin: "0.5rem 0 0",
          color: "var(--color-text-muted)",
        }}
      >
        {pesan}
      </p>
    </div>
  );
}

export default EmptyState;
