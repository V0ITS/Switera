import { useEffect, useState } from "react";

let toasts = [];
let listeners = [];
let idCounter = 0;

function notify() {
  listeners.forEach((listener) => listener(toasts));
}

function dismissToast(id) {
  toasts = toasts.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast));
  notify();
  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    notify();
  }, 200);
}

function showToast({ type = "info", message, subMessage, duration = 3000, action }) {
  const id = ++idCounter;
  toasts = [...toasts, { id, type, message, subMessage, duration, action }];
  notify();

  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

const typeConfig = {
  success: { bg: "var(--color-success-bg)", icon: "✓", iconColor: "var(--color-success-text)" },
  error: { bg: "var(--color-danger-bg)", icon: "✕", iconColor: "var(--color-danger-text)" },
  warning: { bg: "var(--color-warning-bg)", icon: "⚠", iconColor: "var(--color-warning-text)" },
  info: { bg: "var(--color-info-bg)", icon: "ℹ", iconColor: "var(--color-info-text)" },
};

function ToastItem({ toast }) {
  const config = typeConfig[toast.type] ?? typeConfig.info;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration) {
      return undefined;
    }

    const start = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [toast.duration]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-5) var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        minWidth: "280px",
        maxWidth: "380px",
        backgroundColor: "var(--color-surface)",
        border: "2px solid #000000",
        borderLeft: `8px solid ${config.iconColor}`,
        overflow: "hidden",
        ...(toast.exiting
          ? {
              opacity: 0,
              transform: "translateX(100%)",
              transition: "opacity 200ms var(--ease-smooth), transform 200ms var(--ease-smooth)",
            }
          : { animation: "slideInRight 250ms var(--ease-out) both" }),
      }}
    >
      <span
        style={{
          color: config.iconColor,
          backgroundColor: config.bg,
          border: "2px solid #000000",
          borderRadius: "var(--radius-full)",
          width: "28px",
          height: "28px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-bold)",
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
          {toast.message}
        </p>
        {toast.subMessage ? (
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {toast.subMessage}
          </p>
        ) : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          className="toast-action-btn"
          onClick={() => {
            toast.action.onClick();
            dismissToast(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="toast-dismiss-btn"
        onClick={() => dismissToast(toast.id)}
        aria-label="Tutup"
      >
        ×
      </button>
      {toast.duration ? (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            backgroundColor: config.bg,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: config.iconColor,
              transition: "width 100ms linear",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ToastContainer() {
  const [list, setList] = useState(toasts);

  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((listener) => listener !== setList);
    };
  }, []);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifikasi"
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        right: "var(--space-6)",
        zIndex: "var(--z-toast)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {list.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function useToast() {
  return { showToast, ToastContainer };
}

export default useToast;
export { showToast, ToastContainer };
