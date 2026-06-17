import { useState } from "react";

const resolveColumn = (column) =>
  typeof column === "string"
    ? {
        key: column,
        label: column,
      }
    : column;

function Tabel({ kolom = [], data = [], aksi }) {
  const normalizedColumns = kolom.map(resolveColumn);
  const [hoveredRow, setHoveredRow] = useState(null);

  const headerCellStyle = {
    padding: "14px 16px",
    textAlign: "left",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0",
    borderBottom: "1px solid var(--color-border)",
  };

  const cellStyle = {
    padding: "14px 16px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    verticalAlign: "top",
    transition: "background-color var(--transition-fast)",
  };

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-body)",
          color: "var(--color-text-primary)",
        }}
      >
        <thead style={{ backgroundColor: "var(--color-surface-2)" }}>
          <tr>
            {normalizedColumns.map((column) => (
              <th
                key={column.key}
                style={headerCellStyle}
              >
                {column.label}
              </th>
            ))}
            {aksi ? (
              <th
                style={headerCellStyle}
              >
                Aksi
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.map((baris, index) => (
            <tr
              key={baris.id ?? index}
              onMouseEnter={() => setHoveredRow(baris.id ?? index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {normalizedColumns.map((column) => (
                <td
                  key={`${baris.id ?? index}-${column.key}`}
                  style={{
                    ...cellStyle,
                    backgroundColor:
                      hoveredRow === (baris.id ?? index)
                        ? "var(--color-primary-subtle)"
                        : "transparent",
                  }}
                >
                  {baris[column.key] ?? "-"}
                </td>
              ))}
              {aksi ? (
                <td
                  style={{
                    ...cellStyle,
                    backgroundColor:
                      hoveredRow === (baris.id ?? index)
                        ? "var(--color-primary-subtle)"
                        : "transparent",
                  }}
                >
                  {aksi(baris, index)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Tabel;
