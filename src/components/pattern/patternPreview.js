export function renderPatternPreview(pattern, root = document) {
  const canvas = root.querySelector(`[data-preview="${pattern.id}"]`);
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const scale = Math.min(220 / pattern.width, 100 / pattern.height);
  canvas.width = Math.max(1, Math.ceil(pattern.width * scale));
  canvas.height = Math.max(1, Math.ceil(pattern.height * scale));
  for (let index = 0; index < pattern.cells.length; index++) {
    const colorId = pattern.cells[index];
    context.fillStyle = colorId ? pattern.palette.find(color => color.id === colorId)?.hex || '#e9e2dd' : '#fff';
    context.fillRect((index % pattern.width) * scale, Math.floor(index / pattern.width) * scale, Math.ceil(scale), Math.ceil(scale));
  }
}
