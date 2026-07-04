import { useEffect, useState } from "react";
import store from "../store";
import useRipple, { RippleSpans } from "../hooks/useRipple";
import Tombol from "../components/Tombol";
import {
  ErrorText,
  FieldIcon,
  IkonMata,
  IkonOrang,
  RolePills,
  TombolClose,
  fieldLabelStyle,
  inputBaseStyle,
} from "../components/auth/AuthShared";

function Register({ onNavigate, onClose, onSwitchToLogin }) {
  const [role, setRole] = useState("Admin");
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const linkRipple = useRipple();

  const goToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      onNavigate?.("/login");
    }
  };

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      goToLogin();
    }, 2000);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successMessage]);

  // Fokus ala neo brutalist: latar berubah pastel, border tetap hitam.
  const getInputStyle = (field) => ({
    ...inputBaseStyle,
    borderColor: errors[field] ? "var(--color-error)" : "#000000",
    backgroundColor: focusedField === field ? "var(--color-pastel)" : "#ffffff",
  });

  const validate = () => {
    const nextErrors = {};
    const normalizedUsername = username.trim();

    if (!nama.trim()) {
      nextErrors.nama = "Nama lengkap wajib diisi.";
    }

    if (!normalizedUsername) {
      nextErrors.username = "Username wajib diisi.";
    }

    if (!password) {
      nextErrors.password = "Password wajib diisi.";
    }

    if (!konfirmasiPassword) {
      nextErrors.konfirmasiPassword = "Konfirmasi password wajib diisi.";
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

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await store.register({
        nama: nama.trim(),
        username: username.trim(),
        password,
        role,
      });

      setSuccessMessage("Akun berhasil dibuat. Silakan masuk.");
    } catch (error) {
      if (error.message.includes("sudah digunakan")) {
        setErrors({ username: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>
        {`
          .auth-input::placeholder {
            color: var(--color-text-disabled);
          }

          input[type="password"]::-ms-reveal,
          input[type="password"]::-ms-clear,
          input[type="password"]::-webkit-credentials-auto-fill-button {
            display: none;
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-modal)",
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%), linear-gradient(90deg, rgba(8,20,14,0.6) 0%, transparent 60%), url('/images/sawit-bg.jpg')",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center, center, center",
          backgroundColor: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <span
          style={{
            position: "absolute",
            bottom: "var(--space-6)",
            left: "var(--space-8)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-weight-bold)",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          © Switera 2026
        </span>

        {/* Stiker dekoratif ala daftar_switera_neo_brutalist */}
        <span
          aria-hidden="true"
          className="landing-hero-mockup"
          style={{
            position: "absolute",
            top: "18%",
            right: "12%",
            width: "64px",
            height: "64px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "var(--color-lime)",
            border: "3px solid #000000",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-md)",
            transform: "rotate(15deg)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "34px", color: "#000000" }}>
            eco
          </span>
        </span>

        <form
          onSubmit={handleSubmit}
          style={{
            position: "relative",
            width: "min(460px, 90vw)",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            border: "3px solid #000000",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "6px 6px 0px 0px #000000",
            padding: "var(--space-10)",
            animation: "scaleIn 200ms var(--ease-out) both",
          }}
        >
          {onClose ? <TombolClose onClick={onClose} /> : null}

          {/* Header terpusat ala Stitch daftar_switera: badge ikon bulat + judul. */}
          <div style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
            <span
              aria-hidden="true"
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto var(--space-3)",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-lime)",
                border: "2px solid #000000",
                boxShadow: "var(--shadow-sm)",
                color: "#000000",
                display: "grid",
                placeItems: "center",
                transform: "rotate(6deg)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "32px", lineHeight: 1, fontVariationSettings: "'FILL' 1" }}
              >
                group_add
              </span>
            </span>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-3xl)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#000000",
              }}
            >
              Buat Akun Switera
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              Portal Manajemen Distribusi, daftar untuk mulai
            </p>
          </div>

          <RolePills selectedRole={role} onSelectRole={setRole} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <label style={{ display: "block" }}>
              <span style={{ display: "block", ...fieldLabelStyle }}>Nama Lengkap</span>
              <span style={{ position: "relative", display: "block" }}>
                <input
                  className="auth-input"
                  type="text"
                  value={nama}
                  placeholder="Nama lengkap"
                  onFocus={() => setFocusedField("nama")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setNama(event.target.value);
                    setErrors((previous) => ({ ...previous, nama: undefined }));
                  }}
                  style={getInputStyle("nama")}
                  autoComplete="name"
                />
                <FieldIcon>
                  <IkonOrang />
                </FieldIcon>
              </span>
              <ErrorText>{errors.nama}</ErrorText>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ display: "block", ...fieldLabelStyle }}>Username</span>
              <span style={{ position: "relative", display: "block" }}>
                <input
                  className="auth-input"
                  type="text"
                  value={username}
                  placeholder="Username"
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setErrors((previous) => ({ ...previous, username: undefined }));
                  }}
                  style={getInputStyle("username")}
                  autoComplete="username"
                />
                <FieldIcon>
                  <IkonOrang />
                </FieldIcon>
              </span>
              <ErrorText>{errors.username}</ErrorText>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ display: "block", ...fieldLabelStyle }}>Password</span>
              <span style={{ position: "relative", display: "block" }}>
                <input
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Password"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((previous) => ({ ...previous, password: undefined }));
                  }}
                  style={getInputStyle("password")}
                  autoComplete="new-password"
                />
                <FieldIcon clickable onClick={() => setShowPassword((value) => !value)}>
                  <IkonMata crossed={showPassword} />
                </FieldIcon>
              </span>
              <ErrorText>{errors.password}</ErrorText>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ display: "block", ...fieldLabelStyle }}>Konfirmasi Password</span>
              <span style={{ position: "relative", display: "block" }}>
                <input
                  className="auth-input"
                  type={showKonfirmasiPassword ? "text" : "password"}
                  value={konfirmasiPassword}
                  placeholder="Ulangi password"
                  onFocus={() => setFocusedField("konfirmasiPassword")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => {
                    setKonfirmasiPassword(event.target.value);
                    setErrors((previous) => ({ ...previous, konfirmasiPassword: undefined }));
                  }}
                  style={getInputStyle("konfirmasiPassword")}
                  autoComplete="new-password"
                />
                <FieldIcon
                  clickable
                  onClick={() => setShowKonfirmasiPassword((value) => !value)}
                >
                  <IkonMata crossed={showKonfirmasiPassword} />
                </FieldIcon>
              </span>
              <ErrorText>{errors.konfirmasiPassword}</ErrorText>
            </label>
          </div>

          <Tombol
            type="submit"
            label={isSubmitting ? "Memproses..." : "Daftar Sekarang"}
            variant="primer"
            disabled={isSubmitting || Boolean(successMessage)}
            style={{ width: "100%", marginTop: "var(--space-6)" }}
          />

          {successMessage ? (
            <p
              role="status"
              style={{
                margin: "var(--space-4) 0 0",
                textAlign: "center",
                color: "var(--color-success)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {successMessage}
            </p>
          ) : null}

          <p
            style={{
              margin: "var(--space-5) 0 0",
              textAlign: "center",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            Sudah punya akun?{" "}
            <button
              type="button"
              className="auth-link-btn"
              onClick={goToLogin}
              onMouseDown={linkRipple.onMouseDown}
            >
              Masuk
              <RippleSpans ripples={linkRipple.ripples} removeRipple={linkRipple.removeRipple} />
            </button>
          </p>
        </form>
      </div>
    </>
  );
}

export default Register;
