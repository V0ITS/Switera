import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Tombol from "../components/Tombol";
import store from "../store";
import { aggregatePermintaanRanking, getLocalDateKey, parseDate } from "../utils/distribusi";

const formatterAngka = new Intl.NumberFormat("id-ID");

const formatTonase = (value) => `${formatterAngka.format(value)} ton`;

function KeputusanDistribusi({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [isCustomSelection, setIsCustomSelection] = useState(false);
  const [selectedKota, setSelectedKota] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);

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

  const ranking = useMemo(
    () => aggregatePermintaanRanking(snapshot.permintaan ?? []),
    [snapshot.permintaan]
  );

  const rekomendasi = ranking[0];
  const pilihanManual = ranking.find((item) => item.kota === selectedKota);
  const keputusanAktifTerakhir = useMemo(() => {
    const sorted = [...(snapshot.keputusan ?? [])].sort((first, second) => {
      const byDate =
        parseDate(second.tanggal_keputusan) - parseDate(first.tanggal_keputusan);

      if (byDate !== 0) {
        return byDate;
      }

      return second.id.localeCompare(first.id, "id-ID");
    });

    return sorted[0];
  }, [snapshot.keputusan]);

  const saveKeputusan = (targetKota, alasan) => {
    if (!targetKota) {
      return;
    }

    store.addKeputusan({
      kota_tujuan: targetKota.kota,
      volume_tbs: targetKota.totalPermintaan,
      tanggal_keputusan: getLocalDateKey(),
      diputuskan_oleh: "Manajer Distribusi",
      status: "menunggu",
      alasan,
    });

    setToastMessage(`Keputusan distribusi untuk ${targetKota.kota} berhasil disimpan.`);
    setIsCustomSelection(false);
    setSelectedKota("");
  };

  const confirmCancelLast = () => {
    if (!keputusanAktifTerakhir) {
      return;
    }

    store.removeKeputusan(keputusanAktifTerakhir.id);
    setIsCancelOpen(false);
    setToastMessage("Keputusan aktif terakhir berhasil dibatalkan.");
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
      roleAwal="Manajer Distribusi"
      menuAwal="keputusan-distribusi"
      onMenuChange={onNavigate}
    >
      {ranking.length === 0 ? (
        <EmptyState pesan="Belum ada data permintaan. Silakan hubungi Admin." />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <Card
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                Rekomendasi otomatis
              </p>
              <h2
                style={{
                  margin: "0.3rem 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.6rem",
                }}
              >
                {rekomendasi.kota}
              </h2>
              <p
                style={{
                  margin: "0.45rem 0 0",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Permintaan tertinggi pada periode ini dengan total{" "}
                {formatTonase(rekomendasi.totalPermintaan)}.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <Tombol
                label="Setujui Rekomendasi"
                onClick={() =>
                  saveKeputusan(
                    rekomendasi,
                    "Permintaan tertinggi pada periode ini"
                  )
                }
              />
              <Tombol
                label="Pilih Kota Lain"
                variant="sekunder"
                onClick={() => setIsCustomSelection((current) => !current)}
              />
            </div>
          </Card>

          {isCustomSelection ? (
            <Card
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: "1.2rem",
                  }}
                >
                  Pilih kota alternatif
                </h2>
                <p
                  style={{
                    margin: "0.4rem 0 0",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Gunakan daftar ranking untuk menetapkan tujuan distribusi secara manual.
                </p>
              </div>

              <select
                value={selectedKota}
                onChange={(event) => setSelectedKota(event.target.value)}
                style={fieldStyle}
              >
                <option value="">Pilih kota dari ranking</option>
                {ranking.map((item) => (
                  <option key={item.kota} value={item.kota}>
                    {item.kota} - {formatTonase(item.totalPermintaan)}
                  </option>
                ))}
              </select>

              {pilihanManual ? (
                <Card
                  style={{
                    backgroundColor: "var(--color-bg)",
                    boxShadow: "none",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "var(--color-text-secondary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Ringkasan keputusan
                  </p>
                  <p
                    style={{
                      margin: "0.35rem 0 0",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-display)",
                      fontSize: "1.4rem",
                      fontWeight: 800,
                    }}
                  >
                    {pilihanManual.kota}
                  </p>
                  <p
                    style={{
                      margin: "0.45rem 0 0",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    Total permintaan {formatTonase(pilihanManual.totalPermintaan)}. Kota
                    ini dipilih manual oleh Manajer Distribusi.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "1rem",
                    }}
                  >
                    <Tombol
                      label="Simpan Keputusan"
                      onClick={() =>
                        saveKeputusan(
                          pilihanManual,
                          "Dipilih manual oleh Manajer Distribusi"
                        )
                      }
                    />
                  </div>
                </Card>
              ) : null}
            </Card>
          ) : null}

          <Card
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                }}
              >
                Batalkan keputusan aktif terakhir
              </h2>
              <p
                style={{
                  margin: "0.4rem 0 0",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Keputusan dibatalkan akan hilang dari daftar aktif, tetapi riwayatnya tetap tersimpan.
              </p>
            </div>
            <Tombol
              label="Batalkan Keputusan Terakhir"
              variant="bahaya"
              onClick={() => setIsCancelOpen(true)}
            />
          </Card>
        </div>
      )}

      {isCancelOpen ? (
        <Modal
          judul="Batalkan keputusan terakhir"
          onTutup={() => setIsCancelOpen(false)}
          konten={
            keputusanAktifTerakhir ? (
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
                  Keputusan terakhir untuk kota{" "}
                  <strong style={{ color: "var(--color-text-primary)" }}>
                    {keputusanAktifTerakhir.kota_tujuan}
                  </strong>{" "}
                  dengan volume {formatTonase(keputusanAktifTerakhir.volume_tbs)} akan
                  dibatalkan dari daftar aktif.
                </p>
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
                    onClick={() => setIsCancelOpen(false)}
                  />
                  <Tombol
                    label="Ya, Batalkan"
                    variant="bahaya"
                    onClick={confirmCancelLast}
                  />
                </div>
              </div>
            ) : (
              <EmptyState pesan="Belum ada keputusan aktif yang bisa dibatalkan." />
            )
          }
        />
      ) : null}

      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            width: "min(360px, calc(100vw - 3rem))",
            zIndex: 1100,
          }}
        >
          <Card
            style={{
              borderLeft: "6px solid var(--color-success)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--color-text-primary)",
                fontWeight: 700,
              }}
            >
              Berhasil
            </p>
            <p
              style={{
                margin: "0.35rem 0 0",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {toastMessage}
            </p>
          </Card>
        </div>
      ) : null}
    </Layout>
  );
}

export default KeputusanDistribusi;
