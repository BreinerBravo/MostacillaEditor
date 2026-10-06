export const DEFAULT_PALETTE = [
  { id: 'rose', name: 'Rosa', hex: '#d9a7b0' },
  { id: 'blue', name: 'Azul', hex: '#8ba8bf' },
  { id: 'gold', name: 'Dorado', hex: '#c6a66b' },
  { id: 'plum', name: 'Ciruela', hex: '#806278' },
  { id: 'cream', name: 'Marfil', hex: '#f3e8d5' },
];

export function createPattern(name, width, height, id, now = new Date().toISOString()) {
  return {
    id, version: 1, name: name.trim() || 'Mi manilla', description: '', width, height,
    cells: Array(width * height).fill(0),
    palette: structuredClone(DEFAULT_PALETTE),
    weaving: { axis: 'row', start: 'top', serpentine: true },
    progress: [], createdAt: now, updatedAt: now,
  };
}

export function resizePattern(pattern, width, height) {
  const cells = Array(width * height).fill(0);
  for (let row = 0; row < Math.min(height, pattern.height); row++) {
    for (let col = 0; col < Math.min(width, pattern.width); col++) {
      cells[row * width + col] = pattern.cells[row * pattern.width + col];
    }
  }
  return { ...pattern, width, height, cells, version: pattern.version + 1 };
}

export function fillRegion(cells, width, height, start, replacement) {
  const target = cells[start];
  if (target === replacement) return [];
  const stack = [start], visited = new Uint8Array(cells.length), changes = [];
  while (stack.length) {
    const index = stack.pop();
    if (index < 0 || index >= cells.length || visited[index] || cells[index] !== target) continue;
    visited[index] = 1;
    changes.push({ i: index, from: target, to: replacement });
    const x = index % width;
    if (x) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < cells.length - width) stack.push(index + width);
  }
  return changes;
}
