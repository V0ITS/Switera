import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import MetricCard from "../components/MetricCard";
import useRipple, { RippleSpans } from "../hooks/useRipple";
import store from "../store";

function AksiTabelButtons({ onEdit, onDelete }) {
  const editRipple = useRipple();
  const deleteRipple = useRipple();

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="aksi-btn aksi-btn-edit"
        onClick={onEdit}
        onMouseDown={editRipple.onMouseDown}
      >
        <span aria-hidden="true">✎</span>
        Edit
        <RippleSpans ripples={editRipple.ripples} removeRipple={editRipple.removeRipple} />
      </button>
      <button
        type="button"
        className="aksi-btn aksi-btn-delete"
        onClick={onDelete}
        onMouseDown={deleteRipple.onMouseDown}
      >
        <span aria-hidden="true">🗑</span>
        Hapus
        <RippleSpans ripples={deleteRipple.ripples} removeRipple={deleteRipple.removeRipple} />
      </button>
    </div>
  );
}

function ManajemenKota({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  const daftarKota = useMemo(() => snapshot.daftarKota ?? [], [snapshot.daftarKota]);
  const stokTbs = snapshot.stokTbs ?? 0;

  const tableRows = daftarKota.map((kota) => ({
    id: kota.nama,
    nama: kota.nama,
    kapasitas: kota.kapasitas,
  }));

  return (
    <>
      <PageHeader
        judul="Manajemen Kota"
        deskripsi="Kelola daftar kota dan kapasitas, serta stok TBS tersedia."
        aksi={<Tombol label="+ Tambah Kota" variant="primer" onClick={() => {}} />}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <MetricCard
          label="Stok TBS Tersedia (ton)"
          nilai={`${stokTbs} ton`}
          size="lg"
          accent="primary"
        >
          <Tombol label="Edit" variant="sekunder" onClick={() => {}} />
        </MetricCard>

        <Card>
          <SectionHeader>
            Daftar Kota — Menampilkan {daftarKota.length} kota
          </SectionHeader>

          {tableRows.length > 0 ? (
            <Tabel
              kolom={[
                { key: "nama", label: "Nama Kota" },
                { key: "kapasitas", label: "Kapasitas (ton)", numeric: true },
              ]}
              data={tableRows}
              aksi={(baris) => {
                const currentItem = daftarKota.find((kota) => kota.nama === baris.id);

                return (
                  <AksiTabelButtons
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                );
              }}
            />
          ) : (
            <EmptyState pesan="Belum ada kota yang terdaftar. Tambahkan kota pertama untuk mulai mengatur kapasitas dan distribusi TBS." />
          )}
        </Card>
      </div>
    </>
  );
}

export default ManajemenKota;
