import { getWeavingCoordinate } from '../domain/weaving/WeavingSequence.js';

export function createWeavingProgress(pattern, configuration, id, now = new Date().toISOString()) {
  return { id, currentStep: 0, totalSteps: pattern.width * pattern.height, axis: configuration.axis, start: configuration.start, serpentine: configuration.serpentine, patternVersion: pattern.version, updatedAt: now };
}

export function getStep(pattern, progress, step) {
  return getWeavingCoordinate(step, pattern, progress);
}
