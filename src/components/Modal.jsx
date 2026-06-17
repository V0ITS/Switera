function Modal({ judul, konten, onTutup }) {
  return (
    <>
      <style>
        {`
          @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          zIndex: 1000,
          animation: "modalFadeIn 300ms ease",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "32rem",
            position: "relative",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            padding: "32px",
            animation: "modalSlideUp 300ms ease",
          }}
        >
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup modal"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "32px",
              height: "32px",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-surface-2)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              lineHeight: 1,
              transition:
                "background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor =
                "var(--color-primary-subtle)";
              event.currentTarget.style.transform = "translateY(-1px)";
              event.currentTarget.style.boxShadow = "var(--shadow-xs)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor =
                "var(--color-surface-2)";
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.boxShadow = "none";
            }}
          >
            ×
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "1rem",
              paddingRight: "2.5rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
              }}
            >
              {judul}
            </h2>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-secondary)",
            }}
          >
            {konten}
          </div>
        </div>
      </div>
    </>
  );
}

export default Modal;
