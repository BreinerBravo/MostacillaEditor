export const MAX_DIMENSION = 500;
export const MAX_CELLS = 100000;

export function isValidDimensions(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 && width <= MAX_DIMENSION && height <= MAX_DIMENSION && width * height <= MAX_CELLS;
}

export function validatePattern(data) {
  const pattern = data?.pattern || data;
  if (!pattern || typeof pattern !== 'object') throw Error('El archivo no contiene un diseño válido.');
  if (!isValidDimensions(pattern.width, pattern.height)) throw Error('Las dimensiones del archivo no son válidas.');
  if (!Array.isArray(pattern.cells) || pattern.cells.length !== pattern.width * pattern.height || !Array.isArray(pattern.palette) || pattern.palette.length > 100) throw Error('La cuadrícula o la paleta están incompletas.');
  const colorIds = new Set(pattern.palette.map(color => color.id));
  if (pattern.cells.some(cell => cell !== 0 && !colorIds.has(cell))) throw Error('La cuadrícula incluye un color desconocido.');
  for (const color of pattern.palette) {
    if (typeof color.id !== 'string' || typeof color.name !== 'string' || !/^#[\da-f]{6}$/i.test(color.hex)) throw Error('El archivo incluye un color inválido.');
  }
  return pattern;
}
