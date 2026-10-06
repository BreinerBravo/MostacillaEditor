export function getWeavingCoordinate(step, pattern, progress) {
  const axisLength = progress.axis === 'row' ? pattern.width : pattern.height;
  const lineCount = progress.axis === 'row' ? pattern.height : pattern.width;
  const line = Math.floor(step / axisLength), offset = step % axisLength;
  const reverse = progress.serpentine && line % 2 === 1;
  const position = reverse ? axisLength - 1 - offset : offset;
  if (progress.axis === 'row') return { row: progress.start === 'bottom' ? lineCount - 1 - line : line, col: progress.start === 'right' ? axisLength - 1 - position : position };
  return { row: progress.start === 'bottom' ? axisLength - 1 - position : position, col: progress.start === 'right' ? lineCount - 1 - line : line };
}
