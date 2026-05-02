type CsvValue = string | number | boolean | null | undefined;

export type CsvRow = Record<string, CsvValue>;

function quoteCsv(value: CsvValue) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(quoteCsv).join(','),
    ...rows.map((row) => headers.map((header) => quoteCsv(row[header])).join(',')),
  ].join('\n');

  downloadText(filename, `\ufeff${csv}`, 'text/csv;charset=utf-8');
}

export function downloadText(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function notify(message: string) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message } }));
}

export function nowText() {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
