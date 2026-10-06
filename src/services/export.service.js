export function downloadPattern(pattern) {
  const blob = new Blob([JSON.stringify({ format: 'mostacillas-pattern', schemaVersion: 1, exportedAt: new Date().toISOString(), pattern }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = `${pattern.name.replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase() || 'manilla'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
