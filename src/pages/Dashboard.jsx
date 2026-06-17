import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import store from "../store";
import {
  aggregatePermintaanRanking,
  getDuplicateGroups,
  getLatestKeputusanByKota,
  getLocalDateKey,
  parseDate,
} from "../utils/distribusi";

const formatterAngka = new Intl.NumberFormat("id-ID");
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

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return formatterTanggal.format(parseDate(value));
};

const formatTonase = (value) => `${formatterAngka.format(value)} ton`;

function KartuStatistik({ label, value, helper, accent = "var(--color-primary)" }) {
  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        borderTop: `4px solid ${accent}`,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--color-text-secondary)",
          fontSize: "0.9rem",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-secondary)",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        {helper}
      </p>
    </Card>
  );
}

function GrafikPermintaan({ rankingKota }) {
  const canvasRef = useRef(null);
  const [chartError, setChartError] = useState("");

  useEffect(() => {
    if (!canvasRef.current || rankingKota.length === 0 || typeof window === "undefined") {
      return undefined;
    }

    let chartInstance;
    let isActive = true;

    import("chart.js/auto")
      .then((module) => {
        if (!isActive || !canvasRef.current) {
          return;
        }

        const Chart = module.default;
        const rootStyles = getComputedStyle(document.documentElement);
        const ctx = canvasRef.current.getContext("2d");

        chartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: rankingKota.map((item) => item.kota),
            datasets: [
              {
                label: "Permintaan per Kota",
                data: rankingKota.map((item) => item.totalPermintaan),
                backgroundColor: rootStyles
                  .getPropertyValue("--color-primary-light")
                  .trim(),
                borderColor: rootStyles.getPropertyValue("--color-primary").trim(),
                borderWidth: 1,
                borderRadius: 10,
                maxBarThickness: 48,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    return `${formatterAngka.format(context.parsed.y)} ton`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: rootStyles
                    .getPropertyValue("--color-text-secondary")
                    .trim(),
                },
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: rootStyles.getPropertyValue("--color-bg").trim(),
                },
                ticks: {
                  color: rootStyles
                    .getPropertyValue("--color-text-secondary")
                    .trim(),
                  callback(value) {
                    return `${formatterAngka.format(value)} ton`;
                  },
                },
              },
            },
          },
        });

        setChartError("");
      })
      .catch(() => {
        if (isActive) {
          setChartError("Grafik tidak dapat dimuat karena Chart.js belum tersedia.");
        }
      });

    return () => {
      isActive = false;
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [rankingKota]);

  return (
    <Card style={{ minHeight: "420px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          marginBottom: "1rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "1.2rem",
          }}
        >
          Grafik Permintaan per Kota
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Ringkasan visual total permintaan TBS untuk tiap kota terpantau.
        </p>
      </div>

      {chartError ? (
        <EmptyState pesan={chartError} />
      ) : (
        <div style={{ height: "320px" }}>
          <canvas ref={canvasRef} aria-label="Grafik permintaan per kota" />
        </div>
      )}
    </Card>
  );
}

