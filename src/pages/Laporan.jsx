import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Tabel from "../components/Tabel";
import store from "../store";
import {
  getPeriodRange,
  isDateInRange,
  parseDate,
} from "../utils/distribusi";

const formatterTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatterAngka = new Intl.NumberFormat("id-ID");

const formatDate = (value) => formatterTanggal.format(parseDate(value));
const formatTonase = (value) => `${formatterAngka.format(value)} ton`;

const roleOptions = ["Manajer Distribusi", "Tim Logistik"];

function GrafikTrenPermintaan({ datasets, labels }) {
  const canvasRef = useRef(null);
  const [chartError, setChartError] = useState("");

  useEffect(() => {
    if (
      !canvasRef.current ||
      labels.length === 0 ||
      datasets.length === 0 ||
      typeof window === "undefined"
    ) {
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
        const palette = [
          rootStyles.getPropertyValue("--color-primary").trim(),
          rootStyles.getPropertyValue("--color-primary-light").trim(),
          rootStyles.getPropertyValue("--color-accent").trim(),
          rootStyles.getPropertyValue("--color-warning").trim(),
          rootStyles.getPropertyValue("--color-danger").trim(),
          rootStyles.getPropertyValue("--color-success").trim(),
          rootStyles.getPropertyValue("--color-info").trim(),
          rootStyles.getPropertyValue("--color-text-secondary").trim(),
        ];

        chartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: datasets.map((dataset, index) => ({
              label: dataset.label,
              data: dataset.data,
              borderColor: palette[index % palette.length],
              backgroundColor: palette[index % palette.length],
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: rootStyles
                    .getPropertyValue("--color-text-secondary")
                    .trim(),
                },
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    return `${context.dataset.label}: ${formatTonase(context.parsed.y)}`;
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
                    return formatTonase(value);
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
  }, [datasets, labels]);

  return (
    <Card style={{ minHeight: "420px" }}>
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
            fontSize: "1.2rem",
          }}
        >
          Tren Permintaan per Kota
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Grafik ini membantu melihat perubahan permintaan selama periode yang dipilih.
        </p>
      </div>

      {chartError ? (
        <EmptyState pesan={chartError} />
      ) : (
        <div style={{ height: "320px" }}>
          <canvas ref={canvasRef} aria-label="Grafik tren permintaan per kota" />
        </div>
      )}
    </Card>
  );
}

function Laporan({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [periode, setPeriode] = useState("minggu-ini");

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  const roleAktif = roleOptions.includes(snapshot.roleAktif)
    ? snapshot.roleAktif
    : "Manajer Distribusi";

  const range = useMemo(() => getPeriodRange(periode), [periode]);

  const filteredRiwayat = useMemo(
    () =>
      [...(snapshot.riwayatKeputusan ?? [])]
        .filter((item) => isDateInRange(item.tanggal_keputusan, range))
        .sort(
          (first, second) =>
            parseDate(second.tanggal_keputusan) - parseDate(first.tanggal_keputusan)
        ),
    [range, snapshot.riwayatKeputusan]
  );

  const filteredPermintaan = useMemo(
    () =>
      (snapshot.permintaan ?? []).filter((item) =>
        isDateInRange(item.tanggal_permintaan, range)
      ),
    [range, snapshot.permintaan]
  );

  const tableRows = filteredRiwayat.map((item) => ({
    id: item.id,
    tanggal: formatDate(item.tanggal_keputusan),
    kotaTujuan: item.kota_tujuan,
    volume: formatTonase(item.volume_tbs),
    diputuskanOleh: item.diputuskan_oleh,
    status: <Badge status={item.status} />,
  }));

  const chartConfig = useMemo(() => {
    const labels = [...new Set(filteredPermintaan.map((item) => item.tanggal_permintaan))]
      .sort((first, second) => parseDate(first) - parseDate(second));

    const cityMap = filteredPermintaan.reduce((result, item) => {
      const current = result.get(item.kota) ?? {};
      current[item.tanggal_permintaan] =
        (current[item.tanggal_permintaan] ?? 0) +
        (Number(item.jumlah_permintaan) || 0);
      result.set(item.kota, current);
      return result;
    }, new Map());

    const datasets = [...cityMap.entries()].map(([kota, values]) => ({
      label: kota,
      data: labels.map((label) => values[label] ?? 0),
    }));

    return {
      labels: labels.map((label) => formatDate(label)),
      datasets,
    };
  }, [filteredPermintaan]);

  const fieldStyle = {
    border: "1px solid var(--color-primary-light)",
    borderRadius: "var(--radius-card)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    padding: "0.85rem 0.95rem",
    outline: "none",
  };

  const noData =
    filteredRiwayat.length === 0 && chartConfig.labels.length === 0;

  return (
    <Layout
      title="Switera"
      roleAwal={roleAktif}
      menuAwal="laporan"
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
                  fontSize: "1.4rem",
                }}
              >
                Laporan Distribusi
              </h2>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Riwayat keputusan bersifat permanen dan tetap tersedia untuk audit periode sebelumnya.
              </p>
            </div>

            <select
              value={periode}
              onChange={(event) => setPeriode(event.target.value)}
              style={fieldStyle}
            >
              <option value="minggu-ini">Minggu ini</option>
              <option value="bulan-ini">Bulan ini</option>
            </select>
          </div>
        </Card>

        {noData ? (
          <EmptyState pesan="Tidak ada data pada periode yang dipilih." />
        ) : (
          <>
            {filteredRiwayat.length > 0 ? (
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
                      fontSize: "1.2rem",
                    }}
                  >
                    Riwayat Keputusan
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    Seluruh keputusan yang pernah dibuat, termasuk yang dibatalkan, tetap ditampilkan pada laporan.
                  </p>
                </div>

                <Tabel
                  kolom={[
                    { key: "tanggal", label: "Tanggal" },
                    { key: "kotaTujuan", label: "Kota Tujuan" },
                    { key: "volume", label: "Volume TBS" },
                    { key: "diputuskanOleh", label: "Diputuskan Oleh" },
                    { key: "status", label: "Status" },
                  ]}
                  data={tableRows}
                />
              </Card>
            ) : (
              <EmptyState pesan="Belum ada riwayat keputusan pada periode yang dipilih." />
            )}

            {chartConfig.labels.length > 0 && chartConfig.datasets.length > 0 ? (
              <GrafikTrenPermintaan
                labels={chartConfig.labels}
                datasets={chartConfig.datasets}
              />
            ) : (
              <EmptyState pesan="Belum ada data tren permintaan pada periode yang dipilih." />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default Laporan;
