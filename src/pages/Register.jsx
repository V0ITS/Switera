import { useEffect, useState } from "react";
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

function IkonAt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V13C16 14.7 17.3 16 19 16C20.7 16 22 14.7 22 13V12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function Register({ onNavigate }) {
  const [role, setRole] = useState("Admin");
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onNavigate?.("/login");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [onNavigate, successMessage]);

  const getInputStyle = (field) => ({
    ...inputBaseStyle,
    borderColor:
      focusedField === field ? "var(--color-primary)" : "var(--color-border)",
    boxShadow:
      focusedField === field ? "0 0 0 3px rgba(37, 99, 235, 0.14)" : "none",
  });

  const validate = () => {
    const nextErrors = {};
    const normalizedUsername = username.trim();
    const daftarAkun = store.getDaftarAkun();

    if (!nama.trim() || !normalizedUsername || !password || !konfirmasiPassword || !role) {
      nextErrors.umum = "Semua field wajib diisi.";
    }

    if (normalizedUsername && normalizedUsername.length < 4) {
      nextErrors.username = "Username minimal 4 karakter.";
    }

    if (password && password.length < 6) {
      nextErrors.password = "Password minimal 6 karakter.";
    }

    if (konfirmasiPassword && konfirmasiPassword !== password) {
      nextErrors.konfirmasiPassword = "Konfirmasi password harus sama dengan password.";
    }

    if (
      normalizedUsername &&
      daftarAkun.some((akun) => akun.username === normalizedUsername)
    ) {
      nextErrors.username = "Username sudah digunakan.";
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    store.tambahAkun({
      id: `U${Date.now()}`,
      nama: nama.trim(),
      username: username.trim(),
      password,
      role,
    });

    setSuccessMessage("Akun berhasil dibuat. Silakan masuk.");
  };

  const renderError = (key) =>
    errors[key] ? (
      <p style={{ margin: "0.35rem 0 0", color: "var(--color-danger)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
        {errors[key]}
      </p>
    ) : null;

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
              maxWidth: "440px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
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
                Buat Akun Baru
              </h1>
              <p
                style={{
                  margin: "0.9rem 0 0",
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => onNavigate?.("/login")}
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
                  Masuk
                </button>
              </p>
            </div>

            <RolePills selectedRole={role} onSelectRole={setRole} />

            {errors.umum ? (
              <p style={{ margin: 0, color: "var(--color-danger)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                {errors.umum}
              </p>
            ) : null}

            <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Nama Lengkap</span>
              <span style={{ position: "relative" }}>
                <FieldIcon>
                  <IkonOrang />
                </FieldIcon>
                <input
                  type="text"
                  value={nama}
                  onFocus={() => setFocusedField("nama")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setNama(event.target.value);
                    setErrors({});
                  }}
                  style={getInputStyle("nama")}
                  autoComplete="name"
                />
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Username</span>
              <span style={{ position: "relative" }}>
                <FieldIcon>
                  <IkonAt />
                </FieldIcon>
                <input
                  type="text"
                  value={username}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setErrors({});
                  }}
                  style={getInputStyle("username")}
                  autoComplete="username"
                />
              </span>
              {renderError("username")}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
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
                    setErrors({});
                  }}
                  style={getInputStyle("password")}
                  autoComplete="new-password"
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
              {renderError("password")}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Konfirmasi Password</span>
              <span style={{ position: "relative" }}>
                <FieldIcon>
                  <IkonGembok />
                </FieldIcon>
                <input
                  type="password"
                  value={konfirmasiPassword}
                  onFocus={() => setFocusedField("konfirmasiPassword")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setKonfirmasiPassword(event.target.value);
                    setErrors({});
                  }}
                  style={getInputStyle("konfirmasiPassword")}
                  autoComplete="new-password"
                />
              </span>
              {renderError("konfirmasiPassword")}
            </label>

            <button
              type="submit"
              disabled={Boolean(successMessage)}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-surface)",
                cursor: successMessage ? "default" : "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 700,
                padding: "14px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Daftar
            </button>

            {successMessage ? (
              <p
                role="status"
                style={{
                  margin: 0,
                  color: "var(--color-success)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                }}
              >
                {successMessage}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </>
  );
}

export default Register;
