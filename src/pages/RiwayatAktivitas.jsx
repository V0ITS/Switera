import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import store from "../store";
import { roleOptions } from "../utils/navigation";
import { downloadCsv } from "../utils/csv";

const formatterWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatWaktu = (value) => formatterWaktu.format(new Date(value));

const cocokRentangTanggal = (waktuIso, dariTanggal, sampaiTanggal) => {
  const tanggalLog = waktuIso.slice(0, 10);

  if (dariTanggal && tanggalLog < dariTanggal) {
    return false;
  }

  if (sampaiTanggal && tanggalLog > sampaiTanggal) {
    return false;
  }

  return true;
};

function RiwayatAktivitas({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [filterRole, setFilterRole] = useState("");
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [focusedField, setFocusedField] = useState("");

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  // Admin-only page; store.loadActivityLog() quietly returns [] for a
  // non-Admin session (see store.js's 403-swallow behavior, T-09-L-RBAC).
  useEffect(() => {
    store.loadActivityLog();
  }, []);

  const activityLog = useMemo(
    () =>
      [...(snapshot.activityLog ?? [])].sort(
        (first, second) => new Date(second.waktu) - new Date(first.waktu)
      ),
    [snapshot.activityLog]
  );

  const filteredLog = useMemo(
    () =>
      activityLog.filter((item) => {
        if (filterRole && item.role !== filterRole) {
          return false;
        }

        return cocokRentangTanggal(item.waktu, dariTanggal, sampaiTanggal);
      }),
    [activityLog, filterRole, dariTanggal, sampaiTanggal]
  );

  const tableRows = filteredLog.map((item) => ({
    id: item.id,
    waktu: formatWaktu(item.waktu),
    aktor: item.aktor,
    role: item.role,
    aksi: item.aksi,
  }));

  const handleExportCsv = () => {
    const rows = filteredLog.map((item) => ({
      waktu: item.waktu,
      aktor: item.aktor,
      role: item.role,
      aksi: item.aksi,
    }));

    downloadCsv("riwayat-aktivitas.csv", rows);
  };

  const fieldStyle = {
    width: "100%",
    border: "2px solid #000000",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "#ffffff",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-sm)",
    padding: "10px 14px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "var(--shadow-sm)",
    transition: "background-color var(--transition-input)",
  };

  // Fokus ala neo brutalist: latar pastel, border tetap hitam.
  const getFieldStyle = (field) => ({
    ...fieldStyle,
    backgroundColor: focusedField === field ? "var(--color-pastel)" : "#ffffff",
  });

  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
    color: "var(--color-text-secondary)",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
  };

  return (
    <>
      <PageHeader
        judul="Riwayat Aktivitas"
        deskripsi="Jejak audit seluruh aksi penting pengguna pada sistem, dari yang terbaru."
        aksi={
          <Tombol
            label="Ekspor CSV"
            variant="sekunder"
            onClick={handleExportCsv}
            disabled={filteredLog.length === 0}
          />
        }
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Card style={{ animationDelay: "40ms" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div style={labelStyle}>
              <span>Role</span>
              <select
                value={filterRole}
                onFocus={() => setFocusedField("role")}
                onBlur={() => setFocusedField("")}
                onChange={(event) => setFilterRole(event.target.value)}
                style={getFieldStyle("role")}
              >
                <option value="">Semua Role</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div style={labelStyle}>
              <span>Dari Tanggal</span>
              <input
                type="date"
                value={dariTanggal}
                onFocus={() => setFocusedField("dari")}
                onBlur={() => setFocusedField("")}
                onChange={(event) => setDariTanggal(event.target.value)}
                style={getFieldStyle("dari")}
              />
            </div>

            <div style={labelStyle}>
              <span>Sampai Tanggal</span>
              <input
                type="date"
                value={sampaiTanggal}
                onFocus={() => setFocusedField("sampai")}
                onBlur={() => setFocusedField("")}
                onChange={(event) => setSampaiTanggal(event.target.value)}
                style={getFieldStyle("sampai")}
              />
            </div>
          </div>
        </Card>

        {tableRows.length > 0 ? (
          /* Timeline ala Stitch — garis vertikal, avatar inisial, badge role. */
          <Card style={{ animationDelay: "80ms" }}>
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column" }}>
              {filteredLog.map((item, index) => {
                const inisial = item.aktor
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((kata) => kata[0]?.toUpperCase() ?? "")
                  .join("") || "?";
                const roleWarna =
                  item.role === "Admin"
                    ? { bg: "var(--color-warning-bg)", text: "var(--color-warning-text)" }
                    : item.role === "Manajer Distribusi"
                      ? { bg: "var(--color-info-bg)", text: "var(--color-info-text)" }
                      : { bg: "var(--color-success-bg)", text: "var(--color-success-text)" };
                const isLast = index === filteredLog.length - 1;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-4)",
                      animation: "fadeInUp 250ms var(--ease-spring) both",
                    }}
                  >
                    {/* Kolom garis + avatar */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--color-surface-container)",
                          color: "var(--color-primary)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-bold)",
                        }}
                      >
                        {inisial}
                      </span>
                      {!isLast ? (
                        <span
                          aria-hidden="true"
                          style={{ width: "2px", flex: 1, backgroundColor: "var(--color-border)", marginTop: "6px" }}
                        />
                      ) : null}
                    </div>

                    {/* Konten */}
                    <div style={{ paddingBottom: isLast ? 0 : "var(--space-5)", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "var(--text-sm)", color: "var(--color-on-surface)" }}>
                          {item.aktor}
                        </strong>
                        <span
                          style={{
                            fontSize: "var(--text-2xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            backgroundColor: roleWarna.bg,
                            color: roleWarna.text,
                            borderRadius: "var(--radius-full)",
                            padding: "2px 10px",
                          }}
                        >
                          {item.role}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 6px", fontSize: "var(--text-sm)", color: "var(--color-on-surface-variant)", lineHeight: 1.6 }}>
                        {item.aksi}
                      </p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--text-xs)", color: "var(--color-outline)" }}>
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                          style={{ fontSize: "14px", lineHeight: 1 }}
                        >
                          schedule
                        </span>
                        {formatWaktu(item.waktu)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <EmptyState pesan="Tidak ada aktivitas yang cocok dengan filter saat ini." />
        )}
      </div>
    </>
  );
}

export default RiwayatAktivitas;
