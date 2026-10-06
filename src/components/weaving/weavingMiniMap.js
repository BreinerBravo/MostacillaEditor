import { getWeavingCoordinate } from '../../domain/weaving/WeavingSequence.js';

const ROUTE_COLOR = '#b97884';

export function renderWeavingMiniMap(canvas, pattern, progress, rotation = 0) {
  if (!canvas || !pattern || !progress) return;

  const width = pattern.width;
  const height = pattern.height;
  const axisLength = progress.axis === 'row' ? width : height;
  const lineCount = progress.axis === 'row' ? height : width;
  const horizontalRoute = progress.axis === 'row';
  const gutter = Math.min(18, Math.max(7, 720 / Math.max(width, height)));
  const routeGutterX = horizontalRoute ? gutter * 2 : 0;
  const routeGutterY = horizontalRoute ? 0 : gutter * 2;
  const cellSize = Math.min(24, 900 / width, 900 / height);
  const gridWidth = width * cellSize;
  const gridHeight = height * cellSize;
  const baseWidth = Math.max(1, Math.ceil(gridWidth + routeGutterX));
  const baseHeight = Math.max(1, Math.ceil(gridHeight + routeGutterY));
  const canvasWidth = rotation ? baseHeight : baseWidth;
  const canvasHeight = rotation ? baseWidth : baseHeight;
  const gridX = horizontalRoute ? gutter : 0;
  const gridY = horizontalRoute ? 0 : gutter;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
  const context = canvas.getContext('2d');
  if (!context) return;
  if (rotation) { context.translate(baseHeight, 0); context.rotate(Math.PI / 2); }
  context.clearRect(0, 0, baseWidth, baseHeight);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, baseWidth, baseHeight);

  const colorById = new Map(pattern.palette.map(color => [color.id, color.hex]));
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const x = gridX + col * cellSize;
      const y = gridY + row * cellSize;
      const cellId = pattern.cells[row * width + col];
      const hex = colorById.get(cellId);
      if (!hex) {
        drawEmptyCell(context, x, y, cellSize);
        continue;
      }
      context.fillStyle = hex;
      context.fillRect(x, y, cellSize, cellSize);
    }
  }

  context.strokeStyle = `#443a3870`;
  context.lineWidth = Math.max(0.35, Math.min(1.1, cellSize * 0.08));
  context.beginPath();
  for (let col = 0; col <= width; col++) {
    const x = gridX + col * cellSize;
    context.moveTo(x, gridY);
    context.lineTo(x, gridY + gridHeight);
  }
  for (let row = 0; row <= height; row++) {
    const y = gridY + row * cellSize;
    context.moveTo(gridX, y);
    context.lineTo(gridX + gridWidth, y);
  }
  context.stroke();

  const totalSteps = width * height;
  const currentStep = Math.max(0, Math.min(Number(progress.currentStep) || 0, totalSteps - 1));
  const current = getWeavingCoordinate(currentStep, pattern, progress);
  const currentLine = Math.floor(currentStep / axisLength);
  context.fillStyle = ROUTE_COLOR;

  for (let line = 0; line < lineCount; line++) {
    const firstStep = line * axisLength;
    const first = getWeavingCoordinate(firstStep, pattern, progress);
    const second = getWeavingCoordinate(Math.min(firstStep + 1, totalSteps - 1), pattern, progress);
    const direction = horizontalRoute
      ? (second.col === first.col ? (progress.start === 'right' ? -1 : 1) : Math.sign(second.col - first.col))
      : (second.row === first.row ? (progress.start === 'bottom' ? -1 : 1) : Math.sign(second.row - first.row));
    const activeLine = line === currentLine;
    if (activeLine) {
      context.strokeStyle = ROUTE_COLOR;
      context.lineWidth = Math.max(1.5, Math.min(3, cellSize * 0.18));
      context.strokeRect(gridX + current.col * cellSize + 0.6, gridY + current.row * cellSize + 0.6, Math.max(0, cellSize - 1.2), Math.max(0, cellSize - 1.2));
    }
    drawDirectionArrow(context, horizontalRoute ? (direction > 0 ? gutter / 2 : gutter + gridWidth + gutter / 2) : gridX + (horizontalRoute ? 0 : first.col * cellSize + cellSize / 2), horizontalRoute ? gridY + first.row * cellSize + cellSize / 2 : (direction > 0 ? gutter / 2 : gutter + gridHeight + gutter / 2), horizontalRoute ? (direction > 0 ? 'right' : 'left') : (direction > 0 ? 'down' : 'up'), activeLine ? ROUTE_COLOR : '#8e7779');
  }

  context.strokeStyle = '#fff';
  context.lineWidth = Math.max(1, Math.min(2.5, cellSize * 0.16));
  context.beginPath();
  context.arc(gridX + current.col * cellSize + cellSize / 2, gridY + current.row * cellSize + cellSize / 2, Math.max(1, Math.min(cellSize * 0.42, 7)), 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = ROUTE_COLOR;
  context.lineWidth = Math.max(0.8, Math.min(1.6, cellSize * 0.08));
  context.beginPath();
  context.arc(gridX + current.col * cellSize + cellSize / 2, gridY + current.row * cellSize + cellSize / 2, Math.max(1, Math.min(cellSize * 0.42, 7)), 0, Math.PI * 2);
  context.stroke();
}

