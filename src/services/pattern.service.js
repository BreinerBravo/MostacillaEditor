import { createPattern as createDomainPattern, resizePattern as resizeDomainPattern } from '../domain/pattern/Pattern.js';
import { isValidDimensions } from '../domain/pattern/PatternRules.js';

export function createPattern(name, width, height, id, now) {
  if (!isValidDimensions(width, height)) throw new RangeError('Dimensiones de patrón no válidas.');
  return createDomainPattern(name, width, height, id, now);
}

export function resizePattern(pattern, width, height) {
  if (!isValidDimensions(width, height)) throw new RangeError('Dimensiones de patrón no válidas.');
  return resizeDomainPattern(pattern, width, height);
}
