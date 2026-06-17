export const parseDate = (value) => new Date(`${value}T00:00:00`);

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const aggregatePermintaanRanking = (permintaan) => {
  const grouped = permintaan.reduce((result, item) => {
    const current = result.get(item.kota) ?? {
      kota: item.kota,
      totalPermintaan: 0,
      earliestTanggalInput: item.tanggal_input,
    };

    current.totalPermintaan += Number(item.jumlah_permintaan) || 0;

    if (
      item.tanggal_input &&
      (!current.earliestTanggalInput ||
        parseDate(item.tanggal_input) < parseDate(current.earliestTanggalInput))
    ) {
      current.earliestTanggalInput = item.tanggal_input;
    }

    result.set(item.kota, current);
    return result;
  }, new Map());

  return [...grouped.values()].sort((first, second) => {
    if (second.totalPermintaan !== first.totalPermintaan) {
      return second.totalPermintaan - first.totalPermintaan;
    }

    if (
      first.earliestTanggalInput &&
      second.earliestTanggalInput &&
      first.earliestTanggalInput !== second.earliestTanggalInput
    ) {
      return (
        parseDate(first.earliestTanggalInput) -
        parseDate(second.earliestTanggalInput)
      );
    }

    return first.kota.localeCompare(second.kota, "id-ID");
  });
};

export const getLatestKeputusanByKota = (keputusan) =>
  keputusan.reduce((result, item) => {
    const existing = result.get(item.kota_tujuan);

    if (
      !existing ||
      parseDate(item.tanggal_keputusan) > parseDate(existing.tanggal_keputusan)
    ) {
      result.set(item.kota_tujuan, item);
    }

    return result;
  }, new Map());

export const getDuplicateGroups = (permintaan) => {
  const groups = permintaan.reduce((result, item) => {
    const key = `${item.kota}-${item.tanggal_permintaan}`;
    const current = result.get(key) ?? [];
    current.push(item);
    result.set(key, current);
    return result;
  }, new Map());

  return [...groups.values()].filter((items) => items.length > 1);
};

export const getPeriodRange = (periode, baseDate = new Date()) => {
  const today = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );

  if (periode === "minggu-ini") {
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start, end };
};

export const isDateInRange = (value, range) => {
  const current = parseDate(value);
  return current >= range.start && current <= range.end;
};
