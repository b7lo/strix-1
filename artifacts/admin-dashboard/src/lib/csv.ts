/**
 * تصدير مصفوفة كائنات إلى ملف CSV وتنزيله في المتصفح.
 * يدعم UTF-8 مع BOM حتى تظهر العربية بشكل صحيح في Excel.
 */

type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // نحيط بعلامات اقتباس إذا احتوى على فاصلة أو سطر جديد أو اقتباس
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param filename اسم الملف بدون امتداد
 * @param columns أعمدة بالشكل { key, header }
 * @param rows الصفوف (كائنات)
 */
export function exportToCsv<T extends Record<string, CsvValue>>(
  filename: string,
  columns: { key: keyof T; header: string }[],
  rows: T[],
): void {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(","),
  );
  const csv = [headerLine, ...dataLines].join("\r\n");

  // BOM لدعم العربية في Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
