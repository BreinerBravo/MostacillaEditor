import { getWeavingCoordinate } from '../../domain/weaving/WeavingSequence.js';

const ROUTE_COLOR = '#b97884';

export function renderWeavingMiniMap(canvas, pattern, progress) {
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
  const canvasWidth = Math.max(1, Math.ceil(gridWidth + routeGutterX));
  const canvasHeight = Math.max(1, Math.ceil(gridHeight + routeGutterY));
  const gridX = horizontalRoute ? gutter : 0;
  const gridY = horizontalRoute ? 0 : gutter;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  const colorById = new Map(pattern.palette.map(color => [color.id, color.hex]));
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const hex = colorById.get(pattern.cells[row * width + col]);
      if (!hex) continue;
      context.fillStyle = hex;
      context.fillRect(gridX + col * cellSize, gridY + row * cellSize, cellSize, cellSize);
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
