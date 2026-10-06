export function renderGrid(canvas, pattern, cellSize, rotation = 0) {
  if (!canvas || !pattern) return;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < pattern.cells.length; index++) {
    const row = Math.floor(index / pattern.width);
    const col = index % pattern.width;
    const displayCol = rotation ? pattern.height - 1 - row : col;
    const displayRow = rotation ? col : row;
    const x = displayCol * cellSize;
    const y = displayRow * cellSize;
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
    } else {
      drawEmptyCell(context, x, y, cellSize);
    }
    context.strokeStyle = bead && /^#(?:fff|ffffff)$/i.test(bead.hex) ? '#c9c4c0' : cellSize > 11 ? '#e8e1dd' : 'rgba(130,110,100,.28)';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
  }
}

function drawEmptyCell(context, x, y, cellSize) {
  context.fillStyle = '#faf9f7';
  context.fillRect(x, y, cellSize, cellSize);
  const tile = Math.max(2, Math.min(6, cellSize / 4));
  context.fillStyle = '#efedeb';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if ((row + col) % 2 === 0) context.fillRect(x + col * cellSize / 4, y + row * cellSize / 4, Math.min(tile, cellSize / 4), Math.min(tile, cellSize / 4));
    }
  }
}
