import { validatePattern } from '../domain/pattern/PatternRules.js';

export async function readPatternFile(file) {
  return validatePattern(JSON.parse(await file.text()));
}
