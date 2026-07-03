import { useEffect, useMemo, useRef, useState } from "react";
import Card from "./Card";
import Sparkline from "./Sparkline";

const accentColors = {
  primary: { subtle: "var(--color-primary-subtle)", solid: "var(--color-primary)" },
  accent: { subtle: "var(--color-accent-subtle)", solid: "var(--color-accent)" },
  info: { subtle: "var(--color-info-subtle)", solid: "var(--color-info)" },
  success: { subtle: "var(--color-success-subtle)", solid: "var(--color-success)" },
  warning: { subtle: "var(--color-warning-subtle)", solid: "var(--color-warning)" },
  danger: { subtle: "var(--color-danger-subtle)", solid: "var(--color-danger)" },
};

const formatterAngka = new Intl.NumberFormat("id-ID");

function parseNilai(raw) {
  const text = String(raw ?? "");
  const match = text.match(/^(-?[\d.,]+)(.*)$/);

  if (!match) {
    return { isNumeric: false };
  }

  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return { isNumeric: false };
  }

  return { isNumeric: true, number, suffix: match[2] };
}

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(target);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) {
      setValue(target);
      return undefined;
    }

    hasAnimatedRef.current = true;
    let frameId;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function MetricCard({ label, nilai, ikon, accent = "primary", shimmer = false, size = "md", trend, valueFontSize, sparkline, style, children }) {
  const colors = accentColors[accent] ?? accentColors.primary;
  const parsed = useMemo(() => parseNilai(nilai), [nilai]);
  const animatedNumber = useCountUp(parsed.isNumeric ? parsed.number : 0, 800);
  const displayValue = parsed.isNumeric
    ? `${formatterAngka.format(Math.round(animatedNumber))}${parsed.suffix}`
    : String(nilai);
  const isLarge = size === "lg";
  const iconBoxSize = isLarge ? "44px" : "40px";
  const iconSize = isLarge ? "22px" : "20px";

  if (!isLarge) {
    return (
      <Card
        hoverable
        shimmer={shimmer}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-4)",
          padding: "var(--space-5)",
        }}
      >
        {ikon ? (
          <div
            style={{
              width: iconBoxSize,
              height: iconBoxSize,
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              backgroundColor: colors.subtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ width: iconSize, height: iconSize, display: "flex", color: colors.solid }}>
              {ikon}
            </span>
          </div>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              marginBottom: "var(--space-1)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wider)",
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "var(--tracking-tight)",
              color: "var(--color-text-primary)",
            }}
          >
            {displayValue}
          </p>
          {trend ? (
            <p
              style={{
                margin: 0,
                marginTop: "var(--space-2)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              {trend}
            </p>
          ) : null}
        </div>
      </Card>
    );
  }

  // Layout kanonik switera_konsistensi_global: ikon kiri-atas dalam kotak,
  // chip trend kanan-atas, lalu label + nilai besar di bawah.
  return (
    <Card
      hoverable
      shimmer={shimmer}
      style={{
        padding: "var(--space-6)",
        minHeight: "120px",
        boxSizing: "border-box",
        borderRadius: "var(--radius-2xl)",
        border: "1px solid var(--color-surface-container)",
        boxShadow: "0px 4px 20px rgba(0, 106, 67, 0.05)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        ...style,
      }}
    >
      {/* Lingkaran dekoratif sudut — membesar saat hover (konsistensi_global). */}
      <span
        aria-hidden="true"
        className="metric-deco"
        style={{
          position: "absolute",
          right: "-16px",
          top: "-16px",
          width: "128px",
          height: "128px",
          borderRadius: "var(--radius-full)",
          backgroundColor: colors.subtle,
          opacity: 0.5,
          pointerEvents: "none",
          transition: "transform 500ms var(--ease-out)",
        }}
      />

      {/* Baris atas: kotak ikon kiri + chip trend/sparkline kanan */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
        {ikon ? (
          <div
            style={{
              width: iconBoxSize,
              height: iconBoxSize,
              flexShrink: 0,
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--color-surface-container)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ width: iconSize, height: iconSize, display: "flex", color: colors.solid }}>
              {ikon}
            </span>
          </div>
        ) : (
          <span />
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
          {sparkline ? <Sparkline data={sparkline} color={colors.solid} width={56} height={18} /> : null}
          {trend ? (
            <span
              style={{
                fontSize: "var(--text-2xs)",
                backgroundColor: "var(--color-surface-container)",
                color: "var(--color-on-surface-variant)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontWeight: "var(--font-weight-medium)",
                whiteSpace: "nowrap",
              }}
            >
              {trend}
            </span>
          ) : null}
        </span>
      </div>

      {children ? <div style={{ position: "relative", flex: 1 }}>{children}</div> : null}

      {/* Bawah: label lalu nilai besar */}
      <div style={{ position: "relative" }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: valueFontSize ?? "1.75rem",
            fontWeight: "var(--font-weight-bold)",
            fontFamily: "var(--font-heading)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "var(--color-on-surface)",
          }}
        >
          {displayValue}
        </p>
      </div>
    </Card>
  );
}

export default MetricCard;
