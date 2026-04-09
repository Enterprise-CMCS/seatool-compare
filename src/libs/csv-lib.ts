export function getCsvFromJson<T extends object>(rows: T[]) {
  if (!rows.length) return "";

  const headers = Array.from(
    rows.reduce((allHeaders, row) => {
      Object.keys(row).forEach((header) => allHeaders.add(header));
      return allHeaders;
    }, new Set<string>())
  );

  const escapeCsvValue = (value: unknown) => {
    const normalized = value == null ? "" : String(value);

    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
  };

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvValue((row as Record<string, unknown>)[header]))
        .join(",")
    ),
  ];

  return csvLines.join("\n");
}
