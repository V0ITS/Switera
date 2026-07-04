import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import Tabel from "../components/Tabel";
import { SkeletonChart } from "../components/Skeleton";
import store from "../store";
import {
  CHART_PALETTE,
  chartGridDefaults,
  chartTickDefaults,
  chartTooltipDefaults,
  withOpacity,
} from "../utils/chartDefaults";
import { aggregatePermintaanRanking } from "../utils/distribusi";
import { formatDate, formatTonase } from "../utils/format";

const getRankColor = (rank) => {
  if (rank === 1) {
    return { backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" };
  }

  if (rank === 2) {
    return { backgroundColor: "rgba(156,163,175,0.12)", color: "#9ca3af" };
  }

  if (rank === 3) {
    return { backgroundColor: "rgba(184,115,51,0.12)", color: "#b87333" };
  }

  return { backgroundColor: "var(--color-surface-container-low)", color: "var(--color-text-secondary)" };
};

function GrafikRankingHorizontal({ ranking }) {
  const canvasRef = useRef(null);
  const [chartError, setChartError] = useState("");
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || ranking.length === 0 || typeof window === "undefined") {
      return undefined;
    }

    setIsChartReady(false);
    let chartInstance;
    let isActive = true;

    import("chart.js/auto")
      .then((module) => {
        if (!isActive || !canvasRef.current) {
          return;
        }

        const Chart = module.default;
        const ctx = canvasRef.current.getContext("2d");
        const colors = ranking.map((_item, index) => CHART_PALETTE[index % CHART_PALETTE.length]);

        chartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ranking.map((item) => item.kota),
            datasets: [
              {
                data: ranking.map((item) => item.totalPermintaan),
                backgroundColor: colors.map((color) => withOpacity(color, 0.7)),
                borderColor: colors,
                borderWidth: 2,
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
              legend: { display: false },
              tooltip: {
                ...chartTooltipDefaults,
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
                grid: { ...chartGridDefaults },
                ticks: {
                  ...chartTickDefaults,
                  callback(value) {
                    return formatTonase(value);
                  },
                },
              },
              y: {
                grid: { display: false },
                ticks: { ...chartTickDefaults },
              },
            },
          },
        });

        setChartError("");
        setIsChartReady(true);
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
    <Card style={{ minHeight: "420px", animationDelay: "60ms" }}>
      <SectionHeader>Grafik Ranking Permintaan</SectionHeader>

      {chartError ? (
        <EmptyState pesan={chartError} />
      ) : (
        <div style={{ height: "320px" }}>
          {isChartReady ? null : <SkeletonChart height="320px" />}
          <canvas
            ref={canvasRef}
            aria-label="Grafik ranking permintaan kota"
            style={{
              display: isChartReady ? "block" : "none",
              animation: "fadeInUp 300ms var(--ease-smooth) both",
            }}
          />
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

  useEffect(() => {
    store.loadPermintaan();
    store.loadKota();
    store.loadStok();
    store.loadRekomendasi();
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

  const rekomendasi = snapshot.rekomendasi ?? [];

  const topValue = ranking[0]?.totalPermintaan ?? 0;
  const rows = ranking.map((item, index) => ({
    id: item.kota,
    peringkat: (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          minWidth: "34px",
          height: "28px",
          padding: "0 8px",
          borderRadius: "var(--radius-full)",
          fontWeight: 700,
          ...getRankColor(index + 1),
        }}
      >
        {index < 3 ? (
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
            style={{ fontSize: "16px", lineHeight: 1, fontVariationSettings: "'FILL' 1" }}
          >
            {index === 0 ? "emoji_events" : "military_tech"}
          </span>
        ) : null}
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
            fontFamily: "var(--font-mono)",
          }}
        >
          {index === 0 ? "0 ton" : formatTonase(difference)}
        </span>
      );
    })(),
  }));

  return (
    <>
      <PageHeader
        judul="Analisis Ranking Permintaan"
        deskripsi={`Periode data: ${periodeData}`}
      />
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
          {/* Metrik bento ala ranking_distribusi_switera. */}
          <div
            className="stagger-children app-grid-3"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(200px, 1fr))", gap: "var(--space-4)" }}
          >
            <MetricCard
              label="Total Permintaan (Ton)"
              nilai={`${ranking.reduce((total, item) => total + item.totalPermintaan, 0)} ton`}
              size="lg"
              accent="primary"
            />
            <MetricCard
              label="Rata-rata Skor Pemenuhan"
              nilai={
                rekomendasi.length > 0
                  ? String(Math.round(rekomendasi.reduce((total, item) => total + item.skor, 0) / rekomendasi.length))
                  : "-"
              }
              size="lg"
              accent="info"
            />
            <MetricCard
              label="Kota Prioritas Tinggi"
              nilai={String(rekomendasi.filter((item) => !item.terpenuhiPenuh).length)}
              size="lg"
              accent="warning"
            />
          </div>

          <Card>
            <SectionHeader>Ranking Permintaan Kota</SectionHeader>
            <p
              style={{
                margin: "0 0 1rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                fontSize: "var(--text-sm)",
              }}
            >
              Jika total permintaan sama, kota dengan tanggal input paling awal diprioritaskan lebih tinggi.
            </p>

            <Tabel
              kolom={[
                { key: "peringkat", label: "Peringkat" },
                { key: "namaKota", label: "Nama Kota" },
                { key: "totalPermintaan", label: "Total Permintaan (ton)", numeric: true },
                { key: "selisih", label: "Selisih dari Peringkat 1", numeric: true },
              ]}
              data={rows}
              getRowStyle={(_baris, index) =>
                index === 0 ? { backgroundColor: "var(--color-pastel-card)" } : undefined
              }
            />
          </Card>

          <GrafikRankingHorizontal ranking={ranking} />

          {rekomendasi.length > 0 ? (
            <Card style={{ animationDelay: "80ms" }}>
              <SectionHeader>Skor & Alokasi Distribusi</SectionHeader>
              <p
                style={{
                  margin: "0 0 1rem",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  fontSize: "var(--text-sm)",
                }}
              >
                Dihitung server berdasarkan skor gabungan: 65% permintaan + 35% kapasitas.
              </p>
              <Tabel
                kolom={[
                  { key: "peringkat", label: "#" },
                  { key: "namaKota", label: "Kota" },
                  { key: "skor", label: "Skor", numeric: true },
                  { key: "totalPermintaan", label: "Permintaan (ton)", numeric: true },
                  { key: "kapasitas", label: "Kapasitas (ton)", numeric: true },
                  { key: "alokasi", label: "Alokasi (ton)", numeric: true },
                  { key: "status", label: "Status" },
                ]}
                data={rekomendasi.map((item, index) => ({
                  id: item.kota,
                  peringkat: (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "26px",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "var(--text-sm)",
                        ...getRankColor(index + 1),
                      }}
                    >
                      {index + 1}
                    </span>
                  ),
                  namaKota: item.kota,
                  skor: (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: "28px", textAlign: "right" }}>
                        {item.skor}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "72px",
                          height: "6px",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--color-surface-container)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${Math.max(0, Math.min(100, item.skor))}%`,
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--color-primary)",
                            transition: "width 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        />
                      </span>
                    </span>
                  ),
                  totalPermintaan: formatTonase(item.totalPermintaan),
                  kapasitas: formatTonase(item.kapasitas),
                  alokasi: (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: item.alokasi > 0 ? "var(--color-success)" : "var(--color-text-muted)",
                      }}
                    >
                      {formatTonase(item.alokasi)}
                    </span>
                  ),
                  status: item.terpenuhiPenuh ? (
                    <span style={{ color: "var(--color-success)", fontSize: "var(--text-xs)", fontWeight: 600 }}>Terpenuhi</span>
                  ) : item.dibatasiKapasitas ? (
                    <span style={{ color: "var(--color-warning)", fontSize: "var(--text-xs)", fontWeight: 600 }}>Dibatasi Kapasitas</span>
                  ) : (
                    <span style={{ color: "var(--color-danger)", fontSize: "var(--text-xs)", fontWeight: 600 }}>Stok Tidak Cukup</span>
                  ),
                }))}
                getRowStyle={(_baris, index) =>
                  index === 0 ? { backgroundColor: "rgba(242,167,27,0.06)" } : undefined
                }
              />
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

export default AnalisisRanking;
