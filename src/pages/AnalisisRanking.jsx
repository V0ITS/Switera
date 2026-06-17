import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Tabel from "../components/Tabel";
import store from "../store";
import { aggregatePermintaanRanking } from "../utils/distribusi";

const formatterAngka = new Intl.NumberFormat("id-ID");
const formatterTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatTonase = (value) => `${formatterAngka.format(value)} ton`;
const formatDate = (value) =>
  value ? formatterTanggal.format(new Date(`${value}T00:00:00`)) : "-";

const getRankColor = (rank) => {
  if (rank === 1) {
    return { backgroundColor: "#FEF3C7", color: "#B45309" };
  }

  if (rank === 2) {
    return { backgroundColor: "#E5E7EB", color: "#4B5563" };
  }

  if (rank === 3) {
    return { backgroundColor: "#FDE68A", color: "#92400E" };
  }

  return { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-secondary)" };
};

function GrafikRankingHorizontal({ ranking }) {
  const canvasRef = useRef(null);
  const [chartError, setChartError] = useState("");

  useEffect(() => {
    if (!canvasRef.current || ranking.length === 0 || typeof window === "undefined") {
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
          rootStyles.getPropertyValue("--color-primary-mid").trim(),
          rootStyles.getPropertyValue("--color-primary-light").trim(),
          "#74C69D",
          rootStyles.getPropertyValue("--color-primary-subtle").trim(),
        ];

        chartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ranking.map((item) => item.kota),
            datasets: [
              {
                data: ranking.map((item) => item.totalPermintaan),
                backgroundColor: ranking.map(
                  (_item, index) => palette[index % palette.length]
                ),
                borderColor: rootStyles.getPropertyValue("--color-primary").trim(),
                borderWidth: 1,
                borderRadius: 10,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 900,
              easing: "easeOutQuart",
              delay(context) {
                return context.dataIndex * 80;
              },
            },
            animations: {
              x: {
                from: 0,
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    return formatTonase(context.parsed.x);
                  },
                },
              },
            },
            scales: {
              x: {
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
              y: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: rootStyles
                    .getPropertyValue("--color-text-secondary")
                    .trim(),
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
  }, [ranking]);

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
          Grafik Ranking Permintaan
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Permintaan tertinggi ditampilkan di bagian atas untuk memudahkan prioritas distribusi.
        </p>
      </div>

      {chartError ? (
        <EmptyState pesan={chartError} />
      ) : (
        <div style={{ height: "320px" }}>
          <canvas ref={canvasRef} aria-label="Grafik ranking permintaan kota" />
        </div>
      )}
    </Card>
  );
}

function AnalisisRanking({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  const ranking = useMemo(
    () => aggregatePermintaanRanking(snapshot.permintaan ?? []),
    [snapshot.permintaan]
  );
  const periodeData = useMemo(() => {
    const dates = (snapshot.permintaan ?? [])
      .map((item) => item.tanggal_permintaan)
      .filter(Boolean)
      .sort();

    if (dates.length === 0) {
      return "Belum ada periode data";
    }

    return `${formatDate(dates[0])} sampai ${formatDate(dates[dates.length - 1])}`;
  }, [snapshot.permintaan]);

  const topValue = ranking[0]?.totalPermintaan ?? 0;
  const rows = ranking.map((item, index) => ({
    id: item.kota,
    peringkat: (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "34px",
          height: "28px",
          borderRadius: "var(--radius-full)",
          fontWeight: 700,
          ...getRankColor(index + 1),
        }}
      >
        {index + 1}
      </span>
    ),
    namaKota: item.kota,
    totalPermintaan: formatTonase(item.totalPermintaan),
    selisih: (() => {
      const difference = topValue - item.totalPermintaan;
      const color =
        difference > 100 ? "var(--color-danger)" : "var(--color-success)";

      return (
        <span
          style={{
            color: index === 0 ? "var(--color-text-secondary)" : color,
            fontWeight: 700,
          }}
        >
          {index === 0 ? "0 ton" : formatTonase(difference)}
        </span>
      );
    })(),
  }));

  return (
    <Layout
      title="Switera"
      roleAwal="Manajer Distribusi"
      menuAwal="analisis-ranking"
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
          <Card>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-3xl)",
                  color: "var(--color-text-primary)",
                }}
              >
                Analisis Ranking Permintaan
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-muted)",
                  fontSize: "var(--text-sm)",
                  lineHeight: 1.6,
                }}
              >
                Periode data: {periodeData}
              </p>
            </div>
          </Card>

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
                Ranking Permintaan Kota
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Jika total permintaan sama, kota dengan tanggal input paling awal diprioritaskan lebih tinggi.
              </p>
            </div>

            <Tabel
              kolom={[
                { key: "peringkat", label: "Peringkat" },
                { key: "namaKota", label: "Nama Kota" },
                { key: "totalPermintaan", label: "Total Permintaan (ton)" },
                { key: "selisih", label: "Selisih dari Peringkat 1" },
              ]}
              data={rows}
            />
          </Card>

          <GrafikRankingHorizontal ranking={ranking} />
        </div>
      )}
    </Layout>
  );
}

export default AnalisisRanking;
