import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import Tombol from "../components/Tombol";
import store from "../store";

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
    }, 3200);

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

    store.addPermintaan({
      kota: form.kota,
      tanggal_permintaan: form.tanggalPermintaan,
      tanggal_input: getTodayKey(),
      jumlah_permintaan: Number(form.jumlahPermintaan),
      keterangan: form.keterangan.trim(),
    });

    setForm(initialForm);
    setErrors({});
    setToastMessage("Data permintaan berhasil disimpan.");
  };

  const fieldStyle = {
    width: "100%",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-sm)",
    padding: "12px 16px",
    outline: "none",
    boxSizing: "border-box",
    transition:
      "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  };
  const getFieldStyle = (field) => ({
    ...fieldStyle,
    borderColor:
      focusedField === field ? "var(--color-primary)" : "var(--color-border)",
    boxShadow:
      focusedField === field ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
  });

  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
    color: "var(--color-text-primary)",
    fontWeight: 600,
    fontSize: "0.95rem",
  };

  const errorStyle = {
    margin: 0,
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
              }}
            >
              Input Data Permintaan Kota
            </h2>
              <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
              >
              Isi permintaan TBS per kota sebagai dasar ranking dan keputusan distribusi.
              </p>
            </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
              }}
            >
              <div style={labelStyle}>
                <span>Nama Kota</span>
                <select
                  value={form.kota}
                  onFocus={() => setFocusedField("kota")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) => handleChange("kota", event.target.value)}
                  style={getFieldStyle("kota")}
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

              <div style={labelStyle}>
                <span>Tanggal Permintaan</span>
                <input
                  type="date"
                  value={form.tanggalPermintaan}
                  onFocus={() => setFocusedField("tanggalPermintaan")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) =>
                    handleChange("tanggalPermintaan", event.target.value)
                  }
                  style={getFieldStyle("tanggalPermintaan")}
                />
                {errors.tanggalPermintaan ? (
                  <p style={errorStyle}>{errors.tanggalPermintaan}</p>
                ) : null}
              </div>

              <div style={labelStyle}>
                <span>Jumlah Permintaan dalam ton</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.jumlahPermintaan}
                  onFocus={() => setFocusedField("jumlahPermintaan")}
                  onBlur={() => setFocusedField("")}
                  onChange={(event) =>
                    handleChange("jumlahPermintaan", event.target.value)
                  }
                  style={getFieldStyle("jumlahPermintaan")}
                />
                {errors.jumlahPermintaan ? (
                  <p style={errorStyle}>{errors.jumlahPermintaan}</p>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...labelStyle,
                marginTop: "1rem",
              }}
            >
              <span>Keterangan</span>
              <textarea
                rows="5"
                value={form.keterangan}
                onFocus={() => setFocusedField("keterangan")}
                onBlur={() => setFocusedField("")}
                onChange={(event) => handleChange("keterangan", event.target.value)}
                placeholder="Tambahkan catatan jika diperlukan."
                style={{
                  ...getFieldStyle("keterangan"),
                  resize: "vertical",
                }}
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
              <Tombol label="Simpan Data" type="submit" />
            </div>
          </form>
        </Card>
      </div>

      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            right: "1.5rem",
            bottom: "1.5rem",
            width: "min(360px, calc(100vw - 3rem))",
            zIndex: 1100,
            backgroundColor: "var(--color-success)",
            color: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "16px 18px",
            animation: "toastSlideIn 300ms ease",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>Berhasil</p>
          <p style={{ margin: "0.25rem 0 0", lineHeight: 1.5 }}>
            {toastMessage}
          </p>
        </div>
      ) : null}
    </Layout>
  );
}

export default InputData;