export function scaleWeavingMiniMap(canvas, zoom = 1) {
  if (!canvas?.width || !canvas?.height) return;
  const viewport = canvas.parentElement;
  const availableWidth = Math.max(80, (viewport?.clientWidth || canvas.width) - 20);
  const availableHeight = Math.max(80, (viewport?.clientHeight || canvas.height) - 20);
  const fitScale = Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
  const scale = fitScale * zoom;
  canvas.style.width = `${Math.max(1, Math.round(canvas.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.round(canvas.height * scale))}px`;
}

export function centerWeavingMiniMap(canvas, pattern, progress, rotation = 0) {
  if (!canvas?.width || !pattern || !progress) return;
  const axisLength = progress.axis === 'row' ? pattern.width : pattern.height;
  const gutter = Math.min(18, Math.max(7, 720 / Math.max(pattern.width, pattern.height)));
  const horizontalRoute = progress.axis === 'row';
  const gridX = horizontalRoute ? gutter : 0;
  const gridY = horizontalRoute ? 0 : gutter;
  const cellSize = Math.min(24, 900 / pattern.width, 900 / pattern.height);
  const step = Math.max(0, Math.min(Number(progress.currentStep) || 0, pattern.width * pattern.height - 1));
  const point = getWeavingCoordinate(step, pattern, progress);
  let x = gridX + (point.col + 0.5) * cellSize;
  let y = gridY + (point.row + 0.5) * cellSize;
  if (rotation) [x, y] = [canvas.height - y, x];
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  const viewport = canvas.parentElement;
  viewport.scrollLeft = Math.max(0, x * scaleX - viewport.clientWidth / 2);
  viewport.scrollTop = Math.max(0, y * scaleY - viewport.clientHeight / 2);
}

function drawDirectionArrow(context, x, y, direction, color) {
  const size = 3.4;
  context.fillStyle = color;
  context.beginPath();
  if (direction === 'right') {
    context.moveTo(x + size, y); context.lineTo(x - size, y - size); context.lineTo(x - size, y + size);
  } else if (direction === 'left') {
    context.moveTo(x - size, y); context.lineTo(x + size, y - size); context.lineTo(x + size, y + size);
  } else if (direction === 'down') {
    context.moveTo(x, y + size); context.lineTo(x - size, y - size); context.lineTo(x + size, y - size);
  } else {
    context.moveTo(x, y - size); context.lineTo(x - size, y + size); context.lineTo(x + size, y + size);
  }
  context.closePath();
  context.fill();
}

function drawEmptyCell(context, x, y, cellSize) {
  context.fillStyle = '#faf9f7';
  context.fillRect(x, y, cellSize, cellSize);
  const tileSize = cellSize / 4;
  context.fillStyle = '#efedeb';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if ((row + col) % 2 === 0) context.fillRect(x + col * tileSize, y + row * tileSize, tileSize, tileSize);
    }
  }
}
