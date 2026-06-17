import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import store from "../store";
import { parseDate } from "../utils/distribusi";

const formatterTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const statusOptions = ["menunggu", "dalam-pengiriman", "selesai"];
const statusLabels = {
  menunggu: "Menunggu",
  "dalam-pengiriman": "Dalam Pengiriman",
  selesai: "Selesai",
};

const formatDate = (value) => formatterTanggal.format(parseDate(value));
const formatTonase = (value) => `${new Intl.NumberFormat("id-ID").format(value)} ton`;

function StatusDistribusi({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [selectedKeputusan, setSelectedKeputusan] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("menunggu");

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  const keputusanAktif = useMemo(
    () =>
      [...(snapshot.keputusan ?? [])].sort(
        (first, second) =>
          parseDate(second.tanggal_keputusan) - parseDate(first.tanggal_keputusan)
      ),
    [snapshot.keputusan]
  );

  const rows = keputusanAktif.map((item) => ({
    id: item.id,
    kotaTujuan: item.kota_tujuan,
    volume: formatTonase(item.volume_tbs),
    tanggalKeputusan: formatDate(item.tanggal_keputusan),
    status: <Badge status={item.status} />,
  }));

  const openStatusModal = (item) => {
    setSelectedKeputusan(item);
    setSelectedStatus(item.status);
  };

  const saveStatus = () => {
    if (!selectedKeputusan) {
      return;
    }

    store.updateKeputusan(selectedKeputusan.id, {
      status: selectedStatus,
    });
    setSelectedKeputusan(null);
  };

  const fieldStyle = {
    width: "100%",
    border: "1px solid var(--color-primary-light)",
    borderRadius: "var(--radius-card)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    padding: "0.85rem 0.95rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <Layout
      title="Switera"
      roleAwal="Tim Logistik"
      menuAwal="status-distribusi"
      onMenuChange={onNavigate}
    >
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
              gap: "0.35rem",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
              }}
            >
              Status Distribusi Aktif
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Pantau dan perbarui progres distribusi tanpa perlu memuat ulang halaman.
            </p>
          </div>

          {rows.length > 0 ? (
            <Tabel
              kolom={[
                { key: "kotaTujuan", label: "Kota Tujuan" },
                { key: "volume", label: "Volume" },
                { key: "tanggalKeputusan", label: "Tanggal Keputusan" },
                { key: "status", label: "Status" },
              ]}
              data={rows}
              aksi={(baris) => {
                const item = keputusanAktif.find(
                  (keputusanItem) => keputusanItem.id === baris.id
                );

                return (
                  <Tombol
                    label="Perbarui Status"
                    variant="sekunder"
                    onClick={() => openStatusModal(item)}
                  />
                );
              }}
            />
          ) : (
            <EmptyState pesan="Belum ada distribusi aktif untuk dipantau saat ini." />
          )}
        </Card>
      </div>

      {selectedKeputusan ? (
        <Modal
          judul="Perbarui status distribusi"
          onTutup={() => setSelectedKeputusan(null)}
          konten={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Pilih status terbaru untuk distribusi menuju{" "}
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {selectedKeputusan.kota_tujuan}
                </strong>
                .
              </p>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                style={fieldStyle}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <Tombol
                  label="Batal"
                  variant="sekunder"
                  onClick={() => setSelectedKeputusan(null)}
                />
                <Tombol label="Simpan Status" onClick={saveStatus} />
              </div>
            </div>
          }
        />
      ) : null}
    </Layout>
  );
}

export default StatusDistribusi;