function DashboardAdmin({ permintaan, keputusan, onNavigate }) {
  const totalData = permintaan.length + keputusan.length;
  const allDates = [
    ...permintaan.map((item) => item.tanggal_input),
    ...keputusan.map((item) => item.tanggal_keputusan),
  ].filter(Boolean);
  const latestDate = allDates.sort((first, second) => parseDate(second) - parseDate(first))[0];
  const duplicateGroups = getDuplicateGroups(permintaan);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <KartuStatistik
          label="Jumlah total data tersimpan"
          value={formatterAngka.format(totalData)}
          helper="Akumulasi data permintaan dan keputusan distribusi yang aktif."
          accent="var(--color-primary)"
        />
        <KartuStatistik
          label="Tanggal data terbaru diinput"
          value={formatDate(latestDate)}
          helper="Tanggal paling mutakhir yang tercatat pada data demo saat ini."
          accent="var(--color-accent)"
        />
      </div>

      {duplicateGroups.length > 0 ? (
        <Card
          style={{
            borderLeft: "6px solid var(--color-warning)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--color-text-primary)",
                fontWeight: 700,
              }}
            >
              Peringatan data duplikat terdeteksi
            </p>
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Terdapat {formatterAngka.format(duplicateGroups.length)} kelompok data
              dengan kota dan tanggal permintaan yang sama. Periksa halaman Manajemen
              Data untuk validasi lebih lanjut.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("manajemen-data")}
              style={{
                width: "fit-content",
                padding: 0,
                border: "none",
                backgroundColor: "transparent",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Buka halaman Manajemen Data
            </button>
          </div>
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
            Kelola data distribusi
          </h2>
          <p
            style={{
              margin: "0.4rem 0 0",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Tambahkan data permintaan baru untuk menjaga analisis distribusi tetap mutakhir.
          </p>
        </div>
        <Tombol
          label="Menuju Input Data"
          onClick={() => onNavigate?.("input-data")}
        />
      </Card>
    </div>
  );
}

function DashboardManajer({ permintaan, keputusan }) {
  const [feedback, setFeedback] = useState("");
  const todayKey = getLocalDateKey();
  const rankingKota = useMemo(
    () => aggregatePermintaanRanking(permintaan),
    [permintaan]
  );
  const latestDecisionByKota = useMemo(
    () => getLatestKeputusanByKota(keputusan),
    [keputusan]
  );
  const permintaanHariIni = useMemo(
    () => permintaan.filter((item) => item.tanggal_permintaan === todayKey),
    [permintaan, todayKey]
  );

  const kotaHariIni = useMemo(
    () => aggregatePermintaanRanking(permintaanHariIni)[0],
    [permintaanHariIni]
  );

  const totalTbsTerdistribusi = keputusan
    .filter((item) => item.status !== "menunggu")
    .reduce((total, item) => total + (Number(item.volume_tbs) || 0), 0);

  const rankingRows = rankingKota.map((item, index) => ({
    id: item.kota,
    nomor: index + 1,
    namaKota: item.kota,
    totalPermintaan: formatTonase(item.totalPermintaan),
    statusDistribusi: (
      <Badge
        status={latestDecisionByKota.get(item.kota)?.status ?? "menunggu"}
      />
    ),
  }));

  const rekomendasiKota = rankingKota[0];

  const handleTetapkanDistribusi = () => {
    if (!rekomendasiKota) {
      return;
    }

    const keputusanSaatIni = store.getKeputusan();
    const existingDecision = keputusanSaatIni.find(
      (item) =>
        item.kota_tujuan === rekomendasiKota.kota &&
        item.status !== "selesai"
    );

    if (existingDecision) {
      setFeedback(
        `Kota ${rekomendasiKota.kota} sudah memiliki keputusan distribusi aktif.`
      );
      return;
    }

    store.addKeputusan({
      kota_tujuan: rekomendasiKota.kota,
      volume_tbs: rekomendasiKota.totalPermintaan,
      tanggal_keputusan: todayKey,
      diputuskan_oleh: "Manajer Distribusi",
      status: "menunggu",
    });

    setFeedback(
      `Keputusan distribusi untuk ${rekomendasiKota.kota} berhasil ditambahkan.`
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <KartuStatistik
          label="Total kota terpantau"
          value={formatterAngka.format(rankingKota.length)}
          helper="Jumlah kota yang tercatat dalam data permintaan distribusi."
          accent="var(--color-primary)"
        />
        <KartuStatistik
          label="Kota permintaan tertinggi hari ini"
          value={kotaHariIni?.kota ?? "Belum ada"}
          helper={
            kotaHariIni
              ? `${formatTonase(kotaHariIni.totalPermintaan)} pada ${formatDate(todayKey)}.`
              : "Belum ada data permintaan yang masuk untuk hari ini."
          }
          accent="var(--color-accent)"
        />
        <KartuStatistik
          label="Total TBS terdistribusi"
          value={formatTonase(totalTbsTerdistribusi)}
          helper="Akumulasi keputusan dengan status selesai dan dalam pengiriman."
          accent="var(--color-success)"
        />
      </div>

      {rankingRows.length > 0 ? (
        <Tabel
          kolom={[
            { key: "nomor", label: "No" },
            { key: "namaKota", label: "Nama Kota" },
            { key: "totalPermintaan", label: "Total Permintaan (ton)" },
            { key: "statusDistribusi", label: "Status Distribusi" },
          ]}
          data={rankingRows}
        />
      ) : (
        <EmptyState pesan="Tambahkan data permintaan agar ranking kota dapat dihitung." />
      )}

      {rankingKota.length > 0 ? (
        <GrafikPermintaan rankingKota={rankingKota} />
      ) : (
        <EmptyState pesan="Belum ada data untuk ditampilkan pada grafik permintaan." />
      )}

      <Card
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
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
            Rekomendasi distribusi
          </h2>
          <p
            style={{
              margin: "0.4rem 0 0",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Prioritaskan kota dengan total permintaan tertinggi untuk keputusan distribusi berikutnya.
          </p>
        </div>

        {rekomendasiKota ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
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
                  Kota prioritas saat ini
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-display)",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                  }}
                >
                  {rekomendasiKota.kota}
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Total permintaan {formatTonase(rekomendasiKota.totalPermintaan)}.
                </p>
              </div>
              <Tombol
                label="Tetapkan sebagai Tujuan Distribusi"
                onClick={handleTetapkanDistribusi}
              />
            </div>
            {feedback ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {feedback}
              </p>
            ) : null}
          </>
        ) : (
          <EmptyState pesan="Belum ada rekomendasi karena data permintaan masih kosong." />
        )}
      </Card>
    </div>
  );
}

function DashboardLogistik({ keputusan }) {
  const [selectedKeputusan, setSelectedKeputusan] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("menunggu");

  const sortedKeputusan = useMemo(
    () =>
      [...keputusan].sort(
        (first, second) =>
          parseDate(second.tanggal_keputusan) - parseDate(first.tanggal_keputusan)
      ),
    [keputusan]
  );

  const latestKeputusan = sortedKeputusan[0];

  const statusRows = sortedKeputusan.map((item) => ({
    id: item.id,
    kotaTujuan: item.kota_tujuan,
    volume: formatTonase(item.volume_tbs),
    status: <Badge status={item.status} />,
    tanggal: formatDate(item.tanggal_keputusan),
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {latestKeputusan ? (
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
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                fontSize: "0.9rem",
              }}
            >
              Keputusan distribusi terbaru
            </p>
            <h2
              style={{
                margin: "0.35rem 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
              }}
            >
              {latestKeputusan.kota_tujuan}
            </h2>
            <p
              style={{
                margin: "0.45rem 0 0",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Volume {formatTonase(latestKeputusan.volume_tbs)} ditetapkan pada{" "}
              {formatDate(latestKeputusan.tanggal_keputusan)}.
            </p>
          </div>
          <Badge status={latestKeputusan.status} />
        </Card>
      ) : (
        <EmptyState pesan="Belum ada keputusan distribusi yang dapat ditindaklanjuti." />
      )}

      {statusRows.length > 0 ? (
        <Tabel
          kolom={[
            { key: "kotaTujuan", label: "Kota Tujuan" },
            { key: "volume", label: "Volume" },
            { key: "status", label: "Status" },
            { key: "tanggal", label: "Tanggal" },
          ]}
          data={statusRows}
          aksi={(baris) => {
            const item = sortedKeputusan.find((keputusanItem) => keputusanItem.id === baris.id);
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
        <EmptyState pesan="Belum ada data status distribusi untuk ditampilkan." />
      )}

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
              <div>
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
              </div>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-primary-light)",
                  borderRadius: "var(--radius-card)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.95rem",
                  padding: "0.75rem 0.9rem",
                  outline: "none",
                }}
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
    </div>
  );
}

function Dashboard({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  const { roleAktif, permintaan, keputusan } = snapshot;

  const contentByRole = {
    Admin: (
      <DashboardAdmin
        permintaan={permintaan}
        keputusan={keputusan}
        onNavigate={onNavigate}
      />
    ),
    "Manajer Distribusi": (
      <DashboardManajer permintaan={permintaan} keputusan={keputusan} />
    ),
    "Tim Logistik": <DashboardLogistik keputusan={keputusan} />,
  };

  return (
    <Layout
      title="Switera"
      roleAwal={roleAktif}
      menuAwal="dashboard"
      onMenuChange={onNavigate}
    >
      {contentByRole[roleAktif] ?? (
        <EmptyState pesan="Role aktif belum dikenali. Pilih role lain pada header aplikasi." />
      )}
    </Layout>
  );
}

export default Dashboard;
