export function renderGrid(canvas, pattern, cellSize) {
  if (!canvas || !pattern) return;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < pattern.cells.length; index++) {
    const x = (index % pattern.width) * cellSize;
    const y = Math.floor(index / pattern.width) * cellSize;
    const bead = pattern.palette.find(color => color.id === pattern.cells[index]);
    if (bead) {
      context.fillStyle = bead.hex;
      context.fillRect(x, y, cellSize, cellSize);
      if (cellSize > 9) {
        context.beginPath();
        context.arc(x + cellSize / 2, y + cellSize / 2, Math.max(1, cellSize * 0.13), 0, Math.PI * 2);
        context.fillStyle = 'rgba(255,255,255,.43)';
        context.fill();
      }
    }
    context.strokeStyle = cellSize > 11 ? '#e8e1dd' : 'rgba(130,110,100,.28)';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
  }
}
