const csvValue = (value) => {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

export const downloadCsv = (filename, rows) => {
  if (!Array.isArray(rows) || !rows.length) return false;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const content = [
    columns.map(csvValue).join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row?.[column])).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};
