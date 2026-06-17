import { useEffect, useMemo, useState } from "react";
import Card from "./Card";
import Modal from "./Modal";
import Tombol from "./Tombol";
import store from "../store";
import { menuByRole, roleOptions } from "../utils/navigation";

const iconStyle = {
  width: "1rem",
  height: "1rem",
  flexShrink: 0,
};

function IkonDaun({ size = 22, color = "var(--color-surface)" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M39 8C25.5 8.4 13 16.7 13 29.2C13 35.2 17.8 40 23.8 40C35.7 40 41.2 25.4 39 8Z"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M11 40C16.8 27.3 25.3 19.5 36 14"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IkonMenu({ type, active }) {
  const color = active
    ? "var(--color-primary)"
    : "var(--color-text-secondary)";

  switch (type) {
    case "input":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path
            d="M12 5V19M5 12H19"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <ellipse cx="12" cy="6" rx="7" ry="3" stroke={color} strokeWidth="2" />
          <path
            d="M5 6V17C5 18.6569 8.13401 20 12 20C15.866 20 19 18.6569 19 17V6"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M5 11C5 12.6569 8.13401 14 12 14C15.866 14 19 12.6569 19 11"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path d="M5 19H19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M8 16V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 16V7" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 16V13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "decision":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path d="M12 4V20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path
            d="M12 8H18L16 11L18 14H12"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 15H6L8 18L6 21"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path d="M3 7H14V16H3V7Z" stroke={color} strokeWidth="2" />
          <path d="M14 10H18L21 13V16H14V10Z" stroke={color} strokeWidth="2" />
          <circle cx="7.5" cy="17.5" r="1.5" fill={color} />
          <circle cx="17.5" cy="17.5" r="1.5" fill={color} />
        </svg>
      );
    case "report":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path
            d="M7 4H14L18 8V20H7V4Z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M14 4V8H18" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 12H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 16H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path d="M4 4H10V10H4V4Z" stroke={color} strokeWidth="2" />
          <path d="M14 4H20V10H14V4Z" stroke={color} strokeWidth="2" />
          <path d="M4 14H10V20H4V14Z" stroke={color} strokeWidth="2" />
          <path d="M14 14H20V20H14V14Z" stroke={color} strokeWidth="2" />
        </svg>
      );
  }
}

function Layout({ children, title = "Switera", menuAwal, onMenuChange }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState("");
  const [hoveredHeaderButton, setHoveredHeaderButton] = useState("");
  const roleAktif = roleOptions.includes(snapshot.roleAktif)
    ? snapshot.roleAktif
    : "Admin";

  const menuItems = useMemo(
    () => menuByRole[roleAktif] ?? menuByRole.Admin,
    [roleAktif]
  );

  const [menuAktif, setMenuAktif] = useState(
    menuAwal ?? menuByRole[roleAktif]?.[0]?.key ?? ""
  );

  useEffect(() => {
    const unsubscribe = store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!menuItems.some((item) => item.key === menuAktif)) {
      setMenuAktif(menuItems[0]?.key ?? "");
    }
  }, [menuAktif, menuItems]);

  const handleMenuChange = (key) => {
    setMenuAktif(key);
    if (onMenuChange) {
      onMenuChange(key);
    }
  };

  const confirmReset = () => {
    store.reset();
    setIsResetOpen(false);
  };

  const handleLogout = () => {
    store.logout();
  };

  const getHeaderButtonStyle = (buttonName) => ({
    border: "1px solid rgba(255,255,255,0.75)",
    borderRadius: "var(--radius-full)",
    backgroundColor:
      hoveredHeaderButton === buttonName
        ? "rgba(255,255,255,0.14)"
        : "transparent",
    color: "var(--color-surface)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    padding: "8px 14px",
    transition:
      "background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
    transform:
      hoveredHeaderButton === buttonName ? "translateY(-1px)" : "translateY(0)",
    boxShadow:
      hoveredHeaderButton === buttonName ? "var(--shadow-xs)" : "none",
  });

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-bg)",
          fontFamily: "var(--font-body)",
          color: "var(--color-text-primary)",
        }}
      >
        <header
          style={{
            height: "64px",
            padding: "0 32px",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              minWidth: 0,
            }}
          >
            <IkonDaun />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "var(--text-xl)",
                color: "var(--color-surface)",
                lineHeight: 1,
              }}
            >
              {title}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.1rem",
              }}
            >
              <span
                style={{
                  color: "var(--color-surface)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {snapshot.userAktif?.nama ?? "Pengguna"}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 500,
                }}
              >
                {roleAktif}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              onMouseEnter={() => setHoveredHeaderButton("reset")}
              onMouseLeave={() => setHoveredHeaderButton("")}
              style={getHeaderButtonStyle("reset")}
            >
              Reset Data
            </button>

            <button
              type="button"
              onClick={handleLogout}
              onMouseEnter={() => setHoveredHeaderButton("logout")}
              onMouseLeave={() => setHoveredHeaderButton("")}
              style={getHeaderButtonStyle("logout")}
            >
              Keluar
            </button>
          </div>
        </header>

        <nav
          aria-label="Navigasi utama"
          style={{
            backgroundColor: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-xs)",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 32px",
              display: "flex",
              alignItems: "stretch",
              gap: "0.25rem",
            }}
          >
            {menuItems.map((item) => {
              const active = item.key === menuAktif;
              const hovered = item.key === hoveredMenu;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMenuChange(item.key)}
                  onMouseEnter={() => setHoveredMenu(item.key)}
                  onMouseLeave={() => setHoveredMenu("")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    padding: "16px 20px",
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                    backgroundColor:
                      hovered && !active
                        ? "var(--color-primary-subtle)"
                        : "transparent",
                    color:
                      active || hovered
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    fontWeight: active ? 600 : 500,
                    whiteSpace: "nowrap",
                    transition:
                      "background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
                  }}
                >
                  <IkonMenu type={item.icon} active={active || hovered} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main
          style={{
            width: "100%",
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "32px",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          {children ?? (
            <Card>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: "0.98rem",
                }}
              >
                Konten utama akan ditampilkan di area ini.
              </p>
            </Card>
          )}
        </main>
      </div>

      {isResetOpen ? (
        <Modal
          judul="Reset data demo"
          onTutup={() => setIsResetOpen(false)}
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
                Semua perubahan pada data demo akan dikembalikan ke kondisi
                awal. Tindakan ini cocok digunakan saat ingin mengulang simulasi.
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
                  onClick={() => setIsResetOpen(false)}
                />
                <Tombol
                  label="Ya, Reset"
                  variant="bahaya"
                  onClick={confirmReset}
                />
              </div>
            </div>
          }
        />
      ) : null}
    </>
  );
}

export default Layout;
