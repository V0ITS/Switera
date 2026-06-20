import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Tombol from "../components/Tombol";
import store from "../store";

function IkonCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5L11 15.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const getTodayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialForm = {
  kota: "",
  tanggalPermintaan: "",
  jumlahPermintaan: "",
  keterangan: "",
};

function InputData({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [focusedField, setFocusedField] = useState("");
  const [hoveredField, setHoveredField] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const daftarKota = useMemo(() => snapshot.daftarKota ?? [], [snapshot.daftarKota]);

  const validate = (nextForm) => {
    const nextErrors = {};

    if (!nextForm.kota) {
      nextErrors.kota = "Nama kota wajib dipilih.";
    }

    if (!nextForm.tanggalPermintaan) {
      nextErrors.tanggalPermintaan = "Tanggal permintaan wajib diisi.";
    }

    if (!nextForm.jumlahPermintaan) {
      nextErrors.jumlahPermintaan = "Jumlah permintaan wajib diisi.";
    } else if (Number(nextForm.jumlahPermintaan) <= 0) {
      nextErrors.jumlahPermintaan = "Jumlah tidak boleh nol atau negatif.";
    }

    if (
      nextForm.kota &&
      nextForm.tanggalPermintaan &&
      store.hasPermintaanDuplikat({
        kota: nextForm.kota,
        tanggalPermintaan: nextForm.tanggalPermintaan,
      })
    ) {
      nextErrors.tanggalPermintaan =
        "Data untuk kota ini pada tanggal tersebut sudah ada.";
    }

    return nextErrors;
  };

  const handleChange = (field, value) => {
    const nextForm = {
      ...form,
      [field]: value,
    };

    setForm(nextForm);
    setErrors(validate(nextForm));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    window.setTimeout(() => {
      store.addPermintaan({
        kota: form.kota,
        tanggal_permintaan: form.tanggalPermintaan,
        tanggal_input: getTodayKey(),
        jumlah_permintaan: Number(form.jumlahPermintaan),
        keterangan: form.keterangan.trim(),
      });

      setForm(initialForm);
      setErrors({});
      setIsSaving(false);
      setToastMessage("Data permintaan berhasil disimpan.");
    }, 800);
  };

  const fieldBaseStyle = {
    width: "100%",
    border: "1px solid var(--color-border-mid)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-surface-2)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-sm)",
    padding: "10px 14px",
    outline: "none",
    boxSizing: "border-box",
    transition:
      "border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast)",
  };

  const getFieldStyle = (field) => {
    const isFocused = focusedField === field;
    const isHovered = hoveredField === field && !isFocused;

    return {
      ...fieldBaseStyle,
      backgroundColor: isHovered ? "var(--color-surface-3)" : "var(--color-surface-2)",
      borderColor: isFocused
        ? "var(--color-primary)"
        : isHovered
          ? "var(--color-border-strong)"
          : "var(--color-border-mid)",
      boxShadow: isFocused ? "0 0 0 3px var(--color-primary-glow)" : "none",
    };
  };

  const getFieldHandlers = (field) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(""),
    onMouseEnter: () => setHoveredField(field),
    onMouseLeave: () => setHoveredField(""),
  });

  const labelStyle = {
    display: "block",
    marginBottom: "var(--space-2)",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--font-weight-semibold)",
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wider)",
  };

  const errorStyle = {
    margin: "6px 0 0",
    color: "var(--color-danger)",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  };

  return (
    <Layout title="Switera" roleAwal="Admin" menuAwal="input-data" onMenuChange={onNavigate}>
      <style>
        {`
          @keyframes toastSlideIn {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}
      </style>
      <PageHeader
        judul="Input Data Permintaan Kota"
        deskripsi="Isi permintaan TBS per kota sebagai dasar ranking dan keputusan distribusi."
      />
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <Card
          style={{
            border: "1px solid var(--color-border-mid)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-8)",
            boxShadow: "var(--shadow-md), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <label style={labelStyle}>Nama Kota</label>
                <select
                  className="field-select"
                  value={form.kota}
                  onChange={(event) => handleChange("kota", event.target.value)}
                  style={getFieldStyle("kota")}
                  {...getFieldHandlers("kota")}
                >
                  <option value="">⚑ Pilih kota</option>
                  {daftarKota.map((kota) => (
                    <option key={kota} value={kota}>
                      ⚑ {kota}
                    </option>
                  ))}
                </select>
                {errors.kota ? <p style={errorStyle}>{errors.kota}</p> : null}
              </div>

              <div>
                <label style={labelStyle}>Tanggal Permintaan</label>
                <input
                  type="date"
                  value={form.tanggalPermintaan}
                  onChange={(event) =>
                    handleChange("tanggalPermintaan", event.target.value)
                  }
                  style={getFieldStyle("tanggalPermintaan")}
                  {...getFieldHandlers("tanggalPermintaan")}
                />
                {errors.tanggalPermintaan ? (
                  <p style={errorStyle}>{errors.tanggalPermintaan}</p>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: "var(--space-4)" }}>
              <label style={labelStyle}>Jumlah Permintaan dalam ton</label>
              <input
                type="number"
                className="field-no-spinner"
                min="1"
                step="1"
                value={form.jumlahPermintaan}
                onChange={(event) =>
                  handleChange("jumlahPermintaan", event.target.value)
                }
                style={getFieldStyle("jumlahPermintaan")}
                {...getFieldHandlers("jumlahPermintaan")}
              />
              {errors.jumlahPermintaan ? (
                <p style={errorStyle}>{errors.jumlahPermintaan}</p>
              ) : null}
            </div>

            <div style={{ marginTop: "var(--space-4)" }}>
              <label style={labelStyle}>Keterangan</label>
              <textarea
                rows="5"
                value={form.keterangan}
                onChange={(event) => handleChange("keterangan", event.target.value)}
                placeholder="Tambahkan catatan jika diperlukan."
                style={{
                  ...getFieldStyle("keterangan"),
                  minHeight: "120px",
                  resize: "vertical",
                  lineHeight: "var(--leading-loose)",
                }}
                {...getFieldHandlers("keterangan")}
              />
              {errors.keterangan ? (
                <p style={errorStyle}>{errors.keterangan}</p>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <Tombol
                type="submit"
                disabled={isSaving}
                style={{ padding: "10px 28px" }}
                label={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    {isSaving ? <span className="spinner" /> : <IkonCheck />}
                    {isSaving ? "Menyimpan..." : "Simpan Data"}
                  </span>
                }
              />
            </div>
          </form>
        </Card>
      </div>

      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            bottom: "var(--space-6)",
            right: "var(--space-6)",
            zIndex: "var(--z-toast)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            backgroundColor: "var(--color-success-subtle)",
            border: "1px solid rgba(48,164,108,0.3)",
            color: "var(--color-success)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-3) var(--space-5)",
            fontSize: "var(--text-sm)",
            maxWidth: "min(360px, calc(100vw - 3rem))",
            animation: "toastSlideIn 300ms ease",
          }}
        >
          <IkonCheck />
          {toastMessage}
        </div>
      ) : null}
    </Layout>
  );
}

export default InputData;
