import { useState } from "react";
import store from "../store";

const roleOptions = ["Admin", "Manajer Distribusi", "Tim Logistik"];

const inputBaseStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-base)",
  padding: "12px 44px",
  outline: "none",
  transition:
    "border-color var(--transition-fast), box-shadow var(--transition-fast)",
};

function IkonDaun({ size = 64, color = "var(--color-surface)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M39 8C25.5 8.4 13 16.7 13 29.2C13 35.2 17.8 40 23.8 40C35.7 40 41.2 25.4 39 8Z"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M11 40C16.8 27.3 25.3 19.5 36 14"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IkonOrang() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20C5.8 16.8 8.5 15 12 15C15.5 15 18.2 16.8 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IkonGembok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IkonMata() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12C4.5 7.8 7.8 5.7 12 5.7C16.2 5.7 19.5 7.8 22 12C19.5 16.2 16.2 18.3 12 18.3C7.8 18.3 4.5 16.2 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PanelBrand() {
  return (
    <aside className="auth-brand-panel">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "1.25rem",
          maxWidth: "420px",
        }}
      >
        <IkonDaun />
        <div>
          <h1
            style={{
              margin: 0,
              color: "var(--color-surface)",
              fontFamily: "var(--font-display)",
              fontSize: "3rem",
              lineHeight: 1,
            }}
          >
            Switera
          </h1>
          <p
            style={{
              margin: "1rem 0 0",
              color: "rgba(255,255,255,0.84)",
              fontSize: "var(--text-lg)",
              lineHeight: 1.6,
            }}
          >
            Platform Manajemen Distribusi TBS Kelapa Sawit
          </p>
        </div>
      </div>
    </aside>
  );
}

function RolePills({ selectedRole, onSelectRole }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "0.5rem",
      }}
    >
      {roleOptions.map((role) => {
        const active = role === selectedRole;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onSelectRole(role)}
            style={{
              border: active
                ? "1.5px solid var(--color-primary)"
                : "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              backgroundColor: active
                ? "var(--color-primary)"
                : "var(--color-surface)",
              color: active ? "var(--color-surface)" : "var(--color-text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              fontWeight: active ? 700 : 600,
              padding: "10px 12px",
              transition:
                "background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
            }}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}

function FieldIcon({ children }) {
  return (
    <span
      style={{
        position: "absolute",
        left: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--color-text-muted)",
        display: "inline-flex",
      }}
    >
      {children}
    </span>
  );
}

function Login({ onNavigate }) {
  const [role, setRole] = useState("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [error, setError] = useState("");

  const getInputStyle = (field) => ({
    ...inputBaseStyle,
    borderColor:
      focusedField === field ? "var(--color-primary)" : "var(--color-border)",
    boxShadow:
      focusedField === field ? "0 0 0 3px rgba(37, 99, 235, 0.14)" : "none",
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim() || !role) {
      setError("Harap isi semua field.");
      return;
    }

    const akun = store.cariAkun(username, password, role);

    if (!akun) {
      setError("Username, password, atau role tidak sesuai.");
      return;
    }

    const { password: _password, ...userAktif } = akun;
    store.setUserAktif(userAktif);
  };

  return (
    <>
      <style>
        {`
          .auth-shell {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: var(--color-surface);
            font-family: var(--font-body);
          }

          .auth-brand-panel {
            background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px;
          }

          .auth-form-panel {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px;
          }

          @media (max-width: 860px) {
            .auth-shell {
              grid-template-columns: 1fr;
            }

            .auth-brand-panel {
              display: none;
            }
          }
        `}
      </style>
      <div className="auth-shell">
        <PanelBrand />
        <main className="auth-form-panel">
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: "420px",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-3xl)",
                  color: "var(--color-text-primary)",
                }}
              >
                Selamat Datang
              </h1>
              <p
                style={{
                  margin: "0.45rem 0 0",
                  color: "var(--color-text-muted)",
                }}
              >
                Masuk ke akun Anda
              </p>
              <p
                style={{
                  margin: "0.9rem 0 0",
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => onNavigate?.("/register")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--color-primary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  Daftar sekarang
                </button>
              </p>
            </div>

            <RolePills selectedRole={role} onSelectRole={setRole} />

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Username</span>
              <span style={{ position: "relative" }}>
                <FieldIcon>
                  <IkonOrang />
                </FieldIcon>
                <input
                  type="text"
                  value={username}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  style={getInputStyle("username")}
                  autoComplete="username"
                />
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Password</span>
              <span style={{ position: "relative" }}>
                <FieldIcon>
                  <IkonGembok />
                </FieldIcon>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  style={getInputStyle("password")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    padding: "4px",
                  }}
                >
                  <IkonMata />
                </button>
              </span>
            </label>

            <button
              type="submit"
              style={{
                width: "100%",
                border: "none",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-surface)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 700,
                padding: "14px",
                boxShadow: "var(--shadow-sm)",
                transition:
                  "background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
              }}
            >
              Masuk
            </button>

            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "var(--color-danger)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                }}
              >
                {error}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </>
  );
}

export default Login;
